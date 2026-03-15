import { ArrowDownRight, ArrowUpRight, Landmark, Waves } from "lucide-react"

import { cn, formatCurrency, formatKoreanUnits, formatPercent, formatVolume } from "@/lib/utils"
import type { StockData } from "@/types"

function MetricTile({
  label,
  value
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-[22px] border border-black/5 bg-black/5 p-3.5 dark:border-white/10 dark:bg-white/5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  )
}

export default function StockCard({ stock }: { stock: StockData }) {
  const isPositive = (stock.changePercent ?? 0) >= 0
  const currency = stock.currency ?? "USD"

  return (
    <section className="rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-950/80 via-slate-900/70 to-slate-900/40 p-4 text-white shadow-[0_24px_60px_rgba(2,6,23,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
            <span>{stock.ticker}</span>
            {stock.exchange ? <span className="text-zinc-500">{stock.exchange}</span> : null}
          </div>
          <h3 className="mt-3 text-xl font-semibold tracking-tight text-white">
            {stock.name}
          </h3>
          <div className="mt-4 flex flex-wrap items-center gap-3">
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

        <div className="rounded-[20px] border border-white/10 bg-white/5 p-3 text-zinc-300">
          {stock.exchange ? <Landmark className="h-5 w-5" /> : <Waves className="h-5 w-5" />}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <MetricTile
          label="52주 범위"
          value={`${formatCurrency(stock.low52w, currency)} ~ ${formatCurrency(stock.high52w, currency)}`}
        />
        <MetricTile label="시가총액" value={formatKoreanUnits(stock.marketCap)} />
        <MetricTile
          label="PER / PBR"
          value={`${stock.per?.toFixed(2) ?? "-"} / ${stock.pbr?.toFixed(2) ?? "-"}`}
        />
        <MetricTile
          label="배당률 / 거래량"
          value={`${formatPercent(stock.dividendYield, { fraction: true })} / ${formatVolume(stock.volume)}`}
        />
      </div>
    </section>
  )
}
