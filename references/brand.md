# Brand fidelity

A film can pass every timing and layout check and still look amateur because it gets the brand
wrong. These are the mistakes agents made in testing, and the rules that prevent them.
`ec.py qa` checks rules 1-4 automatically when `timeline.json` has a `"brand"` block.

## The brand block

Fill this in during the brief, before writing any scene:

```json
"brand": {
  "name": "Quedium",
  "tagline": "Your Talent Quest Needs a Medium!",
  "logo": ["assets/logo/lockup.png", "assets/logo/mark.png"],
  "words": ["quedium.com"]
}
```

- `tagline`: copied character for character from the client or their site, punctuation and casing included.
- `logo`: the real logo files (transparent PNG). Get them from the client or the website.
- `words`: every product name, feature name, button label and URL you are allowed to show,
  beyond what the brief already names.

## Rules

1. **The tagline is not copy you can edit.** Not "needs a *medium.*" when the brand writes
   "Needs a Medium!". You may style one word as the accent, but every word and every punctuation
   mark stays. Sentence case is a WARN: only use it if the client approved it.
2. **Show the real logo; never type the brand name as a wordmark.** A name typed in the look's
   serif or sans is not the brand, however good the font. The brand reveal and the end card are
   built around the logo file. The name may appear as small text in a sentence.
3. **Put the logo on a background that respects its colours.** A multi-colour mark on the accent
   colour (orange Q on orange) loses its shape. Logo scenes go on light or dark; use the accent
   background for a non-logo moment.
4. **Invent nothing.** No product names ("Quedium Care"), no app screens' names, no button
   labels, no stats, prices, customers or quotes that are not in the brief, the voice script or
   the brand's site. For the call to action, use the website URL or the brief's wording. If a
   name is real, add it to `brand.words`.
5. **Use the accent background for 1-2 moments at most.** If the reveal, the end card and every
   transition are the same strong colour, nothing stands out and the film feels heavy.
   `timeline.py check` warns above two accent scenes.
6. **Fill the frame.** A row of small cards in the top third with an empty bottom two thirds
   reads as unfinished. Each scene has one large element (headline, logo, object) and the
   content spans most of the frame.

## Before you report

Look at the brand reveal and end card on the contact sheet and ask: would the client recognise
their own logo and tagline here, exactly as they publish them?
