/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          paper: '#FAF6ED',
          muted: '#F3ECE0',
          card: '#FFFDF9',
        },
        riso: {
          indigo: '#162032',
          orange: '#FF4924',
          teal: '#0E8A7F',
          yellow: '#FDE047',
          pink: '#FF4B72',
          green: '#10B981',
          muted: '#68778D',
          cream: '#FFFBF2',
        },
      },
      boxShadow: {
        'riso-sm': '2px 2px 0px #162032',
        'riso': '4px 4px 0px #162032',
        'riso-lg': '6px 6px 0px #162032',
        'riso-xl': '8px 8px 0px #162032',
        'riso-orange': '4px 4px 0px #FF4924',
        'riso-teal': '4px 4px 0px #0E8A7F',
        'riso-yellow': '4px 4px 0px #FDE047',
      },
      borderRadius: {
        'riso': '12px',
        'riso-lg': '16px',
        'riso-xl': '24px',
      },
      fontFamily: {
        sans: ['Prompt', 'Kanit', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['Space Mono', 'Consolas', 'monospace'],
        // Customer-facing headings only; merchant/admin UI stays on readable sans (Prompt).
        zine: ['Mali', 'Prompt', 'sans-serif'],
      },
      borderWidth: {
        'riso': '2px',
        'riso-thick': '3px',
      },
    },
  },
  plugins: [],
};
