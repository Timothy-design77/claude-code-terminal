import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#0a0a0b",
          surface: "#111113",
          elevated: "#18181b",
          border: "#27272a",
          text: "#fafafa",
          muted: "#a1a1aa",
          dim: "#52525b",
          accent: "#22c55e",
          error: "#ef4444",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
        sans: ["Outfit", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        bounce: "bounce 1.4s infinite ease-in-out both",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
