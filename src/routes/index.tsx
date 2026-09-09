import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Film, Loader2, Play, RotateCcw, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { generarFrase, pedirVideoFinal } from "@/lib/narracion.functions";
import marcas from "@/lib/marcas.json";
import videoAsset from "@/assets/alunizaje.mp4.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "El alunizaje — editor de frases y voz" },
      {
        name: "description",
        content:
          "Mirá el documental del alunizaje, andá al segundo exacto de cada frase, reescribila y generá otra vez la voz hasta que la pronunciación quede bien.",
      },
      { property: "og:title", content: "El alunizaje — editor de frases y voz" },
      {
        property: "og:description",
        content: "Corregí frase por frase el texto y la voz del documental del alunizaje.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EditorPage,
});

type Marca = { t0: number; t1: number; txt: string };
type Correccion = { texto: string };

const LS = "correcciones-alunizaje";

function mmss(s: number) {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function EditorPage() {
  const lista = marcas as Marca[];
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activa, setActiva] = useState(0);
  const [t, setT] = useState(0);
  const [texto, setTexto] = useState(lista[0]?.txt ?? "");
  const [enviando, setEnviando] = useState(false);
  const [prueba, setPrueba] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [aprobadas, setAprobadas] = useState<Record<number, Correccion>>({});
  const sintetizar = useServerFn(generarFrase);
  const enviarPedido = useServerFn(pedirVideoFinal);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS);
      if (raw) setAprobadas(JSON.parse(raw) as Record<number, Correccion>);
    } catch {
      /* sin correcciones guardadas */
    }
  }, []);

  function guardar(next: Record<number, Correccion>) {
    setAprobadas(next);
    localStorage.setItem(LS, JSON.stringify(next));
  }

  function abrir(i: number) {
    setActiva(i);
    setPrueba(null);
    const guardada = aprobadas[i];
    setTexto(guardada?.texto ?? lista[i]?.txt ?? "");
    const v = videoRef.current;
    if (v) {
      v.currentTime = Math.max(0, (lista[i]?.t0 ?? 0) - 0.2);
      void v.play();
    }
  }

  async function generar() {
    if (!texto.trim()) return;
    setCargando(true);
    setPrueba(null);
    try {
      const r = await sintetizar({ data: { texto: texto.trim() } });
      setPrueba(r.audio);
      toast.success("Voz generada: escuchala antes de aprobar");
    } catch {
      toast.error("No se pudo generar la voz. Probá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  function aprobar() {
    guardar({ ...aprobadas, [activa]: { texto: texto.trim() } });
    toast.success(`Frase ${activa + 1} aprobada`);
  }

  function descartar() {
    const next = { ...aprobadas };
    delete next[activa];
    guardar(next);
    setTexto(lista[activa]?.txt ?? "");
    setPrueba(null);
  }

  const enCurso = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < lista.length; i++) if (t >= (lista[i]?.t0 ?? 0)) idx = i;
    return idx;
  }, [t, lista]);

  const totalAprobadas = Object.keys(aprobadas).length;

  async function empezar() {
    if (!totalAprobadas) return;
    setEnviando(true);
    try {
      await enviarPedido({
        data: {
          correcciones: Object.entries(aprobadas).map(([i, c]) => ({
            indice: Number(i),
            texto: c.texto,
          })),
        },
      });
      toast.success(
        `Pedido enviado con ${totalAprobadas} frase(s). Avisame en el chat y te devuelvo el video final.`,
      );
    } catch {
      toast.error("No se pudo enviar el pedido. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Toaster />
      <header className="mx-auto max-w-6xl px-6 pt-14 pb-6">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
          El alunizaje · volumen 1
        </p>
        <h1 className="mt-4 text-4xl leading-[1.05] font-semibold sm:text-5xl">
          Corregí una frase y volvé a generar su voz.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground">
          Elegí la frase de la lista: el video salta a ese segundo. Reescribí el texto,
          generá la voz, escuchala y aprobala. Cuando termines de aprobar, avisame en el
          chat y rearmo el video completo con esas correcciones.
        </p>
        <Link to="/estudio" className="mt-5 inline-block">
          <Button variant="secondary" className="h-11">
            Ir al estudio: guion y voz nuevos
          </Button>
        </Link>
      </header>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
          <video
            ref={videoRef}
            src={videoAsset.url}
            controls
            playsInline
            preload="metadata"
            onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
            className="w-full rounded-lg border border-border/70 bg-black"
          />
          <p className="text-xs text-muted-foreground">
            {mmss(t)} · sonando la frase {enCurso + 1} de {lista.length} ·{" "}
            {totalAprobadas} correcciones aprobadas
          </p>

          <Card className="border-border/70 bg-card/70 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Frase {activa + 1} · {mmss(lista[activa]?.t0 ?? 0)}
            </p>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-md border border-border/70 bg-background/60 p-3 text-base leading-relaxed"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Para que pronuncie bien en inglés, escribilo como suena: Quénedi, Ármstrong,
              Washintong. Las fechas y los años, en cifras.
            </p>

            <p className="mt-2 text-xs text-muted-foreground">
              La voz sale con la misma entonación, velocidad y calidad que el video: no
              hay nada que ajustar.
            </p>


            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => void generar()} disabled={cargando} className="h-11">
                {cargando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Volume2 className="mr-2 h-4 w-4" />
                )}
                Generar la voz
              </Button>
              <Button
                variant="ghost"
                className="h-11"
                disabled={!prueba}
                onClick={() => void audioRef.current?.play()}
              >
                <Play className="mr-2 h-4 w-4" /> Escuchar
              </Button>
              <Button variant="ghost" className="h-11" disabled={!prueba} onClick={aprobar}>
                <Check className="mr-2 h-4 w-4" /> Aprobar
              </Button>
              <Button variant="ghost" className="h-11" onClick={descartar}>
                <RotateCcw className="mr-2 h-4 w-4" /> Volver al original
              </Button>
            </div>
            {prueba && <audio ref={audioRef} src={prueba} controls className="mt-4 w-full" />}

            <div className="mt-6 border-t border-border/70 pt-5">
              <p className="text-sm text-muted-foreground">
                {totalAprobadas} frase(s) aprobada(s). El video final mantiene el mismo
                ritmo y las mismas transiciones: solo se alarga lo justo si la frase dura
                un poco más.
              </p>
              <Button
                className="mt-3 h-11"
                disabled={!totalAprobadas || enviando}
                onClick={() => void empezar()}
              >
                {enviando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Film className="mr-2 h-4 w-4" />
                )}
                Empezar a generar el video final
              </Button>
            </div>
          </Card>
        </div>

        <Card className="max-h-[70vh] overflow-y-auto border-border/70 bg-card/60 p-2">
          {lista.map((m, i) => (
            <button
              key={i}
              onClick={() => abrir(i)}
              className={`block w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                i === activa
                  ? "bg-primary/15 text-foreground"
                  : "text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <span className="mr-2 text-xs tabular-nums text-primary">{mmss(m.t0)}</span>
              {aprobadas[i] ? aprobadas[i].texto : m.txt}
              {aprobadas[i] && <Check className="ml-2 inline h-3 w-3 text-primary" />}
            </button>
          ))}
        </Card>
      </section>
    </main>
  );
}
