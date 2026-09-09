/**
 * ENTRENAMIENTO DEL NARRADOR
 *
 * El usuario escribe una indicación en castellano ("más dramático", "no repitas
 * conectores", "hablá más de la construcción") y acá la convertimos en reglas
 * que el narrador aplica siempre. Se guarda en el navegador, así el sistema
 * mejora solo con el uso y nunca consume créditos.
 */

export type Ajustes = {
  drama: number; // -2 .. 3
  preguntas: number; // 0 .. 3
  datos: number; // -2 .. 3
  frasesCortas: number; // -1 .. 2
  minutosExtra: number;
  evitar: string[];
  priorizar: string[];
  notas: string[];
};

export const AJUSTES_BASE: Ajustes = {
  drama: 1,
  preguntas: 1,
  datos: 1,
  frasesCortas: 1,
  minutosExtra: 0,
  evitar: [],
  priorizar: [],
  notas: [],
};

const lim = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

const q = (t: string, ...frases: string[]) => frases.some((f) => t.includes(f));

/**
 * Lee la indicación y devuelve los ajustes nuevos más un resumen legible
 * de lo que cambió, para mostrárselo al usuario.
 */
export function aprender(base: Ajustes, instruccion: string) {
  const t = instruccion
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const a: Ajustes = {
    ...base,
    evitar: [...base.evitar],
    priorizar: [...base.priorizar],
    notas: [...base.notas],
  };
  const cambios: string[] = [];

  if (q(t, "mas dramatic", "mas tension", "mas emocion", "mas intens", "mas atrapante")) {
    a.drama = lim(a.drama + 1, -2, 3);
    cambios.push("más tensión y dramatismo");
  }
  if (q(t, "menos dramatic", "menos exagerad", "mas sobrio", "mas serio", "menos tension")) {
    a.drama = lim(a.drama - 1, -2, 3);
    cambios.push("tono más sobrio");
  }
  if (q(t, "menos pregunta", "sin pregunta", "no hagas pregunta")) {
    a.preguntas = lim(a.preguntas - 1, 0, 3);
    cambios.push("menos preguntas al aire");
  }
  if (q(t, "mas pregunta")) {
    a.preguntas = lim(a.preguntas + 1, 0, 3);
    cambios.push("más preguntas al aire");
  }
  if (q(t, "mas dato", "mas cifra", "mas numero", "mas preciso", "mas detalle")) {
    a.datos = lim(a.datos + 1, -2, 3);
    cambios.push("más datos y cifras");
  }
  if (q(t, "menos dato", "menos numero", "menos cifra", "mas simple", "mas facil")) {
    a.datos = lim(a.datos - 1, -2, 3);
    cambios.push("menos cifras, más relato");
  }
  if (q(t, "frases cortas", "mas cort", "mas directo", "mas agil", "mas dinamic")) {
    a.frasesCortas = lim(a.frasesCortas + 1, -1, 2);
    cambios.push("frases más cortas y ágiles");
  }
  if (q(t, "frases largas", "mas pausad", "mas descriptiv")) {
    a.frasesCortas = lim(a.frasesCortas - 1, -1, 2);
    cambios.push("frases más largas y descriptivas");
  }
  if (q(t, "mas largo", "mas duracion", "que dure mas", "extendelo")) {
    a.minutosExtra = lim(a.minutosExtra + 3, -10, 20);
    cambios.push("guiones más largos");
  }
  if (q(t, "mas corto", "menos duracion", "que dure menos", "resumilo")) {
    a.minutosExtra = lim(a.minutosExtra - 3, -10, 20);
    cambios.push("guiones más cortos");
  }

  // "no hables de ..." / "evitá ..." / "sacá ..."
  const evitar = /(?:no hables de|no menciones|evita|evitar|saca|sacar|nada de)\s+([a-z0-9áéíóúñ ,]{3,60})/.exec(
    instruccion.toLowerCase(),
  );
  if (evitar) {
    const palabras = evitar[1]!
      .split(/[,y]| e /)
      .map((s) => s.trim())
      .filter((s) => s.length > 2);
    a.evitar = [...new Set([...a.evitar, ...palabras])];
    if (palabras.length) cambios.push(`no vuelve a hablar de: ${palabras.join(", ")}`);
  }

  // "hablá más de ..." / "contá más sobre ..." / "priorizá ..."
  const prior =
    /(?:habla mas de|habla mas sobre|conta mas de|conta mas sobre|priorit?za|prioriza|enfocate en|centrate en|mas sobre)\s+([a-z0-9áéíóúñ ,]{3,60})/.exec(
      t,
    );
  if (prior) {
    const palabras = prior[1]!
      .split(/[,y]| e /)
      .map((s) => s.trim())
      .filter((s) => s.length > 2);
    a.priorizar = [...new Set([...a.priorizar, ...palabras])];
    if (palabras.length) cambios.push(`da prioridad a: ${palabras.join(", ")}`);
  }

  a.notas = [...a.notas, instruccion.trim()].slice(-40);
  if (!cambios.length) {
    cambios.push("indicación guardada: la voy a tener en cuenta al elegir los hechos");
  }
  return { ajustes: a, cambios };
}

const CLAVE = "estudio.ajustes.v1";

export function cargarAjustes(): Ajustes {
  if (typeof localStorage === "undefined") return AJUSTES_BASE;
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return AJUSTES_BASE;
    return { ...AJUSTES_BASE, ...(JSON.parse(raw) as Partial<Ajustes>) };
  } catch {
    return AJUSTES_BASE;
  }
}

export function guardarAjustes(a: Ajustes) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(CLAVE, JSON.stringify(a));
}
