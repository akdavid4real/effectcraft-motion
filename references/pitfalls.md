# EffectCraft pitfalls (verified on v0.8.0 - NOTE: v0.9.2 is now installed; it changed effects on text/shape layers, shape rasterising, Fractal/Turbulent Noise, Brightness & Contrast and Pixel Motion Blur. Re-render one frame of an old project and compare before trusting a look; layer/comp ids may now be sent as strings)

Every item here cost a real project time. Each one says what goes wrong and what to do instead.

## Scripting engine
1. **Nothing persists between script runs.** Globals and functions are gone after each run.
   `ec.py run` reloads `lib.jsx` and `timing.jsx` every time. If you write your own wrapper, do the same.
2. **Text-document expressions WORK.** Use one layer plus `countUp()` for counters.
   DeepSeek's Northwind build wrongly assumed they don't. It faked counters with 20 hard-cut
   layers, and the final value vanished seconds early.
3. `String.prototype.substr` does not exist. Use `slice`.
4. `$.evalFile` and `#include` are blocked. Read the file with `new File(p).read()` and `eval` it.
5. **Layer order:** every new layer goes ON TOP. Create backgrounds first. Anything decorative that you
   create later (ghost numbers, glows) must be moved down with `placeBelow(layer, target)`.
   Run `wipes.jsx` last, and run it again after every scene rebuild.
6. **Parent first, then animate.** Parenting a child to a box whose scale is keyed from 0 divides by
   zero and the child vanishes. Order: build box → build children → `parent()` → `popIn(box)`.
7. **Opacity and in/out points do not inherit through parenting.** Only transform does. Give children
   their own lifetimes (`lifeAll` on every layer) and their own opacity keys if the parent fades.
   A child of a box popping from scale 0 is hidden by the scale anyway.
8. **Text anchors sit at the baseline-left.** `txt(..., {align:"center"})` re-centres the anchor
   using `sourceRectAtTime`.
9. **Text created before its background ends up under it.** If you must measure text before you
   draw its box, call `text.moveBefore(box)` afterwards. `pill()` already does this.
10. **Shape path vertices are relative to the layer position.** `path()` pins the layer at [0,0]
    so you can pass comp coordinates.
11. **Stroke dashes cannot be added** (`Can not add a property to "Dashes"`). Use solid lines with
    a dot moving along them (`followArc`), or trim paths (`trimOn`).
12. **In/out points snap to frames** (15.75 s becomes 15.7667 at 30 fps). Compare with a ±0.04 s
    tolerance (`clearRange` does).
13. Effect parameters use match name + index, e.g. Fill colour `"ADBE Fill-0002"`,
    Drop Shadow `"ADBE Drop Shadow-0001..0005"`, Linear Wipe completion `"ADBE Linear Wipe-0001"`.
14. A text animator range selector added by script is ignored by the renderer. Animate whole text
    layers instead (fadeUp per line or per word layer).
15. **Large icons blur.** A 200 px PNG shown at more than 200 px gets soft. Use 512 px PNGs or
    build big objects from shapes.

## Fonts
16. **Variable fonts only expose Regular/Italic.** Generate static weights:
    `fonttools varLib.instancer Font[wght].ttf wght=600 --update-name-table -o Font-SemiBold.ttf`,
    put them in `~/.local/share/fonts/`, then run `fc-cache -f`. Move the variable originals out of
    the fonts folder, or they shadow the static files.
17. **Check every font in a test frame.** One generated instance (`InterTight-Regular`) rendered
    with no spaces, and a generated mono Medium silently fell back to a sans. A wrong font fails
    silently: `doc.font` still reports the name you asked for.
18. Fonts are referenced by PostScript name, e.g. `InterTight-SemiBold`, `InstrumentSerif-Italic`.

## App, CLI and rendering
19. **Never edit one .ecproj from two places.** If the GUI has the project open and you change the
    file with `effectcraft-cli`, the GUI's next save overwrites your work. Either close it in the
    GUI, or do everything through the GUI's MCP bridge.
20. **A "timeout" usually still finished.** Long scripts and saves can report a timeout and complete
    anyway. Check the layer count (`ec.py layers`) before re-running, or you get duplicates.
    `ec.py qa` flags duplicates.
21. One giant script call times out. Use one scene per call.
22. **Never run `effectcraft --help`.** It launches the GUI and hangs. Use `effectcraft-cli`.
23. `list_effects` without a filter returns about 480 KB. Always filter.
24. The GUI render queue can stall forever. Render headless (`ec.py render`) from the SAVED project.
25. **Do not use `--gpu` on integrated Intel GPUs.** It is about 3.7× slower than CPU, with
    identical output.
26. A shutdown during a render leaves a corrupt MP4 ("moov atom not found"). `ec.py qa-video`
    checks the duration.
27. AAC encoding overshoots peaks. A mix limited to 0 dBFS comes out at +0.2 dBTP in the MP4.
    `timeline.py mix` normalises to -14 LUFS / -1.5 dBTP to leave headroom.
28. The requested bitrate is a ceiling, not a guarantee. Simple frames encode below it.

## Audio
29. HeyGen SFX can be very long (`typing.mp3` is 44 s). Trim with `"max"` in the sfx cue.
30. The HeyGen free TTS allowance is small (about 10 min/month). If it runs out, switch provider
    (e.g. Kokoro: `HYPERFRAMES_PYTHON=~/.venvs/kokoro/bin/python npx hyperframes tts`) and **update the docs/request file to say so**.
    Then transcribe for word timestamps.
31. Mix one `soundtrack.wav` and import it as a single layer. Don't build the mix out of many
    EffectCraft audio layers.
32. If a scene script errors halfway, run a full `ec.py run reset s1 ... sN wipes`, not
    `rebuild sN`. A partial run can leave a full-length background layer that covers other scenes.

## Text sizes
33. `ec.py qa` measures text "at 1080p" against the frame's SHORT side, so its sizes are right for
    both 16:9 and 9:16. (Before this fix, 9:16 sizes were under-reported and gave false
    tiny-text and no-hero warnings.)
