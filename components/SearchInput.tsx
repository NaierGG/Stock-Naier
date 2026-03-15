"use client"

import { Loader2, SendHorizonal } from "lucide-react"

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

      <div className="rounded-[1.75rem] border border-black/5 bg-white/85 p-3 shadow-card backdrop-blur-xl dark:border-white/10 dark:bg-black/25">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
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
            placeholder="종목명이나 티커를 입력해 보세요. 예: SCHD가 뭐야?"
            className="min-h-[88px] flex-1 resize-none rounded-[1.25rem] border border-transparent bg-transparent px-3 py-2 text-sm outline-none placeholder:text-zinc-400 dark:text-zinc-100"
          />
          <button
            type="button"
            disabled={disabled || !value.trim()}
            onClick={onSubmit}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-indigo-500/50"
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
  )
}
