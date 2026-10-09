#!/usr/bin/env python3
# SeqPanel 60s promo — procedural score + sound design (no external samples).
# Emits audio/mix.wav (48kHz stereo, 16-bit) with BGM and SFX aligned to the storyboard.
import os, math
import numpy as np
from scipy.signal import butter, sosfilt, lfilter

SR = 48000
DUR = 60.0
N = int(SR * DUR)
BPM = 100.0
BEAT = 60.0 / BPM          # 0.6 s
BAR = BEAT * 4             # 2.4 s

t = np.arange(N) / SR
L = np.zeros(N, np.float64)
R = np.zeros(N, np.float64)

def place(buf, start, sig, gain=1.0, pan=0.0):
    i = int(start * SR)
    if i >= N or i < 0: return
    j = min(N - i, len(sig))
    if j <= 0: return
    gl = gain * math.cos((pan + 1) * math.pi / 4)
    gr = gain * math.sin((pan + 1) * math.pi / 4)
    buf[i:i + j] += sig[:j] * gl
    return j

def _add(a, b):
    n = max(len(a), len(b))
    out = np.zeros(n)
    out[:len(a)] += a
    out[:len(b)] += b
    return out

def env_ad(n, a, d, curve=3.0):
    e = np.zeros(n)
    na = min(n, max(1, int(a * SR)))
    ramp = np.linspace(0, 1, na) ** 1.5
    e[:na] = ramp
    end = min(n, na + max(1, int(d * SR)))
    m = end - na
    if m > 0:
        tail = np.exp(-np.linspace(0, curve, m))
        e[na:end] += tail * (e[na - 1] if na > 0 else 1.0)
    return e

def tone(f, dur, harmonics=((1, 1.0), (2, 0.28), (3, 0.12), (4, 0.05)), a=0.004, d=None, curve=3.0, detune=0.0):
    n = int(dur * SR)
    if n <= 0: return np.zeros(1)
    d = d if d is not None else dur
    x = np.arange(n) / SR
    s = np.zeros(n)
    for k, (h, amp) in enumerate(harmonics):
        ph = 2 * np.pi * f * h * (1 + detune * (1 if k % 2 else -1)) * x
        s += amp * np.sin(ph)
    return s * env_ad(n, a, d, curve)

def noise(dur, a=0.002, curve=3.0):
    n = max(1, int(dur * SR))
    return np.random.default_rng(int(dur * 1e6) % 999983).standard_normal(n) * env_ad(n, a, dur, curve)

def bp(sig, lo, hi, order=2):
    sos = butter(order, [lo / (SR / 2), hi / (SR / 2)], btype='band', output='sos')
    return sosfilt(sos, sig)

def lp(sig, cut, order=2):
    sos = butter(order, cut / (SR / 2), btype='low', output='sos')
    return sosfilt(sos, sig)

def hp(sig, cut, order=2):
    sos = butter(order, cut / (SR / 2), btype='high', output='sos')
    return sosfilt(sos, sig)

rng = np.random.default_rng(7)

# ------------------------------------------------------------------ harmony
# Am - F - C - G, one chord per bar
ROOTS = [110.0, 87.31, 130.81, 98.0]                       # A2 F2 C3 G2
TRIAD = [[220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [261.63, 329.63, 392.0], [196.0, 246.94, 293.66]]
ARP = [[440.0, 523.25, 659.25, 783.99], [349.23, 440.0, 523.25, 698.46],
       [523.25, 659.25, 783.99, 1046.5], [392.0, 493.88, 587.33, 783.99]]

def section_gain(x):
    """Envelope of the arrangement: 0..1 density over time."""
    g = np.zeros_like(x)
    g += 0.46 * (np.clip((x - 1.2) / 2.4, 0, 1)) * (x < 11)           # intro bed
    g += 0.45 * np.clip((x - 11) / 4.0, 0, 1) * (x >= 11)            # build
    g += 0.55 * (x >= 16.0)                                           # main groove in
    g -= 0.22 * (x >= 38.0) * np.clip((x - 38) / 1.5, 0, 1)          # breakdown
    g += 0.35 * (x >= 44.0) * np.clip((x - 44) / 1.0, 0, 1)          # back up
    g += 0.20 * (x >= 46.0) * np.clip((x - 46) / 0.6, 0, 1)          # montage
    g -= 0.45 * (x >= 54.0) * np.clip((x - 54) / 1.2, 0, 1)          # resolve
    return np.clip(g, 0, 1.2)

SG = section_gain(t)

# ---- pad: detuned saw-ish chords, low-passed, slow swell
def add_pad(t0, t1, chord, gain=0.16):
    dur = t1 - t0
    n = int(dur * SR)
    x = np.arange(n) / SR
    s = np.zeros(n)
    for f in chord:
        for d in (-0.0035, 0.0, 0.0038):
            ff = f * (1 + d)
            h = np.zeros(n)
            for k, amp in ((1, 1.0), (2, 0.45), (3, 0.25), (4, 0.14), (5, 0.08), (6, 0.05)):
                h += amp * np.sin(2 * np.pi * ff * k * x + rng.uniform(0, 6.28))
            s += h / 3.0
    swell = np.sin(np.linspace(0, np.pi, n)) ** 0.7
    fade = np.minimum(1, np.minimum(np.arange(n) / (0.35 * SR), np.arange(n)[::-1] / (0.5 * SR) + 1))
    s = lp(s, 1500) * swell * fade
    place(L, t0, s, gain * 1.05); place(R, t0, s, gain * 0.95)

# ---- sub bass
def add_sub(t0, f, dur, gain=0.5):
    n = int(dur * SR)
    x = np.arange(n) / SR
    e = np.exp(-x / (dur * 0.55)) * (1 - np.exp(-x / 0.02))
    s = (np.sin(2 * np.pi * f * x) + 0.22 * np.sin(4 * np.pi * f * x)) * e
    s = lp(s, 240)
    place(L, t0, s, gain); place(R, t0, s, gain)

# ---- pluck arp
def add_pluck(t0, f, gain=0.2, pan=0.0):
    s = tone(f, 0.42, harmonics=((1, 1.0), (2, 0.4), (3, 0.18), (5, 0.06)), a=0.002, d=0.4, curve=4.5)
    s = hp(bp(s, 180, 6500), 120) * 1.8
    place(L, t0, s, gain, pan - 0.25); place(R, t0, s, gain, pan + 0.25)

# ---- drums
def add_kick(t0, gain=0.9):
    n = int(0.34 * SR)
    x = np.arange(n) / SR
    f = 118 * np.exp(-x / 0.035) + 42
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-x / 0.14)
    s[:int(0.010 * SR)] += noise(0.010) * 0.55 * np.exp(-x[:int(0.010 * SR)] / 0.004)
    s = lp(s, 320)
    peak = np.max(np.abs(s)) or 1
    place(L, t0, s / peak * gain); place(R, t0, s / peak * gain)

def add_snare(t0, gain=0.4):
    # tuned rimshot: two short tones, only a whisper of noise on the attack
    n = int(0.14 * SR)
    x = np.arange(n) / SR
    body = np.sin(2 * np.pi * 195 * x) * np.exp(-x / 0.030)
    snap = np.sin(2 * np.pi * 288 * x) * np.exp(-x / 0.021)
    nz = noise(0.020, curve=16) * 0.16
    s = _add(_add(body * 0.95, snap * 0.6), nz)
    pk = np.max(np.abs(s)) or 1
    s = s / pk
    place(L, t0, s, gain, -0.2); place(R, t0, s, gain, 0.2)
def add_hat(t0, gain=0.13, dur=0.05):
    # short metallic ping rather than a band of hiss
    n = int(0.045 * SR)
    x = np.arange(n) / SR
    s = (np.sin(2 * np.pi * 5232 * x) + 0.55 * np.sin(2 * np.pi * 7900 * x)) * np.exp(-x / 0.010)
    s = s * np.minimum(1, x / 0.001)
    pk = np.max(np.abs(s)) or 1
    s = s / pk
    place(L, t0, s, gain * 0.85, -0.35); place(R, t0, s, gain * 0.85, 0.35)
def add_crash(t0, gain=0.35):
    # metallic bell partials, replacing the high-passed noise wash
    n = int(1.6 * SR)
    x = np.arange(n) / SR
    s = np.zeros(n)
    for k, (ratio, amp, dec) in enumerate(((1.0, 1.0, 3.0), (2.76, 0.5, 4.4), (5.40, 0.26, 6.2), (8.93, 0.12, 8.0))):
        s += amp * np.sin(2 * np.pi * 660.0 * ratio * x + k * 1.7) * np.exp(-x * dec)
    s = s * np.minimum(1, x / 0.004)
    pk = np.max(np.abs(s)) or 1
    s = s / pk
    place(L, t0, s, gain * 0.5, -0.3); place(R, t0, s, gain * 0.5, 0.3)

# ------------------------------------------------------------------ arrangement
bar = 0
x = 0.0
while x < DUR - 0.1:
    chord = TRIAD[bar % 4]
    root = ROOTS[bar % 4]
    dens = SG[int(x * SR)]
    if dens > 0.02:
        add_pad(x, x + BAR, [chord[0] / 2, chord[0], chord[1], chord[2]], 0.10 + 0.10 * dens)
    # rhythm: kick on 1 & 3, snare on 2 & 4, hats on 8ths once the groove is in
    if x >= 16.0 and x < 38.0 or (44.0 <= x < 54.0):
        for b in range(4):
            tt = x + b * BEAT
            if tt >= DUR: break
            if b in (0, 2): add_kick(tt, 0.85)
            if b in (1, 3): add_snare(tt, 0.34)
            add_hat(tt, 0.10)
            add_hat(tt + BEAT / 2, 0.075, 0.04)
        add_sub(x, root, BAR, 0.42)
        for k in range(8):
            tt = x + k * (BEAT / 2)
            if tt >= DUR: break
            add_pluck(tt, ARP[bar % 4][k % 4], 0.075 + 0.05 * dens, pan=((k % 3) - 1) * 0.4)
    elif x >= 11.0:
        add_sub(x, root, BAR, 0.22)
        for k in range(4):
            add_hat(x + k * BEAT, 0.05, 0.06)
    else:
        add_sub(x, root / 2, BAR, 0.34)
        add_kick(x, 0.26)                        # heartbeat under the opening
        add_hat(x + BEAT * 2, 0.055, 0.05)
    bar += 1
    x += BAR

# outro chord + tail
add_pad(54.0, 59.6, [220.0, 261.63, 329.63, 440.0, 523.25], 0.20)
add_crash(16.0, 0.30); add_crash(46.0, 0.22); add_crash(54.0, 0.34)

def add_riser(t0, dur, gain=0.3, f0=170, f1=880):
    # tonal upward sweep with a quickening tremolo -- no broadband hiss
    n = int(dur * SR)
    x = np.arange(n) / SR
    fr = f0 * (f1 / f0) ** (x / dur)
    ph = 2 * np.pi * np.cumsum(fr) / SR
    s = np.sin(ph) + 0.34 * np.sin(2 * ph) + 0.13 * np.sin(3 * ph)
    rate = 5.0 + 24.0 * (x / dur) ** 2
    trem = 0.58 + 0.42 * np.sin(2 * np.pi * np.cumsum(rate) / SR)
    s = s * trem * np.linspace(0.10, 1.0, n) ** 1.7
    pk = np.max(np.abs(s)) or 1
    s = s / pk
    place(L, t0, s, gain * 0.5, -0.2); place(R, t0, s, gain * 0.5, 0.2)
def add_impact(t0, gain=0.8):
    n = int(1.2 * SR)
    x = np.arange(n) / SR
    f = 92 * np.exp(-x / 0.22) + 34
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / 0.30)
    nn = int(0.5 * SR)
    xn = np.arange(nn) / SR
    # low body only; the old mid-band noise layer read as steam
    s = _add(s, lp(noise(0.5, curve=6), 320) * 0.28 * np.exp(-xn / 0.10))
    place(L, t0, s, gain); place(R, t0, s, gain)
def add_whoosh(t0, gain=0.3, up=True):
    # short pitched air sweep instead of a filtered-noise wash
    dur = 0.34
    n = int(dur * SR)
    x = np.arange(n) / SR
    a, b = (165.0, 560.0) if up else (560.0, 165.0)
    fr = a * (b / a) ** (x / dur)
    ph = 2 * np.pi * np.cumsum(fr) / SR
    s = (np.sin(ph) + 0.3 * np.sin(2 * ph)) * np.sin(np.pi * x / dur) ** 1.5
    pk = np.max(np.abs(s)) or 1
    s = s / pk
    place(L, t0, s, gain * 0.45, -0.4); place(R, t0, s, gain * 0.45, 0.4)
def add_click(t0, gain=0.22, pan=0.0, hi=2600):
    n = int(0.035 * SR)
    x = np.arange(n) / SR
    s = np.sin(2 * np.pi * hi * x) * np.exp(-x / 0.006)
    s += 0.5 * np.sin(2 * np.pi * hi * 1.5 * x) * np.exp(-x / 0.004)
    s = s * np.minimum(1, x / 0.0008)
    pk = np.max(np.abs(s)) or 1
    s = s / pk
    place(L, t0, s, gain, pan); place(R, t0, s, gain, pan)
def add_tick(t0, gain=0.10, pan=0.0):
    n = int(0.022 * SR)
    x = np.arange(n) / SR
    s = np.sin(2 * np.pi * 3400 * x) * np.exp(-x / 0.0035)
    pk = np.max(np.abs(s)) or 1
    s = s / pk
    place(L, t0, s, gain, pan); place(R, t0, s, gain, pan)
def add_type(t0, gain=0.13):
    # wooden key tick: two short tones with a hair of attack transient
    n = int(0.030 * SR)
    x = np.arange(n) / SR
    f = rng.uniform(1500.0, 2100.0)
    s = np.sin(2 * np.pi * f * x) * np.exp(-x / 0.0045)
    s += 0.35 * np.sin(2 * np.pi * f * 2.7 * x) * np.exp(-x / 0.0025)
    m = int(0.0012 * SR)
    s[:m] += noise(0.0012, curve=20)[:m] * 0.30
    pk = np.max(np.abs(s)) or 1
    s = s / pk
    pan = rng.uniform(-0.4, 0.4)
    place(L, t0, s, gain, pan); place(R, t0, s, gain, pan)
def add_chime(t0, gain=0.3):
    for f, g, pn in ((659.25, 1.0, -0.2), (987.77, 0.7, 0.2), (1318.5, 0.4, 0.0)):
        s = tone(f, 1.1, ((1, 1), (2, 0.25), (3, 0.08)), a=0.003, d=1.0, curve=2.4)
        place(L, t0, s, gain * g, pn); place(R, t0, s, gain * g, pn)

def add_error(t0, gain=0.4):
    n = int(0.5 * SR)
    x = np.arange(n) / SR
    s = (np.sin(2 * np.pi * 138 * x) + 0.6 * np.sin(2 * np.pi * 104 * x)) * np.exp(-x / 0.18)
    s = lp(s, 700)
    place(L, t0, s, gain); place(R, t0, s, gain)

# scene transitions
for tt in (5.6, 10.3, 15.2, 26.6, 37.6, 41.2, 45.6, 47.6, 49.6, 51.6, 53.6):
    add_whoosh(tt, 0.26)
add_riser(10.5, 1.1, 0.26)
add_impact(11.4, 0.42)
add_riser(13.6, 2.4, 0.28)
add_impact(16.0, 0.75)
add_riser(44.0, 2.0, 0.22)
add_impact(46.0, 0.5)
add_chime(54.2, 0.26)

# S1 typing + errors (matches ROWS in main.js)
tt = 0.80
while tt < 2.55:
    add_type(tt, 0.11); tt += rng.uniform(0.045, 0.085)
add_error(2.78, 0.42)
tt = 3.15
while tt < 4.30:
    add_type(tt, 0.10); tt += rng.uniform(0.05, 0.09)
add_error(4.42, 0.34)

# S4 command rows streaming in, search typing, click
for i in range(30):
    add_tick(17.0 + i * 0.127, 0.075, pan=rng.uniform(-0.6, -0.2))
for i in range(5):
    add_type(20.8 + i * 0.14, 0.12)
add_click(22.1, 0.3, pan=-0.15)
add_whoosh(24.2, 0.16)

# S5 steps, run, results
for i in range(3):
    add_click(28.5 + i * 0.62, 0.24, pan=0.3)
for i in range(26):
    add_tick(30.2 + i * 0.05, 0.05, pan=0.45)
add_click(32.0, 0.34, pan=0.2)
for i in range(8):
    add_tick(33.25 + i * 0.26, 0.07, pan=0.35)
add_chime(33.15, 0.20)
add_click(35.6, 0.24, pan=0.1)          # 比对热图 preset
add_click(36.02, 0.30, pan=0.2)         # run
add_chime(36.4, 0.16)
for i in range(8):
    add_tick(36.6 + i * 0.1, 0.06, pan=0.4)

# S6 copy → paste (instant) → enter → output streams
add_click(41.2, 0.3, pan=0.1)
add_click(41.75, 0.26, pan=0.15, hi=1800)
add_impact(42.15, 0.30)
for i in range(10):
    add_tick(42.5 + i * 0.11, 0.07, pan=rng.uniform(0.1, 0.5))
add_chime(43.9, 0.18)

# S7 card hits
for i in range(4):
    add_impact(46.0 + i * 2.0, 0.30)
    add_click(46.1 + i * 2.0, 0.14, pan=rng.uniform(-0.5, 0.5))

# ------------------------------------------------------------------ mix
def soft_limit(x, thr=0.72):
    return np.tanh(x / thr) * thr

# gentle bus compression via moving RMS
def bus(x, thr=0.34, ratio=2.4):
    over = np.abs(x) > thr
    y = x.copy()
    y[over] = np.sign(x[over]) * (thr + (np.abs(x[over]) - thr) / ratio)
    return y

mixL, mixR = L, R
# master EQ: slight high shelf lift + low cut below 32
mixL = hp(mixL, 30, 1); mixR = hp(mixR, 30, 1)
# stereo width trim on lows
lowL = lp(L, 140); lowR = lp(R, 140)
midL = mixL - lowL; midR = mixR - lowR
mixL = (lowL + lowR) * 0.5 + midL * 1.0
mixR = (lowL + lowR) * 0.5 + midR * 1.0

# fades: 0.6s in, tail out
fade_in = np.minimum(1, t / 0.6)
fade_out = np.clip((DUR - t) / 1.6, 0, 1) ** 1.5
mixL *= fade_in * fade_out; mixR *= fade_in * fade_out

mixL = bus(mixL); mixR = bus(mixR)
peak = max(np.max(np.abs(mixL)), np.max(np.abs(mixR))) or 1
# target ~-17 LUFS integrated: leave the limiter out of the way so the arc still breathes
gain = 0.55 / peak
mixL *= gain; mixR *= gain
mixL = soft_limit(mixL); mixR = soft_limit(mixR)

import wave
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mix.wav')
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    data = np.empty(2 * N, np.int16)
    data[0::2] = np.round(mixL * 32767).astype(np.int16)
    data[1::2] = np.round(mixR * 32767).astype(np.int16)
    w.writeframes(data.tobytes())

rms = float(np.sqrt(np.mean(mixL ** 2 + mixR ** 2) / 2))
print(f'wrote {out}  duration={N / SR:.2f}s  peak={peak * gain:.3f}  rms={rms:.3f}')
