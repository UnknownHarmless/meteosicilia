// ============================================================
//  src/hooks/use-search-history.ts
//  Cronologia delle ricerche, salvata in localStorage.
//
//  ⚠️ Riscritto SENZA TanStack Query (il tutorial lo usava, ma
//  la nostra app non lo monta — vedi App.tsx). È un semplice
//  hook basato su useLocalStorage e adattato al nostro modello
//  Comune (nome, provincia, lat, lon).
// ============================================================

import { useCallback } from "react";
import { useLocalStorage } from "./use-local-storage";

export interface VoceCronologia {
  nome: string;
  provincia: string;
  lat: number;
  lon: number;
  cercatoIl: number; // timestamp ms
}

const MAX_CRONOLOGIA = 6;

export function useSearchHistory() {
  const [cronologia, setCronologia] = useLocalStorage<VoceCronologia[]>(
    "search-history",
    []
  );

  // Aggiunge una voce in cima, deduplica per nome+provincia, taglia a MAX.
  const aggiungi = useCallback(
    (v: Omit<VoceCronologia, "cercatoIl">) => {
      setCronologia((prev) => {
        const nuova: VoceCronologia = { ...v, cercatoIl: Date.now() };
        const senzaDup = prev.filter(
          (x) => !(x.nome === v.nome && x.provincia === v.provincia)
        );
        return [nuova, ...senzaDup].slice(0, MAX_CRONOLOGIA);
      });
    },
    [setCronologia]
  );

  const pulisci = useCallback(() => setCronologia([]), [setCronologia]);

  return { cronologia, aggiungi, pulisci };
}
