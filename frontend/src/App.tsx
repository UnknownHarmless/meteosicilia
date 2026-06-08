// ============================================================
//  src/App.tsx
//  Punto di ingresso dell'app React.
//  Non usiamo TanStack Query perché i nostri hook custom
//  (useDatiComune, usePrevisioniComune, useDatiPalermo,
//  useDatiEsterni) gestiscono già caching, refetch periodico
//  e SSE in modo coerente con la nostra architettura
//  (Pi via SSE + Open-Meteo via fetch).
//
//  Struttura:
//    BrowserRouter   → routing tra dashboard e pagina città
//      ThemeProvider → tema chiaro/scuro
//        Layout      → header + main + footer
//          Routes    → quale pagina mostrare in base all'URL
// ============================================================

import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import Layout from "./components/ui/layout";
import { ThemeProvider } from "./context/theme-provider";
import WeatherDashboard from "./pages/weather-dashboard";
import CityPage from "./pages/city-page";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="dark">
        <Layout>
          <Routes>
            {/* Home → dashboard del comune corrente (geolocalizzato) */}
            <Route path="/" element={<WeatherDashboard />} />

            {/* Pagina di un comune scelto manualmente (search bar) */}
            <Route path="/city/:cityName" element={<CityPage />} />
          </Routes>
        </Layout>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
