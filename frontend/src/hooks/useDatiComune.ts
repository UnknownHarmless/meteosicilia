// ============================================================
//  src/hooks/useDatiComune.ts
//  Hook UNIFICATO. Dato un comune (oggetto Comune):
//   - se è Palermo → usa useDatiPalermo (SSE dal Raspberry)
//   - se è qualunque altro → usa Open-Meteo (fetch al volo)
//  Espone un'API uniforme che il componente Dashboard può usare
//  senza preoccuparsi di chi sta sotto.
//
//  Sostituisce useWeatherQuery del tutorial, adattato al nostro
//  doppio canale (Pi + API esterna).
// ============================================================

import { useEffect, useState } from "react";
import type { Comune } from "../data/comuni";
import type { DatiSensore } from "../types/meteo";
import { useDatiPalermo } from "./useDatiPalermo";
import { fetchDatiEsterni } from "../api/openMeteo";

interface RisultatoComune {
  dati: DatiSensore | null;
  caricamento: boolean;
  errore: string | null;
  // Funzione per forzare un nuovo fetch (per il bottone "Aggiorna").
  refresh: () => void;
}

// Quando è Palermo deleghiamo a useDatiPalermo, ignorando
// il flusso Open-Meteo.
function usaPalermo(): RisultatoComune {
  const { dati, stato } = useDatiPalermo();
  return {
    dati,
    caricamento: dati === null && stato !== "errore",
    errore: stato === "errore" ? "Connessione al Raspberry persa" : null,
    // Per Palermo non c'è bisogno di refresh manuale: l'SSE
    // pusha quando ha dati nuovi. Ma esponiamo comunque la
    // funzione per coerenza con l'API; semplicemente fa nulla
    // (no-op).
    refresh: () => {
      /* SSE push-based, niente da fare */
    },
  };
}

// Per qualunque altro comune usiamo Open-Meteo.
// Logica simile a useDatiEsterni ma per UN solo comune
// (così è più semplice e non sprechiamo chiamate inutili).
function usaEsterno(comune: Comune): RisultatoComune {
  const [dati, setDati] = useState<DatiSensore | null>(null);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  // Trigger di refresh: cambiare questo numero forza il re-fetch.
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    let attivo = true;
    setCaricamento(true);
    setErrore(null);

    fetchDatiEsterni(comune)
      .then((d) => {
        if (!attivo) return;
        setDati(d);
        setCaricamento(false);
      })
      .catch((e) => {
        if (!attivo) return;
        setErrore(e?.message ?? "Errore nel recupero dei dati meteo");
        setCaricamento(false);
      });

    // Refresh automatico ogni 10 minuti.
    const id = setInterval(() => {
      fetchDatiEsterni(comune)
        .then((d) => attivo && setDati(d))
        .catch(() => {/* fallisce silenziosamente, riproveremo */ });
    }, 10 * 60 * 1000);

    return () => {
      attivo = false;
      clearInterval(id);
    };
    // Dipendenze: il comune e il trigger di refresh manuale.
  }, [comune.nome, comune.provincia, comune.lat, comune.lon, trigger]);

  return {
    dati,
    caricamento,
    errore,
    refresh: () => setTrigger((t) => t + 1),
  };
}

// -------- API pubblica --------
// L'hook router: in base al comune passato sceglie a quale
// sotto-hook delegare. ATTENZIONE: chiamiamo SEMPRE entrambi
// i sotto-hook (regola delle Hooks di React: stesso numero
// di chiamate ad ogni render) e poi scegliamo quale risultato
// restituire. È un piccolo "spreco" computazionale che React
// considera idiomatico in questi casi.
export function useDatiComune(comune: Comune | null): RisultatoComune {
  const risultatoPalermo = usaPalermo();
  const risultatoEsterno = usaEsterno(
    comune ?? { nome: "Palermo", provincia: "PA", lat: 38.1157, lon: 13.3615 }
    // Passiamo un fallback finto perché useState/useEffect non
    // accettano "null". Il valore verrà semplicemente ignorato
    // nel return sottostante quando comune è null.
  );

  if (comune === null) {
    return {
      dati: null,
      caricamento: false,
      errore: null,
      refresh: () => { },
    };
  }

  // E Palermo? Usa il Raspberry. Altrimenti Open-Meteo.
  return comune.nome === "Palermo" && comune.provincia === "PA"
    ? risultatoPalermo
    : risultatoEsterno;
}


