# Animación Luna (estilo pizarra dibujada)

Disparador: cuando el usuario dice **"animación Luna"**, se produce un video con este estilo exacto.

## Estilo
- Formato principal horizontal 16:9, 1920x1080, pensado para videos largos de YouTube. No usar formato vertical salvo que se pida expresamente una versión Short.
- Fondo blanco cálido tipo pizarra, trazo negro a mano alzada.
- Una mano con lápiz (`assets/mano-lapiz.png`, punta del lápiz en x=73, y=237 sobre la versión de 360 px) que va dibujando cada elemento fila por fila, de izquierda a derecha.
- Cada ilustración aparece primero como boceto de tinta y, cuando termina de dibujarse, recibe su color mediante una transición breve y suave.
- Títulos grandes en rojo, azul y dorado, con negro para apoyo, en tipografía DejaVu Sans Condensed bold.
- Personajes y objetos recortados en PNG transparente, con línea de tinta y color tipo acuarela editorial (ver `assets/`).
- Los personajes históricos deben tener un parecido reconocible, vestuario correcto y rasgos propios; no usar figuras humanas genéricas para representar a una persona famosa.
- Cada dibujo debe corresponder directamente con la frase narrada y aportar información visual concreta.
- No repetir una ilustración principal en escenas consecutivas ni usar el mismo recurso para ideas distintas. Cada bloque narrativo debe tener una composición propia.
- Las imágenes deben sentirse naturales y editoriales: poses expresivas, proporciones creíbles, fondos contextuales y color de acuarela moderado; evitar iconos genéricos o recortes rígidos.
- Cuando haya una cita o declaración, mostrar durante la cita un retrato reconocible de su autor, con gesto de discurso y contexto histórico correcto. La voz `davefx` entra exactamente en ese momento.
- Los títulos deben ser breves y dinámicos: jerarquía de tamaños, alternancia de rojo, azul, dorado y negro, aparición por bloques y acentos lineales animados. No tapar ilustraciones ni competir con rostros.
- Ritmo rápido: cada elemento aparece, se sostiene y da paso al siguiente.
- Render de trabajo a 1280x720 y exportación final a 1920x1080, 30 fps.

## Audio
- Narración en español con Piper (voz `daniela` por defecto, `davefx` para citas/discursos).
- Frases separadas con pausas variables (0.25–0.35 s).
- Cama musical instrumental suave generada con numpy (acordes + bajo, volumen bajo).
- Mezcla final normalizada con `loudnorm=I=-16:TP=-1.5:LRA=11`.

## Cómo se genera
1. `python3 audio.py` → genera la narración + música en `mix.wav`.
2. `python3 build.py` → renderiza los fotogramas PNG en `frames/`.
3. ffmpeg une fotogramas + audio:

```
ffmpeg -framerate 30 -i frames/%04d.png -i mix.wav \
  -filter_complex "[0:v]format=yuv420p[v];[1:a]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 20 -preset medium -pix_fmt yuv420p \
  -c:a aac -b:a 192k -shortest /mnt/documents/animacion_luna.mp4
```

Los dibujos nuevos de cada tema se generan como PNG transparentes de al menos 1024 px, estilo editorial dibujado a tinta con color de acuarela. Se conserva una versión desaturada para la fase de trazado y se revela la versión a color al terminar.

---

## Nombres de los estilos (fijos)

### Volumen 1 (estilo oficial y por defecto)
- Fondo blanco liso, sin líneas ni textura de papel.
- Solo siluetas / recortes: personajes y objetos aislados en PNG transparente, sin marco,
  sin fondo, sin escenografía (referencia: el retrato de Gus Grissom hablando).
- La mano dibuja cada elemento ya en su color definitivo: **no** hay fase de tinta gris
  seguida de coloreado.
- Títulos: color fijo desde el primer trazo (rojo, azul, dorado, negro). El dinamismo viene
  del movimiento — bloques que se asientan desde abajo, jerarquía de tamaños y posiciones
  distintas en cada escena — nunca de un cambio de color.
- Guion explicativo y entretenido: cuando aparecen personas (p. ej. la tripulación del
  Apolo 1) se dan nombres y se explica quién era cada uno, a velocidad natural.
- Cada escena tiene su propia ilustración; nada se repite.
- Render de trabajo 1280x720 → exportación 1920x1080, 30 fps. Pie discreto
  "ANIMACIÓN LUNA · VOLUMEN 1 · <TEMA>".
- Narración: Daniela para el relato, davefx exactamente en las citas.
- Renderizador: `build_volumen2.py`. Audio: `audio_volumen2.py`. Assets: `assets/volumen2/`.
  (nombres de archivo históricos; el estilo se llama Volumen 1).

### Estilo papel (archivado, ya no se usa salvo pedido expreso)
Papel blanco cálido con líneas de fondo, ilustraciones editoriales con recuadro implícito,
revelado en trazo de tinta y luego transición al color, títulos que cambian de color al
terminar de escribirse. Renderizador: `build_alunizaje_horizontal.py`. Assets: `assets/`.
