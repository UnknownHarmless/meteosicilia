// ============================================================
//  src/api/raspberry.ts
//  Contratto con il backend del Raspberry + AI, SOLO per Palermo.
//
//  Idea: per Palermo le metriche che i sensori del Pi misurano
//  davvero (temperatura, umidità, pressione, vento, luce, CO,
//  qualità aria) devono venire dal Pi per il giorno di OGGI:
//    - le ore già passate  → STORICO misurato dal Pi
//    - le ore che restano  → PREVISIONE della nostra AI
//
//  Le metriche che il Pi NON misura (precipitazioni, nuvolosità)
//  restano di Open-Meteo: le riempie l'hook useSerieMeteo.
//
//  ⚠️ Questi endpoint NON esistono ancora sul backend. Finché non
//  ci sono, le funzioni lanciano un errore e l'hook fa fallback
//  automatico a Open-Meteo. Quando il team Pi/AI espone gli
//  endpoint, qui non cambia nulla: si attivano da soli.
// ============================================================

import type { PuntoOrario } from "../types/meteo";
import {
  fotores_a_percento,
  mq7_a_percento,
  mq135_a_percento,
} from "../utils/normalizza";
import { infoDaCodice } from "../utils/codici-meteo";

// Stessa convenzione di useDatiPalermo: vuoto in produzione
// (frontend servito dal Pi), valorizzato in .env.development.
const API_BASE = import.meta.env.VITE_API_BASE ?? "";

// Endpoint attesi dal backend (da implementare lato Pi/AI):
//   GET /storico/oggi    → ore misurate dal Pi da mezzanotte a ora
//   GET /previsione/oggi → ore previste dall'AI fino a fine giornata
const STORICO_URL = `${API_BASE}/storico/oggi`;
const PREVISIONE_URL = `${API_BASE}/previsione/oggi`;

// -------- Forma grezza di un'ora dal Pi/AI --------
// I valori luce/monossido_carb/qualita_aria sono GREZZI (ADC 0-1023),
// come in /last_read: li normalizziamo qui in 0-100 %.
interface OraGrezzaPi {
  ora: string;              // ISO timestamp dell'ora
  temperatura: number;      // °C
  umidita: number;          // %
  pressione: number;        // hPa
  vento: number;            // km/h
  luce: number;             // grezzo 0-1023
  monossido_carb: number;   // grezzo 0-1023
  qualita_aria: number;     // grezzo 0-1023
  codiceMeteo?: number;     // opzionale: dall'AI sulle foto ESP
}

// -------- Adatta un'ora grezza Pi → PuntoOrario --------
// Le metriche che il Pi non misura (precipitazioni, nuvolosità)
// le lasciamo a 0: le sovrascrive l'hook con Open-Meteo.
function adattaOra(o: OraGrezzaPi, previsto: boolean): PuntoOrario {
  const codice = o.codiceMeteo ?? 0;
  const info = infoDaCodice(codice);
  return {
    ora: o.ora,
    temperatura: o.temperatura,
    precipitazioni: 0,        // non misurato dal Pi → riempie l'hook
    vento: o.vento,
    qualita_aria: mq135_a_percento(o.qualita_aria),
    umidita: o.umidita,
    nuvolosita: 0,            // non misurato dal Pi → riempie l'hook
    pressione: o.pressione,
    luce: fotores_a_percento(o.luce),
    co: mq7_a_percento(o.monossido_carb),
    codiceMeteo: codice,
    icona: info.icona,
    descrizione: info.descrizione,
    previsto,
  };
}

// -------- Storico misurato di oggi (ore già passate) --------
export async function fetchStoricoOggi(): Promise<PuntoOrario[]> {
  const r = await fetch(STORICO_URL);
  if (!r.ok) throw new Error(`Storico Pi non disponibile (${r.status})`);
  const j = await r.json();
  const ore: OraGrezzaPi[] = Array.isArray(j) ? j : j.ore ?? [];
  return ore.map((o) => adattaOra(o, false)); // misurate → linea piena
}

// -------- Previsione AI di oggi (ore che restano) --------
export async function fetchPrevisioneOggi(): Promise<PuntoOrario[]> {
  const r = await fetch(PREVISIONE_URL);
  if (!r.ok) throw new Error(`Previsione AI non disponibile (${r.status})`);
  const j = await r.json();
  const ore: OraGrezzaPi[] = Array.isArray(j) ? j : j.ore ?? [];
  return ore.map((o) => adattaOra(o, true)); // previste → linea tratteggiata
}

// -------- Comodo: storico + previsione insieme --------
// Restituisce l'intera giornata di oggi per Palermo (Pi + AI).
// Se UNO dei due endpoint manca, lancia: l'hook fa fallback.
export async function fetchGiornataPalermo(): Promise<PuntoOrario[]> {
  const [storico, previsione] = await Promise.all([
    fetchStoricoOggi(),
    fetchPrevisioneOggi(),
  ]);
  // Ordiniamo per ora; in caso di sovrapposizione vince lo storico.
  const perOra = new Map<string, PuntoOrario>();
  for (const p of previsione) perOra.set(p.ora, p);
  for (const p of storico) perOra.set(p.ora, p); // lo storico ha priorità
  return Array.from(perOra.values()).sort(
    (a, b) => new Date(a.ora).getTime() - new Date(b.ora).getTime()
  );
}
