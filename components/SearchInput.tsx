"use client"

import { ArrowUpRight, Loader2, SendHorizonal, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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
    <div className="space-y-4">
      {showExamples ? (
        <div className="flex flex-wrap gap-2 xl:hidden">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onPickExample(example)}
              className="rounded-full border border-border/70 bg-secondary/70 px-3 py-1.5 text-xs font-medium text-secondary-foreground transition hover:border-primary/30 hover:text-primary"
            >
              {example}
            </button>
          ))}
        </div>
      ) : null}

      <div className="dashboard-shell rounded-[30px] border border-primary/15 bg-terminal-glow p-[1px]">
        <div className="rounded-[29px] bg-card/85 p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div className="hidden rounded-[22px] border border-primary/20 bg-primary/10 p-4 text-primary lg:block">
                <Sparkles className="h-5 w-5" />
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="accent">AI Research Prompt</Badge>
                  <Badge variant="muted">Groq + Market Context</Badge>
                </div>
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
                  placeholder="티커, ETF, 종목명을 입력하세요. 예: SCHD가 뭐야? / QQQ vs SPY 비교해줘"
                  className="min-h-[110px] resize-none border-0 bg-transparent px-0 py-0 text-[15px] leading-7 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  실시간 시세와 뉴스 컨텍스트 결합
                </span>
                <span className="hidden md:inline">Enter 전송 / Shift + Enter 줄바꿈</span>
              </div>

              <Button
                type="button"
                size="lg"
                onClick={onSubmit}
                disabled={disabled || !value.trim()}
                className="min-w-[148px]"
              >
                {disabled ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    분석 중
                  </>
                ) : (
                  <>
                    <SendHorizonal className="h-4 w-4" />
                    분석 요청
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
