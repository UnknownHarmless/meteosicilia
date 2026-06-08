// ============================================================
//  src/components/ui/weather-view.tsx
//  Vista meteo CONDIVISA tra la dashboard (home/geolocalizzata)
//  e la pagina di un comune scelto dalla ricerca.
//
//  Layout ispirato allo screenshot della weather-app (SOLO il
//  layout): in alto la striscia delle città, poi meteo attuale
//  + grafico orario, le previsioni a 7 giorni di fianco, e in
//  basso le card dei "Dettagli meteo".
//
//  Palermo NON è come gli altri: useDatiComune e useSerieMeteo
//  instradano automaticamente Palermo sul Raspberry (dati live)
//  + AI per le ore successive, con fallback Open-Meteo finché
//  l'AI non è pronta. Vale qui per TUTTO: meteo attuale, grafico
//  e dettagli.
// ============================================================

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import WeatherSkeleton from "@/components/ui/loading-skeleton";
import CurrentWeather from "@/components/ui/current-weather";
import HourlyChart from "@/components/ui/hourly-chart";
import WeatherDetails from "@/components/ui/weather-details";
import SevenDayForecast from "@/components/ui/seven-day-forecast";
import FavoriteCities from "@/components/ui/favorite-cities";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useDatiComune } from "@/hooks/useDatiComune";
import { useSerieMeteo } from "@/hooks/useSerieMeteo";
import { usePrevisioniComune } from "@/hooks/usePrevisioniComune";
import type { Comune } from "@/data/comuni";
import { AlertTriangle, RefreshCw, Radio } from "lucide-react";

interface WeatherViewProps {
  comune: Comune | null;
  // Nome da mostrare (di default usa comune.nome).
  locationName?: string;
}

const WeatherView = ({ comune, locationName }: WeatherViewProps) => {
  // ---- Dati: meteo attuale, serie oraria, previsioni 7 giorni ----
  const {
    dati: datiMeteo,
    caricamento: meteoLoading,
    errore: meteoErrore,
    refresh: refreshMeteo,
  } = useDatiComune(comune);

  const { serie, refresh: refreshSerie } = useSerieMeteo(comune);
  const { previsioni, refresh: refreshPrevisioni } = usePrevisioniComune(comune);

  const handleRefresh = () => {
    refreshMeteo();
    refreshSerie();
    refreshPrevisioni();
  };

  const isPalermo = comune?.nome === "Palermo" && comune?.provincia === "PA";

  // ---- Stati di errore / caricamento ----
  if (meteoErrore) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Errore meteo</AlertTitle>
        <AlertDescription className="flex flex-col gap-4">
          <p>{meteoErrore}</p>
          <Button onClick={handleRefresh} variant="outline" className="w-fit">
            <RefreshCw className="mr-2 h-4 w-4" />
            Riprova
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (meteoLoading || !datiMeteo) {
    return <WeatherSkeleton />;
  }

  const nome = locationName ?? comune?.nome ?? datiMeteo.citta;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Striscia città preferite */}
      <FavoriteCities attivo={nome} />

      {/* Intestazione */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {nome}
          </h1>
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {comune?.provincia ?? datiMeteo.provincia}
          </span>
          {isPalermo && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
              <Radio className="h-3 w-3" />
              Raspberry + AI
            </span>
          )}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={meteoLoading}
          className="shrink-0"
        >
          <RefreshCw
            className={`h-4 w-4 ${meteoLoading ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      {/* Meteo attuale + grafico a sinistra, previsioni 7gg a destra */}
      <div className="grid min-w-0 gap-5 sm:gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-5 sm:space-y-6 lg:col-span-2">
          <CurrentWeather data={datiMeteo} locationName={nome} />

          {serie && serie.giorni.length > 0 && (
            <ErrorBoundary
              fallback={
                <div className="rounded-lg border border-foreground/10 bg-card/50 p-4 text-sm text-muted-foreground">
                  Grafico orario non disponibile al momento.
                </div>
              }
            >
              <HourlyChart data={serie} />
            </ErrorBoundary>
          )}
        </div>

        <div className="min-w-0 lg:col-span-1">
          <SevenDayForecast previsioni={previsioni} />
        </div>
      </div>

      {/* Dettagli meteo (card stile Bing) */}
      <WeatherDetails data={datiMeteo} serie={serie} />
    </div>
  );
};

export default WeatherView;
