import { ArrowDownRight, ArrowUpRight, CandlestickChart, Landmark } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn, formatCurrency, formatKoreanUnits, formatPercent, formatVolume } from "@/lib/utils"
import type { StockData } from "@/types"

function Metric({
  label,
  value
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-secondary/60 p-3">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-card-foreground">{value}</p>
    </div>
  )
}

export default function StockCard({ stock }: { stock: StockData }) {
  const isPositive = (stock.changePercent ?? 0) >= 0
  const currency = stock.currency ?? "USD"

  return (
    <Card className="border-white/10 bg-slate-950/85 text-white shadow-panel">
      <CardContent className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="muted" className="border-white/10 bg-white/5 text-zinc-300">
                {stock.ticker}
              </Badge>
              {stock.exchange ? (
                <Badge variant="muted" className="border-white/10 bg-white/5 text-zinc-400">
                  {stock.exchange}
                </Badge>
              ) : null}
            </div>
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-white">{stock.name}</h3>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="text-3xl font-semibold tracking-tight">
                  {formatCurrency(stock.price, currency)}
                </p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold",
                    isPositive
                      ? "bg-emerald-400/12 text-emerald-300"
                      : "bg-rose-400/12 text-rose-300"
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
          </div>

          <div className="rounded-[20px] border border-white/10 bg-white/5 p-3 text-zinc-300">
            {stock.exchange ? (
              <Landmark className="h-5 w-5" />
            ) : (
              <CandlestickChart className="h-5 w-5" />
            )}
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
