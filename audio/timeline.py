# Picture timeline mirrored from src/videos/skyscraper/story.ts + cast.ts so every sound lands on the exact frame.
import math
import numpy as np

FPS = 30
TOTAL = 2055
DUR = TOTAL / FPS            # 68.500 s exactly
fr = lambda f: f / FPS

SNAP, DROP0, DROP1 = 15.80, 25.16, 31.08
FLASH = fr(131)
HITS = [61.80, 62.45, 63.10]
SWING_T, PUSH0 = 1.55, 49.0
PUSHES = [PUSH0 + k * SWING_T for k in range(3)]
TOURIST_T0 = 64.80

SHOTS = {
    1: (0, 131, "day", "hook"),
    2: (131, 256, "day", "street"),
    3: (256, 410, "day", "builders"),
    4: (410, 518, "day", "budget"),
    5: (518, 649, "day", "beam"),
    6: (649, 724, "day", "doormat"),
    7: (724, 820, "day", "tiles_van"),
    8: (820, 1000, "day", "jaguar"),
    9: (1000, 1151, "day", "egg"),
    10: (1151, 1255, "day", "payout"),
    11: (1255, 1352, "day", "deathray"),
    12: (1352, 1457, "golden", "flat_glass"),
    13: (1457, 1624, "golden", "mirror_park"),
    14: (1624, 1793, "golden", "magnify"),
    15: (1793, 1946, "day", "retrofit"),
    16: (1946, TOTAL, "day", "finale"),
}
XFADE = {9: 6, 12: 8, 13: 8, 14: 8, 15: 8, 16: 8}


def shot_t(i):
    a, b = SHOTS[i][:2]
    return fr(a), fr(b)


def shot_at(t):
    f = t * FPS
    for i, (a, b, *_r) in SHOTS.items():
        if a <= f < b:
            return i
    return 16


def tau_of(shot, t):
    return 30.6 + t * 0.55 if shot == 1 else t


def hh(i, s=0):
    v = math.sin(i * 127.1 + s * 311.7) * 43758.5453
    return v - math.floor(v)


def easeout(u):
    u = min(1.0, max(0.0, u))
    return 1 - (1 - u) ** 4


def dist_fx(d):
    d = max(d, 3.5)
    g = -14.0 * math.log10(d / 3.5)
    lpf = float(np.clip(17000 * (3.5 / d) ** 0.55, 1800, 17000))
    send = 0.06 + 0.45 * float(np.clip(math.log(d / 3.5) / math.log(25), 0, 1))
    return g, lpf, send


def tourist_steps():
    t0 = TOURIST_T0
    a, b = shot_t(16)
    steps = []
    for i in range(12):
        sp = 0.6 + hh(i) * 0.4
        ph0 = hh(i, 5)
        x = -14 + i * 2.5
        k = 0
        while True:
            t = t0 + (k * 0.5 - ph0) * 1.1 / sp
            k += 1
            if t < a - 0.1:
                continue
            if t > DUR:
                break
            z = -14.8 if i % 2 else -4.5
            steps.append((t, i, x, z, sp))
    return steps


def tourist_cam(t):
    f = t * FPS
    p = np.array([5.8, 7.65, -13.5])
    if f >= 1968:
        q = np.array([-2.8, 7.6, -12.2])
        p = p + (q - p) * easeout((f - 1968) / 22)
    if f >= 1992:
        q = np.array([14.0, 19.5, -28.0])
        p = p + (q - p) * easeout((f - 1992) / 63)
    return p


def swing_amp_deg(t):
    s = lambda x: (lambda u: u * u * (3 - 2 * u))(min(1.0, max(0.0, x)))
    return 10 + sum(12 * s((t - tp) / 0.3) for tp in PUSHES)


def words(path):
    import json
    return json.load(open(path, encoding="utf-8"))
