"use client"

import { useEffect, useRef, useState } from "react"
import {
  BarChart3,
  Clock3,
  History,
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
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-4 px-4 py-4 lg:flex-row lg:px-6 lg:py-6">
      <aside className="panel-surface panel-grid w-full overflow-hidden lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:w-[330px]">
        <div className="flex h-full flex-col p-5">
          <div className="rounded-[1.75rem] border border-indigo-500/15 bg-gradient-to-br from-indigo-500/15 to-emerald-500/5 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/80 p-3 text-indigo-500 shadow-sm dark:bg-white/10">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                  Portfolio Project
                </p>
                <h1 className="mt-1 text-xl font-semibold">Stock Signal Chat</h1>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
              Groq 스트리밍, yfinance 시세, Finnhub 뉴스를 하나의 대화형 투자 분석 경험으로 엮은 웹앱입니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip">Groq</span>
              <span className="chip">yfinance</span>
              <span className="chip">Finnhub</span>
              <span className="chip">SSE</span>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
            <Sparkles className="h-4 w-4" />
            Quick Prompts
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => submitPrompt(example)}
                className="chip"
              >
                {example}
              </button>
            ))}
          </div>

          <div className="mt-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
            <History className="h-4 w-4" />
            Recent Searches
          </div>

          <div className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
            {history.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-black/10 p-4 text-sm text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                검색 기록은 브라우저에 저장됩니다. 첫 질문을 보내면 이곳에 최근 종목이 쌓입니다.
              </div>
            ) : (
              history.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => submitPrompt(entry.prompt)}
                  className="w-full rounded-[1.5rem] border border-black/5 bg-black/5 p-4 text-left transition hover:border-indigo-400/20 hover:bg-indigo-500/5 dark:border-white/10 dark:bg-white/5 dark:hover:border-indigo-400/20 dark:hover:bg-indigo-500/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-2 text-sm font-medium leading-6 text-zinc-900 dark:text-white">
                      {entry.prompt}
                    </p>
                    <Clock3 className="mt-1 h-4 w-4 shrink-0 text-zinc-400" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entry.tickers.map((ticker) => (
                      <span
                        key={ticker}
                        className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 dark:bg-white/10 dark:text-zinc-200"
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
        </div>
      </aside>

      <main className="panel-surface flex min-h-[calc(100vh-2rem)] flex-1 flex-col overflow-hidden lg:min-h-[calc(100vh-3rem)]">
        <header className="flex flex-col gap-4 border-b border-black/5 px-5 py-5 dark:border-white/10 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="chip">
                <RadioTower className="h-3.5 w-3.5" />
                실시간 스트리밍 분석
              </span>
              <span className="chip">
                <TrendingUp className="h-3.5 w-3.5" />
                ETF / 주식 / 비교 질문
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">
              종목을 입력하면 시세와 뉴스까지 함께 읽어주는 분석 챗봇
            </h2>
            <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
              티커 또는 종목명을 입력하면 최신 데이터 컨텍스트를 붙여 AI 답변을 스트리밍으로 보여줍니다.
            </p>
          </div>
          <ThemeToggle
            theme={theme}
            onToggle={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          />
        </header>

        {history.length > 0 ? (
          <div className="border-b border-black/5 px-5 py-3 dark:border-white/10 lg:hidden">
            <div className="flex gap-2 overflow-x-auto">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => submitPrompt(entry.prompt)}
                  className="chip whitespace-nowrap"
                >
                  {entry.tickers.join(" / ")}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-4 py-5 md:px-5">
          {emptyState ? (
            <section className="mx-auto flex max-w-4xl flex-col items-center justify-center rounded-[2rem] border border-dashed border-black/10 bg-black/5 px-6 py-14 text-center dark:border-white/10 dark:bg-white/5">
              <div className="rounded-full bg-indigo-500/10 p-4 text-indigo-400">
                <Sparkles className="h-7 w-7" />
              </div>
              <h3 className="mt-6 text-3xl font-semibold tracking-tight">
                빠르고 보기 좋은 주식 분석 데모를 바로 시작해보세요
              </h3>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                첫 질문을 보내면 종목 카드, 뉴스 카드, 마크다운 분석 답변이 한 번에 나타납니다.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => submitPrompt(example)}
                    className="chip"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <div className="mx-auto flex max-w-5xl flex-col gap-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="border-t border-black/5 px-4 py-4 dark:border-white/10 md:px-5">
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
    </div>
  )
}
