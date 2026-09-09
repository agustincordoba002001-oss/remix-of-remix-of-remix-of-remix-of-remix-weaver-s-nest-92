"""Narración completa de EL TITANIC — voz Dark, sin música de fondo.

Genera /mnt/documents/tt/full.wav y /mnt/documents/tt/marks_full.json.
Cada frase se sintetiza y masteriza una sola vez: si el proceso se corta,
al volver a ejecutarlo continúa donde quedó.
"""
import json
import os
import re
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from voces_space import sintetizar  # noqa: E402
from mastering import masterizar  # noqa: E402
from guion_titanic import GUION  # noqa: E402

SR = 48000
TMP = '/mnt/documents/tt'
SEG = '/mnt/documents/voces_tt'
os.makedirs(TMP, exist_ok=True)
os.makedirs(SEG, exist_ok=True)


def leer_wav(path):
    with wave.open(path, 'rb') as w:
        raw = w.readframes(w.getnframes())
        sr, ch = w.getframerate(), w.getnchannels()
    a = np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0
    if ch > 1:
        a = a.reshape(-1, ch).mean(axis=1)
    if sr != SR:
        m = int(len(a) * SR / sr)
        a = np.interp(np.linspace(0, len(a) - 1, m), np.arange(len(a)), a).astype(np.float32)
    return a


def recortar_silencio(a, umbral=0.012):
    idx = np.where(np.abs(a) > umbral)[0]
    if len(idx) == 0:
        return a
    ini = max(0, idx[0] - int(0.04 * SR))
    fin = min(len(a), idx[-1] + int(0.10 * SR))
    return a[ini:fin]


DRAMATICAS = ('muertos', 'murieron', 'miedo', 'hundir', 'hundió', 'gritos', 'frío',
              'congelados', 'cementerio', 'silencio', 'nunca', 'tragedia', 'oscuridad')
AGILES = ('porque', 'entonces', 'después', 'y todo', 'además', 'mientras')


def ritmo(txt):
    """Ritmo frase a frase: más lento en lo dramático, más ágil en lo narrativo."""
    t = txt.lower()
    v = 1.0
    if any(k in t for k in DRAMATICAS):
        v += 0.055
    if any(t.startswith(k) for k in AGILES):
        v -= 0.03
    if len(txt) > 140:
        v -= 0.02
    if re.search(r'\d', t):
        v -= 0.03
    return round(min(1.08, max(0.95, v)), 3)


def nivelar(a, objetivo=0.079, techo=0.68):
    activo = a[np.abs(a) > 0.01]
    rms = float(np.sqrt(np.mean(activo ** 2))) if len(activo) else 1e-6
    g = objetivo / max(1e-6, rms)
    pico = float(np.abs(a).max()) or 1e-6
    return a * min(g, techo / pico)


def main():
    parts = [np.zeros(int(0.4 * SR), np.float32)]
    marks = []
    tcur = 0.4
    for i, s in enumerate(GUION):
        txt, gap = s['txt'], s['gap']
        ajustes = {
            'length_scale': ritmo(txt),
            'noise_scale': round(0.48 + (i % 3) * 0.01, 3),
            'noise_w': round(0.60 + (i % 2) * 0.02, 3),
        }
        raw = f'{SEG}/f_{i:03d}.wav'
        dst = f'{SEG}/f_{i:03d}_master.wav'
        if not os.path.exists(raw):
            sintetizar(txt, 'dark', raw, ajustes=ajustes)
        if not os.path.exists(dst):
            masterizar(raw, dst, 'dark')
        a = recortar_silencio(leer_wav(dst))
        a = nivelar(a)
        fade = int(0.05 * SR)
        a[:fade] *= np.linspace(0, 1, fade)
        a[-fade:] *= np.linspace(1, 0, fade)
        marks.append(dict(t0=tcur, t1=tcur + len(a) / SR, txt=txt))
        tcur += len(a) / SR + gap
        parts.append(a)
        parts.append(np.zeros(int(gap * SR), np.float32))
        if i % 10 == 0:
            print('frase', i, 'de', len(GUION), 'min', round(tcur / 60, 2), flush=True)

    voz = np.concatenate(parts)
    pico = float(np.abs(voz).max())
    if pico > 0.80:
        voz *= 0.80 / pico
    voz = np.clip(voz, -1, 1)
    with wave.open(f'{TMP}/full.wav', 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((voz * 32767).astype(np.int16).tobytes())
    json.dump(marks, open(f'{TMP}/marks_full.json', 'w'), ensure_ascii=False)
    print('LISTO dur_min', round(len(voz) / SR / 60, 2))


if __name__ == '__main__':
    main()
