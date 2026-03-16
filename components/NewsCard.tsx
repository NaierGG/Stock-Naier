import { ArrowUpRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatDateTime } from "@/lib/utils"
import type { NewsItem } from "@/types"

export default function NewsCard({ items }: { items: NewsItem[] }) {
  return (
    <section className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">관련 뉴스</p>

      <div className="grid gap-3 xl:grid-cols-3">
        {items.map((item) => (
          <a
            key={`${item.url}-${item.datetime}`}
            href={item.url}
            target="_blank"
            rel="noreferrer"
          >
            <Card className="h-full rounded-3xl bg-background shadow-none transition-colors hover:bg-secondary/80">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <Badge variant="muted">{item.source}</Badge>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(item.datetime)}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>

                <div>
                  <h4 className="line-clamp-3 text-sm font-semibold leading-6">
                    {item.headlineKo ?? item.headline}
                  </h4>
                  {item.headlineKo ? (
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground/60">
                      {item.headline}
                    </p>
                  ) : null}
                  <p className="mt-3 line-clamp-3 text-xs leading-5 text-muted-foreground">
                    {item.summaryKo ?? item.summary ?? "요약이 제공되지 않았습니다."}
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
