export type LunaScene = {
  seccion: string;
  texto: string;
  imagen: string;
  panX: number;
  panY: number;
  zoomFrom: number;
  zoomTo: number;
};

const raw: Array<[string, string, string]> = [
  [
    "PRÓLOGO — UNA PROMESA IMPOSIBLE",
    "Salí una noche al patio y mirá para arriba. Ahí está: la Luna. Esa cosa blanca y quieta que acompañó a todos los que vivieron antes que vos.",
    "001.jpg",
  ],
  [
    "PRÓLOGO — UNA PROMESA IMPOSIBLE",
    "Y de golpe, en ocho años, unos tipos con reglas de cálculo, café frío y una computadora más tonta que un teléfono viejo, la tocaron.",
    "002.jpg",
  ],
  [
    "PRÓLOGO — UNA PROMESA IMPOSIBLE",
    "Empieza el 25 de mayo de 1961. Kennedy se para frente al Congreso y dice una frase que en ese momento no tenía ningún derecho a decir.",
    "003.jpg",
  ],
  [
    "PRÓLOGO — UNA PROMESA IMPOSIBLE",
    "«Esta nación debe poner un hombre en la Luna antes del fin de la década y devolverlo sano y salvo». Aplausos. Y varios ingenieros de la NASA se pusieron pálidos.",
    "004.jpg",
  ],
  [
    "PRÓLOGO — UNA PROMESA IMPOSIBLE",
    "¿Por qué pálidos? Porque Estados Unidos tenía quince minutos de experiencia en vuelo tripulado. Quince minutos. Shepard había hecho un saltito y cayó al mar.",
    "005.jpg",
  ],
  [
    "PRÓLOGO — UNA PROMESA IMPOSIBLE",
    "Los soviéticos ya habían dado una vuelta completa al planeta con Yuri Gagarin. Iban ganando. Y ese era el verdadero motor de todo esto: el miedo.",
    "006.jpg",
  ],
  [
    "EL PRECIO",
    "Casi nadie recuerda que el camino empezó con tres muertos. 27 de enero de 1967. Una prueba en tierra. La cápsula del Apolo 1, llena de oxígeno puro a presión.",
    "007.jpg",
  ],
  [
    "EL PRECIO",
    "Grissom, White y Chaffee estaban atados adentro. Una chispa de un cable pelado. En oxígeno puro arde todo: el velcro, el nylon, el papel de las listas.",
    "008.jpg",
  ],
  [
    "EL PRECIO",
    "La escotilla se abría hacia adentro y tenía seis tornillos. Nunca tuvieron chance. Grissom había dicho meses antes: «Este es un negocio riesgoso».",
    "009.jpg",
  ],
  [
    "EL PRECIO",
    "Navidad de 1968. El Apolo 8 dio diez vueltas a la Luna sin bajar. Y al asomarse vieron algo que nadie había visto jamás.",
    "010.jpg",
  ],
  [
    "EL PRECIO",
    "La Tierra saliendo por encima del horizonte lunar. No encontramos la Luna: nos encontramos a nosotros mismos.",
    "011.jpg",
  ],
  [
    "EL PRECIO",
    "En mayo del 69, el Apolo 10 hizo el ensayo general: bajaron hasta quince kilómetros de la superficie y se volvieron. Quince kilómetros, y no podían aterrizar.",
    "012.jpg",
  ],
];

const moves = [
  { panX: -26, panY: 10, zoomFrom: 1.05, zoomTo: 1.18 },
  { panX: 22, panY: -14, zoomFrom: 1.16, zoomTo: 1.04 },
  { panX: 0, panY: -22, zoomFrom: 1.04, zoomTo: 1.2 },
  { panX: -18, panY: -8, zoomFrom: 1.2, zoomTo: 1.06 },
];

export const LUNA_SCENES: LunaScene[] = raw.map(([seccion, texto, img], i) => ({
  seccion,
  texto,
  imagen: `images/luna/${img}`,
  ...moves[i % moves.length],
}));

export const LUNA = {
  intro: 132,
  scene: 168,
  outro: 138,
  transition: 16,
};

export const LUNA_TOTAL =
  LUNA.intro +
  LUNA.scene * LUNA_SCENES.length +
  LUNA.outro -
  LUNA.transition * (LUNA_SCENES.length + 1);
