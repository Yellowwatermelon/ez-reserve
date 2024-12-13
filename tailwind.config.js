/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Pretendard Variable", "Pretendard", "-apple-system", "BlinkMacSystemFont", "system-ui", "Roboto", "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "sans-serif"],
      },
      animation: {
        marquee: "marquee 15s linear infinite",
        'dot-1': 'dot 1.4s infinite 0.2s',
        'dot-2': 'dot 1.4s infinite 0.4s',
        'dot-3': 'dot 1.4s infinite 0.6s',
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(-100%)" },
        },
        dot: {
          '0%, 60%, 100%': { opacity: 0 },
          '30%': { opacity: 1 },
        },
      },
      colors: {
        primary: "#1E3A8A", // 메인 색상
        secondary: "#3B82F6", // 보조 색상
        selected: "#0362FF",
        accent: "#F59E0B", // 강조 색상
        background: "#FFFFFF", // 배경 색상
        text: "#111827", // 기본 텍스트 색상
        muted: "#6B7280", // 보조 텍스트 색상
        disabled: "#EF4444", // 비활성화 상태 색상 (빨간색)
      },
    },
  },
  plugins: [],
}; 