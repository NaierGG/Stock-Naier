import { ArrowUpRight, Newspaper } from "lucide-react"

import { formatDateTime } from "@/lib/utils"
import type { NewsItem } from "@/types"

export default function NewsCard({ items }: { items: NewsItem[] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
        <Newspaper className="h-4 w-4" />
        Latest Signals
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        {items.map((item) => (
          <a
            key={`${item.url}-${item.datetime}`}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="group rounded-[24px] border border-black/5 bg-black/5 p-4 transition hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-cyan-400/5 dark:border-white/10 dark:bg-white/5 dark:hover:border-cyan-400/30 dark:hover:bg-cyan-400/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  {item.source}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formatDateTime(item.datetime)}
                </p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-zinc-400 transition group-hover:text-cyan-400" />
            </div>
            <h4 className="mt-4 line-clamp-3 text-sm font-semibold leading-6 text-zinc-900 dark:text-zinc-100">
              {item.headline}
            </h4>
            <p className="mt-3 line-clamp-3 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
              {item.summary || "요약이 제공되지 않았습니다."}
            </p>
          </a>
        ))}
      </div>
    </section>
  )
}
