# Techniques from the best one-prompt motion films

Distilled from 13 entries of the Prompt Motion gallery (prompt-motion.com, Oct 2026): motion films made by Claude
from a single prompt or skill. The prompts belong to their creators (credited below); this page keeps only the
recurring techniques, in our own words, mapped to this kit. Read it when planning a film, next to
`design-review.md` (story, motif) and `high-energy.md` (kinetic ads).

Two kinds of prompt worked. Short ones ("a 15-second showreel proving you're a top motion designer, go all out")
on the highest effort setting gave strong reels because the model did the design thinking. Long ones, written
like a production spec, gave the most polished films. Those specs share the habits below.

## 1. The music's beat is the grid

- Analyse the track first: tempo, beats, bar starts, and the drop. Then plan every cut, every UI hit and every
  slam ON a beat, with the biggest moment on the drop and a quiet idea in the breakdown.
  (@notdwd: hard cuts land on the beat; @twoclipping: "every cut lands on a downbeat", grid calibrated to the
  song's real kicks.)
- In this kit: `timeline.py beats` -> `beats.json`; `timeline.py suggest` then ends scenes on beats;
  `timeline.py snap` pulls existing cuts onto beats where the voice allows; scene scripts use `BEAT(n)`,
  `DOWNBEAT(n)`, `nearBeat(t)` and `T.drop`; SFX cues can anchor to `"beat:N"`, `"downbeat:N"` or `"drop"`.
- Voice-led films still put the voice first: snap cuts and big hits to beats, keep words where they are.

## 2. Sound effects land by their peak, not their first sample

- A boom or pop often has a short lead-in; placing its file start on the event makes the hit late. Place the
  measured loudest moment on the event (@twoclipping, several entries). In this kit: `"align": "peak"` on a cue.
- Use real recorded SFX, quiet under the music; normalise the mix to -14 LUFS (the kit already does).

## 3. One continuous film, not a slideshow

- Every scene grows out of the previous one: an object changes shape into the next scene's object instead of
  fading or cutting (a wordmark squeezes into its full stop, which becomes a pill; a photo becomes a square,
  then a grid; one shape morphs through 8–12 UI states). (@twoclipping)
- A "flood" transition: a shape grows past the frame edges (overscale it, about 0.3 s, never a one-frame jump),
  holds the frame in one colour, then contracts into the next scene's object.
- A cursor drives the changes with real clicks, drags and long presses, and the camera zooms like a screen
  recording that follows it. (Also DeepSeek's AK David cursor motif.)
- Shots enter already moving and leave with an accelerating move; at most one deliberate hold (@notdwd).
- Optional: a seamless loop, where the last frame equals the first, for site heroes and autoplay posts.

## 4. A ban list in every brief

Write what the film must NOT contain. Common to the best specs: crossfades, blur-in reveals, 3D flips, particle
bursts, shockwave rings, glows and neon, lens flares, RGB split, camera shake, bouncy easing, flashing
backgrounds, grid floors, holds longer than a second, and anything that looks like a stock template. One spec
also banned small "eyebrow" labels as generic (@LexnLin): use them only if they carry real information.
Brand-specific bans belong here too (e.g. "no purple" when the brand has none).

## 5. A tight visual system

- One sans family (Geist / Inter class) with tight tracking, optionally one italic serif for an accent word;
  one accent colour; lots of negative space; one idea per shot.
- No full stops at the end of on-screen lines (@twoclipping), unless the brand writes them.
- Seeded randomness only (no unseeded random), so a re-render gives the same film.

## 6. Ask, then storyboard on the grid, then build

- Ask for the inputs first (brand name, logo, colours, real photos or clips, a track with a clear drop), with
  sensible defaults for anything the user skips (@notdwd).
- Write the storyboard with every timing on the beat grid BEFORE writing scene code (@twoclipping).
- Render probe frames (one per beat, or 20+ moments) and fix clutter, overlap and readability before the
  full render; scan for single-frame pops. In this kit: `ec.py frames`, `ec.py sheet`, and the readability
  check in `ec.py qa`.

## 7. Effort setting

The short-prompt reels were made at **max effort**. A sloppy brand film in this kit came from a low reasoning
setting. Use the highest one available for motion work.

## Sources (by handle, Prompt Motion gallery)

@twoclipping (UI morph loop; photo-print launch film; landing-page 3D fly-over; UGC ad), @notdwd (glassy product
sting), @LexnLin (brand ad from a reference clip), @Ror_Fly (recipe explainer), @stephanlivera, @shneural,
@ajith_io, @himanshutwtxs, @gabrielbuzziv, @thismacapital, @samuel_yostt (one-line showreel prompts).
