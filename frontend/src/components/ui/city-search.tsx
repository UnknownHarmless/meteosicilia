// ============================================================
//  src/components/ui/city-search.tsx
//  Barra di ricerca dei comuni siciliani.
//
//  ⚠️ Riscritta da zero: il codice del tutorial cercava su una
//  API di geocoding esterna e usava TanStack Query. Noi invece
//  abbiamo GIÀ la lista dei comuni siciliani in locale
//  (data/comuni.ts → COMUNI), quindi la ricerca è istantanea e
//  offline. Palermo è evidenziata perché i suoi dati arrivano
//  dal nostro Raspberry, non da Open-Meteo.
//
//  Al click su un comune si naviga a /city/:nome con provincia e
//  coordinate in query string.
// ============================================================

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, MapPin, Radio, Search, X } from "lucide-react";
import { Button } from "./button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { COMUNI, PALERMO, type Comune } from "@/data/comuni";
import { useSearchHistory } from "@/hooks/use-search-history";

const MAX_RISULTATI = 8;

function isPalermo(c: Comune) {
  return c.nome === "Palermo" && c.provincia === "PA";
}

const CitySearch = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { cronologia, aggiungi, pulisci } = useSearchHistory();

  // Filtra i comuni in base al testo digitato (offline, istantaneo).
  const risultati = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return COMUNI.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        c.provincia.toLowerCase().includes(q)
    ).slice(0, MAX_RISULTATI);
  }, [query]);

  // Palermo compare in cima se combacia (o sempre quando non si è digitato).
  const palermoMatch =
    query.trim().length < 2 ||
    "palermo".includes(query.trim().toLowerCase());

  const vaiAlComune = (c: Comune) => {
    aggiungi({ nome: c.nome, provincia: c.provincia, lat: c.lat, lon: c.lon });
    setOpen(false);
    setQuery("");
    navigate(
      `/city/${encodeURIComponent(c.nome)}?prov=${c.provincia}&lat=${c.lat}&lon=${c.lon}`
    );
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative w-40 justify-start gap-2 text-sm text-muted-foreground sm:pr-12 md:w-48 lg:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        Cerca un comune...
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Cerca un comune siciliano..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {query.trim().length >= 2 && risultati.length === 0 && !palermoMatch && (
              <CommandEmpty>Nessun comune trovato.</CommandEmpty>
            )}

            {/* Palermo: canale Raspberry, sempre in evidenza. */}
            {palermoMatch && (
              <CommandGroup heading="Stazione locale">
                <CommandItem
                  value="palermo-pi"
                  onSelect={() => vaiAlComune(PALERMO)}
                  className="flex items-center gap-2"
                >
                  <Radio className="h-4 w-4 text-emerald-500" />
                  <span className="font-medium">Palermo</span>
                  <span className="text-xs text-muted-foreground">PA</span>
                  <span className="ml-auto rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                    Raspberry + AI
                  </span>
                </CommandItem>
              </CommandGroup>
            )}

            {/* Cronologia recenti. */}
            {cronologia.length > 0 && query.trim().length < 2 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-xs text-muted-foreground">
                      Ricerche recenti
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        pulisci();
                      }}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Pulisci
                    </Button>
                  </div>
                  {cronologia.map((v) => (
                    <CommandItem
                      key={`${v.nome}-${v.provincia}`}
                      value={`recent-${v.nome}-${v.provincia}`}
                      onSelect={() =>
                        vaiAlComune({
                          nome: v.nome,
                          provincia: v.provincia,
                          lat: v.lat,
                          lon: v.lon,
                        })
                      }
                      className="flex items-center gap-2"
                    >
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{v.nome}</span>
                      <span className="text-xs text-muted-foreground">
                        {v.provincia}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Risultati della ricerca. */}
            {risultati.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Comuni">
                  {risultati.filter((c) => !isPalermo(c)).map((c) => (
                    <CommandItem
                      key={`${c.nome}-${c.provincia}`}
                      value={`${c.nome}-${c.provincia}`}
                      onSelect={() => vaiAlComune(c)}
                      className="flex items-center gap-2"
                    >
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{c.nome}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {c.provincia}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
};

export default CitySearch;
