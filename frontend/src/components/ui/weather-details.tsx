// ============================================================
//  src/components/ui/weather-details.tsx
//  "Dettagli meteo" in card, ispirate a Bing Meteo ma coerenti
//  con I NOSTRI dati:
//    - valori "adesso" → DatiSensore (Pi per Palermo, Open-Meteo
//      per gli altri comuni)
//    - andamenti/derivati → SerieMeteo del giorno di oggi
//      (temperatura, nuvolosità, precipitazioni, umidità…)
//
//  Tutte le grafiche (sparkline, archi, cerchi) sono SVG inline:
//  niente librerie pesanti, perfette anche su mobile.
// ============================================================

import { Card, CardContent } from "@/components/ui/card";
import type { DatiSensore, PuntoOrario, SerieMeteo } from "@/types/meteo";
import {
  Cloud,
  CloudRain,
  Droplets,
  Gauge,
  ShieldAlert,
  Sparkles,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";

// ---------------- Helper di calcolo ----------------

// Giorno di oggi nella serie (offset 0).
function giornoOggi(serie: SerieMeteo | null): PuntoOrario[] {
  if (!serie) return [];
  const g = serie.giorni.find((d) => d.offset === 0) ?? serie.giorni[0];
  return g?.ore ?? [];
}

// Indice dell'ora corrente nelle ore di oggi.
function indiceAdesso(ore: PuntoOrario[]): number {
  const h = new Date().getHours();
  const i = ore.findIndex((o) => new Date(o.ora).getHours() === h);
  return i >= 0 ? i : 0;
}

// Temperatura percepita (apparent temperature) semplificata:
//  - caldo (≥27°): heat index in funzione dell'umidità
//  - freddo (≤10° e vento): wind chill
//  - altrimenti: temperatura reale
function percepita(t: number, umid: number, vento: number): number {
  if (t >= 27) {
    const hi =
      -8.78469475556 +
      1.61139411 * t +
      2.33854883889 * umid -
      0.14611605 * t * umid -
      0.012308094 * t * t -
      0.0164248277778 * umid * umid +
      0.002211732 * t * t * umid +
      0.00072546 * t * umid * umid -
      0.000003582 * t * t * umid * umid;
    return hi;
  }
  if (t <= 10 && vento > 4.8) {
    const v = Math.pow(vento, 0.16);
    return 13.12 + 0.6215 * t - 11.37 * v + 0.3965 * t * v;
  }
  return t;
}

// Punto di rugiada (Magnus).
function puntoRugiada(t: number, umid: number): number {
  const a = 17.27;
  const b = 237.7;
  const g = (a * t) / (b + t) + Math.log(Math.max(1, umid) / 100);
  return (b * g) / (a - g);
}

// Scala Beaufort dalla velocità in km/h.
function beaufort(kmh: number): { forza: number; nome: string } {
  const soglie = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117];
  const nomi = [
    "Calma",
    "Bava di vento",
    "Brezza leggera",
    "Brezza tesa",
    "Vento moderato",
    "Vento teso",
    "Vento fresco",
    "Vento forte",
    "Burrasca",
    "Burrasca forte",
    "Tempesta",
    "Tempesta violenta",
    "Uragano",
  ];
  let f = 0;
  for (let i = 0; i < soglie.length; i++) if (kmh >= soglie[i]) f = i + 1;
  return { forza: f, nome: nomi[f] };
}

// Etichetta nuvolosità dalla percentuale.
function etichettaCielo(pct: number): string {
  if (pct < 12) return "Soleggiato";
  if (pct < 35) return "Poco nuvoloso";
  if (pct < 65) return "Parz. nuvoloso";
  if (pct < 88) return "Molto nuvoloso";
  return "Coperto";
}

// Qualità aria: 0% = ottima, 100% = pessima (vedi normalizza.ts).
function statoAria(aqi: number): { label: string; colore: string } {
  if (aqi <= 20) return { label: "Ottima", colore: "rgb(16,185,129)" };
  if (aqi <= 40) return { label: "Buona", colore: "rgb(34,197,94)" };
  if (aqi <= 60) return { label: "Moderata", colore: "rgb(245,158,11)" };
  return { label: "Scadente", colore: "rgb(239,68,68)" };
}

// Prossima pioggia: prima ora futura con prob ≥ 30%.
function prossimaPioggia(
  ore: PuntoOrario[],
  idxAdesso: number
): { testo: string; prob: number } {
  for (let i = idxAdesso; i < ore.length; i++) {
    if (ore[i].precipitazioni >= 30) {
      const h = new Date(ore[i].ora).getHours();
      const tra = i - idxAdesso;
      return {
        testo:
          tra === 0
            ? "Pioggia in corso"
            : `Pioggia verso le ${String(h).padStart(2, "0")}:00`,
        prob: ore[i].precipitazioni,
      };
    }
  }
  return { testo: "Nessuna precipitazione prevista", prob: 0 };
}

// Costruisce un path SVG (sparkline) da una lista di valori.
function sparkline(
  valori: number[],
  w: number,
  h: number,
  pad = 3
): string {
  if (valori.length === 0) return "";
  const min = Math.min(...valori);
  const max = Math.max(...valori);
  const span = max - min || 1;
  const dx = (w - pad * 2) / Math.max(1, valori.length - 1);
  return valori
    .map((v, i) => {
      const x = pad + i * dx;
      const y = h - pad - ((v - min) / span) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

// ---------------- Sotto-componente Card ----------------

interface CardProps {
  icona: React.ReactNode;
  titolo: string;
  colore: string;
  children: React.ReactNode;
}

const DettaglioCard = ({ icona, titolo, colore, children }: CardProps) => (
  <Card className="border border-foreground/10 bg-card/50 backdrop-blur-md shadow-sm transition-all duration-300 hover:shadow-md">
    <CardContent className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${colore}1a`, color: colore }}
        >
          {icona}
        </span>
        <span className="text-sm font-semibold text-foreground">{titolo}</span>
      </div>
      {children}
    </CardContent>
  </Card>
);

// ---------------- Componente principale ----------------

interface WeatherDetailsProps {
  data: DatiSensore;
  serie: SerieMeteo | null;
}

const WeatherDetails = ({ data, serie }: WeatherDetailsProps) => {
  const ore = giornoOggi(serie);
  const idx = indiceAdesso(ore);
  const adesso = ore[idx];

  // Valori "ora": preferisco i sensori (DatiSensore) quando ci sono.
  const temp = data.temperatura;
  const umid = data.umidita;
  const vento = data.vento;
  const press = data.pressione;
  const luce = data.luce;
  const aria = data.qualita_aria;
  const co = data.monossido_carb;

  // Derivati dalla serie di oggi (se disponibile).
  const tempsOggi = ore.map((o) => o.temperatura);
  const nuvole = adesso?.nuvolosita ?? 0;
  const feels = percepita(temp, umid, vento);
  const rugiada = puntoRugiada(temp, umid);
  const bf = beaufort(vento);
  const cielo = etichettaCielo(nuvole);
  const aqi = statoAria(aria);
  const pioggia = prossimaPioggia(ore, idx);

  // Trend temperatura: confronto con il picco della giornata.
  let trendTemp = "Andamento stabile";
  if (tempsOggi.length > 1) {
    const max = Math.max(...tempsOggi);
    const iMax = tempsOggi.indexOf(max);
    const oraMax = ore[iMax] ? new Date(ore[iMax].ora).getHours() : null;
    if (iMax > idx)
      trendTemp = `In aumento, picco di ${Math.round(max)}° verso le ${String(
        oraMax
      ).padStart(2, "0")}:00`;
    else if (Math.round(temp) < Math.round(max))
      trendTemp = `In calo dopo il picco di ${Math.round(max)}°`;
  }

  // Trend pressione: confronto inizio/ora attuale della giornata.
  let trendPress = "stabile";
  if (ore.length > 1) {
    const delta = (adesso?.pressione ?? press) - ore[0].pressione;
    if (delta > 1.5) trendPress = "in aumento";
    else if (delta < -1.5) trendPress = "in calo";
  }

  const AMBER = "rgb(245,158,11)";

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold tracking-tight text-foreground">
        Dettagli meteo
      </h2>

      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {/* Temperatura + sparkline */}
        <DettaglioCard
          icona={<Thermometer className="h-4 w-4" />}
          titolo="Temperatura"
          colore={AMBER}
        >
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-black text-foreground">
                {Math.round(temp)}°
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{trendTemp}</p>
            </div>
            {tempsOggi.length > 1 && (
              <svg width={96} height={44} viewBox="0 0 96 44" className="hidden shrink-0 sm:block">
                <path
                  d={sparkline(tempsOggi, 96, 44)}
                  fill="none"
                  stroke={AMBER}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        </DettaglioCard>

        {/* Percepita */}
        <DettaglioCard
          icona={<Thermometer className="h-4 w-4" />}
          titolo="Percepita"
          colore="rgb(239,68,68)"
        >
          <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
            <p className="text-3xl font-black text-foreground">
              {Math.round(feels)}°
            </p>
            <div className="pb-1 text-xs text-muted-foreground">
              <p>Reale {Math.round(temp)}°</p>
              <p>
                Fattore:{" "}
                {Math.abs(feels - temp) < 0.5
                  ? "nessuno"
                  : feels > temp
                  ? "umidità"
                  : "vento"}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {feels > temp + 1
              ? "Si percepisce più caldo per via dell'umidità."
              : feels < temp - 1
              ? "Si percepisce più freddo per via del vento."
              : "In linea con la temperatura reale."}
          </p>
        </DettaglioCard>

        {/* Nuvolosità */}
        <DettaglioCard
          icona={<Cloud className="h-4 w-4" />}
          titolo="Nuvolosità"
          colore="rgb(148,163,184)"
        >
          <div className="flex items-center gap-4">
            <svg width={56} height={56} viewBox="0 0 56 56" className="hidden shrink-0 sm:block">
              <circle
                cx={28}
                cy={28}
                r={24}
                fill="none"
                stroke="currentColor"
                strokeOpacity={0.12}
                strokeWidth={6}
              />
              <circle
                cx={28}
                cy={28}
                r={24}
                fill="none"
                stroke="rgb(148,163,184)"
                strokeWidth={6}
                strokeLinecap="round"
                strokeDasharray={`${(nuvole / 100) * 150.8} 150.8`}
                transform="rotate(-90 28 28)"
              />
              <text
                x={28}
                y={32}
                textAnchor="middle"
                fontSize={13}
                fontWeight={700}
                fill="currentColor"
              >
                {Math.round(nuvole)}%
              </text>
            </svg>
            <div>
              <p className="text-lg font-bold text-foreground">{cielo}</p>
              <p className="text-xs text-muted-foreground">
                Copertura {Math.round(nuvole)}%
              </p>
            </div>
          </div>
        </DettaglioCard>

        {/* Precipitazioni */}
        <DettaglioCard
          icona={<CloudRain className="h-4 w-4" />}
          titolo="Precipitazioni"
          colore="rgb(56,132,255)"
        >
          <p className="text-2xl font-bold text-foreground">
            {pioggia.prob > 0 ? `${Math.round(pioggia.prob)}%` : "0%"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{pioggia.testo}</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full bg-[rgb(56,132,255)] transition-all"
              style={{ width: `${pioggia.prob}%` }}
            />
          </div>
        </DettaglioCard>

        {/* Vento */}
        <DettaglioCard
          icona={<Wind className="h-4 w-4" />}
          titolo="Vento"
          colore="rgb(20,184,166)"
        >
          <div className="flex items-end gap-2">
            <p className="text-3xl font-black text-foreground">
              {vento.toFixed(1)}
            </p>
            <span className="pb-1 text-sm text-muted-foreground">km/h</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Forza {bf.forza} · {bf.nome}
          </p>
        </DettaglioCard>

        {/* Umidità */}
        <DettaglioCard
          icona={<Droplets className="h-4 w-4" />}
          titolo="Umidità"
          colore="rgb(6,182,212)"
        >
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-black text-foreground">
                {Math.round(umid)}%
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Punto di rugiada {Math.round(rugiada)}°
              </p>
            </div>
            <div className="hidden items-end gap-1 pb-1 sm:flex">
              {[...Array(8)].map((_, i) => (
                <span
                  key={i}
                  className="w-1.5 rounded-full bg-[rgb(6,182,212)]"
                  style={{
                    height: 8 + i * 3,
                    opacity: (i + 1) / 8 <= umid / 100 ? 1 : 0.2,
                  }}
                />
              ))}
            </div>
          </div>
        </DettaglioCard>

        {/* Luce */}
        <DettaglioCard
          icona={<Sun className="h-4 w-4" />}
          titolo="Luce"
          colore={AMBER}
        >
          <div className="flex items-center gap-4">
            <svg width={70} height={40} viewBox="0 0 70 40" className="hidden shrink-0 sm:block">
              <path
                d="M 6 36 A 29 29 0 0 1 64 36"
                fill="none"
                stroke="currentColor"
                strokeOpacity={0.12}
                strokeWidth={6}
                strokeLinecap="round"
              />
              <path
                d="M 6 36 A 29 29 0 0 1 64 36"
                fill="none"
                stroke={AMBER}
                strokeWidth={6}
                strokeLinecap="round"
                strokeDasharray={`${(luce / 100) * 91} 91`}
              />
            </svg>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {Math.round(luce)}%
              </p>
              <p className="text-xs text-muted-foreground">
                Irraggiamento solare
              </p>
            </div>
          </div>
        </DettaglioCard>

        {/* Qualità aria */}
        <DettaglioCard
          icona={<Sparkles className="h-4 w-4" />}
          titolo="Qualità aria"
          colore={aqi.colore}
        >
          <p className="text-3xl font-black" style={{ color: aqi.colore }}>
            {aqi.label}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Indice {Math.round(aria)}/100
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${aria}%`, backgroundColor: aqi.colore }}
            />
          </div>
        </DettaglioCard>

        {/* Pressione */}
        <DettaglioCard
          icona={<Gauge className="h-4 w-4" />}
          titolo="Pressione"
          colore="rgb(168,85,247)"
        >
          <div className="flex items-end gap-2">
            <p className="text-3xl font-black text-foreground">
              {Math.round(press)}
            </p>
            <span className="pb-1 text-sm text-muted-foreground">hPa</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Tendenza {trendPress}
          </p>
        </DettaglioCard>

        {/* Monossido di carbonio */}
        <DettaglioCard
          icona={<ShieldAlert className="h-4 w-4" />}
          titolo="Monossido CO"
          colore="rgb(244,63,94)"
        >
          <p className="text-3xl font-black text-foreground">
            {Math.round(co)}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {co <= 20
              ? "Livelli sicuri"
              : co <= 50
              ? "Livelli moderati"
              : "Livelli elevati"}
          </p>
        </DettaglioCard>
      </div>
    </section>
  );
};

export default WeatherDetails;
