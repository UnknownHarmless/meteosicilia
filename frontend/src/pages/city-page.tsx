// ============================================================
//  src/pages/city-page.tsx
//  Pagina di un comune scelto dalla ricerca.
//  L'URL è /city/:cityName?prov=..&lat=..&lon=.. (lo costruisce
//  city-search). Da qui ricostruiamo l'oggetto Comune e deleghiamo
//  tutto a <WeatherView>, esattamente come la dashboard.
//
//  Palermo viene gestita automaticamente da WeatherView/useDatiComune
//  (Raspberry + AI), quindi anche cercandola dalla barra di ricerca
//  funziona col nostro Pi e non come gli altri comuni.
// ============================================================

import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import WeatherView from "@/components/ui/weather-view";
import type { Comune } from "@/data/comuni";
import { AlertTriangle } from "lucide-react";

const CityPage = () => {
  const { cityName } = useParams();
  const [searchParams] = useSearchParams();

  const provincia = searchParams.get("prov") ?? "";
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lon = parseFloat(searchParams.get("lon") ?? "");

  // Ricostruiamo il Comune dai parametri dell'URL.
  const comune = useMemo<Comune | null>(() => {
    if (!cityName || Number.isNaN(lat) || Number.isNaN(lon)) return null;
    return {
      nome: decodeURIComponent(cityName),
      provincia,
      lat,
      lon,
    };
  }, [cityName, provincia, lat, lon]);

  // Parametri mancanti o malformati.
  if (!comune) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Comune non valido</AlertTitle>
        <AlertDescription>
          Mancano le coordinate del comune. Torna alla home e seleziona di
          nuovo il comune dalla ricerca.
        </AlertDescription>
      </Alert>
    );
  }

  return <WeatherView comune={comune} />;
};

export default CityPage;
