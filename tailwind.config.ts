import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#12131a",
          muted: "#1a1d27",
          elevated: "#202433"
        },
        accent: {
          DEFAULT: "#6366f1",
          soft: "#818cf8",
          glow: "rgba(99, 102, 241, 0.25)"
        }
      },
      boxShadow: {
        ambient: "0 20px 80px rgba(2, 6, 23, 0.35)",
        card: "0 12px 32px rgba(15, 23, 42, 0.28)"
      },
      backgroundImage: {
        "hero-grid":
          "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
}

export default config
