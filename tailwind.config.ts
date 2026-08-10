import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 哲学主题色 - 取自古典羊皮纸和墨水
        ink: "#1a1a1a",        // 主文字（墨色）
        parchment: "#f5f1e8",  // 背景（羊皮纸色）
        gold: "#b8860b",       // 金色点缀
        sage: "#9caf88",       // 鼠尾草绿
      },
      fontFamily: {
        serif: ["Georgia", "Songti SC", "STSong", "SimSun", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
