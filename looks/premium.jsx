// LOOK: premium - warm and quiet: a high-contrast display serif with italic accents, cream and deep
// green, generous space, slow reveals, soft fades between scenes.
// Fits: hospitality, real estate, beauty, wellness, wealth/private banking, food & wine, luxury.
var ACCENT = "A84C28"; // `ec.py look premium --accent HEX` rewrites this line
COL.accent = hex(ACCENT);
X0 = 170; X1 = W_ - 170;
FONT = { display: "DMSerifDisplay-Regular", head: "DMSerifDisplay-Regular", bold: "DMSerifDisplay-Regular", body: "InterTight-Medium",
         accent: "DMSerifDisplay-Italic", mono: "InterTight-Medium" };
var LOOK = {
  name: "premium", caps: false, accentStyle: "serif", chrome: "line", rules: false, cards: "card", statsLayout: "cols", centerEnd: true,
  type: { mega: 320, display: 150, head: 108, sub: 50, body: 32, label: 22 },
  track: { head: -10, mono: 260 }, lead: 1.08, top: 290, bottom: 950,
  pal: {
    light:  { bg: hex("F4EDE3"), ink: hex("1E2A23"), ink2: hex("5E665F"), accent: readable(hex(ACCENT), hex("F4EDE3"), 3), line: hex("DCD2C3"), card: hex("FBF7F1"), cardInk: hex("1E2A23"), cardInk2: hex("5E665F"), onAccent: inkOn(hex(ACCENT), hex("F4EDE3"), hex("1E2A23")) },
    dark:   { bg: hex("1E2A23"), ink: hex("F4EDE3"), ink2: hex("A9B0A6"), accent: readable(hex(ACCENT), hex("1E2A23"), 3.5), line: hex("34433A"), card: hex("25332B"), cardInk: hex("F4EDE3"), cardInk2: hex("A9B0A6"), onAccent: inkOn(hex(ACCENT), hex("F4EDE3"), hex("1E2A23")) },
    accent: { bg: hex(ACCENT), ink: inkOn(hex(ACCENT), hex("F4EDE3"), hex("1E2A23")), ink2: inkOn(hex(ACCENT), hex("F4EDE3"), hex("1E2A23")), accent: otherInkOn(hex(ACCENT), hex("F4EDE3"), hex("1E2A23")), line: inkOn(hex(ACCENT), hex("F4EDE3"), hex("1E2A23")), card: hex("F4EDE3"), cardInk: hex("1E2A23"), cardInk2: hex("5E665F"), onAccent: hex(ACCENT) }
  }
};
function lookBg(c, sid, kind, pal) { return [c.layers.addSolid(pal.bg, "BG " + sid, W_, H_, 1)]; }
// A short accent line, then the label in widely tracked small caps.
function lookChrome(c, S, sid, label, pal) {
  var r = rect(c, "Rule label " + sid, 60, 2, 0, pal.accent, [X0, 192], { leftAnchor: true });
  keys(tr(r, "ADBE Scale"), [[S["in"] + 0.15, [0, 100]], [S["in"] + 0.7, [100, 100]]], 85);
  var t = txt(c, String(label).toUpperCase(), 22, FONT.mono, pal.ink2, [X0 + 84, 200], { tracking: 260, name: "Label " + sid });
  fadeIn(t, S["in"] + 0.25, 0.6);
  return [r, t];
}
function lookReveal(l, t, role) {
  if (role == "object") { fadeUp(l, t, 24, 0.8); return; }
  fadeUp(l, t, role == "hero" ? 26 : role == "small" ? 10 : 20, role == "small" ? 0.7 : 0.95);
}
// Soft dissolve through the next background colour; fully covered at t + 0.42.
function lookCut(c, t, kind) {
  var p = rect(c, "Wipe " + t, W_ + 20, H_ + 20, 0, P(kind).bg, [W_ / 2, H_ / 2]);
  keys(tr(p, "ADBE Opacity"), [[t, 0], [t + 0.42, 100]], 60);
  life(p, t, t + 0.5);
  return p;
}
