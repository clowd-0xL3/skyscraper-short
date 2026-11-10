# Every sound effect + ambience bed of "The Skyscraper That Melted a Car" timed to timeline.py, rendered into one stereo SFX stem.
# Standard mix rule: each EVENT is placed SFX_DB = -6 dB under its naive level relative to the voice stem; ambience BEDS are not reduced.
import math
import numpy as np
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, peq, shelf, pan, st, place, fades, widen, make_ir, convolve_st,
                 momentary_max, integrated, colored, smooth_noise, modal)
import sfx_gen as G
import timeline as T

N = ns(T.DUR)
SFX_DB = -6.0


class Cue:
    def __init__(self, t, name, desc, gen, naive, kind="event", p=0.0, extra=0.0, lpf=None, send=0.12, group=None, cut=None):
        self.t, self.name, self.desc, self.gen, self.naive = t, name, desc, gen, naive
        self.kind, self.p, self.extra, self.lpf, self.send, self.cut = kind, p, extra, lpf, send, cut
        self.group = group or name
        self.applied = naive + (SFX_DB if kind == "event" else 0.0) + extra
        self.measured = None


def _sizzle(dur, r, inten=1.0):
    n = ns(dur)
    t = tt(dur)
    hiss = bp(colored(n, r, 0.35), 1400, 7500, 1) * (0.45 + 0.35 * smooth_noise(n, r, 6.0))
    pops = G.bubbles(dur, r, int(65 * inten), 900, 3800, (0.004, 0.015), np.ones(n)) * 0.55
    env = np.interp(t, [0, min(0.15, dur * 0.2), max(0.2, dur - 0.25), dur], [0, 1, 0.9, 0])
    return st((hiss + pops) * env * inten)


def _ray_hum(dur, r):
    t = tt(dur)
    hum = 0.4 * np.sin(2 * np.pi * 110 * t) + 0.25 * np.sin(2 * np.pi * 220 * t * (1 + 0.004 * np.sin(2 * np.pi * 3.5 * t)))
    shimmer = bp(colored(ns(dur), r, 0.5), 900, 2600, 1) * 0.25
    env = np.interp(t, [0, 0.3, dur - 0.35, dur], [0, 1, 0.85, 0])
    return widen((hum + shimmer) * env, r, 10, 0.8)


def cues():
    C = []
    R = rng(2013)
    rr = lambda: rng(int(R.integers(1 << 30)))
    add = C.append

    # ------------------------------------------------ ambience beds (not reduced by -6 dB event rule)
    def amb_day(dur, air=0.45, flags=0.2, seed=1):
        def g():
            r = rng(seed)
            n = ns(dur)
            x = G.breeze(dur, r, 0.9, 0.14, 800)
            city = bp(colored(n, r, 0.85), 140, 1400, 1) * air * (0.8 + 0.2 * smooth_noise(n, r, 0.3))
            x += st(city)
            x += pan(G.bird_chirps(dur, r, 0.4, "sparrow") * 0.07, 0.5)
            x += pan(G.bird_chirps(dur, r, 0.28, "sparrow") * 0.05, -0.6)
            if flags > 0:
                x += pan(G.flag_flutter(dur, r) * flags, 0.3)
            return fades(x, 0.35, 0.5), 0.0
        return g

    add(Cue(0.0, "amb_street_day", "London street daytime air: gentle city breeze, sparrows, distant bustle (shots 1-11)",
            _cut(amb_day(45.1, 0.45, 0.2, seed=11), 45.1, 0.35, 0.45), -29, "bed", send=0.0))
    add(Cue(45.0, "amb_golden", "golden-hour optics demonstration: warm breeze, blackbird phrases, calm air (shots 12-14)",
            _env(lambda: (_golden(14.8, rng(43)), 0.0), 14.8, 0.45, 0.4), -29, "bed", send=0.0))
    add(Cue(59.7, "amb_retrofit", "daytime street air during sunshade installation & finale (shots 15-16)",
            _cut(amb_day(T.DUR - 59.7, 0.45, 0.25, seed=45), T.DUR - 59.7, 0.3, 0.15), -29, "bed", send=0.0))

    # ------------------------------------------------ Hook (Shot 1: 0.0 - 4.37s)
    add(Cue(0.15, "ray_hum_hook", "concentrated solar death-ray shimmer + heat sizzle on the luxury car (hook)",
            lambda: (_ray_hum(4.1, rng(12)) + _sizzle(4.1, rng(13), 0.7), 0.0), -10, p=0.1, send=0.15, cut=T.FLASH + 0.02))
    add(Cue(1.48, "melt_droop_hook", "luxury car mirror & panels drooping in the beam ('melted a luxury car')",
            lambda: (G.creak(0.65, rng(14), 180, 75, G.TIMBER, rough=0.15) * 0.9, 0.0), -8, p=0.15, send=0.15, cut=T.FLASH + 0.02))
    for tm, nm in [(T.fr(48), "glide to melting Jaguar"), (T.fr(89), "low angle up at skyscraper")]:
        add(Cue(tm, "whoosh_cam", f"camera {nm}", (lambda r=rr(): (G.whoosh(0.45, r, 0.07, 400, 2400, 0.8, 0.13, 0.2), 0.07)), -12, send=0.1))
    add(Cue(T.FLASH, "flash_whoosh", "reverse swell into the white flash (frame 131) + low whoomp",
            lambda: _flash(rng(131)), -5, send=0.2))

    # ------------------------------------------------ Shot 2 & 3 (Tower pride & curved glass bowl, 4.37 - 13.67s)
    add(Cue(T.FLASH, "crowd_murmur", "Londoners admiring the new 37-story tower (shot 2)",
            lambda: (_murmur(4.1, rng(21), 18, early=True), 0.0), -11, lpf=3600, send=0.35))
    add(Cue(7.2, "crowd_cheer", "cheer on 'newest pride of the city'",
            lambda: (_cheer(2.4, rng(22)), 0.0), -7, lpf=5000, send=0.35))
    add(Cue(11.1, "glass_curve_swell", "resonant metallic-glass shimmer as the facade curves outward like a giant bowl",
            lambda: (_ray_hum(2.3, rng(31)), 0.0), -11, p=0.0, send=0.25))

    # ------------------------------------------------ Shot 4 (Budget cut at SNAP = 15.80s)
    add(Cue(14.2, "coins_clink", "coin clink on 'save a little money on the build'",
            lambda: (_bounces(rng(41)), 0.0), -10, p=0.2, send=0.12))
    add(Cue(T.SNAP, "scissors_cut", "GIANT SCISSORS SNIP: cutting the window shades from the budget ('cut the window shades')",
            lambda: (G.bolt_snap(rng(1580)), 0.0), -2, p=-0.15, send=0.18))

    # ------------------------------------------------ Shot 5 (August sun & creeping strip of light, 17.27 - 21.63s)
    add(Cue(17.55, "sun_flare", "blazing August sun flare & focused beam hum ('Then the August sun comes out')",
            lambda: (_ray_hum(3.8, rng(51)), 0.0), -9, p=0.0, send=0.2))
    add(Cue(19.6, "beam_creep_sizzle", "blinding strip of light creeping across the shopfronts",
            lambda: (_sizzle(2.0, rng(52), 0.8), 0.0), -10, p=-0.25, send=0.15))

    # ------------------------------------------------ Shot 6 (Doormat smoking, 21.63 - 24.13s)
    add(Cue(22.0, "doormat_sizzle", "barbershop doormat charring & smoking ('doormat outside a barbershop starts smoking')",
            lambda: (_sizzle(2.1, rng(61), 1.1), 0.0), -7, p=-0.2, send=0.12))
    add(Cue(23.1, "barber_gasp", "barber gasps at smoking doormat",
            lambda: (_whoas(rng(62)), 0.0), -10, p=0.2, send=0.2))

    # ------------------------------------------------ Shot 7 (Sidewalk tiles crack at DROP0 = 25.16s, van paint blisters at 26.1s)
    add(Cue(T.DROP0, "tile_crack", "SIDEWALK TILES CRACK: sharp stone snap & heave ('sidewalk tiles crack')",
            lambda: (G.wood_crack(rng(2516)), 0.0), -3, p=-0.1, send=0.16))
    add(Cue(25.95, "paint_blisters", "paint blistering & popping on the delivery van ('paint blisters on a delivery van')",
            lambda: (_sizzle(1.0, rng(71), 1.2) + _debris(rng(72)) * 0.5, 0.0), -7, p=0.15, send=0.15))

    # ------------------------------------------------ Shot 8 (Shiny black Jaguar parked -> mirror & panels drooping at DROP1 = 31.08s)
    for k in range(4):
        add(Cue(27.6 + k * 0.48, "martin_step", "guy parks his Jaguar and strolls off",
                (lambda r=rr(): (G.stroll_step(r, 0.8), 0.0)), -12, p=0.2, send=0.15, group="martin_steps"))
    add(Cue(28.5, "car_sparkle", "bright metallic chime on 'shiny black Jaguar'",
            lambda: (G.clink(rng(81), 3200, 0.18), 0.0), -11, p=0.1, send=0.2))
    add(Cue(30.2, "martin_shock", "owner comes back and gasps in shock",
            lambda: (_groans(rng(82), [(0.0, "oh", 1.0), (0.18, "ugh", 0.8)]), 0.0), -8, p=0.2, send=0.18))
    add(Cue(T.DROP1, "jaguar_melt", "JAGUAR MIRROR & PANELS DROOPING: cartoon wax sag groan + heat sizzle ('mirror and panels drooping like melted wax')",
            lambda: (st(G.creak(1.6, rng(3108), 160, 58, G.TIMBER, rough=0.18)) + _sizzle(1.6, rng(3109), 1.0), 0.0), -4, p=-0.1, send=0.18))

    # ------------------------------------------------ Shot 9 (Reporter sets frying pan & cooks egg on bricks, 33.33 - 38.37s)
    add(Cue(35.15, "pan_clank", "cast-iron frying pan set down on the pavement bricks ('sets a frying pan on the pavement')",
            lambda: (G.hammer_hit(rng(91), 0.75), 0.0), -6, p=0.0, send=0.15))
    add(Cue(35.45, "egg_sizzle", "egg frying & sizzling loud in the pan right on the bricks ('cooks an egg right on the bricks')",
            lambda: (_sizzle(2.8, rng(92), 1.35), 0.0), -5, p=0.05, send=0.1))

    # ------------------------------------------------ Shots 10 & 11 (£900 payout & 500-foot death ray reveal, 38.37 - 45.07s)
    add(Cue(39.45, "payout_cash", "builders politely pay nine hundred pounds: crisp coins & cash chime",
            lambda: (_bounces(rng(101)), 0.0), -8, p=-0.1, send=0.15))
    add(Cue(42.1, "death_ray_blast", "500-foot death ray aimed at the street: solar roar + street sizzle + startled crowd",
            lambda: (_ray_hum(2.6, rng(111)) + _sizzle(2.6, rng(112), 0.9), 0.0), -7, p=0.0, send=0.22))

    # ------------------------------------------------ Shots 12, 13, 14 (Golden optics explanation, 45.07 - 59.77s)
    add(Cue(45.8, "flat_rays", "flat glass wall bouncing sunlight away in neat harmless rows",
            lambda: (_ray_hum(2.4, rng(121)) * 0.6, 0.0), -13, p=-0.2, send=0.2))
    add(Cue(49.2, "mirror_tilt_squeak", "tilting the curved shaving mirror on its swivel stand",
            lambda: (G.swing_squeak(rng(131), 0.7, True), 0.12), -10, p=0.1, send=0.18))
    add(Cue(52.5, "scorching_spot", "every beam meets in ONE SCORCHING SPOT: focus flare + hot sizzle burst",
            lambda: (_sizzle(1.5, rng(132), 1.25), 0.0), -6, p=0.0, send=0.15))
    add(Cue(55.5, "magnifying_tower", "37 floors of curved glass acting like one giant magnifying mirror",
            lambda: (_ray_hum(3.8, rng(141)), 0.0), -9, p=0.0, send=0.22))

    # ------------------------------------------------ Shot 15 (Bolting metal shades across every single floor: HITS = 61.80, 62.45, 63.10)
    for k, th in enumerate(T.HITS):
        big = 1.0 if k < 2 else 1.25
        add(Cue(th - 0.09, "wrench_swish", "wrench/hammer swing",
                (lambda r=rr(): (G.whoosh(0.18, r, 0.08, 600, 2500, 0.6, 0.04, 0.2), 0.08)), -18, p=0.2, send=0.1, group="bolts"))
        add(Cue(th, "bolt_shade", f"bolting metal sunshades across floor batch {k + 1}/3: steel clang + ratchet impact",
                (lambda r=rr(), big=big: (G.hammer_hit(r, big), 0.0)), -5 if k < 2 else -4, p=(k - 1) * 0.3, send=0.22, group="bolts"))

    # ------------------------------------------------ Shot 16 (Finale strolling & camera whooshes, 64.87 - 68.50s)
    for (t, i, x, z, sp) in T.tourist_steps():
        if t < 64.85 or t > T.DUR - 0.05:
            continue
        cam = T.tourist_cam(t)
        d = float(np.linalg.norm(cam - np.array([x, 6.0, z])))
        g, lpf, send = T.dist_fx(d)
        pp = float(np.clip(-(x - cam[0]) / max(d, 1) * 1.6, -0.8, 0.8))
        add(Cue(t, "stroll_step", "pedestrian footstep on the shaded London street",
                (lambda r=rr(): (shelf(G.stroll_step(r, r.uniform(0.2, 1.0)), 1500, 4.0, "high"), 0.0)),
                -9, p=pp, extra=max(g, -8.0) + float(R.uniform(-2, 1)), lpf=lpf, send=send, group="stroll_steps"))
    add(Cue(64.9, "town_murmur", "Londoners chatting happily on the shaded street (shot 16)",
            lambda: (_murmur(3.5, rng(65), 14, early=False), 0.0), -11, lpf=3200, send=0.35))

    # Camera glide & crossfade whooshes
    for f, desc in [(256, "tilt up to flared top floors"), (339, "glide round to curved glass bowl"),
                    (468, "cut in to budget scissors"), (556, "cut down to street light strip"),
                    (682, "push into smoking doormat"), (766, "cut to blistering delivery van"),
                    (948, "cut to drooping Jaguar mirror"), (1072, "push into sizzling egg in pan"),
                    (1255, "pull back to 500-foot death ray"), (1528, "push into scorching focal spot"),
                    (1842, "tilt up to sunshade installation"), (1992, "crane out over shaded London street")]:
        add(Cue(T.fr(f), "whoosh_cam", f"camera {desc}", (lambda r=rr(): (G.whoosh(0.55, r, 0.09, 330, 2000, 0.8, 0.18, 0.15), 0.09)),
                -11, send=0.12))
    for f, desc in [(1352, "crossfade to golden optics"), (1457, "crossfade to curved shaving mirror"),
                    (1624, "crossfade to magnifying skyscraper"), (1793, "crossfade back to daytime retrofit"),
                    (1946, "crossfade to finale")]:
        add(Cue(T.fr(f), "whoosh_xfade", desc, (lambda r=rr(): (G.whoosh(0.75, r, 0.30, 300, 1600, 0.9, 0.22, 0.1), 0.30)), -12, send=0.15))

    return C


def _cut(gen, dur, fin, fout):
    def g():
        x, a = gen()
        return fades(x, fin, fout), a
    return g


def _env(gen, dur, fin, fout):
    return _cut(gen, dur, fin, fout)


def _golden(dur, r):
    n = ns(dur)
    x = G.breeze(dur, r, 0.7, 0.1, 650)
    x += st(lp(bp(colored(n, r, 0.8), 150, 1400, 1), 1200) * 0.35)
    x += pan(G.bird_chirps(dur, r, 0.35, "blackbird") * 0.06, -0.5)
    x += pan(G.bird_chirps(dur, r, 0.25, "blackbird") * 0.04, 0.6)
    x += widen(G.crickets(dur, r, 3) * 0.008, r, 9, 1.0)
    return x


def _flash(r):
    dur = 0.75
    y = G.whoosh(dur, r, 0.33, 500, 4200, 0.9, 0.09, 0.4)
    t = tt(dur)
    boom = np.where(t > 0.33, np.exp(-(t - 0.33) / 0.12) * np.sin(2 * np.pi * 62 * (t - 0.33)), 0) * 0.8
    return widen(y + boom, r, 12, 0.9), 0.33


def _murmur(dur, r, voices, early=False):
    n = ns(dur)
    out = np.zeros((2, n))
    for v in range(voices):
        kind = r.uniform()
        base, scale = ((r.uniform(95, 140), r.uniform(0.95, 1.05)) if kind < 0.45 else
                       (r.uniform(175, 235), r.uniform(1.12, 1.2)) if kind < 0.85 else (r.uniform(260, 330), r.uniform(1.25, 1.35)))
        y = G.babble(dur, r, base, scale, r.uniform(3.6, 4.8), r.uniform(0.55, 0.8), fmax=3400)
        y = lp(y, r.uniform(2200, 3600), 1) * r.uniform(0.3, 1.0)
        out += pan(y, r.uniform(-0.85, 0.85))
    if early:
        for k in range(4):
            h = G.hurrah(r, r.uniform(110, 230), r.uniform(1.0, 1.18))
            place(out, pan(lp(h, 3000, 1) * 0.5, r.uniform(-0.8, 0.8)), r.uniform(0.2, 1.6))
    return fades(out, 0.25, 0.8)


def _cheer(dur, r):
    n = ns(dur)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for v in range(22):
        kid = v % 6 == 5
        base = r.uniform(270, 340) if kid else (r.uniform(105, 160) if v % 2 else r.uniform(180, 250))
        scale = 1.3 if kid else (1.0 if v % 2 else 1.15)
        h = G.hurrah(r, base * r.uniform(0.97, 1.05), scale, kid)
        tm = r.uniform(0.15, 0.9)
        place(out, pan(lp(h, 4000, 1) * r.uniform(0.35, 1.0), r.uniform(-0.9, 0.9)), tm)
    env = np.interp(t, [0, 0.3, 0.8, 1.6, dur], [0.0, 0.5, 1.0, 0.7, 0.0])
    out += G.applause(dur, r, 36, env) * 0.85
    return fades(out, 0.05, 0.4)


def _bounces(r):
    y = np.zeros(ns(0.6))
    for k, (tm, a) in enumerate([(0.0, 1.0), (0.11, 0.45), (0.19, 0.25), (0.24, 0.12)]):
        c = G.clink(r, r.uniform(2600, 3400), 0.12) * a
        y[ns(tm): ns(tm) + len(c)] += c[: len(y) - ns(tm)]
    return y


def _whoas(r):
    out = np.zeros((2, ns(0.75)))
    for v in range(6):
        w = G.oof(r, "oh")
        place(out, pan(w * r.uniform(0.4, 1.0), r.uniform(-0.8, 0.8)), r.uniform(0.0, 0.18))
    return out


def _groans(r, parts):
    out = np.zeros((2, ns(0.9)))
    for tm, kd, g in parts:
        o = G.oof(r, kd, base=r.uniform(95, 130), scale=r.uniform(0.95, 1.05))
        place(out, pan(o * g, r.uniform(-0.6, 0.6)), tm)
    return out


def _debris(r):
    out = np.zeros((2, ns(1.0)))
    for k in range(6):
        knock = modal(0.25, [(r.uniform(220, 380), 1.0, 0.04), (r.uniform(550, 950), 0.6, 0.02)], r)
        place(out, pan(knock * r.uniform(0.3, 1.0), r.uniform(-0.8, 0.8)), r.uniform(0, 0.6))
    return out


def render(v_ref, on_event=None):
    C = cues()
    out = np.zeros((2, N))
    send = np.zeros(N)
    for c in C:
        x, anchor = c.gen()
        x = np.asarray(x, float)
        x = pan(x, c.p) if x.ndim == 1 else x
        if c.cut is not None:
            k = ns(c.cut - (c.t - anchor))
            if 0 < k < x.shape[1]:
                x = fades(x[:, :k], 0.0, 0.02)
        tgt = v_ref + c.applied
        cur = momentary_max(x) if c.kind == "event" else integrated(x)
        if np.isfinite(cur):
            x = x * dbg(tgt - cur)
        if c.lpf:
            x = lp(x, c.lpf, 1)
        c.measured = momentary_max(x) - v_ref if c.kind == "event" else integrated(x) - v_ref
        t0 = c.t - anchor
        place(out, x, t0)
        if on_event:
            on_event(c, x, t0)
        if c.send > 0:
            G._place_mono(send, c.send * x.mean(0), t0)
    valley = make_ir(1.1, 77, pre=0.01, hf=1.6, early=[(0.09, 0.45, -0.5), (0.14, 0.3, 0.6), (0.23, 0.2, -0.2)])
    out += 0.55 * convolve_st(send, valley)
    out = hp(out, 25, 2)
    end = ns(T.DUR - 0.12)
    out[:, end:] *= np.linspace(1, 0, N - end)[None, :] ** 2
    return out, C
