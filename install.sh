#!/usr/bin/env bash
# curl -fsSL https://raw.githubusercontent.com/akdavid4real/effectcraft-motion/master/install.sh | bash
# Clones the skill into ~/.claude/skills (or $SKILLS_DIR), installs its fonts, then checks the machine.
set -e
DIR="${SKILLS_DIR:-$HOME/.claude/skills}/effectcraft-motion"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" pull --ff-only
else
  rm -rf "$DIR"
  git clone --depth 1 https://github.com/akdavid4real/effectcraft-motion.git "$DIR"
fi
python3 "$DIR/scripts/ec.py" fonts
python3 "$DIR/scripts/ec.py" doctor
