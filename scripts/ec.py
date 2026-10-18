#!/usr/bin/env python3
"""EffectCraft kit CLI: every step an agent needs, headless, via effectcraft-cli.

Run from the PROJECT directory (the one containing timeline.json and scripts/).

  ec.py new                         create an empty .ecproj (path from timeline.json "project")
  ec.py import FILE...              import footage/audio/images into the project
  ec.py run NAME...                 run scripts/NAME.jsx (lib.jsx + timing.jsx loaded first), save
  ec.py rebuild NAME                clear that scene's time range, re-run it, then re-run wipes
  ec.py layers [FILTER]             list layers (index, name, in, out)
  ec.py frames T... [--side 960]    render preview PNGs at times T (seconds) + a contact sheet
  ec.py sheet [--every 2]           contact sheet of the whole comp (one frame every N s)
  ec.py qa                          composition QA (dead frames, overlaps, vanishing text, order...)
  ec.py render [--bitrate 16000]    render the MP4 (H.264 + audio), then run qa-video
  ec.py qa-video [FILE.mp4]         check the render: specs, loudness, empty frames, contact sheet
  ec.py look [list | NAME [--accent HEX]]   list the looks, or apply one (writes scripts/look.jsx)
  ec.py compare LOOK_A LOOK_B [--accent HEX]  build the whole video in both looks (copies) -> qa/look_compare.png
  ec.py fonts                       install the kit's fonts (needed once per machine)
  ec.py doctor                      check this machine has everything the kit needs (and how to get it)
  ec.py demo [DIR] [--look NAME]    build + render a silent 20 s sample (needs only EffectCraft, ffmpeg, numpy)

Never edit the same .ecproj in the GUI and with this tool at the same time: the GUI keeps its
own copy in memory and will overwrite this tool's changes when it saves.
"""
import glob
import json
import os
import re
import subprocess
import sys
import tempfile

KIT = os.path.dirname(os.path.abspath(__file__))
CLI = os.environ.get("EFFECTCRAFT_CLI", "effectcraft-cli")


def cfg():
    tl = {}
    if os.path.exists("timeline.json"):
        tl = json.load(open("timeline.json"))
    project = tl.get("project") or (glob.glob("*.ecproj") or [None])[0]
    if not project:
        sys.exit("No project: set \"project\" in timeline.json or run from a folder with one .ecproj")
    return {"project": project, "comp": tl.get("comp", "Promo"), "duration": float(tl.get("duration", 60)),
            "tl": tl, "out": tl.get("output", os.path.splitext(project)[0] + ".mp4")}


def sh(args, check=True, quiet=False):
    r = subprocess.run(args, capture_output=True, text=True)
    if not quiet:
        txt = (r.stdout + r.stderr).strip()
        if txt:
            print(txt)
    if check and r.returncode != 0:
        sys.exit(f"command failed ({r.returncode}): {' '.join(args[:3])} ...")
    return r


def read(p):
    return open(p).read()


def prelude(c, with_lib=True):
    parts = []
    if with_lib:
        lib = "scripts/lib.jsx" if os.path.exists("scripts/lib.jsx") else os.path.join(KIT, "..", "templates", "lib.jsx")
        parts.append(read(lib))
    else:  # minimal helpers for QA on projects that do not use this kit's lib.jsx
        parts.append('function findItem(n){for(var i=1;i<=app.project.numItems;i++)if(app.project.item(i).name==n)return app.project.item(i);return null;}'
                     'function comp(){var c=findItem(COMP);if(!c)throw new Error("Comp not found: "+COMP);return c;}'
                     'function tr(l,n){return l.property("ADBE Transform Group").property(n);}')
    parts.append(f'COMP = {json.dumps(c["comp"])};' if with_lib else f'var COMP = {json.dumps(c["comp"])};')
    if with_lib:
        parts.append(read(os.path.join(KIT, "..", "templates", "kit.jsx")))
        look = c.get("look_file") or ("scripts/look.jsx" if os.path.exists("scripts/look.jsx") else None)
        if look:
            parts.append(read(look))
        lay = "scripts/layouts.jsx" if os.path.exists("scripts/layouts.jsx") else os.path.join(KIT, "..", "templates", "layouts.jsx")
        parts.append(read(lay))
    if os.path.exists("scripts/timing.jsx"):
        parts.append(read("scripts/timing.jsx"))
    return "\n".join(parts)


def run_js(c, body, label, with_lib=True, save=True):
    code = prelude(c, with_lib) + "\n" + body
    wrapper = ("var __r; try { __r = eval(" + json.dumps(code) + "); } catch (e) { __r = 'ERR ' + e + ' @line ' + e.line; } __r;")
    with tempfile.NamedTemporaryFile("w", suffix=".jsx", delete=False) as f:
        f.write(wrapper)
        tmp = f.name
    args = [CLI, "script", tmp, c["project"]] + (["--save"] if save else [])
    r = subprocess.run(args, capture_output=True, text=True)
    os.unlink(tmp)
    res = (r.stdout + r.stderr).strip()
    res = re.sub(r"\n?saved .*$", "", res)
    if res.startswith('"') and res.endswith('"'):
        try:
            res = json.loads(res)
        except ValueError:
            pass
    ok = r.returncode == 0 and "ERR " not in res
    print(f"[{label}] {'ok' if ok else 'ERROR'}:" + ("\n" if "\n" in str(res) else " ") + str(res))
    if not ok:
        sys.exit(1)
    return res


def gui_warning(c):
    r = subprocess.run(["pgrep", "-fa", "effectcraft --control"], capture_output=True, text=True)
    if r.stdout.strip():
        print("NOTE: the EffectCraft GUI is running. Make sure it does NOT have " + c["project"] +
              " open, or its next save will overwrite these changes.", file=sys.stderr)


def cmd_new(c, a):
    if os.path.exists(c["project"]):
        sys.exit(f"{c['project']} already exists (delete it first to start over)")
    with tempfile.NamedTemporaryFile("w", suffix=".jsx", delete=False) as f:
        f.write("0;")
    sh([CLI, "script", f.name, "--empty", "--save-as", os.path.abspath(c["project"])])


def cmd_import(c, files):
    body = "var out=[];\n"
    for p in files:
        ap = os.path.abspath(p)
        body += (f'(function(){{var n={json.dumps(os.path.basename(p))}; if(findItem(n)){{out.push("have "+n);return;}}'
                 f'var f=new File({json.dumps(ap)}); if(!f.exists){{out.push("MISSING "+n);return;}}'
                 f'app.project.importFile(new ImportOptions(f)); out.push("imported "+n);}})();\n')
    body += 'out.join(", ");'
    run_js(c, body, "import")


def cmd_run(c, names):
    gui_warning(c)
    for n in names:
        p = f"scripts/{n}.jsx" if not n.endswith(".jsx") else n
        if not os.path.exists(p):
            sys.exit(f"missing {p}")
        run_js(c, read(p), n)


def scene_range(c, name):
    sc = c["tl"].get("scenes", [])
    for s in sc:
        if s["id"] == name:
            return float(s["in"]), float(s["out"])
    sys.exit(f"scene {name} not in timeline.json")


def cmd_rebuild(c, a):
    name = a[0]
    t0, t1 = scene_range(c, name)
    run_js(c, f"'cleared ' + clearRange(comp(), {t0}, {t1}) + ' layers';", f"clear {name}")
    cmd_run(c, [name])
    if os.path.exists("scripts/wipes.jsx"):
        cmd_run(c, ["wipes"])


def cmd_layers(c, a):
    flt = a[0] if a else ""
    run_js(c, "var c=comp(),o=[];for(var i=1;i<=c.numLayers;i++){var l=c.layer(i);"
              f"if(l.name.indexOf({json.dumps(flt)})<0)continue;"
              "o.push(i+'  '+l.name+'  ['+Math.round(l.inPoint*100)/100+' - '+Math.round(l.outPoint*100)/100+']');}"
              "o.join('\\n');", "layers", save=False)


def frame(c, t, out, side):
    sh([CLI, "render-frame", "--project", c["project"], "--comp", c["comp"], "--time", str(t),
        "--max-side", str(side), "--out", out], quiet=True)


def montage(files, out, cols=5):
    sh(["magick", "montage"] + files + ["-tile", f"{cols}x", "-geometry", "+3+3", "-background", "#777", out], quiet=True)


def stamp(png, label):
    sh(["magick", png, "-gravity", "NorthWest", "-fill", "yellow", "-undercolor", "#000000A0",
        "-pointsize", "18", "-annotate", "+6+6", label, png], quiet=True)


def cmd_frames(c, a):
    side = 960
    if "--side" in a:
        i = a.index("--side")
        side = int(a[i + 1])
        a = a[:i] + a[i + 2:]
    os.makedirs("qa", exist_ok=True)
    files = []
    for t in a:
        out = f"qa/frame_{float(t):06.2f}.png"
        frame(c, float(t), out, side)
        stamp(out, f"{float(t):.2f}s")
        files.append(out)
    if len(files) > 1:
        montage(files, "qa/frames.png", cols=min(3, len(files)))
        print("contact sheet: qa/frames.png")
    print("frames: " + " ".join(files) + "\nLOOK at these images before moving on.")


def cmd_sheet(c, a):
    every = float(a[a.index("--every") + 1]) if "--every" in a else 2.0
    os.makedirs("qa/sheet", exist_ok=True)
    files, t = [], 0.5
    while t < c["duration"]:
        out = f"qa/sheet/{t:06.2f}.png"
        frame(c, t, out, 400)
        stamp(out, f"{t:.1f}s")
        files.append(out)
        t += every
    half = (len(files) + 1) // 2
    montage(files[:half], "qa/sheet_1.png")
    montage(files[half:], "qa/sheet_2.png")
    print("contact sheets: qa/sheet_1.png qa/sheet_2.png  (open and LOOK at every frame)")


def stale_outputs(c):
    """FAILs for generated files older than what they are made from. In testing, a scene was lengthened and the
    cuts re-snapped, but timing.jsx and soundtrack.wav were never regenerated: every later scene was built on the
    old times, the comp kept the old length and the end card vanished 0.8 s early, with QA at 0 fail."""
    def newest(paths):
        times = [os.path.getmtime(p) for p in paths if os.path.exists(p)]
        return max(times) if times else 0
    fails = []
    plan = ["timeline.json", "beats.json", c["tl"].get("audio_meta", "audio_meta.json")]
    if os.path.exists("scripts/timing.jsx") and newest(plan) > os.path.getmtime("scripts/timing.jsx") + 1:
        fails.append("scripts/timing.jsx is older than timeline.json / beats.json / audio_meta.json: run "
                     "`timeline.py emit`, then rebuild every scene (`ec.py run reset s1 ... sN wipes`)")
    sound = plan + glob.glob("assets/voice/*") + glob.glob("assets/sfx/*") + glob.glob("assets/bgm/*")
    if os.path.exists("soundtrack.wav") and newest(sound) > os.path.getmtime("soundtrack.wav") + 1:
        fails.append("soundtrack.wav is older than the timeline or the audio files: run `timeline.py mix`, then "
                     "re-import it (a fresh `ec.py new` + `ec.py import`, or replace the imported item)")
    return fails


def cmd_qa(c, a):
    stale = stale_outputs(c)
    for msg in stale:
        print("FAIL", msg)
    uses_kit = os.path.exists("scripts/lib.jsx") and "function W(" in read("scripts/lib.jsx")
    if uses_kit and not os.path.exists("scripts/look.jsx"):
        print("WARN no look applied: pick one (`ec.py look list`, references/looks.md) and compare two with `ec.py compare A B`. "
              "Inventing a style from scratch is where generated videos go wrong.")
    # The brand facts and the accent scenes go to qa_comp.jsx as one BRAND object.
    brand = dict(c["tl"].get("brand", {}))
    brand["accent_spans"] = [[float(s["in"]), float(s["out"])]
                             for s in c["tl"].get("scenes", []) if s.get("bg") == "accent"]
    brand_js = "var BRAND = " + json.dumps(brand) + ";\n"
    # seconds each line must be fully readable: 0.8 for brand films, ~0.5 for the high-energy style
    brand_js += "var MIN_READ = " + str(float(c["tl"].get("min_read", 0.8))) + ";\n"
    brand_js += "var TL_DURATION = " + str(float(c["tl"].get("duration", 0))) + ";\n"
    res = run_js(c, brand_js + read(os.path.join(KIT, "qa_comp.jsx")), "qa", with_lib=uses_kit, save=False)
    if stale:
        print(f"QA RESULT (generated files): {len(stale)} fail -> regenerate them before rendering")
    if "QA RESULT: 0 fail" not in res or stale:
        sys.exit(1)


def cmd_render(c, a):
    br = a[a.index("--bitrate") + 1] if "--bitrate" in a else "16000"
    gui_warning(c)
    print(f"rendering {c['out']} (CPU, ~5-10 min for 60s)...", flush=True)
    sh([CLI, "render", "--project", c["project"], "--comp", c["comp"], "--out", c["out"], "--format", "h264",
        "--bitrate", br, "--audio", "on", "--quality", "best"])
    cmd_qa_video(c, [c["out"]])


def cmd_qa_video(c, a):
    f = a[0] if a else c["out"]
    fails, warns = [], []
    pr = json.loads(sh(["ffprobe", "-v", "error", "-show_entries", "format=duration,bit_rate:stream=codec_type,width,height,r_frame_rate",
                        "-of", "json", f], quiet=True).stdout)
    dur = float(pr["format"]["duration"])
    vs = [s for s in pr["streams"] if s["codec_type"] == "video"]
    au = [s for s in pr["streams"] if s["codec_type"] == "audio"]
    if abs(dur - c["duration"]) > 0.15:
        fails.append(f"duration {dur:.2f}s, expected {c['duration']}s (a cut-off render = corrupt/short file)")
    if not au:
        fails.append("no audio stream (render with --audio on and a Soundtrack layer)")
    br = int(pr["format"].get("bit_rate", 0)) / 1e6
    if br < 3:
        warns.append(f"bitrate {br:.1f} Mbps: check dark gradients for banding on the contact sheet "
                     "(the --bitrate value is a ceiling; flat motion graphics legitimately encode lower)")
    print(f"video: {vs[0]['width']}x{vs[0]['height']} @ {vs[0]['r_frame_rate']}, {dur:.2f}s, {br:.1f} Mbps, audio: {'yes' if au else 'NO'}")
    if au:
        ln = sh(["ffmpeg", "-hide_banner", "-i", f, "-vn", "-af", "loudnorm=print_format=summary", "-f", "null", "-"],
                check=False, quiet=True).stderr
        m1 = re.search(r"Input Integrated:\s+(-?[\d.]+)", ln)
        m2 = re.search(r"Input True Peak:\s+([+-]?[\d.]+)", ln)
        if m1:
            lufs, tp = float(m1.group(1)), float(m2.group(1))
            print(f"loudness: {lufs} LUFS, true peak {tp} dBTP")
            if not -16.5 <= lufs <= -11.5:
                warns.append(f"loudness {lufs} LUFS (aim for about -14)")
            if tp > -0.5:
                warns.append(f"true peak {tp} dBTP (keep below -1)")
    # Empty-frame detection: edge energy per frame (5 fps). Background-only frames have almost no edges.
    st = sh(["ffmpeg", "-hide_banner", "-i", f, "-vf", "fps=5,scale=480:-1,edgedetect=low=0.08:high=0.2,signalstats,"
             "metadata=print:key=lavfi.signalstats.YAVG", "-an", "-f", "null", "-"], check=False, quiet=True).stderr
    vals = [float(x) for x in re.findall(r"YAVG=([\d.]+)", st)]
    if vals:
        srt = sorted(vals)
        ref = srt[int(len(srt) * 0.6)]
        thr = max(0.35, ref * 0.12)
        # wipes are flat colour (no edges) by design: ignore the frames around each scene cut
        cuts = [float(s_["in"]) for s_ in c["tl"].get("scenes", [])[1:]]
        in_wipe = lambda t: any(cu - 0.5 <= t <= cu + 0.55 for cu in cuts)
        run = None
        for i, v in enumerate(vals + [999]):
            t = i / 5.0
            if v < thr and 0.8 < t < dur - 1.2 and not in_wipe(t):
                run = run if run is not None else t
            else:
                if run is not None and t - run >= 0.4:
                    warns.append(f"near-empty frames {run:.1f}-{t:.1f}s: check the contact sheet "
                                 f"({'wipe frames are expected; ' if not cuts else ''}`ec.py qa` is the precise check)")
                run = None
    # contact sheet
    os.makedirs("qa", exist_ok=True)
    sh(["ffmpeg", "-v", "error", "-y", "-i", f, "-vf",
        "fps=1/2,scale=384:-1,drawtext=text='%{pts\\:hms}':x=6:y=6:fontsize=16:fontcolor=yellow:box=1:boxcolor=black@0.6,tile=5x6",
        "-frames:v", "1", "qa/render_sheet.png"], quiet=True)
    for w in warns:
        print("WARN", w)
    for x in fails:
        print("FAIL", x)
    print(f"qa-video: {len(fails)} fail, {len(warns)} warn. Contact sheet: qa/render_sheet.png (LOOK at it).")
    if fails:
        sys.exit(1)


LOOKS = os.path.join(KIT, "..", "looks")
FONTS = os.path.join(KIT, "..", "fonts")


def cmd_fonts(c=None, a=None):
    dst = os.path.expanduser("~/.local/share/fonts/effectcraft-kit")
    os.makedirs(dst, exist_ok=True)
    have = set(os.listdir(dst))
    new = [f for f in os.listdir(FONTS) if f.endswith(".ttf") and f not in have
           and not os.path.exists(os.path.expanduser("~/.local/share/fonts/halden/" + f))]
    for f in new:
        subprocess.run(["cp", os.path.join(FONTS, f), dst])
    if new:
        subprocess.run(["fc-cache", "-f"], capture_output=True)
    print(f"fonts: {len(new)} installed" if new else "fonts: all installed")


def look_names():
    return sorted(f[:-4] for f in os.listdir(LOOKS) if f.endswith(".jsx"))


def apply_look(name, accent, dst):
    src = os.path.join(LOOKS, name + ".jsx")
    if not os.path.exists(src):
        sys.exit(f"no look '{name}'. Looks: {', '.join(look_names())}")
    code = read(src)
    if accent:
        accent = accent.lstrip("#").upper()
        if not re.fullmatch(r"[0-9A-F]{6}", accent):
            sys.exit("--accent must be a hex colour like FF5B1F")
        code = re.sub(r'var ACCENT = "[0-9A-Fa-f]{6}";', f'var ACCENT = "{accent}";', code, count=1)
    os.makedirs(os.path.dirname(dst) or ".", exist_ok=True)
    open(dst, "w").write(code)


def cmd_look(c, a):
    if not a or a[0] == "list":
        for n in look_names():
            lines = read(os.path.join(LOOKS, n + ".jsx")).splitlines()
            desc = " ".join(l.lstrip("/ ").strip() for l in lines[:3] if l.startswith("//"))
            print(f"  {n:10s} {desc.split(' - ', 1)[-1]}")
        print("Read references/looks.md, shortlist two, then `ec.py compare A B`.")
        return
    accent = a[a.index("--accent") + 1] if "--accent" in a else None
    cmd_fonts()
    apply_look(a[0], accent, "scripts/look.jsx")
    print(f"look '{a[0]}' applied -> scripts/look.jsx" + (f" (accent #{accent.lstrip('#')})" if accent else "") +
          ". Rebuild every scene: ec.py run reset s1 s2 ... wipes")


def scene_ids(c):
    return [s["id"] for s in c["tl"].get("scenes", [])]


def cmd_compare(c, a):
    accent = a[a.index("--accent") + 1] if "--accent" in a else None
    names = [x for x in a if not x.startswith("--") and x != accent]
    if len(names) < 2:
        sys.exit("usage: ec.py compare LOOK_A LOOK_B [LOOK_C] [--accent HEX]")
    cmd_fonts()
    ids = [i for i in scene_ids(c) if os.path.exists(f"scripts/{i}.jsx")]
    if not ids:
        sys.exit("no scene scripts yet: write scripts/s1.jsx ... (scene() calls) first")
    times = []
    for s_ in c["tl"]["scenes"]:
        if s_["id"] in ids:
            a0, b0 = float(s_["in"]), float(s_["out"])
            times.append(round(a0 + (b0 - a0) * 0.8, 2))
    os.makedirs("qa/compare", exist_ok=True)
    sheets = []
    for n in names:
        proj = f"qa/compare/{n}.ecproj"
        subprocess.run(["cp", c["project"], proj])
        cc = dict(c, project=proj, look_file=f"qa/compare/{n}.jsx")
        apply_look(n, accent, cc["look_file"])
        print(f"== building {n} ...", flush=True)
        run_js(cc, read("scripts/reset.jsx") if os.path.exists("scripts/reset.jsx") else
               "for (var i = app.project.numItems; i >= 1; i--) if (app.project.item(i).name == COMP) app.project.item(i).remove(); 'reset';", "reset")
        for i in ids:
            run_js(cc, read(f"scripts/{i}.jsx"), i)
        if os.path.exists("scripts/wipes.jsx"):
            run_js(cc, read("scripts/wipes.jsx"), "wipes")
        files = []
        for t in times:
            out = f"qa/compare/{n}_{t:06.2f}.png"
            frame(cc, t, out, 480)
            stamp(out, f"{n}  {t:.1f}s")
            files.append(out)
        montage(files, f"qa/compare/{n}.png", cols=len(files))
        sheets.append(f"qa/compare/{n}.png")
    sh(["magick"] + sheets + ["-append", "qa/look_compare.png"], quiet=True)
    print("qa/look_compare.png: one row per look, same moments. OPEN it and judge which one fits this brand "
          "(references/looks.md). Your project was not changed: apply the winner with `ec.py look NAME`.")


def cmd_demo(c=None, a=None):
    """Copy $KIT/demo to DIR (default ./effectcraft-demo), give it a silent soundtrack, build every scene, render."""
    a = list(a or [])
    look = a.pop(a.index("--look") + 1) if "--look" in a else "editorial"
    a = [x for x in a if x != "--look"]
    dst = os.path.abspath(a[0] if a else "effectcraft-demo")
    if os.path.exists(dst):
        sys.exit(f"{dst} already exists: pick another folder")
    import shutil
    shutil.copytree(os.path.join(KIT, "..", "demo"), dst)
    os.chdir(dst)
    dur = json.load(open("timeline.json"))["duration"]
    me, tl = [sys.executable, os.path.abspath(__file__)], [sys.executable, os.path.join(KIT, "timeline.py")]
    steps = [["ffmpeg", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", str(dur), "soundtrack.wav"],
             tl + ["emit"], me + ["new"], me + ["import", "soundtrack.wav"], me + ["look", look, "--accent", "E4572E"],
             me + ["run", "s1", "s2", "s3", "s4", "s5", "wipes"], me + ["qa"], me + ["render"]]
    for cmd in steps:
        if subprocess.run(cmd).returncode != 0:
            sys.exit(f"demo stopped at: {' '.join(cmd[1:3] if cmd[0] == sys.executable else cmd[:1])}")
    print(f"demo: {os.path.join(dst, 'effectcraft-demo.mp4')}")


def _found(cmd):
    import shutil
    return shutil.which(os.path.expanduser(cmd))


def cmd_doctor(c=None, a=None):
    """Each check: (name, required?, ok?, how to get it). Exits 1 when a required one is missing."""
    try:
        import numpy  # noqa: F401
        has_numpy = True
    except ImportError:
        has_numpy = False
    kokoro_py = os.path.expanduser(os.environ.get("HYPERFRAMES_PYTHON", "~/.venvs/kokoro/bin/python"))
    has_kokoro = os.path.exists(kokoro_py) and subprocess.run(
        [kokoro_py, "-c", "import kokoro_onnx"], capture_output=True).returncode == 0
    seen = subprocess.run(["fc-list", ":", "file"], capture_output=True, text=True).stdout if _found("fc-list") else ""
    seen = {os.path.basename(l.strip().rstrip(":")) for l in seen.splitlines()}
    has_fonts = all(f in seen for f in os.listdir(FONTS) if f.endswith(".ttf"))
    skills = [os.path.expanduser(p) for p in ("~/.claude/skills", "~/.agents/skills")]
    has_media_use = any(os.path.isdir(os.path.join(s, "media-use")) for s in skills)
    checks = [
        ("effectcraft-cli", True, bool(_found(CLI)),
         "install EffectCraft: https://getartcraft.com/apps/effectcraft (or set EFFECTCRAFT_CLI=/path/to/cli)"),
        ("python3 >= 3.9", True, sys.version_info >= (3, 9), "https://www.python.org/downloads/"),
        ("numpy", True, has_numpy, "pip install numpy   (or: sudo apt install python3-numpy)"),
        ("ffmpeg", True, bool(_found("ffmpeg")), "sudo apt install ffmpeg   /   brew install ffmpeg"),
        ("ffprobe", True, bool(_found("ffprobe")), "comes with ffmpeg"),
        ("fc-cache (fontconfig)", True, bool(_found("fc-cache")), "sudo apt install fontconfig   /   brew install fontconfig"),
        ("kit fonts", True, has_fonts, f"python3 {os.path.join(KIT, 'ec.py')} fonts"),
        ("node + npx (>= 18)", False, bool(_found("npx")),
         "https://nodejs.org  - voice + word timestamps via `npx hyperframes`"),
        ("Kokoro voice venv", False, has_kokoro,
         "python3 -m venv ~/.venvs/kokoro && ~/.venvs/kokoro/bin/pip install kokoro-onnx soundfile"),
        ("heygen CLI", False, bool(_found("heygen") or os.environ.get("HEYGEN_API_BASE")),
         "music/SFX catalog + alt. voice: https://developers.heygen.com/cli, then `heygen auth login --oauth`"),
        ("edge-tts", False, bool(_found("edge-tts") or _found("~/.local/bin/edge-tts")),
         "alt. free voice (needs internet): pipx install edge-tts"),
        ("media-use skill", False, has_media_use,
         "music + SFX engine, from the HyperFrames skills: https://github.com/heygen-com/hyperframes"),
    ]
    missing = 0
    for name, required, ok, how in checks:
        tag = "OK  " if ok else ("FAIL" if required else "warn")
        print(f"  {tag}  {name:24}" + ("" if ok else f"  -> {how}"))
        missing += required and not ok
    print(f"doctor: {missing} required missing." if missing else
          "doctor: ready. Try it: python3 " + os.path.abspath(__file__) + " demo   (a silent 20 s sample, ~7 min on CPU)")
    if missing:
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    cmd, args = sys.argv[1], sys.argv[2:]
    if cmd in ("doctor", "fonts", "demo"):  # machine-level: no project needed
        {"doctor": cmd_doctor, "fonts": cmd_fonts, "demo": cmd_demo}[cmd](None, args)
        sys.exit(0)
    fn = {"new": cmd_new, "import": cmd_import, "run": cmd_run, "rebuild": cmd_rebuild, "layers": cmd_layers,
          "frames": cmd_frames, "sheet": cmd_sheet, "qa": cmd_qa, "render": cmd_render, "qa-video": cmd_qa_video,
          "look": cmd_look, "compare": cmd_compare, "fonts": cmd_fonts}.get(cmd)
    if not fn:
        print(__doc__)
        sys.exit(2)
    fn(cfg(), args)
