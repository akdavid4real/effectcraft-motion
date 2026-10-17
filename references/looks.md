# Looks and layouts: start from a tested design, then make it the brand's

A **look** (`$KIT/looks/*.jsx`) is a complete visual system: fonts, a palette for each background
(light / dark / accent), a type scale, how labels, rules and cards are drawn, how things reveal,
and the transition between scenes. A **layout** (`templates/layouts.jsx`) is a scene shape:
statement, number, list, brand, steps, split, cards, stats, log, end. Every layout works in every look.

Why they exist: when an agent invents a style from nothing, it reaches for the same things every
time: a dark gradient with blurred colour blobs, small centred text floating in a big frame, generic
cards with icons, and one background for the whole film. That reads as "AI-generated" in the first
second. (This is exactly what the first Northwind promo looked like.) The looks and layouts make that
outcome hard to reach: type grows to fill the frame, colours come from a palette built for each
background, and every scene is placed on a grid.

## How to use them

1. Read the brief. Then `ec.py look list` and shortlist **two** looks that fit, in *different* ways
   (e.g. one loud and one calm), using the table below.
2. Write the scene scripts first (they're the same for every look), then run
   `ec.py compare A B --accent HEX`. It builds the whole video in each look as a copy and
   puts the same moments side by side in `qa/look_compare.png`. Open it. Judge which one suits
   this brand, its audience and its voiceover. Your project is not touched.
3. Apply the winner: `ec.py look NAME --accent HEX`, then rebuild: `ec.py run reset s1 s2 ... wipes`.
4. Write in your report which two you compared, which won, and why, in terms of *this* brand.

**Accent colour:** take it from the brand: logo, website CSS, product, packaging. It is the one
colour that belongs to the brand; everything else in the look is neutral on purpose. Leave the
neutrals alone unless the brand's site uses specific ones (then edit the `pal` block in
`scripts/look.jsx`, keeping each background's ink readable; `ec.py qa` checks contrast).

If the brand has its own fonts on its website, you may swap `FONT` in `scripts/look.jsx` for the
same *role* (a heavy grotesque for a heavy grotesque, a serif for a serif), after installing
static font files (pitfalls #16-18). Don't change the type scale or the layouts to fit a font.

## The five looks

| look | fits | avoid when |
|---|---|---|
| `swiss` | logistics, B2B, finance, architecture, anything with strong numbers | soft, emotional, luxury brands |
| `editorial` | SaaS, agencies, consumer apps, logistics with a calm premium voice; brands with a modern website | loud launches, kids, gaming |
| `poster` | consumer brands, fitness, food, events, app launches; energetic voiceovers | quiet, trust-heavy brands (banks, health) |
| `tech` | developer tools, AI, fintech, security, data products | warm consumer, food, hospitality |
| `premium` | hospitality, real estate, beauty, wellness, private banking, food & wine | fast hype, tech specs, low-price offers |

### swiss
One grotesque (Inter Tight Bold) in caps, numbers 400px+ tall, hard black rules, `01 / LABEL`
index lines, three flat backgrounds (paper / ink / accent), hard push cuts.
- **Why it works:** the grid and the rules make the numbers feel like facts on a timetable. The huge
  type fills the frame, so nothing looks empty even on a single word.
- **Best layouts:** number, list (with a punch), stats (as a table), split, log.
- **Own it:** use the brand's strongest colour as the accent and give it whole scenes (bg "accent").

### editorial
Inter Tight with an Instrument Serif *italic* accent word, mono eyebrows, warm paper and deep ink,
a faint drifting grid, soft white cards, smooth reveals, a two-tone wipe.
- **Why it works:** the serif accent gives one word per line a voice, like a magazine. The soft cards
  make products and services look organised and premium.
- **Best layouts:** statement with an accent word, cards, stats with a title, steps.
- **Own it:** put the accent on the *meaning* word of each line ("Every container is a *promise.*").

### poster
Anton condensed caps that fill the width, flat colour blocks, a sticker label, slam reveals, an
accent block that shoots up between scenes.
- **Why it works:** condensed caps can be enormous without crowding, so every scene is one loud idea.
- **Best layouts:** statement (short lines), number, list with a punch, brand, end.
- **Own it:** keep lines short (2-5 words). Long sentences turn poster type into a wall.

### tech
Near-black and cool white, a fine drifting grid, Space Mono for numbers and labels, outlined panels,
one electric accent, a scan-line cut.
- **Why it works:** monospace means "precise", and flat dark panels look like a product UI. No glows:
  the energy comes from the accent and the motion.
- **Best layouts:** log, stats, cards (outlined), split, steps.
- **Own it:** the accent should be the product's UI colour. On light scenes it is darkened
  automatically so it stays readable.

### premium
DM Serif Display with italic accents, cream and deep green, generous margins, slow fades, a centred
end card.
- **Why it works:** a high-contrast serif and slow motion read as calm and expensive. The space *is*
  the luxury, so keep the copy short.
- **Best layouts:** statement, brand, cards, end. Use stats sparingly.
- **Own it:** pull the accent from the product or place (terracotta, brass, sage, wine).

## Layouts (what each one is for)

Write a scene as one call; see the comment above each layout in `templates/layouts.jsx` for its spec.

| layout | use it for | key fields |
|---|---|---|
| `statement` | hook, problem, promise: 1-3 big lines | `lines`, `sub` |
| `number` | one big figure that counts up | `value`, `count`, `caption` |
| `list` | 2-4 pains or features landing one by one, + a punch line | `items`, `punch` |
| `brand` | the name reveal | `wordmark`, `descriptor`, `tagline`, `chips` |
| `steps` | how it works, 2-4 steps with a moving marker | `items`, `stops` |
| `split` | two facts side by side (before/after, fast/firm) | `left`, `right` |
| `cards` | 2-6 services or features | `title`, `cards` |
| `stats` | 2-3 proof numbers that count while spoken | `items` |
| `log` | timestamps, tracking, changelogs, receipts | `rows`, `punch` |
| `end` | wordmark, promise, call to action | `wordmark`, `lines`, `cta`, `footer` |

### Visual layouts (at least a third of the scenes)
Text layouts alone make a slide deck. These put an object on screen; every look styles them (cards,
outlined panels, flat blocks or ruled squares), and their layers are named "VIS" so qa can count them.

| layout | use it for | key fields |
|---|---|---|
| `phone` | the product on a phone: a payment landing, an order, a delivery update, a dashboard number | `lines`, `sub`, `side`, `screen {app, label, amount, rows}` |
| `icons` | 2-4 things or steps, each a drawn pictogram + label | `title`, `items [{icon, label, at, note, hot}]` |
| `flow` | a journey or process: A → B → C, the line fills as each stop is spoken | `title`, `nodes [{icon, label, at, note}]` |
| `bars` | a comparison that grows: fees, waiting time, before/after | `title`, `bars [{label, value, w, at, hot}]` |

Glyphs (`icon`): phone card bank cash clock check tick shop bolt chart truck box pin lock user people
chat globe send star plane doc. Need another? Add it to `GLYPHS` in `templates/kit.jsx` (100-unit box).
Only put numbers on screen that the brief or voiceover gives you: a bars comparison with invented
competitor figures is a false claim.

A scene can have two parts: `scene("s1", [{ layout: "number", ..., until: "the" }, { layout: "statement", ... }])`.
The first part fades out at `until` and the second takes the frame (good for hooks: number, then meaning).

For something no layout covers (a map, a product mock-up, a phone screen), write a custom scene from
`templates/scene_template.jsx`. Use `P(S.bg)` for every colour and the look's `LOOK.type` sizes, so it
still belongs to the same film.

## What `ec.py qa` checks for design (and why)
- **No hero element** (biggest text under 90px): a scene without one thing that owns the frame looks empty.
- **Content covers under 18% of the frame:** small type floating in a big frame.
- **Low contrast:** text against the colour actually behind it (background or its card). Big text
  needs 3:1, small text 4.5:1.
- **Mostly centred:** centred everything reads as a template; centre only wordmarks and single lines.
- **Blurred glow blobs:** they turn to mud in video compression.
- **One background for every scene:** alternate light / dark / accent so cuts read as chapters.
- **Too many text sizes** in one scene (more than 5): use the look's type scale.
- **No look applied.**
- **Fewer than a third of the scenes are visual:** words only reads as a slide deck.
