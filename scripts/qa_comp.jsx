// Composition QA. Runs inside EffectCraft (no render needed). Needs COMP from lib.jsx;
// uses T (timing.jsx) when present. Prints FAIL/WARN lines and a summary.
// Checks: dead frames, overlapping text, text that vanishes before its scene ends,
// wipes not on top, duplicate layers (double rebuilds), tiny text, text outside the safe area.

(function () {
  var c = comp();
  var out = [];
  var nFail = 0, nWarn = 0;
  function FAIL(m) { out.push("FAIL " + m); nFail++; }
  function WARN(m) { out.push("WARN " + m); nWarn++; }
  function f2(x) { return Math.round(x * 100) / 100; }

  var STEP = 0.1;
  var DUR = c.duration;
  var SAFE = 0.04; // 4% safe margin

  // Background = named like one, or a non-text layer that spans most of the piece (grids, glows).
  var BG_RE = /(^|[\s_\-])(bg|background|backdrop|grid|vignette|glow|noise|gradient|blob|texture|outro|end ?fade|fade ?(to|out|in)\b)/i;
  function kind(l) {
    if (/^wipe/i.test(l.name)) return "wipe";
    if (/soundtrack|\.wav$|\.mp3$/i.test(l.name)) return "audio";
    if (l.nullLayer) return "null";
    var isText = false;
    try { isText = !!l.property("ADBE Text Properties"); } catch (e) {}
    if (isText) return "text";
    if (BG_RE.test(l.name) || (l.outPoint - l.inPoint) > c.duration * 0.4) return "bg";
    return "shape";
  }
  var layers = [];
  for (var i = 1; i <= c.numLayers; i++) {
    var l = c.layer(i);
    layers.push({ l: l, idx: i, k: kind(l), name: l.name, inP: l.inPoint, outP: l.outPoint });
  }

  function chainScale(l, t) {
    var s = 1, p = l;
    while (p) {
      var v = tr(p, "ADBE Scale").valueAtTime(t, false);
      s *= Math.abs(v[0]) / 100;
      p = p.parent;
    }
    return s;
  }
  function visible(L, t, minOpacity) {
    if (t < L.inP || t >= L.outP) return false;
    if (!L.l.enabled) return false;
    var o = tr(L.l, "ADBE Opacity").valueAtTime(t, false);
    if (o < (minOpacity || 4)) return false;
    if (chainScale(L.l, t) < 0.03) return false;
    return true;
  }
  // Axis-aligned comp-space box of a layer (rotation ignored), following the parent chain.
  function box(L, t) {
    var r = L.l.sourceRectAtTime(t, false);
    var pts = [[r.left, r.top], [r.left + r.width, r.top + r.height]];
    var p = L.l;
    while (p) {
      var pos = tr(p, "ADBE Position").valueAtTime(t, false);
      var an = tr(p, "ADBE Anchor Point").valueAtTime(t, false);
      var sc = tr(p, "ADBE Scale").valueAtTime(t, false);
      for (var k = 0; k < 2; k++) {
        pts[k] = [pos[0] + (pts[k][0] - an[0]) * sc[0] / 100, pos[1] + (pts[k][1] - an[1]) * sc[1] / 100];
      }
      p = p.parent;
    }
    return { x0: Math.min(pts[0][0], pts[1][0]), y0: Math.min(pts[0][1], pts[1][1]),
             x1: Math.max(pts[0][0], pts[1][0]), y1: Math.max(pts[0][1], pts[1][1]) };
  }
  // A wipe only hides the frame where it actually is: count it as covering when >= 60% of the
  // frame is under a wipe panel (early/late in its move it is just a strip).
  function inWipe(t) {
    var best = 0;
    for (var i = 0; i < layers.length; i++) {
      var Lw = layers[i];
      if (Lw.k != "wipe" || t < Lw.inP || t >= Lw.outP) continue;
      try {
        var b = box(Lw, t);
        var cov = Math.max(0, Math.min(b.x1, c.width) - Math.max(b.x0, 0)) / c.width;
        if (cov > best) best = cov;
      } catch (e) { best = 1; }
    }
    return best >= 0.6;
  }

  // 1. Wipes must be the top-most layers.
  var lowestWipe = 0, firstNonWipe = 99999;
  for (var a = 0; a < layers.length; a++) {
    if (layers[a].k == "wipe") lowestWipe = Math.max(lowestWipe, layers[a].idx);
    else if (layers[a].k == "text" || layers[a].k == "shape") firstNonWipe = Math.min(firstNonWipe, layers[a].idx);
  }
  if (lowestWipe && firstNonWipe < lowestWipe) FAIL("layer order: '" + c.layer(firstNonWipe).name + "' (#" + firstNonWipe + ") is above wipe layers. Re-run wipes.jsx after rebuilding scenes.");

  // 2. Duplicates (same name + same in/out = a scene was built twice).
  var seen = {};
  for (var d = 0; d < layers.length; d++) {
    var key = layers[d].name + "|" + f2(layers[d].inP) + "|" + f2(layers[d].outP);
    seen[key] = (seen[key] || 0) + 1;
  }
  var dupCount = 0, dupEx = "";
  for (var kk in seen) if (seen[kk] > 1) { dupCount++; if (!dupEx) dupEx = kk.split("|")[0]; }
  if (dupCount) FAIL(dupCount + " duplicated layer(s), e.g. '" + dupEx + "'. A scene was built twice: clearRange() it and rebuild once.");

  // 3. Dead frames: no visible content (only background) outside wipes.
  var runStart = -1;
  for (var t = 0; t <= DUR + 0.001; t += STEP) {
    var any = false;
    if (t < DUR && !inWipe(t)) {
      for (var j = 0; j < layers.length && !any; j++) {
        var L = layers[j];
        // content at < 25% opacity (mid fade) reads as an empty frame, and so does a frame holding only
        // hairline rules or small labels: real content must cover >= 0.5% of the frame
        if ((L.k == "text" || L.k == "shape") && visible(L, t, 25)) {
          var bb = null;
          try { bb = box(L, t); } catch (e) {}
          if (!bb || (bb.x1 - bb.x0) * (bb.y1 - bb.y0) >= c.width * c.height * 0.005) any = true;
        }
      }
    } else any = true;
    if (!any && t > 0.6 && t < DUR - 1.2) { if (runStart < 0) runStart = t; }
    else if (runStart >= 0) {
      var len = t - runStart;
      var msg = "dead frames " + f2(runStart) + "-" + f2(t) + "s: only background (or hairlines/small labels) on screen (" + f2(len) + "s). Keep content alive until the wipe covers it, and start the next scene's first element within 0.3s of the cut.";
      if (len >= 1.0) FAIL(msg); else if (len >= 0.5) WARN(msg);
      runStart = -1;
    }
  }

  // 4. Text vanishing long before its scene ends (e.g. a count-up's final value).
  // Scene cuts = wipe start + 0.42 (when the wipe fully covers), plus the end of the piece.
  var cuts = [];
  for (var w = 0; w < layers.length; w++) if (layers[w].k == "wipe" && !/^wipe b/i.test(layers[w].name)) cuts.push(layers[w].inP + 0.42);
  cuts.push(DUR);
  cuts.sort(function (p, q) { return p - q; });
  var vanish = {};
  for (var v = 0; v < layers.length; v++) {
    var T1 = layers[v];
    if (T1.k != "text") continue;
    var lastVis = -1;
    for (var tt = T1.inP; tt < Math.min(T1.outP, DUR); tt += STEP) if (visible(T1, tt)) lastVis = tt;
    if (lastVis < 0) continue;
    var cut = DUR;
    for (var q = 0; q < cuts.length; q++) if (cuts[q] >= lastVis - 0.3) { cut = cuts[q]; break; }
    var gap = cut - lastVis;
    if (gap > 0.8) {
      var group = T1.name.replace(/[\s_-]*\d+([\s_-]+\d+)*$/, "");
      if (!vanish[group]) vanish[group] = { n: 0, t: lastVis, gap: gap, ex: T1.name };
      vanish[group].n++;
      if (lastVis > vanish[group].t) { vanish[group].t = lastVis; vanish[group].gap = gap; vanish[group].ex = T1.name; }
    }
  }
  for (var gname in vanish) {
    var V = vanish[gname];
    WARN("text '" + V.ex + "'" + (V.n > 1 ? " (+" + (V.n - 1) + " similar)" : "") + " is gone at " + f2(V.t) + "s, " + f2(V.gap) +
      "s before its scene cuts. Fine if replaced on purpose; a BUG if it is a final number/headline.");
  }

  // 5. Overlapping text, tiny text, text outside the safe area (sampled every 0.25s).
  var pairs = {}, tiny = {}, unsafe = {};
  for (var ts = 0; ts < DUR; ts += 0.25) {
    if (inWipe(ts)) continue;
    var vis = [];
    for (var m = 0; m < layers.length; m++) {
      var Lm = layers[m];
      if (Lm.k != "text" || !visible(Lm, ts)) continue;
      var bx;
      try { bx = box(Lm, ts); } catch (e) { continue; }
      if (bx.x1 - bx.x0 < 2) continue;
      vis.push({ L: Lm, b: bx });
      // tiny text: track the LARGEST rendered size (pop-ins start small on purpose)
      try {
        var fs = Lm.l.property("ADBE Text Properties").property("ADBE Text Document").valueAtTime(ts, false).fontSize;
        var eff = fs * chainScale(Lm.l, ts) * (1080 / Math.min(c.width, c.height));
        if (!(Lm.name in tiny) || eff > tiny[Lm.name]) tiny[Lm.name] = eff;
      } catch (e2) {}
      var mx = c.width * SAFE, my = c.height * SAFE;
      if ((bx.x0 < mx || bx.y0 < my || bx.x1 > c.width - mx || bx.y1 > c.height - my) && !unsafe[Lm.name]) {
        var o = tr(Lm.l, "ADBE Opacity").valueAtTime(ts, false);
        if (o > 90) unsafe[Lm.name] = f2(ts);
      }
    }
    for (var x = 0; x < vis.length; x++) for (var y = x + 1; y < vis.length; y++) {
      var A = vis[x].b, B = vis[y].b;
      var iw = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0), ih = Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0);
      if (iw <= 0 || ih <= 0) continue;
      var small = Math.min((A.x1 - A.x0) * (A.y1 - A.y0), (B.x1 - B.x0) * (B.y1 - B.y0));
      if (iw * ih / small < 0.12) continue;
      var top = vis[x].L.idx < vis[y].L.idx ? vis[x].L : vis[y].L;
      var bot = top === vis[x].L ? vis[y].L : vis[x].L;
      // a faint decorative layer UNDER solid text is fine (ghost numbers); on top it is a bug
      if (tr(bot.l, "ADBE Opacity").valueAtTime(ts, false) < 30) continue;
      var pk = vis[x].L.name + " <> " + vis[y].L.name;
      if (!pairs[pk]) pairs[pk] = { t: ts, n: 0, top: top.name };
      pairs[pk].n++;
    }
  }
  // 3+ samples (>= 0.75s) = a real collision; shorter = a crossfade swap, which is fine.
  for (var pk2 in pairs) if (pairs[pk2].n >= 3) FAIL("text overlap: " + pk2 + " from " + f2(pairs[pk2].t) + "s for ~" + f2(pairs[pk2].n * 0.25) + "s ('" + pairs[pk2].top + "' is on top). Move one, or placeBelow() a decorative ghost layer.");
  for (var tn in tiny) if (tiny[tn] < 18) WARN("tiny text: '" + tn + "' is at most ~" + f2(tiny[tn]) + "px at 1080p (keep labels >= 18px, body copy >= 26px)");
  for (var un in unsafe) WARN("outside safe area: '" + un + "' at " + unsafe[un] + "s");

  // 6. Timeline coverage (when timing.jsx is loaded).
  if (typeof T !== "undefined") {
    for (var sid in T.scenes) {
      var S = T.scenes[sid], cnt = 0;
      for (var z = 0; z < layers.length; z++) if (layers[z].k != "wipe" && layers[z].k != "audio" && Math.abs(layers[z].inP - S["in"]) < 0.05) cnt++;
      if (cnt == 0) FAIL("scene " + sid + " (" + S["in"] + "-" + S.out + "s) has no layers starting at its in-point. Built? lifeAll() called?");
    }
  }

  // 7. DESIGN checks: the habits that make a video look generated (see references/looks.md).
  function lin(v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function lum(k) { return 0.2126 * lin(k[0]) + 0.7152 * lin(k[1]) + 0.0722 * lin(k[2]); }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function bgAt(t) { // the top-most visible background solid
    for (var i = 0; i < layers.length; i++) {
      var Lb = layers[i];
      if (!/^bg /i.test(Lb.name) || !visible(Lb, t, 50)) continue;
      try { var col = Lb.l.source.mainSource.color; if (col) return col; } catch (e) {}
    }
    return null;
  }
  // fill colour of a shape layer (a card or pill a text layer is parented to), else null
  function fillOf(l) {
    try {
      var root = l.property("ADBE Root Vectors Group");
      for (var g = 1; g <= root.numProperties; g++) {
        var vs = root.property(g).property("ADBE Vectors Group");
        for (var k = 1; k <= vs.numProperties; k++) if (vs.property(k).matchName == "ADBE Vector Graphic - Fill") return vs.property(k).property("ADBE Vector Fill Color").value;
      }
    } catch (e) {}
    return null;
  }
  var spans = [];
  if (typeof T !== "undefined") { for (var sid2 in T.scenes) spans.push([T.scenes[sid2]["in"], T.scenes[sid2].out, sid2]); }
  else { var prev = 0; for (var q2 = 0; q2 < cuts.length; q2++) { spans.push([prev, cuts[q2], "cut " + (q2 + 1)]); prev = cuts[q2]; } }
  // A scene is "visual" when a picture or object carries it: a layer named "... VIS ..." (the visual
  // layouts and custom scenes name them so) or an image/video layer.
  function isVisual(L) {
    if (L.k == "text" || L.k == "wipe" || L.k == "audio") return false;
    if (/(^|\s)VIS(\s|$)/.test(L.name)) return true;
    try { var ms = L.l.source.mainSource; if (ms && ms.color === undefined && /\.(png|jpe?g|webp|mp4|mov|webm|gif)$/i.test(L.l.source.name)) return true; } catch (e) {}
    return false;
  }
  var lowC = {}, bgs = {}, centred = 0, textCount = 0, nVisual = 0, textOnly = [];
  for (var sp = 0; sp < spans.length; sp++) {
    var a0 = spans[sp][0], b0 = spans[sp][1], nm = spans[sp][2];
    var ts2 = Math.min(a0 + (b0 - a0) * 0.8, b0 - 0.25);
    var bgc = bgAt(ts2);
    if (bgc) bgs[Math.round(bgc[0] * 20) + "," + Math.round(bgc[1] * 20) + "," + Math.round(bgc[2] * 20)] = 1;
    var hero = 0, ux0 = 99999, uy0 = 99999, ux1 = -1, uy1 = -1, sizes = {}, nSizes = 0;
    for (var m2 = 0; m2 < layers.length; m2++) {
      var Lt = layers[m2];
      if (Lt.k != "text" || !visible(Lt, ts2, 60)) continue;
      var bt, doc;
      try { bt = box(Lt, ts2); doc = Lt.l.property("ADBE Text Properties").property("ADBE Text Document").valueAtTime(ts2, false); } catch (e4) { continue; }
      if (bt.x1 - bt.x0 < 2) continue;
      var eff2 = doc.fontSize * chainScale(Lt.l, ts2) * (1080 / Math.min(c.width, c.height));
      if (eff2 > hero) hero = eff2;
      ux0 = Math.min(ux0, bt.x0); uy0 = Math.min(uy0, bt.y0); ux1 = Math.max(ux1, bt.x1); uy1 = Math.max(uy1, bt.y1);
      var sk = Math.round(eff2 / 10);
      if (eff2 >= 28 && !sizes[sk]) { sizes[sk] = 1; nSizes++; }
      if (eff2 >= 40) { textCount++; if (Math.abs((bt.x0 + bt.x1) / 2 - c.width / 2) < c.width * 0.016) centred++; }
      var under = (Lt.l.parent && fillOf(Lt.l.parent)) || bgc;
      if (under && doc.fillColor) {
        var cr = contrast(doc.fillColor, under), need = eff2 >= 40 ? 3 : 4.5, hard = eff2 >= 40 ? 2 : 2.5;
        if (cr < need && (!lowC[Lt.name] || cr < lowC[Lt.name].cr)) lowC[Lt.name] = { cr: cr, t: ts2, hard: cr < hard, px: eff2 };
      }
    }
    var visual = false;
    for (var m3 = 0; m3 < layers.length; m3++) {
      var Lv = layers[m3];
      if (!isVisual(Lv) || !visible(Lv, ts2, 50)) continue;
      visual = true;
      try { var bv = box(Lv, ts2); ux0 = Math.min(ux0, bv.x0); uy0 = Math.min(uy0, bv.y0); ux1 = Math.max(ux1, bv.x1); uy1 = Math.max(uy1, bv.y1); } catch (e6) {}
    }
    if (visual) nVisual++; else textOnly.push(nm);
    if (ux1 < 0) continue;
    if (hero < 90 && !visual) WARN("scene " + nm + ": no hero element - the biggest text is ~" + Math.round(hero) + "px at 1080p. Each scene needs one thing >= 100px (headline, number or wordmark) that owns the frame.");
    var cover = (ux1 - ux0) * (uy1 - uy0) / (c.width * c.height);
    if (cover < 0.18) WARN("scene " + nm + ": the content covers only " + Math.round(cover * 100) + "% of the frame at " + f2(ts2) + "s - small type floating in an empty frame looks generated. Use bigger type or a layout (layouts grow text to fill).");
    if (nSizes > 5) WARN("scene " + nm + ": " + nSizes + " different text sizes on screen - use the look's type scale (3-4 sizes per scene).");
  }
  for (var lc in lowC) {
    var Lc = lowC[lc], msg2 = "low contrast: '" + lc + "' (~" + Math.round(Lc.px) + "px) is " + f2(Lc.cr) + ":1 against its background at " + f2(Lc.t) + "s (need >= " + (Lc.px >= 40 ? 3 : 4.5) + ":1). Use the palette's ink/ink2 for that background (P(kind)).";
    if (Lc.hard) FAIL(msg2); else WARN(msg2);
  }
  if (textCount > 8 && centred / textCount > 0.6) WARN(Math.round(centred / textCount * 100) + "% of the text is centred. Centre only wordmarks and single statements; left-aligned layouts on a grid read as designed, everything centred reads as a template.");
  if (spans.length >= 4 && nVisual < Math.ceil(spans.length / 3))
    WARN((nVisual ? "only " + nVisual + " of " + spans.length : "none of the " + spans.length) + " scenes is visual (text-only: " + textOnly.join(" ") +
      "). A film of only words reads as a slide deck. Make at least " + Math.ceil(spans.length / 3) +
      " visual: layouts phone / icons / flow / bars, or a custom scene with an image or drawn object (name its layers \"... VIS ...\").");
  var nb = 0; for (var bk in bgs) nb++;
  if (spans.length >= 5 && nb == 1) WARN("every scene has the same background colour. Alternate light / dark / accent scenes (set \"bg\" per scene in timeline.json) so cuts read as chapters.");
  for (var bl = 0; bl < layers.length; bl++) {
    var Lg = layers[bl];
    if (Lg.k == "text" || Lg.k == "audio") continue;
    try {
      var gb = Lg.l.property("ADBE Effect Parade").property("ADBE Gaussian Blur 2");
      if (gb && gb.property("ADBE Gaussian Blur 2-0001").value >= 60) { WARN("blurred glow/blob '" + Lg.name + "': big soft blobs turn into mud on video. Use flat backgrounds (every look does) and put the energy in type and motion."); break; }
    } catch (e5) {}
  }

  // Brand fidelity (timeline.json "brand", passed in by ec.py as BRAND). See references/brand.md.
  if (typeof BRAND !== "undefined" && BRAND.name) {
    var lettersOf = function (s) { return String(s).toLowerCase().replace(/[^a-z0-9]/g, ""); };
    var screenTexts = [];
    for (var bt1 = 0; bt1 < layers.length; bt1++) {
      var Lb = layers[bt1];
      if (Lb.k != "text") continue;
      try {
        var bdoc = Lb.l.property("ADBE Text Properties").property("ADBE Text Document").valueAtTime(Lb.outP - 0.05, false);
        screenTexts.push({ L: Lb, text: String(bdoc.text), px: bdoc.fontSize * (1080 / Math.min(c.width, c.height)) });
      } catch (eb) {}
    }
    var screenTokens = [];
    for (var st1 = 0; st1 < screenTexts.length; st1++) {
      screenTokens = screenTokens.concat(screenTexts[st1].text.split(/\s+/));
    }

    // 1. The tagline must appear word for word, punctuation included.
    if (BRAND.tagline) {
      var tagWords = BRAND.tagline.split(/\s+/);
      var caseOnly = [];
      for (var tw = 0; tw < tagWords.length; tw++) {
        var want = tagWords[tw], exact = false, sameCase = false, nearMiss = null;
        for (var sw = 0; sw < screenTokens.length; sw++) {
          var got = screenTokens[sw];
          if (got == want) { exact = true; break; }
          if (got.toLowerCase() == want.toLowerCase()) sameCase = true;
          else if (lettersOf(got) == lettersOf(want) && lettersOf(want)) nearMiss = got;
        }
        if (exact) continue;
        if (sameCase) caseOnly.push(want);
        else if (nearMiss) FAIL("tagline: '" + want + "' is on screen as '" + nearMiss + "'. Write the tagline exactly as the brand does: \"" + BRAND.tagline + "\"");
        else FAIL("tagline: the word '" + want + "' never appears. The film must show \"" + BRAND.tagline + "\" in full.");
      }
      if (caseOnly.length) WARN("tagline capitalisation differs from \"" + BRAND.tagline + "\" (" + caseOnly.join(", ") + "). Match the brand's casing unless the client approved sentence case.");
    }

    // 2. The brand name must not be typed as a big wordmark when a logo file exists.
    var logoNames = [];
    for (var lg1 = 0; lg1 < (BRAND.logo || []).length; lg1++) logoNames.push(String(BRAND.logo[lg1]).split("/").pop().toLowerCase());
    if (logoNames.length) {
      for (var tx1 = 0; tx1 < screenTexts.length; tx1++) {
        var S1 = screenTexts[tx1];
        if (lettersOf(S1.text) == lettersOf(BRAND.name) && S1.px >= 60)
          FAIL("'" + S1.text + "' is typed as a " + Math.round(S1.px) + "px text wordmark. Show the real logo file (" + BRAND.logo.join(", ") + ") instead: a typed name in the look's font is not the brand.");
      }
    }

    // 3. The logo file must be on screen, and not on the accent colour (a multi-colour mark loses contrast there).
    var logoLayers = [];
    for (var lg2 = 0; lg2 < layers.length; lg2++) {
      var srcName = "";
      try { srcName = String(layers[lg2].l.source.name).toLowerCase(); } catch (es) {}
      for (var lg3 = 0; lg3 < logoNames.length; lg3++) if (srcName == logoNames[lg3]) logoLayers.push(layers[lg2]);
    }
    if (logoNames.length && !logoLayers.length)
      FAIL("the logo file is never used (" + BRAND.logo.join(", ") + "). Import it (`ec.py import`) and build the brand reveal and end card around it.");
    for (var lg4 = 0; lg4 < logoLayers.length; lg4++) {
      var LL = logoLayers[lg4];
      for (var as1 = 0; as1 < (BRAND.accent_spans || []).length; as1++) {
        var span = BRAND.accent_spans[as1];
        var overlap = Math.min(LL.outP, span[1]) - Math.max(LL.inP, span[0]);
        if (overlap > 0.5 * (LL.outP - LL.inP))
          WARN("logo '" + LL.name + "' sits on an accent-colour scene (" + f2(span[0]) + "-" + f2(span[1]) + "s). Brand logos read best on light or dark; keep the accent for a non-logo moment, or check the mark's colours against it.");
      }
    }

    // 4. Names built on the brand name ("Quedium Care") must come from the brief.
    var approved = (BRAND.words || []).concat([BRAND.tagline || ""]).join(" | ").toLowerCase();
    var nameRe = new RegExp(BRAND.name + "\\s+([A-Z][\\w-]*(\\s+[A-Z][\\w-]*)*)", "g");
    var flagged = {};
    for (var tx2 = 0; tx2 < screenTexts.length; tx2++) {
      var mm, txt2 = screenTexts[tx2].text;
      nameRe.lastIndex = 0;
      while ((mm = nameRe.exec(txt2)) !== null) {
        var phrase = mm[0];
        if (approved.indexOf(phrase.toLowerCase()) < 0 && !flagged[phrase]) {
          flagged[phrase] = 1;
          WARN("'" + phrase + "' looks like a product name. Use only names from the brief or the brand's site; if it is real, add it to brand.words in timeline.json.");
        }
      }
    }
  }

  // Fonts in use (verify visually that none fell back to a default face).
  var fonts = {};
  for (var fz = 0; fz < layers.length; fz++) if (layers[fz].k == "text") {
    try { fonts[layers[fz].l.property("ADBE Text Properties").property("ADBE Text Document").value.font] = 1; } catch (e3) {}
  }
  var fl = []; for (var fn in fonts) fl.push(fn);
  out.push("INFO fonts: " + fl.join(", "));
  out.push("INFO layers: " + c.numLayers + ", duration " + DUR + "s");
  out.push("QA RESULT: " + nFail + " fail, " + nWarn + " warn" + (nFail ? "  -> fix every FAIL before rendering" : "  -> OK to render (still check the contact sheet)"));
  return out.join("\n");
})();
