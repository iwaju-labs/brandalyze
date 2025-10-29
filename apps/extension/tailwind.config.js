/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./popup/*.html",
    "./popup/*.js",
    "./content/*.js"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#6b7280'
      }
    }
  },
  plugins: []
}
