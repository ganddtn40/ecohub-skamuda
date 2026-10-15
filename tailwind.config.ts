import type { Config } from "tailwindcss";

/**
 * Design tokens - "Clean Emerald Eco-App"
 * - One ground (#F4F7F5), one ink (#0F1F17), one accent (eco-600 #0A7A44), one secondary accent (gold, points only).
 * - Surfaces are separated by a 1px hairline (#E3EAE5), not by heavy shadows.
 * - Radii: cards 16px, controls 12px, header 24px. Not everything is a pill.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        eco: {
          50: "#EAF6EF",
          100: "#D3EEDF",
          200: "#A7DDC1",
          300: "#74C79E",
          400: "#3DAA78",
          500: "#149057",
          600: "#0A7A44",
          700: "#086337",
          800: "#074E2C",
          900: "#053B22",
        },
        mint: {
          DEFAULT: "#F4F7F5",
          deep: "#EAF0EC",
        },
        ink: {
          DEFAULT: "#0F1F17",
          soft: "#33453B",
        },
        muted: "#5B6B63",
        line: "#E3EAE5",
        gold: {
          50: "#FEF6E7",
          100: "#FCEBC8",
          500: "#D98A0B",
          600: "#B45309",
        },
        danger: {
          50: "#FDECEC",
          500: "#D64545",
          600: "#B93030",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "1rem",
        control: "0.75rem",
        header: "1.5rem",
      },
      boxShadow: {
        // Only for things that genuinely float: sticky bars, sheets, dialogs.
        float: "0 8px 24px -12px rgba(15, 31, 23, 0.18)",
        sheet: "0 -12px 32px -16px rgba(15, 31, 23, 0.24)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "sheet-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 360ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 240ms ease-out both",
        "sheet-up": "sheet-up 280ms cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
