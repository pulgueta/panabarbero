export const tailwindConfig = {
  darkMode: ["class"],
  content: ["./emails/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "oklch(0.92 0.004 286.32)",
        input: "oklch(0.92 0.004 286.32)",
        ring: "oklch(0.708 0 0)",
        background: "oklch(1 0 0)",
        foreground: "oklch(0.141 0.005 285.823)",
        primary: {
          DEFAULT: "oklch(36.1% 0.1046 266.8)",
          foreground: "oklch(0.97 0.014 254.604)",
        },
        secondary: {
          DEFAULT: "oklch(0.967 0.001 286.375)",
          foreground: "oklch(0.21 0.006 285.885)",
        },
        destructive: {
          DEFAULT: "oklch(59.8% 0.198 25.52)",
          foreground: "oklch(98.3% 0.0083 25.52)",
        },
        muted: {
          DEFAULT: "oklch(0.967 0.001 286.375)",
          foreground: "oklch(0.552 0.016 285.938)",
        },
        accent: {
          DEFAULT: "oklch(0.967 0.001 286.375)",
          foreground: "oklch(0.21 0.006 285.885)",
        },
        popover: {
          DEFAULT: "oklch(1 0 0)",
          foreground: "oklch(0.141 0.005 285.823)",
        },
        card: {
          DEFAULT: "oklch(1 0 0)",
          foreground: "oklch(0.141 0.005 285.823)",
        },
      },
      borderRadius: {
        lg: "0.65rem",
        md: "calc(0.65rem - 2px)",
        sm: "calc(0.65rem - 4px)",
      },
    },
  },
};
