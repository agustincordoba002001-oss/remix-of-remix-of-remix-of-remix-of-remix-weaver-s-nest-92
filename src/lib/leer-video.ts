/**
 * Lee el audio del video que sube el usuario, en su propio navegador y gratis.
 * Ahora funciona para cualquier duración: no carga todo el audio de una vez,
 * sino que lo escucha mientras el video reproduce, y graba pedacitos cuando
 * hace falta transcribir.
 */
export type Tramo = { t0: number; t1: number };

/** Indica si el navegador puede leer el audio del video en tiempo real. */
export function soportaLecturaVideo(video: HTMLVideoElement): boolean {
  return typeof (video as unknown as { captureStream?: () => MediaStream }).captureStream ===
    "function";
}

/**
 * Escucha el video completo, encuentra dónde habla y dónde calla, y devuelve
 * un tramo por cada frase. No importa cuánto dure el video: nunca guarda todo
 * el sonido en memoria.
 */
export async function leerTramos(
  video: HTMLVideoElement,
  avisar?: (p: number) => void,
): Promise<{ duracion: number; tramos: Tramo[] }> {
  const capture = (video as unknown as { captureStream?: () => MediaStream }).captureStream;
  if (typeof capture !== "function") {
    throw new Error(
      "Este navegador no permite leer el audio del video. Usá Chrome, Edge o Firefox.",
    );
  }

  const stream = capture.call(video);
  const audioTracks = stream.getAudioTracks();
  if (!audioTracks.length) {
    throw new Error("El video que subiste no tiene sonido");
  }

  const audioStream = new MediaStream(audioTracks);
  const ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(audioStream);
  const processor = ctx.createScriptProcessor(4096, 1, 1);

  const energias: number[] = [];
  const paso = processor.bufferSize;
  const sr = ctx.sampleRate;

  processor.onaudioprocess = (e) => {
    const data = e.inputBuffer.getChannelData(0);
    let s = 0;
    for (let i = 0; i < data.length; i++) s += data[i]! * data[i]!;
    energias.push(Math.sqrt(s / data.length));
  };

  src.connect(processor);
  processor.connect(ctx.destination);

  // Reproducimos rápido para no hacer esperar, pero sin pasarnos de lo que
  // aguante el navegador. Si falla, volvemos a 1x.
  const velocidad = Math.min(3, video.playbackRate || 1);
  video.muted = true;
  video.playbackRate = velocidad;

  await video.play().catch(() => {
    throw new Error("No pude reproducir el video. Probá de nuevo después de subirlo.");
  });

  return new Promise((resolve, reject) => {
    const limpiar = () => {
      clearInterval(poll);
      void ctx.close();
      processor.disconnect();
      src.disconnect();
      stream.getTracks().forEach((t) => t.stop());
    };

    const poll = setInterval(() => {
      const dur = video.duration || 0;
      if (dur > 0) avisar?.(Math.min(0.99, video.currentTime / dur));

      if (video.ended || video.paused) {
        limpiar();
        const duracion = video.duration || (energias.length * paso) / sr;
        const tramos = detectarTramos(energias, sr, paso);
        avisar?.(1);
        resolve({ duracion, tramos });
      }
    }, 250);

    video.addEventListener(
      "error",
      () => {
        limpiar();
        reject(new Error("El video se cortó mientras lo leía. Probá con otro formato."));
      },
      { once: true },
    );
  });
}

function detectarTramos(energias: number[], sr: number, paso: number): Tramo[] {
  const orden = [...energias].sort((a, b) => a - b);
  const piso = orden[Math.floor(orden.length * 0.2)] ?? 0;
  const techo = orden[Math.floor(orden.length * 0.95)] ?? 1;
  const umbral = piso + (techo - piso) * 0.18;

  const MIN_SILENCIO = 14; // ~0,28 s
  const MIN_FRASE = 40; // ~0,8 s
  const tramos: Tramo[] = [];
  let inicio: number | null = null;
  let callado = 0;

  energias.forEach((e, i) => {
    if (e > umbral) {
      if (inicio === null) inicio = i;
      callado = 0;
    } else if (inicio !== null) {
      callado++;
      if (callado >= MIN_SILENCIO) {
        const fin = i - callado;
        if (fin - inicio >= MIN_FRASE)
          tramos.push({ t0: (inicio * paso) / sr, t1: (fin * paso) / sr });
        inicio = null;
        callado = 0;
      }
    }
  });
  if (inicio !== null)
    tramos.push({ t0: (inicio * paso) / sr, t1: (energias.length * paso) / sr });

  return tramos;
}

/** Graba un pedazo del video y lo devuelve como WAV en base64. */
export async function pedazoWavBase64(
  video: HTMLVideoElement,
  t0: number,
  t1: number,
): Promise<string> {
  const capture = (video as unknown as { captureStream?: () => MediaStream }).captureStream;
  if (typeof capture !== "function") {
    throw new Error("Este navegador no puede grabar un pedazo del video.");
  }

  const stream = capture.call(video);
  const audioTracks = stream.getAudioTracks();
  if (!audioTracks.length) throw new Error("El video no tiene sonido");

  const audioStream = new MediaStream(audioTracks);
  const mime =
    MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";
  if (!mime) throw new Error("Este navegador no puede grabar audio del video.");

  const recorder = new MediaRecorder(audioStream, { mimeType: mime });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    const limpiar = () => {
      stream.getTracks().forEach((t) => t.stop());
    };

    recorder.onstop = async () => {
      try {
        const blob = new Blob(chunks, { type: recorder.mimeType });
        const wav = await blobAWavBase64(blob);
        resolve(wav);
      } catch (e) {
        reject(e instanceof Error ? e : new Error("No pude convertir el audio"));
      } finally {
        limpiar();
      }
    };

    recorder.onerror = () => {
      limpiar();
      reject(new Error("La grabación del pedazo falló"));
    };

    const desde = Math.max(0, t0 - 0.15);
    const hasta = t1 + 0.15;

    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      recorder.start(100);
      video.play().catch(() => {
        recorder.stop();
        reject(new Error("No pude reproducir el pedazo del video"));
      });

      const poll = setInterval(() => {
        if (video.currentTime >= hasta || video.ended) {
          clearInterval(poll);
          video.pause();
          recorder.stop();
        }
      }, 50);
    };

    video.addEventListener("seeked", onSeeked);
    video.currentTime = desde;
  });
}

async function blobAWavBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const audio = await ctx.decodeAudioData(buf.slice(0));
    const data = audio.getChannelData(0);
    const son = aMono16k(data, audio.sampleRate);
    return wavBase64(son);
  } finally {
    void ctx.close();
  }
}

/** Achica el sonido a 16.000 muestras por segundo. */
function aMono16k(data: Float32Array, sr: number): { datos: Float32Array; sr: number } {
  const destino = 16000;
  if (sr <= destino) return { datos: new Float32Array(data), sr };
  const paso = sr / destino;
  const largo = Math.floor(data.length / paso);
  const out = new Float32Array(largo);
  for (let i = 0; i < largo; i++) out[i] = data[Math.floor(i * paso)]!;
  return { datos: out, sr: destino };
}

/** Arma un WAV mono 16 bit desde sonido ya en 16 kHz. */
function wavBase64(sonido: { datos: Float32Array; sr: number }): string {
  const n = sonido.datos.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const txt = (pos: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(pos + i, s.charCodeAt(i));
  };
  txt(0, "RIFF");
  v.setUint32(4, 36 + n * 2, true);
  txt(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sonido.sr, true);
  v.setUint32(28, sonido.sr * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  txt(36, "data");
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, sonido.datos[i]!));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
