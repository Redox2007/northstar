import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#f4ece2',
        card: '#fffaf3',
        border: '#eaddcc',
        ink: '#33291f',
        muted: '#9a8a78',
        sidebar: '#33291f',
        'sidebar-mid': '#43372a',
        accent: '#c26a45',
        amber: '#d9a441',
        green: '#4f7a3e',
      },
      fontFamily: {
        heading: ['Bricolage Grotesque', 'sans-serif'],
        body: ['Work Sans', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
      },
    },
  },
  plugins: [],
}

export default config
