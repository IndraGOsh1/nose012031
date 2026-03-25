/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base:    '#07090B',
          surface: '#0C1016',
          card:    '#101820',
          border:  '#1A2535',
          hover:   '#141F2E',
        },
        accent: {
          blue:  '#1B6FFF',
          cyan:  '#00C4FF',
          red:   '#BF3030',
          gold:  '#C8A44A',
          green: '#2ECC71',
        },
        tx: {
          primary:   '#E6ECF2',
          secondary: '#8799AE',
          muted:     '#485D72',
          dim:       '#2E3F52',
        },
      },
      fontFamily: {
        sans:    ['Barlow', 'sans-serif'],
        display: ['Oswald', 'sans-serif'],
        mono:    ['"Share Tech Mono"', 'monospace'],
      },
      keyframes: {
        fadeUp: { from:{opacity:'0',transform:'translateY(12px)'}, to:{opacity:'1',transform:'translateY(0)'} },
        fadeIn: { from:{opacity:'0'}, to:{opacity:'1'} },
        scan:   { '0%':{transform:'translateY(-100%)'}, '100%':{transform:'translateY(100vh)'} },
        pulse2: { '0%,100%':{opacity:'1'}, '50%':{opacity:'0.3'} },
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease forwards',
        'fade-in': 'fadeIn 0.3s ease forwards',
        'scan':    'scan 10s linear infinite',
        'pulse2':  'pulse2 1.2s step-end infinite',
      },
    },
  },
  plugins: [],
}
