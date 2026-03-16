"use client"

import { Loader2, SendHorizonal } from "lucide-react"

import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"

interface SearchInputProps {
  value: string
  disabled?: boolean
  onChange: (value: string) => void
  onSubmit: () => void
}

export default function SearchInput({
  value,
  disabled,
  onChange,
  onSubmit
}: SearchInputProps) {
  const isDisabled = disabled || !value.trim()

  return (
    <div className="rounded-[28px] border border-border/70 bg-card/95 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
      <div className="px-5 pt-5">
        <Textarea
          value={value}
          disabled={disabled}
          rows={4}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              onSubmit()
            }
          }}
          placeholder="종목명이나 티커를 입력해 보세요. 예: SCHD가 뭐야?"
          className="min-h-[132px] resize-none border-0 bg-transparent px-0 py-0 text-[15px] leading-7 shadow-none focus-visible:ring-0"
        />
      </div>

      <div className="flex items-center justify-between px-5 pb-4 pt-3">
        <p className="text-xs text-muted-foreground">
          Enter 전송 · Shift + Enter 줄바꿈
        </p>

        <button
          type="button"
          onClick={onSubmit}
          disabled={isDisabled}
          aria-label={disabled ? "분석 중" : "메시지 전송"}
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full border transition-colors",
            isDisabled
              ? "cursor-not-allowed border-border bg-secondary text-muted-foreground"
              : "border-foreground/10 bg-foreground text-background hover:opacity-90"
          )}
        >
          {disabled ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SendHorizonal className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  )
}
