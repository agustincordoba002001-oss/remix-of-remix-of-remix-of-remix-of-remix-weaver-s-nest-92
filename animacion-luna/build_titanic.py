"""Render de EL TITANIC, estilo pizarra (mismo estilo definitivo del alunizaje).

Letra estática, mano opción 2 (movimiento original), sin pie de video,
sin música: solo la narración y el dibujo. Un dibujo propio por escena.

Se renderiza por tramos:
    START=0 END=180 OUT=/tmp/chunks/p00.mp4 python3 build_titanic.py
"""
import json
import os
import subprocess
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFont

W, H, FPS = 1280, 720, 30
AUDIO = '/mnt/documents/tt/full.wav'
MARKS = json.load(open('/mnt/documents/tt/marks_full.json'))
DUR = MARKS[-1]['t1'] + 2.0

# La voz necesita empezar antes que el cambio visual. Si dibujo e inicio de frase
# ocurren en el mismo fotograma, el espectador reconoce la escena antes de oír
# las palabras que la explican y el montaje se percibe adelantado.
VISUAL_DELAY = 0.85

START = float(os.environ.get('START', 0))
END = min(float(os.environ.get('END', DUR)), DUR)
OUT = os.environ.get('OUT', '/mnt/documents/titanic_completo.mp4')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from guion_titanic import GUION  # noqa: E402

assert len(MARKS) == len(GUION), 'la cantidad de marcas no coincide con el guion'
for _i, (_mark, _scene) in enumerate(zip(MARKS, GUION), 1):
    assert _mark['txt'] == _scene['txt'], f'frase {_i} desalineada entre audio y dibujo'

FONT_FILE = subprocess.run(['fc-match', '-f', '%{file}', 'DejaVu Sans Condensed:bold'],
                           capture_output=True, text=True, check=True).stdout
_CACHE = {}


def font(sz):
    if sz not in _CACHE:
        _CACHE[sz] = ImageFont.truetype(FONT_FILE, sz)
    return _CACHE[sz]


RED = (200, 42, 46, 255)
BLUE = (26, 88, 148, 255)
GOLD = (206, 146, 36, 255)
INK = (30, 33, 37, 255)

HAND_SIZE = 300
hand = Image.open('/dev-server/public/demo/mano-a-realista.png').convert('RGBA').resize(
    (HAND_SIZE, HAND_SIZE), Image.Resampling.LANCZOS)
TIPX, TIPY = int(.26 * HAND_SIZE), int(.70 * HAND_SIZE)

REF = '/mnt/documents/ref_tt/'
_IMG = {}


def clave(i):
    """Dibujo propio de la escena i, si existe."""
    n = f't{i+1:03d}'
    return n if os.path.exists(REF + n + '.png') else None


def img(key, maxw, maxh):
    ck = (key, maxw, maxh)
    if ck in _IMG:
        return _IMG[ck]
    im = Image.open(REF + key + '.png').convert('RGBA')
    bb = im.getbbox()
    if bb:
        im = im.crop(bb)
    im.thumbnail((maxw, maxh), Image.Resampling.LANCZOS)
    _IMG[ck] = im
    return im


def text_layer(lines, colors, maxw, size):
    """Dibuja el título tal cual está escrito, siempre al mismo tamaño.

    Los títulos del guion nunca se acortan ni se achican: si alguno no entra,
    el render falla a propósito para corregirlo en el guion.
    """
    f = font(size)
    tmp = ImageDraw.Draw(Image.new('RGBA', (10, 10)))
    boxes = [tmp.textbbox((0, 0), x, font=f) for x in lines]
    widths = [b[2] - b[0] for b in boxes]
    assert max(widths) <= maxw - 16, f'título demasiado ancho: {lines}'
    heights = [b[3] - b[1] + 10 for b in boxes]
    ww, hh = max(widths) + 16, sum(heights) + 16
    lay = Image.new('RGBA', (ww, hh), (0, 0, 0, 0))
    dd = ImageDraw.Draw(lay)
    y = 4
    for line, c, tw, th in zip(lines, colors, widths, heights):
        dd.text(((ww - tw) // 2, y), line, font=f, fill=c)
        y += th
    return lay



PAL1 = [[RED, BLUE, INK], [BLUE, INK, RED], [INK, RED, GOLD], [BLUE, RED, GOLD]]
PAL2 = [[INK, GOLD, INK], [GOLD, INK, BLUE], [INK, BLUE, GOLD]]


def build_screens():
    screens = []
    for i, s in enumerate(GUION):
        m = MARKS[i]
        # La primera escena ya puede estar en pantalla durante el silencio
        # inicial. Las siguientes cambian después de oír el comienzo de su frase;
        # hasta entonces se conserva completa la imagen anterior.
        scene_t0 = 0.0 if i == 0 else min(m['t0'] + VISUAL_DELAY, m['t1'] - 0.15)
        reveal_t0 = m['t0'] + (0.18 if i == 0 else VISUAL_DELAY)
        if i + 1 < len(MARKS):
            next_mark = MARKS[i + 1]
            end = min(next_mark['t0'] + VISUAL_DELAY, next_mark['t1'] - 0.15)
        else:
            end = DUR
        els = []
        k = clave(i)
        if k:
            zona_x, zona_w = 690, 550
            im = img(k, 590, 500)
            els.append(dict(im=im, x=60 + (600 - im.width) // 2,
                            y=max(120, (H - im.height) // 2),
                            rows=max(4, min(9, im.height // 62))))
        else:
            zona_x, zona_w = (140 if i % 2 == 0 else 330), 810
        blocks = []
        if s['t1']:
            blocks.append((s['t1'], PAL1[i % len(PAL1)], 58))
        if s['t2']:
            blocks.append((s['t2'], PAL2[i % len(PAL2)], 34))

        layers = [text_layer(l, c[:len(l)], zona_w, sz) for l, c, sz in blocks]
        total = sum(la.height for la in layers) + 34 * (len(layers) - 1)
        y = max(90, (H - total) // 2)
        for la, (lines, _, _) in zip(layers, blocks):
            els.append(dict(im=la, x=zona_x + (zona_w - la.width) // 2, y=y,
                            rows=len(lines)))
            y += la.height + 34
        # Repartir el trazado a lo largo de casi toda la frase. Antes se imponía
        # un máximo de 2,2 s y el dibujo quedaba terminado cuando la voz todavía
        # estaba desarrollando la idea, que se percibía como otro adelanto.
        disponible = max(0.25, m['t1'] - reveal_t0)
        solape = 0.88
        recorrido = 1 + solape * max(0, len(els) - 1)
        per = max(0.20, disponible * 0.90 / recorrido)
        cur = reveal_t0
        for el in els:
            el['t0'] = cur
            el['t1'] = cur + per
            cur += per * solape
        screens.append(dict(t0=scene_t0, t1=end, els=els))
    return screens


SC = build_screens()


def mask_reveal(im, rows, p):
    p = max(0, min(1, p))
    m = Image.new('L', im.size, 0)
    d = ImageDraw.Draw(m)
    rh = im.height / rows
    pos = p * rows
    row = int(pos)
    frac = pos - row
    for r in range(min(row, rows)):
        d.rectangle((0, int(r * rh) - 2, im.width, int((r + 1) * rh) + 2), fill=255)
    tx, ty = im.width, im.height
    if row < rows:
        ww = int(im.width * frac)
        d.rectangle((0, int(row * rh) - 2, ww, int((row + 1) * rh) + 2), fill=255)
        tx, ty = ww, row * rh + rh * .55
    out = im.copy()
    out.putalpha(ImageChops.multiply(im.getchannel('A'), m))
    return out, tx, ty


def ease(x):
    x = max(0, min(1, x))
    return x * x * (3 - 2 * x)


n0, n1 = int(START * FPS), int(END * FPS)
cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
       '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
       '-ss', str(START), '-t', str(END - START), '-i', AUDIO,
       '-filter_complex',
       '[0:v]scale=1920:1080:flags=lanczos,format=yuv420p[v];'
       '[1:a]highpass=f=70,lowpass=f=14000,'
       'acompressor=threshold=-18dB:ratio=2.5:attack=15:release=180,'
       'loudnorm=I=-16:TP=-1.5:LRA=11[a]',
       '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'veryfast',
       '-crf', '20', '-profile:v', 'high', '-level', '4.1',
       '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-shortest', OUT]
proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
assert proc.stdin is not None

idx = 0
for frame in range(n0, n1):
    t = frame / FPS
    while idx + 1 < len(SC) and t >= SC[idx + 1]['t0']:
        idx += 1
    s = SC[idx]
    canvas = Image.new('RGB', (W, H), (255, 255, 255))
    tip = None
    for el in s['els']:
        if t < el['t0']:
            continue
        p = (t - el['t0']) / max(.05, el['t1'] - el['t0'])
        if p < 1:
            im, tx, ty = mask_reveal(el['im'], el['rows'], ease(p))
            canvas.paste(im, (el['x'], el['y']), im)
            tip = (el['x'] + tx, el['y'] + ty)
        else:
            canvas.paste(el['im'], (el['x'], el['y']), el['im'])
    if tip:
        hx = int(max(-200, min(W - 40, tip[0] - TIPX)))
        hy = int(max(-200, min(H - 45, tip[1] - TIPY)))
        canvas.paste(hand, (hx, hy), hand)
    proc.stdin.write(canvas.tobytes())
proc.stdin.close()
code = proc.wait()
if code:
    raise SystemExit(code)
print(OUT, 'tramo', START, END, 'dur_total', round(DUR, 2))
