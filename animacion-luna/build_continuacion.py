"""Volumen 1 — continuación: desde el Apolo 8 hasta el cierre.

Mismo estilo aprobado: fondo blanco, recortes de tinta y acuarela, la mano con
lápiz dibujando cada elemento en su color definitivo y las letras que se
escriben y quedan quietas (sin movimiento).
"""
import json, math, os, subprocess
from PIL import Image, ImageDraw, ImageChops, ImageFont

W, H, FPS = 1280, 720, 30
AUDIO = '/tmp/luna/mix_continuacion.wav'
MARKS = json.load(open('/tmp/luna/marks_continuacion.json'))
OUT = os.environ.get('OUT', '/mnt/documents/alunizaje_luna_volumen1_parte2.mp4')
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


# escena -> (dibujo, líneas del rótulo, color del acento)
PLAN = {
    10: ('v3-apollo8', ['NAVIDAD DE 1968', 'DIEZ VUELTAS', 'SIN BAJAR'], RED),
    11: ('v3-earthrise', ['LA TIERRA', 'SALIENDO'], BLUE),
    12: ('v3-lunacerca', ['APOLO 10', 'A 15 KILÓMETROS'], GOLD),
    13: ('v3-trio', ['TRES PILOTOS', 'MUY FRÍOS'], BLUE),
    14: ('v3-armstrong', ['NEIL ARMSTRONG', '38 AÑOS, OHIO'], BLUE),
    15: ('v3-gemini8', ['GEMINI 8', 'UNA VUELTA', 'POR SEGUNDO'], RED),
    16: ('v3-gemini8', ['LA CAMA VOLADORA', 'Y EL PAPELEO'], INK),
    17: ('v3-aldrin', ['BUZZ ALDRIN', 'DOCTOR RENDEZVOUS'], BLUE),
    18: ('v3-collins', ['MICHAEL COLLINS', 'EL QUE SE QUEDA'], GOLD),
    19: ('v3-playas', ['16 DE JULIO', 'UN MILLÓN', 'DE PERSONAS'], RED),
    20: ('v3-trajes', ['TRAJES', 'DE 30 KILOS'], INK),
    21: ('v3-despegue', ['SATURNO V', '110 METROS'], BLUE),
    22: ('v3-despegue', ['13 TONELADAS', 'POR SEGUNDO'], RED),
    23: ('v3-despegue', ['NUEVE... CERO'], RED),
    24: ('v3-despegue', ['UNA LLAMA', 'DE 300 METROS'], GOLD),
    25: ('v3-sonido', ['15 SEGUNDOS', 'DE SILENCIO'], BLUE),
    26: ('v3-sonido', ['COMO UN TREN', 'DESCARRILANDO'], INK),
    27: ('v3-canica', ['NUEVE MINUTOS', 'A OTRO MUNDO'], RED),
    28: ('v3-canica', ['INYECCIÓN', 'TRANSLUNAR'], BLUE),
    29: ('v3-acople', ['GIRAR 180°', 'Y ACOPLAR'], INK),
    30: ('v3-eagle', ['PAREDES DE', 'TRES HOJAS', 'DE PAPEL'], RED),
    31: ('v3-eagle', ['VOLABAN', 'PARADOS'], INK),
    32: ('v3-canica', ['LA TIERRA', 'ERA UNA CANICA'], GOLD),
    33: ('v3-lunacerca', ['LA LUNA', 'LES TAPA', 'EL CIELO'], BLUE),
    34: ('v3-lunacerca', ['FRENAR', 'A CIEGAS'], RED),
    35: ('v3-houston', ['ÓRBITA LUNAR', 'CONFIRMADA'], BLUE),
    36: ('v3-desolacion', ['LA CARA OCULTA', 'SIN POESÍA'], INK),
    37: ('v3-eagle', ['20 DE JULIO', 'ESCOTILLA', 'CERRADA'], RED),
    38: ('v3-solo', ['EL HOMBRE', 'MÁS SOLO'], BLUE),
    39: ('v3-solo', ['«CASI JÚBILO»'], GOLD),
    40: ('v3-eagle', ['DESCENSO', 'MOTORIZADO', '12 MINUTOS'], RED),
    41: ('v3-lunacerca', ['LA CUENTA', 'DA MAL'], INK),
    42: ('v3-rocas', ['VARIOS', 'KILÓMETROS', 'DE MÁS'], RED),
    43: ('v3-alarma', ['ALARMA 1202'], RED),
    44: ('v3-bales', ['STEVE BALES', '26 AÑOS'], BLUE),
    45: ('v3-bales', ['CUATRO', 'SEGUNDOS', 'PARA DECIDIR'], RED),
    46: ('v3-alarma', ['NO SE COLGABA', 'PRIORIZABA'], BLUE),
    47: ('v3-hamilton', ['MARGARET', 'HAMILTON', 'MIT'], GOLD),
    48: ('v3-alarma', ['ALARMA 1201', 'ADELANTE'], RED),
    49: ('v3-eagle', ['750 PIES', 'BAJANDO A 23'], INK),
    50: ('v3-rocas', ['ROCAS DEL', 'TAMAÑO DE', 'AUTOS'], RED),
    51: ('v3-rocas', ['CONTROL', 'MANUAL'], BLUE),
    52: ('v3-houston', ['SIN VIDEO', 'SOLO NÚMEROS'], INK),
    53: ('v3-combustible', ['60 SEGUNDOS'], RED),
    54: ('v3-rocas', ['ENCUENTRA', 'UN CLARO'], BLUE),
    55: ('v3-polvo', ['POLVO SIN', 'REMOLINOS'], GOLD),
    56: ('v3-houston', ['30 SEGUNDOS', 'NADIE RESPIRA'], RED),
    57: ('v3-alunizado', ['LUZ DE', 'CONTACTO'], BLUE),
    58: ('v3-alunizado', ['20:17:40'], INK),
    59: ('v3-combustible', ['QUEDABAN', '25 SEGUNDOS'], RED),
    60: ('v3-alunizado', ['«EL ÁGUILA', 'HA ALUNIZADO»'], RED),
    61: ('v3-houston', ['«YA VOLVEMOS', 'A RESPIRAR»'], BLUE),
    62: ('v3-houston', ['EDAD PROMEDIO', '26 AÑOS'], GOLD),
    63: ('v3-houston', ['600 MILLONES', 'MIRANDO'], RED),
    64: ('v3-eagle', ['DOS HORAS', 'POR SI HABÍA', 'QUE HUIR'], INK),
    65: ('v3-eagle', ['PAN Y VINO', 'EN LA LUNA'], GOLD),
    66: ('v3-desolacion', ['«EN CASO DE', 'DESASTRE LUNAR»'], INK),
    67: ('v3-desolacion', ['«DESCANSAR', 'EN PAZ»'], RED),
    68: ('v3-trajes', ['TRES HORAS', 'EN UN PLACARD'], INK),
    69: ('v3-primerpaso', ['SALE DE', 'ESPALDAS'], BLUE),
    70: ('v3-primerpaso', ['NUEVE', 'ESCALONES'], INK),
    71: ('v3-primerpaso', ['21 DE JULIO', '02:56'], GOLD),
    72: ('v3-primerpaso', ['«UN PEQUEÑO', 'PASO»'], RED),
    73: ('v3-primerpaso', ['TIERRA EN', 'EL BOLSILLO'], INK),
    74: ('v3-desolacion', ['«MAGNÍFICA', 'DESOLACIÓN»'], BLUE),
    75: ('v3-canguro', ['TROTE DE', 'CANGURO'], GOLD),
    76: ('v3-canguro', ['OLOR A', 'PÓLVORA'], INK),
    77: ('v3-bandera', ['LA BANDERA', 'APENAS', 'APOYADA'], RED),
    78: ('v3-bandera', ['LA VIO CAER', 'POR LA VENTANA'], INK),
    79: ('v3-houston', ['LA LLAMADA', 'MÁS LARGA'], BLUE),
    80: ('v3-reflector', ['LA LUNA SUENA', 'COMO CAMPANA'], GOLD),
    81: ('v3-reflector', ['3,5 CM', 'POR AÑO'], BLUE),
    82: ('v3-reflector', ['«VINIMOS', 'EN PAZ»'], RED),
    83: ('v3-rocas', ['21 KILOS', 'DE ROCAS'], INK),
    84: ('v3-polvo', ['96 BOLSAS', 'EN LA LUNA'], GOLD),
    85: ('v3-lapicera', ['LA PALANCA', 'ROTA'], RED),
    86: ('v3-lapicera', ['380.000 KM', 'SIN FERRETERÍA'], INK),
    87: ('v3-lapicera', ['CLIC.', 'FUNCIONÓ'], RED),
    88: ('v3-despegue-lunar', ['17:54', 'DESPEGUE'], BLUE),
    89: ('v3-acople', ['UN APRETÓN', 'DE MANOS'], INK),
    90: ('v3-polvo', ['EL OLOR', 'VOLVIÓ CON', 'ELLOS'], GOLD),
    91: ('v3-splashdown', ['3.000 GRADOS', 'UNA BOLA', 'DE FUEGO'], RED),
    92: ('v3-cuarentena', ['EL MIEDO A', 'LOS CEREALES'], INK),
    93: ('v3-cuarentena', ['UNA CASILLA', 'RODANTE'], BLUE),
    94: ('v3-costureras', ['400.000', 'PERSONAS'], BLUE),
    95: ('v3-costureras', ['25.000', 'MILLONES'], RED),
    96: ('v3-costureras', ['«WHITEY ON', 'THE MOON»'], INK),
    97: ('v3-huella-final', ['DOCE PERSONAS', 'Y NADIE MÁS'], RED),
    98: ('v3-huella-final', ['MILLONES', 'DE AÑOS'], GOLD),
    99: ('v3-armstrong', ['PROFESOR', 'DE INGENIERÍA'], BLUE),
    100: ('v3-collins', ['MURIÓ', 'EN 2021'], INK),
    101: ('v3-aldrin', ['SE RECUPERÓ', 'Y CONTÓ TODO'], BLUE),
    102: ('v3-alarma', ['CUATRO', 'KILOBYTES'], RED),
    103: ('v3-huella-final', ['MIRÁ', 'PARA ARRIBA'], GOLD),
    104: ('v3-reflector', ['ESTÁN AHÍ', 'AHORA MISMO'], BLUE),
    105: ('v3-lapicera', ['REGLAS DE CÁLCULO', 'CAFÉ FRÍO', 'Y UNA LAPICERA'], RED),
}


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
