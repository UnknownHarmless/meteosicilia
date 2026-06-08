// ============================================================
//  src/hooks/useDatiEsterni.ts
//  Carica i dati di tutti i comuni passati (in batch da 10),
//  li tiene aggiornati ogni 10 minuti, e li espone come una
//  mappa { "Catania": DatiSensore, "Ragusa": DatiSensore, ... }.
// ============================================================

import { useEffect, useRef, useState } from "react";
import type { Comune } from "../data/comuni";
import type { DatiSensore } from "../types/meteo";
import { fetchDatiEsterni } from "../api/openMeteo";

// Ogni 10 minuti rilanciamo l'aggiornamento.
const REFRESH_MS  = 10 * 60 * 1000;
// 10 chiamate parallele per volta.
const BATCH_SIZE  = 10;
// Pausa di 250ms tra un batch e l'altro: rispetto del rate limit.
const BATCH_DELAY = 250;

// Funzione interna: itera la lista in blocchi e chiama
// onUpdate(d) ogni volta che un dato è pronto.
async function caricaTutti(
  comuni: Comune[],
  onUpdate: (d: DatiSensore) => void
) {
  for (let i = 0; i < comuni.length; i += BATCH_SIZE) {
    const slice = comuni.slice(i, i + BATCH_SIZE);

    // allSettled (non all): se 1 chiamata fallisce, le altre
    // del batch vanno avanti lo stesso.
    const risultati = await Promise.allSettled(slice.map(fetchDatiEsterni));

    risultati.forEach(
      (r) => r.status === "fulfilled" && onUpdate(r.value)
    );

    await new Promise((r) => setTimeout(r, BATCH_DELAY));
  }
}

export function useDatiEsterni(comuni: Comune[]) {
  // Mappa "nome città" → ultimo DatiSensore.
  const [dati, setDati] = useState<Record<string, DatiSensore>>({});
  // true finché non finisce il primo giro di caricamento.
  const [caricamento, setCaricamento] = useState(true);

  // useRef = scatola che sopravvive al re-render e che,
  // mutata, NON ri-renderizza. La usiamo come "interruttore"
  // per ignorare aggiornamenti se il componente è smontato.
  const attivoRef = useRef(true);

  useEffect(() => {
    attivoRef.current = true;
    setCaricamento(true);

    const aggiorna = async () => {
      await caricaTutti(comuni, (d) => {
        if (!attivoRef.current) return; // componente smontato
        // Aggiorna SOLO la chiave del comune appena arrivato,
        // mantenendo intatti gli altri.
        setDati((prev) => ({ ...prev, [d.citta]: d }));
      });
      if (attivoRef.current) setCaricamento(false);
    };

    aggiorna();                                  // primo giro subito
    const id = setInterval(aggiorna, REFRESH_MS); // poi ogni 10 min

    return () => {
      // Cleanup: il componente sta sparendo o la lista cambia.
      attivoRef.current = false;
      clearInterval(id);
    };
  }, [comuni]);

  return { dati, caricamento };
}
