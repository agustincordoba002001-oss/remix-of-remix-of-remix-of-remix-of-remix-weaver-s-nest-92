"""EL TITANIC — guion completo (partes 1, 2 y 3).

Reglas fijas del proyecto (no cambiar entre videos):
- La intro dice siempre "LA HISTORIA COMPLETA" del tema, sin fechas ni añadidos.
- Los títulos son fijos: nunca se acortan ni se reemplazan al renderizar.
- Los nombres en inglés van escritos como suenan, para que la voz los diga bien.
- Cada escena tiene su propio dibujo: /mnt/documents/ref_tt/<key>.png
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from titanic_parte1 import ESCENAS as P1  # noqa: E402
from titanic_parte2 import ESCENAS as P2  # noqa: E402
from titanic_parte3 import ESCENAS as P3  # noqa: E402

GUION = P1 + P2 + P3

# Los títulos no se acortan nunca: se controla acá que entren tal cual.
MAX_T1 = 16
MAX_T2 = 20
for _s in GUION:
    for _l in _s['t1']:
        assert len(_l) <= MAX_T1, f"título largo en {_s['key']}: {_l}"
    for _l in _s['t2']:
        assert len(_l) <= MAX_T2, f"subtítulo largo en {_s['key']}: {_l}"

_claves = [s['key'] for s in GUION]
assert len(set(_claves)) == len(_claves), 'hay claves de dibujo repetidas'

if __name__ == '__main__':
    palabras = sum(len(s['txt'].split()) for s in GUION)
    print('escenas', len(GUION), 'palabras', palabras,
          'minutos aprox', round(palabras / 130 + len(GUION) * 0.5 / 60, 1))
