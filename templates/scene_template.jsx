// CUSTOM scene template: only for what no layout covers (a map, a product mock-up, a diagram).
// (A phone screen, icons, a flow or bars: use the phone / icons / flow / bars layouts.)
// Name the picture/object layers with "VIS" (e.g. "sN VIS map") so `ec.py qa` counts the scene as visual.
// Drawn pictograms: glyph(c, "truck", 160, pal.ink, [x, y]); shapes: shp(c, name, pos) + shp.add(...) (templates/kit.jsx).
// Normal scenes are one scene() call (see s1.jsx). Copy to scripts/sN.jsx, replace "sN" and the content block.
// Colours come from the look's palette for this scene's background: pal = P(S.bg); sizes from LOOK.type.
// Rules this template encodes (see SKILL.md for why):
//   - every time comes from SC()/W(), never a hand-typed number
//   - background first (layers stack: later = on top), decorative ghosts moved below text
//   - every layer goes into L and gets the full scene span via lifeAll()
//   - nothing fades out before S.out; the wipe hides the cut

var c = comp();
var S = SC("sN");
var L = [];

var pal = P(S.bg);
L = L.concat(typeof lookBg == "function" ? lookBg(c, "sN", S.bg, pal) : [bg(c, "sN", S.bg == "dark")]);
var ink = pal.ink, ink2 = pal.ink2;

// ---- content ------------------------------------------------------------------------
// Eyebrow just after the cut.
var eb = eyebrow(c, "SECTION LABEL", X0, 200, ink2);
fadeUpAll(eb, S["in"] + 0.25, 0.05, 16, 0.5);
L = L.concat(eb);

// Headline that mixes fonts; second part lands on its spoken word.
var head = richLine(c, [["Plain part.", FONT.head, ink], ["Accent part.", FONT.accent, pal.accent, 104]], X0 - 4, 300, 92,
  { tracking: -35, name: "SN head" });
fadeUp(head[0], S.voiceAt, 36, 0.7);
fadeUp(head[1], W("sN", "accent") - 0.1, 36, 0.7);
L = L.concat(head);

// A card: build the box, then its children, parent them, THEN animate the box.
var cardX = 960, cardY = 700, cw = 520, ch = 170;
var card = rect(c, "SN card", cw, ch, 22, pal.card, [cardX, cardY],
  { stroke: pal.line, strokeWidth: 2 });
var title = txt(c, "Card title", 38, FONT.head, pal.cardInk, [cardX - cw / 2 + 32, cardY - 6], { tracking: -20, name: "SN card title" });
var sub = txt(c, "CARD DETAIL", 22, FONT.mono, pal.cardInk2, [cardX - cw / 2 + 32, cardY + 34], { name: "SN card sub" });
parent([title, sub], card);
popIn(card, W("sN", "card"), 0.55, 100); // children scale with the box
L.push(card, title, sub);

// Count-up: ONE text layer + expression. Keep it on screen until the scene ends.
var num = txt(c, "98.7", 180, FONT.head, ink, [X0, 900], { tracking: -50, name: "SN number" });
countUp(num, W("sN", "ninety") - 0.1, W("sN", "percent"), 98.7, 1, "%");
fadeUp(num, W("sN", "ninety") - 0.2, 30, 0.6);
L.push(num);

// Decorative ghost text: it is created last, so it would sit ON TOP of everything.
// Move it below the first content layer of the scene (= directly above the background).
var ghost = txt(c, "2.4M", 420, FONT.head, ink, [960, 700], { align: "center", name: "SN ghost" });
tr(ghost, "ADBE Opacity").setValue(6);
placeBelow(ghost, eb[0]);
L.push(ghost);
// ---------------------------------------------------------------------------------------

lifeAll(L, S["in"], S.out);
c.numLayers;
