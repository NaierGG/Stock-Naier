import { ArrowDownRight, ArrowUpRight, Landmark, LineChart } from "lucide-react"

import { cn, formatCurrency, formatKoreanUnits, formatPercent, formatVolume } from "@/lib/utils"
import type { StockData } from "@/types"

const metricClassName =
  "rounded-2xl border border-black/5 bg-black/5 p-3 dark:border-white/10 dark:bg-white/5"

export default function StockCard({ stock }: { stock: StockData }) {
  const isPositive = (stock.changePercent ?? 0) >= 0
  const currency = stock.currency ?? "USD"

  return (
    <section className="rounded-[1.75rem] border border-black/5 bg-gradient-to-br from-black/5 to-transparent p-4 shadow-card dark:border-white/10 dark:from-white/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
            {stock.ticker}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-white">
            {stock.name}
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-2xl font-semibold">
              {formatCurrency(stock.price, currency)}
            </p>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                isPositive
                  ? "bg-emerald-500/12 text-emerald-500"
                  : "bg-red-500/12 text-red-400"
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
        <div className="rounded-2xl border border-black/5 bg-white/70 p-3 text-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
          {stock.exchange ? <Landmark className="h-5 w-5" /> : <LineChart className="h-5 w-5" />}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className={metricClassName}>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">52주 범위</p>
          <p className="mt-1 text-sm font-medium">
            {formatCurrency(stock.low52w, currency)} ~ {formatCurrency(stock.high52w, currency)}
          </p>
        </div>
        <div className={metricClassName}>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">시가총액</p>
          <p className="mt-1 text-sm font-medium">{formatKoreanUnits(stock.marketCap)}</p>
        </div>
        <div className={metricClassName}>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">PER / PBR</p>
          <p className="mt-1 text-sm font-medium">
            {stock.per?.toFixed(2) ?? "-"} / {stock.pbr?.toFixed(2) ?? "-"}
          </p>
        </div>
        <div className={metricClassName}>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">배당률 / 거래량</p>
          <p className="mt-1 text-sm font-medium">
            {formatPercent(stock.dividendYield, { fraction: true })} / {formatVolume(stock.volume)}
          </p>
        </div>
      </div>
    </section>
  )
}
