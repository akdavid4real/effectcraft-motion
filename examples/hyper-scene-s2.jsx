// s2: "Need a website?" - the question whips in, the answer slams, a browser rises under it.
var H = hyperStart("s2"), c = H.c, S = H.S, pal = H.pal, L = H.L;

var need = heroText(c, "NEED A", 140, pal.ink, 470);
var website = heroText(c, "WEBSITE?", 300, pal.accent, 700);

// Browser mock-up: dark window, three dots, a hero block, text lines and a button.
var win = rect(c, "s2 VIS browser", 860, 600, 28, pal.ink, [540, 1240]);
var dots = [];
for (var i = 0; i < 3; i++) {
  dots.push(circle(c, "s2 VIS dot " + i, 22, i == 0 ? pal.accent : pal.ink2, [150 + i * 36, 980]));
}
var heroBlock = rect(c, "s2 VIS hero", 760, 170, 18, pal.accent, [540, 1110]);
var lines = [];
var widths = [600, 470, 530];
for (var j = 0; j < widths.length; j++) {
  lines.push(rect(c, "s2 VIS line " + j, widths[j], 24, 12, pal.bg, [540 - (760 - widths[j]) / 2, 1250 + j * 46], { opacity: 70 }));
}
var button = rect(c, "s2 VIS button", 230, 66, 33, pal.accent, [275, 1440]);
parent(dots.concat([heroBlock, button], lines), win);
parent([need, website, win], H.hit);

whipIn(need, S["in"] + 0.04, -900); // first word lands on the cut: no empty frames
slam(website, W("s2", "website") - 0.03, 2.6);
riseIn(win, W("s2", "website") + 0.1, 900, 0.32);
for (var k = 0; k < lines.length; k++) growX(lines[k], W("s2", "website") + 0.4 + k * 0.08, 0.3);
popIn(button, W("s2", "website") + 0.65, 0.3);
punches(H.hit, [W("s2", "website")], 7);

L.push(need, website, win, heroBlock, button);
L = L.concat(dots, lines);
lifeAll(L, S["in"], S.out);
c.numLayers;
