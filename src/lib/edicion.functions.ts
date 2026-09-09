import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ENDPOINT = "https://hircoir-piper-tts-spanish.hf.space/convert";
/** Voz fija del proyecto (estilo de narración Lolosi10). */
const MODELO = "models/es_MX-dark.onnx";

/** Ritmo base del estilo Lolosi10, igual que en los documentales. */
const DRAMATICAS = [
  "muertos", "murieron", "miedo", "tragedia", "incendio", "hundió",
  "silencio", "nunca", "desastre", "guerra", "sangre", "final",
];

function ritmo(txt: string) {
  const t = txt.toLowerCase();
  let v = 0.99;
  if (DRAMATICAS.some((k) => t.includes(k))) v += 0.055;
  if (txt.length > 140) v -= 0.025;
  if (/\d/.test(t)) v -= 0.04;
  return Math.round(Math.min(1.07, Math.max(0.94, v)) * 1000) / 1000;
}

const vozSchema = z.object({
  texto: z.string().min(1).max(600),
  /** Ajustes tomados de una grabación del usuario, si los hay. */
  imitar: z
    .object({
      length_scale: z.number().min(0.8).max(1.3),
      noise_scale: z.number().min(0.3).max(0.9),
      noise_w: z.number().min(0.4).max(1),
    })
    .nullish(),
});

/** Genera el audio de prueba de una frase, con la voz de siempre. */
export const generarVozFrase = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => vozSchema.parse(d))
  .handler(async ({ data }) => {
    const settings = {
      speaker: 0,
      noise_scale: data.imitar?.noise_scale ?? 0.58,
      length_scale: data.imitar?.length_scale ?? ritmo(data.texto),
      noise_w: data.imitar?.noise_w ?? 0.7,
    };
    const body = JSON.stringify({ text: data.texto, modelPath: MODELO, settings });

    let ultimo = "sin respuesta";
    for (let i = 0; i < 3; i++) {
      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        const json = (await res.json()) as { success?: boolean; audio?: string; error?: string };
        if (json.audio && json.success !== false) {
          const audio = json.audio.includes(",") ? json.audio.split(",").pop()! : json.audio;
          return { audio: `data:audio/wav;base64,${audio}`, settings };
        }
        ultimo = json.error ?? `respuesta inválida (${res.status})`;
      } catch (err) {
        ultimo = err instanceof Error ? err.message : String(err);
      }
    }
    throw new Error(`No se pudo generar la voz: ${ultimo}`);
  });

export type Frase = { t0: number; t1: number; txt: string };

/** Lista los guiones con marcas de tiempo que hay guardados en el proyecto. */
export const listarGuiones = createServerFn({ method: "GET" }).handler(async () => {
  const { readdir, readFile } = await import("node:fs/promises");
  const base = "/mnt/documents";
  const salida: { id: string; nombre: string; frases: number; duracion: number }[] = [];
  try {
    for (const dir of await readdir(base)) {
      try {
        const txt = await readFile(`${base}/${dir}/marks_full.json`, "utf8");
        const crudo = JSON.parse(txt) as Frase[];
        if (!Array.isArray(crudo) || !crudo.length) continue;
        salida.push({
          id: dir,
          nombre: dir,
          frases: crudo.length,
          duracion: crudo[crudo.length - 1]!.t1,
        });
      } catch {
        /* esa carpeta no tiene marcas */
      }
    }
  } catch {
    /* sin carpeta de documentos */
  }
  return salida;
});


/** Devuelve las frases con su minuto exacto para editarlas sobre el video. */
export const cargarFrases = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().min(1).max(60) }).parse(d))
  .handler(async ({ data }) => {
    const { readFile } = await import("node:fs/promises");
    const txt = await readFile(`/mnt/documents/${data.id}/marks_full.json`, "utf8");
    const crudo = JSON.parse(txt) as Frase[];
    return crudo.map((f) => ({ t0: f.t0, t1: f.t1, txt: f.txt }));
  });

const correccion = z.object({
  indice: z.number().int().min(0),
  t0: z.number(),
  texto: z.string().min(1).max(600),
  ajustes: z
    .object({
      length_scale: z.number(),
      noise_scale: z.number(),
      noise_w: z.number(),
    })
    .nullish(),
});

/** Guarda las correcciones aprobadas para rearmar el video con ellas. */
export const guardarCorrecciones = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().min(1).max(60), correcciones: z.array(correccion).min(1) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { writeFile, mkdir } = await import("node:fs/promises");
    const dir = `/mnt/documents/${data.id}`;
    await mkdir(dir, { recursive: true });
    await writeFile(
      `${dir}/correcciones.json`,
      JSON.stringify({ fecha: new Date().toISOString(), correcciones: data.correcciones }, null, 2),
    );
    return { ok: true, total: data.correcciones.length };
  });
