/**
 * Lee el audio del video que sube el usuario, en su propio navegador y gratis:
 * encuentra dónde habla y dónde calla, y devuelve un tramo por cada frase.
 * También deja el sonido listo para poder transcribir cada frase.
 */
export type Tramo = { t0: number; t1: number };

/** Sonido del video, en mono y liviano, para mandar frase por frase. */
export type Sonido = { datos: Float32Array; sr: number };

export async function leerTramos(
  archivo: Blob,
  avisar?: (p: number) => void,
): Promise<{ duracion: number; tramos: Tramo[]; sonido: Sonido }> {
  const buf = await archivo.arrayBuffer();
  avisar?.(0.35);
  const audio = await decodificar(buf);
  avisar?.(0.7);

  const data = audio.getChannelData(0);
  const sr = audio.sampleRate;
  const paso = Math.max(1, Math.floor(sr * 0.02)); // ventanas de 20 ms
  const energias: number[] = [];
  for (let i = 0; i + paso <= data.length; i += paso) {
    let s = 0;
    for (let j = i; j < i + paso; j++) s += data[j]! * data[j]!;
    energias.push(Math.sqrt(s / paso));
  }
  const sonido = aMono16k(data, sr);
  void ctx.close();
  avisar?.(0.85);

  const orden = [...energias].sort((a, b) => a - b);
  const piso = orden[Math.floor(orden.length * 0.2)] ?? 0;
  const techo = orden[Math.floor(orden.length * 0.95)] ?? 1;
  const umbral = piso + (techo - piso) * 0.18;

  const MIN_SILENCIO = 14; // ~0,28 s de silencio corta la frase
  const MIN_FRASE = 40; // ~0,8 s mínimo por frase
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

  avisar?.(1);
  return { duracion: audio.duration, tramos, sonido };
}

/** Achica el sonido a 16.000 muestras por segundo, que es lo que hace falta. */
function aMono16k(data: Float32Array, sr: number): Sonido {
  const destino = 16000;
  if (sr <= destino) return { datos: new Float32Array(data), sr };
  const paso = sr / destino;
  const largo = Math.floor(data.length / paso);
  const out = new Float32Array(largo);
  for (let i = 0; i < largo; i++) out[i] = data[Math.floor(i * paso)]!;
  return { datos: out, sr: destino };
}

/** Arma un archivo de sonido (WAV) con el pedazo entre dos segundos. */
export function pedazoWavBase64(sonido: Sonido, t0: number, t1: number) {
  const desde = Math.max(0, Math.floor(t0 * sonido.sr));
  const hasta = Math.min(sonido.datos.length, Math.ceil(t1 * sonido.sr));
  const n = Math.max(0, hasta - desde);
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
    const s = Math.max(-1, Math.min(1, sonido.datos[desde + i]!));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
