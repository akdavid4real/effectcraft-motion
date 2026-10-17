// Copy-paste block: append this file to a project's scripts/lib.jsx for the high-energy style.
// See references/high-energy.md. Example project: ~/Videos/akdavid-hype (scripts/s1.jsx ... s8.jsx).
// ============================ HYPER-KINETIC MOVES (this project) ============================
// Every scene starts with hyperStart(sid). Content is parented to a "hit" null, which sits
// inside a "push" null: push = a slow zoom over the whole scene, hit = short kicks on impacts.
// Both nulls keep their anchor at the frame centre, so a child's coordinates stay comp
// coordinates and every scale happens around the middle of the frame.
function centreNull(c, name) {
  var n = c.layers.addNull();
  n.name = name;
  tr(n, "ADBE Anchor Point").setValue([W_ / 2, H_ / 2]);
  tr(n, "ADBE Position").setValue([W_ / 2, H_ / 2]);
  return n;
}

function hyperStart(sid) {
  var c = findItem(COMP);
  if (!c) {
    c = app.project.items.addComp(COMP, W_, H_, 1, T.duration, 30);
    var snd = findItem("soundtrack.wav");
    if (!snd) throw new Error("Import soundtrack.wav first: ec.py import soundtrack.wav");
    c.layers.add(snd).name = "Soundtrack";
  }
  c.motionBlur = true;
  var S = SC(sid);
  var pal = P(S.bg);
  c.bgColor = pal.bg;
  var L = lookBg(c, sid, S.bg, pal);
  var push = centreNull(c, "CAM push " + sid);
  var hit = centreNull(c, "CAM hit " + sid);
  hit.parent = push;
  keys(tr(push, "ADBE Scale"), [[S["in"], [100, 100]], [S.out, [107, 107]]], 10);
  L.push(push, hit);
  return { c: c, S: S, pal: pal, L: L, hit: hit };
}

// Big centred word, shrunk to fit maxW, anchored at its own centre so it scales in place.
function heroText(c, str, size, color, y, opts) {
  opts = opts || {};
  var l = txt(c, str, size, opts.font || FONT.display, color, [W_ / 2, y],
    { align: "center", tracking: opts.tracking === undefined ? 0 : opts.tracking, name: opts.name || str });
  fit(l, opts.maxW || (X1 - X0));
  centerAnchor(l);
  tr(l, "ADBE Position").setValue([W_ / 2, y]);
  return l;
}

// Slam: the word lands from a bigger scale with real motion blur, overshoots, settles.
function slam(l, t, from) {
  l.motionBlur = true;
  var s = tr(l, "ADBE Scale").value[0];
  var big = s * (from || 2.4);
  keys(tr(l, "ADBE Scale"), [[t, [big, big]], [t + 0.13, [s * 0.94, s * 0.94]], [t + 0.24, [s, s]]], 80);
  keys(tr(l, "ADBE Opacity"), [[t, 0], [t + 0.05, 100]], 30);
}

// Whip: the layer flies in sideways from dx pixels away, blurred by its own speed.
function whipIn(l, t, dx) {
  l.motionBlur = true;
  var p = tr(l, "ADBE Position").value;
  keys(tr(l, "ADBE Position"), [[t, [p[0] + dx, p[1]]], [t + 0.18, [p[0], p[1]]]], 90);
  keys(tr(l, "ADBE Opacity"), [[t, 0], [t + 0.06, 100]], 30);
}

// Rise: the layer shoots up from below the frame (phones, cards, mock-ups).
function riseIn(l, t, dy, d) {
  l.motionBlur = true;
  var p = tr(l, "ADBE Position").value;
  keys(tr(l, "ADBE Position"), [[t, [p[0], p[1] + dy]], [t + (d || 0.3), [p[0], p[1]]]], 90);
  keys(tr(l, "ADBE Opacity"), [[t, 0], [t + 0.08, 100]], 30);
}

// Camera kicks on the hit null: a short zoom bump per impact time.
function punches(hit, times, amount) {
  var list = [];
  var a = amount || 7;
  for (var i = 0; i < times.length; i++) {
    var t = times[i];
    list.push([t, [100, 100]], [t + 0.05, [100 + a, 100 + a]], [t + 0.22, [100, 100]]);
  }
  keys(tr(hit, "ADBE Scale"), list, 70);
}

// A three-frame flash over the whole frame on the biggest impacts.
function flash(c, sid, t, color) {
  var f = rect(c, "FX flash " + sid + " " + t, W_ + 40, H_ + 40, 0, color, [W_ / 2, H_ / 2]);
  keys(tr(f, "ADBE Opacity"), [[t, 0], [t + 0.03, 70], [t + 0.12, 0]], 20);
  return f;
}
