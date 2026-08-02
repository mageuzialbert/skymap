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
        sans: [
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: [
          "var(--font-sora)",
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        // Skymap Brand Colors
        primary: {
          DEFAULT: "#0b5a54", // Skymap Teal
          dark: "#042f2c",    
          light: "#117a72",   
        },
        secondary: {
          DEFAULT: "#f59e0b", // Amber 500 (complementary)
          dark: "#d97706",
          light: "#fcd34d",
        },
        accent: {
          DEFAULT: "#6366f1", // Indigo 500
          dark: "#4f46e5",
          light: "#818cf8",
        },
      },
    },
  },
  plugins: [],
};
export default config;
