export default function TypingIndicator() {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="h-2.5 w-2.5 animate-pulse rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400"
            style={{ animationDelay: `${index * 120}ms` }}
          />
        ))}
      </div>
      <span className="text-zinc-500 dark:text-zinc-400">AI가 분석 중입니다</span>
    </div>
  )
}
