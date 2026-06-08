// ============================================================
//  src/components/ui/logo.tsx
//  Logo "Meteo Sicilia" come componenti SVG inline.
//
//  Perché inline (e non <img src="logo.svg">): la parola
//  "Meteo" del marchio usa fill="currentColor". Inserendo l'SVG
//  direttamente nel JSX, currentColor eredita il colore del
//  testo del sito (text-foreground), quindi il logo si adatta
//  da solo al tema chiaro e a quello scuro. Con un <img> questo
//  non accadrebbe (currentColor resterebbe nero).
//
//  - LogoMark: solo l'icona (sole che tramonta dietro la
//    Sicilia). Usata su schermi piccoli.
//  - LogoFull: icona + scritta "Meteo Sicilia". Usata da tablet
//    in su.
//
//  La sagoma dell'isola è ricostruita da 19 punti costieri reali
//  (Capo Peloro a NE, Marsala a O, Capo Passero a S: la Trinacria).
// ============================================================

const ISOLA =
  "M 200,0 C 203.2,0.4 197.5,0.8 193.8,6.3 C 190.1,11.8 182.4,23.9 177.6,32.9 " +
  "C 172.8,41.9 165.9,52.2 165.2,60.3 C 164.5,68.4 171.2,75.9 173.3,81.5 " +
  "C 175.4,87.1 178.4,87 177.6,94 C 176.8,101.1 179.1,123.8 168.3,123.8 " +
  "C 157.5,123.8 125.4,99.4 113,94 C 100.6,88.7 100.7,94.3 93.8,91.7 " +
  "C 86.9,89.1 80.3,83.8 71.4,78.4 C 62.5,73.1 50.7,64.6 40.4,59.6 " +
  "C 30.2,54.6 16.6,52.4 9.9,48.6 C 3.2,44.8 0.8,41.6 0,36.8 " +
  "C -0.8,32 1.9,24.6 5,19.6 C 8.1,14.7 9.8,8.4 18.6,7.1 " +
  "C 27.4,5.8 44.4,10 57.8,11.8 C 71.2,13.6 84.5,18.3 98.8,18 " +
  "C 113.1,17.7 130.9,12.6 143.5,10.2 C 156.1,7.9 165.1,5.6 174.5,3.9 " +
  "C 183.9,2.2 196.8,-0.4 200,0 Z";

const RAGGI = [
  ["94", "42", "103", "42"],
  ["91.4", "29", "99.7", "25.5"],
  ["84", "18", "90.4", "11.6"],
  ["73", "10.6", "76.5", "2.3"],
  ["60", "8", "60", "0"],
  ["47", "10.6", "43.5", "2.3"],
  ["36", "18", "29.6", "11.6"],
  ["28.6", "29", "20.3", "25.5"],
  ["26", "42", "17", "42"],
];

// ---- Icona (sole + isola). prefix = id univoci per non
//      far collidere i gradienti quando in pagina ci sono
//      più istanze del logo. ----
function Icona({ prefix }: { prefix: string }) {
  return (
    <>
      <circle cx="60" cy="42" r="50" fill={`url(#${prefix}-glow)`} />
      <g stroke="#FFB04C" strokeWidth="3.1" strokeLinecap="round" opacity="0.9">
        {RAGGI.map((r, i) => (
          <line key={i} x1={r[0]} y1={r[1]} x2={r[2]} y2={r[3]} />
        ))}
      </g>
      <circle cx="60" cy="42" r="30" fill={`url(#${prefix}-sun)`} />
      <path transform="translate(8,38) scale(0.5)" d={ISOLA} fill={`url(#${prefix}-island)`} />
    </>
  );
}

function defs(prefix: string) {
  return (
    <defs>
      <radialGradient id={`${prefix}-sun`} cx="50%" cy="44%" r="60%">
        <stop offset="0%" stopColor="#FFE9A8" />
        <stop offset="38%" stopColor="#FFB957" />
        <stop offset="72%" stopColor="#FF7A59" />
        <stop offset="100%" stopColor="#FF4E78" />
      </radialGradient>
      <radialGradient id={`${prefix}-glow`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FF8A4C" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#FF8A4C" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${prefix}-island`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6B3A93" />
        <stop offset="100%" stopColor="#2A1645" />
      </linearGradient>
      <linearGradient id={`${prefix}-text`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FF8A4C" />
        <stop offset="60%" stopColor="#FF4E78" />
        <stop offset="100%" stopColor="#B14CC0" />
      </linearGradient>
    </defs>
  );
}

interface LogoProps {
  className?: string;
}

// Solo icona (per spazi stretti / mobile).
export function LogoMark({ className }: LogoProps) {
  const p = "lm";
  return (
    <svg
      className={className}
      viewBox="2 -6 116 116"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Meteo Sicilia"
    >
      {defs(p)}
      <Icona prefix={p} />
    </svg>
  );
}

// Icona + scritta "Meteo Sicilia" (senza sottotitolo, più pulito in barra).
export function LogoFull({ className }: LogoProps) {
  const p = "lf";
  return (
    <svg
      className={className}
      viewBox="2 -6 492 116"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Meteo Sicilia"
    >
      {defs(p)}
      <Icona prefix={p} />
      <text
        x="128"
        y="74"
        fontFamily="'Segoe UI', system-ui, -apple-system, Roboto, sans-serif"
        fontSize="52"
        letterSpacing="-1"
      >
        <tspan fill="currentColor" fontWeight="600">
          Meteo
        </tspan>
        <tspan fill={`url(#${p}-text)`} fontWeight="800">
          {" "}
          Sicilia
        </tspan>
      </text>
    </svg>
  );
}
