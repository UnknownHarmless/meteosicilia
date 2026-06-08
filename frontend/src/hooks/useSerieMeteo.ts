// ============================================================
//  src/hooks/useSerieMeteo.ts
//  Carica la serie completa per il grafico interattivo:
//   ieri (-1) → +6 giorni, con tutte le 9 metriche per ogni ora.
//
//  Routing:
//   - QUALUNQUE comune → Open-Meteo (fetchSerieMeteo).
//   - Palermo (PA)     → Open-Meteo come base, ma per il giorno di
//                        OGGI sovrascrive le metriche che il Pi
//                        misura davvero con i dati Pi (storico) +
//                        AI (previsione). Se gli endpoint Pi/AI non
//                        ci sono ancora, resta tutto Open-Meteo.
//
//  Le metriche che il Pi NON misura (precipitazioni, nuvolosità)
//  restano sempre di Open-Meteo, anche per Palermo.
//
//  Refresh ogni 30 minuti + refresh() manuale.
// ============================================================

import { useEffect, useState } from "react";
import type { Comune } from "../data/comuni";
import type { PuntoOrario, SerieMeteo } from "../types/meteo";
import { fetchSerieMeteo } from "../api/openMeteo";
import { fetchGiornataPalermo } from "../api/raspberry";

interface Risultato {
  serie: SerieMeteo | null;
  caricamento: boolean;
  errore: string | null;
  fontiPalermo: boolean; // true se l'overlay Pi/AI è andato a buon fine
  refresh: () => void;
}

const REFRESH_MS = 30 * 60 * 1000;

// È Palermo "vera" (quella col Raspberry)?
function isPalermo(c: Comune): boolean {
  return c.nome === "Palermo" && c.provincia === "PA";
}

// Metriche che il Pi misura davvero: solo queste vengono
// sovrascritte coi dati Pi/AI. Le altre restano Open-Meteo.
const METRICHE_PI = [
  "temperatura",
  "vento",
  "qualita_aria",
  "umidita",
  "pressione",
  "luce",
  "co",
] as const;

// Fonde i punti Pi/AI di oggi sopra la base Open-Meteo di oggi.
// Match per ora (YYYY-MM-DDTHH). Solo le METRICHE_PI + previsto
// vengono sovrascritte; precipitazioni/nuvolosità/icona restano.
function fondiOggi(
  baseOggi: PuntoOrario[],
  pi: PuntoOrario[]
): PuntoOrario[] {
  const piPerOra = new Map<string, PuntoOrario>();
  for (const p of pi) piPerOra.set(p.ora.slice(0, 13), p);

  return baseOggi.map((b) => {
    const p = piPerOra.get(b.ora.slice(0, 13));
    if (!p) return b; // nessun dato Pi per quest'ora → resta Open-Meteo
    const fuso: PuntoOrario = { ...b };
    for (const m of METRICHE_PI) fuso[m] = p[m];
    fuso.previsto = p.previsto;
    return fuso;
  });
}

export function useSerieMeteo(comune: Comune | null): Risultato {
  const [serie, setSerie] = useState<SerieMeteo | null>(null);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [fontiPalermo, setFontiPalermo] = useState(false);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    if (!comune) {
      setSerie(null);
      setCaricamento(false);
      setErrore(null);
      setFontiPalermo(false);
      return;
    }

    let attivo = true;
    setCaricamento(true);
    setErrore(null);

    const carica = async () => {
      try {
        // 1) Base Open-Meteo per tutti (sempre).
        const base = await fetchSerieMeteo(comune);

        // 2) Solo Palermo: prova l'overlay Pi/AI sul giorno di oggi.
        let overlayOk = false;
        if (isPalermo(comune)) {
          try {
            const piOggi = await fetchGiornataPalermo();
            if (piOggi.length > 0) {
              const idxOggi = base.giorni.findIndex((g) => g.offset === 0);
              if (idxOggi !== -1) {
                base.giorni[idxOggi] = {
                  ...base.giorni[idxOggi],
                  ore: fondiOggi(base.giorni[idxOggi].ore, piOggi),
                };
                base.fonte = "raspberry";
                overlayOk = true;
              }
            }
          } catch {
            // Endpoint Pi/AI non ancora disponibili → fallback silenzioso.
            overlayOk = false;
          }
        }

        if (!attivo) return;
        setSerie(base);
        setFontiPalermo(overlayOk);
        setCaricamento(false);
      } catch (e: any) {
        if (!attivo) return;
        setErrore(e?.message ?? "Errore nel recupero della serie meteo");
        setCaricamento(false);
      }
    };

    carica();
    const id = setInterval(carica, REFRESH_MS);

    return () => {
      attivo = false;
      clearInterval(id);
    };
  }, [comune?.nome, comune?.provincia, comune?.lat, comune?.lon, trigger]);

  return {
    serie,
    caricamento,
    errore,
    fontiPalermo,
    refresh: () => setTrigger((t) => t + 1),
  };
}
