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

# El estilo de siempre: dibujo a color, trazo negro, recortado sobre hoja blanca.
ESTILO = ('flat 2d hand drawn cartoon clipart sticker, thick black ink outlines, '
          'bright flat colors, no shading, no gradients, one single subject '
          'centered and cut out on a plain pure white empty background, '
          'no scenery, no landscape, no sky, no sea, no room, no floor, '
          'no shadow, no border, no frame, no text, no letters, no watermark, '
          'not a photo, not 3d, not realistic')

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
           + urllib.parse.quote(f'{ESTILO}: {limpiar(prompt)}')
           + f'?width=1024&height=1024&nologo=true&seed={semilla}&model=turbo')
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=300) as r:
        datos = r.read()
    if len(datos) < 5000:
        raise RuntimeError('respuesta demasiado chica')
    with open(destino, 'wb') as f:
        f.write(datos)


def sin_marco(im):
    """Saca el marco oscuro que a veces dibuja el modelo alrededor de la escena."""
    g = im.convert('L')
    w, h = im.size
    px = g.load()
    lim = max(2, int(min(w, h) * 0.06))

    def oscura(vals):
        return sum(vals) / len(vals) < 110

    izq = arr = 0
    while izq < lim and oscura([px[izq, y] for y in range(0, h, 8)]):
        izq += 1
    der = w - 1
    while w - 1 - der < lim and oscura([px[der, y] for y in range(0, h, 8)]):
        der -= 1
    while arr < lim and oscura([px[x, arr] for x in range(0, w, 8)]):
        arr += 1
    aba = h - 1
    while h - 1 - aba < lim and oscura([px[x, aba] for x in range(0, w, 8)]):
        aba -= 1
    m = max(3, int(min(w, h) * 0.008))
    return im.crop((min(izq + m, w // 4), min(arr + m, h // 4),
                    max(der - m, w * 3 // 4), max(aba - m, h * 3 // 4)))


def recortar_fondo(im):
    """Vuelve transparente el fondo claro y uniforme que rodea al dibujo."""
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()
    borde = [px[x, y][:3] for x in range(0, w, 16) for y in (0, h - 1)]
    borde += [px[x, y][:3] for y in range(0, h, 16) for x in (0, w - 1)]
    claro = sum(1 for c in borde if min(c) > 205) / len(borde)
    if claro < 0.7:
        return im, False
    datos = im.getdata()
    nuevo = [(r, g, b, 0) if (min(r, g, b) > 218) else (r, g, b, a)
             for r, g, b, a in datos]
    im.putdata(nuevo)
    bb = im.getbbox()
    return (im.crop(bb) if bb else im), True


def a_dibujo(origen, destino):
    """Deja el dibujo a color: recortado sobre blanco cuando se puede."""
    im = sin_marco(Image.open(origen).convert('RGB'))
    im = ImageOps.autocontrast(im, cutoff=1)
    im = ImageEnhance.Color(im).enhance(1.25)
    im = ImageEnhance.Contrast(im).enhance(1.08)
    out, recortado = recortar_fondo(im)
    out.thumbnail((900, 900), Image.Resampling.LANCZOS)
    if not recortado:
        # Si el modelo dibujó un fondo entero, queda como lámina de esquinas suaves.
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
