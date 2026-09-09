"""Narración completa desde Apolo 8 hasta el cierre del documental."""
import re, wave, json
from pathlib import Path
import numpy as np
from piper import PiperVoice, SynthesisConfig

SR = 22050
ROOT = Path('/dev-server')
OUT_DIR = Path('/tmp/luna')
OUT_DIR.mkdir(parents=True, exist_ok=True)
D = PiperVoice.load('/tmp/voices/es_AR-daniela-high.onnx')
X = PiperVoice.load('/tmp/voices/es_ES-davefx-medium.onnx')

source = (ROOT / 'src/lib/guion-alunizaje.ts').read_text(encoding='utf-8')
pat = re.compile(r"\{ n: (\d+), seccion: '([^']+)', texto: '(.+?)', imagen:")
scenes = []
for n, section, text in pat.findall(source):
    number = int(n)
    if number >= 10:
        scenes.append((number, section, text.replace("\\'", "'")))

# Las citas principales cambian de voz, igual que en el primer volumen.
quote_scenes = {39, 60, 61, 67, 72}
cfg_d = SynthesisConfig(length_scale=1.0, noise_scale=0.60, noise_w_scale=0.75)
cfg_x = SynthesisConfig(length_scale=1.08, noise_scale=0.58, noise_w_scale=0.70)
parts = [np.zeros(int(0.40 * SR), np.float32)]
marks = []
tcur = 0.40

for number, section, text in scenes:
    voice, cfg, who = (X, cfg_x, 'X') if number in quote_scenes else (D, cfg_d, 'D')
    chunks = [chunk.audio_int16_array for chunk in voice.synthesize(text, syn_config=cfg)]
    audio = np.concatenate(chunks).astype(np.float32) / 32768.0
    if voice.config.sample_rate != SR:
        count = int(len(audio) * SR / voice.config.sample_rate)
        audio = np.interp(np.linspace(0, len(audio) - 1, count), np.arange(len(audio)), audio).astype(np.float32)
    audio = audio / max(1e-6, np.abs(audio).max()) * 0.85
    marks.append(dict(n=number, section=section, who=who, t0=tcur, t1=tcur + len(audio) / SR, txt=text))
    gap = 0.38 if number not in {12, 18, 27, 36, 63, 84, 93, 105} else 0.70
    parts.extend([audio, np.zeros(int(gap * SR), np.float32)])
    tcur += len(audio) / SR + gap

voice_track = np.concatenate(parts)
duration = len(voice_track) / SR + 1.2
n_samples = int(duration * SR)
t = np.arange(n_samples) / SR
music = np.zeros(n_samples, np.float32)
chords = [
    [174.61, 220.00, 261.63],
    [196.00, 246.94, 293.66],
    [164.81, 207.65, 246.94],
    [146.83, 196.00, 233.08],
]
bar = 7.0
for i in range(int(duration / bar) + 1):
    start = int(i * bar * SR)
    if start >= n_samples:
        break
    length = min(int(bar * SR), n_samples - start)
    tt = np.arange(length) / SR
    env = np.minimum(1, tt / 1.4) * np.exp(-tt / 10.0)
    for freq in chords[i % len(chords)]:
        music[start:start + length] += (np.sin(2 * np.pi * freq * tt) + 0.22 * np.sin(4 * np.pi * freq * tt)) * env * 0.075
    music[start:start + length] += np.sin(2 * np.pi * (chords[i % len(chords)][0] / 2) * tt) * env * 0.09
music *= 0.48
mixed = music
mixed[:len(voice_track)] += voice_track
mixed = np.clip(mixed, -1, 1)

with wave.open(str(OUT_DIR / 'mix_continuacion.wav'), 'wb') as wav:
    wav.setnchannels(1)
    wav.setsampwidth(2)
    wav.setframerate(SR)
    wav.writeframes((mixed * 32767).astype(np.int16).tobytes())
json.dump(marks, open(OUT_DIR / 'marks_continuacion.json', 'w'), ensure_ascii=False, indent=2)
print(f'{len(scenes)} escenas, {duration:.2f} segundos')
