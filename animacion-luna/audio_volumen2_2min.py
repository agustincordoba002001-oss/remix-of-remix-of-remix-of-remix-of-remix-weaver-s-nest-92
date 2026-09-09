"""Narración de 2 minutos — Volumen 2 con música más suave."""
import wave, json
import numpy as np
from piper import PiperVoice, SynthesisConfig

SR = 22050
D = PiperVoice.load('/tmp/voices/es_AR-daniela-high.onnx')
X = PiperVoice.load('/tmp/voices/es_ES-davefx-medium.onnx')

segs = [
 ("D", "Salí una noche al patio y mirá para arriba. Ahí está: la Luna.", 0.30),
 ("D", "La misma que vieron los egipcios, los romanos y tu bisabuelo. Blanca, quieta, inalcanzable.", 0.35),
 ("D", "Y en apenas ocho años, un grupo de ingenieros con reglas de cálculo y café frío la pisó.", 0.40),
 ("D", "Todo arranca el veinticinco de mayo de mil novecientos sesenta y uno. Kennedy se para frente al Congreso y promete algo enorme:", 0.35),
 ("X", "Esta nación debe poner un hombre en la Luna antes del fin de la década, y devolverlo sano y salvo.", 0.35),
 ("D", "La sala aplaude. En la NASA, varios ingenieros se ponen pálidos.", 0.35),
 ("D", "Porque Estados Unidos tenía quince minutos de experiencia en vuelo tripulado. Quince minutos, un salto corto de Alan Shepard.", 0.35),
 ("D", "Los soviéticos ya le habían dado la vuelta completa al planeta con Yuri Gagarin. Iban ganando, y por mucho.", 0.35),
 ("D", "La carrera espacial no la movía la curiosidad. La movía el miedo: el que llegara primero mandaba en el cielo.", 0.45),
 ("D", "Pero casi nadie cuenta cómo empezó de verdad ese camino. Empezó con tres muertos.", 0.40),
 ("D", "Ellos eran Virgil Gus Grissom, veterano, el segundo estadounidense en el espacio.", 0.30),
 ("D", "Ed White, el primer norteamericano en caminar fuera de la nave.", 0.30),
 ("D", "Y Roger Chaffee, joven, ingeniero, a punto de volar por primera vez.", 0.35),
 ("D", "Veintisiete de enero de mil novecientos sesenta y siete. Ni siquiera era un lanzamiento: era un ensayo en tierra, con la cápsula del Apolo uno cerrada y llena de oxígeno puro a presión.", 0.35),
 ("D", "Un cable pelado hizo una chispa. En oxígeno puro, todo lo que toca el fuego se convierte en combustible.", 0.35),
 ("D", "La escotilla se abría hacia adentro y tardaba minutos en ceder. Los tres murieron en menos de treinta segundos.", 0.40),
 ("X", "Este es un negocio riesgoso.", 0.30),
 ("D", "Lo había advertido Grissom meses antes. Después de ese incendio, la NASA rediseñó la nave entera. Y esa tragedia, aunque duela decirlo, fue lo que hizo posible llegar a la Luna.", 0.0),
]

cfgD = SynthesisConfig(length_scale=1.0, noise_scale=0.60, noise_w_scale=0.75)
cfgX = SynthesisConfig(length_scale=1.08, noise_scale=0.58, noise_w_scale=0.70)
parts = [np.zeros(int(0.35 * SR), np.float32)]
marks = []
tcur = 0.35
for who, txt, gap in segs:
    v, c = (D, cfgD) if who == "D" else (X, cfgX)
    a = np.concatenate([ch.audio_int16_array for ch in v.synthesize(txt, syn_config=c)]).astype(np.float32) / 32768.0
    if v.config.sample_rate != SR:
        n = int(len(a) * SR / v.config.sample_rate)
        a = np.interp(np.linspace(0, len(a) - 1, n), np.arange(len(a)), a).astype(np.float32)
    a = a / max(1e-6, np.abs(a).max()) * 0.85
    marks.append(dict(who=who, t0=tcur, t1=tcur + len(a) / SR, txt=txt))
    tcur += len(a) / SR + gap
    parts.append(a)
    parts.append(np.zeros(int(gap * SR), np.float32))

voz = np.concatenate(parts)
T = len(voz) / SR + 1.0
n = int(T * SR)

# Música temática espacial: drone grave, pad suspendido y destellos lentos.
mus = np.zeros(n, np.float32)
tt_all = np.arange(n) / SR
# drone profundo con leve batido
mus += (np.sin(2*np.pi*55.0*tt_all) * 0.10 + np.sin(2*np.pi*55.4*tt_all) * 0.08)
mus += np.sin(2*np.pi*110.0*tt_all) * 0.05 * (0.6 + 0.4*np.sin(2*np.pi*0.05*tt_all))
# pad suspendido que respira, progresión lenta en menor
chords = [[220.00, 293.66, 329.63], [196.00, 261.63, 329.63],
          [174.61, 261.63, 349.23], [164.81, 246.94, 329.63]]
bar = 12.0
for i in range(int(T / bar) + 1):
    ch = chords[i % 4]
    s0 = int(i * bar * SR)
    if s0 >= n:
        break
    d = min(int(bar * SR), n - s0)
    tt = np.arange(d) / SR
    env = np.minimum(1, tt / 4.0) * np.minimum(1, (bar - tt) / 4.0)
    for f in ch:
        mus[s0:s0+d] += np.sin(2*np.pi*f*tt + 0.6*np.sin(2*np.pi*0.12*tt)) * env * 0.045
# destellos tipo campana (estrellas)
rng = np.random.default_rng(7)
for k in range(int(T / 3.5)):
    s0 = int((k * 3.5 + rng.uniform(0, 2.0)) * SR)
    if s0 >= n:
        break
    d = min(int(2.2 * SR), n - s0)
    tt = np.arange(d) / SR
    f = float(rng.choice([880.0, 1046.5, 1318.5, 1567.98]))
    mus[s0:s0+d] += np.sin(2*np.pi*f*tt) * np.exp(-tt / 0.6) * 0.018
k = 20
mus = np.convolve(mus, np.ones(k, np.float32) / k, mode='same')
mus *= 0.34
fade = int(3.5 * SR)
mus[:fade] *= np.linspace(0, 1, fade)
mus[-fade:] *= np.linspace(1, 0, fade)

out = mus.copy()
out[:len(voz)] += voz
out = np.clip(out, -1, 1)
with wave.open('/tmp/luna/v2_2min.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
json.dump(marks, open('/tmp/luna/marks_v2_2min.json', 'w'), ensure_ascii=False, indent=1)
print('dur', round(T, 2))
