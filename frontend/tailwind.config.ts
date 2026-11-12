import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        midnight: {
          950: "#030612",
          900: "#050918",
          850: "#0a1026",
          800: "#0f172a",
        },
        neural: {
          cyan: "#06b6d4",
          blue: "#2563eb",
          violet: "#7c3aed",
          magenta: "#d946ef",
        },
      },
      animation: {
        "aurora-slow": "aurora 18s ease-in-out infinite alternate",
        "pulse-soft": "pulseSoft 2.8s ease-in-out infinite",
        "orbit-slow": "spin 22s linear infinite",
        "orbit-reverse": "spinReverse 16s linear infinite",
        "float-subtle": "floatSubtle 5s ease-in-out infinite",
      },
      keyframes: {
        aurora: {
          "0%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(2%, -2%, 0) scale(1.06)" },
          "100%": { transform: "translate3d(-2%, 2%, 0) scale(1.02)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.55", transform: "scale(0.97)" },
          "50%": { opacity: "1", transform: "scale(1.04)" },
        },
        spinReverse: {
          from: { transform: "rotate(360deg)" },
          to: { transform: "rotate(0deg)" },
        },
        floatSubtle: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
