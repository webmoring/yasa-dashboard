import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        joseon: {
          dark: '#1a1a2e',
          navy: '#16213e',
          accent: '#e94560',
          gold: '#d4a574',
        },
      },
    },
  },
  plugins: [],
}

export default config
