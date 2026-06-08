// ============================================================
//  src/utils/comune-piu-vicino.ts
//  Reverse geocoding LOCALE.
//  Dato un punto GPS (lat, lon), trova il comune siciliano più
//  vicino dalla nostra lista COMUNI usando la formula di Haversine.
//  Sostituisce le API di reverse geocoding del tutorial.
// ============================================================

import { COMUNI, PALERMO, type Comune } from "../data/comuni";

// -------- Formula di Haversine --------
// Calcola la distanza (in km) tra due punti su una sfera
// (la Terra). È la formula standard per "che distanza c'è
// tra due coordinate GPS". Output in chilometri.
function distanzaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // raggio medio della Terra in km
  const toRad = (d: number) => (d * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// -------- Funzione principale --------
// Restituisce il comune più vicino, OPPURE null se la lista è
// vuota (non dovrebbe mai succedere con i nostri 390 comuni).
// Include anche Palermo nella ricerca, così se l'utente è a
// Palermo la dashboard saprà di usare il Raspberry.
export function trovaComunePiuVicino(
  lat: number,
  lon: number
): Comune | null {
  // Unione delle altre città + Palermo, così la ricerca è completa.
  const tutti = [PALERMO, ...COMUNI];

  if (tutti.length === 0) return null;

  let migliore = tutti[0];
  let migliorDist = distanzaKm(lat, lon, migliore.lat, migliore.lon);

  for (let i = 1; i < tutti.length; i++) {
    const d = distanzaKm(lat, lon, tutti[i].lat, tutti[i].lon);
    if (d < migliorDist) {
      migliorDist = d;
      migliore = tutti[i];
    }
  }

  return migliore;
}
