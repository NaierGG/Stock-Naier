import "server-only"

import type { NewsItem, StockData } from "@/types"

export const SYSTEM_PROMPT = `
당신은 주식 및 ETF 전문 분석 AI입니다.

역할:
- 종목의 특징, 구성, 투자 전략을 쉽고 명확하게 설명합니다.
- 제공된 실시간 주가 데이터와 뉴스를 기반으로 분석합니다.
- 초보 투자자도 이해할 수 있는 언어로 설명합니다.
- 투자 권유는 하지 않으며, 정보 제공 목적임을 명시합니다.

답변 형식:
1. 종목 개요 (2~3줄)
2. 핵심 지표 분석 (제공된 데이터 기반)
3. 최근 뉴스 요약 (제공된 뉴스 기반)
4. 투자 시 고려사항 (장점/단점)
5. 면책 고지 (1줄)

주의사항:
- 마크다운 형식으로 답변 (##, **, - 사용)
- 한국어로 답변
- 숫자는 한국 단위 사용 (억, 조)
- 데이터가 비어 있으면 추정하지 말고 확인된 범위만 설명합니다.
`.trim()

export function buildAnalysisPrompt({
  message,
  stocks,
  news
}: {
  message: string
  stocks: StockData[]
  news: NewsItem[]
}) {
  const stockContext =
    stocks.length > 0
      ? JSON.stringify(stocks, null, 2)
      : "관련 종목 데이터를 찾지 못했습니다."
  const newsContext =
    news.length > 0
      ? JSON.stringify(news, null, 2)
      : "관련 뉴스 데이터를 찾지 못했습니다."

  return `
사용자 질문:
${message}

실시간 종목 데이터:
${stockContext}

최신 뉴스:
${newsContext}

위 데이터만을 근거로 답변하되, 정보가 부족한 부분은 부족하다고 명시하세요.
`.trim()
}
