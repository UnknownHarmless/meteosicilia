// scripts/geocode-comuni.mjs
// ============================================================
//  SCRIPT DI GEOCODING (esegui UNA SOLA VOLTA)
//  Prende ogni comune da comuni-sicilia.json e usa l'API di
//  geocoding di Open-Meteo (gratis, no API key) per recuperare
//  latitudine e longitudine. Salva tutto in
//  comuni-sicilia-geo.json. Le coordinate non cambiano mai,
//  quindi non ha senso ricalcolarle a ogni avvio dell'app.
//
//  USO: dalla root del progetto:  node scripts/geocode-comuni.mjs
// ============================================================

import fs from "node:fs/promises";

const comuni = JSON.parse(
  await fs.readFile("src/data/comuni-sicilia.json", "utf8")
);

const out = [];

for (const c of comuni) {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(c.nome)}` +
    `&country=IT&count=5&language=it`;

  try {
    const r = await fetch(url);
    const j = await r.json();

    // Cerca il risultato in Sicilia; fallback al primo.
    const hit =
      (j.results || []).find((x) =>
        x.admin1?.toLowerCase().includes("sicil")
      ) || j.results?.[0];

    if (hit) {
      out.push({
        nome: c.nome,
        provincia: c.provincia,
        lat: hit.latitude,
        lon: hit.longitude,
      });
      console.log("OK ", c.nome);
    } else {
      console.warn("MISS", c.nome, "→ da aggiungere a mano nel JSON");
    }
  } catch (e) {
    console.error("ERR", c.nome, e.message);
  }

  // Pausa di 200ms tra le richieste, no rate limit.
  await new Promise((r) => setTimeout(r, 200));
}

await fs.writeFile(
  "src/data/comuni-sicilia-geo.json",
  JSON.stringify(out, null, 2)
);
console.log(`\nFatti ${out.length}/${comuni.length} comuni`);
