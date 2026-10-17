// LOOK: swiss - International Typographic Style. One grotesque in caps, huge numbers, hard rules,
// index labels, three flat backgrounds (paper / ink / accent), hard push cuts.
// Proven on: Northwind Swiss. Fits: logistics, B2B, finance, architecture, anything with numbers.
var ACCENT = "FF2D1A"; // `ec.py look swiss --accent HEX` rewrites this line
COL.accent = hex(ACCENT);
X0 = 120; X1 = W_ - 120;
FONT = { display: "InterTight-Bold", head: "InterTight-Bold", bold: "InterTight-Bold", body: "InterTight-SemiBold",
         accent: "InterTight-Bold", mono: "JetBrainsMono-Regular" };
var LOOK = {
  name: "swiss", caps: true, accentStyle: "color", chrome: "index", rules: true, cards: "rule", statsLayout: "rows",
  type: { mega: 460, display: 200, head: 118, sub: 56, body: 34, label: 24 },
  track: { head: -45, mono: 140 }, lead: 0.98, top: 250, bottom: 980,
  pal: {
    light:  { bg: hex("F2F0EB"), ink: hex("111111"), ink2: hex("55534F"), accent: readable(hex(ACCENT), hex("F2F0EB"), 3), line: hex("111111"), card: hex("F2F0EB"), cardInk: hex("111111"), cardInk2: hex("55534F"), onAccent: inkOn(hex(ACCENT), hex("F2F0EB"), hex("111111")) },
    dark:   { bg: hex("111111"), ink: hex("F2F0EB"), ink2: hex("8F8C86"), accent: readable(hex(ACCENT), hex("111111"), 3), line: hex("F2F0EB"), card: hex("111111"), cardInk: hex("F2F0EB"), cardInk2: hex("8F8C86"), onAccent: inkOn(hex(ACCENT), hex("F2F0EB"), hex("111111")) },
    accent: { bg: hex(ACCENT), ink: inkOn(hex(ACCENT), hex("F2F0EB"), hex("111111")), ink2: inkOn(hex(ACCENT), hex("F2F0EB"), hex("111111")), accent: otherInkOn(hex(ACCENT), hex("F2F0EB"), hex("111111")), line: inkOn(hex(ACCENT), hex("F2F0EB"), hex("111111")), card: hex(ACCENT), cardInk: inkOn(hex(ACCENT), hex("F2F0EB"), hex("111111")), cardInk2: inkOn(hex(ACCENT), hex("F2F0EB"), hex("111111")), onAccent: hex(ACCENT) }
  }
};
function lookBg(c, sid, kind, pal) { return [c.layers.addSolid(pal.bg, "BG " + sid, W_, H_, 1)]; }
// "02 / THE PROBLEM" top-left, a hard rule under it.
function lookChrome(c, S, sid, label, pal) {
  var n = sid.replace(/\D/g, "");
  var t = txt(c, (n.length < 2 ? "0" : "") + n + " / " + String(label).toUpperCase(), 24, FONT.mono, pal.ink, [X0, 110], { tracking: 140, name: "Index " + sid });
  var r = rect(c, "Rule top " + sid, X1 - X0, 3, 0, pal.ink, [X0, 140], { leftAnchor: true });
  keys(tr(r, "ADBE Scale"), [[S["in"] + 0.1, [0, 100]], [S["in"] + 0.55, [100, 100]]], 92);
  return [t, r];
}
// Short hard rise, no bounce.
function lookReveal(l, t, role) {
  if (role == "object") return popIn(l, t, 0.4);
  fadeUp(l, t, role == "hero" ? 90 : role == "small" ? 18 : 50, role == "small" ? 0.3 : 0.42);
}
// The next scene's colour slams in from the right; frame fully covered at t + 0.42.
function lookCut(c, t, kind) {
  var p = rect(c, "Wipe " + t, W_ + 20, H_ + 60, 0, P(kind).bg, [W_ * 1.5 + 10, H_ / 2]);
  keys(tr(p, "ADBE Position"), [[t + 0.14, [W_ * 1.5 + 10, H_ / 2]], [t + 0.42, [W_ / 2, H_ / 2]]], 95);
  life(p, t + 0.14, t + 0.5);
  return p;
}
