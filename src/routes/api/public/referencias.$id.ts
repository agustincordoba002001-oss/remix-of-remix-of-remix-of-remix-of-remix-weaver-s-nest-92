import { createFileRoute } from "@tanstack/react-router";
import { promises as fs } from "node:fs";
import path from "node:path";

const DIR = "/mnt/documents/referencias";

export const Route = createFileRoute("/api/public/referencias/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = String(params.id).replace(/[^\w.\-]+/g, "_");
        try {
          const datos = await fs.readFile(path.join(DIR, id));
          return new Response(new Uint8Array(datos), {
            headers: {
              "content-type": id.match(/\.(mp3|wav|m4a|ogg)$/i)
                ? "audio/mpeg"
                : "video/mp4",
              "cache-control": "no-store",
            },
          });
        } catch {
          return new Response("No encontrado", { status: 404 });
        }
      },
    },
  },
});
