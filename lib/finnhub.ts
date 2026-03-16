import "server-only"

import { groq, MODEL } from "@/lib/groq"
import { isoDate } from "@/lib/utils"
import type { NewsItem } from "@/types"

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

async function translateNewsItems(items: NewsItem[]): Promise<NewsItem[]> {
  if (items.length === 0 || !process.env.GROQ_API_KEY) {
    return items
  }

  const payload = items.map((item, idx) => ({
    idx,
    headline: item.headline,
    summary: item.summary?.slice(0, 300) ?? ""
  }))

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: [
            "You are a Korean financial news translator.",
            "Translate each item's headline and summary to natural Korean.",
            "Return ONLY a JSON array (no markdown, no explanation) with this exact shape:",
            '[{"idx":0,"headlineKo":"...","summaryKo":"..."}]',
            "summaryKo should be 1-2 concise Korean sentences."
          ].join(" ")
        },
        {
          role: "user",
          content: JSON.stringify(payload)
        }
      ]
    })

    const raw = completion.choices[0]?.message?.content ?? "[]"
    const cleaned = raw.replace(/```json|```/g, "").trim()
    const translated = JSON.parse(cleaned) as Array<{
      idx: number
      headlineKo: string
      summaryKo: string
    }>

    return items.map((item, idx) => {
      const match = translated.find((candidate) => candidate.idx === idx)
      return match
        ? {
            ...item,
            headlineKo: match.headlineKo,
            summaryKo: match.summaryKo
          }
        : item
    })
  } catch (error) {
    console.error("News translation failed", error)
    return items
  }
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

  const rawItems: NewsItem[] = (news ?? [])
    .filter((item) => item.headline && item.url)
    .slice(0, 3)
    .map((item) => ({
      headline: item.headline ?? "",
      source: item.source ?? "Unknown",
      datetime: item.datetime ?? 0,
      url: item.url ?? "",
      summary: item.summary ?? ""
    }))

  return translateNewsItems(rawItems)
}
