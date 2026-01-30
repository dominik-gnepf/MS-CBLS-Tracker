/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'stock-low': '#fef08a',
        'stock-critical': '#fca5a5',
        'stock-ok': '#bbf7d0',
      }
    },
  },
  plugins: [],
}
