import { resolve } from ***REMOVED***path***REMOVED***;
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: resolve(__dirname),
  resolve: {
    alias: {
      ***REMOVED***@***REMOVED***: resolve(__dirname, ***REMOVED***./src***REMOVED***),
    },
  },
})