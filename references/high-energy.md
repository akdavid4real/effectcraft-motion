# High-energy style (hyper-kinetic TikTok / Reels ads)

The calm editorial workflow in SKILL.md makes brand films. This page is for the other kind:
fast, loud, word-by-word ads like the "Higgsfield Katana" TikTok, where every spoken phrase
slams onto the screen. Tested end to end on `~/Videos/akdavid-hype` (24 s, 1080×1920):
0 fail in every QA gate, rendered in about 8 minutes on the i7-7600U laptop.

## What makes it read as "high energy"

- **One phrase per scene, 1.5–3 s each.** Set `"min_read": 0.5` in timeline.json; the last word of a scene
  still needs 0.5 s fully on screen before the transition covers it. `timeline.py check` warns "scene only 1.6s long":
  that warning is expected in this style. Keep `voice_gap_min` and the spill-over rules.
- **Every word lands on its spoken time** (`W()`), as giant condensed caps (the `poster` look,
  Anton), stacked and centred. The "100% centred" QA warning is expected here.
- **The first element of every scene lands on the cut** (`S["in"] + 0.04`), slightly ahead of the
  voice. A scene that opens on 0.4 s of empty background feels dead in this style.
  The very first frame becomes the TikTok thumbnail: put the first word there.
- **Real motion blur on every move.** `c.motionBlur = true` on the comp and `l.motionBlur = true`
  on each moving layer (the helpers do this). It is what makes slams look filmed, not slid.
- **The frame itself moves:** a slow push-in over each scene plus a short zoom kick on each
  impact word. Scenes are parented to two centred nulls (`hyperStart()`), see below.
- **A drawn object for each offer:** browser window for "website", phone with popping app tiles
  for "app", dashboard with growing bars for "web app", a dot burst for "pop", people struck
  through for "juggling five people". Name their layers "VIS" so QA counts the scene as visual.
- **Colour rhythm:** dark / light alternate, one accent-colour scene at the peak. The look's
  transition (a colour block shooting up) on every cut.

## Build steps

1. Copy `templates/lib.jsx` + `reset.jsx`, set `COMP`, and for vertical `W_ = 1080, H_ = 1920`,
   `X0 = 90`. Append `templates/hyper.jsx` to `scripts/lib.jsx`.
2. `ec.py look poster --accent HEX` (red FF2D2D on near-black worked well).
3. Script: 8 short lines, about 45 words for 24 s. Questions and one-word punches work best.
4. Voice: Kokoro male `am_michael` at `-s 1.08` sounds like a hype ad
   (`HYPERFRAMES_PYTHON=~/.venvs/kokoro/bin/python`). Better and still free: Microsoft's
   `en-GB-RyanNeural` through edge-tts (`~/.local/bin/edge-tts --voice en-GB-RyanNeural --rate=+8%`),
   which the client preferred; trim its leading/trailing silence. Word timestamps: Groq
   (`~/.config/groq/api_key`, model **`whisper-large-v3`**, not turbo: turbo skips words) or Parakeet.
   Then READ the transcript: `timeline.py check` warns when the voice doesn't say a brand word.
5. Music + SFX: the media-use engine with `--only bgm,sfx`. Query for the bed, e.g.
   "high energy hype trap beat with bass drops, modern tech promo". Useful SFX names: bass impact,
   glitch, fast whoosh, phone pop, digital glitch, camera shutter, record scratch, boom, riser,
   typing, cinematic boom, sparkle.
6. SFX cues: a whoosh on every `wipe:sN`, an impact on each scene's key word, a riser that ends
   on the name, a big boom on the name. Trim long files with `"max"` (typing is 44 s!).
   Music louder than in a brand film: `"music": {"vol": 0.85}`, `"voice_volume": 1.7`.
7. Write each scene with `hyperStart(sid)` + `heroText()` + `slam / whipIn / riseIn / punches /
   flash` (see `examples/hyper-scene-s2.jsx`). Then QA, frames, sheet, render as usual.

## The helpers (templates/hyper.jsx)

| Helper | What it does |
|---|---|
| `hyperStart(sid)` | Creates the comp on first use, turns motion blur on, adds the background and the push/hit nulls. Returns `{c, S, pal, L, hit}` |
| `heroText(c, str, size, color, y, opts)` | Giant centred word, shrunk to fit the width, anchored at its centre so it scales in place |
| `slam(l, t, from)` | Lands from `from`× scale (2–3) with overshoot and motion blur |
| `whipIn(l, t, dx)` | Flies in sideways from `dx` px |
| `riseIn(l, t, dy, d)` | Shoots up from below (phones, cards, mock-ups) |
| `punches(hit, times, amount)` | Zoom kicks on the whole frame at each impact time |
| `flash(c, sid, t, color)` | A three-frame flash on the biggest hits |

Parent every content layer to `H.hit` right after creating it. The nulls keep their anchor at the
frame centre, so children still use comp coordinates.

## What the second test showed (DeepSeek, same skill, its own script)

- Its strongest ideas: **witty two-part lines** ("You've got the big idea. I've got the pixels."),
  **one recurring object** (a cursor that clicks the website button, taps the app, hits the
  dashboard and becomes the play button) and **one unusual accent colour** (acid lime) instead
  of the default red. Plan all three before building.
- Its weakest point: **objects too small for a 1920-tall frame** (a tiny icon grid at the bottom of
  the hook, small dashboard cards), leaving big empty bands. In vertical, make each scene's object
  at least about 60% of the frame width and keep the stack of type + object filling roughly
  y = 350–1550.

## Pitfalls met while building it

- Rotation is `tr(l, "ADBE Rotate Z")`, not "ADBE Rotation" (that returns null and the script
  crashes halfway).
- A scene that crashes halfway leaves full-length layers behind that cover every other scene
  (QA then shows dozens of "text overlap" and "1:1 contrast" FAILs). Fix the script, then
  `ec.py run reset s1 ... sN wipes`, not `rebuild`.
- Anton at 300–400 px needs about 330 px between line centres, or the lines touch.
- Decorations that fly out (burst dots) go UNDER all text: `placeBelow(dot, firstTextLayer)`,
  and keep them off the text rows (no dot straight up into the line above).
- Don't run other heavy apps (FastSD CPU with FLUX, many browser tabs) during `ec.py render`:
  on 14 GB RAM the system's memory guard kills one of them.
