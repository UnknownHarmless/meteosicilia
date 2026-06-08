// ============================================================
//  src/utils/codici-meteo.ts
//  Mappa i codici WMO (World Meteorological Organization) di
//  Open-Meteo in descrizione italiana e nome icona.
//  I nomi icona sono "generici": usali come chiave per scegliere
//  poi l'icona visiva nella card (lucide-react, weather-icons,
//  PNG, qualunque cosa tu voglia).
//  Fonte ufficiale dei codici:
//  https://open-meteo.com/en/docs (sezione Weather variable docs)
// ============================================================

export interface InfoMeteo {
  descrizione: string;
  icona: string;
}

const TABELLA: Record<number, InfoMeteo> = {
  0:  { descrizione: "Sereno",                  icona: "sun" },
  1:  { descrizione: "Prevalentemente sereno",  icona: "sun-cloud" },
  2:  { descrizione: "Parzialmente nuvoloso",   icona: "cloud-sun" },
  3:  { descrizione: "Coperto",                 icona: "cloud" },

  45: { descrizione: "Nebbia",                  icona: "fog" },
  48: { descrizione: "Nebbia con brina",        icona: "fog" },

  51: { descrizione: "Pioviggine leggera",      icona: "drizzle" },
  53: { descrizione: "Pioviggine moderata",     icona: "drizzle" },
  55: { descrizione: "Pioviggine intensa",      icona: "drizzle" },

  56: { descrizione: "Pioviggine gelata leggera", icona: "drizzle-snow" },
  57: { descrizione: "Pioviggine gelata intensa", icona: "drizzle-snow" },

  61: { descrizione: "Pioggia debole",          icona: "rain" },
  63: { descrizione: "Pioggia moderata",        icona: "rain" },
  65: { descrizione: "Pioggia forte",           icona: "rain-heavy" },

  66: { descrizione: "Pioggia gelata debole",   icona: "rain-snow" },
  67: { descrizione: "Pioggia gelata forte",    icona: "rain-snow" },

  71: { descrizione: "Neve debole",             icona: "snow" },
  73: { descrizione: "Neve moderata",           icona: "snow" },
  75: { descrizione: "Neve forte",              icona: "snow-heavy" },
  77: { descrizione: "Granelli di neve",        icona: "snow" },

  80: { descrizione: "Rovesci di pioggia leggeri", icona: "showers" },
  81: { descrizione: "Rovesci di pioggia moderati", icona: "showers" },
  82: { descrizione: "Rovesci di pioggia violenti", icona: "showers-heavy" },

  85: { descrizione: "Rovesci di neve leggeri", icona: "snow-showers" },
  86: { descrizione: "Rovesci di neve forti",   icona: "snow-showers" },

  95: { descrizione: "Temporale",               icona: "thunderstorm" },
  96: { descrizione: "Temporale con grandine",  icona: "thunderstorm-hail" },
  99: { descrizione: "Temporale forte con grandine", icona: "thunderstorm-hail" },
};

// Restituisce sempre qualcosa: se il codice non esiste, fallback "sconosciuto".
export function infoDaCodice(code: number): InfoMeteo {
  return TABELLA[code] ?? { descrizione: "Sconosciuto", icona: "unknown" };
}
