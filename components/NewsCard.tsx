import { ArrowUpRight, Newspaper } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatDateTime } from "@/lib/utils"
import type { NewsItem } from "@/types"

export default function NewsCard({ items }: { items: NewsItem[] }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Newspaper className="h-4 w-4 text-muted-foreground" />
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Latest News
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        {items.map((item) => (
          <a key={`${item.url}-${item.datetime}`} href={item.url} target="_blank" rel="noreferrer">
            <Card className="h-full border-border/70 bg-secondary/50 transition duration-200 hover:-translate-y-1 hover:border-primary/25 hover:bg-accent/35">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <Badge variant="muted" className="rounded-full">
                      {item.source}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(item.datetime)}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>

                <div>
                  <h4 className="line-clamp-3 text-sm font-semibold leading-6 text-card-foreground">
                    {item.headline}
                  </h4>
                  <p className="mt-3 line-clamp-3 text-xs leading-5 text-muted-foreground">
                    {item.summary || "요약이 제공되지 않았습니다."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </section>
  )
}
