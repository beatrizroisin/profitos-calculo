import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: { colors: { brand: { DEFAULT: '#1A6B4A', dark: '#0F4A33', light: '#E8F5EF' } } } },
  plugins: [],
};
export default config;
