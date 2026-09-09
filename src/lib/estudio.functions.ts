import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { escribirGuion } from "./narrador";
import { AJUSTES_BASE } from "./ajustes";
import { wikipedia } from "./hechos";

const ENDPOINT = "https://hircoir-piper-tts-spanish.hf.space/convert";
const MODELO = "models/es_MX-dark.onnx";

const ajustesSchema = z
  .object({
    drama: z.number().min(-2).max(3).default(1),
    preguntas: z.number().min(0).max(3).default(1),
    datos: z.number().min(-2).max(3).default(1),
    frasesCortas: z.number().min(-1).max(2).default(1),
    minutosExtra: z.number().min(-10).max(20).default(0),
    evitar: z.array(z.string().max(60)).max(40).default([]),
    priorizar: z.array(z.string().max(60)).max(40).default([]),
    notas: z.array(z.string().max(400)).max(40).default([]),
  })
  .default(AJUSTES_BASE);

const temaSchema = z.object({
  tema: z.string().min(2).max(120),
  minutos: z.number().min(3).max(40).default(15),
  ajustes: ajustesSchema,
});

export const generarGuion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => temaSchema.parse(d))
  .handler(async ({ data }) => {
    const candidatos = await wikipedia(data.tema);
    // El artículo principal manda; los relacionados sólo aportan contexto.
    const hechos = candidatos.flatMap((c, i) =>
      i === 0 ? c.relato : c.relato.slice(0, 40),
    );
    // La intro nombra el tema tal como lo pidió el usuario.
    const titulo = data.tema.trim();


    // El guion lo escribe el narrador propio del proyecto: sin IA de pago,
    // sin tokens y sin consumir créditos nunca.
    return escribirGuion(titulo, hechos, data.minutos, data.ajustes);
  });



/* ------------------------------------------------------------------ */
/* Voz gratis: mismo motor y calibración que los documentales          */
/* ------------------------------------------------------------------ */

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

const vozSchema = z.object({ texto: z.string().min(1).max(600) });

export const generarVoz = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => vozSchema.parse(d))
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
          return { audio: `data:audio/wav;base64,${audio}` };
        }
        ultimo = json.error ?? `respuesta inválida (${res.status})`;
      } catch (err) {
        ultimo = err instanceof Error ? err.message : String(err);
      }
    }
    throw new Error(`No se pudo generar la voz: ${ultimo}`);
  });
