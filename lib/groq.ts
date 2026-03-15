import "server-only"

import OpenAI from "openai"

export const groq = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY ?? "missing-groq-api-key"
})

export const MODEL = "openai/gpt-oss-120b"
