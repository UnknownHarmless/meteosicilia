import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // ============================================================
  // PROXY DI SVILUPPO
  // In dev (npm run dev) il frontend gira su localhost:5173 e
  // il backend del Raspberry su un altro host. Per evitare i
  // problemi di CORS, Vite intercetta queste richieste e le
  // inoltra al Pi. Così nel codice usi URL relativi (/sse,
  // /last_read) e funziona sia in dev che in produzione.
  // CAMBIA L'IP con quello vero del Raspberry sulla tua rete.
  // ============================================================
  server: {
    proxy: {
      "/sse":         { target: "http://192.168.1.50:8000", changeOrigin: true },
      "/last_read":   { target: "http://192.168.1.50:8000", changeOrigin: true },
      // Endpoint Palermo (Raspberry + AI): storico misurato e previsione AI.
      "/storico":     { target: "http://192.168.1.50:8000", changeOrigin: true },
      "/previsione":  { target: "http://192.168.1.50:8000", changeOrigin: true },
    },
  },
})
