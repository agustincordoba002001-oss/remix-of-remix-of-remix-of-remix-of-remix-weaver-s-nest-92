# Roadmap

- [x] Quitar subtítulos del reproductor (la narración es solo voz)
- [x] Imágenes generadas gratis e ilimitadas (sin créditos) como modo visual
- [x] Varios estilos de animación (movimiento de cámara) seleccionables
- [x] Mejor edición: fundidos cruzados, transiciones variadas, mezcla más natural de video e imágenes
- [x] Verificar en el navegador: generar un documental de prueba y reproducirlo sin errores
- [x] Confirmar build limpio tras la corrección del error de tipos
- [x] Incorporar clips reales libres y pertinentes dentro de cada documental
- [x] Alternar clips e imágenes con cortes, fundidos y movimiento profesional
- [x] Mostrar autor y licencia del material sin interrumpir la reproducción
- [x] Comprobar que un clip roto vuelva automáticamente a la imagen de archivo

- [x] Terminar la animación Volumen 1 del alunizaje hasta el final del guión

## Video LA GUERRA FRÍA (en curso)
- [x] Guion: animacion-luna/guion_guerrafria.py (237 escenas, ~23,8 min)
- [x] Narración Dark: /mnt/documents/gf/full.wav + marks_full.json (audio_guerrafria.py)
- [ ] Dibujos únicos: /mnt/documents/ref_gf/gNNN.png (faltan del g012 al g236)
- [ ] Render por tramos con animacion-luna/build_guerrafria.py y concatenar a
      /mnt/documents/guerra_fria_completo.mp4

## Estudio en la app (listo)
- [x] Página /estudio: tema -> guion gratis (enciclopedia libre) y narración voz Dark gratis
- [x] Subir audio o video de cualquier tamaño para revisarlo y anotar correcciones
- [x] Verificado: guion y audio consumen 0 créditos (Wikipedia + Piper gratuito), sin pedir tokens
- [x] Guion más narrativo: multi-artículo, filtrado de fichas, conectores retóricos y ritmo dramático
- [x] Narrador propio (src/lib/narrador.ts): escribe los guiones con las reglas del Titanic, gratis y sin créditos
- [x] Botón para animar el guion aprobado (motor propio en el navegador, gratis)
- [x] Narrador v2: sin ideas repetidas, cronología con contexto y conectores sin repetir
- [x] Panel "Enseñarle a mejorar": el usuario escribe una indicación y el narrador la aplica siempre
