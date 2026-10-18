# effectcraft-motion

An agent skill (Claude Code, Codex, OpenCode, and other agents that read `SKILL.md`) for building
60-second motion-graphics promos, explainers and logo stings in
[EffectCraft](https://getartcraft.com/apps/effectcraft), with voiceover, music and SFX in sync.
It ships five tested looks, layouts, fonts and QA gates that catch empty frames, overlapping voice
lines, covered text and off-beat SFX.

## Install

Pick one:

```bash
# 1. The skills installer (works with any agent)
npx skills add akdavid4real/effectcraft-motion

# 2. npx straight from GitHub: copies the skill, installs the fonts, runs the checks
npx github:akdavid4real/effectcraft-motion            # -> ~/.claude/skills
npx github:akdavid4real/effectcraft-motion --agents   # also -> ~/.agents/skills
npx github:akdavid4real/effectcraft-motion --dir ~/my/skills

# 3. Shell script (needs git)
curl -fsSL https://raw.githubusercontent.com/akdavid4real/effectcraft-motion/master/install.sh | bash

# 4. By hand
git clone https://github.com/akdavid4real/effectcraft-motion ~/.claude/skills/effectcraft-motion
```

Then check your machine:

```bash
python3 ~/.claude/skills/effectcraft-motion/scripts/ec.py doctor
```

```
  OK    effectcraft-cli
  OK    python3 >= 3.9
  FAIL  numpy                     -> pip install numpy   (or: sudo apt install python3-numpy)
  ...
doctor: 1 required missing.
```

## Requirements

| Tool | Needed for | Required | Install |
|---|---|---|---|
| EffectCraft (`effectcraft-cli`) | building and rendering | yes | [getartcraft.com/apps/effectcraft](https://getartcraft.com/apps/effectcraft); set `EFFECTCRAFT_CLI` if it's not on `PATH` |
| Python 3.9+ and numpy | kit scripts, beat grid | yes | `pip install numpy` |
| ffmpeg + ffprobe | audio analysis, render QA | yes | `sudo apt install ffmpeg` / `brew install ffmpeg` |
| fontconfig (`fc-cache`) | installing the bundled fonts | yes | `sudo apt install fontconfig` / `brew install fontconfig` |
| Bundled fonts | the looks' typography | yes | `python3 scripts/ec.py fonts` |
| Node 18+ / `npx` | voice and word timestamps via `npx hyperframes` | for voiceover | [nodejs.org](https://nodejs.org) |
| Kokoro venv | free local voice | for voiceover | `python3 -m venv ~/.venvs/kokoro && ~/.venvs/kokoro/bin/pip install kokoro-onnx soundfile`, then `export HYPERFRAMES_PYTHON=~/.venvs/kokoro/bin/python` |
| `media-use` skill | music and SFX | for music/SFX | from the [HyperFrames](https://github.com/heygen-com/hyperframes) skills |
| `heygen` CLI | music/SFX catalog search, alternative voice | for music/SFX | [developers.heygen.com/cli](https://developers.heygen.com/cli), then `heygen auth login --oauth` (free allowance) |
| `edge-tts` | alternative free voice (needs internet) | no | `pipx install edge-tts` |

### Voice, music and SFX

Only EffectCraft, Python/numpy, ffmpeg and fontconfig are needed to build and render. Audio is layered on top:

- **Voiceover:** the default is **Kokoro**, which runs locally, is free and needs no account. Its model and
  the Parakeet word-timing model download once on first use into `~/.cache/hyperframes/`.
  HeyGen TTS and edge-tts are alternatives.
- **Music and SFX:** the `media-use` skill searches the HeyGen catalog, which needs the `heygen` CLI
  signed in (the OAuth login gives a free allowance). Without it, SFX still come from media-use's
  bundled library, and you can give the agent your own music file.

## Use

Ask your agent for a motion graphic, e.g. *"Make a 60-second promo for example.com in EffectCraft"*.
The skill takes it from there. `SKILL.md` has the workflow, and `references/` has the design rules.

## Author

**AK David** ([@akdavid4real](https://github.com/akdavid4real)). MIT licence; the bundled fonts are OFL (see `fonts/LICENSE.md`).

## Update

Run the same install command again (`npx skills add ...`, `npx github:...` or `install.sh`).
