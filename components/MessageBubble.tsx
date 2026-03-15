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
      <div
        className={cn(
          "w-full max-w-4xl space-y-4 rounded-[2rem] border px-5 py-4 shadow-card",
          isUser
            ? "border-indigo-500/20 bg-indigo-500 text-white"
            : "border-black/5 bg-white/80 text-zinc-900 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-zinc-50"
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
          <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
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
    </article>
  )
}
