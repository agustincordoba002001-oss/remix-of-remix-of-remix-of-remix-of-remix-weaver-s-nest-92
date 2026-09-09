/**
 * Imitación de la forma de hablar del usuario.
 *
 * El usuario graba con su micrófono cómo quiere que suene una frase; acá se
 * mide esa grabación (velocidad, variación de tono y energía) y se traduce a
 * los ajustes del motor de voz Lolosi10, para que la narración lo imite.
 */

export type Expresion = {
  /** Segundos que duró la grabación. */
  duracion: number;
  /** Sílabas por segundo aproximadas. */
  velocidad: number;
  /** Cuánto sube y baja el tono (0 = plano, 1 = muy expresivo). */
  variacion: number;
  /** Fuerza con la que habló (0 a 1). */
  energia: number;
};

export type AjusteVoz = {
  length_scale: number;
  noise_scale: number;
  noise_w: number;
};

/** Cuenta las sílabas de una frase en español, de forma sencilla. */
export function silabas(texto: string) {
  const grupos = texto.toLowerCase().match(/[aeiouáéíóúü]+/g);
  return Math.max(1, grupos ? grupos.length : Math.round(texto.length / 3));
}

/** Mide la grabación del usuario junto con el texto que dijo. */
export async function medirGrabacion(blob: Blob, texto: string): Promise<Expresion> {
  const ctx = new AudioContext();
  const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
  const datos = buffer.getChannelData(0);
  const sr = buffer.sampleRate;
  void ctx.close();

  // Recorta el silencio de los extremos para medir sólo la voz.
  const umbral = 0.015;
  let ini = 0;
  let fin = datos.length - 1;
  while (ini < fin && Math.abs(datos[ini]!) < umbral) ini++;
  while (fin > ini && Math.abs(datos[fin]!) < umbral) fin--;
  const largo = Math.max(1, fin - ini);
  const duracion = largo / sr;

  // Energía media y variación de tono por ventanas de 40 ms.
  const paso = Math.round(sr * 0.04);
  const tonos: number[] = [];
  let suma = 0;
  let ventanas = 0;
  for (let p = ini; p + paso < fin; p += paso) {
    let rms = 0;
    let cruces = 0;
    for (let i = 0; i < paso; i++) {
      const v = datos[p + i]!;
      rms += v * v;
      if (i > 0 && Math.sign(v) !== Math.sign(datos[p + i - 1]!)) cruces++;
    }
    rms = Math.sqrt(rms / paso);
    suma += rms;
    ventanas++;
    if (rms > umbral) tonos.push((cruces * sr) / (2 * paso));
  }

  const energia = Math.min(1, (suma / Math.max(1, ventanas)) * 8);
  const media = tonos.reduce((a, b) => a + b, 0) / Math.max(1, tonos.length);
  const desvio = Math.sqrt(
    tonos.reduce((a, b) => a + (b - media) ** 2, 0) / Math.max(1, tonos.length),
  );
  const variacion = media > 0 ? Math.min(1, desvio / media / 0.6) : 0;
  const velocidad = silabas(texto) / duracion;

  return {
    duracion: Math.round(duracion * 100) / 100,
    velocidad: Math.round(velocidad * 100) / 100,
    variacion: Math.round(variacion * 100) / 100,
    energia: Math.round(energia * 100) / 100,
  };
}

const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Traduce la forma de hablar del usuario a los ajustes del motor.
 * Referencia del estilo Lolosi10: ~4,6 sílabas por segundo.
 */
export function ajustesDesdeExpresion(e: Expresion): AjusteVoz {
  const factor = 4.6 / Math.max(2, Math.min(8, e.velocidad));
  return {
    length_scale: Math.round(limitar(0.99 * factor, 0.88, 1.2) * 1000) / 1000,
    noise_scale: Math.round(limitar(0.5 + e.variacion * 0.22, 0.45, 0.78) * 1000) / 1000,
    noise_w: Math.round(limitar(0.62 + e.energia * 0.22, 0.55, 0.9) * 1000) / 1000,
  };
}
