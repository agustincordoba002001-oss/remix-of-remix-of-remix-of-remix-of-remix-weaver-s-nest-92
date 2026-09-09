/**
 * NARRADOR PROPIO — el "modelo" de guiones del proyecto.
 *
 * No usa ninguna IA de pago ni consume créditos: son las reglas de escritura
 * que aprendimos escribiendo a mano el guion del Titanic, convertidas en código.
 * Recibe hechos en crudo (enciclopedia libre) y devuelve un relato con gancho,
 * cronología, actos, tensión y cierre.
 *
 * Reglas fijas del proyecto:
 * - La intro dice siempre "LA HISTORIA COMPLETA DE [TEMA]".
 * - Los nombres en inglés se escriben como suenan (tabla FONETICA).
 * - Nunca se repite una idea ya contada ni un conector ya usado.
 */

import { AJUSTES_BASE, type Ajustes } from "./ajustes";

/* ------------------------------------------------------------------ */
/* 1. Pronunciación                                                    */
/* ------------------------------------------------------------------ */

export const FONETICA: Record<string, string> = {
  Titanic: "Taitánic",
  Kennedy: "Quénedi",
  Armstrong: "Ármstrong",
  Washington: "Washintong",
  Liverpool: "Líverpul",
  Southampton: "Sáuthampton",
  Belfast: "Bélfast",
  Cherbourg: "Cherburgo",
  Queenstown: "Quínstaun",
  Carpathia: "Carpatia",
  California: "Califórnia",
  Hollywood: "Jólivud",
  Chicago: "Chicágo",
  Michigan: "Míchigan",
  Boeing: "Bóing",
  Apollo: "Apolo",
  Cunard: "Kiunard",
  Harland: "Járland",
  Wolff: "Uólf",
  Olympic: "Olímpic",
  Britannic: "Britanic",
  Lusitania: "Lusitania",
  New: "Niu",
  Jersey: "Yérsey",
  Sherman: "Shérman",
  Churchill: "Chérchil",
  Roosevelt: "Rúsvelt",
  Eisenhower: "Áisenhauer",
  Hughes: "Hiuz",
  Wright: "Ráit",
  Edison: "Édison",
  Bell: "Bel",
  Cambridge: "Kéimbrich",
  Oxford: "Óxford",
  Yale: "Yeil",
  Detroit: "Detróit",
  Seattle: "Siátel",
  Houston: "Hiúston",
};

export function foneticas(t: string) {
  let out = t;
  for (const [en, es] of Object.entries(FONETICA)) {
    out = out.replace(new RegExp(`\\b${en}\\b`, "g"), es);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 2. Vocabulario de tensión y ritmo                                   */
/* ------------------------------------------------------------------ */

const DRAMATICAS = [
  "muerte", "muertos", "murió", "murieron", "miedo", "tragedia", "incendio",
  "hundió", "hundimiento", "silencio", "nunca", "desastre", "guerra", "sangre",
  "final", "destruyó", "derrumbó", "fracaso", "peligro", "víctimas", "colapso",
  "catástrofe", "explosión", "ataque", "prohibido", "secreto", "último",
];

const NUMEROSA = /\b\d{2,}(?:[.,]\d+)?\b|\b\d+\s?(?:%|millones|mil)\b/i;
const ANIO =
  /\b(?:en|el|del|de|hacia|desde|hasta|para|entre|año)\s+(1[0-9]{3}|20[0-9]{2})\b(?!\s*(?:MW|m\b|km|metros|kg|habitantes|millones|dólares|toneladas|personas|kilómetros))/i;

/** Frases que son bibliografía, enlaces o ruido de edición: fuera del relato. */
const RUIDO = /(https?:\/\/|www\.|Wayback|Archivado el|ISBN|doi:|et al\.|Consultado el|\bpp?\. ?\d|Editorial |ed\.\)|n\.º ?\d+-\d+|Categoría:|Véase también)/i;

/** Frases que hablan de películas, libros o cultura pop: no son el relato. */
const META = /\b(pel[ií]cula|filme|film|serie|documental|novela|recaudaci[oó]n|taquilla|actor|actriz|videojuego|canci[oó]n|estreno|reestreno|adaptaci[oó]n)\b/i;

const CAUSALES = /\b(porque|debido a|por eso|como consecuencia|provocó|permitió|obligó|impidió|gracias a|a raíz de)\b/i;

/* palabras vacías para comparar ideas */
const VACIAS = new Set([
  "el","la","los","las","un","una","unos","unas","de","del","al","a","en","y","o","que","se",
  "su","sus","por","con","para","como","más","fue","era","son","ser","este","esta","esto","entre",
  "sobre","desde","hasta","también","pero","cuando","donde","lo","le","les","ya","no","sin","tras",
]);

function tokens(f: string) {
  return new Set(
    f
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9áéíóúñ ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !VACIAS.has(w)),
  );
}

function parecido(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let comunes = 0;
  a.forEach((w) => {
    if (b.has(w)) comunes++;
  });
  return comunes / Math.min(a.size, b.size);
}

/** Cuánto sirve una frase para el relato: más alto, más adelante en el guion. */
function fuerza(f: string, aj: Ajustes = AJUSTES_BASE, clave: Set<string> = new Set()) {
  const t = f.toLowerCase();
  let p = 0;
  if (DRAMATICAS.some((k) => t.includes(k))) p += 2 + aj.drama;
  if (NUMEROSA.test(f)) p += 1 + aj.datos;
  if (CAUSALES.test(f)) p += 2;
  if (ANIO.test(f)) p += 1;
  if (META.test(f)) p -= 8;
  if (RUIDO.test(f)) p -= 10;
  if (f.length > 260) p -= 2;
  if ((f.match(/,/g) || []).length > 5) p -= 2;
  // relevancia con el tema
  const tk = tokens(f);
  let hits = 0;
  clave.forEach((k) => {
    if (tk.has(k)) hits++;
  });
  p += Math.min(3, hits);
  // prioridades que pidió el usuario
  if (aj.priorizar.some((k) => t.includes(k.toLowerCase()))) p += 4;
  return p;
}

export function pausa(txt: string) {
  const t = txt.toLowerCase();
  if (txt.length < 60) return 0.72;
  if (DRAMATICAS.some((k) => t.includes(k))) return 0.7;
  if (txt.length > 200) return 0.5;
  return 0.4;
}

/* ------------------------------------------------------------------ */
/* 3. Reescritura: de enciclopedia a relato hablado                    */
/* ------------------------------------------------------------------ */

/** Quita el ruido de enciclopedia (paréntesis, comillas, referencias). */
export function limpiar(t: string) {
  return t
    .replace(/^=+[^=]*=+/g, "")
    .replace(/[\u200b\u200e\u00ad]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[«»""„"]/g, "")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Corta las frases muy largas en dos, como hace un narrador al hablar. */
function respirar(f: string, limite = 190): string[] {
  if (f.length <= limite) return [f];
  const corte = f.lastIndexOf(", ", Math.floor(f.length * 0.62));
  if (corte < 70) return [f];
  const a = f.slice(0, corte).trim();
  let b = f.slice(corte + 2).trim();
  b = b.charAt(0).toUpperCase() + b.slice(1);
  const cola = respirar(b, limite);
  return [a.endsWith(".") ? a : `${a}.`, ...cola];
}

/** Arranques que dan intención al dato, sin inventar hechos. */
const ENFASIS = [
  "Y acá está el detalle:",
  "Prestá atención a esto:",
  "Este dato lo explica casi todo:",
  "Y esto es lo que casi nadie cuenta:",
  "Guardate este número:",
  "Escuchá bien esta parte:",
  "Y acá la historia se pone incómoda:",
];

/** Conectores entre bloques del relato (retórica, no información nueva). */
const PUENTES = [
  "Pero esto recién empezaba.",
  "Y entonces todo dio un giro.",
  "Lo que pasó después lo cambió todo.",
  "Hasta acá, todo parecía bajo control.",
  "Y las cosas no iban a ser tan simples.",
  "Ahora sí, viene la parte importante.",
  "Y todavía faltaba lo peor.",
  "Con el diario del lunes, todo parece obvio. En ese momento no lo era.",
  "Mientras tanto, la historia seguía su curso.",
  "Y acá se cruzan dos caminos que ya no se separan.",
];

const CIERRES_ACTO = [
  "Todo estaba listo. Nadie imaginaba lo que venía.",
  "Ese fue el punto sin retorno.",
  "Y ya no había manera de volver atrás.",
  "A partir de ese momento, nada volvió a ser igual.",
];

const PREGUNTAS = [
  "Y acá aparece la pregunta que todavía nadie contestó del todo.",
  "¿Por qué nadie lo vio venir?",
  "¿Se podía evitar? Guardá esa pregunta.",
  "¿Y qué pasaba mientras tanto del otro lado?",
  "¿Quién era el responsable de todo esto?",
];

const ACTOS = [
  "Primer acto: el origen.",
  "Segundo acto: la tensión crece.",
  "Tercer acto: el punto de quiebre.",
  "Cuarto acto: las consecuencias.",
  "Último acto: lo que quedó.",
];

/**
 * Elige frases retóricas sin repetir: recorre la lista entera antes de
 * volver a usar una. Es la regla que evita el efecto "frase repetida".
 */
function repartidor<T>(lista: T[], semilla: number) {
  const orden = lista
    .map((v, i) => ({ v, k: (semilla + i * 37) % lista.length }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.v);
  let i = 0;
  return () => orden[i++ % orden.length]!;
}

/* ------------------------------------------------------------------ */
/* 4. Cronología y actos                                               */
/* ------------------------------------------------------------------ */

function anio(f: string): number | null {
  const m = ANIO.exec(f);
  return m ? Number(m[1]) : null;
}

export type Frase = { txt: string; gap: number };

export type Bloque = { titulo: string; frases: string[] };

/**
 * Ordena los hechos en una línea de tiempo real: la columna vertebral son
 * los años, y el contexto sin fecha se ubica cerca del hecho fechado con el
 * que comparte más palabras. Así nada queda fuera de contexto.
 */
export function cronologia(frases: string[], aj: Ajustes = AJUSTES_BASE, clave = new Set<string>()) {
  const conAnio: { f: string; a: number; i: number; tk: Set<string> }[] = [];
  const sinAnio: { f: string; i: number; tk: Set<string> }[] = [];
  frases.forEach((f, i) => {
    const a = anio(f);
    const tk = tokens(f);
    if (a) conAnio.push({ f, a, i, tk });
    else sinAnio.push({ f, i, tk });
  });
  conAnio.sort((x, y) => x.a - y.a || x.i - y.i);

  if (!conAnio.length) {
    return sinAnio.sort((x, y) => fuerza(y.f, aj, clave) - fuerza(x.f, aj, clave)).map((s) => s.f);
  }

  // Cada hecho sin fecha se engancha al momento con el que más comparte.
  const colgados: string[][] = conAnio.map(() => []);
  const sueltos: string[] = [];
  for (const s of sinAnio) {
    let mejor = -1;
    let punt = 0.18;
    conAnio.forEach((c, k) => {
      const p = parecido(s.tk, c.tk);
      if (p > punt) {
        punt = p;
        mejor = k;
      }
    });
    if (mejor >= 0 && colgados[mejor]!.length < 2) colgados[mejor]!.push(s.f);
    else sueltos.push(s.f);
  }

  const out: string[] = [];
  conAnio.forEach((c, k) => {
    out.push(c.f);
    colgados[k]!.forEach((x) => out.push(x));
  });
  // Lo que no encontró lugar entra al principio como contexto general,
  // ordenado por fuerza, sin romper la línea de tiempo.
  sueltos.sort((a, b) => fuerza(b, aj, clave) - fuerza(a, aj, clave));
  return [...sueltos.slice(0, 6), ...out, ...sueltos.slice(6)];
}

/* ------------------------------------------------------------------ */
/* 5. El guion completo                                                */
/* ------------------------------------------------------------------ */

/** Arma la intro fija respetando el artículo del tema (del / de la / de). */
export function tituloIntro(tema: string) {
  const t = tema.trim();
  const m = /^(el|la|los|las)\s+(.+)$/i.exec(t);
  if (m) {
    const art = m[1]!.toLowerCase();
    const resto = m[2]!.toUpperCase();
    if (art === "el") return `LA HISTORIA COMPLETA DEL ${resto}.`;
    if (art === "la") return `LA HISTORIA COMPLETA DE LA ${resto}.`;
    if (art === "los") return `LA HISTORIA COMPLETA DE LOS ${resto}.`;
    return `LA HISTORIA COMPLETA DE LAS ${resto}.`;
  }
  return `LA HISTORIA COMPLETA DE ${t.toUpperCase()}.`;
}

export type Guion = {
  titulo: string;
  escenas: Frase[];
  palabras: number;
  minutos: number;
};

/**
 * Arma el guion con la misma arquitectura del Titanic:
 * gancho -> intro fija -> promesa -> actos cronológicos con tensión -> cierre.
 */
export function escribirGuion(
  tema: string,
  hechos: string[],
  minutos: number,
  ajustes: Ajustes = AJUSTES_BASE,
): Guion {
  const aj: Ajustes = { ...AJUSTES_BASE, ...ajustes };
  const objetivo = Math.round(Math.max(3, minutos + aj.minutosExtra) * 140);
  const temaVoz = foneticas(tema);
  const intro = tituloIntro(temaVoz);
  const nombre = temaVoz.replace(/^(el|la|los|las)\s+/i, "");
  const clave = tokens(tema);
  const limiteFrase = aj.frasesCortas >= 2 ? 140 : aj.frasesCortas === 1 ? 190 : 240;

  // Semilla estable por tema: dos videos distintos no repiten los mismos
  // conectores en el mismo orden, pero el mismo tema siempre suena igual.
  let semilla = 0;
  for (const c of tema) semilla = (semilla * 31 + c.charCodeAt(0)) % 100000;
  const darPuente = repartidor(PUENTES, semilla);
  const darPregunta = repartidor(PREGUNTAS, semilla + 3);
  const darEnfasis = repartidor(ENFASIS, semilla + 7);
  const darCierre = repartidor(CIERRES_ACTO, semilla + 11);

  // --- material: limpio, sin repetidos y sin lo que el usuario descartó ---
  const material = (umbral: number) => {
    const vistos: Set<string>[] = [];
    const out: string[] = [];
    for (const h of hechos) {
      const f = limpiar(h);
      if (f.length < 45 || f.length > 340) continue;
      if (f.includes("==")) continue;
      if (META.test(f) || RUIDO.test(f)) continue;
      const bajo = f.toLowerCase();
      if (aj.evitar.some((k) => k && bajo.includes(k.toLowerCase()))) continue;
      const tk = tokens(f);
      if (tk.size < 4) continue;
      // no repetimos una idea ya contada, aunque esté escrita distinto
      if (vistos.some((v) => parecido(tk, v) > umbral)) continue;
      vistos.push(tk);
      out.push(f);
    }
    return out;
  };
  // Si el filtro estricto deja poco material, aflojamos: mejor un relato
  // completo que uno corto.
  let unicos = material(0.55);
  if (unicos.length < 45) unicos = material(0.75);
  if (unicos.length < 20) unicos = material(0.9);

  // --- gancho -------------------------------------------------------
  const fuerte =
    /\b(muert|muri|víctim|tragedia|desastre|hundi|catástrofe|destruy|sobrevivi|superviv|guerra|prohib|secret|récord|primera vez|nunca antes)/i;
  const cortos = unicos.filter((f) => f.length < 230);
  const conNumero = cortos.filter((f) => NUMEROSA.test(f) && fuerte.test(f));
  const conAlgo = cortos.filter((f) => NUMEROSA.test(f) || fuerte.test(f));
  const pool = conNumero.length >= 2 ? conNumero : conAlgo.length >= 2 ? conAlgo : cortos;
  const gancho = pool
    .slice()
    .sort((a, b) => fuerza(b, aj, clave) - fuerza(a, aj, clave))
    .slice(0, 3);

  const esc: Frase[] = [];
  const dichas: Set<string>[] = [];
  const push = (txt: string, gap?: number) => {
    const t = foneticas(txt).trim();
    if (!t) return;
    esc.push({ txt: t, gap: gap ?? pausa(t) });
  };
  /** Igual que push, pero descarta lo que ya se dijo con otras palabras. */
  const contar = (txt: string) => {
    const tk = tokens(txt);
    if (tk.size > 3 && dichas.some((d) => parecido(tk, d) > 0.6)) return 0;
    dichas.push(tk);
    push(txt);
    return txt.split(/\s+/).length;
  };

  const APERTURAS = [
    `Hay historias que se cuentan mil veces y siguen sin entenderse. Esta es una de ellas.`,
    `Todo lo que creés saber sobre esto probablemente sea la mitad de la historia.`,
    `Esto no fue un accidente del destino. Fue una cadena de decisiones.`,
    `Para entender lo que pasó, hay que empezar mucho antes de lo que imaginás.`,
  ];
  push(APERTURAS[semilla % APERTURAS.length]!, 0.8);
  gancho.forEach((g) => respirar(g, limiteFrase).forEach((p) => contar(p)));

  // --- intro fija (regla del proyecto) -----------------------------
  push(intro, 0.95);
  push(
    `Cómo empezó, qué pasó realmente y por qué todavía se sigue contando. De principio a fin.`,
    0.8,
  );

  // --- cuerpo en actos ---------------------------------------------
  const cuerpo = cronologia(
    unicos.filter((f) => !gancho.includes(f)),
    aj,
    clave,
  );

  let palabras = esc.reduce((n, e) => n + e.txt.split(/\s+/).length, 0);
  let desdePuente = 0;
  let bloque = 0;
  let actoIdx = 0;
  let enfasisUsados = 0;
  let ultimoAnio: number | null = null;
  const maxEnfasis = 4 + aj.drama * 2;

  for (const f of cuerpo) {
    if (palabras >= objetivo) break;

    if (desdePuente >= 6) {
      let linea: string;
      if (bloque > 0 && bloque % 4 === 0 && actoIdx < ACTOS.length) {
        linea = ACTOS[actoIdx++]!;
      } else if (bloque > 0 && bloque % 3 === 0) {
        linea = darCierre();
      } else if (aj.preguntas > 0 && bloque % (6 - aj.preguntas) === 2) {
        linea = darPregunta();
      } else {
        linea = darPuente();
      }
      push(linea, 0.85);
      palabras += linea.split(/\s+/).length;
      desdePuente = 0;
      bloque++;
    }

    // Marcamos el salto de época: ayuda a seguir la cronología escuchando.
    const m = ANIO.exec(f);
    const a = m ? Number(m[1]) : null;
    if (a && (ultimoAnio === null || a - ultimoAnio >= 5)) {
      push(`Año ${a}.`, 0.6);
      palabras += 2;
      ultimoAnio = a;
    } else if (a && a > (ultimoAnio ?? 0)) {
      ultimoAnio = a;
    }

    if (
      aj.drama > -1 &&
      fuerza(f, aj, clave) >= 6 &&
      enfasisUsados < maxEnfasis &&
      desdePuente > 1
    ) {
      const e = darEnfasis();
      enfasisUsados++;
      push(e, 0.55);
      palabras += e.split(/\s+/).length;
    }

    let sumo = 0;
    for (const parte of respirar(f, limiteFrase)) sumo += contar(parte);
    if (sumo === 0) continue; // era una idea repetida: no gastamos un bloque
    palabras += sumo;
    desdePuente++;
  }

  // --- cierre -------------------------------------------------------
  push("Y así termina esta historia.", 0.8);
  push(
    `Lo que pasó con ${nombre} ya no se puede cambiar, pero sí se puede entender. Y por eso se sigue contando.`,
    0.9,
  );
  push("Gracias por acompañarme hasta el final.", 1);

  const total = esc.reduce((n, e) => n + e.txt.split(/\s+/).length, 0);
  return {
    titulo: tema,
    escenas: esc,
    palabras: total,
    minutos: Math.round((total / 140) * 10) / 10,
  };
}
