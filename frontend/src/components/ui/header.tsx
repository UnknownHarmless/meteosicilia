// ============================================================
//  src/components/ui/header.tsx
//  Barra superiore: brand, ricerca comuni, toggle tema.
//
//  ⚠️ Corretto il bug del logo: prima c'era
//    <img src="{theme === 'dark' ? ...}" />
//  cioè una STRINGA letterale (con le graffe dentro le
//  virgolette), che puntava a PNG inesistenti → icona rotta.
//  Sostituito con un brand pulito (icona + testo), niente
//  dipendenze da file immagine mancanti.
// ============================================================

import { useTheme } from "@/context/theme-provider";
import { Moon, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import CitySearch from "./city-search";
import { LogoFull, LogoMark } from "./logo";

const Header = () => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        {/* Brand (logo: si adatta a tema chiaro/scuro grazie a currentColor) */}
        <Link
          to="/"
          className="flex shrink-0 items-center text-foreground"
          aria-label="Meteo Sicilia — vai alla home"
        >
          <LogoMark className="h-9 w-9 sm:hidden" />
          <LogoFull className="hidden h-9 w-auto sm:block" />
        </Link>

        {/* Ricerca + toggle tema */}
        <div className="flex shrink-0 items-center gap-2">
          <CitySearch />

          <button
            type="button"
            aria-label="Cambia tema"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={
              "flex shrink-0 p-1 cursor-pointer items-center transition-transform duration-500 " +
              (isDark ? "rotate-180" : "rotate-0")
            }
          >
            {isDark ? (
              <Sun className="h-6 w-6 text-yellow-500 transition-all" />
            ) : (
              <Moon className="h-6 w-6 text-blue-500 transition-all" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
