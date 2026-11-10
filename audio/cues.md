# The Bridge That Fell for a Song - soundtrack cue sheet

All sound is original: synthesized in numpy/scipy by `sfx_gen.py` / `instruments.py`, placed by `sfx.py` / `music.py`, mixed by `mix.py`.
Voice = `voice/voice.wav`, gain only (no EQ, no compression, no pitch).

## Files
| file | content |
|---|---|
| `mix.wav` | final mix, 48 kHz, stereo, 24-bit, 3,240,000 samples = 67.500 s |
| `stem_voice.wav` / `stem_music.wav` / `stem_sfx.wav` | stems at mix gain (they sum to the mix before the master limiter) |

## Master loudness (own BS.1770-4 meter)
- Integrated **-15.0 LUFS**, true peak **-1.2 dBTP**, LRA 2.0 LU, max momentary -10.3 LUFS, max short-term -13.4 LUFS
- Stems: voice -15.0 LUFS, music -25.3 LUFS, sfx -29.5 LUFS (voice gain +5.11 dB, same gain on every stem)
- Master limiter (4x oversampled look-ahead, ceiling -1.2 dBTP): max gain reduction 5.71 dB, active (>0.1 dB) on 13.15 % of samples, >0.5 dB on 5.82 %

ffmpeg ebur128 cross-check:
```
Summary:
  Integrated loudness:
    I:         -15.0 LUFS
    Threshold: -25.1 LUFS
  Loudness range:
    LRA:         2.0 LU
    Threshold: -35.1 LUFS
    LRA low:   -16.1 LUFS
    LRA high:  -14.1 LUFS
  True peak:
    Peak:       -1.2 dBFS
```

## Voice on top: per-section loudness (LUFS, integrated per stem, at mix gain)
bed = music + sfx. margin = voice - bed (integrated over the section). speech median / p10 = median and 10th percentile of the 400 ms momentary margin (voice - bed) over windows centred on spoken words.

| section (shots) | time s | voice | music | sfx | bed | margin LU | speech median LU | speech p10 LU |
|---|---|---|---|---|---|---|---|---|
| hook (1) | 0.00-4.37 | -14.5 | -24.3 | -30.4 | -23.3 | 8.8 | 8.9 | 4.0 |
| tower (2) | 4.37-8.53 | -14.6 | -25.2 | -31.2 | -24.2 | 9.6 | 9.6 | 6.3 |
| bowl (3) | 8.53-13.67 | -14.9 | -25.0 | -34.9 | -24.6 | 9.7 | 10.2 | 5.4 |
| budget+beam (4-5) | 13.67-21.63 | -14.3 | -24.3 | -29.2 | -23.3 | 9.0 | 8.5 | 4.2 |
| doormat (6) | 21.63-24.13 | -14.7 | -26.1 | -28.3 | -24.1 | 9.4 | 7.9 | 6.2 |
| tiles+van (7) | 24.13-27.33 | -14.6 | -23.2 | -28.1 | -22.3 | 7.7 | 6.5 | 4.2 |
| jaguar (8) | 27.33-33.33 | -15.5 | -25.6 | -29.2 | -24.3 | 8.8 | 7.2 | 3.4 |
| egg+payout (9-11) | 33.33-45.07 | -15.1 | -27.8 | -28.4 | -27.4 | 12.3 | 15.1 | 7.9 |
| flat_glass (12) | 45.07-48.57 | -15.2 | -27.0 | -35.7 | -26.8 | 11.6 | 11.9 | 8.3 |
| shaving_mirror (13) | 48.57-54.13 | -14.9 | -26.4 | -32.0 | -25.6 | 10.7 | 10.7 | 6.8 |
| magnify (14) | 54.13-59.77 | -15.3 | -25.9 | -31.6 | -25.0 | 9.7 | 9.4 | 6.8 |
| retrofit (15) | 59.77-64.87 | -14.9 | -26.4 | -27.8 | -24.9 | 9.9 | 10.2 | 5.5 |
| finale (16) | 64.87-68.50 | -15.4 | -26.6 | -26.9 | -23.8 | 8.4 | 7.3 | 5.9 |

## Music map (original march, Bb major, 120 bpm: quarter note = footfall)
Music target per section, LU under the voice (after a -3 dB speech duck keyed from words.json): hook -9.5, town -10.5, march -10.0, bounce -10.0, whistle -9.5, tension -10.0, sway -12.0, swing -11.5, march2 -10.5, rule -11.5, tourists -11.0. Applied section gains (dB): hook -10.6, town -6.9, march -9.7, bounce -9.6, whistle -8.9, tension -11.3, sway -10.1, swing -9.9, march2 -8.2, rule -6.7, tourists -11.5, dropout -11.3.

Rides (music only, dB): 3.65-4.30 s -3.0, 26.95-27.36 s -2.0, 32.20-32.77 s -4.0, 61.25-61.98 s -3.0 - so quiet sentence-final words stay on top and the band blooms in the gaps after them. The hook's last two footfalls (3.5, 4.0) are also 3 dB lower in the SFX for '...walking across it.'

| time s | frame | music |
|---|---|---|
| 0.00 | 0 | hook: theme A1-A2 tutti, 7 whistlers, tuba/after-beats/snare; snare fill 3.0-4.3 under 'across it.' |
| 4.37 | 131 | Bb button + light clash exactly on the white flash (frame 130), then the band is gone |
| 5.00 | 150 | story: theme A1-A2 light (glock + fife, tuba on 1/3, horns on 2/4, light snare) |
| 9.00 | 270 | full band: theme A3-A8 (cymbal), boots are the bass drum |
| 15.00 | 450 | tuba switches to bouncing octaves as the bridge starts bouncing |
| 21.00 | 630 | vamp bar, no melody: room for 'Somebody starts whistling' |
| 22.25 | 668 | solo whistler: 3-note pickup D-Eb-F into theme A on 23.0 (in Bb, on the beat) |
| 23.75 | 712 | the column joins the whistling (8 more whistlers by 24.75) |
| 29.22 | 877 | whistlers falter one by one (pitch droops, 29.2-29.7): faces turn nervous |
| 29.50 | 885 | tension: F7 pedal, tuba eighths, snare drive |
| 31.00 | 930 | chromatic climb F7 - F#dim7 - Gm - G#dim7, glock ticking 16ths, snare roll crescendo |
| 33.00 | 990 | DEAD STOP on 'Then,' - music silent through the bolt, the drop and the two-feet-deep joke |
| 43.43 | 1303 | warm return: pad Bb - Eb/Bb - Bb - F7, soft low brass, vibes pendulum on each sway extreme (84 bpm) |
| 48.60 | 1458 | music-box waltz (3/4): pizzicato + music-box melody climbing as beams converge |
| 54.20 | 1626 | march returns soft and golden under magnifying-glass explanation |
| 61.80 | 1854 | brass stabs + timpani on the 3 metal sunshade bolting impacts (61.80, 62.45, 63.10 s) |
| 63.60 | 1908 | relaxed finale version: swung vibes melody, walking pizzicato bass, brushes |
| 67.85 | 2035 | final Bb chord on 'save a few bucks', rings out, faded to silence at 68.5 |

## SFX events
Level convention: every EVENT has a naive level (LU vs the voice stem, as the event's max momentary loudness); applied = naive - 6 dB (standard mix rule) + distance/intensity offsets. BEDS are integrated loudness, not reduced. 'mix LUFS' = the event's max momentary loudness in the final mix (voice stem = -15.0 LUFS integrated). Column sounds also get the camera-distance low-pass and more valley reverb.

| # | time s | frame | cue | what | naive LU | applied LU | mix LUFS | pan |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.000 | 0.0 | amb_street_day (bed, integrated) | London street daytime air: gentle city breeze, sparrows, distant bustle (shots 1-11) | -29 | -29.0 | -44.0 | +0.00 |
| 2 | 0.150 | 4.5 | ray_hum_hook | concentrated solar death-ray shimmer + heat sizzle on the luxury car (hook) | -10 | -16.0 | -31.0 | +0.10 |
| 3 | 1.480 | 44.4 | melt_droop_hook | luxury car mirror & panels drooping in the beam ('melted a luxury car') | -8 | -14.0 | -29.0 | +0.15 |
| 4 | 1.600 | 48.0 | whoosh_cam | camera glide to melting Jaguar | -12 | -18.0 | -33.0 | +0.00 |
| 5 | 2.967 | 89.0 | whoosh_cam | camera low angle up at skyscraper | -12 | -18.0 | -33.0 | +0.00 |
| 6 | 4.367 | 131.0 | crowd_murmur | Londoners admiring the new 37-story tower (shot 2) | -11 | -17.0 | -32.2 | +0.00 |
| 7 | 4.367 | 131.0 | flash_whoosh | reverse swell into the white flash (frame 131) + low whoomp | -5 | -11.0 | -26.0 | +0.00 |
| 8 | 7.200 | 216.0 | crowd_cheer | cheer on 'newest pride of the city' | -7 | -13.0 | -28.2 | +0.00 |
| 9 | 8.533 | 256.0 | whoosh_cam | camera tilt up to flared top floors | -11 | -17.0 | -32.0 | +0.00 |
| 10 | 11.100 | 333.0 | glass_curve_swell | resonant metallic-glass shimmer as the facade curves outward like a giant bowl | -11 | -17.0 | -32.0 | +0.00 |
| 11 | 11.300 | 339.0 | whoosh_cam | camera glide round to curved glass bowl | -11 | -17.0 | -32.0 | +0.00 |
| 12 | 14.200 | 426.0 | coins_clink | coin clink on 'save a little money on the build' | -10 | -16.0 | -31.0 | +0.20 |
| 13 | 15.600 | 468.0 | whoosh_cam | camera cut in to budget scissors | -11 | -17.0 | -32.0 | +0.00 |
| 14 | 15.800 | 474.0 | scissors_cut | GIANT SCISSORS SNIP: cutting the window shades from the budget ('cut the window shades') | -2 | -8.0 | -23.0 | -0.15 |
| 15 | 17.550 | 526.5 | sun_flare | blazing August sun flare & focused beam hum ('Then the August sun comes out') | -9 | -15.0 | -30.0 | +0.00 |
| 16 | 18.533 | 556.0 | whoosh_cam | camera cut down to street light strip | -11 | -17.0 | -32.0 | +0.00 |
| 17 | 19.600 | 588.0 | beam_creep_sizzle | blinding strip of light creeping across the shopfronts | -10 | -16.0 | -31.0 | -0.25 |
| 18 | 22.000 | 660.0 | doormat_sizzle | barbershop doormat charring & smoking ('doormat outside a barbershop starts smoking') | -7 | -13.0 | -28.0 | -0.20 |
| 19 | 22.733 | 682.0 | whoosh_cam | camera push into smoking doormat | -11 | -17.0 | -32.0 | +0.00 |
| 20 | 23.100 | 693.0 | barber_gasp | barber gasps at smoking doormat | -10 | -16.0 | -31.0 | +0.20 |
| 21 | 25.160 | 754.8 | tile_crack | SIDEWALK TILES CRACK: sharp stone snap & heave ('sidewalk tiles crack') | -3 | -9.0 | -24.0 | -0.10 |
| 22 | 25.533 | 766.0 | whoosh_cam | camera cut to blistering delivery van | -11 | -17.0 | -32.0 | +0.00 |
| 23 | 25.950 | 778.5 | paint_blisters | paint blistering & popping on the delivery van ('paint blisters on a delivery van') | -7 | -13.0 | -28.0 | +0.15 |
| 24 | 27.600 | 828.0 | martin_step | guy parks his Jaguar and strolls off | -12 | -18.0 | -33.0 | +0.20 |
| 25 | 28.080 | 842.4 | martin_step | guy parks his Jaguar and strolls off | -12 | -18.0 | -33.0 | +0.20 |
| 26 | 28.500 | 855.0 | car_sparkle | bright metallic chime on 'shiny black Jaguar' | -11 | -17.0 | -32.0 | +0.10 |
| 27 | 28.560 | 856.8 | martin_step | guy parks his Jaguar and strolls off | -12 | -18.0 | -33.0 | +0.20 |
| 28 | 29.040 | 871.2 | martin_step | guy parks his Jaguar and strolls off | -12 | -18.0 | -33.0 | +0.20 |
| 29 | 30.200 | 906.0 | martin_shock | owner comes back and gasps in shock | -8 | -14.0 | -29.0 | +0.20 |
| 30 | 31.080 | 932.4 | jaguar_melt | JAGUAR MIRROR & PANELS DROOPING: cartoon wax sag groan + heat sizzle ('mirror and panels drooping like melted wax') | -4 | -10.0 | -25.0 | -0.10 |
| 31 | 31.600 | 948.0 | whoosh_cam | camera cut to drooping Jaguar mirror | -11 | -17.0 | -32.0 | +0.00 |
| 32 | 35.150 | 1054.5 | pan_clank | cast-iron frying pan set down on the pavement bricks ('sets a frying pan on the pavement') | -6 | -12.0 | -27.0 | +0.00 |
| 33 | 35.450 | 1063.5 | egg_sizzle | egg frying & sizzling loud in the pan right on the bricks ('cooks an egg right on the bricks') | -5 | -11.0 | -26.0 | +0.05 |
| 34 | 35.733 | 1072.0 | whoosh_cam | camera push into sizzling egg in pan | -11 | -17.0 | -32.0 | +0.00 |
| 35 | 39.450 | 1183.5 | payout_cash | builders politely pay nine hundred pounds: crisp coins & cash chime | -8 | -14.0 | -29.0 | -0.10 |
| 36 | 41.833 | 1255.0 | whoosh_cam | camera pull back to 500-foot death ray | -11 | -17.0 | -32.0 | +0.00 |
| 37 | 42.100 | 1263.0 | death_ray_blast | 500-foot death ray aimed at the street: solar roar + street sizzle + startled crowd | -7 | -13.0 | -28.0 | +0.00 |
| 38 | 45.000 | 1350.0 | amb_golden (bed, integrated) | golden-hour optics demonstration: warm breeze, blackbird phrases, calm air (shots 12-14) | -29 | -29.0 | -44.0 | +0.00 |
| 39 | 45.067 | 1352.0 | whoosh_xfade | crossfade to golden optics | -12 | -18.0 | -33.0 | +0.00 |
| 40 | 45.800 | 1374.0 | flat_rays | flat glass wall bouncing sunlight away in neat harmless rows | -13 | -19.0 | -34.0 | -0.20 |
| 41 | 48.567 | 1457.0 | whoosh_xfade | crossfade to curved shaving mirror | -12 | -18.0 | -33.0 | +0.00 |
| 42 | 49.200 | 1476.0 | mirror_tilt_squeak | tilting the curved shaving mirror on its swivel stand | -10 | -16.0 | -31.0 | +0.10 |
| 43 | 50.933 | 1528.0 | whoosh_cam | camera push into scorching focal spot | -11 | -17.0 | -32.0 | +0.00 |
| 44 | 52.500 | 1575.0 | scorching_spot | every beam meets in ONE SCORCHING SPOT: focus flare + hot sizzle burst | -6 | -12.0 | -27.0 | +0.00 |
| 45 | 54.133 | 1624.0 | whoosh_xfade | crossfade to magnifying skyscraper | -12 | -18.0 | -33.0 | +0.00 |
| 46 | 55.500 | 1665.0 | magnifying_tower | 37 floors of curved glass acting like one giant magnifying mirror | -9 | -15.0 | -30.0 | +0.00 |
| 47 | 59.700 | 1791.0 | amb_retrofit (bed, integrated) | daytime street air during sunshade installation & finale (shots 15-16) | -29 | -29.0 | -44.0 | +0.00 |
| 48 | 59.767 | 1793.0 | whoosh_xfade | crossfade back to daytime retrofit | -12 | -18.0 | -33.0 | +0.00 |
| 49 | 61.400 | 1842.0 | whoosh_cam | camera tilt up to sunshade installation | -11 | -17.0 | -32.0 | +0.00 |
| 50 | 61.710 | 1851.3 | wrench_swish | wrench/hammer swing | -18 | -24.0 | -39.0 | +0.20 |
| 51 | 61.800 | 1854.0 | bolt_shade | bolting metal sunshades across floor batch 1/3: steel clang + ratchet impact | -5 | -11.0 | -26.0 | -0.30 |
| 52 | 62.360 | 1870.8 | wrench_swish | wrench/hammer swing | -18 | -24.0 | -39.0 | +0.20 |
| 53 | 62.450 | 1873.5 | bolt_shade | bolting metal sunshades across floor batch 2/3: steel clang + ratchet impact | -5 | -11.0 | -26.0 | +0.00 |
| 54 | 63.010 | 1890.3 | wrench_swish | wrench/hammer swing | -18 | -24.0 | -39.0 | +0.20 |
| 55 | 63.100 | 1893.0 | bolt_shade | bolting metal sunshades across floor batch 3/3: steel clang + ratchet impact | -4 | -10.0 | -25.0 | +0.30 |
| 56 | 64.867 | 1946.0 | whoosh_xfade | crossfade to finale | -12 | -18.0 | -33.0 | +0.00 |
| 57 | 64.900 | 1947.0 | town_murmur | Londoners chatting happily on the shaded street (shot 16) | -11 | -17.0 | -32.1 | +0.00 |
| 58 | 64.937 | 1948.1 | stroll_step | pedestrian footstep on the shaded London street | -9 | -21.3 | -36.4 | -0.03 |
| 59 | 65.027 | 1950.8 | stroll_step | pedestrian footstep on the shaded London street | -9 | -15.2 | -30.2 | -0.80 |
| 60 | 65.126 | 1953.8 | stroll_step | pedestrian footstep on the shaded London street | -9 | -20.4 | -35.5 | -0.80 |
| 61 | 65.243 | 1957.3 | stroll_step | pedestrian footstep on the shaded London street | -9 | -23.3 | -38.4 | +0.80 |
| 62 | 65.267 | 1958.0 | stroll_step | pedestrian footstep on the shaded London street | -9 | -14.3 | -29.3 | +0.80 |
| 63 | 65.292 | 1958.8 | stroll_step | pedestrian footstep on the shaded London street | -9 | -24.0 | -39.1 | +0.80 |
| 64 | 65.343 | 1960.3 | stroll_step | pedestrian footstep on the shaded London street | -9 | -18.7 | -33.9 | +0.80 |
| 65 | 65.348 | 1960.4 | stroll_step | pedestrian footstep on the shaded London street | -9 | -24.8 | -40.1 | +0.80 |
| 66 | 65.349 | 1960.5 | stroll_step | pedestrian footstep on the shaded London street | -9 | -23.4 | -38.5 | +0.80 |
| 67 | 65.363 | 1960.9 | stroll_step | pedestrian footstep on the shaded London street | -9 | -23.6 | -38.7 | -0.79 |
| 68 | 65.398 | 1961.9 | stroll_step | pedestrian footstep on the shaded London street | -9 | -22.1 | -37.2 | +0.74 |
| 69 | 65.483 | 1964.5 | stroll_step | pedestrian footstep on the shaded London street | -9 | -22.1 | -37.3 | +0.80 |
| 70 | 65.741 | 1972.2 | stroll_step | pedestrian footstep on the shaded London street | -9 | -24.5 | -39.7 | -0.80 |
| 71 | 65.743 | 1972.3 | stroll_step | pedestrian footstep on the shaded London street | -9 | -22.8 | -38.0 | -0.80 |
| 72 | 65.821 | 1974.6 | stroll_step | pedestrian footstep on the shaded London street | -9 | -20.2 | -35.3 | -0.80 |
| 73 | 65.910 | 1977.3 | stroll_step | pedestrian footstep on the shaded London street | -9 | -17.1 | -32.2 | +0.80 |
| 74 | 65.923 | 1977.7 | stroll_step | pedestrian footstep on the shaded London street | -9 | -20.2 | -35.3 | +0.40 |
| 75 | 65.943 | 1978.3 | stroll_step | pedestrian footstep on the shaded London street | -9 | -22.6 | -37.6 | +0.80 |
| 76 | 65.996 | 1979.9 | stroll_step | pedestrian footstep on the shaded London street | -9 | -21.1 | -36.2 | +0.80 |
| 77 | 65.998 | 1979.9 | stroll_step | pedestrian footstep on the shaded London street | -9 | -18.4 | -33.6 | -0.80 |
| 78 | 66.024 | 1980.7 | stroll_step | pedestrian footstep on the shaded London street | -9 | -16.7 | -31.7 | -0.52 |
| 79 | 66.070 | 1982.1 | stroll_step | pedestrian footstep on the shaded London street | -9 | -21.0 | -36.1 | -0.67 |
| 80 | 66.264 | 1987.9 | stroll_step | pedestrian footstep on the shaded London street | -9 | -22.2 | -37.3 | -0.80 |
| 81 | 66.356 | 1990.7 | stroll_step | pedestrian footstep on the shaded London street | -9 | -23.4 | -38.6 | -0.80 |
| 82 | 66.399 | 1992.0 | stroll_step | pedestrian footstep on the shaded London street | -9 | -22.3 | -37.4 | +0.80 |
| 83 | 66.400 | 1992.0 | whoosh_cam | camera crane out over shaded London street | -11 | -17.0 | -32.0 | +0.00 |
| 84 | 66.497 | 1994.9 | stroll_step | pedestrian footstep on the shaded London street | -9 | -24.1 | -39.2 | +0.56 |
| 85 | 66.527 | 1995.8 | stroll_step | pedestrian footstep on the shaded London street | -9 | -21.0 | -36.1 | +0.80 |
| 86 | 66.539 | 1996.2 | stroll_step | pedestrian footstep on the shaded London street | -9 | -24.1 | -39.2 | +0.80 |
| 87 | 66.550 | 1996.5 | stroll_step | pedestrian footstep on the shaded London street | -9 | -22.9 | -38.0 | -0.54 |
| 88 | 66.614 | 1998.4 | stroll_step | pedestrian footstep on the shaded London street | -9 | -20.3 | -35.4 | -0.80 |
| 89 | 66.705 | 2001.2 | stroll_step | pedestrian footstep on the shaded London street | -9 | -23.8 | -38.9 | +0.80 |
| 90 | 66.729 | 2001.9 | stroll_step | pedestrian footstep on the shaded London street | -9 | -21.2 | -36.3 | +0.34 |
| 91 | 66.743 | 2002.3 | stroll_step | pedestrian footstep on the shaded London street | -9 | -22.8 | -38.0 | +0.42 |
| 92 | 66.749 | 2002.5 | stroll_step | pedestrian footstep on the shaded London street | -9 | -23.3 | -38.5 | +0.80 |
| 93 | 66.970 | 2009.1 | stroll_step | pedestrian footstep on the shaded London street | -9 | -24.0 | -39.3 | -0.48 |
| 94 | 67.071 | 2012.1 | stroll_step | pedestrian footstep on the shaded London street | -9 | -23.6 | -38.8 | +0.80 |
| 95 | 67.134 | 2014.0 | stroll_step | pedestrian footstep on the shaded London street | -9 | -24.2 | -39.4 | +0.80 |
| 96 | 67.145 | 2014.3 | stroll_step | pedestrian footstep on the shaded London street | -9 | -24.0 | -39.3 | +0.80 |
| 97 | 67.165 | 2014.9 | stroll_step | pedestrian footstep on the shaded London street | -9 | -22.6 | -37.8 | +0.02 |
| 98 | 67.316 | 2019.5 | stroll_step | pedestrian footstep on the shaded London street | -9 | -24.4 | -39.6 | +0.80 |
| 99 | 67.356 | 2020.7 | stroll_step | pedestrian footstep on the shaded London street | -9 | -22.9 | -38.2 | +0.40 |
| 100 | 67.386 | 2021.6 | stroll_step | pedestrian footstep on the shaded London street | -9 | -23.4 | -38.6 | +0.80 |
| 101 | 67.408 | 2022.2 | stroll_step | pedestrian footstep on the shaded London street | -9 | -23.6 | -38.8 | +0.38 |
| 102 | 67.415 | 2022.5 | stroll_step | pedestrian footstep on the shaded London street | -9 | -24.5 | -39.7 | +0.67 |
| 103 | 67.460 | 2023.8 | stroll_step | pedestrian footstep on the shaded London street | -9 | -23.6 | -38.8 | +0.76 |
| 104 | 67.502 | 2025.1 | stroll_step | pedestrian footstep on the shaded London street | -9 | -22.3 | -37.6 | +0.80 |
| 105 | 67.585 | 2027.5 | stroll_step | pedestrian footstep on the shaded London street | -9 | -23.4 | -38.5 | -0.01 |
| 106 | 67.645 | 2029.4 | stroll_step | pedestrian footstep on the shaded London street | -9 | -25.0 | -40.3 | +0.80 |
| 107 | 67.730 | 2031.9 | stroll_step | pedestrian footstep on the shaded London street | -9 | -22.3 | -37.5 | +0.80 |
| 108 | 67.763 | 2032.9 | stroll_step | pedestrian footstep on the shaded London street | -9 | -22.3 | -37.7 | +0.80 |
| 109 | 68.066 | 2042.0 | stroll_step | pedestrian footstep on the shaded London street | -9 | -24.5 | -39.8 | +0.17 |
| 110 | 68.067 | 2042.0 | stroll_step | pedestrian footstep on the shaded London street | -9 | -23.6 | -38.8 | +0.80 |
| 111 | 68.087 | 2042.6 | stroll_step | pedestrian footstep on the shaded London street | -9 | -22.9 | -38.1 | +0.69 |
| 112 | 68.162 | 2044.9 | stroll_step | pedestrian footstep on the shaded London street | -9 | -23.3 | -38.5 | +0.45 |
| 113 | 68.191 | 2045.7 | stroll_step | pedestrian footstep on the shaded London street | -9 | -23.0 | -38.1 | +0.78 |
| 114 | 68.199 | 2046.0 | stroll_step | pedestrian footstep on the shaded London street | -9 | -24.9 | -40.0 | +0.04 |
| 115 | 68.201 | 2046.0 | stroll_step | pedestrian footstep on the shaded London street | -9 | -23.0 | -38.2 | +0.45 |
| 116 | 68.220 | 2046.6 | stroll_step | pedestrian footstep on the shaded London street | -9 | -23.1 | -38.4 | +0.80 |
| 117 | 68.233 | 2047.0 | stroll_step | pedestrian footstep on the shaded London street | -9 | -23.6 | -39.0 | +0.80 |
| 118 | 68.255 | 2047.7 | stroll_step | pedestrian footstep on the shaded London street | -9 | -22.5 | -37.8 | +0.80 |
| 119 | 68.325 | 2049.8 | stroll_step | pedestrian footstep on the shaded London street | -9 | -23.6 | -38.8 | +0.80 |
| 120 | 68.380 | 2051.4 | stroll_step | pedestrian footstep on the shaded London street | -9 | -23.9 | -39.1 | +0.80 |
