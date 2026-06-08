// ============================================================
//  src/pages/weather-dashboard.tsx
//  Dashboard principale (home).
//  Flusso:
//    1) Geolocalizza l'utente.
//    2) Trova il comune siciliano più vicino (reverse geocode locale).
//    3) Delega TUTTO il rendering meteo a <WeatherView>, che si
//       occupa di meteo attuale, grafico orario, previsioni 7gg e
//       dettagli — gestendo da solo Palermo (Raspberry + AI) vs
//       gli altri comuni (Open-Meteo).
// ============================================================

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import WeatherSkeleton from "@/components/ui/loading-skeleton";
import WeatherView from "@/components/ui/weather-view";
import { useGeolocation } from "@/hooks/use-geolocation";
import { trovaComunePiuVicino } from "@/utils/comune-piu-vicino";
import { AlertTriangle, MapPin } from "lucide-react";
import { useMemo } from "react";

const WeatherDashboard = () => {
  // ---- 1) Geolocalizzazione ----
  const {
    coordinates,
    error: locationError,
    getLocation,
    isLoading: locationLoading,
  } = useGeolocation();

  // 🔧 OVERRIDE DEV: metti a true per ignorare la geolocalizzazione
  // e forzare un comune di test (utile mentre il Raspberry non è
  // pronto). Quando il Pi è online, metti DEV_OVERRIDE a false.
  const DEV_OVERRIDE = true;
  const COMUNE_DEV = {
    nome: "Catania",
    provincia: "CT",
    lat: 37.5079,
    lon: 15.083,
  };

  // ---- 2) Comune più vicino ----
  // L'hook useMemo va SEMPRE chiamato (mai dentro un if/ternario).
  const comuneCalcolato = useMemo(() => {
    if (!coordinates) return null;
    return trovaComunePiuVicino(coordinates.latitude, coordinates.longitude);
  }, [coordinates]);

  const comuneCorrente = DEV_OVERRIDE ? COMUNE_DEV : comuneCalcolato;

  // ============================================================
  //  STATI DI POSIZIONE (saltati in DEV_OVERRIDE)
  // ============================================================
  if (!DEV_OVERRIDE && locationLoading) {
    return <WeatherSkeleton />;
  }

  if (!DEV_OVERRIDE && locationError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Errore di posizione</AlertTitle>
        <AlertDescription className="flex flex-col gap-4">
          <p>{locationError}</p>
          <Button onClick={getLocation} variant="outline" className="w-fit">
            <MapPin className="mr-2 h-4 w-4" />
            Abilita posizione
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!DEV_OVERRIDE && !coordinates) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Posizione richiesta</AlertTitle>
        <AlertDescription className="flex flex-col gap-4">
          <p>Abilita l'accesso alla posizione per vedere il meteo locale.</p>
          <Button onClick={getLocation} variant="outline" className="w-fit">
            <MapPin className="mr-2 h-4 w-4" />
            Abilita posizione
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // ============================================================
  //  RENDER: tutto il meteo è dentro WeatherView.
  // ============================================================
  return <WeatherView comune={comuneCorrente} />;
};

export default WeatherDashboard;
