import type { Metadata } from "next"
import { IBM_Plex_Mono, Manrope } from "next/font/google"

import "./globals.css"

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
})

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap"
})

export const metadata: Metadata = {
  title: "Stock Signal Chat",
  description: "실시간 시세와 뉴스 맥락을 함께 읽는 주식 분석 챗봇"
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning className="dark">
      <body className={`${manrope.variable} ${plexMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
