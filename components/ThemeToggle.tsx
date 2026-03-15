"use client"

import { MoonStar, SunMedium } from "lucide-react"

import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  theme: "dark" | "light"
  onToggle: () => void
}

export default function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-medium transition",
        "border-black/10 bg-white/80 text-zinc-700 hover:border-black/20 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:hover:border-white/20 dark:hover:bg-white/10"
      )}
      aria-label="테마 전환"
    >
      {theme === "dark" ? (
        <MoonStar className="h-4 w-4" />
      ) : (
        <SunMedium className="h-4 w-4" />
      )}
    </button>
  )
}
