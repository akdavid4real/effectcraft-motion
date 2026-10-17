// EffectCraft kit: scene LAYOUTS. Loaded after lib.jsx and the look (scripts/look.jsx).
// A scene script is one call:
//   scene("s2", "list", { label: "The problem", items: [["Late arrivals", "late"], ...], punch: ["Too late.", "too"] });
// The layout places, sizes and times everything on the look's grid; the look decides fonts,
// colours, rules, cards, reveals and the transition. You write content and word timings only.
//
// Text: "*word*" marks the accent part of a line (serif italic or accent colour, per look).
// Timing (see AT in lib.jsx): "word", "word#2", "word+0.3", "in+0.2", or seconds.
// Every layout auto-shrinks text that would run past the margins, and keeps the first element
// within 0.3 s of the cut so there are no empty frames.

var LY = {};
var _FIRST = null; // scene in-point while the first reveal of a scene is still pending

function _L() { return typeof LOOK != "undefined" ? LOOK : {
  caps: false, accentStyle: "serif", chrome: "eyebrow", rules: false, cards: "card", statsLayout: "cols",
  type: { mega: 300, display: 150, head: 110, sub: 52, body: 32, label: 22 }, track: { head: -35, mono: 120 },
  lead: 1.02, top: 300, bottom: 960 }; }
function _cap(s) { return _L().caps ? String(s).toUpperCase() : String(s); }
function _segs(str) {
  var out = [], parts = String(str).split("*");
  for (var i = 0; i < parts.length; i++) if (parts[i].replace(/\s/g, "").length) out.push([parts[i], i % 2 == 1]);
  return out;
}
// When does this element appear? The first reveal of a scene is pulled to <= in+0.3 (no empty frames).
function _t(sid, spec) {
  var t = AT(sid, spec);
  if (_FIRST !== null) { t = Math.min(t, _FIRST + 0.3); _FIRST = null; }
  return t;
}
function _rev(l, t, role) {
  if (typeof lookReveal == "function") lookReveal(l, t, role || "line");
  else fadeUp(l, t, role == "small" ? 16 : 36, role == "small" ? 0.5 : 0.7);
}
function _revAll(list, t, role, stagger) {
  for (var i = 0; i < list.length; i++) if (list[i].parent == null) _rev(list[i], t + i * (stagger || 0), role);
}
function _y(size) { return size * (_L().lead || 1.0); }

// One line of text with *accent* parts, fitted to maxW. opts: font, color, accentColor, maxW,
// tracking, align ("left" | "center" | "right"), name, raw (no caps).
// Returns { layers, w, size, accent: [layers of accent parts] }.
function line_(c, str, x, y, size, pal, opts) {
  opts = opts || {};
  var Lk = _L(), segs = _segs(str), maxW = opts.maxW || (X1 - X0);
  var font = opts.font || FONT.head, color = opts.color || pal.ink;
  function build(sz) {
    var layers = [], acc = [], cx = x;
    for (var i = 0; i < segs.length; i++) {
      var isAcc = segs[i][1], serif = isAcc && Lk.accentStyle == "serif" && font == FONT.head;
      var f = serif ? FONT.accent : font;
      var s = String(segs[i][0]).replace(/^\s+|\s+$/g, "");
      if (!opts.raw && !serif) s = _cap(s);
      var l = txt(c, s, serif ? sz * 1.08 : sz, f, isAcc ? (opts.accentColor || pal.accent) : color, [cx, y], {
        name: (opts.name || "line") + " " + i,
        tracking: serif ? 0 : (opts.tracking !== undefined ? opts.tracking : (f == FONT.mono ? Lk.track.mono : Lk.track.head))
      });
      cx += textWidth(l) + (i < segs.length - 1 ? sz * 0.24 : 0);
      layers.push(l);
      if (isAcc) acc.push(l);
    }
    return { layers: layers, acc: acc, w: cx - x };
  }
  var r = build(size);
  if (r.w > maxW) {
    for (var k = 0; k < r.layers.length; k++) r.layers[k].remove();
    size = Math.floor(size * maxW / r.w);
    r = build(size);
  }
  var shift = opts.align == "center" ? -r.w / 2 : opts.align == "right" ? -r.w : 0;
  if (shift) for (var j = 0; j < r.layers.length; j++) {
    var p = tr(r.layers[j], "ADBE Position").value;
    tr(r.layers[j], "ADBE Position").setValue([p[0] + shift, p[1]]);
  }
  return { layers: r.layers, w: r.w, size: size, accent: r.acc };
}
// Reveal a built line: main parts at t, accent parts at tAcc (their own spoken word) when given.
function _revLine(ln, t, tAcc, role) {
  for (var i = 0; i < ln.layers.length; i++) {
    var isAcc = false;
    for (var k = 0; k < ln.accent.length; k++) if (ln.accent[k] === ln.layers[i]) isAcc = true;
    _rev(ln.layers[i], isAcc && tAcc !== undefined ? tAcc : t + i * 0.06, role);
  }
}
// spec line = "text" | ["text", at] | ["text", at, atForAccentPart]
function _ls(x) { return typeof x == "string" ? [x, null] : x; }

function _rule(c, name, x, y, w, color, t, thick) {
  var l = rect(c, name, w, thick || 3, 0, color, [x, y], { leftAnchor: true });
  keys(tr(l, "ADBE Scale"), [[t, [0, 100]], [t + 0.45, [100, 100]]], 90);
  return l;
}
// Slow push on the hero element so the frame never sits frozen.
function _drift(l, S) {
  if (l.parent) return;
  tr(l, "ADBE Scale").expression = "var k = 1 + Math.max(0, time - " + S["in"] + ") * 0.004; value * k";
}

// ---- the scene wrapper ------------------------------------------------------------------
// scene(sid, layoutName, spec)  or  scene(sid, [ {layout: "number", until: "the", ...}, {layout: "statement", ...} ])
// A part with "until" fades out at that moment so the next part can take the frame.
function scene(sid, a, b) {
  var parts = typeof a == "string" ? [b] : a;
  if (typeof a == "string") b.layout = a;
  var c = findItem(COMP);
  if (!c) {
    c = app.project.items.addComp(COMP, W_, H_, 1, T.duration, 30);
    var snd = findItem("soundtrack.wav");
    if (!snd) throw new Error("Import soundtrack.wav first: ec.py import soundtrack.wav");
    c.layers.add(snd).name = "Soundtrack";
  }
  var S = SC(sid), kind = S.bg || "light", pal = P(kind), L = [];
  c.bgColor = pal.bg;
  if (typeof lookBg == "function") L = L.concat(lookBg(c, sid, kind, pal));
  else L.push(bg(c, sid, kind == "dark"));
  var label = parts[0].label;
  if (label && typeof lookChrome == "function") L = L.concat(lookChrome(c, S, sid, label, pal));
  else if (label) { var eb = eyebrow(c, String(label).toUpperCase(), X0, 200, pal.ink2); _revAll(eb, S["in"] + 0.2, "small", 0.05); L = L.concat(eb); }
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    if (!LY[p.layout]) throw new Error("Unknown layout '" + p.layout + "'. Layouts: statement number list brand steps split cards stats log end  |  visual: phone icons flow bars");
    // the first element of each part appears right as the frame frees up (scene cut, or the previous part leaving)
    _FIRST = i == 0 ? S["in"] : parts[i - 1].until ? AT(sid, parts[i - 1].until) : null;
    var PL = LY[p.layout](c, sid, S, pal, p);
    if (p.until) { var tu = AT(sid, p.until) - 0.05; for (var k = 0; k < PL.length; k++) if (PL[k].parent == null) fadeOut(PL[k], tu, 0.15); }
    L = L.concat(PL);
  }
  _FIRST = null;
  if (b && b.extra) L = L.concat(b.extra(c, S, pal) || []);
  lifeAll(L, S["in"], S.out);
  return sid + ": " + L.length + " layers";
}

// Grow a block of lines so the widest fills ~88% of the content width (never past maxSize).
// Small type floating in a big empty frame is the most common "generated" look; this prevents it.
function _grow(c, lines, size, pal, maxSize, width) {
  var cw = width || (X1 - X0);
  var widest = 0;
  for (var i = 0; i < lines.length; i++) {
    var ln = line_(c, _ls(lines[i])[0], 0, 0, size, pal, { name: "measure", maxW: 99999 });
    if (ln.w > widest) widest = ln.w;
    for (var k = 0; k < ln.layers.length; k++) ln.layers[k].remove();
  }
  if (!widest) return size;
  return Math.floor(Math.max(Math.min(size * cw * 0.88 / widest, maxSize), Math.min(size, size * cw / widest)));
}

// Size one hero layer (number, wordmark) to frac of the content width, capped at maxSize.
function _fill(l, frac, maxSize) {
  var w = rectOf(l).width, s = fontSize(l);
  if (w > 0) { s = Math.floor(Math.min(s * (X1 - X0) * frac / w, maxSize)); setSize(l, s); }
  return s;
}

function _area() { var Lk = _L(); return { top: Lk.top || 300, bottom: Lk.bottom || 960 }; }

// ---- statement: 1-3 big lines (+ a quieter sub line). Hooks, problems, promises. ----------
// { lines: [["Every container", "every"], ["is a *promise.*", "is", "promise"]], sub: ["A factory waiting on parts.", "factory"], size: "display" }
LY.statement = function (c, sid, S, pal, s) {
  var Lk = _L(), A = _area(), L = [], lines = s.lines || [];
  var size = Lk.type[s.size || (lines.length <= 2 ? "display" : "head")];
  size = _grow(c, lines, size, pal, Math.min(Lk.type.mega * 0.72, (Lk.bottom - Lk.top) / (lines.length * 1.18 + (s.sub ? 0.6 : 0))));
  var subSize = Math.round(Lk.type.sub * 1.1), h = lines.length * _y(size) + (s.sub ? subSize * 1.8 : 0);
  // sit in the lower part of the frame (a slide puts text at the top; a film frame weights it low)
  var y = A.top + Math.max(0, (A.bottom - A.top - h) * 0.72) + size * 0.78;
  var hero = null;
  for (var i = 0; i < lines.length; i++) {
    var ls = _ls(lines[i]), ln = line_(c, ls[0], X0 - size * 0.04, y, size, pal, { name: sid + " line" + i });
    var t = _t(sid, ls[1] || "voice"), ta = ls[2] ? AT(sid, ls[2]) - 0.05 : undefined;
    _revLine(ln, t - 0.08, ta, "hero");
    L = L.concat(ln.layers);
    if (!hero) hero = ln.layers[0];
    y += _y(size);
  }
  if (s.sub) {
    var ss = _ls(s.sub);
    var sub = line_(c, ss[0], X0, y + subSize * 0.5 - size * 0.12, subSize, pal, { font: FONT.body, color: pal.ink2, raw: true, tracking: -10, name: sid + " sub" });
    _revLine(sub, _t(sid, ss[1] || "voice"), undefined, "small");
    L = L.concat(sub.layers);
  }
  if (hero && lines.length == 1) _drift(hero, S);
  return L;
};

// ---- number: one giant figure that counts up + what it means. ------------------------------
// { value: "2.4M", count: { to: 2.4, decimals: 1, suffix: "M", from: "2.4", until: "shipments" },
//   caption: ["Shipments a year", "shipments"], note: ["The question is never whether freight moves.", "the"] }
LY.number = function (c, sid, S, pal, s) {
  var Lk = _L(), A = _area(), L = [];
  var size = Lk.type.mega, y = A.top + size * 0.82 + 20;
  var num = txt(c, s.value, size, FONT.display || FONT.head, pal.accent, [X0 - size * 0.05, y], { tracking: Lk.track.head * 1.3, name: sid + " number" });
  size = _fill(num, 0.8, (A.bottom - A.top) * 0.66);
  var blockH = size * 0.76 + 70 + (s.caption ? Lk.type.sub * 1.4 : 0) + (s.note ? Lk.type.sub * 1.5 : 0);
  y = A.top + Math.max(0, (A.bottom - A.top - blockH) * 0.6) + size * 0.76 + 10;
  tr(num, "ADBE Position").setValue([X0 - size * 0.05, y]);
  var t0 = _t(sid, s.at || (s.count && s.count.from) || "voice");
  if (s.count) {
    var k = s.count, t1 = AT(sid, k.until || k.from) ;
    if (t1 <= t0 + 0.3) t1 = t0 + 0.9;
    num.property("ADBE Text Properties").property("ADBE Text Document").expression =
      countExpr(t0, t1, k.to, k.decimals, k.prefix, k.suffix, k.sep !== undefined ? k.sep : /\d,\d/.test(s.value), k.start);
  }
  _rev(num, t0 - 0.08, "hero");
  _drift(num, S);
  L.push(num);
  var yb = y + 70;
  if (Lk.rules) L.push(_rule(c, sid + " rule", X0, yb - 20, X1 - X0, pal.ink, t0 + 0.2, 3));
  if (s.caption) {
    var cs = _ls(s.caption);
    var cap = line_(c, cs[0], X0, yb + Lk.type.sub * 1.1, Lk.type.sub * 1.15, pal, { name: sid + " caption" });
    _revLine(cap, AT(sid, cs[1] || "voice"), undefined, "line");
    L = L.concat(cap.layers);
  }
  if (s.note) {
    var ns = _ls(s.note);
    var note = line_(c, ns[0], X0, yb + Lk.type.sub * 2.6, Math.max(Lk.type.body, Math.round(Lk.type.sub * 0.78)), pal, { font: FONT.body, color: pal.ink2, raw: true, tracking: -5, name: sid + " note" });
    _revLine(note, AT(sid, ns[1] || "voice"), undefined, "small");
    L = L.concat(note.layers);
  }
  return L;
};

// ---- list: 2-4 rows that land one by one (+ an optional punch line that dims them). ----------
// { items: [["Late arrivals.", "late"], ["Customs surprises.", "customs"], ["Tracking that tells you *nothing.*", "tracking"]],
//   punch: ["Too late.", "too"] }
LY.list = function (c, sid, S, pal, s) {
  var Lk = _L(), A = _area(), L = [], rows = [], items = s.items || [];
  var punchSize = s.punch ? Lk.type.display * 1.25 : 0;
  var room = A.bottom - A.top - (s.punch ? punchSize * 1.15 : 0);
  var size = Math.min(Lk.type.head, Math.floor(room / (items.length * 1.45)));
  size = Math.floor(_grow(c, items, size, pal, room / (items.length * 1.45)) * 0.92); // 0.92: room for the row numbers
  var gap = size * 1.45, used = items.length * gap + (s.punch ? punchSize * 1.15 : 0);
  var y = A.top + size * 0.9 + Math.max(0, (A.bottom - A.top - used) * 0.6);
  var indent = s.numbered === false ? 0 : Math.max(70, size * 0.9);
  for (var i = 0; i < items.length; i++) {
    var it = _ls(items[i]), t = _t(sid, it[1] || "voice");
    if (indent) {
      var n = txt(c, (i < 9 ? "0" : "") + (i + 1), Math.max(24, size * 0.32), FONT.mono, pal.accent, [X0, y - size * 0.45], { name: sid + " n" + i });
      _rev(n, t - 0.05, "small");
      rows.push(n);
    }
    var ln = line_(c, it[0], X0 + indent, y, size, pal, { maxW: X1 - X0 - indent, name: sid + " row" + i });
    _revLine(ln, t - 0.05, it[2] ? AT(sid, it[2]) : undefined, "line");
    rows = rows.concat(ln.layers);
    if (Lk.rules) rows.push(_rule(c, sid + " hr" + i, X0, y + size * 0.32, X1 - X0, pal.line, t, 2));
    y += gap;
  }
  L = L.concat(rows);
  if (s.punch) {
    var ps = _ls(s.punch), tp = AT(sid, ps[1]);
    for (var j = 0; j < rows.length; j++) keys(tr(rows[j], "ADBE Opacity"), [[tp - 0.05, 100], [tp + 0.2, 28]], 80);
    var pl = line_(c, ps[0], X0 - punchSize * 0.04, Math.min(A.bottom + 20, y - gap + size * 0.4 + punchSize * 1.05), punchSize, pal, { color: pal.accent, name: sid + " punch" });
    _revLine(pl, tp - 0.06, undefined, "hero");
    L = L.concat(pl.layers);
  }
  return L;
};

// ---- brand: the wordmark moment. ------------------------------------------------------------
// { wordmark: ["Northwind", "northwind"], descriptor: ["Logistics", "logistics"],
//   tagline: ["One control tower. *Every mode.*", "control"], chips: [["Road", "road"], ["Air", "air"], ["Ocean", "ocean"], ["Rail", "rail"]] }
LY.brand = function (c, sid, S, pal, s) {
  var Lk = _L(), A = _area(), L = [];
  var ws = _ls(s.wordmark), size = Lk.type.mega * 0.8;
  var y = A.top + size * 0.75 + (s.chips ? 0 : 80);
  var wm = txt(c, Lk.caps ? String(ws[0]).toUpperCase() : ws[0], size, FONT.display || FONT.head, pal.ink, [X0 - size * 0.04, y], { tracking: Lk.track.head * 1.4, name: sid + " wordmark" });
  size = _fill(wm, 0.96, Lk.type.mega * (s.chips ? 1.0 : 1.2));
  y = A.top + size * 0.74 + (s.chips ? 0 : Math.max(0, (A.bottom - A.top - size * 1.3) * 0.55));
  tr(wm, "ADBE Position").setValue([X0 - size * 0.04, y]);
  _rev(wm, _t(sid, ws[1] || "voice") - 0.08, "hero");
  _drift(wm, S);
  L.push(wm);
  var y2 = y + Math.max(60, size * 0.28);
  if (s.descriptor) {
    var ds = _ls(s.descriptor);
    var d = txt(c, String(ds[0]).toUpperCase(), Math.max(32, Lk.type.label * 1.5), FONT.mono, pal.ink2, [X0, y2], { tracking: 220, name: sid + " descriptor" });
    fit(d, (X1 - X0) * (s.tagline ? 0.42 : 1));
    _rev(d, AT(sid, ds[1] || "voice"), "small");
    L.push(d);
  }
  if (s.tagline) {
    var ts = _ls(s.tagline);
    var tg = line_(c, ts[0], X1, y2 + (s.descriptor ? 0 : 20), Lk.type.sub, pal, { align: "right", maxW: (X1 - X0) * 0.6, name: sid + " tagline" });
    _revLine(tg, AT(sid, ts[1] || "voice") - 0.05, ts[2] ? AT(sid, ts[2]) : undefined, "line");
    L = L.concat(tg.layers);
  }
  if (s.chips) {
    var cy = Math.max(y2 + 150, A.bottom - 60), n = s.chips.length;
    if (Lk.cards == "rule" || Lk.cards == "block") { // big words on a ruled row
      var cw = (X1 - X0) / n, cs = Math.min(Lk.type.head, Math.floor(cw / 4.2));
      for (var i = 0; i < n; i++) {
        var ch = _ls(s.chips[i]), t = AT(sid, ch[1] || "voice") - 0.06, x = X0 + i * cw;
        if (Lk.rules) L.push(_rule(c, sid + " chip rule" + i, x, cy - cs * 1.05, cw - 24, pal.ink, t - 0.1, 4));
        var w = line_(c, ch[0], x, cy, cs, pal, { maxW: cw - 30, color: Lk.cards == "block" && i == 0 ? pal.accent : pal.ink, name: sid + " chip" + i });
        _revLine(w, t, undefined, "line");
        L = L.concat(w.layers);
      }
    } else { // pills
      var px = X0, ps = Math.max(36, Lk.type.sub * 0.8);
      for (var j = 0; j < n; j++) {
        var cj = _ls(s.chips[j]);
        var p = pill(c, sid + " chip" + j, _cap(cj[0]), [0, cy], j == 0 ? pal.accent : pal.card, j == 0 ? pal.onAccent || pal.bg : pal.cardInk, { size: ps, font: FONT.body });
        var pp = tr(p.box, "ADBE Position");
        pp.setValue([px + p.w / 2, cy]);
        px += p.w + 20;
        _rev(p.box, AT(sid, cj[1] || "voice") - 0.05, "object");
        L = L.concat(p.layers);
      }
    }
  }
  return L;
};

// ---- steps: numbered how-it-works rows + a track with a marker that travels them. -----------
// { title: ["Door to dock.", "we"], items: [["Collect from your door.", "collect"], ["Clear the border.", "clear"], ["Carry the risk.", "carry"]],
//   stops: ["Door", "Border", "Dock"] }
LY.steps = function (c, sid, S, pal, s) {
  var Lk = _L(), A = _area(), L = [], items = s.items || [], y = A.top;
  if (s.title) {
    var tsz = Lk.type.head * 0.8, tl = _ls(s.title);
    var ti = line_(c, tl[0], X0, y + tsz * 0.8, tsz, pal, { name: sid + " title" });
    _revLine(ti, _t(sid, tl[1] || "voice"), tl[2] ? AT(sid, tl[2]) : undefined, "line");
    L = L.concat(ti.layers);
    y += tsz * 1.5;
  }
  var trackY = A.bottom - 40, room = trackY - 90 - y;
  var size = Math.min(Lk.type.head * 0.85, Math.floor(room / (items.length * 1.5)));
  size = Math.floor(_grow(c, items, size, pal, room / (items.length * 1.5)) * 0.9);
  var stepGap = Math.min(size * 2.1, room / items.length);
  y += size * 0.95 + Math.max(0, room - stepGap * items.length) * 0.35;
  var times = [];
  for (var i = 0; i < items.length; i++) {
    var it = _ls(items[i]), t = _t(sid, it[1] || "voice");
    times.push(AT(sid, it[1] || "voice"));
    var n = txt(c, (i + 1) + "", size, FONT.display || FONT.head, pal.accent, [X0, y], { tracking: Lk.track.head, name: sid + " step n" + i });
    var ln = line_(c, it[0], X0 + size * 1.1, y, size, pal, { maxW: X1 - X0 - size * 1.1, name: sid + " step" + i });
    _rev(n, t - 0.08, "line");
    _revLine(ln, t - 0.05, it[2] ? AT(sid, it[2]) : undefined, "line");
    L.push(n);
    L = L.concat(ln.layers);
    y += stepGap;
  }
  if (s.stops !== false) {
    var stops = s.stops || [], n2 = items.length;
    L.push(_rule(c, sid + " track", X0, trackY, X1 - X0, pal.line, S["in"] + 0.25, 4));
    for (var k = 0; k < n2; k++) {
      var x = n2 == 1 ? X0 : X0 + (X1 - X0) * k / (n2 - 1);
      var tick = rect(c, sid + " tick" + k, 4, 34, 0, pal.ink, [x, trackY]);
      fadeIn(tick, times[k] - 0.1, 0.15);
      L.push(tick);
      if (stops[k]) {
        var lab = txt(c, String(stops[k]).toUpperCase(), Math.max(22, Lk.type.label), FONT.mono, pal.ink2, [x, trackY + 58],
          { tracking: Lk.track.mono, align: k == 0 ? "left" : k == n2 - 1 ? "right" : "center", name: sid + " stop" + k });
        if (k == 0) tr(lab, "ADBE Position").setValue([X0, trackY + 58]);
        if (k == n2 - 1 && n2 > 1) tr(lab, "ADBE Position").setValue([X1 - textWidth(lab), trackY + 58]);
        _rev(lab, times[k] - 0.05, "small");
        L.push(lab);
      }
    }
    var mk = (Lk.cards == "card" || Lk.cards == "outline") ? circle(c, sid + " marker", 30, pal.accent, [X0, trackY]) : rect(c, sid + " marker", 34, 34, 0, pal.accent, [X0, trackY]);
    var kk = [];
    for (var m = 0; m < n2; m++) kk.push([times[m], [n2 == 1 ? X0 : X0 + (X1 - X0) * m / (n2 - 1), trackY]]);
    if (kk.length > 1) keys(tr(mk, "ADBE Position"), kk, 70);
    fadeIn(mk, S["in"] + 0.4, 0.2);
    L.push(mk);
  }
  return L;
};

// ---- split: two big facts side by side. ---------------------------------------------------
// { left: { big: "2:00", at: "two", lines: ["To book.", "*Online.*"] },
//   right: { big: "4H", at: "firm", lines: [["To a firm,", "firm"], ["*all-in rate.*", "all-in"]], note: ["A specialist, not a chatbot.", "specialist"] } }
LY.split = function (c, sid, S, pal, s) {
  var Lk = _L(), A = _area(), L = [], colW = (X1 - X0) / 2 - 60;
  var div = rect(c, sid + " divider", 3, A.bottom - A.top, 0, pal.line, [960, (A.top + A.bottom) / 2]);
  keys(tr(div, "ADBE Scale"), [[S["in"] + 0.2, [100, 0]], [S["in"] + 0.65, [100, 100]]], 90);
  L.push(div);
  var sides = [s.left, s.right];
  for (var i = 0; i < 2; i++) {
    var sd = sides[i];
    if (!sd) continue;
    var x = i == 0 ? X0 : 960 + 60, size = Lk.type.display * 1.6, y = A.top + size * 0.85 + 30;
    var t = i == 0 ? _t(sid, sd.at || "voice") : AT(sid, sd.at || "voice");
    var big = txt(c, Lk.caps ? String(sd.big).toUpperCase() : sd.big, size, FONT.display || FONT.head, i == 0 ? pal.accent : pal.ink, [x - size * 0.04, y], { tracking: Lk.track.head * 1.3, name: sid + " big" + i });
    size = fit(big, colW);
    _rev(big, t - 0.08, "hero");
    L.push(big);
    var ly = y + Lk.type.sub * 1.9;
    var lines = sd.lines || [];
    for (var j = 0; j < lines.length; j++) {
      var ls = _ls(lines[j]);
      var ln = line_(c, ls[0], x, ly, Lk.type.sub, pal, { maxW: colW, name: sid + " side" + i + " l" + j });
      _revLine(ln, ls[1] ? AT(sid, ls[1]) : t + 0.15 + j * 0.12, ls[2] ? AT(sid, ls[2]) : undefined, "line");
      L = L.concat(ln.layers);
      ly += Lk.type.sub * 1.2;
    }
    if (sd.note) {
      var ns = _ls(sd.note);
      var note = line_(c, ns[0], x, ly + Lk.type.label * 1.6, Math.max(24, Lk.type.label * 1.15), pal, { font: FONT.mono, color: pal.ink2, maxW: colW, name: sid + " note" + i });
      _revLine(note, AT(sid, ns[1] || "voice"), undefined, "small");
      L = L.concat(note.layers);
    }
  }
  return L;
};

// ---- cards: a headline + 2-6 feature cards in a grid. -----------------------------------------
// { title: ["Every mode. *One desk.*", "every", "one"], cards: [["Ocean freight", "FCL & LCL on 600+ lanes", "ocean"], ...] }
LY.cards = function (c, sid, S, pal, s) {
  var Lk = _L(), A = _area(), L = [], cards = s.cards || [], y = A.top;
  if (s.title) {
    var tsz = Lk.type.head, tl = _ls(s.title);
    var ti = line_(c, tl[0], X0 - 4, y + tsz * 0.8, tsz, pal, { name: sid + " title" });
    _revLine(ti, _t(sid, tl[1] || "voice") - 0.08, tl[2] ? AT(sid, tl[2]) - 0.05 : undefined, "hero");
    L = L.concat(ti.layers);
    y += tsz * 1.35;
  }
  var n = cards.length, cols = n <= 3 ? n : n == 4 ? 2 : 3, rowsN = Math.ceil(n / cols), gap = 28;
  var cw = (X1 - X0 - gap * (cols - 1)) / cols, ch = Math.min(300, (A.bottom - y - gap * (rowsN - 1)) / rowsN);
  for (var i = 0; i < n; i++) {
    var cd = cards[i], col = i % cols, row = Math.floor(i / cols);
    var cx = X0 + col * (cw + gap) + cw / 2, cy = y + row * (ch + gap) + ch / 2;
    var hot = i == 0 && Lk.cards != "outline";
    var fill = Lk.cards == "block" ? (hot ? pal.accent : pal.ink) : hot ? pal.accent : pal.card;
    var ink = Lk.cards == "block" ? (hot ? pal.onAccent || pal.bg : pal.bg) : hot ? (pal.onAccent || pal.bg) : pal.cardInk;
    var ink2 = Lk.cards == "block" || hot ? ink : pal.cardInk2 || pal.ink2;
    var t = i == 0 ? _t(sid, cd[2] || "voice") : AT(sid, cd[2] || "voice");
    var box = Lk.cards == "rule"
      ? rect(c, sid + " card" + i, cw, 4, 0, i == 0 ? pal.accent : pal.ink, [cx, cy - ch / 2])
      : rect(c, sid + " card" + i, cw, ch, Lk.cards == "card" ? 22 : Lk.cards == "outline" ? 8 : 0, Lk.cards == "outline" ? pal.bg : fill, [cx, cy],
             Lk.cards == "card" && !hot ? { stroke: pal.line, strokeWidth: 2 } : Lk.cards == "outline" ? { stroke: i == 0 ? pal.accent : pal.line, strokeWidth: 3 } : {});
    if (Lk.cards == "rule") { ink = pal.ink; ink2 = pal.ink2; }
    var ts = Math.min(Lk.type.sub, 54), ty = cy - ch / 2 + (Lk.cards == "rule" ? 70 : Math.min(ch * 0.62, 150));
    var title = txt(c, _cap(cd[0]), ts, FONT.head, ink, [cx - cw / 2 + 34, ty], { tracking: Lk.track.head * 0.6, name: sid + " card title" + i });
    fit(title, cw - 68);
    var sub = cd[1] ? txt(c, cd[1], Math.max(24, Lk.type.body * 0.85), Lk.cards == "outline" ? FONT.mono : FONT.body, ink2, [cx - cw / 2 + 34, ty + ts * 0.95], { tracking: Lk.cards == "outline" ? 20 : -5, name: sid + " card sub" + i }) : null;
    if (sub) fit(sub, cw - 68);
    var kids = sub ? [title, sub] : [title];
    if (Lk.cards == "rule") { _rev(box, t - 0.1, "small"); _revAll(kids, t, "line", 0.06); }
    else { parent(kids, box); _rev(box, t - 0.1, "object"); }
    L.push(box);
    L = L.concat(kids);
  }
  return L;
};

// ---- stats: 2-3 numbers that count up as they are spoken. ------------------------------------
// { title: ["Trusted at *scale.*", "trusted", "scale"],
//   items: [{ value: "99.4%", to: 99.4, decimals: 1, suffix: "%", label: "On time", at: "99.4%", until: "on" }, ...] }
LY.stats = function (c, sid, S, pal, s) {
  var Lk = _L(), A = _area(), L = [], items = s.items || [], y = A.top, n = items.length;
  if (s.title) {
    var tsz = Lk.type.head, tl = _ls(s.title);
    var ti = line_(c, tl[0], X0 - 4, y + tsz * 0.8, tsz, pal, { name: sid + " title" });
    _revLine(ti, _t(sid, tl[1] || "voice") - 0.08, tl[2] ? AT(sid, tl[2]) - 0.05 : undefined, "hero");
    L = L.concat(ti.layers);
    y += tsz * 1.6;
  }
  var rows = Lk.statsLayout == "rows";
  for (var i = 0; i < n; i++) {
    var it = items[i], t0 = i == 0 && !s.title ? _t(sid, it.at) : AT(sid, it.at), t1 = it.until ? AT(sid, it.until) : t0 + 1.0;
    if (t1 <= t0 + 0.3) t1 = t0 + 0.9;
    var size, x, yb, maxW;
    if (rows) {
      var rh = (A.bottom - y) / n; size = Math.min(Lk.type.display * 1.3, rh * 0.82); x = X0; yb = y + rh * (i + 0.8); maxW = (X1 - X0) * 0.62;
    } else {
      var cw = (X1 - X0) / n; size = Math.min(s.title ? Lk.type.display * 1.3 : Lk.type.mega * 0.75, cw * 0.5); x = X0 + i * cw + (i ? 30 : 0);
      yb = s.title ? Math.max(y + size * 0.85, A.top + (A.bottom - A.top) * 0.55) : A.top + (A.bottom - A.top) * 0.5 + size * 0.3; maxW = cw - 60;
    }
    var col = i == 0 ? pal.accent : pal.ink;
    var num = txt(c, it.value, size, FONT.display || FONT.head, col, [x - size * 0.04, yb], { tracking: Lk.track.head * 1.3, name: sid + " stat" + i });
    size = fit(num, maxW);
    num.property("ADBE Text Properties").property("ADBE Text Document").expression =
      countExpr(t0, t1, it.to, it.decimals, it.prefix, it.suffix, it.sep !== undefined ? it.sep : /\d,\d/.test(it.value));
    _rev(num, t0 - 0.1, "hero");
    L.push(num);
    if (Lk.rules || !rows) L.push(_rule(c, sid + " stat rule" + i, rows ? X0 : x, rows ? yb + 40 : yb + 44, rows ? X1 - X0 : maxW, i == 0 ? pal.accent : pal.line, t0 - 0.15, 3));
    var lab = rows
      ? line_(c, it.label, X1, yb - size * 0.05, Lk.type.sub, pal, { align: "right", maxW: (X1 - X0) * 0.36, name: sid + " stat label" + i })
      : line_(c, it.label, x, yb + 44 + Lk.type.body * 1.6, Lk.type.body * 1.15, pal, { font: FONT.body, raw: true, maxW: maxW, tracking: -5, name: sid + " stat label" + i });
    _revLine(lab, t0 + 0.1, undefined, "small");
    L = L.concat(lab.layers);
  }
  return L;
};

// ---- log: monospaced timestamp rows (tracking, changelogs, receipts) + a punch line. --------
// { rows: [["MAR 02  08:14", "Booking confirmed", "every"], ...], punch: ["Not after.", "not"], live: true }
LY.log = function (c, sid, S, pal, s) {
  var Lk = _L(), A = _area(), L = [], rows = s.rows || [], n = rows.length;
  var punchSize = s.punch ? Lk.type.display * 1.3 : 0;
  var size = Math.min(48, Math.floor((A.bottom - A.top - punchSize * 1.3) / (n * 2.0)));
  var y = A.top + size;
  for (var i = 0; i < n; i++) {
    var r = rows[i], t = i == 0 ? _t(sid, r[2] || "voice") : AT(sid, r[2] || "voice");
    var a = txt(c, r[0], size, FONT.mono, pal.ink2, [X0, y], { tracking: 30, name: sid + " time" + i });
    var b = txt(c, String(r[1]).toUpperCase(), size, FONT.mono, s.live !== false && i == n - 1 ? pal.accent : pal.ink, [X0 + (X1 - X0) * 0.32, y], { tracking: 30, name: sid + " event" + i });
    fit(b, (X1 - X0) * 0.68);
    _rev(a, t - 0.05, "small");
    _rev(b, t, "small");
    L.push(a, b);
    if (Lk.rules) L.push(_rule(c, sid + " log hr" + i, X0, y + size * 0.6, X1 - X0, pal.line, t, 2));
    y += size * 2.0;
  }
  if (s.punch) {
    var ps = _ls(s.punch);
    var pl = line_(c, ps[0], X0 - punchSize * 0.04, Math.min(A.bottom + 20, y + punchSize * 0.9), punchSize, pal, { color: pal.accent, name: sid + " punch" });
    _revLine(pl, AT(sid, ps[1]) - 0.06, undefined, "hero");
    L = L.concat(pl.layers);
  }
  return L;
};

// ---- end: wordmark, promise, call to action. Keeps moving gently, fades out at the very end. --
// { wordmark: ["Northwind", "northwind"], lines: [["Moving what matters,", "moving"], ["*on schedule.*", "on"]],
//   cta: ["Get a quote", "schedule+0.8"], footer: "Road · Air · Ocean · Rail", center: false }
LY.end = function (c, sid, S, pal, s) {
  var Lk = _L(), A = _area(), L = [], center = s.center === undefined ? !!Lk.centerEnd : s.center;
  var ax = center ? 960 : X0, al = center ? "center" : "left";
  var ws = _ls(s.wordmark), size = Lk.type.mega * (center ? 0.6 : 0.75), y = A.top + size * 0.7;
  var wm = txt(c, Lk.caps ? String(ws[0]).toUpperCase() : ws[0], size, FONT.display || FONT.head, pal.ink, [ax, y], { tracking: Lk.track.head * 1.4, name: sid + " wordmark", align: al });
  size = _fill(wm, center ? 0.8 : 0.9, Lk.type.mega * (center ? 0.6 : 0.8));
  if (!center) tr(wm, "ADBE Position").setValue([X0 - size * 0.04, y]);
  if (center) centerAnchor(wm), tr(wm, "ADBE Position").setValue([960, y - size * 0.35]);
  _rev(wm, _t(sid, ws[1] || "voice") - 0.08, "hero");
  L.push(wm);
  var lsz = Math.round(Lk.type.head * 1.0), ly = y + lsz * 1.3, lines = s.lines || [];
  for (var i = 0; i < lines.length; i++) {
    var ls = _ls(lines[i]);
    var ln = line_(c, ls[0], center ? 960 : X0, ly, lsz, pal, { align: al, name: sid + " end line" + i });
    _revLine(ln, AT(sid, ls[1] || "voice") - 0.05, ls[2] ? AT(sid, ls[2]) : undefined, "line");
    L = L.concat(ln.layers);
    ly += _y(lsz);
  }
  if (s.cta) {
    var cs = _ls(s.cta), tc = AT(sid, cs[1] || "voice");
    var bsz = Math.max(40, Lk.type.sub);
    var p = pill(c, sid + " cta", _cap(cs[0]) + "  →", [0, 0], pal.accent, pal.onAccent || pal.bg, { size: bsz, dot: false, font: FONT.head, h: bsz * 2.6 });
    if (Lk.cards != "card") p.box.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group").property(1).property("ADBE Vector Rect Roundness").setValue(Lk.cards == "outline" ? 8 : 0);
    var bx = center ? 960 : X1 - p.w / 2, by = Math.min(A.bottom - 20, ly + 40);
    tr(p.box, "ADBE Position").setValue([bx, by]);
    _rev(p.box, tc, "object");
    // gentle pulse once it has landed, so the last seconds are not a frozen frame
    tr(p.box, "ADBE Scale").expression = "var t = time - " + (tc + 0.8) + "; t > 0 ? value * (1 + 0.025 * Math.sin(t * 3.2)) : value";
    L = L.concat(p.layers);
  }
  if (s.footer) {
    var ft = txt(c, String(s.footer).toUpperCase(), Math.max(28, Lk.type.label * 1.2), FONT.mono, pal.ink2, [center ? 960 : X0, A.bottom + 40], { tracking: Lk.track.mono, align: al, name: sid + " footer" });
    _rev(ft, AT(sid, (s.cta && _ls(s.cta)[1]) || "voice") + 0.2, "small");
    L.push(ft);
  }
  // fade to the dark background over the final 0.9 s
  var fo = c.layers.addSolid(P("dark").bg, "BG " + sid + " outro fade", W_, H_, 1);
  life(fo, T.duration - 0.9, T.duration);
  keys(tr(fo, "ADBE Opacity"), [[T.duration - 0.9, 0], [T.duration - 0.1, 100]], 50);
  return L;
};

// =============================================================================================
// VISUAL layouts: an object or picture carries the scene, not just type. A film that is only
// text reads as a slide deck, so at least a third of the scenes should use one of these (or a
// custom visual scene). Their layers are named "... VIS ..." so `ec.py qa` can count them.
// =============================================================================================

// A tile in the look's card style (rounded card, outlined panel, flat block, or ruled square).
function _tile(c, name, w, h, pal, hot, pos, round) {
  var Lk = _L(), st = Lk.cards, r = round ? Math.min(w, h) / 2 : st == "card" ? Math.min(w, h) * 0.22 : st == "outline" ? 10 : 0;
  var l = shp(c, name, pos), fill, stroke = null;
  if (st == "outline") { fill = pal.bg; stroke = hot ? pal.accent : pal.line; }
  else if (st == "block") fill = hot ? pal.accent : pal.ink;
  else if (st == "rule") { fill = hot ? pal.accent : pal.bg; stroke = hot ? null : pal.ink; }
  else { fill = hot ? pal.accent : pal.card; stroke = hot ? null : pal.line; }
  shp.add(l, { rect: [w, h, r] }, { fill: fill });
  if (stroke) shp.add(l, { rect: [w, h, r] }, { stroke: stroke, w: st == "rule" ? 4 : 3 });
  return l;
}
// Colour of a glyph drawn on a _tile.
function _onTile(pal, hot) {
  var st = _L().cards;
  if (hot && st != "outline") return pal.onAccent || pal.bg;
  if (st == "block") return pal.bg;
  return hot ? pal.accent : pal.ink;
}
// Draw a glyph on (its strokes trace in), with a small pop.
function _drawOn(g, t) {
  var tp = g.property("ADBE Root Vectors Group").addProperty("ADBE Vector Filter - Trim");
  keys(tp.property("ADBE Vector Trim End"), [[t, 0], [t + 0.6, 100]], 70);
  fadeIn(g, t, 0.1);
}

// ---- icons: 2-4 objects, each a drawn pictogram + a label, landing on their words. ------------
// { title: ["Everything on *one phone.*", "everything", "one"],
//   items: [{ icon: "card", label: "Cards", at: "card", note: "Visa · Mastercard · Verve" }, { icon: "bank", label: "Transfers", at: "transfer" }] }
// Glyphs: phone card bank cash clock check tick shop bolt chart truck box pin lock user people chat globe send star plane doc
LY.icons = function (c, sid, S, pal, s) {
  var Lk = _L(), A = _area(), L = [], items = s.items || [], n = items.length, y = A.top - 20;
  if (s.title) {
    var tl = _ls(s.title), tsz = _grow(c, [tl[0]], Lk.type.head, pal, Lk.type.display);
    var ti = line_(c, tl[0], X0 - 4, y + tsz * 0.8, tsz, pal, { name: sid + " title" });
    _revLine(ti, _t(sid, tl[1] || "voice") - 0.08, tl[2] ? AT(sid, tl[2]) - 0.05 : undefined, "hero");
    L = L.concat(ti.layers);
    y += tsz * 1.45;
  }
  var gap = 48, cw = (X1 - X0 - gap * (n - 1)) / n, anyNote = false;
  for (var q = 0; q < n; q++) if (items[q].note) anyNote = true;
  var labSize = Math.min(Math.round(Lk.type.sub * 1.25), Math.floor(cw / 6));
  var room = A.bottom + 40 - y, tile = Math.min(cw * 0.75, 330, room - labSize * 1.6 - (anyNote ? 60 : 0) - 50);
  var h = tile + 50 + labSize * 1.1 + (anyNote ? 60 : 0), top = y + Math.max(0, room - h) * 0.6;
  for (var i = 0; i < n; i++) {
    var it = items[i], x = X0 + i * (cw + gap), cx = x + tile / 2, cy = top + tile / 2;
    var hot = it.hot !== undefined ? it.hot : (s.hot !== undefined ? s.hot == i : false);
    var t = i == 0 && !s.title ? _t(sid, it.at || "voice") : AT(sid, it.at || "voice");
    var box = _tile(c, sid + " VIS tile" + i, tile, tile, pal, hot, [cx, cy]);
    _rev(box, t - 0.12, "object");
    var g = glyph(c, it.icon, tile * 0.52, _onTile(pal, hot), [cx, cy], { name: sid + " VIS glyph" + i, weight: 6 });
    _drawOn(g, t);
    L.push(box, g);
    var lab = line_(c, it.label, x, top + tile + 50 + labSize * 0.8, labSize, pal, { maxW: cw, name: sid + " icon label" + i });
    _revLine(lab, t + 0.05, undefined, "line");
    L = L.concat(lab.layers);
    if (it.note) {
      var nt = line_(c, it.note, x, top + tile + 50 + labSize * 0.8 + 58, Math.max(30, Lk.type.body), pal, { font: FONT.body, color: pal.ink2, raw: true, tracking: -5, maxW: cw, name: sid + " icon note" + i });
      _revLine(nt, t + 0.2, undefined, "small");
      L = L.concat(nt.layers);
    }
  }
  return L;
};

// ---- flow: 2-4 stops joined by a line that fills as each one is spoken (customer -> phone -> bank,
// warehouse -> port -> door, upload -> check -> live). The last stop is the destination (accent).
// { title: ["Paid by card. *Banked today.*", "paid", "banked"],
//   nodes: [{ icon: "user", label: "Customer pays", at: "customer" }, { icon: "phone", label: "Your phone", at: "phone" },
//           { icon: "bank", label: "Your bank", at: "bank", note: "Same day" }] }
LY.flow = function (c, sid, S, pal, s) {
  var Lk = _L(), A = _area(), L = [], nodes = s.nodes || [], n = nodes.length, y = A.top - 20;
  if (s.title) {
    var tl = _ls(s.title), tsz = _grow(c, [tl[0]], Lk.type.head, pal, Lk.type.display);
    var ti = line_(c, tl[0], X0 - 4, y + tsz * 0.8, tsz, pal, { name: sid + " title" });
    _revLine(ti, _t(sid, tl[1] || "voice") - 0.08, tl[2] ? AT(sid, tl[2]) - 0.05 : undefined, "hero");
    L = L.concat(ti.layers);
    y += tsz * 1.4;
  }
  var D = Math.min(260, (X1 - X0) / (n * 1.6)), labSize = Math.min(Math.round(Lk.type.sub * 1.2), 70);
  var room = A.bottom + 40 - y, h = D + 60 + labSize * 2.2, cy = y + Math.max(0, room - h) * 0.55 + D / 2;
  var xs = [], times = [];
  for (var i = 0; i < n; i++) {
    xs.push(n == 1 ? X0 + D / 2 : X0 + D / 2 + i * (X1 - X0 - D) / (n - 1));
    times.push(i == 0 && !s.title ? _t(sid, nodes[i].at || "voice") : AT(sid, nodes[i].at || "voice"));
  }
  // track (quiet) + progress (accent) under the nodes
  var base = path(c, sid + " VIS track", [[xs[0], cy], [xs[n - 1], cy]], pal.line, 8);
  fadeIn(base, times[0] - 0.1, 0.3);
  var prog = path(c, sid + " VIS progress", [[xs[0], cy], [xs[n - 1], cy]], pal.accent, 8);
  var tp = prog.property("ADBE Root Vectors Group").addProperty("ADBE Vector Filter - Trim"), kk = [[times[0], 0]];
  for (var k = 1; k < n; k++) kk.push([times[k], 100 * k / (n - 1)]);
  keys(tp.property("ADBE Vector Trim End"), kk, 60);
  L.push(base, prog);
  for (var j = 0; j < n; j++) {
    var nd = nodes[j], last = j == n - 1, hot = nd.hot !== undefined ? nd.hot : last;
    var box = _tile(c, sid + " VIS node" + j, D, D, pal, hot, [xs[j], cy], true);
    _rev(box, times[j] - 0.12, "object");
    var g = glyph(c, nd.icon, D * 0.5, _onTile(pal, hot), [xs[j], cy], { name: sid + " VIS glyph" + j, weight: 6 });
    _drawOn(g, times[j]);
    L.push(box, g);
    var al = n == 1 ? "left" : j == 0 ? "left" : last ? "right" : "center";
    var lx = al == "left" ? xs[j] - D / 2 : al == "right" ? xs[j] + D / 2 : xs[j];
    var lab = line_(c, nd.label, lx, cy + D / 2 + 60 + labSize * 0.8, labSize, pal, { align: al, maxW: (X1 - X0) / n - 20, name: sid + " node label" + j });
    _revLine(lab, times[j] + 0.05, undefined, "line");
    L = L.concat(lab.layers);
    if (nd.note) {
      var nt = line_(c, nd.note, lx, cy + D / 2 + 60 + labSize * 0.8 + labSize * 1.05, Math.max(30, Lk.type.body), pal,
        { font: FONT.mono, color: hot ? readable(pal.accent, pal.bg, 4.5) : pal.ink2, align: al, raw: true, maxW: (X1 - X0) / n - 20, name: sid + " node note" + j });
      _revLine(nt, times[j] + 0.25, undefined, "small");
      L = L.concat(nt.layers);
    }
  }
  return L;
};

// ---- bars: 2-4 bars that grow as they are spoken (fees, waiting time, before/after). ------------
// w = bar length from 0 to 1. The "hot" bar (default: the last) is the brand's, in the accent colour.
// { title: ["Keep *more* of every sale.", "keep", "more"],
//   bars: [{ label: "Card machine", value: "2.5%", w: 1.0, at: "machine" }, { label: "Tapnest", value: "0.8%", w: 0.32, at: "tapnest" }] }
LY.bars = function (c, sid, S, pal, s) {
  var Lk = _L(), A = _area(), L = [], bars = s.bars || [], n = bars.length, y = A.top - 20;
  if (s.title) {
    var tl = _ls(s.title), tsz = _grow(c, [tl[0]], Lk.type.head, pal, Lk.type.display);
    var ti = line_(c, tl[0], X0 - 4, y + tsz * 0.8, tsz, pal, { name: sid + " title" });
    _revLine(ti, _t(sid, tl[1] || "voice") - 0.08, tl[2] ? AT(sid, tl[2]) - 0.05 : undefined, "hero");
    L = L.concat(ti.layers);
    y += tsz * 1.3;
  }
  var room = A.bottom + 40 - y, rowH = Math.min(230, room / n), barH = Math.round(rowH * 0.42), labSize = Math.min(Math.round(Lk.type.sub * 1.05), Math.round(rowH * 0.26));
  var full = (X1 - X0) * 0.74, valSize = Math.round(Math.min(barH * 1.15, Lk.type.head));
  var top = y + Math.max(0, room - rowH * n) * 0.6, st = Lk.cards, r = st == "card" ? barH / 2 : st == "outline" ? 6 : 0;
  for (var i = 0; i < n; i++) {
    var b = bars[i], hot = b.hot !== undefined ? b.hot : i == n - 1;
    var t = i == 0 && !s.title ? _t(sid, b.at || "voice") : AT(sid, b.at || "voice");
    var ly = top + i * rowH + labSize, by = ly + 22 + barH / 2, w = Math.max(barH, full * Math.min(1, b.w));
    var lab = line_(c, b.label, X0, ly, labSize, pal, { font: FONT.body, color: hot ? pal.ink : pal.ink2, raw: true, tracking: -10, name: sid + " bar label" + i });
    _revLine(lab, t - 0.1, undefined, "small");
    L = L.concat(lab.layers);
    var bar = rect(c, sid + " VIS bar" + i, w, barH, r, hot ? pal.accent : (st == "block" ? pal.ink : pal.ink2), [X0, by], { leftAnchor: true });
    keys(tr(bar, "ADBE Scale"), [[t, [0, 100]], [t + 0.8, [100, 100]]], 85);
    fadeIn(bar, t, 0.1);
    L.push(bar);
    var vl = txt(c, Lk.caps ? String(b.value).toUpperCase() : b.value, valSize, FONT.display || FONT.head, hot ? pal.accent : pal.ink, [X0 + w + 34, by + valSize * 0.36],
      { tracking: Lk.track.head, name: sid + " bar value" + i });
    fit(vl, X1 - (X0 + w + 34));
    _rev(vl, t + 0.55, "line");
    L.push(vl);
  }
  return L;
};

// ---- phone: a phone with the product on screen (payment, order, tracking) + a headline beside it.
// The screen is always light, whatever the scene background, like a real app.
// { lines: [["Your phone", "your"], ["is the *terminal.*", "is", "terminal"]], sub: ["No machine to rent.", "machine"], side: "right",
//   screen: { app: "Tapnest", label: "Payment received", amount: { value: "₦25,000", to: 25000, prefix: "₦", at: "paid", until: "paid+0.8" },
//             rows: [["Card · Mama Ngozi", "+₦4,500", "card"], ["Transfer · Tunde", "+₦12,000", "transfer"]] } }
LY.phone = function (c, sid, S, pal, s) {
  var Lk = _L(), L = [], side = s.side || "right", sc = s.screen || {};
  var PW = 430, PH = 880, cx = side == "right" ? X1 - PW / 2 - 10 : X0 + PW / 2, cy = 560 + 20;
  var t0 = _t(sid, s.at || "in"); // the phone arrives with the cut
  var body = [0.07, 0.075, 0.085], scr = [0.975, 0.972, 0.965], sInk = [0.06, 0.08, 0.1], sInk2 = [0.38, 0.41, 0.45];
  var sAcc = readable(COL.accent, scr, 3), sAccText = readable(COL.accent, scr, 4.5), sLine = [0.88, 0.875, 0.865];
  var dev = shp(c, sid + " VIS device", [cx, cy]);
  shp.add(dev, { rect: [PW, PH, 68] }, { fill: body });
  if (lumOf(pal.bg) < 0.1) shp.add(dev, { rect: [PW, PH, 68] }, { stroke: pal.ink2, w: 3 });
  var screen = shp(c, sid + " VIS screen", [cx, cy]);
  shp.add(screen, { rect: [PW - 34, PH - 34, 52] }, { fill: scr });
  shp.add(screen, { rect: [120, 30, 15, 0, -PH / 2 + 44] }, { fill: body });
  var kids = [screen], x0 = cx - PW / 2 + 52, x1 = cx + PW / 2 - 52, y0 = cy - PH / 2;
  if (sc.app) kids.push(txt(c, sc.app, 34, FONT.bold || FONT.head, sInk, [x0, y0 + 128], { tracking: -20, name: sid + " screen app" }));
  kids.push(txt(c, sc.time || "TODAY", 22, FONT.mono, sInk2, [x1, y0 + 124], { align: "right", tracking: 80, name: sid + " screen time" }));
  var tAmt = sc.amount ? AT(sid, sc.amount.at || "voice") : t0 + 0.8;
  var badge = circle(c, sid + " VIS screen badge", 92, sAcc, [x0 + 46, y0 + 236]);
  var tk = glyph(c, "tick", 52, [1, 1, 1], [x0 + 46, y0 + 236], { name: sid + " VIS screen tick", weight: 9 });
  if (sc.label) {
    var lb = txt(c, sc.label, 30, FONT.body, sInk2, [x0, y0 + 340], { tracking: -5, name: sid + " screen label" });
    fit(lb, x1 - x0); kids.push(lb);
  }
  var amt = null;
  if (sc.amount) {
    var A2 = sc.amount;
    amt = txt(c, A2.value, 84, FONT.display || FONT.head, sInk, [x0 - 4, y0 + 432], { tracking: -30, name: sid + " screen amount" });
    fit(amt, x1 - x0);
    if (A2.to !== undefined) {
      var tu = AT(sid, A2.until || (A2.at || "voice") + "+0.9");
      amt.property("ADBE Text Properties").property("ADBE Text Document").expression =
        countExpr(tAmt, Math.max(tu, tAmt + 0.5), A2.to, A2.decimals, A2.prefix, A2.suffix, A2.sep !== undefined ? A2.sep : /\d,\d/.test(A2.value));
    }
    kids.push(amt);
  }
  var rows = sc.rows || [], ry = y0 + 520, rowKids = [];
  for (var i = 0; i < rows.length && i < 4; i++) {
    var rw = rows[i], tr0 = AT(sid, rw[2] || "voice");
    var hr = rect(c, sid + " VIS screen hr" + i, x1 - x0, 2, 0, sLine, [(x0 + x1) / 2, ry]);
    var a = txt(c, rw[0], 29, FONT.body, sInk, [x0, ry + 58], { tracking: -5, name: sid + " screen row" + i });
    fit(a, (x1 - x0) * 0.62);
    var b2 = txt(c, rw[1], 29, FONT.head, rw[1].charAt(0) == "+" ? sAccText : sInk, [x1, ry + 58], { align: "right", tracking: -5, name: sid + " screen val" + i });
    rowKids.push([hr, a, b2, tr0]);
    kids.push(hr, a, b2);
    ry += 96;
  }
  // parent everything to the device so it moves as one object; badge + tick last so they sit on top
  // screen content hangs off the screen (QA reads text contrast against its parent's fill), the screen off the device
  kids.push(badge, tk);
  parent(kids.slice(1), screen);
  parent([screen], dev);
  // motion: the phone rises in, then floats; the payment lands on its word; rows slide in on theirs
  fadeUp(dev, t0, 180, 0.9);
  tr(dev, "ADBE Position").expression = "value + [0, Math.sin((time - " + t0 + ") * 1.1) * 7]";
  popIn(badge, tAmt - 0.1, 0.45);
  _drawOn(tk, tAmt + 0.1);
  if (amt) fadeIn(amt, tAmt - 0.15, 0.2);
  for (var r = 0; r < rowKids.length; r++) for (var m = 0; m < 3; m++) {
    var rk = rowKids[r][m], p = tr(rk, "ADBE Position").value;
    keys(tr(rk, "ADBE Position"), [[rowKids[r][3] - 0.05, [p[0] + 40, p[1]]], [rowKids[r][3] + 0.45, p]], 90);
    fadeIn(rk, rowKids[r][3] - 0.05, 0.25);
  }
  L.push(dev);
  L = L.concat(kids);
  // the headline column beside the phone
  var colX = side == "right" ? X0 : X0 + PW + 110, colW = (X1 - X0) - PW - 130, lines = s.lines || [];
  var size = _grow(c, lines, Lk.type.display, pal, Lk.type.display * 1.15, colW);
  var subSize = Math.round(Lk.type.sub * 1.05);
  size = Math.min(size, Math.floor((700 - (s.sub ? subSize * 1.8 : 0)) / (lines.length * (Lk.lead || 1))));
  var h = lines.length * _y(size) + (s.sub ? subSize * 1.8 : 0);
  var yy = cy - h / 2 + size * 0.78 + 20;
  for (var j = 0; j < lines.length; j++) {
    var ls = _ls(lines[j]), ln = line_(c, ls[0], colX - size * 0.04, yy, size, pal, { maxW: colW, name: sid + " line" + j });
    _revLine(ln, AT(sid, ls[1] || "voice") - 0.08, ls[2] ? AT(sid, ls[2]) - 0.05 : undefined, "hero");
    L = L.concat(ln.layers);
    yy += _y(size);
  }
  if (s.sub) {
    var ss = _ls(s.sub), sub = line_(c, ss[0], colX, yy + subSize * 0.5 - size * 0.12, subSize, pal, { font: FONT.body, color: pal.ink2, raw: true, tracking: -10, maxW: colW, name: sid + " sub" });
    _revLine(sub, AT(sid, ss[1] || "voice"), undefined, "small");
    L = L.concat(sub.layers);
  }
  return L;
};
