export default function TypingIndicator() {
  return (
    <div className="inline-flex items-center gap-3 text-sm text-muted-foreground">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="h-2 w-2 animate-pulse rounded-full bg-foreground/40"
            style={{ animationDelay: `${index * 120}ms` }}
          />
        ))}
      </div>
      <span>분석 중입니다</span>
    </div>
  )
}
