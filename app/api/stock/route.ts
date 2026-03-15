import { NextResponse } from "next/server"

import { fetchStockSnapshot, resolveTickersFromQuestion } from "@/lib/stock"

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
    return NextResponse.json(
      { error: "No matching ticker could be resolved." },
      { status: 404 }
    )
  }

  const stock = await fetchStockSnapshot(resolvedTicker)

  if (!stock) {
    return NextResponse.json(
      { error: "Stock data could not be retrieved." },
      { status: 502 }
    )
  }

  return NextResponse.json(stock)
}
