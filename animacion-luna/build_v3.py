"""Volumen 1 — continuación: desde el Apolo 8 hasta el cierre.

Mismo estilo aprobado: fondo blanco, recortes de tinta y acuarela, la mano con
lápiz dibujando cada elemento en su color definitivo y las letras que se
escriben y quedan quietas (sin movimiento).
"""
import json, math, os, subprocess
from PIL import Image, ImageDraw, ImageChops, ImageFont

W, H, FPS = 1280, 720, 30
AUDIO = '/tmp/luna/mix_v3.wav'
MARKS = json.load(open('/tmp/luna/marks_v3.json'))
OUT = os.environ.get('OUT', '/mnt/documents/alunizaje_luna_v3_parte2.mp4')
DUR = float(os.environ.get('DUR', MARKS[-1]['t1'] + 1.2))
LIMIT = float(os.environ.get('LIMIT', DUR))
START = float(os.environ.get('START', 0))
N = math.ceil(FPS * (min(DUR, LIMIT) - START))
REF = '/mnt/documents/ref/'


def font(sz):
    path = subprocess.run(['fc-match', '-f', '%{file}', 'DejaVu Sans Condensed:bold'],
                          capture_output=True, text=True, check=True).stdout
    return ImageFont.truetype(path, sz)


F_TITLE, F_BIG, F_MED, F_QUOTE, F_TINY = font(74), font(56), font(38), font(42), font(16)
RED = (200, 42, 46, 255)
BLUE = (26, 88, 148, 255)
GOLD = (206, 146, 36, 255)
INK = (30, 33, 37, 255)
PALETTE = [BLUE, INK, GOLD, RED]

hand = Image.open('/dev-server/public/demo/mano-lapiz.png').convert('RGBA').resize((260, 260), Image.Resampling.LANCZOS)
TIPX, TIPY = int(.205 * 260), int(.664 * 260)

_cache: dict[str, Image.Image] = {}


def load(name, w=470, hmax=520):
    key = f'{name}:{w}:{hmax}'
    if key not in _cache:
        im = Image.open(REF + name + '.png').convert('RGBA')
        bb = im.getbbox()
        if bb:
            im = im.crop(bb)
        im.thumbnail((w, hmax), Image.Resampling.LANCZOS)
        _cache[key] = im
    return _cache[key]


# escena -> (dibujo, líneas del rótulo, color del acento), tomado del guión v3
COLS = {'R': RED, 'B': BLUE, 'G': GOLD, 'I': INK}
PLAN = {m['n']: (m['img'], m['rot'], COLS.get(m['color'], INK)) for m in MARKS}


def text_layer(lines, colors, f, spacing=6):
    d = ImageDraw.Draw(Image.new('RGBA', (10, 10)))
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


def screens():
    out = []
    for i, mark in enumerate(MARKS):
        n = mark['n']
        key, lines, accent = PLAN[n]
        t0 = max(0, mark['t0'] - .25)
        end = (MARKS[i + 1]['t0'] - .25) if i + 1 < len(MARKS) else DUR
        left = i % 2 == 0
        img = load(key, 470 if left else 450, 500)
        ff = F_TITLE if (len(lines) == 1 and len(lines[0]) <= 12) else (F_BIG if max(map(len, lines)) <= 14 else F_MED)
        colors = [accent if j == 0 else PALETTE[(j + i) % 4] for j in range(len(lines))]
        lay = text_layer(lines, colors, ff)
        img_x = 90 if left else W - img.width - 90
        text_x = min(W - lay.width - 60, img_x + img.width + 70) if left else max(60, img_x - lay.width - 70)
        els = [
            dict(im=img, x=img_x, y=max(120, (H - img.height) // 2), rows=max(4, min(9, img.height // 62))),
            dict(im=lay, x=max(40, text_x), y=max(110, (H - lay.height) // 2 - 20), rows=len(lines)),
        ]
        available = max(.9, end - t0)
        per = max(.45, min(available * .34, 1.5))
        cur = t0
        for el in els:
            el['t0'] = cur
            el['t1'] = cur + per
            cur += per * .86
        out.append(dict(t0=t0, t1=end, els=els))
    return out


SC = screens()


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
       '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-ss', str(START), '-i', AUDIO,
       '-t', str(min(DUR, LIMIT) - START), '-filter_complex',
       '[0:v]scale=1920:1080:flags=lanczos,format=yuv420p[v];[1:a]highpass=f=70,lowpass=f=15000,'
       'equalizer=f=3200:t=q:w=1:g=1.5,acompressor=threshold=-18dB:ratio=2.5:attack=15:release=180,'
       'loudnorm=I=-16:TP=-1.5:LRA=11[a]',
       '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19',
       '-profile:v', 'high', '-level', '4.1', '-c:a', 'aac', '-b:a', '192k',
       '-movflags', '+faststart', '-shortest', OUT]
proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
assert proc.stdin is not None
for frame in range(N):
    t = START + frame / FPS
    idx = max((i for i, s in enumerate(SC) if t >= s['t0']), default=0)
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
