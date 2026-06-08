// ============================================================
//  src/hooks/usePrevisioniOrarie.ts
//  Carica le previsioni orarie della giornata corrente per
//  qualunque comune (Palermo inclusa, sempre da Open-Meteo).
//  Refresh ogni 30 minuti.
// ============================================================

import { useEffect, useState } from "react";
import type { Comune } from "../data/comuni";
import type { PrevisioniOrarie } from "../types/meteo";
import { fetchPrevisioniOrarie } from "../api/openMeteo";

interface Risultato {
    previsioniOrarie: PrevisioniOrarie | null;
    caricamento: boolean;
    errore: string | null;
    refresh: () => void;
}

const REFRESH_MS = 30 * 60 * 1000;

export function usePrevisioniOrarie(comune: Comune | null): Risultato {
    const [previsioniOrarie, setPrevisioniOrarie] = useState<PrevisioniOrarie | null>(null);
    const [caricamento, setCaricamento] = useState(false);
    const [errore, setErrore] = useState<string | null>(null);
    const [trigger, setTrigger] = useState(0);

    useEffect(() => {
        if (!comune) {
            setPrevisioniOrarie(null);
            setCaricamento(false);
            setErrore(null);
            return;
        }

        let attivo = true;
        setCaricamento(true);
        setErrore(null);

        const carica = () => {
            fetchPrevisioniOrarie(comune)
                .then((p) => {
                    if (!attivo) return;
                    setPrevisioniOrarie(p);
                    setCaricamento(false);
                })
                .catch((e) => {
                    if (!attivo) return;
                    setErrore(e?.message ?? "Errore nel recupero delle previsioni orarie");
                    setCaricamento(false);
                });
        };

        carica();
        const id = setInterval(carica, REFRESH_MS);

        return () => {
            attivo = false;
            clearInterval(id);
        };
    }, [comune?.nome, comune?.provincia, comune?.lat, comune?.lon, trigger]);

    return {
        previsioniOrarie,
        caricamento,
        errore,
        refresh: () => setTrigger((t) => t + 1),
    };
}