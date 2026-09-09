/**
 * Búsqueda de hechos gratis en la enciclopedia libre.
 * Nunca consume créditos ni tokens.
 */
import { limpiar } from "./narrador";

/* ------------------------------------------------------------------ */
/* Hechos gratis: enciclopedia libre (sin créditos, sin tokens)         */
/* ------------------------------------------------------------------ */

function frases(texto: string) {
  return texto
    .split(/(?<=[.!?])\s+/)
    .map((f) => limpiar(f))
    .filter((f) => f.length > 40 && f.length < 340 && !f.endsWith(":"));
}

/** Descarta frases que suenan a ficha de referencia y no a relato. */
function esRelato(f: string): boolean {
  const t = f.toLowerCase();
  if ((f.match(/,/g) || []).length > 6) return false;
  if (t.startsWith("para otros usos")) return false;
  if (/^\d{3,}\s/.test(f) && f.length < 80) return false;
  if (/\bcoordenadas\b/.test(t)) return false;
  return true;
}

const SECCIONES_BASURA =
  /^(Véase también|Referencias|Bibliografía|Enlaces externos|Notas|Obras|Filmografía|Galardones|Premios|Discografía|Enlaces)/i;

function extraerRelato(texto: string): string[] {
  const partes = texto
    .split(/\n==+ ?([^=]+?) ?==+\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const bloque of partes) {
    if (SECCIONES_BASURA.test(bloque)) continue;
    out.push(...frases(bloque).filter(esRelato));
  }
  return out;
}

function esArticuloValido(extract: string, minPalabras: number): boolean {
  if (!extract) return false;
  // Sólo la entrada del artículo delata una página de desambiguación.
  const t = extract.slice(0, 300).toLowerCase();
  if (/puede referirse a|desambiguación|hace referencia a/.test(t)) return false;
  return extract.split(/\s+/).length > minPalabras;
}

const API = "https://es.wikipedia.org/w/api.php";

async function json<T>(url: URL): Promise<T | null> {
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "EstudioDocumental/1.0 (guiones libres)" },
      });
      if (r.ok) return (await r.json()) as T;
      if (r.status !== 429 && r.status < 500) return null;
      // Si la enciclopedia pide esperar, esperamos lo que dice.
      const espera = Number(r.headers.get("retry-after"));
      if (espera > 0) await new Promise((ok) => setTimeout(ok, Math.min(espera, 8) * 1000));
    } catch {
      /* reintentamos */
    }
    await new Promise((ok) => setTimeout(ok, 700 * 2 ** i));
  }
  return null;
}



/** Busca títulos por varios caminos hasta encontrar algo. */
async function buscarTitulos(tema: string): Promise<string[]> {
  const out: string[] = [];
  const add = (t?: string | null) => {
    if (t && !out.includes(t)) out.push(t);
  };

  const search = async (q: string, limite: number) => {
    const u = new URL(API);
    u.searchParams.set("action", "query");
    u.searchParams.set("list", "search");
    u.searchParams.set("srsearch", q);
    u.searchParams.set("srlimit", String(limite));
    u.searchParams.set("format", "json");
    u.searchParams.set("origin", "*");
    const b = await json<{ query?: { search?: { title?: string }[] } }>(u);
    (b?.query?.search ?? []).forEach((s) => add(s.title));
  };

  await search(tema, 12);

  if (out.length < 3) {
    // Sugerencias por prefijo (sirve cuando el tema está mal escrito).
    const u = new URL(API);
    u.searchParams.set("action", "opensearch");
    u.searchParams.set("search", tema);
    u.searchParams.set("limit", "10");
    u.searchParams.set("format", "json");
    u.searchParams.set("origin", "*");
    const b = await json<[string, string[]]>(u);
    (b?.[1] ?? []).forEach(add);
  }

  if (out.length < 3) {
    // Última red: buscamos por las palabras más significativas del tema.
    const claves = tema
      .split(/\s+/)
      .filter((p) => p.length > 3)
      .slice(0, 4);
    for (const c of claves) {
      if (out.length >= 6) break;
      await search(c, 6);
    }
  }

  return out.slice(0, 8);
}

type Articulo = { title: string; extract: string };

/** Trae el texto completo de un artículo. */
async function traerArticulo(titulo: string): Promise<Articulo | null> {
  const u = new URL(API);
  u.searchParams.set("action", "query");
  u.searchParams.set("prop", "extracts");
  u.searchParams.set("explaintext", "1");
  u.searchParams.set("redirects", "1");
  u.searchParams.set("titles", titulo);
  u.searchParams.set("format", "json");
  u.searchParams.set("origin", "*");
  const a = await json<{
    query?: { pages?: Record<string, { title?: string; extract?: string }> };
  }>(u);
  const p = Object.values(a?.query?.pages ?? {})[0];
  if (!p?.title || !p.extract) return null;
  return { title: p.title, extract: p.extract };
}

const sinTildes = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Qué tanto habla el artículo del tema pedido (aguanta plurales). */
function relevancia(titulo: string, tema: string) {
  const t = sinTildes(titulo);
  const claves = sinTildes(tema)
    .replace(/\b(el|la|los|las|de|del|historia|completa)\b/g, " ")
    .split(/\s+/)
    .map((p) => p.replace(/(es|s)$/, ""))
    .filter((p) => p.length > 3);
  if (!claves.length) return 0.5;
  return claves.filter((c) => t.includes(c)).length / claves.length;
}

/** Siempre devuelve material: va aflojando los filtros hasta conseguirlo. */
export async function wikipedia(tema: string) {
  const titulos = await buscarTitulos(tema);
  if (!titulos.length) return [];

  // Elegimos el artículo principal por el título, antes de descargar nada:
  // el que más habla del tema y con el nombre más directo.
  const puntaje = (t: string, i: number) =>
    3 * relevancia(t, tema) -
    0.1 * i -
    0.22 * t.split(/\s+/).length +
    (sinTildes(t) === sinTildes(tema).replace(/^(el|la|los|las)\s+/, "") ? 2 : 0);
  const orden = titulos
    .map((t, i) => ({ t, p: puntaje(t, i) }))
    .sort((x, y) => y.p - x.p)
    .map((x) => x.t);

  // Descargamos de a uno (la enciclopedia corta las ráfagas) y paramos
  // apenas tenemos material suficiente para un relato largo.
  const arts: Articulo[] = [];
  for (const t of orden.slice(0, 4)) {
    const a = await traerArticulo(t);
    if (a && a.extract.split(/\s+/).length > 80) arts.push(a);
    const palabras = arts.reduce((n, x) => n + x.extract.split(/\s+/).length, 0);
    if (palabras > 3000) break;
    await new Promise((ok) => setTimeout(ok, 250));
  }
  if (!arts.length) return [];

  // Los artículos secundarios sólo entran si de verdad hablan del tema.
  const filtrados = arts.filter((a, i) => i === 0 || relevancia(a.title, tema) >= 0.5);

  for (const min of [120, 60, 25, 0]) {
    const utiles = filtrados
      .filter((p) => esArticuloValido(p.extract, min))
      .map((p) => ({ titulo: p.title, relato: extraerRelato(p.extract) }))
      .filter((c) => c.relato.length > 2);
    if (utiles.length) return utiles;
  }

  return [];
}



