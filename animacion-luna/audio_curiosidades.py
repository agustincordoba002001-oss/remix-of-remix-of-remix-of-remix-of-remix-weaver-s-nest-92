import wave, numpy as np, json, os
from piper import PiperVoice, SynthesisConfig
SR = 22050
os.makedirs('/tmp/cur', exist_ok=True)
D = PiperVoice.load('/tmp/voices/es_AR-daniela-high.onnx')
X = PiperVoice.load('/tmp/voices/es_ES-davefx-medium.onnx')

segs = [
    ("D", "Cinco curiosidades que casi nadie sabe. Arrancamos.", 0.25),
    ("D", "Uno: la Torre Eiffel crece. Con el calor el hierro se expande y en verano la punta queda hasta quince centímetros más alta.", 0.28),
    ("D", "Dos: el pulpo tiene tres corazones y sangre azul. Dos bombean a las branquias y uno al resto del cuerpo.", 0.28),
    ("D", "Tres: la miel no se echa a perder. Encontraron tarros egipcios de tres mil años todavía comestibles.", 0.28),
    ("D", "Cuatro: Cleopatra vivió más cerca del alunizaje que de la construcción de la Gran Pirámide.", 0.28),
    ("D", "Y cinco: Napoleón no era bajo. Medía un metro sesenta y nueve, la altura normal de su época.", 0.30),
    ("X", "La historia siempre tiene un dato más.", 0.0),
]

cfgD = SynthesisConfig(length_scale=0.97, noise_scale=0.60, noise_w_scale=0.75)
cfgX = SynthesisConfig(length_scale=1.05, noise_scale=0.58, noise_w_scale=0.70)
parts = [np.zeros(int(0.25 * SR), np.float32)]
marks = []
tcur = 0.25
for who, txt, gap in segs:
    v, c = (D, cfgD) if who == "D" else (X, cfgX)
    a = np.concatenate([ch.audio_int16_array for ch in v.synthesize(txt, syn_config=c)]).astype(np.float32) / 32768.0
    if v.config.sample_rate != SR:
        n = int(len(a) * SR / v.config.sample_rate)
        a = np.interp(np.linspace(0, len(a) - 1, n), np.arange(len(a)), a).astype(np.float32)
    a = a / max(1e-6, np.abs(a).max()) * 0.85
    marks.append((who, tcur, tcur + len(a) / SR, txt))
    tcur += len(a) / SR + gap
    parts.append(a)
    parts.append(np.zeros(int(gap * SR), np.float32))

voz = np.concatenate(parts)
T = len(voz) / SR + 0.7
print("dur", round(T, 2))
json.dump([dict(who=w, t0=a, t1=b, txt=t) for w, a, b, t in marks], open('/tmp/cur/marks.json', 'w'))

n = int(T * SR)
mus = np.zeros(n, np.float32)
chords = [[261.63, 329.63, 392.0], [246.94, 311.13, 369.99], [220.0, 277.18, 329.63], [233.08, 293.66, 349.23]]
bar = 3.6
for i in range(int(T / bar) + 1):
    ch = chords[i % 4]
    s = int(i * bar * SR)
    if s >= n:
        break
    d = min(int(bar * SR), n - s)
    tt = np.arange(d) / SR
    env = np.minimum(1, tt / 0.5) * np.exp(-tt / 4.5)
    for f in ch:
        mus[s:s + d] += (np.sin(2 * np.pi * f * tt) + 0.22 * np.sin(2 * np.pi * f * 2 * tt)) * env * 0.075
    mus[s:s + d] += np.sin(2 * np.pi * (ch[0] / 2) * tt) * env * 0.11
mus *= 0.45

out = np.zeros(n, np.float32)
L = min(n, len(voz))
out[:L] += voz[:L]
out += mus
out = np.clip(out, -1, 1)
with wave.open('/tmp/cur/mix.wav', 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print("ok")
