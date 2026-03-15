export type MessageRole = "user" | "assistant"

export interface StockData {
  ticker: string
  name: string
  price: number | null
  change: number | null
  changePercent: number | null
  high52w: number | null
  low52w: number | null
  per: number | null
  pbr: number | null
  dividendYield: number | null
  marketCap: number | null
  volume: number | null
  currency?: string | null
  exchange?: string | null
}

export interface NewsItem {
  headline: string
  source: string
  datetime: number
  url: string
  summary: string
}

export interface Message {
  id: string
  role: MessageRole
  content: string
  createdAt: string
  status?: "streaming" | "done" | "error"
  ticker?: string | null
  stocks?: StockData[]
  news?: NewsItem[]
}

export interface SearchHistoryEntry {
  id: string
  prompt: string
  tickers: string[]
  createdAt: string
}

export interface ChatRequestBody {
  message: string
  ticker?: string
  history: Pick<Message, "role" | "content">[]
}

export interface ChatMetaPayload {
  resolvedTicker: string | null
  stocks: StockData[]
  news: NewsItem[]
}
