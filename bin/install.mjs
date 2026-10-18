#!/usr/bin/env node
// Installs the effectcraft-motion skill into your agent's skills folder, then checks the machine.
//   npx github:akdavid4real/effectcraft-motion            -> ~/.claude/skills (Claude Code)
//   npx github:akdavid4real/effectcraft-motion --agents   -> also ~/.agents/skills (Codex, OpenCode...)
//   npx github:akdavid4real/effectcraft-motion --dir PATH -> a skills folder of your choice
import { cpSync, rmSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const NAME = "effectcraft-motion";
const src = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const dirs = [];
const i = args.indexOf("--dir");
if (i >= 0 && args[i + 1]) dirs.push(args[i + 1]);
else dirs.push(join(homedir(), ".claude", "skills"));
if (args.includes("--agents")) dirs.push(join(homedir(), ".agents", "skills"));

const skip = new Set([".git", "node_modules", "bin", "package.json", "install.sh"]);
let dest;
for (const d of dirs) {
  dest = join(d, NAME);
  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true, filter: (p) => !skip.has(p.slice(src.length + 1).split(/[\\/]/)[0]) });
  console.log(`installed ${NAME} -> ${dest}`);
}

const py = process.platform === "win32" ? "python" : "python3";
const ec = join(dest, "scripts", "ec.py");
spawnSync(py, [ec, "fonts"], { stdio: "inherit" });
const r = spawnSync(py, [ec, "doctor"], { stdio: "inherit" });
if (r.error) console.log(`\n${py} not found: install Python 3.9+ and run: ${py} ${ec} doctor`);
process.exit(r.status ?? 1);
