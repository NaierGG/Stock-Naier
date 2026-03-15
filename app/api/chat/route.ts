import { NextResponse } from "next/server"

import { fetchLatestNews } from "@/lib/finnhub"
import { groq, MODEL } from "@/lib/groq"
import { buildAnalysisPrompt, SYSTEM_PROMPT } from "@/lib/prompts"
import { fetchStocks, resolveTickersFromQuestion } from "@/lib/stock"
import type { ChatRequestBody } from "@/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function sseChunk(event: string, data: unknown) {
  return `event:${event}\ndata:${JSON.stringify(data)}\n\n`
}

export async function POST(request: Request) {
  let body: ChatRequestBody

  try {
    body = (await request.json()) as ChatRequestBody
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 })
  }

  if (!body.message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 })
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is missing. Add it to .env.local and restart the dev server." },
      { status: 500 }
    )
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start: async (controller) => {
      try {
        const tickers = await resolveTickersFromQuestion(body.message, body.ticker)
        const stocks = await fetchStocks(tickers)
        const primaryTicker = stocks[0]?.ticker ?? tickers[0] ?? null
        const news = primaryTicker ? await fetchLatestNews(primaryTicker) : []

        controller.enqueue(
          encoder.encode(
            sseChunk("meta", {
              resolvedTicker: primaryTicker,
              stocks,
              news
            })
          )
        )

        const completion = await groq.chat.completions.create({
          model: MODEL,
          stream: true,
          temperature: 0.35,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...body.history.slice(-8).map((item) => ({
              role: item.role,
              content: item.content
            })),
            {
              role: "user",
              content: buildAnalysisPrompt({
                message: body.message,
                stocks,
                news
              })
            }
          ]
        })

        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content ?? ""

          if (!text) {
            continue
          }

          controller.enqueue(encoder.encode(sseChunk("token", { text })))
        }

        controller.enqueue(encoder.encode(sseChunk("done", {})))
        controller.close()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown server error occurred."

        controller.enqueue(encoder.encode(sseChunk("error", { message })))
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  })
}
