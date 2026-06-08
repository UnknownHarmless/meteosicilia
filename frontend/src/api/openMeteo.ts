// ============================================================
//  src/api/openMeteo.ts
//  Client per le due API di Open-Meteo:
//   - Forecast      → temp, umidità, pressione, vento, luce
//   - Air Quality   → CO, AQI
//  L'output è già "tradotto" nelle unità di Palermo (0-100%)
//  così la UI riceve un DatiSensore identico a quello del Pi.
// ============================================================

// ============================================================
//  src/api/openMeteo.ts
// ============================================================

import type { Comune } from "../data/comuni";
import type {
  DatiSensore,
  PrevisioniMeteo,
  PrevisioneGiorno,
  PuntoOrario,
  SerieGiorno,
  SerieMeteo,
} from "../types/meteo";
import {
  radiazione_a_percento,
  co_ugm3_a_percento,
  aqi_a_percento,
} from "../utils/normalizza";
import { infoDaCodice } from "../utils/codici-meteo";

const FORECAST = "https://api.open-meteo.com/v1/forecast";
const AIR = "https://air-quality-api.open-meteo.com/v1/air-quality";

export async function fetchDatiEsterni(c: Comune): Promise<DatiSensore> {
  // Aggiunto weather_code in current per popolare codiceMeteo/descrizione/icona.
  const params = new URLSearchParams({
    latitude: String(c.lat),
    longitude: String(c.lon),
    current:
      "temperature_2m,relative_humidity_2m,pressure_msl," +
      "wind_speed_10m,shortwave_radiation,weather_code",
    timezone: "Europe/Rome",
  });

  const airParams = new URLSearchParams({
    latitude: String(c.lat),
    longitude: String(c.lon),
    current: "carbon_monoxide,european_aqi",
    timezone: "Europe/Rome",
  });

  const [meteoR, airR] = await Promise.all([
    fetch(`${FORECAST}?${params}`).then((r) => r.json()),
    fetch(`${AIR}?${airParams}`).then((r) => r.json()),
  ]);

  const m = meteoR.current ?? {};
  const a = airR.current ?? {};

  // Aspetto del cielo "ora" dal codice WMO.
  const info = infoDaCodice(m.weather_code ?? 0);

  return {
    citta: c.nome,
    provincia: c.provincia,
    fonte: "open-meteo",
    timestamp: m.time ?? new Date().toISOString(),

    temperatura: m.temperature_2m,
    umidita: m.relative_humidity_2m,
    pressione: m.pressure_msl,
    vento: m.wind_speed_10m,

    luce: radiazione_a_percento(m.shortwave_radiation ?? 0),
    monossido_carb: co_ugm3_a_percento(a.carbon_monoxide ?? 0),
    qualita_aria: aqi_a_percento(a.european_aqi ?? 0),

    // Nuovi campi popolati per Open-Meteo
    codiceMeteo: m.weather_code,
    descrizione: info.descrizione,
    icona: info.icona,
  };
}

// ============================================================
//  PREVISIONI A N GIORNI (per TUTTI i comuni, Palermo inclusa)
// ============================================================
export async function fetchPrevisioni(
  c: Comune,
  giorni: number = 7
): Promise<PrevisioniMeteo> {
  const giorniSicuri = Math.max(1, Math.min(16, giorni));

  const params = new URLSearchParams({
    latitude: String(c.lat),
    longitude: String(c.lon),
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code",
    timezone: "Europe/Rome",
    forecast_days: String(giorniSicuri),
  });

  const resp = await fetch(`${FORECAST}?${params}`).then((r) => r.json());
  const d = resp.daily ?? {};
  const date: string[] = d.time ?? [];

  const lista: PrevisioneGiorno[] = date.map((data, i) => {
    const codice = d.weather_code?.[i] ?? 0;
    const info = infoDaCodice(codice);

    return {
      data,
      tempMax: d.temperature_2m_max?.[i] ?? 0,
      tempMin: d.temperature_2m_min?.[i] ?? 0,
      precipitazione: d.precipitation_sum?.[i] ?? 0,
      ventoMax: d.wind_speed_10m_max?.[i] ?? 0,
      codiceMeteo: codice,
      descrizione: info.descrizione,
      icona: info.icona,
    };
  });

  return {
    citta: c.nome,
    provincia: c.provincia,
    fonte: "open-meteo",
    generato: new Date().toISOString(),
    giorni: lista,
  };
}

// ============================================================
//  PREVISIONI ORARIE — 24 ore di oggi (00:00 → 23:00)
//  Usata per il grafico "Temperatura nelle prossime 24 ore".
//  Funziona per TUTTI i comuni inclusa Palermo (l'AI delle foto
//  riguarda solo l'aspetto del cielo "ora" in DatiSensore).
// ============================================================
import type { PrevisioneOraria, PrevisioniOrarie } from "../types/meteo";

export async function fetchPrevisioniOrarie(
  c: import("../data/comuni").Comune
): Promise<PrevisioniOrarie> {
  const params = new URLSearchParams({
    latitude: String(c.lat),
    longitude: String(c.lon),
    hourly: "temperature_2m,weather_code,precipitation_probability",
    daily: "sunrise,sunset", // alba/tramonto per i marker del grafico
    timezone: "Europe/Rome",
    forecast_days: "2", // 48 ore per coprire qualunque ora di "oggi"
  });

  const resp = await fetch(`${FORECAST}?${params}`).then((r) => r.json());
  const h = resp.hourly ?? {};
  const tempi: string[] = h.time ?? [];

  // Alba/tramonto: Open-Meteo li restituisce in daily[]; prendiamo
  // l'elemento di oggi (indice 0, perché forecast parte da oggi).
  const daily = resp.daily ?? {};
  const alba: string | undefined = daily.sunrise?.[0];
  const tramonto: string | undefined = daily.sunset?.[0];

  // Filtra solo le ore di oggi (mezzanotte di oggi → mezzanotte di domani).
  const inizio = new Date();
  inizio.setHours(0, 0, 0, 0);
  const fine = new Date(inizio);
  fine.setDate(fine.getDate() + 1);

  const ore: PrevisioneOraria[] = [];
  for (let i = 0; i < tempi.length; i++) {
    const d = new Date(tempi[i]);
    if (d >= inizio && d < fine) {
      const codice = h.weather_code?.[i] ?? 0;
      const info = infoDaCodice(codice);
      ore.push({
        ora: tempi[i],
        temperatura: h.temperature_2m?.[i] ?? 0,
        codiceMeteo: codice,
        descrizione: info.descrizione,
        icona: info.icona,
        probabilitaPioggia: h.precipitation_probability?.[i],
      });
    }
  }

  return {
    citta: c.nome,
    provincia: c.provincia,
    fonte: "open-meteo",
    generato: new Date().toISOString(),
    ore,
    alba,
    tramonto,
  };
}

// ============================================================
//  SERIE COMPLETA — ieri (-1) → +6 giorni, TUTTE le metriche
//  Usata dal grafico interattivo stile Bing.
//  Una sola chiamata forecast + una sola air-quality: i dati
//  orari di TUTTE le 9 modalità arrivano insieme, così cambiare
//  modalità o giorno nel grafico non richiede nuovi fetch.
//  Le ore passate hanno previsto=false (misurate/storiche),
//  le ore future previsto=true (forecast → linea tratteggiata).
// ============================================================

// Etichetta breve del giorno: "Ieri", "Oggi", oppure "Sab"/"Dom"...
function etichettaGiorno(offset: number, dataISO: string): string {
  if (offset === -1) return "Ieri";
  if (offset === 0) return "Oggi";
  const d = new Date(`${dataISO}T12:00:00`);
  const s = d.toLocaleDateString("it-IT", { weekday: "short" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function fetchSerieMeteo(c: Comune): Promise<SerieMeteo> {
  // --- Parametri forecast: 1 giorno passato (ieri) + 7 futuri ---
  const params = new URLSearchParams({
    latitude: String(c.lat),
    longitude: String(c.lon),
    hourly:
      "temperature_2m,weather_code,precipitation_probability," +
      "wind_speed_10m,relative_humidity_2m,cloud_cover," +
      "surface_pressure,shortwave_radiation",
    daily: "sunrise,sunset",
    timezone: "Europe/Rome",
    past_days: "1",
    forecast_days: "7",
  });

  const airParams = new URLSearchParams({
    latitude: String(c.lat),
    longitude: String(c.lon),
    hourly: "european_aqi,carbon_monoxide",
    timezone: "Europe/Rome",
    past_days: "1",
    forecast_days: "7",
  });

  const [meteoR, airR] = await Promise.all([
    fetch(`${FORECAST}?${params}`).then((r) => r.json()),
    fetch(`${AIR}?${airParams}`).then((r) => r.json()).catch(() => ({})),
  ]);

  const h = meteoR.hourly ?? {};
  const tempi: string[] = h.time ?? [];

  // Air-quality: indicizziamo per timestamp così allineiamo i due
  // dataset anche se le lunghezze non combaciano perfettamente.
  const ah = airR?.hourly ?? {};
  const aTempi: string[] = ah.time ?? [];
  const aqiPerOra = new Map<string, number>();
  const coPerOra = new Map<string, number>();
  for (let i = 0; i < aTempi.length; i++) {
    if (ah.european_aqi?.[i] != null)
      aqiPerOra.set(aTempi[i], ah.european_aqi[i]);
    if (ah.carbon_monoxide?.[i] != null)
      coPerOra.set(aTempi[i], ah.carbon_monoxide[i]);
  }

  // Alba/tramonto per giorno, indicizzati per data (YYYY-MM-DD).
  const daily = meteoR.daily ?? {};
  const dDate: string[] = daily.time ?? [];
  const albaPerData = new Map<string, string>();
  const tramontoPerData = new Map<string, string>();
  for (let i = 0; i < dDate.length; i++) {
    if (daily.sunrise?.[i]) albaPerData.set(dDate[i], daily.sunrise[i]);
    if (daily.sunset?.[i]) tramontoPerData.set(dDate[i], daily.sunset[i]);
  }

  // Riferimenti temporali per offset e flag previsto.
  const adesso = new Date();
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  const MS_GIORNO = 24 * 60 * 60 * 1000;

  // Raggruppiamo le ore per giorno (chiave = data locale YYYY-MM-DD).
  const giorniMap = new Map<string, SerieGiorno>();

  for (let i = 0; i < tempi.length; i++) {
    const isoOra = tempi[i];
    const dataISO = isoOra.slice(0, 10); // "YYYY-MM-DD"
    const istante = new Date(isoOra);

    const codice = h.weather_code?.[i] ?? 0;
    const info = infoDaCodice(codice);

    const punto: PuntoOrario = {
      ora: isoOra,
      temperatura: h.temperature_2m?.[i] ?? 0,
      precipitazioni: h.precipitation_probability?.[i] ?? 0,
      vento: h.wind_speed_10m?.[i] ?? 0,
      qualita_aria: aqi_a_percento(aqiPerOra.get(isoOra) ?? 0),
      umidita: h.relative_humidity_2m?.[i] ?? 0,
      nuvolosita: h.cloud_cover?.[i] ?? 0,
      pressione: h.surface_pressure?.[i] ?? 0,
      luce: radiazione_a_percento(h.shortwave_radiation?.[i] ?? 0),
      co: co_ugm3_a_percento(coPerOra.get(isoOra) ?? 0),
      codiceMeteo: codice,
      icona: info.icona,
      descrizione: info.descrizione,
      previsto: istante > adesso,
    };

    let giorno = giorniMap.get(dataISO);
    if (!giorno) {
      // offset = differenza in giorni rispetto a mezzanotte di oggi.
      const mezzanotteGiorno = new Date(`${dataISO}T00:00:00`);
      const offset = Math.round(
        (mezzanotteGiorno.getTime() - oggi.getTime()) / MS_GIORNO
      );
      giorno = {
        data: dataISO,
        offset,
        etichetta: etichettaGiorno(offset, dataISO),
        alba: albaPerData.get(dataISO),
        tramonto: tramontoPerData.get(dataISO),
        ore: [],
      };
      giorniMap.set(dataISO, giorno);
    }
    giorno.ore.push(punto);
  }

  const giorni = Array.from(giorniMap.values()).sort(
    (a, b) => a.offset - b.offset
  );

  return {
    citta: c.nome,
    provincia: c.provincia,
    fonte: "open-meteo",
    generato: new Date().toISOString(),
    giorni,
  };
}