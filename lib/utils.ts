import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import type { MessageRole } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function createId(prefix: MessageRole | "history" = "assistant") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export function formatCurrency(
  value: number | null | undefined,
  currency = "USD"
) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-"
  }

  const digits = currency === "KRW" ? 0 : 2

  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
    maximumFractionDigits: digits,
    minimumFractionDigits: digits === 0 ? 0 : 2
  }).format(value)
}

export function formatPercent(
  value: number | null | undefined,
  options?: { fraction?: boolean; maximumFractionDigits?: number }
) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-"
  }

  const normalized = options?.fraction
    ? Math.abs(value) > 1
      ? value / 100
      : value
    : value / 100

  return new Intl.NumberFormat("ko-KR", {
    style: "percent",
    maximumFractionDigits: options?.maximumFractionDigits ?? 2
  }).format(normalized)
}

export function formatKoreanUnits(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-"
  }

  const absolute = Math.abs(value)

  if (absolute >= 1_0000_0000_0000) {
    return `${(value / 1_0000_0000_0000).toFixed(2)}조`
  }

  if (absolute >= 1_0000_0000) {
    return `${(value / 1_0000_0000).toFixed(2)}억`
  }

  return new Intl.NumberFormat("ko-KR").format(value)
}

export function formatVolume(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-"
  }

  return `${new Intl.NumberFormat("ko-KR").format(value)}주`
}

export function formatDateTime(timestamp: number | string) {
  const date =
    typeof timestamp === "number" ? new Date(timestamp * 1000) : new Date(timestamp)

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date)
}

export function formatRelativeTime(timestamp: string) {
  const diffMinutes = Math.round(
    (new Date(timestamp).getTime() - Date.now()) / 1000 / 60
  )

  return new Intl.RelativeTimeFormat("ko-KR", { numeric: "auto" }).format(
    diffMinutes,
    "minute"
  )
}

export function isoDate(daysAgo = 0) {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)

  return date.toISOString().slice(0, 10)
}
