# effectcraft-motion

An agent skill (Claude Code, Codex, OpenCode, and other agents that read `SKILL.md`) for building
motion-graphics promos, explainers and logo stings in
[EffectCraft](https://getartcraft.com/apps/effectcraft), with voiceover, music and SFX in sync.

![A 20-second sample made with the kit: statement, problem list, flow, icons and end card](docs/demo.gif)

*The silent sample above is what `ec.py demo` builds and renders on your machine (1920×1080, 20 s, a made-up brand).*

It ships five tested looks, ready-made layouts (statement, list, flow, icons, bars, phone, stats, end
card…), fonts, and QA gates that catch empty frames, unreadable text, overlapping voice lines and
off-beat SFX.

## Quick start

```bash
npx skills add akdavid4real/effectcraft-motion -g          # installs into your agents' skills folders
python3 ~/.claude/skills/effectcraft-motion/scripts/ec.py doctor   # what you have, what's missing
python3 ~/.claude/skills/effectcraft-motion/scripts/ec.py demo     # build + render the sample above
```

No Node? Clone it instead:

```bash
git clone https://github.com/akdavid4real/effectcraft-motion ~/.claude/skills/effectcraft-motion
```

(For Codex, OpenCode and similar agents, use `~/.agents/skills/` in place of `~/.claude/skills/`.)

Then ask your agent for a video, for example *"Make a 60-second promo for example.com in EffectCraft"*.

## What you need

Start with the minimum. Everything else only adds sound.

**Minimum: silent videos and the demo**

| Tool | Install |
|---|---|
| EffectCraft (`effectcraft-cli`) | [getartcraft.com/apps/effectcraft](https://getartcraft.com/apps/effectcraft); set `EFFECTCRAFT_CLI` if it's not on `PATH` |
| Python 3.9+ with numpy | `pip install numpy` |
| ffmpeg + ffprobe | `sudo apt install ffmpeg` / `brew install ffmpeg` |
| fontconfig | `sudo apt install fontconfig` / `brew install fontconfig` (the kit installs its own fonts) |

**Optional: voiceover, music, SFX**

| Tool | Adds | Install |
|---|---|---|
| Node 18+ and a Kokoro venv | a free local voiceover and word timings (`npx hyperframes tts` / `transcribe`) | [nodejs.org](https://nodejs.org); `python3 -m venv ~/.venvs/kokoro && ~/.venvs/kokoro/bin/pip install kokoro-onnx soundfile`; `export HYPERFRAMES_PYTHON=~/.venvs/kokoro/bin/python` |
| `media-use` skill + `heygen` CLI | music and SFX by description | the [HyperFrames](https://github.com/heygen-com/hyperframes) skills; [heygen CLI](https://developers.heygen.com/cli), then `heygen auth login --oauth` (free allowance) |
| `edge-tts` | another free voice (online) | `pipx install edge-tts` |

`ec.py doctor` checks all of the above and prints the install command for anything missing.

## Third-party dependencies

The voice and music steps use tools this project doesn't control: HyperFrames (`npx hyperframes`
for TTS and transcription), its `media-use` skill, and the HeyGen catalog. Their commands, models or
free allowances can change. If one breaks, the kit still works:

- **Music:** put your own track in `assets/bgm/` and point `"music"` in `timeline.json` at it.
- **SFX:** save your own sounds as `assets/sfx/<name>.mp3` and cue them as `{"file": "<name>", "at": ...}`
  in `timeline.json`. `timeline.py mix` places and mixes them.
- **Voice:** record or generate the lines with any tool. Word timings can come from any
  transcriber that outputs start and end times (`audio_meta.json`, shape in `SKILL.md`).
- **No audio at all:** time scenes with `"in+0.5"` offsets instead of spoken words, as `demo/` does.

Building, QA and rendering depend only on EffectCraft, Python, numpy and ffmpeg.

## Update

```bash
npx skills update effectcraft-motion        # or: git -C ~/.claude/skills/effectcraft-motion pull
```

## Author

**AK David** ([@akdavid4real](https://github.com/akdavid4real)). MIT licence; the bundled fonts are OFL (see `fonts/LICENSE.md`).
