/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          500: '#4B96FF', // Upload button color
          900: '#1A2B6B', // Mint button color
        },
        indigo: {
          600: '#4F46E5',
          700: '#4338CA',
        },
        purple: {
          600: '#9333EA',
          700: '#7E22CE',
        }
      }
    },
  },
  plugins: [],
}