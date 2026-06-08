// ============================================================
//  src/components/ui/hourly-temperature.tsx
//  Grafico "Temperatura nelle 24 ore" — stile Bing Meteo.
//
//  ⚠️ NIENTE RECHARTS: il grafico è disegnato a mano in SVG puro.
//  Recharts andava in crash all'import (bug di interop con Vite,
//  "require_isUnsafeProperty is not a function") e faceva diventare
//  bianca tutta la pagina. Con l'SVG il problema sparisce del tutto
//  e abbiamo il controllo totale su aspetto e responsività.
//
//  Cosa mostra, ora per ora:
//   - icona meteo (emoji) + temperatura in alto
//   - curva morbida della temperatura con area sfumata
//   - colonna "Adesso" evidenziata con linea e pallino
//   - marker di alba e tramonto
//   - barra inferiore con la probabilità di pioggia
//
//  È avvolto in un contenitore con scroll orizzontale: su desktop
//  si vede in larghezza, su smartphone/tablet si scorre col dito e
//  all'apertura si posiziona automaticamente sull'ora corrente.
// ============================================================

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PrevisioniOrarie } from "@/types/meteo";
import { useEffect, useMemo, useRef } from "react";

// Mappa icona logica → emoji (stessa logica del resto dell'app).
const EMOJI: Record<string, string> = {
  sun: "☀️",
  "sun-cloud": "🌤️",
  "cloud-sun": "⛅",
  cloud: "☁️",
  fog: "🌫️",
  drizzle: "🌦️",
  "drizzle-snow": "🌨️",
  rain: "🌧️",
  "rain-heavy": "🌧️",
  "rain-snow": "🌨️",
  snow: "❄️",
  "snow-heavy": "❄️",
  "snow-showers": "🌨️",
  showers: "🌦️",
  "showers-heavy": "🌧️",
  thunderstorm: "⛈️",
  "thunderstorm-hail": "⛈️",
  unknown: "❔",
};

// Colore accento: ambra, coerente con la card del meteo attuale.
const ACCENT = "rgb(245, 158, 11)";
const RAIN_COLOR = "rgb(56, 132, 255)";

// ---- Costanti di layout (coordinate interne all'SVG) ----
const COL_W = 56; // larghezza di ogni colonna oraria
const EMOJI_Y = 24; // riga delle emoji
const TEMP_Y = 46; // riga delle temperature
const CHART_TOP = 74; // bordo alto dell'area del grafico
const CHART_BOTTOM = 206; // bordo basso (linea di base)
const HOUR_Y = 230; // riga delle ore
const RAIN_TOP = 246; // riga della pioggia
const RAIN_H = 20;
const SVG_H = 280; // altezza totale dell'SVG

// Curva morbida (Catmull-Rom → Bézier): trasforma una lista di punti
// in un path "C ..." dall'andamento fluido, come nel grafico Bing.
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

interface HourlyTemperatureProps {
  data: PrevisioniOrarie;
}

const HourlyTemperature = ({ data }: HourlyTemperatureProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const ore = data.ore ?? [];

  // Tutti i calcoli geometrici in un solo useMemo (si ricalcolano solo
  // quando cambiano i dati).
  const model = useMemo(() => {
    const temps = ore.map((o) => o.temperatura);
    const tMin = temps.length ? Math.min(...temps) : 0;
    const tMax = temps.length ? Math.max(...temps) : 30;
    // Range Y allargato; evita divisione per zero se tutte uguali.
    const lo = tMin - 2;
    const hi = tMax + 2 === lo ? lo + 1 : tMax + 2;

    const xOf = (i: number) => COL_W / 2 + i * COL_W;
    const yOf = (t: number) =>
      CHART_BOTTOM - ((t - lo) / (hi - lo)) * (CHART_BOTTOM - CHART_TOP);

    const points = ore.map((o, i) => ({ x: xOf(i), y: yOf(o.temperatura) }));

    // x per un orario (alba/tramonto): ora + minuti come frazione.
    const xForTime = (iso?: string): number | null => {
      if (!iso) return null;
      const d = new Date(iso);
      if (isNaN(d.getTime())) return null;
      const f = d.getHours() + d.getMinutes() / 60;
      return COL_W / 2 + f * COL_W;
    };

    // Indice dell'ora corrente.
    const nowHour = new Date().getHours();
    let nowIdx = ore.findIndex((o) => new Date(o.ora).getHours() === nowHour);
    if (nowIdx < 0) nowIdx = 0;

    const width = Math.max(ore.length * COL_W, COL_W);

    return {
      points,
      xOf,
      yOf,
      width,
      nowIdx,
      nowX: xOf(nowIdx),
      nowY: points[nowIdx]?.y ?? CHART_BOTTOM,
      albaX: xForTime(data.alba),
      tramontoX: xForTime(data.tramonto),
    };
  }, [data, ore]);

  // All'apertura (e quando cambia l'ora corrente) centra lo scroll
  // sulla colonna "Adesso", come fa Bing.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, model.nowX - el.clientWidth / 2);
  }, [model.nowX]);

  if (!ore.length) return null;

  const { points, xOf, width, nowIdx, nowX, nowY, albaX, tramontoX } = model;

  const linePath = smoothPath(points);
  const areaPath =
    `${linePath} L ${xOf(ore.length - 1)} ${CHART_BOTTOM}` +
    ` L ${xOf(0)} ${CHART_BOTTOM} Z`;

  // Linee orizzontali di griglia (4 livelli).
  const gridLines = [0, 1, 2, 3].map(
    (k) => CHART_TOP + (k * (CHART_BOTTOM - CHART_TOP)) / 3
  );

  const oraFormat = (iso: string) =>
    new Date(iso).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <Card className="mt-4 overflow-hidden border border-foreground/10 bg-card/50 backdrop-blur-md shadow-lg transition-all duration-300 hover:shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Temperatura nelle 24 ore
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          {data.citta} ·{" "}
          {new Date(data.generato).toLocaleTimeString("it-IT", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </CardHeader>

      <CardContent className="px-0 pb-3 pt-0">
        {/* Contenitore scorrevole orizzontalmente (perfetto su mobile). */}
        <div
          ref={scrollRef}
          className="w-full overflow-x-auto overflow-y-hidden text-foreground"
          style={{ scrollbarWidth: "thin", WebkitOverflowScrolling: "touch" }}
        >
          <svg
            width={width}
            height={SVG_H}
            viewBox={`0 0 ${width} ${SVG_H}`}
            role="img"
            aria-label="Grafico della temperatura nelle prossime 24 ore"
            className="block"
          >
            <defs>
              {/* Sfumatura sotto la curva. */}
              <linearGradient id="gradTemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT} stopOpacity={0.5} />
                <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Griglia orizzontale leggera. */}
            {gridLines.map((y, i) => (
              <line
                key={`g-${i}`}
                x1={0}
                x2={width}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeDasharray="3 4"
              />
            ))}

            {/* Evidenziazione della colonna "Adesso". */}
            <rect
              x={nowIdx * COL_W}
              y={CHART_TOP - 30}
              width={COL_W}
              height={CHART_BOTTOM - CHART_TOP + 60}
              fill="currentColor"
              fillOpacity={0.05}
              rx={8}
            />

            {/* Area sfumata + linea della temperatura. */}
            <path d={areaPath} fill="url(#gradTemp)" />
            <path
              d={linePath}
              fill="none"
              stroke={ACCENT}
              strokeWidth={2.5}
              strokeLinecap="round"
            />

            {/* Marker alba/tramonto. */}
            {albaX != null && (
              <g>
                <line
                  x1={albaX}
                  x2={albaX}
                  y1={CHART_TOP}
                  y2={CHART_BOTTOM}
                  stroke={ACCENT}
                  strokeOpacity={0.35}
                  strokeDasharray="2 4"
                />
                <text
                  x={albaX}
                  y={CHART_BOTTOM - 8}
                  textAnchor="middle"
                  fontSize={11}
                  fill="currentColor"
                  fillOpacity={0.75}
                >
                  🌅 {data.alba ? oraFormat(data.alba) : ""}
                </text>
              </g>
            )}
            {tramontoX != null && (
              <g>
                <line
                  x1={tramontoX}
                  x2={tramontoX}
                  y1={CHART_TOP}
                  y2={CHART_BOTTOM}
                  stroke={ACCENT}
                  strokeOpacity={0.35}
                  strokeDasharray="2 4"
                />
                <text
                  x={tramontoX}
                  y={CHART_BOTTOM - 8}
                  textAnchor="middle"
                  fontSize={11}
                  fill="currentColor"
                  fillOpacity={0.75}
                >
                  🌇 {data.tramonto ? oraFormat(data.tramonto) : ""}
                </text>
              </g>
            )}

            {/* Linea verticale + pallino dell'ora corrente. */}
            <line
              x1={nowX}
              x2={nowX}
              y1={CHART_TOP - 6}
              y2={CHART_BOTTOM}
              stroke={ACCENT}
              strokeOpacity={0.7}
              strokeDasharray="4 4"
            />
            <circle cx={nowX} cy={nowY} r={4.5} fill={ACCENT} />
            <circle
              cx={nowX}
              cy={nowY}
              r={9}
              fill={ACCENT}
              fillOpacity={0.18}
            />
            <text
              x={nowX}
              y={CHART_TOP - 14}
              textAnchor="middle"
              fontSize={10}
              fontWeight={700}
              fill={ACCENT}
            >
              Adesso
            </text>

            {/* Per ogni ora: emoji, temperatura, ora, pioggia. */}
            {ore.map((o, i) => {
              const x = xOf(i);
              const isNow = i === nowIdx;
              const prob = o.probabilitaPioggia ?? 0;
              const mostraOra = i % 2 === 0 || isNow;
              return (
                <g key={o.ora}>
                  {/* emoji meteo */}
                  <text
                    x={x}
                    y={EMOJI_Y}
                    textAnchor="middle"
                    fontSize={16}
                  >
                    {EMOJI[o.icona] ?? "❔"}
                  </text>

                  {/* temperatura */}
                  <text
                    x={x}
                    y={TEMP_Y}
                    textAnchor="middle"
                    fontSize={12.5}
                    fontWeight={700}
                    fill={isNow ? ACCENT : "currentColor"}
                  >
                    {Math.round(o.temperatura)}°
                  </text>

                  {/* ora (una sì e una no, per non affollare) */}
                  {mostraOra && (
                    <text
                      x={x}
                      y={HOUR_Y}
                      textAnchor="middle"
                      fontSize={11}
                      fill="currentColor"
                      fillOpacity={isNow ? 0.95 : 0.55}
                      fontWeight={isNow ? 700 : 400}
                    >
                      {String(new Date(o.ora).getHours()).padStart(2, "0")}:00
                    </text>
                  )}

                  {/* barra probabilità di pioggia */}
                  <rect
                    x={i * COL_W + 3}
                    y={RAIN_TOP}
                    width={COL_W - 6}
                    height={RAIN_H}
                    rx={4}
                    fill={RAIN_COLOR}
                    fillOpacity={0.1 + (prob / 100) * 0.7}
                  />
                  {prob >= 20 && (
                    <text
                      x={x}
                      y={RAIN_TOP + 14}
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight={600}
                      fill={RAIN_COLOR}
                    >
                      {Math.round(prob)}%
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Mini-legenda. */}
        <div className="mt-1 flex items-center justify-end gap-4 px-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-3 rounded-full"
              style={{ backgroundColor: ACCENT }}
            />
            Temperatura
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-3 rounded-full"
              style={{ backgroundColor: RAIN_COLOR }}
            />
            Pioggia
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default HourlyTemperature;
