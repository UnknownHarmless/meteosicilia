import { Card, CardContent } from "@/components/ui/card";
import type { DatiSensore } from "@/types/meteo";
import { Droplets, Wind, Gauge, Sun, Sparkles, ShieldAlert } from "lucide-react";

interface CurrentWeatherProps {
    data: DatiSensore;
    locationName?: string;
}

const CurrentWeather = ({ data, locationName }: CurrentWeatherProps) => {
    const {
        temperatura,
        umidita,
        pressione,
        vento,
        luce,
        monossido_carb,
        qualita_aria,
        citta,
        provincia
    } = data;

    const formatTemp = (temp: number) => `${Math.round(temp)}°`;

    // ----------------------------------------------------------
    // Qualità dell'aria: nel nostro modello dati 0% = aria
    // ottima, 100% = aria pessima (sia da MQ-135 del Pi sia
    // da AQI europeo di Open-Meteo). Quindi le soglie sono
    // sui valori BASSI.
    // ----------------------------------------------------------
    const getAqiStatus = (aqi: number) => {
        if (aqi <= 20) return { label: "Ottima", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" };
        if (aqi <= 40) return { label: "Buona", color: "text-green-500 bg-green-500/10 border-green-500/20" };
        if (aqi <= 60) return { label: "Moderata", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" };
        return { label: "Scadente", color: "text-red-500 bg-red-500/10 border-red-500/20" };
    };

    const aqiStatus = getAqiStatus(qualita_aria);

    return (
        <Card className="overflow-hidden border border-foreground/10 bg-card/50 backdrop-blur-md shadow-lg transition-all duration-300 hover:shadow-xl">
            <CardContent className="p-5 sm:p-6 md:p-8">
                <div className="grid min-w-0 gap-6 sm:gap-8 md:grid-cols-2">
                    {/* Left Side: Main Temperature & Location info */}
                    <div className="flex min-w-0 flex-col items-center gap-5 text-center md:items-start md:justify-between md:gap-6 md:text-left">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                                <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                                    {locationName || citta}
                                </h2>
                                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {provincia}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Rilevamento in tempo reale · Fonte: <span className="font-semibold capitalize">{data.fonte}</span>
                            </p>
                        </div>

                        <div className="flex items-center gap-4 sm:gap-6">
                            <div className="relative flex items-center justify-center rounded-2xl bg-primary/5 p-3 text-primary sm:p-4">
                                <Sun className="h-14 w-14 animate-pulse sm:h-16 sm:w-16" />
                            </div>
                            <div className="space-y-1 text-left">
                                <p className="text-6xl font-black tracking-tighter text-foreground">
                                    {formatTemp(temperatura)}
                                </p>
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${aqiStatus.color}`}>
                                    Aria: {aqiStatus.label}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Grid of detailed sensor metrics (nascosta su mobile: i dati sono nei "Dettagli meteo" sotto, evitiamo il doppione) */}
                    <div className="hidden grid-cols-2 gap-4 sm:gap-6 md:grid">
                        {/* Humidity */}
                        <div className="flex items-center gap-3 rounded-xl border border-foreground/5 bg-foreground/[0.02] p-3 transition-all hover:bg-foreground/[0.04] sm:gap-4 sm:p-4">
                            <div className="rounded-lg bg-blue-500/10 p-2.5 text-blue-500">
                                <Droplets className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Umidità</p>
                                <p className="text-lg font-bold text-foreground">{Math.round(umidita)}%</p>
                            </div>
                        </div>

                        {/* Wind */}
                        <div className="flex items-center gap-3 rounded-xl border border-foreground/5 bg-foreground/[0.02] p-3 transition-all hover:bg-foreground/[0.04] sm:gap-4 sm:p-4">
                            <div className="rounded-lg bg-sky-500/10 p-2.5 text-sky-500">
                                <Wind className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Vento</p>
                                <p className="text-lg font-bold text-foreground">{vento.toFixed(1)} km/h</p>
                            </div>
                        </div>

                        {/* Pressure */}
                        <div className="flex items-center gap-3 rounded-xl border border-foreground/5 bg-foreground/[0.02] p-3 transition-all hover:bg-foreground/[0.04] sm:gap-4 sm:p-4">
                            <div className="rounded-lg bg-indigo-500/10 p-2.5 text-indigo-500">
                                <Gauge className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Pressione</p>
                                <p className="text-lg font-bold text-foreground">{Math.round(pressione)} hPa</p>
                            </div>
                        </div>

                        {/* Light */}
                        <div className="flex items-center gap-3 rounded-xl border border-foreground/5 bg-foreground/[0.02] p-3 transition-all hover:bg-foreground/[0.04] sm:gap-4 sm:p-4">
                            <div className="rounded-lg bg-amber-500/10 p-2.5 text-amber-500">
                                <Sun className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Luce</p>
                                <p className="text-lg font-bold text-foreground">{luce.toFixed(2)}%</p>
                            </div>
                        </div>

                        {/* Air Quality (AQI) */}
                        <div className="flex items-center gap-3 rounded-xl border border-foreground/5 bg-foreground/[0.02] p-3 transition-all hover:bg-foreground/[0.04] sm:gap-4 sm:p-4">
                            <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-500">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Qualità Aria</p>
                                <p className="text-lg font-bold text-foreground">{qualita_aria.toFixed(2)}%</p>
                            </div>
                        </div>

                        {/* Carbon Monoxide */}
                        <div className="flex items-center gap-3 rounded-xl border border-foreground/5 bg-foreground/[0.02] p-3 transition-all hover:bg-foreground/[0.04] sm:gap-4 sm:p-4">
                            <div className="rounded-lg bg-rose-500/10 p-2.5 text-rose-500">
                                <ShieldAlert className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Monossido CO</p>
                                <p className="text-lg font-bold text-foreground">{monossido_carb.toFixed(2)}%</p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default CurrentWeather;