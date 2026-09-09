import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ENDPOINT = "https://hircoir-piper-tts-spanish.hf.space/convert";

/** Voz fija del proyecto: Dark, con la misma calibración usada en el video. */
const MODELO = "models/es_MX-dark.onnx";

const DRAMATICAS = [
  "muertos", "murieron", "miedo", "tragedia", "incendio", "pálidos",
  "riesgoso", "inalcanzable", "silencio", "solo", "nunca", "desastre",
];
const AGILES = ["porque", "los soviéticos", "la sala", "todo arranca", "después", "entonces"];

/** Mismo cálculo de ritmo que usa la narración del video (audio_completo.py). */
function ritmo(txt: string) {
  const t = txt.toLowerCase();
  let v = 0.99;
  if (DRAMATICAS.some((k) => t.includes(k))) v += 0.055;
  if (AGILES.some((k) => t.startsWith(k))) v -= 0.035;
  if (txt.length > 140) v -= 0.025;
  if (/\d/.test(t)) v -= 0.04;
  return Math.round(Math.min(1.07, Math.max(0.94, v)) * 1000) / 1000;
}

const esquema = z.object({ texto: z.string().min(1).max(600) });

export const generarFrase = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => esquema.parse(data))
  .handler(async ({ data }) => {
    const body = JSON.stringify({
      text: data.texto,
      modelPath: MODELO,
      settings: {
        speaker: 0,
        noise_scale: 0.58,
        length_scale: ritmo(data.texto),
        noise_w: 0.7,
      },
    });

    let ultimo = "sin respuesta";
    for (let intento = 0; intento < 3; intento++) {
      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        const json = (await res.json()) as {
          success?: boolean;
          audio?: string;
          error?: string;
        };
        if (json.audio && json.success !== false) {
          const audio = json.audio.includes(",") ? json.audio.split(",").pop()! : json.audio;
          return { audio: `data:audio/wav;base64,${audio}` };
        }
        ultimo = json.error ?? `respuesta inválida (${res.status})`;
      } catch (err) {
        ultimo = err instanceof Error ? err.message : String(err);
      }
    }
    throw new Error(`No se pudo generar la voz: ${ultimo}`);
  });

const pedido = z.object({
  correcciones: z.array(z.object({ indice: z.number().int(), texto: z.string().min(1) })),
});

/** Deja el pedido listo para rearmar el video con las frases aprobadas. */
export const pedirVideoFinal = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => pedido.parse(data))
  .handler(async ({ data }) => {
    const { writeFile, mkdir } = await import("node:fs/promises");
    const dir = "/mnt/documents/luna";
    try {
      await mkdir(dir, { recursive: true });
      await writeFile(
        `${dir}/correcciones.json`,
        JSON.stringify({ fecha: new Date().toISOString(), ...data }, null, 2),
      );
      return { ok: true, total: data.correcciones.length };
    } catch (err) {
      return { ok: false, total: data.correcciones.length, error: String(err) };
    }
  });
