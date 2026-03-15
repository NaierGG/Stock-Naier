"use client"

import { useEffect, useRef, useState } from "react"
import {
  BarChart3,
  Clock3,
  History,
  Newspaper,
  RadioTower,
  Sparkles,
  TrendingUp
} from "lucide-react"

import MessageBubble from "@/components/MessageBubble"
import SearchInput from "@/components/SearchInput"
import ThemeToggle from "@/components/ThemeToggle"
import { createId, formatRelativeTime } from "@/lib/utils"
import type { ChatMetaPayload, Message, SearchHistoryEntry } from "@/types"

const EXAMPLES = [
  "SCHD가 뭐야?",
  "삼성전자 지금 살만해?",
  "QQQ vs SPY 비교해줘",
  "배당주 추천해줘"
]

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

function StatCard({
  label,
  value,
  icon: Icon
}: {
  label: string
  value: string
  icon: typeof BarChart3
}) {
  return (
    <div className="micro-card">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        <div className="rounded-[16px] border border-black/5 bg-white/80 p-2 text-indigo-500 dark:border-white/10 dark:bg-white/5">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-4 text-base font-semibold text-zinc-900 dark:text-white">{value}</p>
    </div>
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
    <div className="relative mx-auto flex min-h-screen w-full max-w-[1540px] flex-col gap-5 px-4 py-5 xl:flex-row xl:px-6 xl:py-6">
      <main className="order-1 panel-surface flex min-h-[calc(100vh-2.5rem)] flex-1 flex-col xl:order-2 xl:min-h-[calc(100vh-3rem)]">
        <header className="border-b border-black/5 px-5 py-5 dark:border-white/10">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="chip">
                  <RadioTower className="h-3.5 w-3.5" />
                  실시간 스트리밍
                </span>
                <span className="chip">
                  <TrendingUp className="h-3.5 w-3.5" />
                  주식 / ETF / 비교 분석
                </span>
                <span className="chip">
                  <Newspaper className="h-3.5 w-3.5" />
                  뉴스 컨텍스트 반영
                </span>
              </div>

              <div className="space-y-3">
                <p className="section-kicker">AI Equity Desk</p>
                <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-zinc-900 dark:text-white md:text-5xl">
                  종목을 입력하면 시세와 뉴스, 투자 포인트를 한 화면에서 읽는 분석 챗봇
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-300 md:text-base">
                  단순한 답변형 챗봇이 아니라, 실시간 종목 카드와 뉴스 카드가 먼저 맥락을 만들고
                  AI가 그 위에서 설명하는 포트폴리오형 경험으로 구성했습니다.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start xl:self-auto">
              <div className="hidden rounded-[24px] border border-black/5 bg-white/70 px-4 py-3 text-right shadow-sm dark:border-white/10 dark:bg-white/5 md:block">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                  Session
                </p>
                <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  최근 검색 {history.length}개
                </p>
              </div>
              <ThemeToggle
                theme={theme}
                onToggle={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {emptyState ? (
            <section className="relative mx-auto max-w-5xl overflow-hidden rounded-[36px] border border-black/5 bg-white/55 p-8 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 lg:p-10">
              <div className="absolute -right-8 -top-10 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="absolute -bottom-10 left-10 h-52 w-52 rounded-full bg-indigo-500/10 blur-3xl" />

              <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-400">
                    <Sparkles className="h-3.5 w-3.5" />
                    첫 질문으로 바로 데모 시작
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-3xl font-semibold tracking-[-0.04em] text-zinc-900 dark:text-white md:text-4xl">
                      포트폴리오에서 바로 보여줘도 되는 수준의 금융 AI 경험
                    </h3>
                    <p className="max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-300 md:text-base">
                      질문을 보내면 종목 핵심 지표, 관련 뉴스, AI 요약 분석이 순서대로 붙습니다.
                      사용자는 답변만 읽는 게 아니라 근거 카드부터 확인할 수 있습니다.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <StatCard label="AI Engine" value="Groq streaming" icon={RadioTower} />
                    <StatCard label="Context" value="Stock + News + History" icon={Sparkles} />
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-5 text-white shadow-[0_24px_60px_rgba(2,6,23,0.3)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
                      Preview
                    </p>
                    <p className="mt-3 text-lg font-semibold">SCHD는 어떤 ETF야?</p>
                    <p className="mt-3 text-sm leading-7 text-zinc-300">
                      배당, 재무건전성, 최근 ETF 관련 뉴스까지 함께 읽어주는 답변 흐름을 기본으로
                      설계했습니다.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="rounded-[24px] border border-black/5 bg-black/5 p-4 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Recent
                      </p>
                      <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        QQQ vs SPY 비교
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-black/5 bg-black/5 p-4 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        Insight
                      </p>
                      <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        카드 우선, 설명은 그 다음
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <div className="mx-auto flex max-w-5xl flex-col gap-5 pb-2">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="border-t border-black/5 px-4 py-4 dark:border-white/10 sm:px-5">
          <div className="mx-auto max-w-5xl">
            <SearchInput
              value={prompt}
              disabled={isStreaming}
              showExamples={emptyState}
              examples={EXAMPLES}
              onChange={setPrompt}
              onSubmit={() => submitPrompt()}
              onPickExample={(example) => submitPrompt(example)}
            />
          </div>
        </div>
      </main>

      <aside className="order-2 panel-surface panel-grid w-full overflow-hidden xl:order-1 xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)] xl:w-[360px]">
        <div className="flex h-full flex-col gap-5 p-5">
          <section className="relative overflow-hidden rounded-[30px] border border-indigo-400/15 bg-gradient-to-br from-indigo-500/15 via-slate-900/10 to-cyan-400/5 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-[20px] border border-white/10 bg-white/80 p-3 text-indigo-500 shadow-sm dark:bg-white/10">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="section-kicker">Portfolio Project</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                  Stock Signal Chat
                </h1>
              </div>
            </div>

            <p className="mt-5 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
              Groq 스트리밍, yfinance 시세, Finnhub 뉴스를 한 흐름으로 묶어 종목 검색부터 해석까지
              자연스럽게 이어지도록 만든 분석 챗봇입니다.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="chip">Groq</span>
              <span className="chip">yfinance</span>
              <span className="chip">Finnhub</span>
              <span className="chip">SSE</span>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
              <Sparkles className="h-4 w-4" />
              Quick Prompts
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => submitPrompt(example)}
                  className="rounded-[22px] border border-black/5 bg-black/5 px-4 py-3 text-left text-sm font-medium text-zinc-700 transition hover:-translate-y-0.5 hover:border-indigo-400/25 hover:bg-indigo-500/8 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:border-indigo-400/25 dark:hover:bg-indigo-500/10"
                >
                  {example}
                </button>
              ))}
            </div>
          </section>

          <section className="flex min-h-0 flex-1 flex-col space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
              <History className="h-4 w-4" />
              Recent Searches
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {history.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-black/10 bg-black/5 p-5 text-sm leading-7 text-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
                  검색 기록은 브라우저에 저장됩니다. 첫 질문을 보내면 이곳에 최근 종목이 쌓입니다.
                </div>
              ) : (
                history.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => submitPrompt(entry.prompt)}
                    className="w-full rounded-[24px] border border-black/5 bg-black/5 p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-400/25 hover:bg-cyan-400/5 dark:border-white/10 dark:bg-white/5 dark:hover:border-cyan-400/25 dark:hover:bg-cyan-400/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-2 text-sm font-medium leading-6 text-zinc-900 dark:text-zinc-100">
                        {entry.prompt}
                      </p>
                      <Clock3 className="mt-1 h-4 w-4 shrink-0 text-zinc-400" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.tickers.map((ticker) => (
                        <span
                          key={ticker}
                          className="rounded-full border border-black/5 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200"
                        >
                          {ticker}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                      {formatRelativeTime(entry.createdAt)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      </aside>
    </div>
  )
}
