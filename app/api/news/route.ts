import { NextResponse } from "next/server"

import { fetchLatestNews } from "@/lib/finnhub"
import { resolveTickersFromQuestion } from "@/lib/stock"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ticker = searchParams.get("ticker")?.trim()

  if (!ticker) {
    return NextResponse.json(
      { error: "ticker query parameter is required" },
      { status: 400 }
    )
  }

  const [resolvedTicker] = await resolveTickersFromQuestion(ticker, ticker)

  if (!resolvedTicker) {
    return NextResponse.json({ news: [] })
  }

  const news = await fetchLatestNews(resolvedTicker)

  return NextResponse.json({ news })
}
