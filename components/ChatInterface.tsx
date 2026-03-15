"use client"

import { useEffect, useRef, useState } from "react"
import { Clock3, History, LineChart, Sparkles } from "lucide-react"

import MessageBubble from "@/components/MessageBubble"
import SearchInput from "@/components/SearchInput"
import ThemeToggle from "@/components/ThemeToggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createId, formatRelativeTime } from "@/lib/utils"
import type { ChatMetaPayload, Message, SearchHistoryEntry } from "@/types"

const QUICK_PROMPTS = [
  "SCHD가 뭐야?",
  "삼성전자 지금 살만해?",
  "QQQ vs SPY 비교해줘",
  "배당주 추천해줘"
] as const

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
  const text =
    titleMatch?.[1] ?? h1Match?.[1] ?? "서버가 HTML 오류 페이지를 반환했습니다."

  return text.replace(/<[^>]+>/g, "").trim()
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

    setHistory((current) =>
      [
        {
          id: createId("history"),
          prompt: submittedPrompt,
          tickers: meta.stocks.map((stock) => stock.ticker).slice(0, 2),
          createdAt: new Date().toISOString()
        },
        ...current.filter((item) => item.prompt !== submittedPrompt)
      ].slice(0, 8)
    )
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
          throw new Error("스트리밍 데이터를 파싱하지 못했습니다.")
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
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside className="hidden w-[280px] shrink-0 border-r border-border/60 bg-background/80 lg:flex lg:flex-col">
          <div className="flex h-full flex-col px-5 py-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary text-foreground">
                    <LineChart className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold">Stock Signal Chat</p>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  실시간 시세와 뉴스 흐름을 바탕으로 종목을 정리해주는 분석 챗봇입니다.
                </p>
              </div>
              <ThemeToggle
                theme={theme}
                onToggle={() =>
                  setTheme((current) => (current === "dark" ? "light" : "dark"))
                }
              />
            </div>

            <div className="mt-10">
              <p className="text-xs font-medium text-muted-foreground">빠른 질문</p>
              <div className="mt-3 space-y-2">
                {QUICK_PROMPTS.map((example) => (
                  <Button
                    key={example}
                    type="button"
                    variant="ghost"
                    className="h-auto w-full justify-start rounded-2xl px-3 py-3 text-left font-medium"
                    onClick={() => submitPrompt(example)}
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-8 flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <History className="h-4 w-4" />
                  최근 검색
                </div>
                <span className="text-xs text-muted-foreground">{history.length}</span>
              </div>
              <ScrollArea className="mt-3 flex-1 pr-2">
                <div className="space-y-2 pb-2">
                  {history.length === 0 ? (
                    <Card className="rounded-2xl shadow-none">
                      <CardContent className="p-4 text-sm leading-6 text-muted-foreground">
                        아직 검색 기록이 없습니다.
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
                        <Card className="rounded-2xl shadow-none transition-colors hover:bg-secondary/80">
                          <CardContent className="space-y-3 p-4">
                            <p className="line-clamp-2 text-sm font-medium leading-6">
                              {entry.prompt}
                            </p>
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
            </div>

            <Card className="mt-6 rounded-2xl border-border/60 bg-secondary/50 shadow-none">
              <CardContent className="p-4 text-sm leading-6 text-muted-foreground">
                티커와 원하는 관점을 함께 적으면 더 좋은 답변을 받을 수 있습니다.
                예: &quot;SCHD 배당 안정성 어때?&quot;
              </CardContent>
            </Card>
          </div>
        </aside>

        <main className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 lg:px-8">
              <div>
                <p className="text-sm font-semibold">Stock Signal Chat</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  실시간 시세와 뉴스 문맥을 함께 읽는 주식 분석 챗봇
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="muted" className="hidden sm:inline-flex">
                  Groq · yfinance · Finnhub
                </Badge>
                <div className="lg:hidden">
                  <ThemeToggle
                    theme={theme}
                    onToggle={() =>
                      setTheme((current) => (current === "dark" ? "light" : "dark"))
                    }
                  />
                </div>
              </div>
            </div>
          </header>

          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="mx-auto flex h-full w-full max-w-5xl flex-1 flex-col px-4 lg:px-8">
              {emptyState ? (
                <div className="flex flex-1 items-center">
                  <div className="mx-auto w-full max-w-3xl py-16 text-center">
                    <Badge variant="muted" className="mx-auto inline-flex">
                      <Sparkles className="h-3.5 w-3.5" />
                      실시간 분석 준비 완료
                    </Badge>
                    <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
                      무엇이 궁금한가요?
                    </h1>
                    <p className="mt-4 text-base leading-7 text-muted-foreground">
                      종목명이나 티커를 입력하면 현재 시세, 주요 뉴스, 투자 포인트를
                      한 번에 정리해드립니다.
                    </p>

                    <div className="mt-8 flex flex-wrap justify-center gap-2">
                      {QUICK_PROMPTS.map((example) => (
                        <Button
                          key={example}
                          type="button"
                          variant="secondary"
                          className="rounded-full"
                          onClick={() => submitPrompt(example)}
                        >
                          {example}
                        </Button>
                      ))}
                    </div>

                    <div className="mt-10 grid gap-3 text-left sm:grid-cols-3">
                      {[
                        {
                          title: "시세 요약",
                          description: "현재가, 등락률, 52주 범위와 기본 지표를 보여줍니다."
                        },
                        {
                          title: "뉴스 맥락",
                          description: "최신 뉴스 3건을 함께 붙여서 답변의 배경을 제공합니다."
                        },
                        {
                          title: "AI 정리",
                          description: "초보자도 읽기 쉽게 장점, 단점, 유의점을 요약합니다."
                        }
                      ].map((item) => (
                        <Card key={item.title} className="rounded-3xl shadow-none">
                          <CardContent className="p-5">
                            <p className="text-sm font-semibold">{item.title}</p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              {item.description}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {history.length > 0 ? (
                      <div className="mt-10 text-left lg:hidden">
                        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                          <Clock3 className="h-4 w-4 text-muted-foreground" />
                          최근 검색
                        </div>
                        <div className="space-y-2">
                          {history.slice(0, 3).map((entry) => (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={() => submitPrompt(entry.prompt)}
                              className="w-full text-left"
                            >
                              <Card className="rounded-2xl shadow-none">
                                <CardContent className="p-4">
                                  <p className="line-clamp-1 text-sm font-medium">
                                    {entry.prompt}
                                  </p>
                                </CardContent>
                              </Card>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <ScrollArea className="flex-1">
                  <div className="mx-auto flex max-w-3xl flex-col gap-8 py-8">
                    {messages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))}
                    <div ref={bottomRef} />
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>

          <div className="border-t border-border/60 bg-background/92">
            <div className="mx-auto w-full max-w-5xl px-4 py-4 lg:px-8">
              <div className="mx-auto max-w-3xl">
                <SearchInput
                  value={prompt}
                  disabled={isStreaming}
                  showExamples={emptyState}
                  examples={QUICK_PROMPTS}
                  onChange={setPrompt}
                  onSubmit={() => submitPrompt()}
                  onPickExample={(example) => submitPrompt(example)}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
