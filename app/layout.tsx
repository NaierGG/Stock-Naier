import type { Metadata } from "next"
import { Inter } from "next/font/google"

import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap"
})

export const metadata: Metadata = {
  title: "Stock Signal Chat",
  description: "Groq 스트리밍과 실시간 시세, 뉴스로 종목을 분석하는 포트폴리오용 챗봇"
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning className="dark">
      <body
        className={`${inter.className} min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50`}
      >
        {children}
      </body>
    </html>
  )
}
