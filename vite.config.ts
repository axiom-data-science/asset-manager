import { resolve } from 'path';
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: resolve(__dirname),
  server: {
    port: 4422
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})