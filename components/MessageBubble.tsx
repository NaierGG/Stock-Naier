"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import CompareCard from "@/components/CompareCard"
import NewsCard from "@/components/NewsCard"
import StockCard from "@/components/StockCard"
import TypingIndicator from "@/components/TypingIndicator"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Message } from "@/types"

interface MessageBubbleProps {
  message: Message
  isPinned: (ticker: string) => boolean
  onToggleWatchlist: (ticker: string, name: string) => void
}

export default function MessageBubble({
  message,
  isPinned,
  onToggleWatchlist
}: MessageBubbleProps) {
  const isUser = message.role === "user"

  return (
    <article className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("w-full space-y-2", isUser ? "max-w-2xl" : "max-w-3xl")}>
        <div
          className={cn(
            "flex items-center gap-2 text-xs text-muted-foreground",
            isUser ? "justify-end" : "justify-start"
          )}
        >
          <span className="font-medium text-foreground/90">
            {isUser ? "나" : "Stock Signal Chat"}
          </span>
          {!isUser && message.ticker ? <span>{message.ticker}</span> : null}
        </div>

        <Card
          className={cn(
            "rounded-[24px] shadow-none",
            isUser ? "bg-secondary" : "bg-card",
            !isUser && message.status === "error" && "border-destructive/40"
          )}
        >
          <CardContent className="space-y-4 p-5">
            {!isUser && message.stocks?.length ? (
              message.stocks.length >= 2 ? (
                <CompareCard stocks={[message.stocks[0], message.stocks[1]]} />
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {message.stocks.map((stock) => (
                    <StockCard
                      key={stock.ticker}
                      stock={stock}
                      pinned={isPinned(stock.ticker)}
                      onPin={() => onToggleWatchlist(stock.ticker, stock.name)}
                    />
                  ))}
                </div>
              )
            ) : null}

            {!isUser && message.news?.length ? <NewsCard items={message.news} /> : null}

            {!isUser && message.tldr?.length ? (
              <div className="rounded-2xl border border-border/70 bg-secondary/40 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  TL;DR
                </p>
                <ul className="space-y-2">
                  {message.tldr.map((point, index) => (
                    <li key={`${point}-${index}`} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-foreground/10 text-center text-[10px] font-bold leading-4">
                        {index + 1}
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

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
              <p className="text-sm text-muted-foreground">응답을 준비하고 있습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </article>
  )
}
