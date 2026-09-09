/**
 * Lee el audio del video que sube el usuario, en su propio navegador y gratis:
 * encuentra dónde habla y dónde calla, y devuelve un tramo por cada frase.
 */
export type Tramo = { t0: number; t1: number };

export async function leerTramos(
  archivo: Blob,
  avisar?: (p: number) => void,
): Promise<{ duracion: number; tramos: Tramo[] }> {
  const buf = await archivo.arrayBuffer();
  avisar?.(0.35);
  const Ctx: typeof AudioContext =
    (window as unknown as { AudioContext: typeof AudioContext }).AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const audio = await ctx.decodeAudioData(buf);
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
  return { duracion: audio.duration, tramos };
}
