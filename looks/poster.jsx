// LOOK: poster - loud, condensed display caps that fill the frame, flat colour blocks, quick slams.
// Fits: consumer brands, fitness, food, events, apps launching something; energetic voiceovers.
var ACCENT = "FF4D2E"; // `ec.py look poster --accent HEX` rewrites this line
COL.accent = hex(ACCENT);
X0 = 110; X1 = W_ - 110;
FONT = { display: "Anton-Regular", head: "Anton-Regular", bold: "ArchivoBlack-Regular", body: "InterTight-SemiBold",
         accent: "Anton-Regular", mono: "SpaceMono-Bold" };
var LOOK = {
  name: "poster", caps: true, accentStyle: "color", chrome: "tag", rules: false, cards: "block", statsLayout: "cols",
  type: { mega: 560, display: 250, head: 150, sub: 60, body: 34, label: 24 },
  track: { head: 0, mono: 60 }, lead: 0.98, top: 240, bottom: 985,
  pal: {
    light:  { bg: hex("F4EFE6"), ink: hex("141414"), ink2: hex("4D4943"), accent: readable(hex(ACCENT), hex("F4EFE6"), 3), line: hex("141414"), card: hex("141414"), cardInk: hex("F4EFE6"), cardInk2: hex("F4EFE6"), onAccent: inkOn(hex(ACCENT), hex("F4EFE6"), hex("141414")) },
    dark:   { bg: hex("141414"), ink: hex("F4EFE6"), ink2: hex("A39E96"), accent: readable(hex(ACCENT), hex("141414"), 3), line: hex("F4EFE6"), card: hex("F4EFE6"), cardInk: hex("141414"), cardInk2: hex("141414"), onAccent: inkOn(hex(ACCENT), hex("F4EFE6"), hex("141414")) },
    accent: { bg: hex(ACCENT), ink: inkOn(hex(ACCENT), hex("F4EFE6"), hex("141414")), ink2: inkOn(hex(ACCENT), hex("F4EFE6"), hex("141414")), accent: otherInkOn(hex(ACCENT), hex("F4EFE6"), hex("141414")), line: inkOn(hex(ACCENT), hex("F4EFE6"), hex("141414")), card: hex("141414"), cardInk: hex("F4EFE6"), cardInk2: hex("F4EFE6"), onAccent: hex(ACCENT) }
  }
};
function lookBg(c, sid, kind, pal) { return [c.layers.addSolid(pal.bg, "BG " + sid, W_, H_, 1)]; }
// A solid label block in the top-left corner, like a sticker on a poster.
function lookChrome(c, S, sid, label, pal) {
  var p = pill(c, "Tag " + sid, String(label).toUpperCase(), [0, 0], pal.ink, pal.bg, { size: 26, dot: false, font: FONT.mono, tracking: 60, h: 54 });
  p.box.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group").property(1).property("ADBE Vector Rect Roundness").setValue(0);
  tr(p.box, "ADBE Position").setValue([X0 + p.w / 2, 120]);
  popIn(p.box, S["in"] + 0.12, 0.35);
  return p.layers;
}
// Slam: hero words drop in from a bigger scale; lines snap up.
function lookReveal(l, t, role) {
  if (role == "object") return popIn(l, t, 0.35);
  if (role == "hero" && !l.parent) {
    var s = tr(l, "ADBE Scale").value[0];
    keys(tr(l, "ADBE Scale"), [[t, [s * 1.1, s * 1.1]], [t + 0.28, [s, s]]], 92);
    keys(tr(l, "ADBE Opacity"), [[t, 0], [t + 0.1, 100]], 50);
    return;
  }
  fadeUp(l, t, role == "small" ? 20 : 70, role == "small" ? 0.25 : 0.32);
}
// An accent block shoots up from the bottom, then the next background; covered at t + 0.42.
function lookCut(c, t, kind) {
  var a = rect(c, "Wipe A " + t, W_ + 20, H_ + 20, 0, COL.accent, [W_ / 2, H_ * 1.5 + 10]);
  keys(tr(a, "ADBE Position"), [[t, [W_ / 2, H_ * 1.5 + 10]], [t + 0.3, [W_ / 2, H_ / 2]], [t + 0.7, [W_ / 2, -H_ / 2]]], 92);
  life(a, t, t + 0.75);
  var b = rect(c, "Wipe B " + t, W_ + 20, H_ + 20, 0, P(kind).bg, [W_ / 2, H_ * 1.5 + 10]);
  keys(tr(b, "ADBE Position"), [[t + 0.1, [W_ / 2, H_ * 1.5 + 10]], [t + 0.42, [W_ / 2, H_ / 2]]], 92);
  life(b, t + 0.1, t + 0.5);
  return [a, b];
}
