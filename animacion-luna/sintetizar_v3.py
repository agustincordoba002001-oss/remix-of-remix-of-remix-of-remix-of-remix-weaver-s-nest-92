"""Narración y música de la segunda parte (guion_v3), calidad estudio.

Uso:
  python3 sintetizar_v3.py <desde> <hasta>   -> sintetiza y cachea
  python3 sintetizar_v3.py assemble          -> mezcla voz + música
"""
import json, sys, wave
from pathlib import Path
import numpy as np
from piper import PiperVoice, SynthesisConfig
from guion_v3 import ESCENAS

SR = 22050
CACHE = Path('/tmp/luna/v3_cache')
CACHE.mkdir(parents=True, exist_ok=True)


def synthesize(start: int, end: int):
    daniela = PiperVoice.load('/tmp/voices/es_AR-daniela-high.onnx')
    dave = PiperVoice.load('/tmp/voices/es_ES-davefx-medium.onnx')
    # más lento y más limpio: mejor dicción, menos ruido de síntesis
    cfg_d = SynthesisConfig(length_scale=1.12, noise_scale=0.48, noise_w_scale=0.60)
    cfg_x = SynthesisConfig(length_scale=1.18, noise_scale=0.45, noise_w_scale=0.55)
    for n, sec, voz, txt, rot, col, img in ESCENAS:
        if n < start or n > end:
            continue
        target = CACHE / f'{n:03d}.npy'
        if target.exists():
            continue
        voice, cfg = (dave, cfg_x) if voz == 'X' else (daniela, cfg_d)
        audio = np.concatenate([c.audio_int16_array for c in voice.synthesize(txt, syn_config=cfg)]).astype(np.float32) / 32768.0
        if voice.config.sample_rate != SR:
            count = int(len(audio) * SR / voice.config.sample_rate)
            audio = np.interp(np.linspace(0, len(audio) - 1, count), np.arange(len(audio)), audio).astype(np.float32)
        audio = audio / max(1e-6, np.abs(audio).max()) * 0.85
        np.save(target, audio)
        print(n, round(len(audio) / SR, 2), flush=True)


PALETTES = [
    [[146.83, 174.61, 220.00], [130.81, 164.81, 196.00], [174.61, 220.00, 261.63], [155.56, 185.00, 233.08]],
    [[174.61, 220.00, 261.63], [196.00, 246.94, 293.66], [164.81, 207.65, 246.94], [146.83, 196.00, 233.08]],
    [[196.00, 246.94, 311.13], [220.00, 261.63, 329.63], [174.61, 233.08, 293.66], [164.81, 207.65, 261.63]],
    [[164.81, 196.00, 246.94], [185.00, 233.08, 277.18], [155.56, 196.00, 233.08], [146.83, 185.00, 220.00]],
    [[146.83, 174.61, 233.08], [138.59, 164.81, 220.00], [155.56, 185.00, 246.94], [130.81, 155.56, 207.65]],
    [[196.00, 246.94, 293.66], [220.00, 277.18, 329.63], [185.00, 233.08, 277.18], [174.61, 220.00, 261.63]],
    [[174.61, 207.65, 261.63], [155.56, 196.00, 246.94], [164.81, 196.00, 233.08], [146.83, 174.61, 220.00]],
]
_ORDER = []
for _e in ESCENAS:
    if _e[1] not in _ORDER:
        _ORDER.append(_e[1])
PROG = {name: PALETTES[i % len(PALETTES)] for i, name in enumerate(_ORDER)}
DEFAULT = PALETTES[0]


def bed(chord, dur, seed):
    """Un compás: pad de cuerdas + bajo + arpegio de campana."""
    rng = np.random.default_rng(seed)
    t = np.arange(int(dur * SR)) / SR
    env = np.minimum(1, t / 1.6) * np.minimum(1, (dur - t) / 1.6)
    out = np.zeros_like(t)
    for k, f in enumerate(chord):
        det = 1 + rng.normal(0, 0.0015)
        out += np.sin(2 * np.pi * f * det * t) * 0.055 * env
        out += np.sin(4 * np.pi * f * det * t) * 0.014 * env
    out += np.sin(2 * np.pi * (chord[0] / 2) * t) * 0.075 * env
    step = dur / 4
    for i in range(4):
        f = chord[(i + 1) % len(chord)] * 2
        s = int(i * step * SR)
        seg = np.arange(int(step * SR)) / SR
        e = np.exp(-seg / (step * 0.35))
        out[s:s + len(seg)] += np.sin(2 * np.pi * f * seg) * 0.035 * e
    return out.astype(np.float32)


def assemble():
    missing = [e[0] for e in ESCENAS if not (CACHE / f'{e[0]:03d}.npy').exists()]
    if missing:
        raise SystemExit(f'Faltan escenas: {missing}')
    parts = [np.zeros(int(0.5 * SR), np.float32)]
    marks = []
    tcur = 0.5
    prev_sec = None
    for n, sec, voz, txt, rot, col, img in ESCENAS:
        audio = np.load(CACHE / f'{n:03d}.npy')
        if prev_sec is not None and sec != prev_sec:
            parts.append(np.zeros(int(0.85 * SR), np.float32))
            tcur += 0.85
        prev_sec = sec
        marks.append(dict(n=n, section=sec, who=voz, t0=tcur, t1=tcur + len(audio) / SR,
                          rot=rot, color=col, img=img, txt=txt))
        gap = 0.60 if txt.rstrip().endswith(('?', '!', '…')) else 0.45
        parts.extend([audio, np.zeros(int(gap * SR), np.float32)])
        tcur += len(audio) / SR + gap
    voice_track = np.concatenate(parts)
    duration = len(voice_track) / SR + 1.4
    total = int(duration * SR)
    music = np.zeros(total, np.float32)
    bar, i = 7.5, 0
    while i * bar < duration:
        s = int(i * bar * SR)
        tmid = i * bar
        sec = next((m['section'] for m in marks if m['t0'] <= tmid <= m['t1']), None)
        prog = PROG.get(sec, DEFAULT)
        seg = bed(prog[i % 4], bar, i)
        length = min(len(seg), total - s)
        music[s:s + length] += seg[:length]
        i += 1
    music *= 0.42
    music[:len(voice_track)] += voice_track
    music = np.clip(music, -1, 1)
    with wave.open('/tmp/luna/mix_v3.wav', 'wb') as wav:
        wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(SR)
        wav.writeframes((music * 32767).astype(np.int16).tobytes())
    json.dump(marks, open('/tmp/luna/marks_v3.json', 'w'), ensure_ascii=False, indent=2)
    print(f'{len(ESCENAS)} escenas, {duration:.2f} segundos')


if __name__ == '__main__':
    if sys.argv[1] == 'assemble':
        assemble()
    else:
        synthesize(int(sys.argv[1]), int(sys.argv[2]))
