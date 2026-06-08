// ============================================================
//  src/hooks/useDatiPalermo.ts
//  Si collega via SSE all'endpoint /sse del Raspberry.
//  Quando arriva una notifica "new_reading", fa GET /last_read
//  per leggere l'ultimo dato e lo trasforma in DatiSensore
//  con la stessa normalizzazione 0-100% usata per le altre città.
// ============================================================

import { useEffect, useRef, useState } from "react";
import type { DatiSensore } from "../types/meteo";
import {
  fotores_a_percento,
  mq7_a_percento,
  mq135_a_percento,
} from "../utils/normalizza";

// API_BASE è vuoto in produzione (frontend servito dal Pi).
// In sviluppo lo settiamo nel .env.development.
const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const SSE_URL  = `${API_BASE}/sse`;
const READ_URL = `${API_BASE}/last_read`;

// -------- Trasformazione JSON Pi → DatiSensore --------
// La isoliamo qui perché serve in due punti (mount + onmessage).
function adatta(json: any): DatiSensore {
  return {
    citta: "Palermo",
    provincia: "PA",
    fonte: "raspberry",
    // Il backend strippa il timestamp dal /last_read.
    // Lo aggiungiamo noi al momento della ricezione.
    timestamp: new Date().toISOString(),

    // Unità già giuste: copia secca.
    temperatura: json.temperatura,
    umidita:     json.umidita,
    pressione:   json.pressione,
    vento:       json.vento,

    // Convertiamo i tre valori grezzi in 0-100 %.
    luce:           fotores_a_percento(json.luce),
    monossido_carb: mq7_a_percento(json.monossido_carb),
    qualita_aria:   mq135_a_percento(json.qualita_aria),
  };
}

export function useDatiPalermo() {
  const [dati, setDati] = useState<DatiSensore | null>(null);
  const [stato, setStato] =
    useState<"connesso" | "disconnesso" | "errore">("disconnesso");

  // Riferimento al canale SSE, per chiuderlo al cleanup.
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Funzione di fetch + adattamento.
    const caricaUltimo = async () => {
      try {
        const r = await fetch(READ_URL);
        if (!r.ok) return;
        const j = await r.json();
        setDati(adatta(j));
      } catch (e) {
        console.warn("Fetch /last_read fallito", e);
      }
    };

    // 1) Primo dato subito, così la UI non è vuota.
    caricaUltimo();

    // 2) Apriamo il canale SSE.
    const es = new EventSource(SSE_URL);
    esRef.current = es;

    es.onopen  = () => setStato("connesso");
    es.onerror = () => setStato("errore");

    // Il backend manda: data: {"event": "new_reading"}\n\n
    es.onmessage = (e) => {
      setStato("connesso");
      try {
        const payload = JSON.parse(e.data);
        if (payload?.event === "new_reading") caricaUltimo();
      } catch {
        // Keep-alive o payload non JSON → ignora.
      }
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  return { dati, stato };
}
