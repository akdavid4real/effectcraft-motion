#!/usr/bin/env python3
"""Single source of truth for timing: timeline.json + audio_meta.json.

  timeline.py words   [project_dir]   print every spoken word with its ABSOLUTE time
  timeline.py check   [project_dir]   validate the plan (voice overlaps, spill-over, gaps) -> exit 1 on FAIL
  timeline.py emit    [project_dir]   write scripts/timing.jsx (T, used by SC()/W() in lib.jsx) + scripts/wipes.jsx
  timeline.py mix     [project_dir]   mix soundtrack.wav (voice + word-anchored SFX + ducked music)
  timeline.py suggest [project_dir]   propose scene in/out + voice offsets from the voice durations
  timeline.py beats   [project_dir]   find the music's tempo, beats, bar starts and drop -> beats.json
  timeline.py snap    [project_dir]   move scene cuts onto the nearest beat where the voice timing still fits

project_dir defaults to the current directory. See SKILL.md for the timeline.json format.
"""
import json
import os
import re
import subprocess
import sys

WIPE_LEAD = 0.42  # wipe() fully covers the frame 0.42 s after it starts


def load(pdir):
    tl = json.load(open(os.path.join(pdir, "timeline.json")))
    meta_path = os.path.join(pdir, tl.get("audio_meta", "audio_meta.json"))
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {"voices": []}
    voices = {}
    for v in meta.get("voices", []):
        p = v.get("path") or v.get("file")
        words = []
        for w in v.get("words", []):
            text = w.get("word", w.get("text", ""))
            start = w.get("start", w.get("start_s"))
            end = w.get("end", w.get("end_s", start))
            if start is None:
                continue
            words.append((text, float(start), float(end)))
        dur = v.get("duration_s") or probe(os.path.join(pdir, p))
        voices[v["id"]] = {"path": p, "dur": float(dur), "words": words}
    return tl, voices


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                         capture_output=True, text=True)
    return float(out.stdout.strip() or 0)


def norm(word):
    return re.sub(r"[^a-z0-9%.]", "", word.lower()).strip(".")


def scenes(tl):
    return tl["scenes"]


def voice_at(sc):
    return sc.get("voice_at")


def abs_words(tl, voices):
    """{scene_voice_id: [(norm_word, abs_start, abs_end, raw)]}"""
    out = {}
    for sc in scenes(tl):
        vid = sc.get("voice")
        if not vid or vid not in voices:
            continue
        at = float(sc["voice_at"])
        out[vid] = [(norm(t), round(at + s, 3), round(at + e, 3), t) for t, s, e in voices[vid]["words"]]
    return out


def load_beats(pdir):
    """beats.json (from `timeline.py beats`), times already on the timeline; None when there is none."""
    path = os.path.join(pdir, "beats.json")
    return json.load(open(path)) if os.path.exists(path) else None


def nearest_beat(t, grid):
    return min(grid, key=lambda b: abs(b - t)) if grid else None


def resolve_at(spec, tl, voices, words, beats=None):
    """SFX 'at': number | 'sID:word' | 'sID:word#2' | 'wipe:sID' (wipe into scene) | 'in:sID' | 'out:sID'
    | 'beat:N' / 'downbeat:N' (1-based, needs beats.json) | 'drop'."""
    if isinstance(spec, (int, float)):
        return float(spec)
    if spec in ("drop",) or spec.startswith(("beat:", "downbeat:")):
        if not beats:
            raise SystemExit(f"FAIL sfx anchor '{spec}': no beats.json, run timeline.py beats first")
        if spec == "drop":
            if beats.get("drop") is None:
                raise SystemExit("FAIL sfx anchor 'drop': no clear drop found in the music")
            return float(beats["drop"])
        kind, _, n = spec.partition(":")
        grid = beats["beats"] if kind == "beat" else beats["downbeats"]
        if not 1 <= int(n) <= len(grid):
            raise SystemExit(f"FAIL sfx anchor '{spec}': the music has {len(grid)} {kind}s on the timeline")
        return float(grid[int(n) - 1])
    kind, _, rest = spec.partition(":")
    sc_by_id = {s["id"]: s for s in scenes(tl)}
    if kind in ("wipe", "in", "out"):
        s = sc_by_id[rest]
        return float(s["in"]) - WIPE_LEAD if kind == "wipe" else float(s[kind])
    vid = kind
    for s in scenes(tl):
        if s["id"] == kind:
            vid = s.get("voice", kind)
    word, _, nth = rest.partition("#")
    nth = int(nth or 1)
    hits = [w for w in words.get(vid, []) if w[0] == norm(word)]
    if len(hits) < nth:
        raise SystemExit(f"FAIL sfx anchor '{spec}': word not found in voice {vid}")
    return hits[nth - 1][1]


def sfx_peak(path, limit=None):
    """Seconds from the start of a sound file to its loudest moment (within `limit` s, the cue's "max")."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "8000", "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    import numpy as np
    samples = np.abs(np.frombuffer(raw, np.int16).astype(np.float32))
    if limit:
        samples = samples[:int(float(limit) * 8000)]
    if not len(samples):
        return 0.0
    # loudest 10 ms block, not the loudest single sample
    blocks = samples[:len(samples) // 80 * 80].reshape(-1, 80).mean(axis=1)
    return float(np.argmax(blocks)) * 0.01


def sfx_time(cue, tl, voices, words, beats, pdir):
    """When a cue's file starts playing. With "align": "peak" its loudest moment lands on the anchor instead of
    its first sample (impacts, booms, pops often have a short lead-in before the hit)."""
    t = resolve_at(cue["at"], tl, voices, words, beats) + float(cue.get("offset", 0))
    if cue.get("align") == "peak":
        t -= sfx_peak(sfx_path(cue, pdir), cue.get("max"))
    return t


def sfx_path(cue, pdir):
    f = os.path.join(pdir, "assets", "sfx", cue["file"] + ".mp3")
    return f if os.path.exists(f) else os.path.join(pdir, cue["file"])


def cmd_words(pdir):
    tl, voices = load(pdir)
    for vid, ws in abs_words(tl, voices).items():
        print(f"{vid}: " + "  ".join(f"{raw}@{s:.2f}" for _, s, _, raw in ws))


def letters(text):
    return re.sub(r"[^a-z0-9]", "", text.lower())


def voice_vs_script(pdir, tl, voices):
    """Compare what each voice line really says (its transcript) with the script in audio_request.json.
    Seen on a brand film: the script said "BridgeAxis Technologies", the voice said (and two transcription models
    heard) "Bridge Access Technologies", and nobody noticed because the transcript was never read."""
    path = os.path.join(pdir, "audio_request.json")
    if not os.path.exists(path):
        return []
    script = {line["id"]: line.get("text", "") for line in json.load(open(path)).get("lines", [])}
    brand = tl.get("brand", {})
    terms = [t for t in [brand.get("name", "")] + brand.get("words", []) if t]
    warns = []
    for vid, text in script.items():
        if vid not in voices or not voices[vid]["words"]:
            continue
        heard = " ".join(w[0] for w in voices[vid]["words"])
        for term in terms:
            if letters(term) and letters(term) in letters(text) and letters(term) not in letters(heard):
                warns.append(f"voice {vid}: the script says '{term}' but the voice was heard as \"{heard}\". "
                             "Listen to it: if the voice mispronounces the name, spell it the way it should sound "
                             "in the TTS text (e.g. 'Bridge Axis') and regenerate the line")
        said = [letters(w) for w in text.split() if letters(w)]
        got = set(letters(w[0]) for w in voices[vid]["words"])
        if said and sum(1 for w in said if w in got) / len(said) < 0.75:
            warns.append(f"voice {vid}: only part of the script is in the transcript (script: \"{text}\", "
                         f"heard: \"{heard}\"). Listen to the line before building on it")
    return warns


def cmd_check(pdir):
    tl, voices = load(pdir)
    dur = float(tl["duration"])
    gap_min = float(tl.get("voice_gap_min", 0.35))
    fails, warns = [], []
    sc = scenes(tl)
    words = abs_words(tl, voices)
    # scenes contiguous and covering the whole piece
    if abs(float(sc[0]["in"])) > 0.001:
        fails.append(f"first scene must start at 0 (got {sc[0]['in']})")
    for a, b in zip(sc, sc[1:]):
        if abs(float(a["out"]) - float(b["in"])) > 0.001:
            fails.append(f"{a['id']}.out {a['out']} != {b['id']}.in {b['in']} (scenes must be contiguous)")
    if abs(float(sc[-1]["out"]) - dur) > 0.001:
        fails.append(f"last scene must end at duration {dur} (got {sc[-1]['out']})")
    # A plan without voice placement checks nothing: refuse to pass it.
    placed = [s for s in sc if s.get("voice") and s.get("voice_at") is not None]
    if voices and not placed:
        fails.append("audio_meta.json has voice lines but no scene has \"voice\" + \"voice_at\": copy the REAL voice "
                     "start times into timeline.json (even if the project mixes audio with its own script), "
                     "otherwise overlaps and spill-over cannot be checked")
    elif voices:
        missing = [v for v in voices if v not in {s.get("voice") for s in placed}]
        if missing:
            warns.append(f"voice lines not placed in any scene: {', '.join(missing)}")
    prev_end, prev_id = None, None
    for s in sc:
        vid = s.get("voice")
        if not vid:
            continue
        if vid not in voices:
            fails.append(f"{s['id']}: voice '{vid}' missing from audio_meta.json")
            continue
        at = float(s["voice_at"])
        v = voices[vid]
        ws = words.get(vid, [])
        speech_end = ws[-1][2] if ws else at + v["dur"]
        clip_end = at + v["dur"]
        if at < float(s["in"]) + 0.25:
            fails.append(f"{s['id']}: voice starts {at:.2f}s, only {at - float(s['in']):.2f}s after the scene cut (need >= 0.25)")
        if speech_end > float(s["out"]) - 0.2:
            fails.append(f"{s['id']}: last word ends {speech_end:.2f}s but the scene cuts at {s['out']} "
                         f"(words spill into the next scene; need speech_end <= out - 0.2)")
        if prev_end is not None and at < prev_end + gap_min:
            fails.append(f"VOICE OVERLAP/CRAMP: {vid} starts {at:.2f}s but {prev_id} clip ends {prev_end:.2f}s "
                         f"(need a gap of >= {gap_min}s)")
        prev_end, prev_id = clip_end, vid
        if not ws:
            warns.append(f"{vid}: no word timestamps; W() and word-anchored SFX will not work")
        s_len = float(s["out"]) - float(s["in"])
        if s_len < 3.5:
            warns.append(f"{s['id']}: scene only {s_len:.1f}s long (viewers need ~3.5s+ to read a scene)")
    if prev_end is not None and prev_end > dur - 2.0:
        warns.append(f"voice ends {prev_end:.2f}s; leave >= 2s for the end card to breathe")
    if prev_end is not None and dur - prev_end > 8.0:
        warns.append(f"voice ends {prev_end:.2f}s; {dur - prev_end:.1f}s of silence before the end - consider a longer last line")
    beats = load_beats(pdir)
    for cue in tl.get("sfx", []):
        try:
            t = sfx_time(cue, tl, voices, words, beats, pdir)
            if not (0 <= t < dur):
                fails.append(f"sfx {cue['file']} at {t:.2f}s is outside 0..{dur}")
            if not os.path.exists(os.path.join(pdir, "assets", "sfx", cue["file"] + ".mp3")) and not os.path.exists(os.path.join(pdir, cue["file"])):
                fails.append(f"sfx file missing: assets/sfx/{cue['file']}.mp3")
        except SystemExit as e:
            fails.append(str(e).replace("FAIL ", ""))
    # Brand facts: ec.py qa checks the film against these (exact tagline, real logo, no invented names).
    brand = tl.get("brand")
    if not brand:
        warns.append("no \"brand\" block: add name, tagline (exactly as the client writes it), logo files and "
                     "the approved on-screen words, so `ec.py qa` can check brand fidelity (references/brand.md)")
    else:
        for key in ("name", "tagline", "logo"):
            if not brand.get(key):
                warns.append(f"brand.{key} is empty")
        for logo in brand.get("logo", []):
            if not os.path.exists(os.path.join(pdir, logo)):
                fails.append(f"brand logo file missing: {logo}")
        accent_scenes = [s["id"] for s in sc if s.get("bg") == "accent"]
        if len(accent_scenes) > 2:
            warns.append(f"{len(accent_scenes)} accent scenes ({', '.join(accent_scenes)}): keep the accent "
                         "background for 1-2 big moments, or it stops being an accent")
    warns += voice_vs_script(pdir, tl, voices)
    if beats and tl.get("music"):
        off = []
        for a in sc[1:]:
            b = nearest_beat(float(a["in"]), beats["beats"])
            if b is not None and abs(b - float(a["in"])) > 0.12:
                off.append(f"{a['id']} {float(a['in']):.2f}s (beat at {b:.2f}s)")
        if off:
            warns.append(f"{len(off)} scene cut(s) off the beat: {', '.join(off)}. "
                         "`timeline.py snap` moves them onto the beat where the voice timing allows")
    for w in warns:
        print("WARN", w)
    for f in fails:
        print("FAIL", f)
    print(f"timeline check: {len(fails)} fail, {len(warns)} warn")
    sys.exit(1 if fails else 0)


def cmd_emit(pdir):
    tl, voices = load(pdir)
    words = abs_words(tl, voices)
    sc = {s["id"]: {"in": s["in"], "out": s["out"], "voiceAt": s.get("voice_at"), "bg": s.get("bg", "light")} for s in scenes(tl)}
    wipes = []
    lst = scenes(tl)
    for s in lst[1:]:
        wipes.append({"t": round(float(s["in"]) - WIPE_LEAD, 3), "into": s["id"], "bg": s.get("bg", "light")})
    T = {"scenes": sc, "words": {vid: [[w[0], w[1]] for w in ws] for vid, ws in words.items()}, "wipes": wipes,
         "duration": tl["duration"]}
    beats = load_beats(pdir)
    if beats:  # BEAT(n), DOWNBEAT(n), nearBeat(t) and T.drop in scene scripts (templates/kit.jsx)
        T.update({"bpm": beats["bpm"], "beats": beats["beats"], "downbeats": beats["downbeats"], "drop": beats["drop"]})
    os.makedirs(os.path.join(pdir, "scripts"), exist_ok=True)
    with open(os.path.join(pdir, "scripts", "timing.jsx"), "w") as f:
        f.write("// GENERATED by timeline.py emit - do not edit by hand.\n")
        f.write("var T = " + json.dumps(T, indent=1) + ";\n")
    wp = os.path.join(pdir, "scripts", "wipes.jsx")
    if os.path.exists(wp) and "GENERATED by timeline.py" not in open(wp).read():
        print("kept your custom scripts/wipes.jsx (no GENERATED marker); timing.jsx T.wipes still updated")
        wipes_written = False
    else:
        wipes_written = True
    with open(wp if wipes_written else os.devnull, "w") as f:
        f.write("// GENERATED by timeline.py emit. Run LAST (after every scene rebuild) so wipes stay on top.\n")
        f.write("var c = comp();\n")
        f.write("for (var i = c.numLayers; i >= 1; i--) if (/^wipe/i.test(c.layer(i).name)) c.layer(i).remove();\n")
        f.write("// a look's own transition (lookCut) when one is applied, else the kit's two-tone wipe\n")
        f.write("for (var k = 0; k < T.wipes.length; k++) { var w_ = T.wipes[k];\n"
                "  if (typeof lookCut == 'function') lookCut(c, w_.t, w_.bg); else wipe(c, w_.t, bgColor(w_.bg)); }\n")
        f.write("c.numLayers;\n")
    print(f"wrote scripts/timing.jsx ({len(sc)} scenes, {sum(len(v) for v in words.values())} words) " + (f"and scripts/wipes.jsx ({len(wipes)} wipes)" if wipes_written else f"({len(wipes)} cuts in T.wipes)"))


def cmd_suggest(pdir):
    """Pack scenes around the voice lines: lead-in 0.5s, tail 0.8s, scene >= min_scene. With beats.json, every scene
    ends on a beat, so the cuts land on the music (run `timeline.py beats` before `suggest`)."""
    tl, voices = load(pdir)
    dur = float(tl["duration"])
    beats = load_beats(pdir)
    t = 0.0
    out = []
    lst = scenes(tl)
    for i, s in enumerate(lst):
        vid = s.get("voice")
        v = voices.get(vid)
        speak = (v["words"][-1][2] if v and v["words"] else (v["dur"] if v else 3.0))
        lead = 0.8 if i == 0 else 0.5
        length = max(float(s.get("min_len", 4.5)), lead + speak + 0.9)
        end = t + length
        if beats:  # plan the cuts ON the beat: end each scene on the first beat after it has had enough time
            later = [b for b in beats["beats"] if b >= end]
            end = later[0] if later else end
        out.append({"id": s["id"], "in": round(t, 2), "out": round(end, 2), "voice": vid, "voice_at": round(t + lead, 2)})
        t = end
    spare = dur - t
    print(f"total planned {t:.2f}s of {dur}s ({'+' if spare >= 0 else ''}{spare:.2f}s spare -> "
          f"{'add to the end card / hero beats' if spare >= 0 else 'TOO LONG: shorten lines or raise duration'})")
    print(json.dumps(out, indent=1))


def cmd_mix(pdir):
    tl, voices = load(pdir)
    words = abs_words(tl, voices)
    dur = float(tl["duration"])
    mixcfg = tl.get("mix", {})
    vvol = float(mixcfg.get("voice_volume", 1.6))
    args = ["ffmpeg", "-y", "-v", "error"]
    fc, n, vl = [], 0, []
    for s in scenes(tl):
        vid = s.get("voice")
        if not vid or vid not in voices:
            continue
        args += ["-i", os.path.join(pdir, voices[vid]["path"])]
        ms = int(float(s["voice_at"]) * 1000)
        fc.append(f"[{n}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={ms}|{ms},volume={vvol}[v{n}]")
        vl.append(f"[v{n}]")
        n += 1
    music = tl.get("music")
    split = ",asplit=2[vo][vokey]" if music else "[vo]"  # the key feeds the music ducker only
    fc.append("".join(vl) + f"amix=inputs={len(vl)}:normalize=0,apad=whole_dur={dur},atrim=0:{dur}{split}")
    xl = []
    beats = load_beats(pdir)
    for cue in tl.get("sfx", []):
        t = sfx_time(cue, tl, voices, words, beats, pdir)
        args += ["-i", sfx_path(cue, pdir)]
        ms = int(max(0, t) * 1000)
        mx = cue.get("max")
        trim = f"atrim=0:{mx},afade=t=out:st={float(mx) - 0.3}:d=0.3," if mx else ""
        fc.append(f"[{n}:a]aresample=48000,aformat=channel_layouts=stereo,{trim}adelay={ms}|{ms},volume={cue.get('vol', 0.35)}[x{n}]")
        xl.append(f"[x{n}]")
        n += 1
    parts = ["[vo]"]
    if xl:
        fc.append("".join(xl) + f"amix=inputs={len(xl)}:normalize=0[fx]")
        parts.append("[fx]")
    if music:
        args += ["-i", os.path.join(pdir, music["file"])]
        st = float(music.get("start", 0))
        fc.append(f"[{n}:a]aresample=48000,aformat=channel_layouts=stereo,atrim={st}:{st + dur},asetpts=PTS-STARTPTS,"
                  f"volume={music.get('vol', 0.5)},afade=t=in:st=0:d=1.0,afade=t=out:st={dur - 3.5}:d=3.5[bgm0]")
        fc.append("[bgm0][vokey]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[bgm]")
        parts.append("[bgm]")
    fc.append("".join(parts) + f"amix=inputs={len(parts)}:normalize=0,alimiter=limit=0.95,atrim=0:{dur},"
              f"loudnorm=I={mixcfg.get('lufs', -14)}:TP=-1.5:LRA=11[out]")
    out = os.path.join(pdir, "soundtrack.wav")
    args += ["-filter_complex", ";".join(fc), "-map", "[out]", "-ar", "48000", "-c:a", "pcm_s16le", out]
    subprocess.run(args, check=True)
    print(f"mixed {out}: {len(vl)} voice lines, {len(xl)} sfx, music={'yes' if music else 'no'}")
    for cue in tl.get("sfx", []):
        t = sfx_time(cue, tl, voices, words, beats, pdir)
        peak = "  peak-aligned" if cue.get("align") == "peak" else ""
        print(f"  {t:6.2f}s  {cue['file']}  ({cue['at']}){peak}")


def cmd_beats(pdir):
    """Analyse the music bed: tempo, beats, bar starts, drop -> beats.json in TIMELINE time (music "start" applied)."""
    import beats as beat_analysis
    tl, _ = load(pdir)
    music = tl.get("music")
    if not music:
        raise SystemExit('no "music" in timeline.json')
    found = beat_analysis.analyse(os.path.join(pdir, music["file"]))
    start, dur = float(music.get("start", 0)), float(tl["duration"])
    on_timeline = lambda times: [round(t - start, 3) for t in times if 0 <= t - start <= dur]
    out = {"source": music["file"], "bpm": found["bpm"], "beats": on_timeline(found["beats"]),
           "downbeats": on_timeline(found["downbeats"]),
           "drop": round(found["drop"] - start, 3) if found["drop"] is not None and 0 <= found["drop"] - start <= dur else None}
    json.dump(out, open(os.path.join(pdir, "beats.json"), "w"), indent=1)
    print(f"beats.json: {out['bpm']} BPM, {len(out['beats'])} beats and {len(out['downbeats'])} bar starts on the timeline, "
          f"drop {out['drop'] if out['drop'] is not None else 'none found'}")
    print("scene cuts vs the nearest beat:")
    for a in scenes(tl)[1:]:
        b = nearest_beat(float(a["in"]), out["beats"])
        print(f"  {a['id']:4s} {float(a['in']):6.2f}s  nearest beat {b:6.2f}s  ({b - float(a['in']):+.2f}s)")
    print("Next: timeline.py snap (cuts onto beats), then check / emit / mix. In scenes: BEAT(n), DOWNBEAT(n), nearBeat(t).")


def cmd_snap(pdir):
    """Move each scene cut to the nearest beat (within 0.4 s) when the voice rules still hold on both sides:
    the previous scene's last word ends >= 0.2 s before the cut, the next voice starts >= 0.25 s after it."""
    tl, voices = load(pdir)
    beats = load_beats(pdir)
    if not beats:
        raise SystemExit("no beats.json: run timeline.py beats first")
    words = abs_words(tl, voices)
    sc = scenes(tl)
    moved = []
    for i in range(1, len(sc)):
        prev, cur = sc[i - 1], sc[i]
        cut = float(cur["in"])
        b = nearest_beat(cut, beats["beats"])
        if b is None or abs(b - cut) < 0.02 or abs(b - cut) > 0.4:
            continue
        prev_words = words.get(prev.get("voice"), [])
        speech_end = prev_words[-1][2] if prev_words else float(prev["in"])
        next_at = float(cur["voice_at"]) if cur.get("voice_at") is not None else b + 1
        if b >= speech_end + 0.2 and b <= next_at - 0.25 and b - float(prev["in"]) >= 1.0:
            prev["out"] = cur["in"] = round(b, 3)
            moved.append(f"{cur['id']} {cut:.2f} -> {b:.2f}s")
    json.dump(tl, open(os.path.join(pdir, "timeline.json"), "w"), indent=2)
    print(f"snapped {len(moved)} cut(s) onto the beat" + (": " + ", ".join(moved) if moved else ""))
    print("Next: timeline.py check, emit, mix (and rebuild the scenes).")


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ("words", "check", "emit", "mix", "suggest", "beats", "snap"):
        print(__doc__)
        sys.exit(2)
    pdir = sys.argv[2] if len(sys.argv) > 2 else "."
    {"words": cmd_words, "check": cmd_check, "emit": cmd_emit, "mix": cmd_mix, "suggest": cmd_suggest,
     "beats": cmd_beats, "snap": cmd_snap}[sys.argv[1]](pdir)
