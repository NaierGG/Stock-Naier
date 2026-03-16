"use client"

import { useEffect, useRef, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
  LineChart,
  Star,
  X
} from "lucide-react"

import MessageBubble from "@/components/MessageBubble"
import SearchInput from "@/components/SearchInput"
import ThemeToggle from "@/components/ThemeToggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn, createId, formatRelativeTime } from "@/lib/utils"
import type {
  ChatMetaPayload,
  Message,
  SearchHistoryEntry,
  WatchlistEntry
} from "@/types"

const QUICK_PROMPTS = [
  "SCHD가 뭐야?",
  "삼성전자 지금 살만해?",
  "QQQ vs SPY 비교해줘",
  "배당주 추천해줘"
] as const

const HISTORY_STORAGE_KEY = "stock-signal-chat-history"
const WATCHLIST_STORAGE_KEY = "stock-signal-watchlist"
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

function stripTldrPrefix(content: string) {
  return content.replace(/^TLDR_JSON:\{[\s\S]*?\}\s*/u, "").trimStart()
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [prompt, setPrompt] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [history, setHistory] = useState<SearchHistoryEntry[]>([])
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([])
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY)
    const storedWatchlist = localStorage.getItem(WATCHLIST_STORAGE_KEY)
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)

    if (storedHistory) {
      try {
        setHistory(JSON.parse(storedHistory) as SearchHistoryEntry[])
      } catch {
        localStorage.removeItem(HISTORY_STORAGE_KEY)
      }
    }

    if (storedWatchlist) {
      try {
        setWatchlist(JSON.parse(storedWatchlist) as WatchlistEntry[])
      } catch {
        localStorage.removeItem(WATCHLIST_STORAGE_KEY)
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
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist))
  }, [watchlist])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)")

    const applyLayoutState = (matches: boolean) => {
      setIsDesktop(matches)
      setIsSidebarOpen(matches)
    }

    applyLayoutState(mediaQuery.matches)

    const listener = (event: MediaQueryListEvent) => {
      applyLayoutState(event.matches)
    }

    mediaQuery.addEventListener("change", listener)

    return () => {
      mediaQuery.removeEventListener("change", listener)
    }
  }, [])

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

  const toggleWatchlist = (ticker: string, name: string) => {
    setWatchlist((current) => {
      const exists = current.some((item) => item.ticker === ticker)

      if (exists) {
        return current.filter((item) => item.ticker !== ticker)
      }

      return [
        ...current,
        {
          ticker,
          name,
          addedAt: new Date().toISOString()
        }
      ]
    })
  }

  const isPinned = (ticker: string) =>
    watchlist.some((entry) => entry.ticker === ticker)

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
      news: [],
      tldr: []
    }
    const historyPayload = messages.map(({ role, content }) => ({ role, content }))

    setMessages((current) => [...current, userMessage, assistantMessage])
    setPrompt("")
    setIsStreaming(true)

    if (!isDesktop) {
      setIsSidebarOpen(false)
    }

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

        let payload:
          | ChatMetaPayload
          | { text: string }
          | { message: string }
          | { points: string[] }

        try {
          payload = JSON.parse(data) as
            | ChatMetaPayload
            | { text: string }
            | { message: string }
            | { points: string[] }
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

        if (eventName === "tldr") {
          const tldrPayload = payload as { points: string[] }
          updateAssistantMessage(assistantId, (current) => ({
            ...current,
            tldr: tldrPayload.points,
            content: stripTldrPrefix(current.content)
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
            content: stripTldrPrefix(current.content),
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
      {!isDesktop && isSidebarOpen ? (
        <button
          type="button"
          aria-label="사이드바 닫기"
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[1px] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}

      {!isSidebarOpen ? (
        <button
          type="button"
          aria-label="사이드바 열기"
          className="fixed bottom-6 left-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-border/80 bg-card text-muted-foreground shadow-lg transition hover:text-foreground"
          onClick={() => setIsSidebarOpen(true)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      ) : null}

      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-[260px] shrink-0 flex-col border-r border-border/60 bg-secondary/40 transition-transform duration-200 dark:bg-[#171717] lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="relative flex h-full flex-col px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-background text-foreground">
                    <LineChart className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold">Stock-Naier</p>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  관심 종목과 최근 질문을 빠르게 다시 꺼내볼 수 있습니다.
                </p>
              </div>

              <div className="lg:hidden">
                <ThemeToggle
                  theme={theme}
                  onToggle={() =>
                    setTheme((current) => (current === "dark" ? "light" : "dark"))
                  }
                />
              </div>
            </div>

            <div className="mt-8">
              <p className="px-2 text-xs font-medium text-muted-foreground">빠른 질문</p>
              <div className="mt-2 space-y-1">
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

            <div className="mt-6">
              <div className="flex items-center gap-2 px-2 text-xs font-medium text-muted-foreground">
                <Star className="h-4 w-4" />
                관심 종목
              </div>
              <div className="mt-2 space-y-1">
                {watchlist.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    종목 카드의 별 버튼으로 추가하세요.
                  </p>
                ) : (
                  watchlist.map((entry) => (
                    <Button
                      key={entry.ticker}
                      type="button"
                      variant="ghost"
                      className="h-auto w-full justify-start rounded-2xl px-3 py-2.5"
                      onClick={() => submitPrompt(`${entry.ticker} 분석해줘`)}
                    >
                      <Star className="mr-2 h-3.5 w-3.5 fill-current text-amber-500" />
                      <span className="font-medium">{entry.ticker}</span>
                      <span className="ml-1.5 truncate text-xs text-muted-foreground">
                        {entry.name}
                      </span>
                    </Button>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <History className="h-4 w-4" />
                  최근 검색
                </div>
                <span className="text-xs text-muted-foreground">{history.length}</span>
              </div>
              <ScrollArea className="mt-2 flex-1 pr-1">
                <div className="space-y-1 pb-2">
                  {history.length === 0 ? (
                    <Card className="rounded-2xl bg-background/60 shadow-none">
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
                        <Card className="rounded-2xl bg-background/60 shadow-none transition-colors hover:bg-background">
                          <CardContent className="space-y-2 p-4">
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

            <button
              type="button"
              aria-label="사이드바 닫기"
              className="absolute -right-4 bottom-6 flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-card text-muted-foreground shadow-lg transition hover:text-foreground"
              onClick={() => setIsSidebarOpen(false)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="mt-4 hidden lg:block">
              <ThemeToggle
                theme={theme}
                onToggle={() =>
                  setTheme((current) => (current === "dark" ? "light" : "dark"))
                }
              />
            </div>
          </div>
        </aside>

        <main className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 lg:px-8">
              <p className="text-sm font-semibold">Stock-Naier</p>
              <div className="hidden lg:block">
                <ThemeToggle
                  theme={theme}
                  onToggle={() =>
                    setTheme((current) => (current === "dark" ? "light" : "dark"))
                  }
                />
              </div>
            </div>
          </header>

          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="mx-auto flex h-full w-full max-w-5xl flex-1 flex-col px-4 lg:px-8">
              {emptyState ? (
                <div className="flex flex-1 items-center">
                  <div className="mx-auto flex w-full max-w-3xl flex-col items-center py-16 text-center">
                    <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                      무엇을 도와드릴까요?
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                      종목명, 티커, 비교 질문을 자연스럽게 입력해 보세요. 시세와 뉴스,
                      핵심 포인트를 한 번에 정리해드립니다.
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

                    {history.length > 0 ? (
                      <div className="mt-10 w-full max-w-2xl text-left lg:hidden">
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
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isPinned={isPinned}
                        onToggleWatchlist={toggleWatchlist}
                      />
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
                  onChange={setPrompt}
                  onSubmit={() => submitPrompt()}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
