# Showing real product UI (screenshots, screen recordings)

For SaaS and app films. Written after a DeepSeek beat cut of BridgeAxis OS (Oct 2026) that used real screens but
presented them badly: titles cut in half by the crop, a wall of eight tinted thumbnails nobody could read, doubled
"ghost" text from sub-frame blur, the student list shown under the word "EXAMS", and a giant "10 active schools"
that existed nowhere. Every rule below prevents one of those.

## Capture

- Capture at 2x (1440x900 at device scale 2, or 390x844 at 3 for phones) from a demo or sample-data environment,
  never a real customer's data. BridgeAxis OS: `demo.bridgeaxisltd.com` (sample school "Greenfield Academy"), or the
  repo's demo mode. Close guided tours and banners before capturing; crop off any "demo environment" strip.
- Capture the screen in the state the line talks about (a submitted result set, a published report), not an empty
  inbox. If the demo data is thin, rebuild that screen as animated UI in the brand (see below) instead.

## Crop

- Crop to the ONE panel the line is about (the report table, the review card), with at least 24 px of margin on
  every side. Never let the crop cut through a heading, a row of text or a sidebar label.
- Keep the app's own frame cues (card edge, shadow) so it reads as a real product, but drop the sidebar when it
  isn't the point: it eats a third of the width and its text is unreadable anyway.

## Size: readable or not at all

- A screenshot that carries the shot must be at least about 55% of the frame width, or zoom into the part that
  matters until its text is roughly 18 px or more on screen. `ec.py qa` warns about image layers under 45% of
  the frame width (logos excluded).
- One screen per shot. Never tile many screens into a grid or "wall": at that size nobody can read them, and
  tinting them to make the grid calmer makes it worse. Show three moments in sequence instead.

## Match the picture to the line

- The screen on screen must be the feature the voice or the on-screen word names, in the step it names. A student
  list under "EXAMS" or "REVIEW" breaks trust faster than no picture at all.

## Motion on UI

- Fine UI text and fast motion don't mix: sub-frame blending (rendering 3 sub-frames and averaging them) turns a
  fast-moving screen into doubled, smeared text. In EffectCraft use real motion blur (`l.motionBlur = true`) and
  keep moves on screenshots slow (a gentle push-in, a short slide), or let them land and hold still while read.
- Avoid 3D flips and carousels of screenshots: the side cards become unreadable slivers.
- Kinetic words: keep every word fully inside the frame when it is read; a ticker that crops words at the edges
  reads as a mistake unless it moves fast and continuously the whole time.

## Real screenshots vs rebuilt UI

- Real screenshots prove the product exists: use one or two, held long enough, at a readable size.
- Rebuilt UI (cards, tables, status pills drawn in the brand, using the real labels and the demo's sample values)
  carries the story: numbers can count up, statuses can flip on the word, and everything stays crisp.
  The BridgeAxis Results explainer (`~/Videos/bridgeaxis-results`) uses rebuilt UI for each step and one real
  screenshot as proof.

## Numbers and claims

- Every number on screen comes from the brief, the product's docs or the demo data, and is labelled as sample
  data where it matters. No "10 active schools", "2x faster" or user counts unless the client supplied them.

## Build path

- Build in EffectCraft with this skill, so the QA gates run (brand, readability, voice, stale files). A custom
  HTML/Playwright pipeline (as in some gallery entries) skips every one of them: if you must use one, still run
  `ec.py qa-video` on the MP4, pull frames at every scene's middle and end, and check them against this page.
