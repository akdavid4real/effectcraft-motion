# Motion-design rules for a 60 s promo

These are the rules that separate "looks professional" from "looks generated". Each has a reason.
Break one only when you can say why.

## Story and pacing
- **8 scenes in 60 s** is about right: hook, problem, brand, 2–3 benefit/how scenes, proof, end card.
  A scene needs about 3.5 s minimum to be read.
- **One idea per scene, one focal point per moment.** If two things animate at once, the viewer
  sees neither.
- **The voice drives everything.** A visual beat lands ON the word that names it (`W(scene, word)`),
  or about 0.1 s before. Late visuals feel laggy; visuals more than 0.5 s early spoil the line.
- **Leave 0.35 s+ of breath between voice lines,** and let no word spill past its scene's cut.
  `timeline.py check` enforces both.
- **End card:** at least 4 s, still moving gently (a pulse on the call-to-action, a slow ring),
  then fade out in the last second. Don't have 7 s of frozen frame.

## Transitions
- **Never show an empty frame.** Outgoing content stays until the wipe covers it. The next
  scene's first element appears within 0.3 s of the cut. An empty background between scenes
  looks like a bug because it is one.
- Use one transition style for the whole piece (the kit's two-tone wipe), with a swoosh on every wipe.

## Layout
- 1920×1080 with margins of 160 px left/right and about 120 px top/bottom (`X0`/`X1`).
- Left-align headlines, as editorial sites do. Centre only logo lockups and single statements.
- **Minimum sizes at 1080p:** headlines 90–160 px, sub-heads 48–64 px, body 26–32 px, labels and
  mono eyebrows 18–24 px. Anything smaller is unreadable on a phone. `ec.py qa` warns.
- Keep text 4%+ inside the frame edges (`qa` warns about the safe area).
- **Nothing overlaps text** except a deliberately faint (≤ 10 %) decorative layer placed BELOW it.

## Motion
- **Ease everything.** The kit's keys use smooth ease. A linear move is only for constant drift
  (grid, cargo dots).
- **Reveals:** fade + rise 30–50 px over 0.6–0.8 s (`fadeUp`), staggered 0.05–0.15 s between items.
- **Pops** (`popIn`) are for objects (cards, icons, logos), not paragraphs. Overshoot 6 % max.
- **Something is always moving slightly:** background drift, floating cards, pulsing rings. A
  completely static frame for more than 2 s reads as frozen.
- **Count-ups** run while the number is spoken and **stay on screen until the scene ends**.

## Brand consistency
- When the video accompanies a website, use the **same** fonts, colours, logo and copy. Copy the
  CSS tokens into `COL`/`FONT` in lib.jsx. A different font or logo is the most visible "off-brand"
  tell.
- **Three backgrounds at most** (light, dark, and the accent for the loudest 1-2 scenes), alternating
  by scene, plus one accent colour. More colours look like a template; one background for the whole
  film makes every cut look the same.
- **No glow blobs, no gradient mud.** Big blurred circles and dark gradients smear into grey blocks in
  H.264 and are the most recognisable "generated" look. Flat colour plus big type plus motion looks
  designed. (The first Northwind promo had all of these; `ec.py qa` now warns about them.)
- **Fill the frame.** One element per scene should be 100px+ at 1080p and the content should span
  most of the width. A 40px headline centred in a big empty frame looks unfinished.
- For a fictional brand, don't print a domain someone may own. Use `brand.example`, or no URL.

## Audio
- Voice about 1.6× in the mix, music about 0.5 ducked under the voice, SFX 0.25–0.55.
  Final mix: -14 LUFS, -1.5 dBTP (`timeline.py mix`).
- SFX are anchored to words or scene cuts in `timeline.json`, never hand-typed seconds. Then they
  stay in sync when the voice is regenerated.
