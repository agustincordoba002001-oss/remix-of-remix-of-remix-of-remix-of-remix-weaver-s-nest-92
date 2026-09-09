import wave, numpy as np
from piper import PiperVoice

SR = 22050
v = PiperVoice.load('/tmp/voices/daniela.onnx')
frases = [
    ("¿Sabías por qué el lunes se llama lunes?", 0.35),
    ("Los romanos le pusieron a cada día el nombre de un astro.", 0.30),
    ("Lunes viene de dies lunae: el día de la Luna.", 0.0),
]
partes = []
for txt, gap in frases:
    chunks = [c.audio_int16_array for c in v.synthesize(txt)]
    a = np.concatenate(chunks).astype(np.float32) / 32768.0
    partes.append(a)
    if gap:
        partes.append(np.zeros(int(gap * SR), np.float32))
voz = np.concatenate([np.zeros(int(0.25 * SR), np.float32)] + partes)
print("voz seg", len(voz) / SR)

# cama musical alegre y suave
T = 10.0
n = int(T * SR)
t = np.arange(n) / SR
mus = np.zeros(n, np.float32)
notas = [523.25, 659.25, 784.0, 659.25, 587.33, 783.99, 880.0, 659.25]
for i in range(16):
    f = notas[i % len(notas)] * (1 if i % 4 else 0.5)
    s = int(i * 0.6 * SR)
    d = int(0.55 * SR)
    if s + d > n:
        break
    env = np.exp(-np.linspace(0, 6, d))
    tt = np.arange(d) / SR
    mus[s:s + d] += (np.sin(2 * np.pi * f * tt) * 0.5 + np.sin(2 * np.pi * f * 2 * tt) * 0.18) * env
bajo = np.sin(2 * np.pi * 130.81 * t) * 0.08 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.8 * t))
mus = mus * 0.16 + bajo * 0.5

out = np.zeros(n, np.float32)
L = min(n, len(voz))
out[:L] += voz[:L] * 1.0
out += mus
out = np.clip(out, -1, 1)

with wave.open('/tmp/wb/mix.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print("ok")
