"""Animación Luna — VOLUMEN 2.

Estilo: fondo blanco liso, siluetas/recortes en tinta y acuarela (sin marcos ni
cuadros), la mano dibuja cada elemento ya en su color definitivo (sin transición
tinta→color) y los títulos entran con movimiento (deslizamiento + revelado) pero
con color fijo.
"""
import json, math, subprocess, wave
from PIL import Image, ImageDraw, ImageChops, ImageFont

W, H, FPS = 1280, 720, 30
AUDIO = '/tmp/luna/mix_raw_v2.wav'
OUT = '/mnt/documents/alunizaje_luna_volumen2.mp4'
MARKS = json.load(open('/tmp/luna/marks_v2.json'))
with wave.open(AUDIO) as w:
    DUR = w.getnframes() / w.getframerate()
N = math.ceil(FPS * DUR)


def font(sz):
    p = subprocess.run(['fc-match', '-f', '%{file}', 'DejaVu Sans Condensed:bold'],
                       capture_output=True, text=True, check=True).stdout
    return ImageFont.truetype(p, sz)


F_TITLE, F_BIG, F_MED, F_QUOTE, F_TINY = font(74), font(56), font(38), font(42), font(16)
RED = (200, 42, 46, 255)
BLUE = (26, 88, 148, 255)
GOLD = (206, 146, 36, 255)
INK = (30, 33, 37, 255)

hand = Image.open('/dev-server/public/demo/mano-lapiz.png').convert('RGBA').resize((260, 260), Image.Resampling.LANCZOS)
TIPX, TIPY = int(.205 * 260), int(.664 * 260)

REF = '/mnt/documents/ref/'


def load(name, w, hmax=560):
    im = Image.open(REF + name).convert('RGBA')
    bb = im.getbbox()
    if bb:
        im = im.crop(bb)
    im.thumbnail((w, hmax), Image.Resampling.LANCZOS)
    return im


IMG = {
    'luna': load('v2-luna.png', 340, 340),
    'patio': load('v2-patio.png', 300, 560),
    'saturno': load('v2-saturno.png', 330, 560),
    'kennedy': load('v2-kennedy.png', 470, 540),
    'congreso': load('v2-kennedy-congreso.png', 700, 520),
    'ingenieros': load('v2-ingenieros.png', 700, 520),
    'mercury': load('v2-mercury.png', 470, 520),
    'gagarin': load('v2-gagarin.png', 440, 540),
    'carrera': load('v2-carrera.png', 700, 500),
    'tripulacion': load('v2-tripulacion.png', 720, 500),
    'grissom': load('v2-grissom.png', 430, 540),
    'white': load('v2-white.png', 470, 540),
    'chaffee': load('v2-chaffee.png', 430, 540),
    'prueba': load('v2-prueba.png', 700, 510),
    'chispa': load('v2-chispa.png', 500, 520),
    'escotilla': load('v2-escotilla.png', 640, 500),
    'grissom_cita': load('v2-grissom-cita.png', 470, 540),
    'huella': load('v2-huella.png', 460, 500),
}


def text_layer(lines, colors, f, spacing=6):
    tmp = Image.new('RGBA', (10, 10))
    d = ImageDraw.Draw(tmp)
    if not isinstance(colors, list):
        colors = [colors] * len(lines)
    boxes = [d.textbbox((0, 0), x, font=f) for x in lines]
    widths = [b[2] - b[0] for b in boxes]
    heights = [b[3] - b[1] + spacing for b in boxes]
    ww, hh = max(widths) + 20, sum(heights) + 18
    lay = Image.new('RGBA', (ww, hh), (0, 0, 0, 0))
    dd = ImageDraw.Draw(lay)
    y = 4
    for line, c, tw, th in zip(lines, colors, widths, heights):
        dd.text(((ww - tw) // 2, y), line, font=f, fill=c)
        y += th
    return lay


# (segmento de narración, [elementos]) — 'i' imagen, 't' texto
SCREENS = [
    (0, [('t', ['EL ALUNIZAJE'], [RED], F_TITLE, 90, 90), ('t', ['LA HISTORIA COMPLETA'], [BLUE], F_MED, 108, 190), ('i', 'luna', 840, 200)]),
    (1, [('i', 'patio', 120, 130), ('t', ['LA MISMA LUNA'], [BLUE], F_MED, 520, 120), ('t', ['DE LOS EGIPCIOS,', 'LOS ROMANOS', 'Y TU BISABUELO'], [INK, INK, GOLD], F_BIG, 520, 200)]),
    (2, [('t', ['OCHO AÑOS'], [RED], F_TITLE, 90, 100), ('t', ['REGLAS DE CÁLCULO', 'Y CAFÉ FRÍO'], [INK, BLUE], F_MED, 100, 210), ('i', 'saturno', 830, 130)]),
    (3, [('t', ['25 MAYO 1961'], [GOLD], F_MED, 110, 80), ('i', 'kennedy', 120, 150), ('t', ['KENNEDY', 'PROMETE', 'LA LUNA'], [BLUE, INK, RED], F_BIG, 730, 190)]),
    (4, [('i', 'congreso', 60, 150), ('t', ['«UN HOMBRE EN LA LUNA'], [INK], F_QUOTE, 500, 70), ('t', ['ANTES DEL FIN', 'DE LA DÉCADA»'], [RED, BLUE], F_QUOTE, 800, 470)]),
    (5, [('i', 'ingenieros', 60, 170), ('t', ['LA SALA APLAUDE'], [BLUE], F_MED, 700, 90), ('t', ['EN LA NASA', 'SE PONEN', 'PÁLIDOS'], [INK, INK, RED], F_BIG, 810, 170)]),
    (6, [('i', 'mercury', 90, 160), ('t', ['SOLO'], [INK], F_MED, 700, 110), ('t', ['15 MINUTOS'], [RED], F_TITLE, 620, 160), ('t', ['ALAN SHEPARD', 'UN SALTO CORTO'], [BLUE, INK], F_MED, 660, 270)]),
    (7, [('i', 'gagarin', 110, 150), ('t', ['YURI GAGARIN'], [RED], F_BIG, 630, 110), ('t', ['UNA VUELTA', 'COMPLETA A', 'LA TIERRA'], [BLUE, INK, GOLD], F_BIG, 680, 210)]),
    (8, [('i', 'carrera', 60, 190), ('t', ['NO ERA CURIOSIDAD'], [BLUE], F_MED, 690, 90), ('t', ['ERA MIEDO'], [RED], F_TITLE, 760, 160), ('t', ['QUIEN LLEGARA PRIMERO', 'MANDABA EN EL CIELO'], [INK, GOLD], F_MED, 700, 265)]),
    (9, [('i', 'tripulacion', 55, 190), ('t', ['CÓMO EMPEZÓ', 'DE VERDAD'], [BLUE, INK], F_MED, 700, 80), ('t', ['TRES MUERTOS'], [RED], F_BIG, 700, 175)]),
    (10, [('i', 'grissom', 130, 150), ('t', ['VIRGIL «GUS»', 'GRISSOM'], [BLUE, RED], F_BIG, 660, 120), ('t', ['VETERANO. SEGUNDO', 'ESTADOUNIDENSE', 'EN EL ESPACIO'], [INK, INK, GOLD], F_MED, 660, 270)]),
    (11, [('i', 'white', 110, 150), ('t', ['ED WHITE'], [BLUE], F_TITLE, 690, 120), ('t', ['EL PRIMERO EN', 'CAMINAR FUERA', 'DE LA NAVE'], [INK, GOLD, INK], F_MED, 700, 240)]),
    (12, [('i', 'chaffee', 140, 150), ('t', ['ROGER CHAFFEE'], [BLUE], F_BIG, 640, 130), ('t', ['JOVEN. INGENIERO.', 'A PUNTO DE VOLAR', 'POR PRIMERA VEZ'], [INK, GOLD, INK], F_MED, 660, 250)]),
    (13, [('i', 'prueba', 60, 180), ('t', ['27 ENERO 1967'], [GOLD], F_MED, 690, 85), ('t', ['NO ERA UN', 'LANZAMIENTO:', 'UN ENSAYO', 'EN TIERRA'], [INK, BLUE, INK, RED], F_BIG, 780, 160)]),
    (14, [('i', 'chispa', 110, 170), ('t', ['UN CABLE PELADO'], [INK], F_MED, 690, 100), ('t', ['UNA CHISPA'], [RED], F_TITLE, 700, 165), ('t', ['EN OXÍGENO PURO', 'TODO ES COMBUSTIBLE'], [BLUE, GOLD], F_MED, 660, 275)]),
    (15, [('i', 'escotilla', 70, 180), ('t', ['LA ESCOTILLA ABRÍA', 'HACIA ADENTRO'], [BLUE, INK], F_MED, 760, 100), ('t', ['MENOS DE', '30 SEGUNDOS'], [INK, RED], F_BIG, 800, 200)]),
    (16, [('i', 'grissom_cita', 120, 150), ('t', ['«ESTE ES UN', 'NEGOCIO', 'RIESGOSO»'], [INK, RED, GOLD], F_QUOTE, 690, 180)]),
    (17, [('i', 'huella', 130, 170), ('t', ['LA NASA REDISEÑÓ', 'LA NAVE ENTERA'], [BLUE, INK], F_MED, 700, 110), ('t', ['ASÍ SE LLEGÓ', 'A LA LUNA'], [RED, GOLD], F_BIG, 720, 210)]),
]


def elementize():
    screens = []
    for si, (mi, specs) in enumerate(SCREENS):
        t0 = max(0, MARKS[mi]['t0'] - .2)
        end = (MARKS[SCREENS[si + 1][0]]['t0'] - .2) if si + 1 < len(SCREENS) else DUR
        available = max(.8, end - t0)
        draw_total = min(available * .58, 2.8)
        per = max(.42, draw_total / len(specs))
        cur = t0
        els = []
        for spec in specs:
            if spec[0] == 'i':
                _, key, x, y = spec
                lay = IMG[key]
                rows = max(4, min(9, lay.height // 62))
                slide = 0
            else:
                _, lines, colors, ff, x, y = spec
                lay = text_layer(lines, colors, ff)
                rows = len(lines)
                slide = 26
            els.append(dict(im=lay, x=x, y=y, t0=cur, t1=cur + per, rows=rows, slide=slide))
            cur += per * .86
        screens.append(dict(t0=t0, t1=end, els=els))
    return screens


SC = elementize()


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


def paste_fade(canvas, im, xy, alpha):
    if alpha >= .999:
        canvas.paste(im, xy, im)
        return
    x = im.copy()
    x.putalpha(x.getchannel('A').point(lambda a: int(a * alpha)))
    canvas.paste(x, xy, x)


def ease(x):
    x = max(0, min(1, x))
    return x * x * (3 - 2 * x)


cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
       '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-i', AUDIO, '-filter_complex',
       '[0:v]scale=1920:1080:flags=lanczos,format=yuv420p[v];[1:a]highpass=f=70,lowpass=f=15000,'
       'equalizer=f=3200:t=q:w=1:g=1.5,acompressor=threshold=-18dB:ratio=2.5:attack=15:release=180,'
       'loudnorm=I=-16:TP=-1.5:LRA=11[a]',
       '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19',
       '-profile:v', 'high', '-level', '4.1', '-c:a', 'aac', '-b:a', '192k',
       '-movflags', '+faststart', '-shortest', OUT]
proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
assert proc.stdin is not None
for frame in range(N):
    t = frame / FPS
    idx = max(i for i, s in enumerate(SC) if t >= s['t0']) if t >= SC[0]['t0'] else 0
    s = SC[idx]
    canvas = Image.new('RGB', (W, H), (255, 255, 255))
    tip = None
    for el in s['els']:
        if t < el['t0']:
            continue
        p = (t - el['t0']) / max(.05, el['t1'] - el['t0'])
        # movimiento de entrada: los bloques de texto se asientan desde abajo
        off = int(el['slide'] * (1 - ease(min(1.0, p * 1.4))))
        if p < 1:
            im, tx, ty = mask_reveal(el['im'], el['rows'], ease(p))
            canvas.paste(im, (el['x'], el['y'] + off), im)
            tip = (el['x'] + tx, el['y'] + off + ty)
        else:
            canvas.paste(el['im'], (el['x'], el['y']), el['im'])
    if tip:
        hx = int(max(-180, min(W - 40, tip[0] - TIPX)))
        hy = int(max(-180, min(H - 45, tip[1] - TIPY)))
        canvas.paste(hand, (hx, hy), hand)
    d = ImageDraw.Draw(canvas)
    d.text((70, 686), 'ANIMACIÓN LUNA  ·  VOLUMEN 1  ·  EL ALUNIZAJE', font=F_TINY, fill=(150, 152, 155))
    proc.stdin.write(canvas.tobytes())
proc.stdin.close()
code = proc.wait()
if code:
    raise SystemExit(code)
print(OUT, DUR)
