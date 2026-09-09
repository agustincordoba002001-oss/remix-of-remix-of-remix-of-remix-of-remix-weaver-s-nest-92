"""Dibujos del video del Titanic: uno propio por escena, a color.

Mismo estilo de siempre: dibujo a mano con trazo negro y colores planos
sobre fondo blanco, sin marco ni letras. Cada escena guarda
/mnt/documents/ref_tt/<key>.png con fondo transparente.
Si el proceso se corta, al volver a ejecutarlo continúa donde quedó.
"""
import os
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from PIL import Image, ImageDraw, ImageEnhance, ImageOps

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from guion_titanic import GUION  # noqa: E402

DEST = '/mnt/documents/ref_tt'
CRUDO = '/mnt/documents/ref_tt_crudo'
os.makedirs(DEST, exist_ok=True)
os.makedirs(CRUDO, exist_ok=True)

# El estilo de siempre: dibujo a color, trazo negro, fondo blanco liso.
ESTILO = ('simple colorful cartoon sticker illustration, thick black ink outlines, '
          'bright flat colors, no shading, isolated single subject cut out on a '
          'plain solid pure white background, lots of empty white space, '
          'no scenery, no background details, no border, no frame, '
          'no text, no words, no letters, no watermark')

# El fondo del dibujo siempre es blanco: se sacan las palabras que oscurecen la escena.
OSCURAS = (('at night', ''), ('night sky', 'sky'), (' at dusk', ''), ('night', ''),
           ('dark water', 'water'), ('darkness', 'the horizon'), ('dark', ''),
           ('black and white', 'colorful'), ('monochrome', 'colorful'))


def limpiar(prompt):
    for a, b in OSCURAS:
        prompt = prompt.replace(a, b)
    return ' '.join(prompt.split())


def descargar(prompt, destino, semilla):
    url = ('https://image.pollinations.ai/prompt/'
           + urllib.parse.quote(f'{limpiar(prompt)}, {ESTILO}')
           + f'?width=1024&height=1024&nologo=true&seed={semilla}&model=turbo')
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=300) as r:
        datos = r.read()
    if len(datos) < 5000:
        raise RuntimeError('respuesta demasiado chica')
    with open(destino, 'wb') as f:
        f.write(datos)


def sin_marco(im):
    """Saca el borde oscuro que a veces dibuja el modelo alrededor de la escena."""
    w, h = im.size
    m = max(3, int(min(w, h) * 0.012))
    return im.crop((m, m, w - m, h - m))


def a_dibujo(origen, destino):
    """Deja el dibujo a color, sin marco y con esquinas suaves."""
    im = sin_marco(Image.open(origen).convert('RGB'))
    im = ImageOps.autocontrast(im, cutoff=1)
    im = ImageEnhance.Color(im).enhance(1.3)
    im = ImageEnhance.Contrast(im).enhance(1.08)
    im.thumbnail((900, 900), Image.Resampling.LANCZOS)
    out = im.convert('RGBA')
    # Esquinas redondeadas para que quede como una lámina pegada en la hoja.
    r = int(min(out.size) * 0.05)
    mask = Image.new('L', out.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, out.width - 1, out.height - 1),
                                           radius=r, fill=255)
    out.putalpha(mask)
    out.save(destino)


def una(s):
    crudo = f'{CRUDO}/{s["key"]}.jpg'
    fin = f'{DEST}/{s["key"]}.png'
    if os.path.exists(fin):
        return True
    for intento in range(5):
        try:
            if not os.path.exists(crudo):
                descargar(s['prompt'], crudo, 1000 + int(s['key'][1:]))
            a_dibujo(crudo, fin)
            return True
        except Exception as err:  # noqa: BLE001
            print('reintento', s['key'], err, flush=True)
            if os.path.exists(crudo):
                os.remove(crudo)
            time.sleep(6 + intento * 12)
    return False


def main():
    faltan = [s for s in GUION if not os.path.exists(f'{DEST}/{s["key"]}.png')]
    print('faltan', len(faltan), 'dibujos', flush=True)
    hechos = 0
    with ThreadPoolExecutor(max_workers=3) as pool:
        for ok in pool.map(una, faltan):
            hechos += 1
            if hechos % 5 == 0:
                print('dibujo', hechos, 'de', len(faltan), flush=True)
    print('LISTO dibujos', len(os.listdir(DEST)))


if __name__ == '__main__':
    main()
