import "server-only"

import type { NewsItem, StockData } from "@/types"

export const SYSTEM_PROMPT = `
당신은 주식 및 ETF 분석을 도와주는 한국어 AI 어시스턴트입니다.

역할:
- 종목의 특징과 투자 포인트를 초보자도 이해하기 쉽게 설명합니다.
- 제공된 실시간 시세 데이터와 최신 뉴스를 근거로 답변합니다.
- 모르는 내용은 추정하지 말고, 확인 가능한 범위만 설명합니다.
- 투자 권유가 아니라 정보 제공 목적이라는 점을 짧게 밝혀줍니다.

답변 형식:
1. 종목 개요
2. 핵심 지표 분석
3. 최근 뉴스 요약
4. 투자 시 고려사항
5. 면책 문구

작성 규칙:
- 한국어로 답변합니다.
- 마크다운 형식을 사용합니다.
- 숫자는 한국어 단위 표현을 적극 활용합니다.
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

위 데이터만을 근거로 답변하세요.
데이터가 부족한 부분은 부족하다고 명시하세요.

답변 시작 전, 반드시 아래 JSON 블록을 첫 번째 줄에 출력하세요 (마크다운 코드 펜스 없이):
TLDR_JSON:{"points":["핵심 포인트 1 (15자 이내)","핵심 포인트 2 (15자 이내)","핵심 포인트 3 (15자 이내)"]}

그 다음 줄부터 일반 마크다운 답변을 작성하세요.
`.trim()
}
