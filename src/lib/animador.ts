/**
 * MOTOR DE ANIMACIÓN GRATIS
 *
 * Dibuja cada escena del guion con el estilo de siempre —trazo negro grueso,
 * colores planos vivos, papel cálido— y la mueve al ritmo de la narración.
 * Todo pasa dentro del navegador: no usa servidores de imágenes ni créditos.
 */

export type EscenaVideo = { txt: string; inicio: number; fin: number };

const PALETA = {
  papel: "#F6EFE2",
  tinta: "#141210",
  rojo: "#D64545",
  azul: "#2F6DB5",
  celeste: "#8FC7E8",
  amarillo: "#F2B33D",
  verde: "#4E9A6B",
  naranja: "#E1783C",
  crema: "#FBF6EC",
};

/** Números estables por escena: el mismo texto dibuja siempre lo mismo. */
function rnd(semilla: number) {
  let s = semilla || 1;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function semillaDe(t: string) {
  let s = 7;
  for (const c of t) s = (s * 31 + c.charCodeAt(0)) % 1000000;
  return s;
}

type Motivo =
  | "barco" | "mar" | "hielo" | "ciudad" | "montania" | "guerra"
  | "gente" | "avion" | "cohete" | "documento" | "reloj" | "mapa" | "fuego";

const CLAVES: [Motivo, RegExp][] = [
  ["barco", /barco|buque|nav[ií]o|transatl|puerto|zarp|flota|titan|hundi/i],
  ["hielo", /hielo|iceberg|glaciar|polar|ant[áa]rtid|fr[íi]o/i],
  ["mar", /mar|oc[ée]ano|agua|ola|costa|r[íi]o|isla/i],
  ["guerra", /guerra|batalla|ej[ée]rcito|soldado|bomba|invasi|conquist|arma|ataque/i],
  ["fuego", /incendio|fuego|explos|llama|volc[áa]n|quem/i],
  ["cohete", /cohete|espacio|luna|nasa|sat[ée]lite|apolo|astronaut/i],
  ["avion", /avi[óo]n|vuelo|aire|piloto|aviaci/i],
  ["ciudad", /ciudad|edificio|f[áa]brica|urban|torre|puente|construc/i],
  ["montania", /monta[ñn]a|cordiller|selva|bosque|desierto|valle/i],
  ["documento", /ley|tratado|informe|contrato|carta|documento|investigaci|juicio|comisi/i],
  ["reloj", /a[ñn]o|hora|minuto|tiempo|noche|madrugada|d[íi]a|siglo/i],
  ["mapa", /pa[íi]s|imperio|regi[óo]n|frontera|ruta|viaje|mapa|territorio/i],
  ["gente", /pasajero|persona|gente|familia|ni[ñn]o|mujer|hombre|tripul|pueblo|multitud/i],
];

function motivoDe(txt: string): Motivo {
  for (const [m, re] of CLAVES) if (re.test(txt)) return m;
  return "gente";
}

/* ------------------------------------------------------------------ */
/* Dibujo                                                              */
/* ------------------------------------------------------------------ */

type Ctx = CanvasRenderingContext2D;

function trazo(c: Ctx, ancho = 7) {
  c.strokeStyle = PALETA.tinta;
  c.lineWidth = ancho;
  c.lineJoin = "round";
  c.lineCap = "round";
}

function figura(c: Ctx, path: () => void, color: string, ancho = 7) {
  c.beginPath();
  path();
  c.closePath();
  c.fillStyle = color;
  c.fill();
  trazo(c, ancho);
  c.stroke();
}

function fondo(c: Ctx, w: number, h: number, alto: string, bajo: string) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, alto);
  g.addColorStop(1, bajo);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
}

function sol(c: Ctx, x: number, y: number, r: number, color: string) {
  figura(c, () => c.arc(x, y, r, 0, Math.PI * 2), color, 6);
}

function olas(c: Ctx, w: number, h: number, y: number, t: number, color: string) {
  c.beginPath();
  c.moveTo(0, h);
  c.lineTo(0, y);
  for (let x = 0; x <= w; x += 20) {
    c.lineTo(x, y + Math.sin(x / 90 + t * 1.5) * 12 + Math.sin(x / 37 - t) * 5);
  }
  c.lineTo(w, h);
  c.closePath();
  c.fillStyle = color;
  c.fill();
  trazo(c, 6);
  c.stroke();
}

function persona(c: Ctx, x: number, y: number, s: number, color: string) {
  figura(c, () => c.arc(x, y - s * 1.5, s * 0.45, 0, Math.PI * 2), PALETA.crema, 5);
  figura(
    c,
    () => {
      c.moveTo(x - s * 0.55, y + s);
      c.lineTo(x - s * 0.42, y - s * 0.9);
      c.lineTo(x + s * 0.42, y - s * 0.9);
      c.lineTo(x + s * 0.55, y + s);
    },
    color,
    5,
  );
}

function dibujarMotivo(c: Ctx, m: Motivo, w: number, h: number, t: number, r: () => number) {
  switch (m) {
    case "barco":
    case "mar":
    case "hielo": {
      fondo(c, w, h, m === "hielo" ? "#DCEEF7" : "#CFE6F5", PALETA.crema);
      sol(c, w * 0.78, h * 0.22, 70, m === "hielo" ? "#F7E9C8" : PALETA.amarillo);
      olas(c, w, h, h * 0.62, t, PALETA.celeste);
      if (m === "hielo") {
        figura(
          c,
          () => {
            c.moveTo(w * 0.18, h * 0.66);
            c.lineTo(w * 0.3, h * 0.24);
            c.lineTo(w * 0.42, h * 0.66);
          },
          "#EAF6FF",
        );
      }
      const bx = w * (0.35 + Math.sin(t * 0.4) * 0.03);
      const by = h * 0.6 + Math.sin(t * 1.2) * 8;
      figura(
        c,
        () => {
          c.moveTo(bx - 190, by - 40);
          c.lineTo(bx + 200, by - 40);
          c.lineTo(bx + 150, by + 40);
          c.lineTo(bx - 140, by + 40);
        },
        PALETA.tinta === "" ? PALETA.rojo : "#2B2B33",
      );
      figura(
        c,
        () => c.rect(bx - 120, by - 100, 260, 60),
        PALETA.crema,
      );
      for (let i = 0; i < 3; i++) {
        figura(c, () => c.rect(bx - 70 + i * 80, by - 190, 34, 92), PALETA.amarillo, 5);
      }
      olas(c, w, h, h * 0.78, t + 1.3, "#7FB9DE");
      break;
    }
    case "guerra":
    case "fuego": {
      fondo(c, w, h, m === "fuego" ? "#F6D6B8" : "#E7D7C2", PALETA.crema);
      sol(c, w * 0.2, h * 0.24, 60, PALETA.naranja);
      for (let i = 0; i < 6; i++) {
        const x = w * (0.12 + i * 0.14);
        const alto = h * (0.18 + r() * 0.2);
        figura(c, () => c.rect(x, h * 0.72 - alto, 90, alto), i % 2 ? PALETA.rojo : "#8A5A3B");
      }
      for (let i = 0; i < 7; i++) {
        const fx = w * (0.15 + i * 0.11);
        const fh = 70 + Math.sin(t * 4 + i) * 30;
        figura(
          c,
          () => {
            c.moveTo(fx, h * 0.72);
            c.quadraticCurveTo(fx + 30, h * 0.72 - fh, fx + 55, h * 0.72);
          },
          i % 2 ? PALETA.naranja : PALETA.amarillo,
          5,
        );
      }
      figura(c, () => c.rect(0, h * 0.72, w, h * 0.28), "#B98A5E", 6);
      break;
    }
    case "cohete":
    case "avion": {
      fondo(c, w, h, "#12203C", "#3A5C8C");
      for (let i = 0; i < 40; i++) {
        c.fillStyle = "#FDF6DF";
        c.fillRect((r() * w) | 0, (r() * h * 0.7) | 0, 3, 3);
      }
      sol(c, w * 0.8, h * 0.25, 55, "#F4EAC4");
      const sube = m === "cohete" ? h * 0.72 - ((t * 60) % (h * 0.7)) : h * 0.45;
      const px = m === "cohete" ? w * 0.4 : w * (0.15 + ((t * 0.12) % 1) * 0.7);
      figura(
        c,
        () => {
          c.moveTo(px, sube - 90);
          c.lineTo(px + 45, sube + 60);
          c.lineTo(px - 45, sube + 60);
        },
        PALETA.crema,
      );
      figura(c, () => c.arc(px, sube, 20, 0, Math.PI * 2), PALETA.celeste, 5);
      figura(
        c,
        () => {
          c.moveTo(px - 45, sube + 60);
          c.lineTo(px, sube + 60 + 60 + Math.sin(t * 12) * 15);
          c.lineTo(px + 45, sube + 60);
        },
        PALETA.naranja,
        5,
      );
      break;
    }
    case "ciudad": {
      fondo(c, w, h, "#F3DFC0", PALETA.crema);
      sol(c, w * 0.16, h * 0.2, 62, PALETA.amarillo);
      const colores = [PALETA.rojo, PALETA.azul, PALETA.verde, PALETA.naranja];
      for (let i = 0; i < 7; i++) {
        const bw = 120 + r() * 60;
        const bh = h * (0.2 + r() * 0.42);
        const x = 40 + i * (w / 7.4);
        figura(c, () => c.rect(x, h * 0.8 - bh, bw, bh), colores[i % 4]!);
        for (let k = 0; k < 4; k++) {
          c.fillStyle = PALETA.crema;
          c.fillRect(x + 20, h * 0.8 - bh + 24 + k * 46, bw - 60, 26);
        }
      }
      figura(c, () => c.rect(0, h * 0.8, w, h * 0.2), "#C7A97C", 6);
      break;
    }
    case "montania":
    case "mapa": {
      fondo(c, w, h, "#CBE3C2", PALETA.crema);
      sol(c, w * 0.75, h * 0.2, 58, PALETA.amarillo);
      const picos = [
        [0.1, 0.3, PALETA.verde],
        [0.38, 0.2, "#3C7A56"],
        [0.68, 0.32, PALETA.verde],
      ] as const;
      picos.forEach(([px, py, col]) => {
        figura(
          c,
          () => {
            c.moveTo(w * px - 180, h * 0.78);
            c.lineTo(w * px, h * py);
            c.lineTo(w * px + 200, h * 0.78);
          },
          col,
        );
      });
      figura(c, () => c.rect(0, h * 0.78, w, h * 0.22), "#D8C08D", 6);
      break;
    }
    case "documento":
    case "reloj": {
      fondo(c, w, h, "#EFE3CD", PALETA.crema);
      if (m === "reloj") {
        const cx = w * 0.5;
        const cy = h * 0.48;
        figura(c, () => c.arc(cx, cy, 150, 0, Math.PI * 2), PALETA.crema);
        c.beginPath();
        c.moveTo(cx, cy);
        c.lineTo(cx + Math.cos(t) * 100, cy + Math.sin(t) * 100);
        trazo(c, 8);
        c.stroke();
        c.beginPath();
        c.moveTo(cx, cy);
        c.lineTo(cx + Math.cos(t * 0.2) * 65, cy + Math.sin(t * 0.2) * 65);
        trazo(c, 10);
        c.stroke();
      } else {
        figura(c, () => c.rect(w * 0.32, h * 0.2, w * 0.36, h * 0.6), PALETA.crema);
        for (let i = 0; i < 8; i++) {
          c.fillStyle = "#C9BBA4";
          c.fillRect(w * 0.36, h * 0.28 + i * 44, w * 0.28 - (i % 3) * 40, 14);
        }
      }
      break;
    }
    default: {
      fondo(c, w, h, "#F0DDC8", PALETA.crema);
      sol(c, w * 0.82, h * 0.22, 60, PALETA.amarillo);
      const colores = [PALETA.rojo, PALETA.azul, PALETA.verde, PALETA.naranja];
      for (let i = 0; i < 5; i++) {
        const x = w * (0.18 + i * 0.16);
        persona(c, x, h * 0.72 + Math.sin(t * 2 + i) * 6, 70, colores[i % 4]!);
      }
      figura(c, () => c.rect(0, h * 0.76, w, h * 0.24), "#C9A87C", 6);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Render + grabación                                                  */
/* ------------------------------------------------------------------ */

function textoCentrado(c: Ctx, txt: string, w: number, y: number, size: number, max: number) {
  c.font = `800 ${size}px system-ui, sans-serif`;
  c.textAlign = "center";
  const palabras = txt.split(" ");
  const lineas: string[] = [];
  let linea = "";
  for (const p of palabras) {
    const prueba = linea ? `${linea} ${p}` : p;
    if (c.measureText(prueba).width > max && linea) {
      lineas.push(linea);
      linea = p;
    } else linea = prueba;
  }
  if (linea) lineas.push(linea);
  lineas.slice(0, 3).forEach((l, i) => {
    const yy = y + i * (size * 1.15);
    c.lineWidth = 10;
    c.strokeStyle = PALETA.crema;
    c.strokeText(l, w / 2, yy);
    c.fillStyle = PALETA.tinta;
    c.fillText(l, w / 2, yy);
  });
}

export type OpcionesVideo = {
  canvas: HTMLCanvasElement;
  audio: AudioBuffer;
  escenas: EscenaVideo[];
  titulo: string;
  onProgreso?: (pct: number) => void;
};

/**
 * Reproduce la narración y graba el dibujo animado al mismo tiempo.
 * Devuelve la URL del video listo para ver y descargar.
 */
export async function animarVideo(o: OpcionesVideo): Promise<string> {
  const W = 1280;
  const H = 720;
  o.canvas.width = W;
  o.canvas.height = H;
  const c = o.canvas.getContext("2d")!;

  const ctx = new AudioContext();
  const destino = ctx.createMediaStreamDestination();
  const fuente = ctx.createBufferSource();
  fuente.buffer = o.audio;
  fuente.connect(destino);
  fuente.connect(ctx.destination);

  const stream = o.canvas.captureStream(30);
  destino.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));

  const tipo = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
    ? "video/webm;codecs=vp9,opus"
    : "video/webm";
  const rec = new MediaRecorder(stream, { mimeType: tipo, videoBitsPerSecond: 3_500_000 });
  const trozos: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && trozos.push(e.data);

  const dur = o.audio.duration;
  const inicio = ctx.currentTime + 0.15;
  rec.start(1000);
  fuente.start(inicio);

  await new Promise<void>((resolve) => {
    let idx = 0;
    const paso = () => {
      const t = Math.max(0, ctx.currentTime - inicio);
      const esc = o.escenas;
      while (idx < esc.length - 1 && t > esc[idx]!.fin) idx++;
      const actual = esc[idx] ?? { txt: o.titulo, inicio: 0, fin: dur };
      const local = t - actual.inicio;
      const largo = Math.max(0.6, actual.fin - actual.inicio);
      const avance = Math.min(1, local / largo);

      const r = rnd(semillaDe(actual.txt));
      const zoom = 1.05 + avance * 0.08;
      const desl = (avance - 0.5) * 40;

      c.save();
      c.fillStyle = PALETA.papel;
      c.fillRect(0, 0, W, H);
      c.translate(W / 2 + desl, H / 2);
      c.scale(zoom, zoom);
      c.translate(-W / 2, -H / 2);
      dibujarMotivo(c, motivoDe(actual.txt), W, H, t, r);
      c.restore();

      // marco de papel y bajada de texto sólo en los títulos fuertes
      if (/^LA HISTORIA COMPLETA/.test(actual.txt) || t < 3) {
        c.globalAlpha = Math.min(1, 1.4 - Math.abs(avance - 0.5));
        textoCentrado(
          c,
          /^LA HISTORIA COMPLETA/.test(actual.txt) ? actual.txt.replace(/\.$/, "") : o.titulo,
          W,
          H * 0.5,
          62,
          W * 0.8,
        );
        c.globalAlpha = 1;
      }

      // viñeta cálida
      const g = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(40,25,10,0.28)");
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);

      o.onProgreso?.(Math.min(99, Math.round((t / dur) * 100)));
      if (t >= dur) {
        resolve();
        return;
      }
      requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  });

  await new Promise((r) => setTimeout(r, 400));
  const blob = await new Promise<Blob>((resolve) => {
    rec.onstop = () => resolve(new Blob(trozos, { type: "video/webm" }));
    rec.stop();
  });
  try {
    fuente.stop();
  } catch {
    /* ya terminó */
  }
  void ctx.close();
  o.onProgreso?.(100);
  return URL.createObjectURL(blob);
}
