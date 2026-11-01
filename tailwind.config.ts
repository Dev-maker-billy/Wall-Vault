import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B0E1A',
        panel: '#141830',
        line: '#272D4D',
        bone: '#EDEBF8',
        mute: '#9499B8',
        glow: '#A594FF',
        'glow-ink': '#120C33',
        danger: '#FF8A8A',
      },
      fontFamily: {
        display: ['"Unbounded Variable"', 'system-ui', 'sans-serif'],
        body: ['"Instrument Sans Variable"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
