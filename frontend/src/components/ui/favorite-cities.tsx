// ============================================================
//  src/components/ui/favorite-cities.tsx
//  Striscia orizzontale di città "preferite" (come nello
//  screenshot della weather-app: una riga di tessere in alto).
//
//  - Palermo è SEMPRE la prima, con badge "Raspberry + AI":
//    la sua temperatura arriva dal nostro Pi (via useDatiComune,
//    che per Palermo passa dal Raspberry via SSE), NON da
//    Open-Meteo.
//  - Le altre città principali siciliane prendono la temperatura
//    da Open-Meteo (useDatiEsterni, in batch).
//  - Click su una tessera → naviga alla pagina del comune.
// ============================================================

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Radio } from "lucide-react";
import { PALERMO, type Comune } from "@/data/comuni";
import { useDatiEsterni } from "@/hooks/useDatiEsterni";
import { useDatiComune } from "@/hooks/useDatiComune";

// Capoluoghi (Palermo esclusa: ha il suo canale dedicato).
const ALTRE_CITTA: Comune[] = [
  { nome: "Catania", provincia: "CT", lat: 37.5079, lon: 15.083 },
  { nome: "Messina", provincia: "ME", lat: 38.1938, lon: 15.554 },
  { nome: "Siracusa", provincia: "SR", lat: 37.0755, lon: 15.2866 },
  { nome: "Ragusa", provincia: "RG", lat: 36.9269, lon: 14.7255 },
  { nome: "Trapani", provincia: "TP", lat: 38.0176, lon: 12.5365 },
  { nome: "Agrigento", provincia: "AG", lat: 37.3111, lon: 13.5765 },
  { nome: "Caltanissetta", provincia: "CL", lat: 37.4901, lon: 14.0625 },
  { nome: "Enna", provincia: "EN", lat: 37.5664, lon: 14.2796 },
];

interface FavoriteCitiesProps {
  // Nome del comune attualmente visualizzato (per evidenziarlo).
  attivo?: string;
}

const FavoriteCities = ({ attivo }: FavoriteCitiesProps) => {
  const navigate = useNavigate();

  // Temperature delle altre città da Open-Meteo.
  const lista = useMemo(() => ALTRE_CITTA, []);
  const { dati } = useDatiEsterni(lista);

  // Palermo dal Raspberry (Pi via SSE).
  const { dati: datiPalermo } = useDatiComune(PALERMO);

  const vai = (c: Comune) =>
    navigate(
      `/city/${encodeURIComponent(c.nome)}?prov=${c.provincia}&lat=${c.lat}&lon=${c.lon}`
    );

  const Tessera = ({
    comune,
    temp,
    palermo = false,
  }: {
    comune: Comune;
    temp: number | null;
    palermo?: boolean;
  }) => {
    const evidenziato = attivo === comune.nome;
    return (
      <button
        type="button"
        onClick={() => vai(comune)}
        className={
          "group flex min-w-[104px] shrink-0 flex-col gap-1 rounded-2xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md sm:min-w-[120px] " +
          (evidenziato
            ? "border-primary/40 bg-primary/10"
            : "border-foreground/10 bg-card/50 hover:bg-card/80")
        }
      >
        <div className="flex items-center gap-1.5">
          {palermo && <Radio className="h-3.5 w-3.5 text-emerald-500" />}
          <span className="text-sm font-semibold text-foreground">
            {comune.nome}
          </span>
        </div>
        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold tracking-tight text-foreground">
            {temp == null ? "–" : `${Math.round(temp)}°`}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {comune.provincia}
          </span>
        </div>
        {palermo && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-center text-[9px] font-semibold text-emerald-500">
            Raspberry + AI
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
      <Tessera
        comune={PALERMO}
        temp={datiPalermo?.temperatura ?? null}
        palermo
      />
      {lista.map((c) => (
        <Tessera
          key={`${c.nome}-${c.provincia}`}
          comune={c}
          temp={dati[c.nome]?.temperatura ?? null}
        />
      ))}
    </div>
  );
};

export default FavoriteCities;
