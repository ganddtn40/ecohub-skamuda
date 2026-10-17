import type { Config } from "tailwindcss";

/**
 * Token desain - "Colour chapters, eco-tech".
 *
 * - Arah: setiap bagian halaman adalah satu bidang warna penuh (chapter) yang
 *   ditempel langsung ke bagian berikutnya, tanpa jeda dan tanpa garis pemisah.
 *   Warna diambil dari lingkungan sekolah sendiri: hijau daun, sage, dan kertas.
 * - Satu ground (#F4F7F5), satu ink (#0F1F17), satu aksen (eco-600 #0A7A44).
 *   Gold hanya untuk poin, karena poin satu-satunya hal yang langka dan didapat.
 * - Tanpa gradient. Bidang dipisahkan oleh langkah nada, bukan oleh bayangan.
 * - Skala tipografi lima langkah, tidak lebih.
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
      /**
       * Lima langkah, berjauhan. Display dipakai satu kali saja (headline hero).
       * Body tidak pernah di bawah 16px, small tidak pernah di bawah 13px.
       */
      fontSize: {
        display: ["clamp(2rem, 6.4vw, 6.25rem)", { lineHeight: "0.95", letterSpacing: "-0.03em" }],
        chapter: ["clamp(1.75rem, 4.2vw, 3.5rem)", { lineHeight: "1.02", letterSpacing: "-0.025em" }],
        item: ["clamp(1.25rem, 2.6vw, 2.125rem)", { lineHeight: "1.12", letterSpacing: "-0.02em" }],
        body: ["1.0625rem", { lineHeight: "1.55" }],
        small: ["0.8125rem", { lineHeight: "1.45" }],
      },
      borderRadius: {
        card: "1rem",
        control: "0.75rem",
        header: "1.5rem",
      },
      boxShadow: {
        // Hanya untuk yang benar-benar mengambang: bar lengket, sheet, dialog.
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
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0, 0, 0) rotate(0deg)" },
          "50%": { transform: "translate3d(0, -14px, 0) rotate(-1.2deg)" },
        },
        "ring-sweep": {
          from: { strokeDashoffset: "var(--ring-len, 900)" },
          to: { strokeDashoffset: "0" },
        },
        "slow-zoom": {
          from: { transform: "scale(1.02)" },
          to: { transform: "scale(1.12)" },
        },
        /**
         * Sapuan muat untuk kerangka `Skeleton`: pita terang melintas dari kiri
         * ke kanan. Sengaja memakai `transform`, bukan `background-position`,
         * supaya tidak memicu cat ulang tiap frame - hanya komposit.
         */
        shimmer: {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(100%)" },
        },
        /**
         * Denyut titik status pesanan. Pelan dan dangkal: titik ini menandakan
         * "sedang berjalan", dan yang perlu terlihat berdenyut hanya titiknya,
         * bukan teks status di sebelahnya.
         */
        "pulse-dot": {
          "0%, 100%": { opacity: "0.45", transform: "scale(0.8)" },
          "50%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 360ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 240ms ease-out both",
        "sheet-up": "sheet-up 280ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scale-in 200ms cubic-bezier(0.22, 1, 0.36, 1) both",
        drift: "drift 9s ease-in-out infinite",
        "ring-sweep": "ring-sweep 1.4s cubic-bezier(0.4, 0, 0.2, 1) both",
        "slow-zoom": "slow-zoom 22s ease-in-out infinite alternate",
        shimmer: "shimmer 1.6s ease-in-out infinite",
        "pulse-dot": "pulse-dot 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
