import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  Brain,
  Download,
  FileAudio,
  Film,
  Loader2,
  Upload,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { generarGuion, generarVoz } from "@/lib/estudio.functions";
import {
  AJUSTES_BASE,
  aprender,
  cargarAjustes,
  guardarAjustes,
  type Ajustes,
} from "@/lib/ajustes";
import { animarVideo, type EscenaVideo } from "@/lib/animador";
import type { Referencia } from "@/lib/referencias";

export const Route = createFileRoute("/estudio")({
  head: () => ({
    meta: [
      { title: "Estudio: guion, voz y video animado gratis" },
      {
        name: "description",
        content:
          "Escribí un tema y el estudio arma el guion, lo narra con voz Dark y lo convierte en video animado, sin costo. También podés subir tu audio o video para revisarlo.",
      },
      { property: "og:title", content: "Estudio: guion, voz y video animado gratis" },
      {
        property: "og:description",
        content:
          "Guion, narración y animación automáticos, y revisión de tus audios y videos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Estudio,
});

type Escena = { txt: string; gap: number };

/** Une los audios en un WAV y devuelve además cuándo suena cada frase. */
async function unirWav(pistas: string[], huecos: number[]) {
  const ctx = new AudioContext();
  const buffers: AudioBuffer[] = [];
  for (const p of pistas) {
    const bin = Uint8Array.from(atob(p.split(",").pop()!), (c) => c.charCodeAt(0));
    buffers.push(await ctx.decodeAudioData(bin.buffer));
  }
  const sr = buffers[0]?.sampleRate ?? 22050;
  const total =
    buffers.reduce((n, b) => n + b.length, 0) +
    huecos.reduce((n, g) => n + Math.round(g * sr), 0);
  const out = new Float32Array(total);
  const tramos: { inicio: number; fin: number }[] = [];
  let pos = 0;
  buffers.forEach((b, i) => {
    const inicio = pos / sr;
    out.set(b.getChannelData(0), pos);
    pos += b.length + Math.round((huecos[i] ?? 0.4) * sr);
    tramos.push({ inicio, fin: pos / sr });
  });
  void ctx.close();

  const bytes = new DataView(new ArrayBuffer(44 + out.length * 2));
  const txt = (o: number, s: string) =>
    [...s].forEach((c, i) => bytes.setUint8(o + i, c.charCodeAt(0)));
  txt(0, "RIFF");
  bytes.setUint32(4, 36 + out.length * 2, true);
  txt(8, "WAVEfmt ");
  bytes.setUint32(16, 16, true);
  bytes.setUint16(20, 1, true);
  bytes.setUint16(22, 1, true);
  bytes.setUint32(24, sr, true);
  bytes.setUint32(28, sr * 2, true);
  bytes.setUint16(32, 2, true);
  bytes.setUint16(34, 16, true);
  txt(36, "data");
  bytes.setUint32(40, out.length * 2, true);
  for (let i = 0; i < out.length; i++) {
    const v = Math.max(-1, Math.min(1, out[i]!));
    bytes.setInt16(44 + i * 2, v * 32767, true);
  }
  const url = URL.createObjectURL(new Blob([bytes.buffer], { type: "audio/wav" }));
  return { url, tramos };
}

function Estudio() {
  const [tema, setTema] = useState("");
  const [minutos, setMinutos] = useState(15);
  const [escenas, setEscenas] = useState<Escena[]>([]);
  const [titulo, setTitulo] = useState("");
  const [armando, setArmando] = useState(false);
  const [narrando, setNarrando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [audioFinal, setAudioFinal] = useState<string | null>(null);
  const [tramos, setTramos] = useState<EscenaVideo[]>([]);
  const [animando, setAnimando] = useState(false);
  const [progVideo, setProgVideo] = useState(0);
  const [video, setVideo] = useState<string | null>(null);
  const [ajustes, setAjustes] = useState<Ajustes>(AJUSTES_BASE);
  const [mejora, setMejora] = useState("");
  const [refs, setRefs] = useState<Referencia[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lienzo = useRef<HTMLCanvasElement | null>(null);

  const pedirGuion = useServerFn(generarGuion);
  const pedirVoz = useServerFn(generarVoz);

  useEffect(() => setAjustes(cargarAjustes()), []);
  useEffect(() => {
    void cargarRefs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function enseniar() {
    if (!mejora.trim()) return;
    const r = aprender(ajustes, mejora.trim());
    setAjustes(r.ajustes);
    guardarAjustes(r.ajustes);
    setMejora("");
    toast.success(`Aprendido: ${r.cambios.join(" · ")}`);
  }

  async function armarGuion() {
    if (!tema.trim()) return;
    setArmando(true);
    setAudioFinal(null);
    setVideo(null);
    try {
      const r = await pedirGuion({ data: { tema: tema.trim(), minutos, ajustes } });
      setEscenas(r.escenas);
      setTitulo(r.titulo);
      toast.success(`Guion listo: ${r.escenas.length} frases, unos ${r.minutos} minutos`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No pude armar el guion");
    } finally {
      setArmando(false);
    }
  }

  async function narrar() {
    if (!escenas.length) return;
    setNarrando(true);
    setProgreso(0);
    setAudioFinal(null);
    setVideo(null);
    const pistas: string[] = [];
    try {
      for (let i = 0; i < escenas.length; i++) {
        const r = await pedirVoz({ data: { texto: escenas[i]!.txt.slice(0, 600) } });
        pistas.push(r.audio);
        setProgreso(Math.round(((i + 1) / escenas.length) * 100));
      }
      const { url, tramos: ts } = await unirWav(pistas, escenas.map((e) => e.gap));
      setAudioFinal(url);
      setTramos(ts.map((t, i) => ({ ...t, txt: escenas[i]?.txt ?? "" })));
      toast.success("Narración completa lista para escuchar y animar");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Se cortó la narración");
    } finally {
      setNarrando(false);
    }
  }

  async function animar() {
    if (!audioFinal || !lienzo.current) return;
    setAnimando(true);
    setProgVideo(0);
    setVideo(null);
    try {
      const ctx = new AudioContext();
      const datos = await (await fetch(audioFinal)).arrayBuffer();
      const buffer = await ctx.decodeAudioData(datos);
      void ctx.close();
      const url = await animarVideo({
        canvas: lienzo.current,
        audio: buffer,
        escenas: tramos,
        titulo: titulo || tema,
        onProgreso: setProgVideo,
      });
      setVideo(url);
      toast.success("Video animado listo");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No pude animar el video");
    } finally {
      setAnimando(false);
    }
  }

  async function cargarRefs() {
    try {
      const r = await fetch("/api/public/referencias");
      if (r.ok) setRefs((await r.json()) as Referencia[]);
    } catch {
      /* sin conexión: no pasa nada */
    }
  }

  async function subir(f: File | undefined) {
    if (!f) return;
    setSubiendo(true);
    try {
      const r = await fetch("/api/public/referencias", {
        method: "POST",
        headers: { "x-nombre": f.name, "x-tipo": f.type || "application/octet-stream" },
        body: f,
      });
      if (!r.ok) throw new Error("No se pudo guardar el archivo");
      await cargarRefs();
      toast.success("Archivo guardado en el proyecto");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No pude subir el archivo");
    } finally {
      setSubiendo(false);
    }
  }

  async function actualizar(id: string, cambio: Partial<Referencia>) {
    setRefs((prev) => prev.map((r) => (r.id === id ? { ...r, ...cambio } : r)));
    await fetch("/api/public/referencias", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...cambio }),
    });
    if (cambio.permanente) toast.success("Estilo guardado para siempre en el proyecto");
  }

  async function borrar(id: string) {
    setRefs((prev) => prev.filter((r) => r.id !== id));
    await fetch("/api/public/referencias", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  return (
    <main className="min-h-screen bg-background">
      <Toaster />
      <header className="mx-auto max-w-6xl px-6 pt-14 pb-6">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Estudio</p>
        <h1 className="mt-4 text-4xl leading-[1.05] font-semibold sm:text-5xl">
          Guion, voz y video animado, sin gastar créditos.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground">
          Escribí el tema y el estudio arma el guion, lo narra con la voz de siempre y lo
          convierte en video dibujado. Y si algo no te gusta, se lo escribís acá abajo y lo
          aprende para siempre.
        </p>
      </header>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 lg:grid-cols-[1fr_1fr]">
        <Card className="border-border/70 bg-card/70 p-5">
          <h2 className="text-lg font-semibold">1 · Tema del video</h2>
          <input
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            placeholder="Por ejemplo: El hundimiento del Titanic"
            className="mt-3 w-full rounded-md border border-border/70 bg-background/60 p-3 text-base"
          />
          <label className="mt-4 block text-sm text-muted-foreground">
            Duración deseada: {minutos} minutos
            <input
              type="range"
              min={3}
              max={40}
              value={minutos}
              onChange={(e) => setMinutos(Number(e.target.value))}
              className="mt-2 w-full"
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button className="h-11" disabled={armando} onClick={() => void armarGuion()}>
              {armando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Armar el guion
            </Button>
            <Button
              variant="secondary"
              className="h-11"
              disabled={!escenas.length || narrando}
              onClick={() => void narrar()}
            >
              {narrando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileAudio className="mr-2 h-4 w-4" />
              )}
              Generar la narración
            </Button>
            <Button
              variant="secondary"
              className="h-11"
              disabled={!audioFinal || animando}
              onClick={() => void animar()}
            >
              {animando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Film className="mr-2 h-4 w-4" />
              )}
              Animar el video
            </Button>
          </div>

          {narrando && (
            <p className="mt-3 text-sm text-muted-foreground">Narrando… {progreso}%</p>
          )}
          {animando && (
            <p className="mt-3 text-sm text-muted-foreground">
              Animando en tiempo real… {progVideo}%. Dejá esta pestaña abierta.
            </p>
          )}

          {audioFinal && (
            <div className="mt-4 space-y-3">
              <audio src={audioFinal} controls className="w-full" />
              <a href={audioFinal} download={`${titulo || "narracion"}.wav`}>
                <Button variant="ghost" className="h-10">
                  <Download className="mr-2 h-4 w-4" /> Descargar la narración
                </Button>
              </a>
            </div>
          )}

          {escenas.length > 0 && (
            <div className="mt-5 max-h-[45vh] space-y-2 overflow-y-auto border-t border-border/70 pt-4">
              {escenas.map((e, i) => (
                <textarea
                  key={i}
                  value={e.txt}
                  rows={2}
                  onChange={(ev) => {
                    const next = [...escenas];
                    next[i] = { ...e, txt: ev.target.value };
                    setEscenas(next);
                  }}
                  className="w-full rounded-md border border-border/60 bg-background/60 p-2 text-sm"
                />
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="border-border/70 bg-card/70 p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Brain className="h-5 w-5" /> 2 · Enseñarle a mejorar
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Escribí qué querés que haga mejor. Lo guarda y lo aplica en todos los guiones
              siguientes, sin gastar nada.
            </p>
            <textarea
              value={mejora}
              onChange={(e) => setMejora(e.target.value)}
              rows={3}
              placeholder="Ejemplos: más dramático · frases más cortas · menos preguntas · hablá más de la construcción · no menciones películas"
              className="mt-3 w-full rounded-md border border-border/70 bg-background/60 p-3 text-sm"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button className="h-10" onClick={enseniar}>
                Aplicar y recordar
              </Button>
              <Button
                variant="ghost"
                className="h-10"
                onClick={() => {
                  setAjustes(AJUSTES_BASE);
                  guardarAjustes(AJUSTES_BASE);
                  toast.success("Volvió al estilo base");
                }}
              >
                Volver al estilo base
              </Button>
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
              <li>Tensión: {ajustes.drama}</li>
              <li>Preguntas: {ajustes.preguntas}</li>
              <li>Datos: {ajustes.datos}</li>
              <li>Frases cortas: {ajustes.frasesCortas}</li>
              <li>Minutos extra: {ajustes.minutosExtra}</li>
              <li>Aprendizajes: {ajustes.notas.length}</li>
            </ul>
            {(ajustes.priorizar.length > 0 || ajustes.evitar.length > 0) && (
              <p className="mt-2 text-xs text-muted-foreground">
                {ajustes.priorizar.length > 0 && <>Prioriza: {ajustes.priorizar.join(", ")}. </>}
                {ajustes.evitar.length > 0 && <>Evita: {ajustes.evitar.join(", ")}.</>}
              </p>
            )}
          </Card>

          <Card className="border-border/70 bg-card/70 p-5">
            <h2 className="text-lg font-semibold">3 · El video animado</h2>
            <canvas
              ref={lienzo}
              className={`mt-3 w-full rounded-lg border border-border/70 bg-black ${
                animando ? "" : "hidden"
              }`}
            />
            {video ? (
              <div className="mt-3 space-y-3">
                <video src={video} controls playsInline className="w-full rounded-lg border border-border/70 bg-black" />
                <a href={video} download={`${titulo || "video"}.webm`}>
                  <Button variant="ghost" className="h-10">
                    <Download className="mr-2 h-4 w-4" /> Descargar el video
                  </Button>
                </a>
              </div>
            ) : (
              !animando && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Generá la narración y tocá “Animar el video”: se dibuja una escena distinta
                  para cada frase, con el estilo de siempre.
                </p>
              )
            )}
          </Card>

          <Card className="border-border/70 bg-card/70 p-5">
            <h2 className="text-lg font-semibold">4 · Material de referencia</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Subí un video o un audio, de cualquier peso. Queda guardado en el proyecto: con
              la opción activada lo puedo abrir y estudiar sin que lo mandes por mensaje, y si
              marcás “Guardar este estilo para siempre” ese estilo queda fijo en el proyecto.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="audio/*,video/*"
              className="hidden"
              onChange={(e) => subir(e.target.files?.[0])}
            />
            <Button className="mt-4 h-11" onClick={() => inputRef.current?.click()} disabled={subiendo}>
              {subiendo ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {subiendo ? "Subiendo…" : "Subir archivo"}
            </Button>

            <div className="mt-5 space-y-5">
              {refs.length === 0 && !subiendo && (
                <p className="text-sm text-muted-foreground">Todavía no subiste nada.</p>
              )}
              {refs.map((r) => (
                <div key={r.id} className="rounded-lg border border-border/70 p-3">
                  <p className="text-sm font-medium">{r.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {(r.bytes / 1048576).toFixed(1)} MB
                  </p>
                  {r.tipo.startsWith("audio") ? (
                    <audio src={`/api/public/referencias/${r.id}`} controls className="mt-3 w-full" />
                  ) : (
                    <video
                      src={`/api/public/referencias/${r.id}`}
                      controls
                      playsInline
                      className="mt-3 w-full rounded-lg border border-border/70 bg-black"
                    />
                  )}
                  <label className="mt-3 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={r.activo}
                      onChange={(e) => actualizar(r.id, { activo: e.target.checked })}
                    />
                    Activar para que lo vea y trabaje con él
                  </label>
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={r.permanente}
                      onChange={(e) => actualizar(r.id, { permanente: e.target.checked })}
                    />
                    Guardar este estilo para siempre en el proyecto
                  </label>
                  <textarea
                    rows={3}
                    defaultValue={r.notas}
                    onBlur={(e) => actualizar(r.id, { notas: e.target.value })}
                    placeholder="Qué querés de este material: el estilo de dibujo, el ritmo, la forma de contar…"
                    className="mt-3 w-full rounded-md border border-border/70 bg-background/60 p-3 text-sm"
                  />
                  <Button
                    variant="ghost"
                    className="mt-2 h-9 text-sm"
                    onClick={() => borrar(r.id)}
                  >
                    Quitar
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
