"""Curiosidades — estilo Volumen 1 (pizarra blanca, mano que dibuja, recortes de tinta y acuarela)."""
import json, math, subprocess, wave
from PIL import Image, ImageDraw, ImageChops, ImageFont

W, H, FPS = 1280, 720, 30
AUDIO = '/tmp/cur/mix.wav'
OUT = '/mnt/documents/curiosidades_30s.mp4'
MARKS = json.load(open('/tmp/cur/marks.json'))
with wave.open(AUDIO) as w:
    DUR = w.getnframes() / w.getframerate()
N = math.ceil(FPS * DUR)


def font(sz):
    p = subprocess.run(['fc-match', '-f', '%{file}', 'DejaVu Sans Condensed:bold'],
                       capture_output=True, text=True, check=True).stdout
    return ImageFont.truetype(p, sz)


F_TITLE, F_BIG, F_MED, F_QUOTE, F_TINY = font(74), font(56), font(36), font(42), font(16)
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
    'reloj': load('cur-reloj.png', 340, 340),
    'eiffel': load('cur-eiffel.png', 340, 520),
    'pulpo': load('cur-pulpo.png', 560, 460),
    'miel': load('cur-miel.png', 560, 440),
    'cleopatra': load('cur-cleopatra.png', 360, 520),
    'napoleon': load('cur-napoleon.png', 400, 520),
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


SCREENS = [
    (0, [('t', ['CURIOSIDADES'], [RED], F_TITLE, 100, 110),
         ('t', ['CINCO DATOS QUE', 'CASI NADIE SABE'], [BLUE, INK], F_MED, 130, 230),
         ('i', 'reloj', 840, 190)]),
    (1, [('i', 'eiffel', 130, 150),
         ('t', ['01 · PARÍS'], [GOLD], F_MED, 620, 100),
         ('t', ['LA TORRE EIFFEL', 'CRECE EN VERANO'], [BLUE, INK], F_BIG, 560, 170),
         ('t', ['HASTA 15 CM MÁS ALTA'], [RED], F_MED, 620, 330)]),
    (2, [('i', 'pulpo', 90, 190),
         ('t', ['02 · EL PULPO'], [GOLD], F_MED, 720, 100),
         ('t', ['TRES CORAZONES', 'Y SANGRE AZUL'], [BLUE, RED], F_BIG, 690, 175),
         ('t', ['DOS PARA LAS BRANQUIAS', 'UNO PARA EL CUERPO'], [INK, INK], F_MED, 700, 330)]),
    (3, [('i', 'miel', 100, 210),
         ('t', ['03 · LA MIEL'], [GOLD], F_MED, 730, 100),
         ('t', ['NUNCA SE', 'ECHA A PERDER'], [BLUE, INK], F_BIG, 700, 170),
         ('t', ['TARROS EGIPCIOS', 'DE 3000 AÑOS'], [RED, INK], F_MED, 740, 330)]),
    (4, [('i', 'cleopatra', 140, 150),
         ('t', ['04 · CLEOPATRA'], [GOLD], F_MED, 640, 95),
         ('t', ['VIVIÓ MÁS CERCA', 'DEL ALUNIZAJE'], [BLUE, RED], F_BIG, 590, 165),
         ('t', ['QUE DE LA GRAN PIRÁMIDE'], [INK], F_MED, 610, 320)]),
    (5, [('i', 'napoleon', 130, 150),
         ('t', ['05 · NAPOLEÓN'], [GOLD], F_MED, 660, 100),
         ('t', ['NO ERA BAJO'], [RED], F_TITLE, 640, 170),
         ('t', ['1,69 M: LA ALTURA', 'NORMAL DE SU ÉPOCA'], [BLUE, INK], F_MED, 660, 300)]),
    (6, [('t', ['«LA HISTORIA SIEMPRE', 'TIENE UN DATO MÁS»'], [INK, RED], F_QUOTE, 300, 240),
         ('t', ['CRONOS'], [BLUE], F_TITLE, 470, 400)]),
]


def elementize():
    screens = []
    for si, (mi, specs) in enumerate(SCREENS):
        t0 = max(0, MARKS[mi]['t0'] - .2)
        end = (MARKS[SCREENS[si + 1][0]]['t0'] - .2) if si + 1 < len(SCREENS) else DUR
        available = max(.8, end - t0)
        draw_total = min(available * .60, 2.4)
        per = max(.34, draw_total / len(specs))
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
            cur += per * .84
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
import os
STILLS = [int(x) for x in os.environ.get('STILLS', '').split(',') if x.strip()]
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
    d.text((70, 686), 'CRONOS · CURIOSIDADES', font=F_TINY, fill=(150, 150, 150))
    if frame in STILLS:
        canvas.save(f'/tmp/cur/still-{frame}.png')
    proc.stdin.write(canvas.tobytes())
proc.stdin.close()
proc.wait()
print('listo', OUT)
