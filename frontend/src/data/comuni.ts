// ============================================================
//  src/data/comuni.ts
//  Unisce la lista base (comuni-sicilia.json) con le coordinate
//  generate dallo script (comuni-sicilia-geo.json) ed esporta
//  un array tipizzato pronto all'uso.
// ============================================================

import comuniRaw from "./comuni-sicilia.json";
import comuniGeo from "./comuni-sicilia-geo.json";

export interface Comune {
  nome: string;
  provincia: string;
  lat: number;
  lon: number;
}

// Map "Nome|Sigla" → coordinate, per lookup O(1).
// La doppia chiave evita collisioni se due comuni con stesso
// nome esistono in province diverse.
const geoMap = new Map<string, { lat: number; lon: number }>(
  comuniGeo.map((g: any) => [
    `${g.nome}|${g.provincia}`,
    { lat: g.lat, lon: g.lon },
  ])
);

// Per ogni comune base, cerchiamo le coordinate.
// Se mancano, lo escludiamo (filter(... is Comune)).
export const COMUNI: Comune[] = comuniRaw
  .map((c) => {
    const geo = geoMap.get(`${c.nome}|${c.provincia}`);
    return geo ? { ...c, ...geo } : null;
  })
  .filter((c): c is Comune => c !== null);

// Palermo a parte: dati dal Raspberry.
export const PALERMO: Comune = {
  nome: "Palermo",
  provincia: "PA",
  lat: 38.1157,
  lon: 13.3615,
};
