import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#dfeeff',
          200: '#bfdcff',
          300: '#8cc2ff',
          400: '#58a0ff',
          500: '#2c7df5',
          600: '#1c5ed9',
          700: '#1d4eb2',
          800: '#1d3f8e',
          900: '#1f376f',
        },
        ink: '#0b1220',
      },
      boxShadow: {
        soft: '0 12px 32px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
