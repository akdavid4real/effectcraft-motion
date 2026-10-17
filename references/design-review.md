# Design review: the creative-director pass

QA proves the film works: no collisions, nothing tiny, nothing empty. It does not prove the film
is good. In testing, two agents with the same kit, audio and timings both passed QA with 0 fail,
0 warn. One film looked mature and the other looked safe and generic. Every difference came from
the judgement calls below.

Do this pass twice: once on paper before you write scenes (the plan), and once on the contact
sheet before you render (the review). Write your answers to `qa/design_review.md`.

`benchmark_sheet.png` in this folder is a contact sheet that passed this review. Use it to judge
the level of finish, not as a layout to copy.

## 0. Story and motif: the two things the best film had

In testing, the film the client liked most was designed from scratch (no preset layouts) and won
on these two points, before any styling:

- **Write a human story, not a feature list.** Give the script an arc with a person in it:
  a truth ("Great workplaces aren't built on luck. They're built on people."), the tension
  ("people slip between them"), the turn ("So we built ..."), and an outcome in human terms
  ("from first hello to every day after", "help everyone belong"). Name features on screen;
  let the voice carry the feeling. Still cover every item the brief requires, on screen at least.
- **Take one motif from the logo and carry it through the film.** That film turned the Q's ring
  into a recurring object: a ring of people dots in the hook, a halo behind the logo, the ring
  drawing itself in the logo's gradient as the signature moment, and the same ring on the end
  card. One motif, repeated with variation, is what makes a film feel designed as a whole.
- The preset layouts are a fast, safe fallback. When there is time, design custom scenes around
  the story and motif instead (`templates/scene_template.jsx`), and keep the layouts for scenes
  that need nothing special.

## 1. Plan the colour script before any scene

Write one line per scene: background, and why. Colour is part of the story, not decoration.

- Decide where the **one loudest moment** is (usually the emotional peak, such as the outcome or
  the "thrive" beat). That scene gets the accent background. At most one more accent scene.
- The **brand reveal and end card** sit on the background where the real logo looks best, which is
  usually the light one. They are calm and confident, not loud.
- Problem scenes go darker; solution scenes go lighter. The cut from dark to light should land
  as relief.
- Weak: reveal, end card and every wipe in the same strong colour. Nothing stands out, and the
  ending feels heavy.

## 2. Match the picture to the sentence

For each scene, ask what the voice describes, and choose the visual that shows that shape:

| The voice describes | Show |
|---|---|
| A process or journey (hire → onboard) | `flow`: stops joined by a line that fills as each is spoken |
| A set of offerings (courses, games, community) | `icons`: big pictograms, one hero highlighted |
| Something personal (care, support, a check-in) | `phone`: the product in someone's hand |
| Change or insight (analytics, results) | `bars` or a chart that grows |
| A claim or an emotion | big type alone, one accent word |

Weak: small text cards that repeat the voice. A card that says "Courses" while the voice says
"courses" adds nothing; an open-book icon at 140 px does.

## 3. One hero per scene, and let it be big

- Every scene has ONE element that owns the frame: a 120–160 px headline, the logo, the phone,
  the flow. Everything else is clearly secondary (half the size or less).
- Empty space is fine when it is **framing** the hero. It is a problem when it is **left over**:
  for example, content in the top third and nothing in the bottom two thirds. Test: cover the
  hero with your thumb. If the frame now looks empty, the composition depends on the hero
  (good). If it already looked empty with the hero, the hero is too small.

## 4. Type with restraint

- One display face and one text face, from the look. Never a third.
- **At most one accent word per line**, in the accent colour or italic. Choose the word that
  carries the feeling ("better", "people", "together"), not a random noun.
- Contrast comes from **size and weight**, not from more colours. A 150 px headline over a 28 px
  line reads as designed; four mid-sized lines read as a slide.
- Short lines. On-screen text is a headline, never a transcript of the voice.

## 5. The brand is the hero of two scenes

- The **reveal**: the real logo, large, with one supporting line. No chips, pills or list
  competing with it in the same moment.
- The **end card**: logo + exact tagline + URL, nothing else. An asymmetric layout (logo left,
  tagline right) reads more crafted than everything centred.
- See `brand.md` for the hard rules.

## 6. One signature moment

A mature film has one moment people remember: a line that draws itself between the four pillars,
the logo mark assembling, a phone that turns to face the viewer. Plan it in the scene that
carries the main promise. Everything else stays quiet so this moment stands out.

## 7. Consistency is what reads as "designed"

- The same margins, the same eyebrow label style ("01 · HIRE"), the same entrance motion and the
  same icon style in every scene.
- Repeated structures (the four pillars) use the same layout family with variation in the
  visual, so the viewer feels a system rather than four separate slides.

## The review (on `qa/sheet_*.png`, before rendering)

Score each from 1 to 5 in `qa/design_review.md`, with one sentence of evidence each:

1. Would the client recognise their own logo and tagline, exactly as they publish them?
2. Does the colour script follow the plan, with one clear loudest moment?
3. Does every scene have one hero that is obviously the biggest thing?
4. Is any scene mostly left-over empty space?
5. Does each visual show what the voice says, rather than repeat its words as text?
6. Is there exactly one accent word per line?
7. Is there one signature moment, and where is it?
8. Side by side with `benchmark_sheet.png`, is this film at the same level of finish?

Any score below 4: redesign that scene (not just nudge it), rebuild it, and score again. In the
report, list the scores honestly. A 3 that you explain is better than a 5 that the sheet contradicts.
