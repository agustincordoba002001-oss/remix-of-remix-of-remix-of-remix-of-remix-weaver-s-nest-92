# Corregir de verdad el video del Titanic

## Qué voy a cambiar
- Mantener cada dibujo anterior hasta que comience claramente la frase de la escena siguiente, evitando que el dibujo nuevo se adelante a la voz.
- Usar las 223 marcas del audio original y conservar la correspondencia exacta `t001 → frase 1` hasta `t223 → frase 223`.
- Hacer que el dibujo nuevo empiece después de oír el comienzo de su frase, no en el primer instante de la marca.
- Conservar todos los dibujos originales disponibles y los seis finales nuevos; no repetir ni cambiar ilustraciones.

## Comprobación
- Crear muestras cortas del comienzo, la mitad, el hundimiento y el final para revisar imagen, frase y cambio de escena.
- Renderizar nuevamente por tramos y unirlos sin alterar el tiempo del audio.
- Entregarlo como un archivo nuevo (`titanic_corregido_v2.mp4`) para evitar que se vuelva a mostrar la versión anterior guardada en caché.

## Detalle técnico
- Separar el inicio de la frase del momento de cambio visual con un retraso breve y controlado.
- Mantener continuidad visual entre escenas durante ese retraso, sin pantallas blancas.
- Validar duración, pistas y puntos de corte del archivo final antes de entregarlo.
