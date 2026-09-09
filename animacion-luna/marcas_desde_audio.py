"""Reconstruye las marcas de tiempo de cada frase a partir del audio ya narrado.

Detecta los silencios del wav y elige, entre todos ellos, los cortes que mejor
coinciden con el largo de cada frase del guion. Guarda marks_full.json.
"""
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from guion_titanic import GUION  # noqa: E402

WAV = '/mnt/documents/tt/full.wav'
OUT = '/mnt/documents/tt/marks_full.json'


def silencios(wav, umbral='-38dB', minimo=0.30):
    p = subprocess.run(['ffmpeg', '-hide_banner', '-i', wav, '-af',
                        f'silencedetect=n={umbral}:d={minimo}', '-f', 'null', '-'],
                       capture_output=True, text=True)
    ini, res = None, []
    for line in p.stderr.splitlines():
        a = re.search(r'silence_start: ([\d.]+)', line)
        b = re.search(r'silence_end: ([\d.]+)', line)
        if a:
            ini = float(a.group(1))
        elif b and ini is not None:
            res.append((ini, float(b.group(1))))
            ini = None
    return res


def duracion(wav):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries',
                                 'format=duration', '-of', 'csv=p=0', wav],
                                capture_output=True, text=True).stdout)


def main():
    total = duracion(WAV)
    sil = silencios(WAV)
    # arranque: primer silencio inicial = respiro previo
    inicio = sil[0][1] if sil and sil[0][0] < 0.05 else 0.0
    cand = [s for s in sil if s[0] > inicio + 0.2 and s[1] < total - 0.2]

    pesos = [max(1.0, len(re.findall(r'\w+', s['txt']))) for s in GUION]
    hablado = total - inicio - 0.5 * (len(GUION) - 1)
    esperado = [p / sum(pesos) * hablado for p in pesos]
    acum = [inicio]
    for i, e in enumerate(esperado[:-1]):
        acum.append(acum[-1] + e + 0.5)

    n, m = len(GUION) - 1, len(cand)
    # DP: elegir n cortes crecientes que minimicen el desvío al tiempo esperado
    INF = float('inf')
    puntos = [(a + b) / 2 for a, b in cand]
    dp = [[INF] * (n + 1) for _ in range(m + 1)]
    back = [[-1] * (n + 1) for _ in range(m + 1)]
    dp[0][0] = 0.0
    for j in range(1, n + 1):
        for i in range(1, m + 1):
            # no usar cand i
            mejor, arg = dp[i - 1][j], i - 1
            usar = dp[i - 1][j - 1]
            if usar < INF:
                c = usar + abs(puntos[i - 1] - acum[j])
                if c < mejor:
                    mejor, arg = c, -i
            dp[i][j] = mejor
            back[i][j] = arg
    cortes = []
    i, j = m, n
    while j > 0:
        a = back[i][j]
        if a < 0:
            cortes.append(-a - 1)
            i, j = -a - 1, j - 1
        else:
            i = a
    cortes.reverse()
    assert len(cortes) == n, (len(cortes), n)

    marks = []
    t = inicio
    for k, s in enumerate(GUION):
        if k < n:
            fin = cand[cortes[k]][0]
            sig = cand[cortes[k]][1]
        else:
            fin = sig = total
        marks.append(dict(t0=t, t1=max(t + 0.4, fin), txt=s['txt']))
        t = sig
    json.dump(marks, open(OUT, 'w'), ensure_ascii=False)
    largos = [round(m['t1'] - m['t0'], 2) for m in marks]
    print('frases', len(marks), 'dur', round(total, 1),
          'min/max frase', min(largos), max(largos))


if __name__ == '__main__':
    main()
