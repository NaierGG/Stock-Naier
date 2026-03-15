"use client"

import { ArrowUpRight, Loader2, SendHorizonal, Sparkles } from "lucide-react"

interface SearchInputProps {
  value: string
  disabled?: boolean
  showExamples?: boolean
  examples: string[]
  onChange: (value: string) => void
  onSubmit: () => void
  onPickExample: (example: string) => void
}

export default function SearchInput({
  value,
  disabled,
  showExamples,
  examples,
  onChange,
  onSubmit,
  onPickExample
}: SearchInputProps) {
  return (
    <div className="space-y-4">
      {showExamples ? (
        <div className="flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onPickExample(example)}
              className="chip"
            >
              {example}
            </button>
          ))}
        </div>
      ) : null}

      <div className="rounded-[32px] bg-gradient-to-r from-indigo-500/25 via-cyan-400/10 to-emerald-400/20 p-[1px] shadow-[0_24px_90px_rgba(15,23,42,0.22)]">
        <div className="rounded-[31px] border border-white/10 bg-white/75 p-4 backdrop-blur-2xl dark:bg-slate-950/75">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-indigo-400/20 bg-indigo-500/10 text-indigo-400 md:inline-flex">
              <Sparkles className="h-5 w-5" />
            </div>

            <div className="flex-1">
              <textarea
                value={value}
                rows={2}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    onSubmit()
                  }
                }}
                placeholder="티커, ETF, 종목명을 입력해 보세요. 예: SCHD가 뭐야? / 삼성전자 지금 살만해?"
                className="min-h-[96px] w-full resize-none rounded-[24px] border border-transparent bg-transparent px-1 py-1 text-[15px] leading-7 text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-50"
              />

              <div className="mt-2 flex flex-col gap-2 text-xs text-zinc-500 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
                <p>Enter 전송, Shift + Enter 줄바꿈</p>
                <div className="inline-flex items-center gap-2">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>실시간 시세와 뉴스 컨텍스트를 붙여 답변합니다</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={disabled || !value.trim()}
              onClick={onSubmit}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-[22px] bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {disabled ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  분석 중
                </>
              ) : (
                <>
                  <SendHorizonal className="h-4 w-4" />
                  전송
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
