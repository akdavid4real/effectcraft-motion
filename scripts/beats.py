"""Beat grid of a music track: tempo, every beat, the downbeats (bar starts) and the drop. numpy + ffmpeg only.

Used by `timeline.py beats`. The method is the classic one (Ellis 2007, as in librosa's beat tracker):
  1. onset strength: how much the spectrum rises from one 23 ms frame to the next (kicks, snares, chords)
  2. tempo: the period at which that onset curve repeats best (autocorrelation), preferring ~120 BPM
  3. beats: dynamic programming picks the onset peaks that are strong AND about one period apart
  4. downbeats: of the four possible bar phases, the one whose beats carry the most bass energy
  5. drop: the bar start where the loudness jumps most compared with the two bars before it
"""
import subprocess

import numpy as np

SR = 22050
HOP = 512  # 23 ms per onset frame
WIN = 2048


def load_audio(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)


def onset_strength(y):
    """Spectral flux per frame (all frequencies) and bass energy per frame (under 150 Hz, where the kick lives)."""
    frames = 1 + (len(y) - WIN) // HOP
    window = np.hanning(WIN).astype(np.float32)
    index = np.arange(WIN)[None, :] + HOP * np.arange(frames)[:, None]
    magnitude = np.abs(np.fft.rfft(y[index] * window, axis=1))
    rise = np.maximum(0, np.diff(np.log1p(100 * magnitude), axis=0))
    bass_bins = int(150 * WIN / SR) + 1
    flux = np.concatenate([[0], rise.sum(axis=1)])
    # bass ENERGY on a linear scale: the log scale above flattens the difference between a bar's accented
    # kick and the softer ones, which is exactly what finds the bar start
    bass = (magnitude[:, :bass_bins] ** 2).sum(axis=1)
    flux = flux - np.convolve(flux, np.ones(16) / 16, mode="same")  # remove the slow loudness trend
    flux = np.maximum(flux, 0)
    # unit scale, so the tempo penalty in track_beats means the same for quiet and loud tracks
    # (unscaled, loud hi-hats on the off-beats out-scored the penalty and became extra beats)
    return flux / (flux.std() or 1), bass


def estimate_period(env):
    """Beat period in frames: the best autocorrelation between 70 and 180 BPM, weighted towards 120 BPM.

    Searched on a 0.05-frame grid: a beat period is rarely a whole number of frames, and the autocorrelation peak
    is sharp, so whole-frame lags missed the true tempo (140 BPM = 18.5 frames lost to 93 BPM at 27.7)."""
    fps = SR / HOP
    env = env - env.mean()
    corr = np.correlate(env, env, mode="full")[len(env) - 1:]
    lags = np.arange(len(corr))
    grid = np.arange(fps * 60 / 180, fps * 60 / 70, 0.05)
    bpm = 60 * fps / grid
    prior = np.exp(-0.5 * (np.log2(bpm / 120) / 0.9) ** 2)
    # A true beat period also lines up at 2 and 4 periods (half bar, bar); off-beat hi-hats otherwise win at 1.5x.
    harmonics = (np.interp(grid, lags, corr) + 0.5 * np.interp(2 * grid, lags, corr)
                 + 0.25 * np.interp(4 * grid, lags, corr))
    return float(grid[int(np.argmax(harmonics * prior))])


def track_beats(env, period, tightness=100):
    """Frame index of every beat: dynamic programming over onset strength with a penalty for off-tempo gaps."""
    n = len(env)
    score = env.astype(float).copy()
    back = np.full(n, -1)
    lo, hi = int(round(period / 2)), int(round(period * 2))
    for t in range(n):
        start, stop = max(0, t - hi), t - lo
        if stop <= start:
            continue
        prev = np.arange(start, stop)
        penalty = -tightness * np.log((t - prev) / period) ** 2
        candidates = score[prev] + penalty
        best = int(np.argmax(candidates))
        score[t] += candidates[best]
        back[t] = prev[best]
    # end on the best-scoring frame in the last period, then walk back
    t = int(np.argmax(score[max(0, n - int(period)):])) + max(0, n - int(period))
    beats = []
    while t >= 0:
        beats.append(t)
        t = back[t]
    return np.array(beats[::-1])


def analyse(path):
    """{bpm, beats, downbeats, drop, bar_energy} with times in seconds from the start of the file."""
    y = load_audio(path)
    env, bass = onset_strength(y)
    fps = SR / HOP
    period = estimate_period(env)
    frames = track_beats(env, period)
    # no beats in the silence before the music starts or after it ends
    loud = np.nonzero(env > 0.5)[0]
    if len(loud):
        frames = frames[(frames >= loud[0] - period * 0.25) & (frames <= loud[-1] + period * 0.25)]
    # a frame's time is the centre of its analysis window, not its start (else every beat is ~46 ms early)
    times = (frames * HOP + WIN / 2) / SR + 0.02  # +20 ms measured on click tracks of known tempo
    # bass at each beat = the strongest bass energy within 2 frames of it (the kick's peak can be a frame off)
    near = np.array([bass[max(0, f - 2):f + 3].max() for f in frames])
    phase = int(np.argmax([near[p::4].sum() for p in range(4)]))
    downbeats = times[phase::4]
    # loudness per bar, and the drop: the biggest jump against the two bars before (ignoring the first 2 s)
    rms = []
    for a, b in zip(downbeats, list(downbeats[1:]) + [len(y) / SR]):
        chunk = y[int(a * SR):int(b * SR)]
        rms.append(float(np.sqrt(np.mean(chunk ** 2))) if len(chunk) else 0.0)
    drop = None
    best_jump = 1.0
    for i in range(2, len(rms)):
        before = (rms[i - 1] + rms[i - 2]) / 2
        if downbeats[i] > 2.0 and before > 0 and rms[i] / before > best_jump:
            best_jump, drop = rms[i] / before, float(downbeats[i])
    return {
        "bpm": round(60 * fps / period, 1),
        "beats": [round(float(t), 3) for t in times],
        "downbeats": [round(float(t), 3) for t in downbeats],
        "drop": round(drop, 3) if drop is not None and best_jump > 1.4 else None,
        "bar_energy": [round(r, 4) for r in rms],
    }
