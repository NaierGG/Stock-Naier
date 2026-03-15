import "server-only"

import type { NewsItem } from "@/types"
import { isoDate } from "@/lib/utils"

const BASE_URL = "https://finnhub.io/api/v1/"

interface FinnhubSearchResponse {
  result?: Array<{
    description?: string
    displaySymbol?: string
    symbol?: string
    type?: string
  }>
}

interface FinnhubNewsResponseItem {
  headline?: string
  source?: string
  datetime?: number
  url?: string
  summary?: string
}

function getFinnhubApiKey() {
  return process.env.FINNHUB_API_KEY
}

async function finnhubFetch<T>(
  pathname: string,
  searchParams: Record<string, string>
) {
  const apiKey = getFinnhubApiKey()

  if (!apiKey) {
    return null
  }

  const normalizedPath = pathname.replace(/^\/+/, "")
  const url = new URL(normalizedPath, BASE_URL)

  Object.entries(searchParams).forEach(([key, value]) =>
    url.searchParams.set(key, value)
  )
  url.searchParams.set("token", apiKey)

  const response = await fetch(url, {
    next: { revalidate: 300 }
  })

  if (!response.ok) {
    throw new Error(`Finnhub request failed with status ${response.status}`)
  }

  const contentType = response.headers.get("content-type") ?? ""
  const raw = await response.text()

  if (!contentType.includes("application/json")) {
    throw new Error("Finnhub returned a non-JSON response.")
  }

  return JSON.parse(raw) as T
}

function isLikelyTickerSymbol(value: string) {
  return /^[A-Z]{1,5}(?:[.-][A-Z]{1,3})?$/.test(value)
}

export async function searchFinnhubSymbol(query: string) {
  const trimmed = query.trim()

  if (!trimmed || !getFinnhubApiKey()) {
    return null
  }

  let data: FinnhubSearchResponse | null = null

  try {
    data = await finnhubFetch<FinnhubSearchResponse>("search", {
      q: trimmed
    })
  } catch (error) {
    console.error("Finnhub symbol search failed", error)
    return null
  }

  const candidates = data?.result ?? []

  const preferred = candidates.find((item) => {
    const symbol = item.symbol?.toUpperCase()
    const type = item.type?.toLowerCase() ?? ""

    if (!symbol) {
      return false
    }

    if (isLikelyTickerSymbol(trimmed.toUpperCase()) && symbol === trimmed.toUpperCase()) {
      return true
    }

    return type.includes("equity") || type.includes("etf") || type.includes("adr")
  })

  return preferred?.symbol ?? candidates[0]?.symbol ?? null
}

export async function fetchLatestNews(ticker: string): Promise<NewsItem[]> {
  if (!ticker || !getFinnhubApiKey()) {
    return []
  }

  let news: FinnhubNewsResponseItem[] | null = null

  try {
    news = await finnhubFetch<FinnhubNewsResponseItem[]>("company-news", {
      symbol: ticker,
      from: isoDate(14),
      to: isoDate(0)
    })
  } catch (error) {
    console.error("Finnhub news fetch failed", error)
    return []
  }

  return (news ?? [])
    .filter((item) => item.headline && item.url)
    .slice(0, 3)
    .map((item) => ({
      headline: item.headline ?? "",
      source: item.source ?? "Unknown",
      datetime: item.datetime ?? 0,
      url: item.url ?? "",
      summary: item.summary ?? ""
    }))
}
