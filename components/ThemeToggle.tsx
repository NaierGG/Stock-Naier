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
        "inline-flex h-12 w-12 items-center justify-center rounded-[20px] border transition",
        "border-black/10 bg-white/70 text-zinc-700 shadow-sm hover:border-indigo-400/30 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:hover:border-indigo-400/30 dark:hover:bg-white/10"
      )}
      aria-label="테마 전환"
    >
      {theme === "dark" ? (
        <MoonStar className="h-4.5 w-4.5" />
      ) : (
        <SunMedium className="h-4.5 w-4.5" />
      )}
    </button>
  )
}
