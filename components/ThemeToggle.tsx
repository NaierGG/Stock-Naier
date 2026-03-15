"use client"

import { MoonStar, SunMedium } from "lucide-react"

import { Button } from "@/components/ui/button"

interface ThemeToggleProps {
  theme: "dark" | "light"
  onToggle: () => void
}

export default function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={onToggle}
      aria-label="테마 전환"
    >
      {theme === "dark" ? (
        <MoonStar className="h-4.5 w-4.5" />
      ) : (
        <SunMedium className="h-4.5 w-4.5" />
      )}
    </Button>
  )
}
