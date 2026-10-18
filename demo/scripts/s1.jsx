// Silent demo: no voice, so every time is "in+seconds" instead of a spoken word.
scene("s1", "statement", { label: "Kitelane freight",
  lines: [["Every shipment", "in+0.1"], ["is a *promise.*", "in+0.5", "in+0.9"]],
  sub: ["Somebody is waiting on the other end.", "in+1.4"] });
