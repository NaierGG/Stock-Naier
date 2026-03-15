"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import NewsCard from "@/components/NewsCard"
import StockCard from "@/components/StockCard"
import TypingIndicator from "@/components/TypingIndicator"
import { cn } from "@/lib/utils"
import type { Message } from "@/types"

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"

  return (
    <article className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("w-full", isUser ? "max-w-2xl" : "max-w-5xl")}>
        <div
          className={cn(
            "mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.22em]",
            isUser
              ? "justify-end text-indigo-300"
              : "text-zinc-500 dark:text-zinc-400"
          )}
        >
          <span>{isUser ? "You" : "AI Desk"}</span>
          <span className="h-1 w-1 rounded-full bg-current" />
          <span>{isUser ? "Prompt" : "Streaming Analysis"}</span>
        </div>

        <div
          className={cn(
            "space-y-5 rounded-[32px] border px-5 py-4 shadow-[0_24px_80px_rgba(2,6,23,0.16)]",
            isUser
              ? "border-indigo-400/20 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white"
              : "border-black/5 bg-white/72 text-zinc-900 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/60 dark:text-zinc-50"
          )}
        >
          {!isUser && message.stocks?.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {message.stocks.map((stock) => (
                <StockCard key={stock.ticker} stock={stock} />
              ))}
            </div>
          ) : null}

          {!isUser && message.news?.length ? <NewsCard items={message.news} /> : null}

          {isUser ? (
            <p className="whitespace-pre-wrap text-[15px] leading-7">{message.content}</p>
          ) : message.content ? (
            <div className="markdown-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ ...props }) => (
                    <a {...props} target="_blank" rel="noreferrer" />
                  )
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          ) : message.status === "streaming" ? (
            <TypingIndicator />
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              응답을 준비하고 있습니다.
            </p>
          )}
        </div>
      </div>
    </article>
  )
}
