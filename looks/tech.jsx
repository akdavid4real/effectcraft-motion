// LOOK: tech - a precise product/dev-tool look: near-black and cool white, a crisp grid, monospace data,
// outlined panels, one electric accent, fast clean cuts. Never glows or blurred blobs.
// Fits: SaaS, developer tools, fintech, AI, security, data products.
var ACCENT = "3DF5A4"; // `ec.py look tech --accent HEX` rewrites this line
COL.accent = hex(ACCENT);
X0 = 140; X1 = W_ - 140;
FONT = { display: "SpaceMono-Bold", head: "InterTight-SemiBold", bold: "InterTight-Bold", body: "InterTight-Medium",
         accent: "InterTight-SemiBold", mono: "SpaceMono-Regular" };
var LOOK = {
  name: "tech", caps: false, accentStyle: "color", chrome: "index", rules: true, cards: "outline", statsLayout: "cols",
  type: { mega: 330, display: 170, head: 108, sub: 50, body: 30, label: 22 },
  track: { head: -30, mono: 40 }, lead: 1.04, top: 260, bottom: 960,
  pal: {
    dark:   { bg: hex("0A0E13"), ink: hex("E8EDF2"), ink2: hex("8593A3"), accent: readable(hex(ACCENT), hex("0A0E13"), 3), line: hex("243040"), card: hex("0F151C"), cardInk: hex("E8EDF2"), cardInk2: hex("8593A3"), onAccent: inkOn(hex(ACCENT), hex("E9EDF2"), hex("0A0E13")) },
    light:  { bg: hex("E9EDF2"), ink: hex("0A0E13"), ink2: hex("4F5B68"), accent: readable(hex(ACCENT), hex("E9EDF2"), 3.5), line: hex("BCC5CF"), card: hex("F6F8FA"), cardInk: hex("0A0E13"), cardInk2: hex("4F5B68"), onAccent: inkOn(hex(ACCENT), hex("E9EDF2"), hex("0A0E13")) },
    accent: { bg: hex(ACCENT), ink: inkOn(hex(ACCENT), hex("E9EDF2"), hex("0A0E13")), ink2: inkOn(hex(ACCENT), hex("E9EDF2"), hex("0A0E13")), accent: otherInkOn(hex(ACCENT), hex("E9EDF2"), hex("0A0E13")), line: inkOn(hex(ACCENT), hex("E9EDF2"), hex("0A0E13")), card: hex(ACCENT), cardInk: inkOn(hex(ACCENT), hex("E9EDF2"), hex("0A0E13")), cardInk2: inkOn(hex(ACCENT), hex("E9EDF2"), hex("0A0E13")), onAccent: hex(ACCENT) }
  }
};
function lookBg(c, sid, kind, pal) {
  var b = c.layers.addSolid(pal.bg, "BG " + sid, W_, H_, 1);
  var g = gridLayer(c, "BG grid " + sid, 80, pal.ink, kind == "dark" ? 7 : 8, 0, 0, W_ + 80, H_);
  tr(g, "ADBE Position").expression = "[-((time * 8) % 80), 0]"; // slow drift
  return [b, g];
}
// "[02] THE PROBLEM" in mono with an accent square, plus a thin line to the right edge.
function lookChrome(c, S, sid, label, pal) {
  var n = sid.replace(/\D/g, "");
  var sq = rect(c, "Index dot " + sid, 14, 14, 0, pal.accent, [X0 + 7, 110 - 9]);
  var t = txt(c, "[" + (n.length < 2 ? "0" : "") + n + "]  " + String(label).toUpperCase(), 24, FONT.mono, pal.ink2, [X0 + 30, 110], { tracking: 40, name: "Index " + sid });
  var x = X0 + 30 + textWidth(t) + 30;
  var r = rect(c, "Rule top " + sid, X1 - x, 2, 0, pal.line, [x, 101], { leftAnchor: true });
  keys(tr(r, "ADBE Scale"), [[S["in"] + 0.15, [0, 100]], [S["in"] + 0.6, [100, 100]]], 90);
  fadeIn(sq, S["in"] + 0.1, 0.15);
  fadeIn(t, S["in"] + 0.12, 0.25);
  return [sq, t, r];
}
// Quick and exact: a short slide from the left.
function lookReveal(l, t, role) {
  if (role == "object") return popIn(l, t, 0.4);
  slideIn(l, t, role == "small" ? -14 : -28, role == "small" ? 0.3 : 0.45);
}
// A thin accent scan line crosses, the next background follows right behind it; covered at t + 0.42.
function lookCut(c, t, kind) {
  var a = rect(c, "Wipe A " + t, 10, H_ + 20, 0, COL.accent, [-20, H_ / 2]);
  keys(tr(a, "ADBE Position"), [[t, [-20, H_ / 2]], [t + 0.42, [W_ + 20, H_ / 2]]], 60);
  life(a, t, t + 0.45);
  var b = rect(c, "Wipe B " + t, W_ + 20, H_ + 20, 0, P(kind).bg, [-W_ / 2 - 30, H_ / 2]);
  keys(tr(b, "ADBE Position"), [[t, [-W_ / 2 - 30, H_ / 2]], [t + 0.42, [W_ / 2, H_ / 2]]], 60);
  life(b, t, t + 0.5);
  return [b, a];
}
