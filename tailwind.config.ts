import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0E1114',
        panel: '#161A1F',
        line: '#272C33',
        bone: '#ECE7DD',
        mute: '#8D929B',
        brass: '#C8A15A',
        'brass-deep': '#1B1407',
        danger: '#E5806B',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', 'system-ui', 'sans-serif'],
        body: ['"Instrument Sans Variable"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
