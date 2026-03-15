export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 py-2">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-2.5 w-2.5 animate-pulse rounded-full bg-indigo-400"
          style={{ animationDelay: `${index * 120}ms` }}
        />
      ))}
      <span className="ml-1 text-sm text-zinc-400">AI가 분석 중입니다</span>
    </div>
  )
}
