"""Render de EL ALUNIZAJE completo, estilo pizarra.

Letra estática, mano opción 2 (movimiento original), sin pie de video,
sin música: solo la narración y el dibujo.

Se renderiza por tramos para no pasarse del tiempo de cada corrida:
    START=0 END=180 OUT=/tmp/chunks/p00.mp4 python3 build_completo.py
"""
import json
import math
import os
import subprocess

from PIL import Image, ImageChops, ImageDraw, ImageFont

W, H, FPS = 1280, 720, 30
AUDIO = '/mnt/documents/luna/full.wav'
MARKS = json.load(open('/mnt/documents/luna/marks_full.json'))
DUR = MARKS[-1]['t1'] + 2.0

START = float(os.environ.get('START', 0))
END = min(float(os.environ.get('END', DUR)), DUR)
OUT = os.environ.get('OUT', '/mnt/documents/alunizaje_completo.mp4')

import sys  # noqa: E402
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from guion_completo import GUION  # noqa: E402

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

REF = '/mnt/documents/ref/'
FILES = {
    'luna': 'v2-luna.png', 'patio': 'v2-patio.png', 'saturno': 'v2-saturno.png',
    'kennedy': 'v2-kennedy.png', 'congreso': 'v2-kennedy-congreso.png',
    'ingenieros': 'v2-ingenieros.png', 'mercury': 'v2-mercury.png',
    'gagarin': 'v2-gagarin.png', 'carrera': 'v2-carrera.png',
    'tripulacion': 'v2-tripulacion.png', 'grissom': 'v2-grissom.png',
    'white': 'v2-white.png', 'chaffee': 'v2-chaffee.png', 'prueba': 'v2-prueba.png',
    'chispa': 'v2-chispa.png', 'escotilla': 'v2-escotilla.png',
    'grissom_cita': 'v2-grissom-cita.png', 'huella': 'v2-huella.png',
    'apolo8': 'v2-apolo8.png', 'tierra': 'v2-tierra.png', 'aguila': 'v2-aguila.png',
    'bota': 'v2-bota.png',
    'v2cohete': 'v3-v2cohete.png', 'vonbraun': 'v3-vonbraun.png',
    'korolev': 'v3-korolev.png', 'sputnik': 'v3-sputnik.png', 'laika': 'v3-laika.png',
    'fracaso': 'v3-fracaso.png', 'nasa': 'v3-nasa.png', 'mercury7': 'v3-mercury7.png',
    'gemini': 'v3-gemini.png', 'gemini8': 'v3-gemini8.png', 'limon': 'v3-limon.png',
    'informe': 'v3-informe.png', 'kranz': 'v3-kranz.png', 'komarov': 'v3-komarov.png',
    'equipo': 'v3-equipo.png', 'computadora': 'v3-computadora.png',
    'hamilton': 'v3-hamilton.png', 'apolo7': 'v3-apolo7.png',
    'silencio': 'v3-silencio.png', 'modulo': 'v3-modulo.png',
    'apolo11crew': 'v3-apolo11crew.png', 'armstrong': 'v3-armstrong.png',
    'aldrin': 'v3-aldrin.png', 'collins': 'v3-collins.png',
    'lanzamiento': 'v3-lanzamiento.png', 'viaje': 'v3-viaje.png',
    'alarma': 'v3-alarma.png', 'crateres': 'v3-crateres.png', 'polvo': 'v3-polvo.png',
    'bandera': 'v3-bandera.png', 'placa': 'v3-placa.png', 'medallas': 'v3-medallas.png',
    'llamada': 'v3-llamada.png', 'despegue': 'v3-despegue.png',
    'discurso': 'v3-discurso.png', 'interruptor': 'v3-interruptor.png',
    'amerizaje': 'v3-amerizaje.png', 'rayo': 'v3-rayo.png', 'apolo13': 'v3-apolo13.png',
    'rover': 'v3-rover.png', 'cernan': 'v3-cernan.png', 'museo': 'v3-museo.png',
    'mundotv': 'v3-mundotv.png', 'comunion': 'v3-comunion.png',
    'escalera': 'v3-escalera.png',
}
# claves que reutilizan otro dibujo
ALIAS = {'dinero': 'equipo', 'control': 'kranz', 'combustible': 'alarma',
         'contacto': 'polvo', 'escotilla2': 'modulo', 'saltos': 'bota',
         'espejo': 'placa', 'acople': 'gemini', 'reentrada': 'amerizaje',
         'cuarentena': 'amerizaje', 'filtro': 'apolo13', 'aburrimiento': 'museo',
         'apolo10': 'modulo'}

_IMG = {}


def clave(i, s):
    """Dibujo propio de la escena i si existe; nunca se repite un dibujo."""
    n = f'n{i:03d}'
    if os.path.exists(REF + n + '.png'):
        return n
    return s['img']


def img(key, maxw, maxh):
    if not (key.startswith('n') and key[1:].isdigit()):
        key = ALIAS.get(key, key)
    ck = (key, maxw, maxh)
    if ck in _IMG:
        return _IMG[ck]
    nombre = key + '.png' if key.startswith('n') and key[1:].isdigit() else FILES[key]
    im = Image.open(REF + nombre).convert('RGBA')
    bb = im.getbbox()
    if bb:
        im = im.crop(bb)
    im.thumbnail((maxw, maxh), Image.Resampling.LANCZOS)
    _IMG[ck] = im
    return im



def text_layer(lines, colors, maxw, sizes):
    """Arma el bloque de texto con la letra más grande que entre en maxw."""
    for sz in sizes:
        f = font(sz)
        tmp = ImageDraw.Draw(Image.new('RGBA', (10, 10)))
        boxes = [tmp.textbbox((0, 0), x, font=f) for x in lines]
        widths = [b[2] - b[0] for b in boxes]
        if max(widths) <= maxw - 16 or sz == sizes[-1]:
            heights = [b[3] - b[1] + 10 for b in boxes]
            ww, hh = max(widths) + 16, sum(heights) + 16
            lay = Image.new('RGBA', (ww, hh), (0, 0, 0, 0))
            dd = ImageDraw.Draw(lay)
            y = 4
            for line, c, tw, th in zip(lines, colors, widths, heights):
                dd.text(((ww - tw) // 2, y), line, font=f, fill=c)
                y += th
            return lay
    raise AssertionError


PAL1 = [[RED, BLUE, INK], [BLUE, INK, RED], [INK, RED, GOLD], [BLUE, RED, GOLD]]
PAL2 = [[INK, GOLD, INK], [GOLD, INK, BLUE], [INK, BLUE, GOLD]]


def build_screens():
    screens = []
    for i, s in enumerate(GUION):
        m = MARKS[i]
        t0 = max(0.0, m['t0'] - 0.3)
        end = max(0.0, MARKS[i + 1]['t0'] - 0.3) if i + 1 < len(MARKS) else DUR
        els = []
        k = clave(i, s)
        if k:
            zona_x, zona_w = 690, 550
            im = img(k, 590, 500)

            els.append(dict(im=im, x=60 + (600 - im.width) // 2,
                            y=max(120, (H - im.height) // 2),
                            rows=max(4, min(9, im.height // 62))))
        else:
            zona_x, zona_w = (140 if i % 2 == 0 else 330), 810
        y = None
        blocks = []
        if s['t1']:
            blocks.append((s['t1'], PAL1[i % len(PAL1)], [64, 56, 48, 42, 36]))
        if s['t2']:
            blocks.append((s['t2'], PAL2[i % len(PAL2)], [40, 36, 32, 28, 24]))
        layers = [text_layer(l, c[:len(l)], zona_w, sz) for l, c, sz in blocks]
        total = sum(la.height for la in layers) + 34 * (len(layers) - 1)
        y = max(90, (H - total) // 2)
        for la, (lines, _, _) in zip(layers, blocks):
            els.append(dict(im=la, x=zona_x + (zona_w - la.width) // 2, y=y,
                            rows=len(lines)))
            y += la.height + 34
        # reparto del tiempo de escritura dentro de la frase
        hablado = max(1.0, m['t1'] - m['t0'])
        per = max(0.45, min(hablado * 0.62 / max(1, len(els)), 2.6))
        cur = t0
        for el in els:
            el['t0'] = cur
            el['t1'] = cur + per
            cur += per * 0.84
        screens.append(dict(t0=t0, t1=end, els=els))
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
