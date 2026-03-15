import { Badge } from "@/components/ui/badge"

export default function TypingIndicator() {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-border/70 bg-secondary/70 px-4 py-2">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="h-2.5 w-2.5 animate-pulse rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500"
            style={{ animationDelay: `${index * 120}ms` }}
          />
        ))}
      </div>
      <Badge variant="muted" className="rounded-full px-0 py-0 normal-case tracking-normal border-0 bg-transparent text-muted-foreground">
        AI가 분석 중입니다
      </Badge>
    </div>
  )
}
