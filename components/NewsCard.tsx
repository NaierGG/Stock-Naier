import { ArrowUpRight, Newspaper } from "lucide-react"

import { formatDateTime } from "@/lib/utils"
import type { NewsItem } from "@/types"

export default function NewsCard({ items }: { items: NewsItem[] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
        <Newspaper className="h-4 w-4" />
        Latest News
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {items.map((item) => (
          <a
            key={`${item.url}-${item.datetime}`}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="group rounded-[1.5rem] border border-black/5 bg-black/5 p-4 transition hover:-translate-y-0.5 hover:border-indigo-400/30 hover:bg-indigo-500/5 dark:border-white/10 dark:bg-white/5 dark:hover:border-indigo-400/30 dark:hover:bg-indigo-500/10"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {item.source}
              </span>
              <ArrowUpRight className="h-4 w-4 text-zinc-400 transition group-hover:text-indigo-400" />
            </div>
            <h4 className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-zinc-900 dark:text-white">
              {item.headline}
            </h4>
            <p className="mt-2 line-clamp-3 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
              {item.summary || "요약이 제공되지 않았습니다."}
            </p>
            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
              {formatDateTime(item.datetime)}
            </p>
          </a>
        ))}
      </div>
    </section>
  )
}
