import { ArrowDownRight, ArrowUpRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  cn,
  formatCurrency,
  formatKoreanUnits,
  formatPercent
} from "@/lib/utils"
import type { StockData } from "@/types"

interface CompareRow {
  label: string
  a: string
  b: string
  winner?: "a" | "b" | null
}

function buildRows(a: StockData, b: StockData): CompareRow[] {
  const currencyOf = (stock: StockData) => stock.currency ?? "USD"

  const betterHigher = (
    valueA: number | null,
    valueB: number | null
  ): "a" | "b" | null => {
    if (valueA === null || valueB === null) {
      return null
    }

    return valueA > valueB ? "a" : valueA < valueB ? "b" : null
  }

  const betterLower = (
    valueA: number | null,
    valueB: number | null
  ): "a" | "b" | null => {
    if (valueA === null || valueB === null) {
      return null
    }

    return valueA < valueB ? "a" : valueA > valueB ? "b" : null
  }

  return [
    {
      label: "현재가",
      a: formatCurrency(a.price, currencyOf(a)),
      b: formatCurrency(b.price, currencyOf(b)),
      winner: null
    },
    {
      label: "등락률",
      a: formatPercent(a.changePercent),
      b: formatPercent(b.changePercent),
      winner: betterHigher(a.changePercent, b.changePercent)
    },
    {
      label: "시가총액",
      a: formatKoreanUnits(a.marketCap),
      b: formatKoreanUnits(b.marketCap),
      winner: null
    },
    {
      label: "PER",
      a: a.per?.toFixed(2) ?? "-",
      b: b.per?.toFixed(2) ?? "-",
      winner: betterLower(a.per, b.per)
    },
    {
      label: "PBR",
      a: a.pbr?.toFixed(2) ?? "-",
      b: b.pbr?.toFixed(2) ?? "-",
      winner: betterLower(a.pbr, b.pbr)
    },
    {
      label: "배당률",
      a: formatPercent(a.dividendYield, { fraction: true }),
      b: formatPercent(b.dividendYield, { fraction: true }),
      winner: betterHigher(a.dividendYield, b.dividendYield)
    },
    {
      label: "52주 고가",
      a: formatCurrency(a.high52w, currencyOf(a)),
      b: formatCurrency(b.high52w, currencyOf(b)),
      winner: null
    },
    {
      label: "52주 저가",
      a: formatCurrency(a.low52w, currencyOf(a)),
      b: formatCurrency(b.low52w, currencyOf(b)),
      winner: null
    }
  ]
}

export default function CompareCard({
  stocks
}: {
  stocks: [StockData, StockData]
}) {
  const [a, b] = stocks
  const rows = buildRows(a, b)

  const isPositiveA = (a.changePercent ?? 0) >= 0
  const isPositiveB = (b.changePercent ?? 0) >= 0

  return (
    <Card className="overflow-hidden rounded-3xl bg-background shadow-none">
      <CardContent className="p-0">
        <div className="grid grid-cols-3 border-b border-border/60">
          <div className="p-4" />
          {[a, b].map((stock, index) => {
            const isPositive = index === 0 ? isPositiveA : isPositiveB

            return (
              <div
                key={stock.ticker}
                className="border-l border-border/60 p-4 text-center"
              >
                <Badge variant="muted" className="mx-auto">
                  {stock.ticker}
                </Badge>
                <p className="mt-2 line-clamp-1 text-sm font-semibold">{stock.name}</p>
                <p className="mt-1 text-lg font-semibold">
                  {formatCurrency(stock.price, stock.currency ?? "USD")}
                </p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-xs font-medium",
                    isPositive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {isPositive ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {formatPercent(stock.changePercent)}
                </span>
              </div>
            )
          })}
        </div>

        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-3 border-b border-border/40 last:border-0"
          >
            <div className="flex items-center px-4 py-3">
              <span className="text-xs font-medium text-muted-foreground">
                {row.label}
              </span>
            </div>
            {(["a", "b"] as const).map((side) => {
              const isWinner = row.winner === side

              return (
                <div
                  key={side}
                  className={cn(
                    "flex items-center justify-center border-l border-border/40 px-4 py-3",
                    isWinner && "bg-emerald-500/5"
                  )}
                >
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isWinner && "text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    {row[side]}
                  </span>
                  {isWinner ? (
                    <span className="ml-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                      ●
                    </span>
                  ) : null}
                </div>
              )
            })}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
