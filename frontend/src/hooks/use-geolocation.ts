// ============================================================
//  src/hooks/use-geolocation.tsx
//  Hook che chiede al browser la posizione dell'utente.
//  Espone:
//   - coordinates: { latitude, longitude } | null
//   - error: messaggio di errore | null
//   - isLoading: true mentre il browser sta cercando la posizione
//   - getLocation(): funzione per ri-tentare manualmente
// ============================================================

import { useEffect, useState } from "react";

// Tipo locale per le coordinate. Non usiamo "Coordinates" globale
// perché è ambiguo e in alcuni linter dà warning.
interface Coords {
  latitude: number;
  longitude: number;
}

interface GeolocationData {
  coordinates: Coords | null;
  error: string | null;
  isLoading: boolean;
}

export function useGeolocation() {
  const [locationData, setLocationData] = useState<GeolocationData>({
    coordinates: null,
    error: null,
    isLoading: false,
  });

  const getLocation = () => {
    // Mettiamo isLoading=true e azzeriamo eventuale errore precedente.
    setLocationData((prev) => ({ ...prev, isLoading: true, error: null }));

    // Caso 1: il browser non supporta la geolocalizzazione (raro,
    // ma su browser molto vecchi può succedere).
    if (!navigator.geolocation) {
      setLocationData({
        coordinates: null,
        error: "La geolocalizzazione non è supportata da questo browser.",
        isLoading: false,
      });
      return;
    }

    // Caso 2: chiediamo la posizione. Due callback: success ed error.
    navigator.geolocation.getCurrentPosition(
      // -------- SUCCESS --------
      (position) => {
        setLocationData({
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          error: null,
          isLoading: false,
        });
      },

      // -------- ERROR --------
      (error) => {
        let errorMessage: string;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "L'utente ha negato il permesso di geolocalizzazione.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Informazioni sulla posizione non disponibili.";
            break;
          case error.TIMEOUT:
            errorMessage = "Richiesta di posizione scaduta.";
            break;
          default:
            errorMessage = "Si è verificato un errore sconosciuto.";
            break;
        }
        setLocationData({
          coordinates: null,
          error: errorMessage,
          isLoading: false,
        });
      },

      // -------- OPZIONI --------
      {
        enableHighAccuracy: true, // GPS se disponibile (più preciso, più lento)
        timeout: 10000,           // 10 secondi prima di rinunciare
        maximumAge: 0,            // non accettare cache, vogliamo posizione fresca
      }
    );
  };

  // Al mount del componente, proviamo subito a recuperare la posizione.
  useEffect(() => {
    getLocation();
  }, []);

  return {
    ...locationData,
    getLocation, // esposta per ri-tentare manualmente (es. tasto "riprova")
  };
}
