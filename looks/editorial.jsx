// LOOK: editorial - a modern magazine / product site. Grotesque headlines with a serif-italic accent word,
// mono eyebrows, warm paper and deep ink backgrounds, soft white cards, smooth reveals, two-tone wipe.
// Proven on: Halden. Fits: SaaS, logistics, agencies, consumer apps with a calm, premium voice.
var ACCENT = "FF5B1F"; // `ec.py look editorial --accent HEX` rewrites this line
COL.accent = hex(ACCENT);
X0 = 160; X1 = W_ - 160;
FONT = { display: "InterTight-SemiBold", head: "InterTight-SemiBold", bold: "InterTight-Bold", body: "InterTight-Medium",
         accent: "InstrumentSerif-Italic", mono: "JetBrainsMono-Regular" };
var LOOK = {
  name: "editorial", caps: false, accentStyle: "serif", chrome: "eyebrow", rules: false, cards: "card", statsLayout: "cols",
  type: { mega: 340, display: 156, head: 112, sub: 52, body: 32, label: 22 },
  track: { head: -38, mono: 120 }, lead: 1.04, top: 280, bottom: 960,
  pal: {
    light:  { bg: hex("F3F1EC"), ink: hex("0D1B24"), ink2: hex("4A5660"), accent: readable(hex(ACCENT), hex("F3F1EC"), 3), line: hex("D6D5D0"), card: [1, 1, 1], cardInk: hex("0D1B24"), cardInk2: hex("4A5660"), onAccent: inkOn(hex(ACCENT), hex("F3F1EC"), hex("0D1B24")) },
    dark:   { bg: hex("0D1B24"), ink: hex("EEF0EE"), ink2: hex("9AA7AE"), accent: readable(hex(ACCENT), hex("0D1B24"), 3), line: hex("1E3440"), card: hex("14262F"), cardInk: hex("EEF0EE"), cardInk2: hex("9AA7AE"), onAccent: inkOn(hex(ACCENT), hex("F3F1EC"), hex("0D1B24")) },
    accent: { bg: hex(ACCENT), ink: inkOn(hex(ACCENT), hex("F3F1EC"), hex("0D1B24")), ink2: inkOn(hex(ACCENT), hex("F3F1EC"), hex("0D1B24")), accent: otherInkOn(hex(ACCENT), hex("F3F1EC"), hex("0D1B24")), line: inkOn(hex(ACCENT), hex("F3F1EC"), hex("0D1B24")), card: [1, 1, 1], cardInk: hex("0D1B24"), cardInk2: hex("4A5660"), onAccent: hex(ACCENT) }
  }
};
function lookBg(c, sid, kind, pal) {
  var b = c.layers.addSolid(pal.bg, "BG " + sid, W_, H_, 1);
  var g = gridLayer(c, "BG grid " + sid, 60, pal.ink, kind == "light" ? 5 : 7, 0, 0, W_, H_);
  tr(g, "ADBE Position").expression = "[0, (time * 6) % 60]"; // slow drift: the frame is never frozen
  return [b, g];
}
function lookChrome(c, S, sid, label, pal) {
  var eb = eyebrow(c, String(label).toUpperCase(), X0, 200, pal.ink2);
  fadeUpAll(eb, S["in"] + 0.2, 0.05, 16, 0.5);
  return eb;
}
function lookReveal(l, t, role) {
  if (role == "object") return popIn(l, t, 0.55);
  fadeUp(l, t, role == "hero" ? 46 : role == "small" ? 16 : 34, role == "small" ? 0.5 : 0.75);
}
// Two-tone wipe (accent band, then the next background); covered at t + 0.42.
function lookCut(c, t, kind) { return wipe(c, t, P(kind).bg); }
