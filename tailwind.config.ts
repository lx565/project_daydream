import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-serif)", "Kaiti SC", "STKaiti", "FangSong", "serif"],
      },
      colors: {
        parchment:      "#F5F0E6",
        paper:          "#FDFCF8",
        "paper-2":      "#F0EBE0",
        ink:            "#2C1A10",
        "ink-2":        "#4A3828",
        "ink-3":        "#7A6858",
        "ink-4":        "#B0A090",
        "border-warm":  "#DDD4C0",
        "border-light": "#EDE8DC",
        vermillion:     "#8B1A1A",
        "vermillion-h": "#A02020",
        "vermillion-l": "#F5E8E8",
        gold:           "#7B5C00",
        "gold-l":       "#F5EFD8",
        jade:           "#1A5C3A",
        "jade-l":       "#E8F5EE",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% center" },
          "100%": { backgroundPosition: "-200% center" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        blink:     "blink 1s step-end infinite",
        shimmer:   "shimmer 1.8s ease-in-out infinite",
        "fade-in": "fadeIn 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
