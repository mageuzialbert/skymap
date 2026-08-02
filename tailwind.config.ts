import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Softer, consistently round-edged controls app-wide. Almost every button
      // and input uses rounded / rounded-md / rounded-lg, so bumping these tokens
      // rounds them everywhere at once. `full` (pills/avatars) and `2xl`/`3xl`
      // (large cards/modals) are left at their defaults.
      borderRadius: {
        DEFAULT: "0.5rem", // 8px  (was 4px)
        md: "0.625rem", // 10px (was 6px)
        lg: "0.75rem", // 12px (was 8px)
        xl: "0.875rem", // 14px (was 12px)
      },
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
