// ============================================================
//  src/utils/normalizza.ts
//  Tutte le conversioni di unità stanno qui.
//  Strategia A: portiamo luce, CO e qualità aria in 0-100 %
//  così Palermo (sensori reali) e le altre città (Open-Meteo)
//  diventano confrontabili a colpo d'occhio.
// ============================================================

// ----------- Range dei sensori del Pi -----------
// ADC standard a 10 bit (Arduino, ESP32 default).
// Se l'ESP usa un ADC a 12 bit cambia in 4095.
const FOTORES_MIN = 0;
const FOTORES_MAX = 1023;
const MQ7_MIN     = 0;
const MQ7_MAX     = 1023;
const MQ135_MIN   = 0;
const MQ135_MAX   = 1023;

// ----------- Range tipici di Open-Meteo -----------
// Sole estivo siciliano a mezzogiorno ≈ 900-1000 W/m².
const SUN_MAX_WM2 = 1000;
// CO in atmosfera: 200 μg/m³ pulito, 5000+ molto inquinato.
const CO_MAX_UGM3 = 5000;
// AQI europeo: 0 ottimo, 100 mediocre, 300+ pessimo.
const AQI_MAX = 300;

// ----------- Helper generico -----------
// Porta un numero dal suo range [min,max] alla scala 0-100.
// Tronca fuori scala con Math.max/min così non vediamo
// mai numeri tipo -3 % o 137 %.
function in_percento(val: number, min: number, max: number): number {
  const p = ((val - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, p));
}

// ----------- Da Pi (Palermo) → 0-100 % -----------
export const fotores_a_percento = (v: number) =>
  in_percento(v, FOTORES_MIN, FOTORES_MAX);

export const mq7_a_percento = (v: number) =>
  in_percento(v, MQ7_MIN, MQ7_MAX);

export const mq135_a_percento = (v: number) =>
  in_percento(v, MQ135_MIN, MQ135_MAX);

// ----------- Da Open-Meteo → 0-100 % -----------
export const radiazione_a_percento = (wm2: number) =>
  in_percento(wm2, 0, SUN_MAX_WM2);

export const co_ugm3_a_percento = (ug: number) =>
  in_percento(ug, 0, CO_MAX_UGM3);

export const aqi_a_percento = (aqi: number) =>
  in_percento(aqi, 0, AQI_MAX);
