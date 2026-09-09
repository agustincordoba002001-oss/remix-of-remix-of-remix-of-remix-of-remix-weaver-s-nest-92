"""Dibujos del video del Titanic en estilo messi100 (uno propio por escena).

Estilo fijo (igual al video de prueba y al Volumen 1 del alunizaje):
ilustración editorial dibujada a tinta con color de acuarela, recortada
sobre hoja blanca, sin escenografía, sin marco y sin letras.

Cada escena guarda /mnt/documents/ref_tt/<key>.png con fondo transparente.
Si el proceso se corta, al volver a ejecutarlo continúa donde quedó.
"""
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from guion_titanic import GUION  # noqa: E402

DEST = '/mnt/documents/ref_tt'
CRUDO = '/mnt/documents/ref_tt_crudo'
os.makedirs(DEST, exist_ok=True)
os.makedirs(CRUDO, exist_ok=True)

URL = 'https://ai.gateway.lovable.dev/v1/images/generations'
MODELO = 'google/gemini-3.1-flash-image'

# El estilo messi100: tinta editorial + acuarela, recortado sobre blanco.
ESTILO = ('editorial hand-drawn illustration, fine black ink linework with soft '
          'watercolor coloring, historically accurate period detail, expressive '
          'natural poses, one single subject fully cut out and centered on a plain '
          'pure white background, no scenery, no landscape, no room, no border, '
          'no frame, no text, no letters, no watermark, not a photograph')

# El fondo del dibujo siempre es blanco: se sacan las palabras que oscurecen la escena.
OSCURAS = (('at night', ''), ('night sky', 'sky'), (' at dusk', ''), ('night', ''),
           ('dark water', 'water'), ('darkness', 'the horizon'), ('dark', ''),
           ('black and white', 'colorful'), ('monochrome', 'colorful'))


def limpiar(prompt):
    for a, b in OSCURAS:
        prompt = prompt.replace(a, b)
    return ' '.join(prompt.split())


def descargar(prompt, destino):
    body = json.dumps({
        'model': MODELO,
        'prompt': f'{ESTILO}: {limpiar(prompt)}',
        'n': 1,
        'size': '1024x1024',
    }).encode()
    req = urllib.request.Request(URL, data=body, headers={
        'Authorization': 'Bearer ' + os.environ['LOVABLE_API_KEY'],
        'Content-Type': 'application/json',
    })
    with urllib.request.urlopen(req, timeout=300) as r:
        datos = json.load(r)
    b64 = datos['data'][0].get('b64_json')
    if not b64:
        raise RuntimeError('la respuesta no trae dibujo')
    crudo = base64.b64decode(b64)
    if len(crudo) < 5000:
        raise RuntimeError('respuesta demasiado chica')
    with open(destino, 'wb') as f:
        f.write(crudo)


def recortar_fondo(im):
    """Vuelve transparente solo el blanco que rodea al dibujo, sin agujerearlo."""
    a = np.asarray(im.convert('RGB')).astype(np.int16)
    claro = a.min(axis=2) > 232
    etiquetas, n = ndimage.label(claro)
    if n:
        borde = set(etiquetas[0].tolist()) | set(etiquetas[-1].tolist())
        borde |= set(etiquetas[:, 0].tolist()) | set(etiquetas[:, -1].tolist())
        borde.discard(0)
        fuera = np.isin(etiquetas, list(borde))
    else:
        fuera = np.zeros(claro.shape, bool)
    alpha = np.where(fuera, 0, 255).astype(np.uint8)
    out = im.convert('RGBA')
    out.putalpha(Image.fromarray(alpha, 'L'))
    bb = out.getbbox()
    return out.crop(bb) if bb else out


def a_dibujo(origen, destino):
    im = Image.open(origen).convert('RGB')
    out = recortar_fondo(im)
    out.thumbnail((900, 900), Image.Resampling.LANCZOS)
    out.save(destino)


def una(s):
    crudo = f'{CRUDO}/{s["key"]}.png'
    fin = f'{DEST}/{s["key"]}.png'
    if os.path.exists(fin):
        return True
    for intento in range(4):
        try:
            if not os.path.exists(crudo):
                descargar(s['prompt'], crudo)
            a_dibujo(crudo, fin)
            return True
        except Exception as err:  # noqa: BLE001
            print('reintento', s['key'], err, flush=True)
            if os.path.exists(crudo):
                os.remove(crudo)
            time.sleep(5 + intento * 10)
    return False


def main():
    faltan = [s for s in GUION if not os.path.exists(f'{DEST}/{s["key"]}.png')]
    print('faltan', len(faltan), 'dibujos', flush=True)
    hechos = 0
    with ThreadPoolExecutor(max_workers=4) as pool:
        for _ in pool.map(una, faltan):
            hechos += 1
            if hechos % 5 == 0:
                print('dibujo', hechos, 'de', len(faltan), flush=True)
    print('LISTO dibujos', len(os.listdir(DEST)), flush=True)


if __name__ == '__main__':
    main()
