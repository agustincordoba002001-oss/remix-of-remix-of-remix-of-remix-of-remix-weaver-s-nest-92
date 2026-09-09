import os, math
from PIL import Image, ImageDraw, ImageFont

W, H, FPS, DUR = 720, 1280, 30, 10.0
N = int(FPS * DUR)
OUT = "/tmp/wb/frames"
os.makedirs(OUT, exist_ok=True)

FB = "/nix/store"
def font(sz):
    for p in ["/run/current-system/sw/share/X11/fonts/DejaVuSans-Bold.ttf"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    import subprocess
    p = subprocess.run(["fc-match", "-f", "%{file}", "DejaVu Sans:bold"], capture_output=True, text=True).stdout
    return ImageFont.truetype(p, sz)

def condensed(sz):
    import subprocess
    p = subprocess.run(["fc-match", "-f", "%{file}", "DejaVu Sans Condensed:bold"], capture_output=True, text=True).stdout
    return ImageFont.truetype(p, sz)

hand = Image.open("/dev-server/public/demo/mano-lapiz.png").convert("RGBA")
hand = hand.resize((360, 360), Image.LANCZOS)
TIPX, TIPY = int(0.205 * 360), int(0.664 * 360)

def load(path, w):
    im = Image.open(path).convert("RGBA")
    h = int(im.height * w / im.width)
    return im.resize((w, h), Image.LANCZOS)

luna = load("/mnt/documents/ref/luna.png", 430)
romano = load("/mnt/documents/ref/romano.png", 380)

def text_layer(lines, fnt, color, spacing=10):
    tmp = Image.new("RGBA", (W, H))
    d = ImageDraw.Draw(tmp)
    ws, hs = [], []
    for ln in lines:
        b = d.textbbox((0, 0), ln, font=fnt)
        ws.append(b[2] - b[0]); hs.append(b[3] - b[1] + spacing)
    lw, lh = max(ws), sum(hs)
    layer = Image.new("RGBA", (lw + 20, lh + 20), (0, 0, 0, 0))
    dd = ImageDraw.Draw(layer)
    y = 0
    for i, ln in enumerate(lines):
        dd.text(((lw - ws[i]) // 2 + 10, y), ln, font=fnt, fill=color)
        y += hs[i]
    return layer

# elements: (layer, x, y, t_start, t_end, rows)
F_TITLE = condensed(66)
F_SUB = condensed(52)

title = text_layer(["¿POR QUÉ EL LUNES", "SE LLAMA LUNES?"], F_TITLE, (214, 32, 32, 255))
dies = text_layer(["\"DIES LUNAE\""], F_SUB, (20, 20, 20, 255))

ELS = [
    dict(im=title, x=(W - title.width) // 2, y=90, t0=0.15, t1=2.0, rows=2),
    dict(im=romano, x=30, y=360, t0=2.1, t1=4.3, rows=6),
    dict(im=dies, x=W - dies.width - 50, y=560, t0=4.4, t1=5.9, rows=1),
    dict(im=luna, x=(W - luna.width) // 2 + 40, y=830, t0=6.0, t1=8.6, rows=5),
]


def reveal(el, p):
    """Return (masked image, tip x, tip y in element coords) for progress p in [0,1]."""
    im, rows = el["im"], el["rows"]
    mask = Image.new("L", im.size, 0)
    d = ImageDraw.Draw(mask)
    rh = im.height / rows
    total = rows
    pos = p * total
    r = int(pos)
    frac = pos - r
    for i in range(min(r, rows)):
        d.rectangle([0, i * rh - 2, im.width, (i + 1) * rh + 2], fill=255)
    tx, ty = im.width, im.height
    if r < rows:
        wdt = im.width * frac
        d.rectangle([0, r * rh - 2, wdt, (r + 1) * rh + 2], fill=255)
        tx, ty = wdt, r * rh + rh * 0.55
    out = im.copy()
    a = out.getchannel("A").point(lambda v: v)
    from PIL import ImageChops
    out.putalpha(ImageChops.multiply(a, mask))
    return out, tx, ty


def ease(t):
    return t * t * (3 - 2 * t)


for f in range(N):
    t = f / FPS
    canvas = Image.new("RGB", (W, H), (255, 255, 255))
    tip = None
    for el in ELS:
        if t < el["t0"]:
            continue
        p = min(1.0, (t - el["t0"]) / (el["t1"] - el["t0"]))
        if p >= 1.0:
            img = el["im"]
            # subtle settle pop right after finishing
            canvas.paste(img, (el["x"], el["y"]), img)
        else:
            img, tx, ty = reveal(el, ease(p))
            canvas.paste(img, (el["x"], el["y"]), img)
            tip = (el["x"] + tx, el["y"] + ty)
    if tip:
        hx, hy = int(tip[0] - TIPX), int(tip[1] - TIPY)
        canvas.paste(hand, (hx, hy), hand)
    canvas.save(f"{OUT}/{f:04d}.png")

print("frames", N)
