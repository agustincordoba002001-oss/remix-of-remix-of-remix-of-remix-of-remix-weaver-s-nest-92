"""Sintetiza por bloques y ensambla la continuación del documental."""
import json, os, re, sys, wave
from pathlib import Path
import numpy as np
from piper import PiperVoice, SynthesisConfig

SR = 22050
ROOT = Path('/dev-server')
CACHE = Path('/tmp/luna/continuacion_cache')
CACHE.mkdir(parents=True, exist_ok=True)
source = (ROOT / 'src/lib/guion-alunizaje.ts').read_text(encoding='utf-8')
pat = re.compile(r"\{ n: (\d+), seccion: '([^']+)', texto: '(.+?)', imagen:")
scenes = [(int(n), section, text.replace("\\'", "'")) for n, section, text in pat.findall(source) if int(n) >= 10]
quote_scenes = {39, 60, 61, 67, 72}


def synthesize(start: int, end: int):
    daniela = PiperVoice.load('/tmp/voices/es_AR-daniela-high.onnx')
    dave = PiperVoice.load('/tmp/voices/es_ES-davefx-medium.onnx')
    cfg_d = SynthesisConfig(length_scale=1.0, noise_scale=0.60, noise_w_scale=0.75)
    cfg_x = SynthesisConfig(length_scale=1.08, noise_scale=0.58, noise_w_scale=0.70)
    for number, section, text in scenes:
        if number < start or number > end:
            continue
        target = CACHE / f'{number:03d}.npy'
        if target.exists():
            continue
        voice, cfg = (dave, cfg_x) if number in quote_scenes else (daniela, cfg_d)
        audio = np.concatenate([c.audio_int16_array for c in voice.synthesize(text, syn_config=cfg)]).astype(np.float32) / 32768.0
        if voice.config.sample_rate != SR:
            count = int(len(audio) * SR / voice.config.sample_rate)
            audio = np.interp(np.linspace(0, len(audio) - 1, count), np.arange(len(audio)), audio).astype(np.float32)
        audio = audio / max(1e-6, np.abs(audio).max()) * 0.85
        np.save(target, audio)
        print(number, len(audio) / SR, flush=True)


def assemble():
    missing = [n for n, _, _ in scenes if not (CACHE / f'{n:03d}.npy').exists()]
    if missing:
        raise SystemExit(f'Faltan escenas: {missing}')
    parts = [np.zeros(int(0.4 * SR), np.float32)]
    marks = []
    tcur = 0.4
    pauses = {12, 18, 27, 36, 63, 84, 93, 105}
    for number, section, text in scenes:
        audio = np.load(CACHE / f'{number:03d}.npy')
        marks.append(dict(n=number, section=section, who='X' if number in quote_scenes else 'D', t0=tcur, t1=tcur + len(audio) / SR, txt=text))
        gap = 0.70 if number in pauses else 0.38
        parts.extend([audio, np.zeros(int(gap * SR), np.float32)])
        tcur += len(audio) / SR + gap
    voice_track = np.concatenate(parts)
    duration = len(voice_track) / SR + 1.2
    total = int(duration * SR)
    music = np.zeros(total, np.float32)
    chords = [[174.61, 220., 261.63], [196., 246.94, 293.66], [164.81, 207.65, 246.94], [146.83, 196., 233.08]]
    bar = 7.0
    for i in range(int(duration / bar) + 1):
        s = int(i * bar * SR)
        if s >= total: break
        length = min(int(bar * SR), total - s)
        tt = np.arange(length) / SR
        env = np.minimum(1, tt / 1.4) * np.exp(-tt / 10.)
        for freq in chords[i % 4]:
            music[s:s+length] += (np.sin(2*np.pi*freq*tt) + .22*np.sin(4*np.pi*freq*tt)) * env * .075
        music[s:s+length] += np.sin(2*np.pi*(chords[i % 4][0]/2)*tt) * env * .09
    music *= .48
    music[:len(voice_track)] += voice_track
    music = np.clip(music, -1, 1)
    with wave.open('/tmp/luna/mix_continuacion.wav', 'wb') as wav:
        wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(SR)
        wav.writeframes((music * 32767).astype(np.int16).tobytes())
    json.dump(marks, open('/tmp/luna/marks_continuacion.json', 'w'), ensure_ascii=False, indent=2)
    print(f'{len(scenes)} escenas, {duration:.2f} segundos')

if __name__ == '__main__':
    if len(sys.argv) == 2 and sys.argv[1] == 'assemble':
        assemble()
    else:
        synthesize(int(sys.argv[1]), int(sys.argv[2]))
