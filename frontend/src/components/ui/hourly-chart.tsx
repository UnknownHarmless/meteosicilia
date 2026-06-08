// ============================================================
//  src/components/ui/hourly-chart.tsx
//  Grafico interattivo orario — stile Bing Meteo, in SVG puro.
//
//  ⚠️ NIENTE RECHARTS (andava in crash con Vite e imbiancava la
//  pagina). Tutto disegnato a mano: controllo totale + responsività.
//
//  Cosa permette di fare:
//   1) MODALITÀ (tab in alto): 9 metriche selezionabili
//      - le 6 di Bing: Temperatura, Precipitazioni, Vento,
//        Qualità aria, Umidità, Nuvolosità
//      - + 3 dai sensori del Pi: Pressione, Luce, CO
//   2) GIORNI (strip): Ieri (-1), Oggi (0), fino a +6 giorni.
//      Cambiando giorno si vede l'andamento di quel giorno.
//   3) TOOLTIP al passaggio del mouse/dito: ora precisa, valore
//      e icona meteo (sole/nuvole/pioggia…) di quella fascia.
//
//  Linea PIENA = dato misurato/storico, linea TRATTEGGIATA = dato
//  previsto (forecast Open-Meteo o, per Palermo, la nostra AI).
//
//  Scrollabile in orizzontale: perfetto su smartphone e tablet,
//  all'apertura si centra sull'ora corrente.
// ============================================================

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Metrica, PuntoOrario, SerieMeteo } from "@/types/meteo";
import { useEffect, useMemo, useRef, useState } from "react";

// Mappa icona logica → emoji.
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

// ---- Configurazione delle 9 modalità ----
// label = testo del tab; unita = simbolo; colore = accento della
// curva; fmt = come scrivere il valore nel tooltip e in cima.
interface ConfigMetrica {
  metrica: Metrica;
  label: string;
  unita: string;
  colore: string;
  fmt: (v: number) => string;
}

const METRICHE: ConfigMetrica[] = [
  {
    metrica: "temperatura",
    label: "Temperatura",
    unita: "°",
    colore: "rgb(245, 158, 11)",
    fmt: (v) => `${Math.round(v)}°`,
  },
  {
    metrica: "precipitazioni",
    label: "Precipitazioni",
    unita: "%",
    colore: "rgb(56, 132, 255)",
    fmt: (v) => `${Math.round(v)}%`,
  },
  {
    metrica: "vento",
    label: "Vento",
    unita: "km/h",
    colore: "rgb(20, 184, 166)",
    fmt: (v) => `${Math.round(v)}`,
  },
  {
    metrica: "qualita_aria",
    label: "Qualità aria",
    unita: "%",
    colore: "rgb(34, 197, 94)",
    fmt: (v) => `${Math.round(v)}%`,
  },
  {
    metrica: "umidita",
    label: "Umidità",
    unita: "%",
    colore: "rgb(6, 182, 212)",
    fmt: (v) => `${Math.round(v)}%`,
  },
  {
    metrica: "nuvolosita",
    label: "Nuvolosità",
    unita: "%",
    colore: "rgb(148, 163, 184)",
    fmt: (v) => `${Math.round(v)}%`,
  },
  {
    metrica: "pressione",
    label: "Pressione",
    unita: "hPa",
    colore: "rgb(168, 85, 247)",
    fmt: (v) => `${Math.round(v)}`,
  },
  {
    metrica: "luce",
    label: "Luce",
    unita: "%",
    colore: "rgb(234, 179, 8)",
    fmt: (v) => `${Math.round(v)}%`,
  },
  {
    metrica: "co",
    label: "CO",
    unita: "%",
    colore: "rgb(239, 68, 68)",
    fmt: (v) => `${Math.round(v)}%`,
  },
];

// ---- Costanti di layout (coordinate interne all'SVG) ----
const COL_W = 56;
const EMOJI_Y = 24;
const VAL_Y = 46;
const CHART_TOP = 78;
const CHART_BOTTOM = 210;
const HOUR_Y = 234;
const SVG_H = 252;

// Curva morbida (Catmull-Rom → Bézier).
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
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(
      2
    )} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

interface HourlyChartProps {
  data: SerieMeteo;
}

const HourlyChart = ({ data }: HourlyChartProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Stato UI: modalità selezionata, giorno selezionato, ora sotto al mouse.
  const [metrica, setMetrica] = useState<Metrica>("temperatura");
  const [offsetGiorno, setOffsetGiorno] = useState(0); // 0 = oggi
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const giorni = data.giorni ?? [];

  // Giorno attualmente mostrato (fallback al primo disponibile).
  const giorno =
    giorni.find((g) => g.offset === offsetGiorno) ?? giorni[0] ?? null;

  const cfg = METRICHE.find((m) => m.metrica === metrica) ?? METRICHE[0];

  // Tutti i calcoli geometrici in un unico useMemo.
  const model = useMemo(() => {
    const ore: PuntoOrario[] = giorno?.ore ?? [];
    const valori = ore.map((o) => o[metrica]);
    const vMin = valori.length ? Math.min(...valori) : 0;
    const vMax = valori.length ? Math.max(...valori) : 1;
    // Margine sopra/sotto; evita divisione per zero.
    const span = vMax - vMin || 1;
    const lo = vMin - span * 0.15;
    const hi = vMax + span * 0.15 === lo ? lo + 1 : vMax + span * 0.15;

    const xOf = (i: number) => COL_W / 2 + i * COL_W;
    const yOf = (v: number) =>
      CHART_BOTTOM - ((v - lo) / (hi - lo)) * (CHART_BOTTOM - CHART_TOP);

    const points = ore.map((o, i) => ({ x: xOf(i), y: yOf(o[metrica]) }));
    const width = Math.max(ore.length * COL_W, COL_W);

    // x per un orario (alba/tramonto/adesso).
    const xForTime = (iso?: string): number | null => {
      if (!iso) return null;
      const d = new Date(iso);
      if (isNaN(d.getTime())) return null;
      const f = d.getHours() + d.getMinutes() / 60;
      return COL_W / 2 + f * COL_W;
    };

    // Indice dell'ora corrente (solo se il giorno è OGGI).
    let nowIdx = -1;
    if (giorno?.offset === 0) {
      const nowHour = new Date().getHours();
      nowIdx = ore.findIndex((o) => new Date(o.ora).getHours() === nowHour);
    }

    // Confine misurato/previsto: prima ora con previsto=true.
    const firstPrevisto = ore.findIndex((o) => o.previsto);

    return {
      ore,
      points,
      xOf,
      width,
      nowIdx,
      nowX: nowIdx >= 0 ? xOf(nowIdx) : null,
      nowY: nowIdx >= 0 ? points[nowIdx]?.y ?? null : null,
      albaX: xForTime(giorno?.alba),
      tramontoX: xForTime(giorno?.tramonto),
      firstPrevisto,
    };
  }, [giorno, metrica]);

  // All'apertura / cambio giorno: centra lo scroll. Su oggi sull'ora
  // corrente, sugli altri giorni a metà mattina.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target =
      model.nowX != null ? model.nowX : model.xOf(9); // ~le 9:00
    el.scrollLeft = Math.max(0, target - el.clientWidth / 2);
  }, [model.nowX, model.xOf, offsetGiorno]);

  if (!giorni.length || !giorno) return null;

  const { ore, points, xOf, width, nowIdx, nowX, nowY, albaX, tramontoX } =
    model;

  // ---- Path: parte piena (misurata) + parte tratteggiata (prevista) ----
  let linePieno = "";
  let lineTratteggiato = "";
  const fp = model.firstPrevisto;
  if (fp === -1) {
    linePieno = smoothPath(points); // tutto misurato
  } else if (fp === 0) {
    lineTratteggiato = smoothPath(points); // tutto previsto
  } else {
    linePieno = smoothPath(points.slice(0, fp));
    // sovrapponiamo un punto per collegare le due curve.
    lineTratteggiato = smoothPath(points.slice(fp - 1));
  }

  // Area sfumata sotto la curva (sull'intero tracciato).
  const areaPath =
    `${smoothPath(points)} L ${xOf(ore.length - 1)} ${CHART_BOTTOM}` +
    ` L ${xOf(0)} ${CHART_BOTTOM} Z`;

  const gridLines = [0, 1, 2, 3].map(
    (k) => CHART_TOP + (k * (CHART_BOTTOM - CHART_TOP)) / 3
  );

  const oraFormat = (iso: string) =>
    new Date(iso).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const gradId = `grad-${metrica}`;

  // ---- Tooltip: box vicino al punto sotto al mouse ----
  const hover = hoverIdx != null ? ore[hoverIdx] : null;
  const hoverX = hoverIdx != null ? xOf(hoverIdx) : 0;
  const hoverY = hoverIdx != null ? points[hoverIdx]?.y ?? 0 : 0;
  const TT_W = 96;
  const TT_H = 44;
  const ttX = Math.max(4, Math.min(width - TT_W - 4, hoverX - TT_W / 2));
  const ttY = Math.max(2, hoverY - TT_H - 12);

  return (
    <Card className="mt-4 overflow-hidden border border-foreground/10 bg-card/50 backdrop-blur-md shadow-lg transition-all duration-300 hover:shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Andamento orario
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          {data.citta}
          {data.fonte === "raspberry" ? " · Raspberry + AI" : " · Open-Meteo"}
        </span>
      </CardHeader>

      <CardContent className="px-0 pb-3 pt-0">
        {/* ---- TAB MODALITÀ (scroll orizzontale) ---- */}
        <div
          className="mb-2 flex gap-1.5 overflow-x-auto px-4 pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {METRICHE.map((m) => {
            const attiva = m.metrica === metrica;
            return (
              <button
                key={m.metrica}
                onClick={() => setMetrica(m.metrica)}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  attiva
                    ? "text-white"
                    : "bg-foreground/5 text-muted-foreground hover:bg-foreground/10"
                }`}
                style={attiva ? { backgroundColor: m.colore } : undefined}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {/* ---- STRIP GIORNI (Ieri → +6) ---- */}
        <div
          className="mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {giorni.map((g) => {
            const attivo = g.offset === offsetGiorno;
            return (
              <button
                key={g.data}
                onClick={() => {
                  setOffsetGiorno(g.offset);
                  setHoverIdx(null);
                }}
                className={`whitespace-nowrap rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  attivo
                    ? "bg-foreground/10 text-foreground ring-1 ring-foreground/20"
                    : "text-muted-foreground hover:bg-foreground/5"
                }`}
              >
                {g.etichetta}
              </button>
            );
          })}
        </div>

        {/* ---- GRAFICO (scroll orizzontale) ---- */}
        <div
          ref={scrollRef}
          className="w-full min-w-0 overflow-x-auto overflow-y-hidden text-foreground"
          style={{ scrollbarWidth: "thin", WebkitOverflowScrolling: "touch" }}
        >
          <svg
            width={width}
            height={SVG_H}
            viewBox={`0 0 ${width} ${SVG_H}`}
            role="img"
            aria-label={`Grafico orario: ${cfg.label}`}
            className="block"
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={cfg.colore} stopOpacity={0.45} />
                <stop offset="100%" stopColor={cfg.colore} stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Griglia orizzontale. */}
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

            {/* Evidenziazione colonna "Adesso". */}
            {nowIdx >= 0 && (
              <rect
                x={nowIdx * COL_W}
                y={CHART_TOP - 34}
                width={COL_W}
                height={CHART_BOTTOM - CHART_TOP + 64}
                fill="currentColor"
                fillOpacity={0.05}
                rx={8}
              />
            )}

            {/* Area sfumata. */}
            <path d={areaPath} fill={`url(#${gradId})`} />

            {/* Linea misurata (piena) + prevista (tratteggiata). */}
            {linePieno && (
              <path
                d={linePieno}
                fill="none"
                stroke={cfg.colore}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            )}
            {lineTratteggiato && (
              <path
                d={lineTratteggiato}
                fill="none"
                stroke={cfg.colore}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray="2 5"
                strokeOpacity={0.85}
              />
            )}

            {/* Marker alba/tramonto. */}
            {albaX != null && (
              <g>
                <line
                  x1={albaX}
                  x2={albaX}
                  y1={CHART_TOP}
                  y2={CHART_BOTTOM}
                  stroke={cfg.colore}
                  strokeOpacity={0.3}
                  strokeDasharray="2 4"
                />
                <text
                  x={albaX}
                  y={CHART_BOTTOM - 8}
                  textAnchor="middle"
                  fontSize={11}
                  fill="currentColor"
                  fillOpacity={0.7}
                >
                  🌅 {giorno.alba ? oraFormat(giorno.alba) : ""}
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
                  stroke={cfg.colore}
                  strokeOpacity={0.3}
                  strokeDasharray="2 4"
                />
                <text
                  x={tramontoX}
                  y={CHART_BOTTOM - 8}
                  textAnchor="middle"
                  fontSize={11}
                  fill="currentColor"
                  fillOpacity={0.7}
                >
                  🌇 {giorno.tramonto ? oraFormat(giorno.tramonto) : ""}
                </text>
              </g>
            )}

            {/* Linea + pallino "Adesso". */}
            {nowX != null && nowY != null && (
              <g>
                <line
                  x1={nowX}
                  x2={nowX}
                  y1={CHART_TOP - 6}
                  y2={CHART_BOTTOM}
                  stroke={cfg.colore}
                  strokeOpacity={0.7}
                  strokeDasharray="4 4"
                />
                <circle cx={nowX} cy={nowY} r={4.5} fill={cfg.colore} />
                <circle
                  cx={nowX}
                  cy={nowY}
                  r={9}
                  fill={cfg.colore}
                  fillOpacity={0.18}
                />
                <text
                  x={nowX}
                  y={CHART_TOP - 16}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={700}
                  fill={cfg.colore}
                >
                  Adesso
                </text>
              </g>
            )}

            {/* Per ogni ora: emoji + valore in cima, ora in basso. */}
            {ore.map((o, i) => {
              const x = xOf(i);
              const isNow = i === nowIdx;
              const isHover = i === hoverIdx;
              const mostraOra = i % 2 === 0 || isNow;
              return (
                <g key={o.ora}>
                  <text x={x} y={EMOJI_Y} textAnchor="middle" fontSize={16}>
                    {EMOJI[o.icona] ?? "❔"}
                  </text>
                  <text
                    x={x}
                    y={VAL_Y}
                    textAnchor="middle"
                    fontSize={12.5}
                    fontWeight={700}
                    fill={isNow || isHover ? cfg.colore : "currentColor"}
                  >
                    {cfg.fmt(o[metrica])}
                  </text>
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
                </g>
              );
            })}

            {/* Punto e tooltip sotto al mouse/dito. */}
            {hover && (
              <g pointerEvents="none">
                <line
                  x1={hoverX}
                  x2={hoverX}
                  y1={CHART_TOP - 6}
                  y2={CHART_BOTTOM}
                  stroke="currentColor"
                  strokeOpacity={0.25}
                />
                <circle cx={hoverX} cy={hoverY} r={4} fill={cfg.colore} />
                <g>
                  <rect
                    x={ttX}
                    y={ttY}
                    width={TT_W}
                    height={TT_H}
                    rx={8}
                    fill="currentColor"
                    fillOpacity={0.92}
                  />
                  <text
                    x={ttX + TT_W / 2}
                    y={ttY + 17}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={600}
                    className="fill-background"
                  >
                    {String(new Date(hover.ora).getHours()).padStart(2, "0")}:00
                    {hover.previsto ? " (prev.)" : ""}
                  </text>
                  <text
                    x={ttX + TT_W / 2}
                    y={ttY + 34}
                    textAnchor="middle"
                    fontSize={13}
                    fontWeight={700}
                    className="fill-background"
                  >
                    {EMOJI[hover.icona] ?? ""} {cfg.fmt(hover[metrica])}
                    {cfg.unita === "km/h" || cfg.unita === "hPa"
                      ? ` ${cfg.unita}`
                      : ""}
                  </text>
                </g>
              </g>
            )}

            {/* Strato trasparente per il rilevamento hover, una zona per ora. */}
            {ore.map((o, i) => (
              <rect
                key={`hit-${o.ora}`}
                x={i * COL_W}
                y={0}
                width={COL_W}
                height={SVG_H}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx((h) => (h === i ? null : h))}
              />
            ))}
          </svg>
        </div>

        {/* Legenda misurato/previsto. */}
        <div className="mt-1 flex items-center justify-end gap-4 px-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-[2px] w-4"
              style={{ backgroundColor: cfg.colore }}
            />
            Misurato
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-[2px] w-4"
              style={{
                backgroundImage: `repeating-linear-gradient(90deg, ${cfg.colore} 0 3px, transparent 3px 7px)`,
              }}
            />
            Previsto
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default HourlyChart;
