import { ArrowDownRight, ArrowUpRight, Star } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  cn,
  formatCurrency,
  formatKoreanUnits,
  formatPercent,
  formatVolume
} from "@/lib/utils"
import type { StockData } from "@/types"

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-secondary/60 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  )
}

function RangeGauge({ stock }: { stock: StockData }) {
  const { low52w, high52w, price } = stock
  const currency = stock.currency ?? "USD"

  if (
    low52w === null ||
    high52w === null ||
    price === null ||
    high52w === low52w
  ) {
    return (
      <Metric
        label="52주 범위"
        value={`${formatCurrency(low52w, currency)} ~ ${formatCurrency(high52w, currency)}`}
      />
    )
  }

  const pct = Math.min(
    100,
    Math.max(0, ((price - low52w) / (high52w - low52w)) * 100)
  )

  return (
    <div className="col-span-2 rounded-2xl border border-border/70 bg-secondary/60 p-3">
      <p className="text-xs font-medium text-muted-foreground">52주 범위</p>
      <div className="relative mt-3 h-1.5 rounded-full bg-border">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-foreground/30"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatCurrency(low52w, currency)}</span>
        <span className="font-medium text-foreground">현재 {pct.toFixed(0)}%</span>
        <span>{formatCurrency(high52w, currency)}</span>
      </div>
    </div>
  )
}

interface StockCardProps {
  stock: StockData
  pinned?: boolean
  onPin?: () => void
}

export default function StockCard({
  stock,
  pinned,
  onPin
}: StockCardProps) {
  const isPositive = (stock.changePercent ?? 0) >= 0
  const currency = stock.currency ?? "USD"

  return (
    <Card className="rounded-3xl bg-background shadow-none">
      <CardContent className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="muted">{stock.ticker}</Badge>
              {stock.exchange ? (
                <span className="text-xs text-muted-foreground">{stock.exchange}</span>
              ) : null}
            </div>
            <h3 className="mt-3 text-lg font-semibold">{stock.name}</h3>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-2xl font-semibold">{formatCurrency(stock.price, currency)}</p>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                  isPositive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                )}
              >
                {isPositive ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {formatPercent(stock.changePercent)}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <div className="text-right text-sm text-muted-foreground">
              등락 {formatCurrency(stock.change, currency)}
            </div>
            {onPin ? (
              <button
                type="button"
                onClick={onPin}
                className="rounded-full p-1.5 transition-colors hover:bg-secondary"
                aria-label={pinned ? "관심 종목 해제" : "관심 종목 추가"}
              >
                <Star
                  className={cn(
                    "h-4 w-4",
                    pinned
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground"
                  )}
                />
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <RangeGauge stock={stock} />
          <Metric label="시가총액" value={formatKoreanUnits(stock.marketCap)} />
          <Metric
            label="PER / PBR"
            value={`${stock.per?.toFixed(2) ?? "-"} / ${stock.pbr?.toFixed(2) ?? "-"}`}
          />
          <Metric
            label="배당률 / 거래량"
            value={`${formatPercent(stock.dividendYield, { fraction: true })} / ${formatVolume(stock.volume)}`}
          />
        </div>
      </CardContent>
    </Card>
  )
}
