import { createFileRoute } from "@tanstack/react-router";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Referencia } from "@/lib/referencias";

const DIR = "/mnt/documents/referencias";
const REG = path.join(DIR, "registro.json");

export type { Referencia };


async function leerRegistro(): Promise<Referencia[]> {
  try {
    return JSON.parse(await fs.readFile(REG, "utf8")) as Referencia[];
  } catch {
    return [];
  }
}

async function escribirRegistro(items: Referencia[]) {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(REG, JSON.stringify(items, null, 2), "utf8");
}

export const Route = createFileRoute("/api/public/referencias")({
  server: {
    handlers: {
      GET: async () => Response.json(await leerRegistro()),

      POST: async ({ request }) => {
        const nombre = (request.headers.get("x-nombre") ?? "archivo").replace(
          /[^\w.\-]+/g,
          "_",
        );
        const tipo = request.headers.get("x-tipo") ?? "application/octet-stream";
        const id = `${Date.now()}-${nombre}`;
        await fs.mkdir(DIR, { recursive: true });
        const datos = new Uint8Array(await request.arrayBuffer());
        await fs.writeFile(path.join(DIR, id), datos);
        const items = await leerRegistro();
        const ref: Referencia = {
          id,
          nombre,
          tipo,
          bytes: datos.byteLength,
          fecha: new Date().toISOString(),
          activo: true,
          permanente: false,
          notas: "",
        };
        items.unshift(ref);
        await escribirRegistro(items);
        return Response.json(ref);
      },

      PATCH: async ({ request }) => {
        const cambio = (await request.json()) as Partial<Referencia> & { id: string };
        const items = await leerRegistro();
        const i = items.findIndex((r) => r.id === cambio.id);
        if (i < 0) return new Response("No existe", { status: 404 });
        items[i] = { ...items[i]!, ...cambio, id: items[i]!.id };
        await escribirRegistro(items);
        return Response.json(items[i]);
      },

      DELETE: async ({ request }) => {
        const { id } = (await request.json()) as { id: string };
        const items = await leerRegistro();
        await escribirRegistro(items.filter((r) => r.id !== id));
        await fs.rm(path.join(DIR, id)).catch(() => {});
        return Response.json({ ok: true });
      },
    },
  },
});
