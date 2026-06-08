// ============================================================
//  src/components/ui/seven-day-forecast.tsx
//  Previsioni a 7 giorni (sempre da Open-Meteo, anche per
//  Palermo: le previsioni multi-giorno non vengono dal Pi).
//
//  Layout a lista verticale come nello screenshot della
//  weather-app: una riga per giorno con icona, descrizione,
//  range min→max e dettagli pioggia/vento.
// ============================================================

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PrevisioniMeteo } from "@/types/meteo";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Sun,
  Wind,
  type LucideIcon,
} from "lucide-react";

// Mappa la chiave-icona (da codici-meteo.ts) a un'icona lucide.
function iconaLucide(chiave: string): LucideIcon {
  switch (chiave) {
    case "sun":
      return Sun;
    case "sun-cloud":
    case "cloud-sun":
      return CloudSun;
    case "cloud":
      return Cloud;
    case "fog":
      return CloudFog;
    case "drizzle":
    case "drizzle-snow":
      return CloudDrizzle;
    case "rain":
    case "rain-heavy":
    case "showers":
    case "showers-heavy":
    case "rain-snow":
      return CloudRain;
    case "snow":
    case "snow-heavy":
    case "snow-showers":
      return CloudSnow;
    case "thunderstorm":
      return CloudLightning;
    case "thunderstorm-hail":
      return CloudHail;
    default:
      return CloudSun;
  }
}

// Etichetta del giorno: "Oggi", "Domani" oppure il giorno della
// settimana (es. "Sabato").
function etichetta(dataISO: string): string {
  const d = new Date(`${dataISO}T12:00:00`);
  const oggi = new Date();
  oggi.setHours(12, 0, 0, 0);
  const diff = Math.round(
    (d.getTime() - oggi.getTime()) / (24 * 60 * 60 * 1000)
  );
  if (diff === 0) return "Oggi";
  if (diff === 1) return "Domani";
  const s = d.toLocaleDateString("it-IT", { weekday: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface SevenDayForecastProps {
  previsioni: PrevisioniMeteo | null;
}

const SevenDayForecast = ({ previsioni }: SevenDayForecastProps) => {
  if (!previsioni || previsioni.giorni.length === 0) {
    return (
      <Card className="border border-foreground/10 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base">Previsioni 7 giorni</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Previsioni non disponibili al momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Range globale min/max per dimensionare le barre.
  const tuttiMin = Math.min(...previsioni.giorni.map((g) => g.tempMin));
  const tuttiMax = Math.max(...previsioni.giorni.map((g) => g.tempMax));
  const span = Math.max(1, tuttiMax - tuttiMin);

  return (
    <Card className="border border-foreground/10 bg-card/50 backdrop-blur-md shadow-lg">
      <CardHeader>
        <CardTitle className="text-base">Previsioni 7 giorni</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {previsioni.giorni.map((g) => {
          const Icona = iconaLucide(g.icona);
          // Posizione/larghezza della barra del range temperatura.
          const left = ((g.tempMin - tuttiMin) / span) * 100;
          const width = ((g.tempMax - g.tempMin) / span) * 100;
          return (
            <div
              key={g.data}
              className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-foreground/[0.03]"
            >
              {/* Giorno */}
              <span className="w-16 shrink-0 text-sm font-medium text-foreground sm:w-20">
                {etichetta(g.data)}
              </span>

              {/* Icona + descrizione */}
              <div className="flex w-7 shrink-0 items-center gap-2 sm:w-36">
                <Icona className="h-5 w-5 text-primary" />
                <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                  {g.descrizione}
                </span>
              </div>

              {/* Pioggia + vento */}
              <div className="hidden w-28 shrink-0 items-center gap-3 text-xs text-muted-foreground md:flex">
                <span className="flex items-center gap-1">
                  <Droplets className="h-3.5 w-3.5 text-blue-500" />
                  {Math.round(g.precipitazione)}mm
                </span>
                <span className="flex items-center gap-1">
                  <Wind className="h-3.5 w-3.5 text-sky-500" />
                  {Math.round(g.ventoMax)}
                </span>
              </div>

              {/* Range temperatura */}
              <div className="flex flex-1 items-center gap-2">
                <span className="w-8 text-right text-sm text-muted-foreground">
                  {Math.round(g.tempMin)}°
                </span>
                <div className="relative h-1.5 flex-1 rounded-full bg-foreground/10">
                  <div
                    className="absolute h-1.5 rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-rose-500"
                    style={{ left: `${left}%`, width: `${Math.max(8, width)}%` }}
                  />
                </div>
                <span className="w-8 text-sm font-semibold text-foreground">
                  {Math.round(g.tempMax)}°
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default SevenDayForecast;
