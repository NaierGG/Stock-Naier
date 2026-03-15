# Stock Signal Chat

Groq 스트리밍 응답, yfinance 기반 시세 수집, Finnhub 뉴스 요약을 결합한 Next.js 14 주식 분석 챗봇입니다.

## Stack

- Next.js 14 App Router + TypeScript
- Tailwind CSS
- Groq API via OpenAI SDK compatibility
- Finnhub REST API
- Python `yfinance` script

## Start

1. 환경 변수 설정

```bash
cp .env.example .env.local
```

2. `.env.local` 값 입력

```bash
GROQ_API_KEY=your_groq_api_key
FINNHUB_API_KEY=your_finnhub_api_key
```

3. Python 패키지 설치

```bash
pip install yfinance
```

4. 앱 실행

```bash
pnpm install
pnpm dev
```

## Features

- 대화형 종목 분석 UI
- 최근 검색 히스토리 로컬 저장
- SSE 기반 AI 답변 스트리밍
- 주가 핵심 지표 카드 자동 표시
- 최신 뉴스 카드 자동 표시
- 다크모드 및 모바일 대응

## Notes

- `/api/stock`는 기본적으로 Python `yfinance` 스크립트를 실행하고, 실패 시 Yahoo Finance HTTP fallback을 시도합니다.
- Vercel 환경에서는 Python 실행이 제한될 수 있어 fallback 경로를 함께 두었습니다.
