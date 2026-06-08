// ============================================================
//  src/hooks/usePrevisioniComune.ts
//  Hook per le PREVISIONI 7 giorni.
//  Funziona per TUTTI i comuni inclusa Palermo, perché le
//  previsioni a 7 giorni vengono SEMPRE da Open-Meteo.
//  L'AI sulle foto ESP serve invece a riempire il campo
//  "aspetto del cielo ora" in DatiSensore, non le previsioni.
// ============================================================

import { useEffect, useState } from "react";
import type { Comune } from "../data/comuni";
import type { PrevisioniMeteo } from "../types/meteo";
import { fetchPrevisioni } from "../api/openMeteo";

interface Risultato {
  previsioni: PrevisioniMeteo | null;
  caricamento: boolean;
  errore: string | null;
  refresh: () => void;
}

const REFRESH_MS = 30 * 60 * 1000;

export function usePrevisioniComune(
  comune: Comune | null,
  giorni: number = 7
): Risultato {
  const [previsioni, setPrevisioni] = useState<PrevisioniMeteo | null>(null);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    // Senza comune non possiamo fare nulla.
    if (!comune) {
      setPrevisioni(null);
      setCaricamento(false);
      setErrore(null);
      return;
    }

    let attivo = true;
    setCaricamento(true);
    setErrore(null);

    const carica = () => {
      fetchPrevisioni(comune, giorni)
        .then((p) => {
          if (!attivo) return;
          setPrevisioni(p);
          setCaricamento(false);
        })
        .catch((e) => {
          if (!attivo) return;
          setErrore(e?.message ?? "Errore nel recupero delle previsioni");
          setCaricamento(false);
        });
    };

    carica();
    const id = setInterval(carica, REFRESH_MS);

    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, [comune?.nome, comune?.provincia, comune?.lat, comune?.lon, giorni, trigger]);

  return {
    previsioni,
    caricamento,
    errore,
    refresh: () => setTrigger((t) => t + 1),
  };
}