import json, os, re, subprocess
from difflib import SequenceMatcher
from pathlib import Path
import numpy as np
from scipy.io import wavfile
from kokoro_onnx import Kokoro

HOME = Path.home() / ".faceless-shorts"
KDIR = HOME / "kokoro"
OUT = Path("/home/clowd/skyscraper-short/voice")
OUT.mkdir(parents=True, exist_ok=True)

# 17 lines from /home/clowd/SCRIPT.md (~63-65 s at ~3.5-3.6 words/s)
LINES = [
    ("A brand new skyscraper in London melted a luxury car just by standing across the street.",
     "A brand new skyscraper in London melted a luxury car just by standing across the street.", 0.14),
    ("It's 2013, and a thirty-seven-story glass tower is the newest pride of the city.",
     "It's twenty thirteen, and a thirty-seven-story glass tower is the newest pride of the city.", 0.12),
    ("To fit bigger, pricier offices near the top, the builders curve the glass wall outward like a giant bowl.",
     "To fit bigger, pricier offices near the top, the builders curve the glass wall outward like a giant bowl.", 0.12),
    ("And to save a little money on the build, they quietly cut the window shades from the budget.",
     "And to save a little money on the build, they quietly cut the window shades from the budget.", 0.15),
    ("Then the August sun comes out.",
     "Then the August sun comes out.", 0.12),
    ("Down on the street, a blinding strip of light creeps across the shops.",
     "Down on the street, a blinding strip of light creeps across the shops.", 0.12),
    ("First, the doormat outside a barbershop starts smoking.",
     "First, the doormat outside a barbershop starts smoking.", 0.12),
    ("Next, sidewalk tiles crack, and paint blisters on a delivery van.",
     "Next, sidewalk tiles crack, and paint blisters on a delivery van.", 0.12),
    ("Then a guy parks his shiny black Jaguar for an hour, and comes back to find the mirror and panels drooping like melted wax.",
     "Then a guy parks his shiny black Jaguar for an hour, and comes back to find the mirror and panels drooping like melted wax.", 0.14),
    ("By the next afternoon, a reporter sets a frying pan on the pavement and cooks an egg right on the bricks.",
     "By the next afternoon, a reporter sets a frying pan on the pavement and cooks an egg right on the bricks.", 0.16),
    ("Luckily, the builders politely paid nine hundred pounds to fix the guy's car.",
     "Luckily, the builders politely paid nine hundred pounds to fix the guy's car.", 0.14),
    ("Unluckily, they still had a five-hundred-foot death ray aimed at the street.",
     "Unluckily, they still had a five-hundred-foot death ray aimed at the street.", 0.16),
    ("You see, a flat glass wall bounces sunlight away in neat, harmless rows.",
     "You see, a flat glass wall bounces sunlight away in neat, harmless rows.", 0.12),
    ("Ever tilted a curved shaving mirror in the sun? Every beam angles inward until they all meet in one scorching spot.",
     "Ever tilted a curved shaving mirror in the sun? Every beam angles inward until they all meet in one scorching spot.", 0.12),
    ("Thirty-seven floors of curved glass were acting like one giant magnifying mirror aimed at the parking spaces.",
     "Thirty-seven floors of curved glass were acting like one giant magnifying mirror aimed at the parking spaces.", 0.14),
    ("Nobody got hurt, but the owners had to bolt millions of dollars of metal shades across every single floor.",
     "Nobody got hurt, but the owners had to bolt millions of dollars of metal shades across every single floor.", 0.12),
    ("All because someone cut the sunshades from the budget to save a few bucks.",
     "All because someone cut the sunshades from the budget to save a few bucks.", 0.25),
]

SR_TTS = 24000

def trim(x, thr=0.008):
    idx = np.where(np.abs(x) > thr)[0]
    if not len(idx):
        return x
    a = max(0, idx[0] - int(0.006 * SR_TTS))
    b = min(len(x), idx[-1] + int(0.02 * SR_TTS))
    return x[a:b]

def silences(x, thr=0.015, min_len=0.04):
    hop = int(0.005 * SR_TTS)
    n = len(x) // hop
    rms = np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1))
    quiet = rms < thr * np.abs(x).max()
    out, st = [], None
    for f, q in enumerate(quiet):
        if q and st is None:
            st = f
        if (not q or f == n - 1) and st is not None:
            if (f - st) * 0.005 >= min_len:
                out.append((st * 0.005, f * 0.005))
            st = None
    return out

def main():
    k = Kokoro(str(KDIR / "kokoro-v1.0.onnx"), str(KDIR / "voices-v1.0.bin"))
    voice = "am_michael"
    speed = 1.34
    lead = 0.06  # starts at frame 2
    chunks = [np.zeros(int(lead * SR_TTS))]
    t = lead
    line_meta = []
    norm = lambda w: re.sub(r"[^a-z0-9]+", "", w.lower())

    for i, (orig, spoken, gap_s) in enumerate(LINES):
        audio, _ = k.create(spoken, voice=voice, speed=speed, lang="en-us")
        x = trim(np.asarray(audio, dtype=np.float64))
        dur = len(x) / SR_TTS
        line_meta.append({"i": i, "text": orig, "start": round(t, 3), "end": round(t + dur, 3)})
        print(f"L{i:02d} {t:6.2f}-{t+dur:6.2f} ({dur:4.2f}s): {orig}", flush=True)
        gap = np.zeros(int(gap_s * SR_TTS))
        chunks.extend([x, gap])
        t += dur + len(gap) / SR_TTS

    # Pad total duration to an exact integer number of frames at 30 fps (and multiple of 15 frames = 0.5 s)
    total_frames = int(np.ceil(t * 30.0 / 15.0) * 15)
    target_dur = total_frames / 30.0
    if target_dur > t:
        chunks.append(np.zeros(int(round((target_dur - t) * SR_TTS))))
    y = np.concatenate(chunks)
    y = y / (np.abs(y).max() + 1e-9) * 0.88
    raw_wav = OUT / "raw_24k.wav"
    wavfile.write(raw_wav, SR_TTS, (y * 32767).astype(np.int16))

    voice_wav = OUT / "voice.wav"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(raw_wav), "-ar", "48000", "-ac", "1", str(voice_wav)], check=True)
    print(f"Wrote {voice_wav}, target_dur={target_dur:.3f}s ({total_frames} frames @ 30fps)", flush=True)

    # Try faster-whisper if model is already cached locally, otherwise use energy-assisted syllable/pause timing inside each exact line window
    heard = []
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel("small.en", device="cpu", compute_type="int8", local_files_only=True)
        raw16 = subprocess.run(["ffmpeg", "-v", "error", "-i", str(voice_wav), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                               capture_output=True, check=True).stdout
        audio16 = np.frombuffer(raw16, dtype=np.float32)
        segs, _ = model.transcribe(audio16, word_timestamps=True, vad_filter=False)
        heard = [(w.word.strip(), w.start + 0.02, w.end) for s in segs for w in (s.words or [])]
        print(f"Whisper transcribed {len(heard)} words", flush=True)
    except Exception as e:
        print(f"Using exact TTS line windows + internal pause alignment ({type(e).__name__})", flush=True)

    all_words = []
    for lm in line_meta:
        i = lm["i"]
        lo, hi = lm["start"], lm["end"]
        toks = [w for w in lm["text"].split() if norm(w)]
        line_heard = [h for h in heard if h[1] >= lo - 0.15 and h[2] <= hi + 0.15]
        if line_heard:
            a_norm = ["twenty" if norm(w) == "2013" else norm(w) for w in toks]
            b_norm = [norm(h[0]) for h in line_heard]
            times = [None] * len(toks)
            for blk in SequenceMatcher(None, a_norm, b_norm, autojunk=False).get_matching_blocks():
                for k_idx in range(blk.size):
                    times[blk.a + k_idx] = (line_heard[blk.b + k_idx][1], line_heard[blk.b + k_idx][2])
            for idx_w, w_str in enumerate(toks):
                if norm(w_str) == "2013" and times[idx_w] is not None:
                    for h_w, h_s, h_e in line_heard:
                        if norm(h_w) == "thirteen" and abs(h_s - times[idx_w][1]) < 0.35:
                            times[idx_w] = (times[idx_w][0], h_e)
            p = 0
            while p < len(toks):
                if times[p] is not None:
                    p += 1
                    continue
                q = p
                while q < len(toks) and times[q] is None:
                    q += 1
                t0 = times[p - 1][1] if p > 0 else lo
                t1 = times[q][0] if q < len(toks) else hi
                if t1 <= t0:
                    t1 = t0 + 0.05 * (q - p)
                lens = [max(1, len(norm(toks[r]))) for r in range(p, q)]
                tot_l = sum(lens)
                cur = t0
                for r, l in zip(range(p, q), lens):
                    d = (t1 - t0) * l / tot_l
                    times[r] = (cur, cur + d * 0.92)
                    cur += d
                p = q
            prev_e = lo
            for w_str, (ws, we) in zip(toks, times):
                ws = round(max(lo, min(hi - 0.02, max(prev_e - 0.005, ws))), 3)
                we = round(max(ws + 0.03, min(hi, we)), 3)
                prev_e = we
                all_words.append({"word": w_str, "w": w_str, "line": i, "s": ws, "e": we})
        else:
            # Spread inside exact TTS line window [lo, hi] with comma/question pause weights
            wts = []
            for k_idx, w_str in enumerate(toks):
                nw = "twentythirteen" if norm(w_str) == "2013" else norm(w_str)
                pause = 2.8 if w_str.endswith(",") else (4.2 if re.search(r"[.?!]$", w_str) and k_idx < len(toks) - 1 else 0.0)
                wts.append((len(nw) + 2.2, pause))
            tot = sum(sp + pa for sp, pa in wts)
            c = lo
            for w_str, (sp, pa) in zip(toks, wts):
                d_sp = (hi - lo) * sp / tot
                d_pa = (hi - lo) * pa / tot
                all_words.append({"word": w_str, "w": w_str, "line": i, "s": round(c, 3), "e": round(c + d_sp * 0.94, 3)})
                c += d_sp + d_pa

    (OUT / "lines.json").write_text(json.dumps({"duration": round(target_dur, 3), "frames": total_frames, "lines": line_meta}, indent=1))
    (OUT / "words.json").write_text(json.dumps(all_words, indent=1))
    (OUT / "words.txt").write_text("\n".join(f"{w['s']:7.3f} {w['e']:7.3f}  L{w['line']:02d}  {w['word']}" for w in all_words))
    print(f"Wrote {len(all_words)} words to {OUT / 'words.json'}", flush=True)

if __name__ == "__main__":
    main()
