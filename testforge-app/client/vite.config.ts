import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://idk11091.github.io/testforge/ (a GitHub Pages project subpath),
  // so every asset URL must be prefixed. Must stay in sync with <BrowserRouter basename>
  // in src/App.tsx and with the redirect shim in the portfolio's root 404.html.
  base: '/testforge/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
})
