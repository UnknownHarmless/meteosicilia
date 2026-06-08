// ============================================================
//  src/types/meteo.ts
// ============================================================

export type FonteDati = "raspberry" | "open-meteo";

// ---------- METEO ATTUALE ----------
export interface DatiSensore {
  citta: string;
  provincia: string;
  fonte: FonteDati;
  timestamp: string;

  temperatura: number;
  umidita: number;
  pressione: number;
  vento: number;

  luce: number;
  monossido_carb: number;
  qualita_aria: number;

  // Aspetto del cielo ORA.
  // Per Open-Meteo: popolato dal weather_code.
  // Per il Raspberry: undefined, lo riempirà l'AI sulle foto ESP.
  codiceMeteo?: number;
  descrizione?: string;
  icona?: string;
}

// ---------- PREVISIONI 7 GIORNI ----------
export interface PrevisioneGiorno {
  data: string;
  tempMax: number;
  tempMin: number;
  precipitazione: number;
  ventoMax: number;
  codiceMeteo: number;
  descrizione: string;
  icona: string;
}

export interface PrevisioniMeteo {
  citta: string;
  provincia: string;
  fonte: "open-meteo";
  generato: string;
  giorni: PrevisioneGiorno[];
}

// ---------- PREVISIONI ORARIE (24 ore della giornata) ----------
export interface PrevisioneOraria {
  ora: string;                 // ISO timestamp
  temperatura: number;         // °C
  codiceMeteo: number;
  descrizione: string;
  icona: string;
  probabilitaPioggia?: number; // %
}

export interface PrevisioniOrarie {
  citta: string;
  provincia: string;
  fonte: "open-meteo";
  generato: string;
  ore: PrevisioneOraria[];     // 24 elementi (00:00 → 23:00 di oggi)
  alba?: string;               // ISO timestamp dell'alba di oggi
  tramonto?: string;           // ISO timestamp del tramonto di oggi
}

// ============================================================
//  SERIE MULTI-METRICA / MULTI-GIORNO
//  Modello dati per il grafico interattivo stile Bing:
//   - 9 modalità selezionabili (le 6 di Bing + 3 sensori Pi)
//   - navigazione giorni: ieri (-1), oggi (0), fino a +6
//   - ogni ora porta TUTTE le metriche, così cambiare modalità
//     non richiede di rifare il fetch.
// ============================================================

// Le 9 modalità del grafico. La chiave è anche il nome del campo
// numerico dentro PuntoOrario, così la UI fa punto[metrica].
export type Metrica =
  | "temperatura"   // °C        (Bing: Panoramica)
  | "precipitazioni"// %         (Bing: Precipitazioni → prob. pioggia)
  | "vento"         // km/h      (Bing: Vento)
  | "qualita_aria"  // 0-100 %   (Bing: Qualità aria)
  | "umidita"       // %         (Bing: Umidità)
  | "nuvolosita"    // %         (Bing: Nuvolosità)
  | "pressione"     // hPa       (sensore Pi)
  | "luce"          // 0-100 %   (sensore Pi)
  | "co";           // 0-100 %   (sensore Pi, monossido di carbonio)

// Un singolo punto orario con TUTTE le metriche disponibili.
// `previsto` = false → dato misurato/storico (linea piena)
//            = true  → dato previsto dall'AI o dal forecast (linea tratteggiata)
export interface PuntoOrario {
  ora: string;                 // ISO timestamp dell'ora
  temperatura: number;         // °C
  precipitazioni: number;      // % probabilità pioggia
  vento: number;               // km/h
  qualita_aria: number;        // 0-100 %
  umidita: number;             // %
  nuvolosita: number;          // %
  pressione: number;           // hPa
  luce: number;                // 0-100 %
  co: number;                  // 0-100 %
  codiceMeteo: number;         // WMO
  icona: string;               // chiave icona
  descrizione: string;
  previsto: boolean;           // true = AI/forecast, false = misurato
}

// Tutte le ore di un singolo giorno.
export interface SerieGiorno {
  data: string;                // "YYYY-MM-DD" del giorno
  offset: number;              // -1 = ieri, 0 = oggi, +1..+6 = futuri
  etichetta: string;           // "Ieri", "Oggi", "Sab", "Dom"...
  alba?: string;               // ISO timestamp dell'alba
  tramonto?: string;           // ISO timestamp del tramonto
  ore: PuntoOrario[];          // 24 ore (00:00 → 23:00)
}

// L'intera serie: ieri + oggi + prossimi giorni.
export interface SerieMeteo {
  citta: string;
  provincia: string;
  fonte: FonteDati;            // "open-meteo" o "raspberry" (Palermo)
  generato: string;
  giorni: SerieGiorno[];       // ordinati per offset crescente (-1 → +6)
}