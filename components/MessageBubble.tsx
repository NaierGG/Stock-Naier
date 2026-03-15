"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import NewsCard from "@/components/NewsCard"
import StockCard from "@/components/StockCard"
import TypingIndicator from "@/components/TypingIndicator"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Message } from "@/types"

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"

  return (
    <article className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("w-full space-y-3", isUser ? "max-w-2xl" : "max-w-5xl")}>
        <div
          className={cn(
            "flex items-center gap-2",
            isUser ? "justify-end" : "justify-start"
          )}
        >
          <Badge variant={isUser ? "accent" : "muted"} className="rounded-full">
            {isUser ? "User Prompt" : "AI Analysis"}
          </Badge>
        </div>

        <Card
          className={cn(
            "overflow-hidden",
            isUser
              ? "border-primary/15 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white"
              : "dashboard-shell"
          )}
        >
          <CardContent className="space-y-5 p-5">
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
              <p className="text-sm text-muted-foreground">응답을 준비하고 있습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </article>
  )
}
