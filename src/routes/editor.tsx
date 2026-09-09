import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, Mic, Save, Square, Upload, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import {
  cargarFrases,
  generarVozFrase,
  guardarCorrecciones,
  listarGuiones,
} from "@/lib/edicion.functions";
import {
  ajustesDesdeExpresion,
  medirGrabacion,
  type AjusteVoz,
  type Expresion,
} from "@/lib/voz-imitada";

export const Route = createFileRoute("/editor")({
  head: () => ({
    meta: [
      { title: "Editor de voz sobre el video · frase por frase" },
      {
        name: "description",
        content:
          "Subí tu video, seguí la narración frase por frase en el minuto exacto, escuchá pruebas de voz y grabá tu propia forma de decirlo para que la narración te imite.",
      },
      { property: "og:title", content: "Editor de voz sobre el video" },
      {
        property: "og:description",
        content:
          "Editá el audio del video en el segundo exacto: prueba escrita o grabando tu propia voz.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Editor,
});

type Frase = { t0: number; t1: number; txt: string };

const reloj = (s: number) =>
  `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

export function Editor() {
  const [video, setVideo] = useState<string | null>(null);
  const [guiones, setGuiones] = useState<{ id: string; nombre: string }[]>([]);
  const [guion, setGuion] = useState("");
  const [frases, setFrases] = useState<Frase[]>([]);
  const [original, setOriginal] = useState<string[]>([]);
  const [actual, setActual] = useState(0);
  const [seguir, setSeguir] = useState(true);
  const [probando, setProbando] = useState<number | null>(null);
  const [pruebas, setPruebas] = useState<Record<number, string>>({});
  const [ajustes, setAjustes] = useState<Record<number, AjusteVoz>>({});
  const [expresion, setExpresion] = useState<Expresion | null>(null);
  const [grabando, setGrabando] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const filaRef = useRef<Record<number, HTMLDivElement | null>>({});
  const archivoRef = useRef<HTMLInputElement | null>(null);
  const grabadora = useRef<MediaRecorder | null>(null);
  const trozos = useRef<Blob[]>([]);

  const pedirVoz = useServerFn(generarVozFrase);
  const pedirFrases = useServerFn(cargarFrases);
  const pedirGuiones = useServerFn(listarGuiones);
  const pedirGuardar = useServerFn(guardarCorrecciones);

  useEffect(() => {
    void (async () => {
      try {
        const r = await pedirGuiones({});
        setGuiones(r);
        // Preferimos la narración de ritmo natural, la del video terminado.
        const elegido = r.find((g) => g.id.endsWith("_natural")) ?? r[0];
        if (elegido) void abrir(elegido.id);
      } catch {
        /* todavía no hay guiones guardados */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function abrir(id: string) {
    setGuion(id);
    try {
      const r = await pedirFrases({ data: { id } });
      setFrases(r);
      setOriginal(r.map((f) => f.txt));
      setPruebas({});
      setAjustes({});
      toast.success(`${r.length} frases listas para editar`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No pude abrir ese guion");
    }
  }

  /** Mientras el video corre, marca y trae a la vista la frase de ese segundo. */
  const seguirTiempo = useCallback(() => {
    const t = videoRef.current?.currentTime ?? 0;
    let i = frases.findIndex((f) => t >= f.t0 && t < f.t1);
    if (i === -1) i = Math.max(0, frases.findIndex((f) => f.t0 > t) - 1);
    if (i !== -1 && i !== actual) {
      setActual(i);
      if (seguir) filaRef.current[i]?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [frases, actual, seguir]);

  function irA(i: number) {
    setActual(i);
    if (videoRef.current) videoRef.current.currentTime = frases[i]!.t0;
  }

  async function probar(i: number, imitar?: AjusteVoz | null) {
    setProbando(i);
    try {
      const r = await pedirVoz({ data: { texto: frases[i]!.txt.slice(0, 600), imitar: imitar ?? null } });
      setPruebas((p) => ({ ...p, [i]: r.audio }));
      new Audio(r.audio).play().catch(() => undefined);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No pude generar la prueba");
    } finally {
      setProbando(null);
    }
  }

  async function grabar(i: number) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      trozos.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => e.data.size && trozos.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setGrabando(null);
        try {
          const blob = new Blob(trozos.current, { type: mr.mimeType });
          const e = await medirGrabacion(blob, frases[i]!.txt);
          const a = ajustesDesdeExpresion(e);
          setExpresion(e);
          setAjustes((prev) => ({ ...prev, [i]: a }));
          toast.success("Escuché tu forma de decirlo. Generando la voz que te imita…");
          await probar(i, a);
        } catch {
          toast.error("No pude escuchar bien la grabación, probá de nuevo");
        }
      };
      grabadora.current = mr;
      mr.start();
      setGrabando(i);
      videoRef.current?.pause();
    } catch {
      toast.error("No pude usar el micrófono. Dale permiso al navegador.");
    }
  }

  async function guardar() {
    const cambios = frases
      .map((f, i) => ({ f, i }))
      .filter(({ f, i }) => f.txt !== original[i] || ajustes[i])
      .map(({ f, i }) => ({ indice: i, t0: f.t0, texto: f.txt, ajustes: ajustes[i] ?? null }));
    if (!cambios.length) {
      toast.info("Todavía no cambiaste ninguna frase");
      return;
    }
    setGuardando(true);
    try {
      const r = await pedirGuardar({ data: { id: guion, correcciones: cambios } });
      toast.success(`Guardé ${r.total} correcciones para rearmar el video`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No pude guardar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Toaster />
      <header className="mx-auto max-w-6xl px-6 pt-14 pb-6">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Editor</p>
        <h1 className="mt-4 text-4xl leading-[1.05] font-semibold sm:text-5xl">
          Subí el video y corregí la voz en el segundo exacto.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground">
          La lista de abajo sigue al video: cuando pausás, la frase de ese minuto queda
          marcada sola. Podés escribirla de nuevo y escuchar la prueba, o grabar tu propia voz
          diciéndola como querés que suene, y la narración te imita.{" "}
          <Link to="/estudio" className="underline">
            Ir al estudio
          </Link>
        </p>
      </header>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 lg:grid-cols-[1.1fr_1fr]">
        <Card className="border-border/70 bg-card/70 p-5">
          <h2 className="text-lg font-semibold">1 · Tu video</h2>
          <input
            ref={archivoRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setVideo(URL.createObjectURL(f));
            }}
          />
          <Button className="mt-3 h-11" onClick={() => archivoRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Subir el video
          </Button>

          {video ? (
            <video
              ref={videoRef}
              src={video}
              controls
              playsInline
              onTimeUpdate={seguirTiempo}
              onSeeked={seguirTiempo}
              onPause={seguirTiempo}
              className="mt-4 w-full rounded-lg border border-border/70 bg-black"
            />
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Elegí el video terminado; queda solo en tu navegador.
            </p>
          )}

          {guiones.length > 0 && (
            <label className="mt-5 block text-sm text-muted-foreground">
              Narración de este video
              <select
                value={guion}
                onChange={(e) => void abrir(e.target.value)}
                className="mt-2 w-full rounded-md border border-border/70 bg-background/60 p-2 text-sm"
              >
                {guiones.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={seguir} onChange={(e) => setSeguir(e.target.checked)} />
            Que la lista siga sola al video
          </label>

          {expresion && (
            <p className="mt-4 text-xs text-muted-foreground">
              Última grabación tuya: {expresion.duracion}s · {expresion.velocidad} sílabas por
              segundo · expresión {Math.round(expresion.variacion * 100)}% · fuerza{" "}
              {Math.round(expresion.energia * 100)}%
            </p>
          )}

          <Button
            variant="secondary"
            className="mt-4 h-11"
            disabled={guardando || !frases.length}
            onClick={() => void guardar()}
          >
            {guardando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Aprobar y guardar los cambios
          </Button>
        </Card>

        <Card className="border-border/70 bg-card/70 p-5">
          <h2 className="text-lg font-semibold">2 · Frase por frase</h2>
          {frases.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Todavía no hay narración cargada en el proyecto.
            </p>
          ) : (
            <div className="mt-3 max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {frases.map((f, i) => (
                <div
                  key={i}
                  ref={(el) => {
                    filaRef.current[i] = el;
                  }}
                  className={`rounded-lg border p-3 transition ${
                    i === actual
                      ? "border-primary bg-primary/10"
                      : "border-border/60 bg-background/40"
                  }`}
                >
                  <button
                    onClick={() => irA(i)}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Frase {i + 1} · {reloj(f.t0)}
                  </button>
                  <textarea
                    rows={2}
                    value={f.txt}
                    onChange={(e) => {
                      const next = [...frases];
                      next[i] = { ...f, txt: e.target.value };
                      setFrases(next);
                    }}
                    className="mt-2 w-full rounded-md border border-border/60 bg-background/60 p-2 text-sm"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Button
                      variant="ghost"
                      className="h-9 text-sm"
                      disabled={probando === i}
                      onClick={() => void probar(i, ajustes[i])}
                    >
                      {probando === i ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Volume2 className="mr-2 h-4 w-4" />
                      )}
                      Audio de prueba
                    </Button>
                    {grabando === i ? (
                      <Button
                        variant="ghost"
                        className="h-9 text-sm"
                        onClick={() => grabadora.current?.stop()}
                      >
                        <Square className="mr-2 h-4 w-4" /> Listo, imitame
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        className="h-9 text-sm"
                        onClick={() => void grabar(i)}
                      >
                        <Mic className="mr-2 h-4 w-4" /> Decirlo con mi voz
                      </Button>
                    )}
                    {f.txt !== original[i] && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Check className="h-3 w-3" /> cambiada
                      </span>
                    )}
                  </div>
                  {pruebas[i] && <audio src={pruebas[i]} controls className="mt-2 w-full" />}
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </main>
  );
}
