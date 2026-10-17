// EffectCraft kit: helpers for looks and layouts. ec.py loads this from the kit on every run
// (after scripts/lib.jsx), so projects with an older lib.jsx copy still work. Don't copy it.

// ---- looks + layouts support ----------------------------------------------------
// A look (scripts/look.jsx, from $KIT/looks) overrides COL/FONT/X0/X1 and defines LOOK.
// P(kind) = the palette for a scene background ("light" | "dark" | "accent"): every colour a
// layout uses comes from here, so text always matches the background it sits on.
function P(kind) {
  if (typeof LOOK != "undefined" && LOOK.pal) return LOOK.pal[kind] || LOOK.pal.accent || LOOK.pal.light;
  var d = kind == "dark";
  return { bg: d ? COL.dark : COL.light, ink: d ? COL.onDark : COL.ink, ink2: d ? COL.onDark2 : COL.ink2,
           accent: COL.accent, line: d ? COL.cardDarkLine : COL.line, card: d ? COL.cardDark : COL.card,
           cardInk: d ? COL.onDark : COL.ink, cardInk2: d ? COL.onDark2 : COL.ink2 };
}
function bgColor(kind) { return P(kind).bg; }

// Time spec -> seconds. 12.3 | "word" | "word#2" (2nd occurrence) | "word+0.3" | "in+0.2" | "voice"
function AT(sid, spec) {
  if (typeof spec == "number") return spec;
  var S = SC(sid), m = String(spec).match(/^(.+?)([+-]\d*\.?\d+)?$/), base = m[1], off = m[2] ? parseFloat(m[2]) : 0;
  if (base == "in") return S["in"] + off;
  if (base == "out") return S.out + off;
  if (base == "voice") return S.voiceAt + off;
  var nth = 1, h = base.indexOf("#");
  if (h > 0) { nth = parseInt(base.slice(h + 1), 10); base = base.slice(0, h); }
  return W(sid, base, nth) + off;
}

function setSize(l, size) {
  var td = l.property("ADBE Text Properties").property("ADBE Text Document"), d = td.value;
  d.fontSize = size;
  td.setValue(d);
}
function fontSize(l) { return l.property("ADBE Text Properties").property("ADBE Text Document").value.fontSize; }
// Shrink a text layer until it is at most maxW wide. Returns the final size.
function fit(l, maxW) {
  var w = rectOf(l).width, s = fontSize(l);
  if (w > maxW && w > 0) { s = Math.floor(s * maxW / w); setSize(l, s); }
  return s;
}

// One shape layer holding a whole grid of hairlines (hundreds of separate layers are slow).
function gridLayer(c, name, step, color, opacity, x0, y0, x1, y1) {
  var l = c.layers.addShape();
  l.name = name;
  tr(l, "ADBE Position").setValue([0, 0]);
  var root = l.property("ADBE Root Vectors Group");
  function line(a, b) {
    var v = root.addProperty("ADBE Vector Group").property("ADBE Vectors Group"), s = new Shape();
    s.vertices = [a, b]; s.inTangents = [[0, 0], [0, 0]]; s.outTangents = [[0, 0], [0, 0]]; s.closed = false;
    v.addProperty("ADBE Vector Shape - Group").property("ADBE Vector Shape").setValue(s);
    var st = v.addProperty("ADBE Vector Graphic - Stroke");
    st.property("ADBE Vector Stroke Color").setValue(color);
    st.property("ADBE Vector Stroke Width").setValue(1.5);
  }
  for (var x = x0; x <= x1; x += step) line([x, y0], [x, y1]);
  for (var y = y0; y <= y1; y += step) line([x0, y], [x1, y]);
  tr(l, "ADBE Opacity").setValue(opacity);
  return l;
}
// Colour helpers for looks: shade("FF5B1F", 0.6) = darker, tint("FF5B1F", 0.4) = 40% toward white.
function shade(h, f) { var c = hex(h); return [c[0] * f, c[1] * f, c[2] * f]; }
function tint(h, f) { var c = hex(h); return [c[0] + (1 - c[0]) * f, c[1] + (1 - c[1]) * f, c[2] + (1 - c[2]) * f]; }
// Contrast helpers so ANY brand accent stays readable (looks use them in their palettes).
function _lin(v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
function lumOf(k) { return 0.2126 * _lin(k[0]) + 0.7152 * _lin(k[1]) + 0.0722 * _lin(k[2]); }
function contrastOf(a, b) { var x = lumOf(a), y = lumOf(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
// readable(colour, background, 3): darken (on light bg) or lighten (on dark bg) until it reaches the ratio.
function readable(col, bgc, ratio) {
  var c = [col[0], col[1], col[2]], darker = lumOf(bgc) > 0.4;
  for (var i = 0; i < 30 && contrastOf(c, bgc) < (ratio || 3); i++)
    c = darker ? [c[0] * 0.93, c[1] * 0.93, c[2] * 0.93] : [c[0] + (1 - c[0]) * 0.08, c[1] + (1 - c[1]) * 0.08, c[2] + (1 - c[2]) * 0.08];
  return c;
}
// Text colour for a coloured background: whichever of the two inks contrasts more.
function inkOn(bgc, lightInk, darkInk) { return contrastOf(lightInk, bgc) >= contrastOf(darkInk, bgc) ? lightInk : darkInk; }
// The second ink for a coloured background (for highlights on accent scenes) if it is readable, else the first.
function otherInkOn(bgc, lightInk, darkInk) {
  var first = inkOn(bgc, lightInk, darkInk), second = first === lightInk ? darkInk : lightInk;
  return contrastOf(second, bgc) >= 3 ? second : first;
}

// ---- drawing: one shape layer, many parts ---------------------------------------------------
// shp(c, name, pos) -> layer;  shp.add(l, part, style) adds one part, in the layer's own coordinates.
// part: { rect: [w, h, r, x, y] } | { ell: [w, h, x, y] } | { pts: [[x,y],...], closed, tin, tout }
// style: { fill: rgb } and/or { stroke: rgb, w: px }
function shp(c, name, pos) {
  var l = c.layers.addShape();
  l.name = name;
  tr(l, "ADBE Position").setValue(pos || [0, 0]);
  return l;
}
shp.add = function (l, part, style) {
  var v = l.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group");
  if (part.rect) {
    var r = v.addProperty("ADBE Vector Shape - Rect"), p = part.rect;
    r.property("ADBE Vector Rect Size").setValue([p[0], p[1]]);
    r.property("ADBE Vector Rect Roundness").setValue(p[2] || 0);
    r.property("ADBE Vector Rect Position").setValue([p[3] || 0, p[4] || 0]);
  } else if (part.ell) {
    var e = v.addProperty("ADBE Vector Shape - Ellipse"), q = part.ell;
    e.property("ADBE Vector Ellipse Size").setValue([q[0], q[1]]);
    e.property("ADBE Vector Ellipse Position").setValue([q[2] || 0, q[3] || 0]);
  } else {
    var s = new Shape(), zero = [];
    for (var i = 0; i < part.pts.length; i++) zero.push([0, 0]);
    s.vertices = part.pts; s.inTangents = part.tin || zero; s.outTangents = part.tout || zero; s.closed = !!part.closed;
    v.addProperty("ADBE Vector Shape - Group").property("ADBE Vector Shape").setValue(s);
  }
  if (style.stroke) {
    var st = v.addProperty("ADBE Vector Graphic - Stroke");
    st.property("ADBE Vector Stroke Color").setValue(style.stroke);
    st.property("ADBE Vector Stroke Width").setValue(style.w || 6);
    try { st.property("ADBE Vector Stroke Line Cap").setValue(2); st.property("ADBE Vector Stroke Line Join").setValue(2); } catch (e1) {}
  }
  if (style.fill) v.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue(style.fill);
  return l;
};

// ---- glyphs: simple line pictograms drawn in a 100-unit box (no image files needed) ------------
// glyph(c, "phone", 180, color, [x, y]) -> one shape layer centred on pos. Names: see GLYPHS.
// Same stroke weight everywhere, so a whole film's icons match. Need another symbol? Add an entry.
var GLYPHS = {
  phone: [{ rect: [52, 88, 12] }, { pts: [[-9, 32], [9, 32]] }],
  card: [{ rect: [86, 58, 8] }, { pts: [[-43, -12], [43, -12]] }, { pts: [[-30, 14], [-12, 14]] }],
  bank: [{ pts: [[-44, -16], [0, -40], [44, -16]], closed: true }, { pts: [[-28, -6], [-28, 24]] }, { pts: [[-9, -6], [-9, 24]] },
         { pts: [[9, -6], [9, 24]] }, { pts: [[28, -6], [28, 24]] }, { pts: [[-46, 36], [46, 36]] }],
  cash: [{ rect: [88, 54, 6] }, { ell: [22, 22] }, { pts: [[-32, 0], [-30, 0]] }, { pts: [[30, 0], [32, 0]] }],
  clock: [{ ell: [86, 86] }, { pts: [[0, -26], [0, 0], [18, 12]] }],
  check: [{ ell: [86, 86] }, { pts: [[-20, 2], [-6, 16], [22, -14]] }],
  shop: [{ pts: [[-40, -18], [-32, -40], [32, -40], [40, -18]], closed: true }, { pts: [[-34, -18], [-34, 38], [34, 38], [34, -18]] },
         { rect: [20, 30, 2, 0, 23] }],
  bolt: [{ pts: [[8, -44], [-22, 6], [0, 6], [-8, 44], [22, -6], [0, -6]], closed: true }],
  chart: [{ pts: [[-42, -40], [-42, 40], [42, 40]] }, { pts: [[-28, 22], [-8, 2], [8, 12], [34, -22]] }, { pts: [[18, -22], [34, -22], [34, -6]] }],
  truck: [{ rect: [52, 40, 3, -16, -2] }, { pts: [[10, -12], [28, -12], [42, 4], [42, 18], [10, 18]], closed: true },
          { ell: [18, 18, -24, 28] }, { ell: [18, 18, 26, 28] }],
  box: [{ pts: [[0, -42], [38, -22], [38, 22], [0, 42], [-38, 22], [-38, -22]], closed: true }, { pts: [[-38, -22], [0, -2], [38, -22]] }, { pts: [[0, -2], [0, 42]] }],
  pin: [{ pts: [[0, 42], [0, -42]], closed: false, tout: [[-44, -34], [0, 0]], tin: [[0, 0], [-46, 0]] },
        { pts: [[0, -42], [0, 42]], tout: [[46, 0], [0, 0]], tin: [[0, 0], [44, -34]] }, { ell: [24, 24, 0, -12] }],
  lock: [{ rect: [66, 50, 8, 0, 14] }, { pts: [[-20, -11], [-20, -22], [20, -22], [20, -11]], tout: [[0, 0], [0, -28], [0, 0], [0, 0]], tin: [[0, 0], [0, 0], [0, -28], [0, 0]] }],
  user: [{ ell: [36, 36, 0, -20] }, { pts: [[-36, 40], [36, 40]], tout: [[0, -54], [0, 0]], tin: [[0, 0], [0, -54]] }],
  chat: [{ pts: [[-42, -34], [42, -34], [42, 18], [-4, 18], [-24, 38], [-22, 18], [-42, 18]], closed: true }],
  globe: [{ ell: [86, 86] }, { ell: [38, 86] }, { pts: [[-43, 0], [43, 0]] }],
  send: [{ pts: [[-40, 0], [38, 0]] }, { pts: [[16, -22], [38, 0], [16, 22]] }],
  star: [{ pts: [[0, -44], [12, -14], [42, -12], [18, 8], [26, 40], [0, 22], [-26, 40], [-18, 8], [-42, -12], [-12, -14]], closed: true }],
  tick: [{ pts: [[-26, 2], [-8, 20], [28, -18]] }],
  plane: [{ pts: [[-44, 4], [40, -30], [14, 36], [2, 12], [-44, 4]], closed: true }, { pts: [[2, 12], [40, -30]] }],
  people: [{ ell: [28, 28, -16, -18] }, { pts: [[-44, 34], [12, 34]], tout: [[0, -44], [0, 0]], tin: [[0, 0], [0, -44]] },
           { ell: [24, 24, 22, -10] }, { pts: [[20, 14], [46, 34]], tout: [[18, -6], [0, 0]], tin: [[0, 0], [0, -28]] }],
  doc: [{ pts: [[-30, -42], [16, -42], [32, -26], [32, 42], [-30, 42]], closed: true }, { pts: [[-16, -8], [18, -8]] }, { pts: [[-16, 10], [18, 10]] }, { pts: [[-16, 28], [6, 28]] }]
};
function glyph(c, name, size, color, pos, opts) {
  opts = opts || {};
  var parts = GLYPHS[name];
  if (!parts) throw new Error("No glyph '" + name + "'. Glyphs: " + glyphNames().join(" "));
  var l = shp(c, opts.name || ("glyph " + name), pos);
  for (var i = 0; i < parts.length; i++) shp.add(l, parts[i], { stroke: color, w: opts.weight || 6.5 });
  var s = size; tr(l, "ADBE Scale").setValue([s, s]); // the box is 100 units, so scale % = size in px
  return l;
}
function glyphNames() { var n = []; for (var k in GLYPHS) n.push(k); return n; }

// Count-up expression: 0 -> to between t0 and t1, with thousands separators when sep is true.
function countExpr(t0, t1, to, decimals, prefix, suffix, sep, start) {
  return "(function(){var v=linear(time," + t0 + "," + t1 + "," + (start || 0) + "," + to + ").toFixed(" + (decimals || 0) + ");" +
    (sep ? "var p=v.split('.'),s=p[0],o='',k=0;for(var i=s.length-1;i>=0;i--){o=s.charAt(i)+o;k++;if(k%3===0&&i>0)o=','+o;}v=o+(p[1]?'.'+p[1]:'');" : "") +
    "return " + JSON.stringify(prefix || "") + "+v+" + JSON.stringify(suffix || "") + ";})()";
}
