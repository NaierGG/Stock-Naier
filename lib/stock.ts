import "server-only"

import { execFile } from "node:child_process"
import path from "node:path"
import { promisify } from "node:util"

import { searchFinnhubSymbol } from "@/lib/finnhub"
import type { StockData } from "@/types"

const execFileAsync = promisify(execFile)

const ALIAS_MAP: Record<string, string> = {
  schd: "SCHD",
  qqq: "QQQ",
  spy: "SPY",
  voo: "VOO",
  tqqq: "TQQQ",
  soxl: "SOXL",
  apple: "AAPL",
  tesla: "TSLA",
  nvidia: "NVDA",
  microsoft: "MSFT",
  amazon: "AMZN",
  google: "GOOGL",
  alphabet: "GOOGL",
  meta: "META",
  broadcom: "AVGO",
  palantir: "PLTR",
  삼성전자: "005930.KS",
  sk하이닉스: "000660.KS",
  현대차: "005380.KS",
  네이버: "035420.KS",
  카카오: "035720.KS",
  lg에너지솔루션: "373220.KS",
  셀트리온: "068270.KS",
  애플: "AAPL",
  테슬라: "TSLA",
  엔비디아: "NVDA",
  마이크로소프트: "MSFT",
  아마존: "AMZN",
  구글: "GOOGL",
  메타: "META"
}

const QUESTION_STOPWORDS = new Set([
  "뭐야",
  "무엇",
  "알려줘",
  "설명",
  "분석",
  "비교",
  "추천",
  "지금",
  "살만해",
  "어때",
  "전망",
  "주가",
  "종목",
  "뉴스",
  "지표",
  "최근",
  "today",
  "stock",
  "stocks",
  "analysis",
  "compare",
  "vs"
])

const TICKER_PATTERN = /\b[A-Z]{1,5}(?:[.-][A-Z]{1,3})?\b/g

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase()
}

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))]
}

function extractSearchTerms(message: string) {
  const cleaned = message.replace(/[^\p{L}\p{N}\s.&-]/gu, " ")

  return unique(
    cleaned
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
      .filter((token) => !QUESTION_STOPWORDS.has(token.toLowerCase()))
  ).slice(0, 4)
}

export function extractTickerCandidates(message: string, explicitTicker?: string) {
  const matches = message.match(TICKER_PATTERN) ?? []
  const candidates = new Set<string>()

  if (explicitTicker?.trim()) {
    candidates.add(normalizeSymbol(explicitTicker))
  }

  matches.forEach((match) => candidates.add(normalizeSymbol(match)))

  Object.entries(ALIAS_MAP).forEach(([alias, ticker]) => {
    if (message.toLowerCase().includes(alias.toLowerCase())) {
      candidates.add(ticker)
    }
  })

  return [...candidates].slice(0, 2)
}

export async function resolveTickersFromQuestion(
  message: string,
  explicitTicker?: string
) {
  const direct = extractTickerCandidates(message, explicitTicker)

  if (direct.length > 0) {
    return direct
  }

  const searchTerms = extractSearchTerms(message)

  for (const term of searchTerms) {
    const found = await searchFinnhubSymbol(term)

    if (found) {
      return [normalizeSymbol(found)]
    }
  }

  return []
}

function normalizeStockData(raw: Record<string, unknown>): StockData | null {
  const ticker = typeof raw.ticker === "string" ? normalizeSymbol(raw.ticker) : null

  if (!ticker) {
    return null
  }

  return {
    ticker,
    name:
      typeof raw.name === "string" && raw.name.trim()
        ? raw.name
        : ticker,
    price: normalizeNumber(raw.price),
    change: normalizeNumber(raw.change),
    changePercent: normalizeNumber(raw.changePercent),
    high52w: normalizeNumber(raw.high52w),
    low52w: normalizeNumber(raw.low52w),
    per: normalizeNumber(raw.per),
    pbr: normalizeNumber(raw.pbr),
    dividendYield: normalizeNumber(raw.dividendYield),
    marketCap: normalizeNumber(raw.marketCap),
    volume: normalizeNumber(raw.volume),
    currency:
      typeof raw.currency === "string" && raw.currency.trim()
        ? raw.currency
        : null,
    exchange:
      typeof raw.exchange === "string" && raw.exchange.trim()
        ? raw.exchange
        : null
  }
}

async function fetchYahooFinanceFallback(ticker: string) {
  const quoteUrl = new URL("https://query1.finance.yahoo.com/v7/finance/quote")
  quoteUrl.searchParams.set("symbols", ticker)

  const summaryUrl = new URL(
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}`
  )
  summaryUrl.searchParams.set(
    "modules",
    "price,summaryDetail,defaultKeyStatistics"
  )

  const [quoteResponse, summaryResponse] = await Promise.all([
    fetch(quoteUrl, { cache: "no-store" }),
    fetch(summaryUrl, { cache: "no-store" })
  ])

  if (!quoteResponse.ok || !summaryResponse.ok) {
    return null
  }

  const quoteJson = (await quoteResponse.json()) as {
    quoteResponse?: { result?: Array<Record<string, unknown>> }
  }
  const summaryJson = (await summaryResponse.json()) as {
    quoteSummary?: {
      result?: Array<{
        price?: Record<string, { raw?: number }>
        summaryDetail?: Record<string, { raw?: number }>
        defaultKeyStatistics?: Record<string, { raw?: number }>
      }>
    }
  }

  const quote = quoteJson.quoteResponse?.result?.[0]
  const summary = summaryJson.quoteSummary?.result?.[0]

  if (!quote) {
    return null
  }

  return normalizeStockData({
    ticker,
    name: quote.longName ?? quote.shortName ?? ticker,
    price: quote.regularMarketPrice,
    change: quote.regularMarketChange,
    changePercent: quote.regularMarketChangePercent,
    high52w:
      summary?.summaryDetail?.fiftyTwoWeekHigh?.raw ?? quote.fiftyTwoWeekHigh,
    low52w:
      summary?.summaryDetail?.fiftyTwoWeekLow?.raw ?? quote.fiftyTwoWeekLow,
    per: summary?.summaryDetail?.trailingPE?.raw ?? quote.trailingPE,
    pbr:
      summary?.defaultKeyStatistics?.priceToBook?.raw ?? quote.priceToBook,
    dividendYield:
      summary?.summaryDetail?.dividendYield?.raw ?? quote.trailingAnnualDividendYield,
    marketCap:
      summary?.price?.marketCap?.raw ?? quote.marketCap,
    volume:
      summary?.summaryDetail?.volume?.raw ?? quote.regularMarketVolume,
    currency: quote.currency,
    exchange: quote.fullExchangeName ?? quote.exchange
  })
}

async function runPythonScript(ticker: string) {
  const scriptPath = path.join(process.cwd(), "scripts", "get_stock.py")
  const commands =
    process.platform === "win32"
      ? [
          ["py", "-3"],
          ["python"]
        ]
      : [["python3"], ["python"]]

  let lastError: unknown

  for (const command of commands) {
    try {
      const [binary, ...args] = command
      const { stdout } = await execFileAsync(binary, [...args, scriptPath, ticker], {
        timeout: 20_000,
        maxBuffer: 1024 * 1024,
        windowsHide: true
      })

      return stdout
    } catch (error) {
      lastError = error
    }
  }

  throw lastError ?? new Error("Python runtime was not available.")
}

export async function fetchStockSnapshot(ticker: string) {
  try {
    const stdout = await runPythonScript(ticker)
    const parsed = JSON.parse(stdout) as Record<string, unknown>

    if (typeof parsed.error === "string") {
      throw new Error(parsed.error)
    }

    return normalizeStockData(parsed)
  } catch (error) {
    console.error(`Stock fetch failed for ${ticker}`, error)

    try {
      return await fetchYahooFinanceFallback(ticker)
    } catch (fallbackError) {
      console.error(`Fallback stock fetch failed for ${ticker}`, fallbackError)
      return null
    }
  }
}

export async function fetchStocks(tickers: string[]) {
  const results = await Promise.allSettled(
    tickers.map((ticker) => fetchStockSnapshot(ticker))
  )

  return results
    .filter(
      (result): result is PromiseFulfilledResult<StockData | null> =>
        result.status === "fulfilled"
    )
    .map((result) => result.value)
    .filter((item): item is StockData => Boolean(item))
}
