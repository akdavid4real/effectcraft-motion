// Scene s1. scene() creates the comp and adds soundtrack.wav on the first run (import it first:
// ec.py import soundtrack.wav). Every scene is one scene() call; layouts are listed in
// references/looks.md and specified at the top of templates/layouts.jsx.
scene("s1", "statement", { label: "Eyebrow label",
  lines: [["First headline line", "first"], ["with an *accent part.*", "with", "accent"]],
  sub: ["A quieter supporting line.", "quieter"] });
