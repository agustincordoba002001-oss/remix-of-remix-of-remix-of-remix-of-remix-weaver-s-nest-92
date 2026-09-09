"""Voces oficiales del proyecto: Elena argentina (narradora) y Dark (citas).

Se sintetizan con el generador Piper en español de HirCoir. Los ajustes
de expresividad (ritmo, variación y pausas) están calibrados para que la
narración suene natural y no monótona.
"""
import base64
import json
import urllib.request

ENDPOINT = "https://hircoir-piper-tts-spanish.hf.space/convert"

# Voces fijas del proyecto.
VOCES = {
    # Narradora principal: Elena argentina (es_ARG-Elena), calibrada para expresarse como
    # Lilith (más humana, con variación melódica y ritmo natural).
    "elena": {
        "modelPath": "models/es_ARG-Elena.onnx",
        # noise_scale bajo = dicción limpia; el ritmo algo lento evita que se coma sílabas.
        "settings": {"speaker": 0, "noise_scale": 0.60, "length_scale": 1.14, "noise_w": 0.72},
    },
    # Narrador principal: Dark. noise_scale bajo = dicción limpia, sin
    # comerse sílabas; el ritmo se ajusta frase a frase desde el guion.
    "dark": {
        "modelPath": "models/es_MX-dark.onnx",
        "settings": {"speaker": 0, "noise_scale": 0.58, "length_scale": 1.06, "noise_w": 0.70},
    },
}


def sintetizar(texto: str, voz: str, destino: str, reintentos: int = 3,
               ajustes: dict | None = None) -> str:
    """Genera un WAV con la voz indicada y lo guarda en `destino`.

    `ajustes` permite variar levemente el ritmo o la expresividad de una frase
    concreta, para que la narración no suene siempre igual.
    """
    cfg = VOCES[voz]
    settings = dict(cfg["settings"])
    if ajustes:
        settings.update(ajustes)
    cuerpo = json.dumps({
        "text": texto,
        "modelPath": cfg["modelPath"],
        "settings": settings,
    }).encode()
    ultimo = None
    for _ in range(reintentos):
        try:
            req = urllib.request.Request(ENDPOINT, cuerpo, {"Content-Type": "application/json"})
            data = json.load(urllib.request.urlopen(req, timeout=580))
            if data.get("success"):
                audio = data["audio"].split(",")[-1]
                with open(destino, "wb") as f:
                    f.write(base64.b64decode(audio))
                return destino
            ultimo = data.get("error")
        except Exception as err:  # noqa: BLE001
            ultimo = err
    raise RuntimeError(f"No se pudo sintetizar con {voz}: {ultimo}")
