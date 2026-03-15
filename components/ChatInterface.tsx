"use client"

import { useEffect, useRef, useState } from "react"
import {
  BarChart3,
  BrainCircuit,
  Clock3,
  History,
  Newspaper,
  RadioTower,
  Sparkles,
  TrendingUp,
  WalletCards
} from "lucide-react"

import MessageBubble from "@/components/MessageBubble"
import SearchInput from "@/components/SearchInput"
import ThemeToggle from "@/components/ThemeToggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createId, formatRelativeTime } from "@/lib/utils"
import type { ChatMetaPayload, Message, SearchHistoryEntry } from "@/types"

const PROMPT_GROUPS = {
  starter: [
    "SCHD가 뭐야?",
    "삼성전자 지금 살만해?",
    "애플 주가 흐름 설명해줘"
  ],
  compare: [
    "QQQ vs SPY 비교해줘",
    "VOO와 SCHD 차이 알려줘",
    "엔비디아 vs AMD 비교해줘"
  ],
  income: [
    "배당주 추천해줘",
    "월배당 ETF 뭐가 좋아?",
    "지금 배당 ETF 흐름 요약해줘"
  ]
} as const

const HISTORY_STORAGE_KEY = "stock-signal-chat-history"
const THEME_STORAGE_KEY = "stock-signal-chat-theme"

function parseSseChunk(chunk: string) {
  const events = chunk.split("\n\n")
  const pending = events.pop() ?? ""

  return {
    events,
    pending
  }
}

function summarizeHtmlError(raw: string) {
  const titleMatch = raw.match(/<title>(.*?)<\/title>/i)
  const h1Match = raw.match(/<h1[^>]*>(.*?)<\/h1>/i)
  const text = titleMatch?.[1] ?? h1Match?.[1] ?? "서버가 HTML 오류 페이지를 반환했습니다."

  return text.replace(/<[^>]+>/g, "").trim()
}

function MetricCard({
  label,
  value,
  icon: Icon
}: {
  label: string
  value: string
  icon: typeof BarChart3
}) {
  return (
    <Card className="dashboard-shell">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="terminal-label">{label}</p>
          <p className="mt-3 text-lg font-semibold tracking-tight">{value}</p>
        </div>
        <div className="rounded-2xl border border-primary/15 bg-primary/10 p-3 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [prompt, setPrompt] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [history, setHistory] = useState<SearchHistoryEntry[]>([])
  const [theme, setTheme] = useState<"dark" | "light">("dark")

  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY)
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)

    if (storedHistory) {
      try {
        setHistory(JSON.parse(storedHistory) as SearchHistoryEntry[])
      } catch {
        localStorage.removeItem(HISTORY_STORAGE_KEY)
      }
    }

    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 8)))
  }, [history])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const updateAssistantMessage = (
    id: string,
    updater: (current: Message) => Message
  ) => {
    setMessages((current) =>
      current.map((message) => (message.id === id ? updater(message) : message))
    )
  }

  const rememberSearch = (submittedPrompt: string, meta: ChatMetaPayload) => {
    if (meta.stocks.length === 0) {
      return
    }

    setHistory((current) => [
      {
        id: createId("history"),
        prompt: submittedPrompt,
        tickers: meta.stocks.map((stock) => stock.ticker).slice(0, 2),
        createdAt: new Date().toISOString()
      },
      ...current.filter((item) => item.prompt !== submittedPrompt)
    ].slice(0, 8))
  }

  const submitPrompt = async (nextPrompt?: string) => {
    const submittedPrompt = (nextPrompt ?? prompt).trim()

    if (!submittedPrompt || isStreaming) {
      return
    }

    const assistantId = createId("assistant")
    const userMessage: Message = {
      id: createId("user"),
      role: "user",
      content: submittedPrompt,
      createdAt: new Date().toISOString(),
      status: "done"
    }
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      status: "streaming",
      stocks: [],
      news: []
    }
    const historyPayload = messages.map(({ role, content }) => ({ role, content }))

    setMessages((current) => [...current, userMessage, assistantMessage])
    setPrompt("")
    setIsStreaming(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: submittedPrompt,
          history: historyPayload
        })
      })

      const contentType = response.headers.get("content-type") ?? ""

      if (!response.ok) {
        const raw = await response.text()
        throw new Error(raw || "스트리밍 응답을 받을 수 없습니다.")
      }

      if (!contentType.includes("text/event-stream")) {
        const raw = await response.text()
        const reason = raw.trim().startsWith("<")
          ? summarizeHtmlError(raw)
          : raw || "스트리밍 형식이 아닌 응답을 받았습니다."

        throw new Error(reason)
      }

      if (!response.body) {
        throw new Error("스트리밍 응답을 받을 수 없습니다.")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let pending = ""

      const applyEvent = (rawEvent: string) => {
        const lines = rawEvent
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)

        let eventName = "message"
        let data = ""

        lines.forEach((line) => {
          if (line.startsWith("event:")) {
            eventName = line.slice(6).trim()
          }

          if (line.startsWith("data:")) {
            data += line.slice(5).trim()
          }
        })

        if (!data) {
          return
        }

        let payload: ChatMetaPayload | { text: string } | { message: string }

        try {
          payload = JSON.parse(data) as
            | ChatMetaPayload
            | { text: string }
            | { message: string }
        } catch {
          throw new Error("스트리밍 데이터 파싱에 실패했습니다.")
        }

        if (eventName === "meta") {
          const meta = payload as ChatMetaPayload
          updateAssistantMessage(assistantId, (current) => ({
            ...current,
            ticker: meta.resolvedTicker,
            stocks: meta.stocks,
            news: meta.news
          }))
          rememberSearch(submittedPrompt, meta)
          return
        }

        if (eventName === "token") {
          const tokenPayload = payload as { text: string }
          updateAssistantMessage(assistantId, (current) => ({
            ...current,
            content: `${current.content}${tokenPayload.text}`
          }))
          return
        }

        if (eventName === "error") {
          const errorPayload = payload as { message: string }
          updateAssistantMessage(assistantId, (current) => ({
            ...current,
            status: "error",
            content:
              current.content ||
              `분석을 불러오지 못했습니다.\n\n${errorPayload.message}`
          }))
          return
        }

        if (eventName === "done") {
          updateAssistantMessage(assistantId, (current) => ({
            ...current,
            status: current.status === "error" ? "error" : "done"
          }))
        }
      }

      while (true) {
        const { value, done } = await reader.read()

        pending += decoder.decode(value ?? new Uint8Array(), { stream: !done })

        const parsed = parseSseChunk(pending)
        pending = parsed.pending
        parsed.events.forEach(applyEvent)

        if (done) {
          if (pending.trim()) {
            applyEvent(pending)
          }
          break
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다."

      updateAssistantMessage(assistantId, (current) => ({
        ...current,
        status: "error",
        content: `분석을 불러오지 못했습니다.\n\n${message}`
      }))
    } finally {
      setIsStreaming(false)
    }
  }

  const emptyState = messages.length === 0

  return (
    <div className="mx-auto grid min-h-screen max-w-[1600px] gap-4 px-4 py-4 xl:grid-cols-[320px_minmax(0,1fr)_320px] xl:px-6 xl:py-6">
      <aside className="order-2 xl:order-1">
        <Card className="dashboard-shell surface-grid h-full">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="terminal-label">Portfolio Project</p>
                  <CardTitle className="mt-2 text-2xl">Stock Signal Chat</CardTitle>
                </div>
              </div>
              <ThemeToggle
                theme={theme}
                onToggle={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              />
            </div>
            <CardDescription className="mt-4 leading-7">
              실시간 시세와 뉴스, AI 설명을 한 화면에서 읽을 수 있도록 다시 설계한
              리서치 대시보드형 챗봇입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3">
              <MetricCard label="Engine" value="Groq streaming" icon={BrainCircuit} />
              <MetricCard label="Context" value="Stock + News + Signals" icon={Newspaper} />
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <p className="terminal-label">Prompt Deck</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  shadcn 스타일의 탐색형 UI로 질문을 빠르게 시작할 수 있게 정리했습니다.
                </p>
              </div>

              <Tabs defaultValue="starter" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="starter">Starter</TabsTrigger>
                  <TabsTrigger value="compare">Compare</TabsTrigger>
                  <TabsTrigger value="income">Income</TabsTrigger>
                </TabsList>
                {Object.entries(PROMPT_GROUPS).map(([key, prompts]) => (
                  <TabsContent key={key} value={key} className="space-y-2">
                    {prompts.map((example) => (
                      <Button
                        key={example}
                        variant="outline"
                        className="h-auto w-full justify-start rounded-2xl px-4 py-3 text-left font-medium"
                        onClick={() => submitPrompt(example)}
                      >
                        {example}
                      </Button>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </CardContent>
        </Card>
      </aside>

      <main className="order-1 xl:order-2">
        <Card className="dashboard-shell flex min-h-[calc(100vh-2rem)] flex-col overflow-hidden">
          <CardHeader className="space-y-5 border-b border-border/70 pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">
                <RadioTower className="h-3.5 w-3.5" />
                실시간 스트리밍
              </Badge>
              <Badge variant="muted">
                <TrendingUp className="h-3.5 w-3.5" />
                주식 / ETF / 비교 분석
              </Badge>
              <Badge variant="muted">
                <WalletCards className="h-3.5 w-3.5" />
                카드 중심 리서치 UX
              </Badge>
            </div>
            <div className="space-y-3">
              <p className="terminal-label">AI Equity Desk</p>
              <CardTitle className="max-w-4xl text-4xl leading-tight tracking-[-0.05em] md:text-5xl">
                종목을 입력하면 시세, 뉴스, 해석을 한 번에 읽는 리서치 챗 인터페이스
              </CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-7 md:text-base">
                부분적인 카드 꾸미기가 아니라, 탐색부터 분석까지 이어지는 흐름 자체를
                금융 대시보드처럼 다시 디자인했습니다.
              </CardDescription>
            </div>
          </CardHeader>

          <div className="flex-1 px-4 py-4 sm:px-6">
            {emptyState ? (
              <div className="grid h-full gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <Card className="dashboard-shell bg-terminal-glow">
                  <CardHeader>
                    <Badge variant="accent" className="w-fit">
                      <Sparkles className="h-3.5 w-3.5" />
                      Portfolio-ready Hero
                    </Badge>
                    <CardTitle className="text-3xl leading-tight tracking-[-0.04em] md:text-4xl">
                      질문 하나로 카드, 뉴스, 분석 텍스트가 연결되는 흐름을 바로 체험해보세요
                    </CardTitle>
                    <CardDescription className="text-sm leading-7 md:text-base">
                      기존의 평면적인 챗 UI 대신, 좌우 패널과 스크롤 영역이 살아 있는
                      리서치 터미널 느낌으로 전체 화면을 재구성했습니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-3">
                    <MetricCard label="Layer 01" value="Market Snapshot" icon={BarChart3} />
                    <MetricCard label="Layer 02" value="Recent News" icon={Newspaper} />
                    <MetricCard label="Layer 03" value="AI Summary" icon={BrainCircuit} />
                  </CardContent>
                </Card>

                <div className="grid gap-4">
                  <Card className="dashboard-shell border-primary/15 bg-primary/5">
                    <CardHeader className="space-y-2">
                      <p className="terminal-label">Preview Prompt</p>
                      <CardTitle className="text-xl">SCHD는 어떤 ETF야?</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm leading-7 text-muted-foreground">
                      배당 중심 ETF의 성격, 최근 뉴스 흐름, 현재 가격 컨텍스트까지 함께 보여주는
                      시나리오를 기본 진입점으로 둡니다.
                    </CardContent>
                  </Card>

                  <Card className="dashboard-shell">
                    <CardHeader className="space-y-2">
                      <p className="terminal-label">Prompt Ideas</p>
                      <CardDescription>첫 화면에서도 바로 눌러볼 수 있는 대표 질문들입니다.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      {PROMPT_GROUPS.starter.map((example) => (
                        <button
                          key={example}
                          type="button"
                          onClick={() => submitPrompt(example)}
                          className="rounded-full border border-border/70 bg-secondary/70 px-3 py-1.5 text-xs font-medium transition hover:border-primary/30 hover:text-primary"
                        >
                          {example}
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-420px)] pr-2 xl:h-[calc(100vh-345px)]">
                <div className="mx-auto flex max-w-5xl flex-col gap-5 pb-4">
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="border-t border-border/70 px-4 py-4 sm:px-6">
            <SearchInput
              value={prompt}
              disabled={isStreaming}
              showExamples={emptyState}
              examples={PROMPT_GROUPS.starter}
              onChange={setPrompt}
              onSubmit={() => submitPrompt()}
              onPickExample={(example) => submitPrompt(example)}
            />
          </div>
        </Card>
      </main>

      <aside className="order-3">
        <Card className="dashboard-shell surface-grid h-full">
          <CardHeader className="space-y-3">
            <p className="terminal-label">Signal Board</p>
            <CardTitle className="text-2xl">Recent Searches</CardTitle>
            <CardDescription>
              최근 대화 히스토리와 이 앱의 사용 포인트를 한쪽 패널에 모았습니다.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Badge variant="muted">저장 개수 {history.length}</Badge>
              <Separator />
            </div>

            <ScrollArea className="h-[240px] pr-2">
              <div className="space-y-3">
                {history.length === 0 ? (
                  <Card className="border-dashed bg-secondary/40">
                    <CardContent className="p-4 text-sm leading-7 text-muted-foreground">
                      첫 질문을 보내면 이곳에 최근 검색 종목이 쌓입니다.
                    </CardContent>
                  </Card>
                ) : (
                  history.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => submitPrompt(entry.prompt)}
                      className="w-full text-left"
                    >
                      <Card className="transition hover:border-primary/25 hover:bg-accent/30">
                        <CardContent className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <p className="line-clamp-2 text-sm font-medium leading-6">
                              {entry.prompt}
                            </p>
                            <Clock3 className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {entry.tickers.map((ticker) => (
                              <Badge key={ticker} variant="muted">
                                {ticker}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeTime(entry.createdAt)}
                          </p>
                        </CardContent>
                      </Card>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>

            <Separator />

            <div className="space-y-3">
              <p className="terminal-label">How To Ask Better</p>
              <div className="space-y-3 text-sm leading-7 text-muted-foreground">
                <p>비교 질문일수록 티커를 두 개 이상 직접 적어주면 카드와 분석 품질이 좋아집니다.</p>
                <p>배당, 성장, 적립식, 단기 모멘텀처럼 관점을 함께 넣으면 더 실전형 답변이 나옵니다.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}
