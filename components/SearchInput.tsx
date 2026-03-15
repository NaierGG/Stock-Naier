"use client"

import { Loader2, SendHorizonal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface SearchInputProps {
  value: string
  disabled?: boolean
  showExamples?: boolean
  examples: readonly string[]
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
    <div className="space-y-3">
      {showExamples ? (
        <div className="flex flex-wrap gap-2 lg:hidden">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onPickExample(example)}
              className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent"
            >
              {example}
            </button>
          ))}
        </div>
      ) : null}

      <div className="rounded-[28px] border border-border/70 bg-card shadow-sm">
        <Textarea
          value={value}
          disabled={disabled}
          rows={3}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              onSubmit()
            }
          }}
          placeholder="종목명이나 티커를 입력해 보세요. 예: SCHD가 뭐야?"
          className="min-h-[112px] resize-none border-0 bg-transparent px-5 py-5 text-[15px] leading-7 shadow-none focus-visible:ring-0"
        />

        <div className="flex flex-col gap-3 border-t border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Enter 전송 · Shift + Enter 줄바꿈
          </p>

          <Button
            type="button"
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
            className="min-w-[96px] rounded-xl"
          >
            {disabled ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                분석 중
              </>
            ) : (
              <>
                <SendHorizonal className="h-4 w-4" />
                보내기
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
