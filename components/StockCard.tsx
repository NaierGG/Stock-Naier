import { ArrowDownRight, ArrowUpRight } from "lucide-react"

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

export default function StockCard({ stock }: { stock: StockData }) {
  const isPositive = (stock.changePercent ?? 0) >= 0
  const currency = stock.currency ?? "USD"

  return (
    <Card className="rounded-3xl bg-background shadow-none">
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
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

          <div className="text-sm text-muted-foreground">
            등락 {formatCurrency(stock.change, currency)}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Metric
            label="52주 범위"
            value={`${formatCurrency(stock.low52w, currency)} ~ ${formatCurrency(stock.high52w, currency)}`}
          />
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
