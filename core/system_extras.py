import collections
import ctypes
import json
import os
import shutil
import threading
import time
import urllib.request
from pathlib import Path

LAUNCHER_VERSION = "1.4.2"
DEFAULT_GH_REPO = "thedmitgame/SonicGamesLauncher"


def load_shots_meta(base_dir):
    mp = os.path.join(base_dir, "screenshots", "shots_meta.json")
    if os.path.isfile(mp):
        try:
            return json.loads(Path(mp).read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def save_shot_meta(base_dir, filename, game_id, game_name, zone="", character=""):
    sdir = os.path.join(base_dir, "screenshots")
    os.makedirs(sdir, exist_ok=True)
    meta = load_shots_meta(base_dir)
    meta[filename] = {
        "gameId": game_id or "unknown", "gameName": game_name or game_id or "Unknown",
        "date": time.strftime("%Y-%m-%d %H:%M"),
        "zone": zone or "", "character": character or "",
        "tags": [x for x in (game_name, zone, character) if x]
    }
    Path(os.path.join(sdir, "shots_meta.json")).write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return meta[filename]

class InstantReplayRecorder:
    def __init__(self):
        self.enabled = False
        self.running_game = None
        self.base_dir = "."
        self.buf = collections.deque(maxlen=65)
        self.lock = threading.Lock()
        self.thread = None
        self.last_saved = ""
        self._f8_down = False

    def configure(self, enabled, base_dir):
        self.base_dir = base_dir
        self.enabled = bool(enabled)
        if self.enabled and (self.thread is None or not self.thread.is_alive()):
            self.thread = threading.Thread(target=self._loop, daemon=True)
            self.thread.start()

    def set_running_game(self, game_id):
        self.running_game = game_id
        if not game_id:
            with self.lock:
                self.buf.clear()

    def _loop(self):
        try:
            from PIL import Image, ImageGrab
        except Exception:
            return
        while self.enabled:
            try:
                f8 = bool(ctypes.windll.user32.GetAsyncKeyState(0x77) & 0x8000)
                if f8 and not self._f8_down and self.buf:
                    self.save_gif()
                self._f8_down = f8
            except Exception:
                pass
            if self.running_game:
                try:
                    img = ImageGrab.grab().resize((640, 360), Image.Resampling.BILINEAR)
                    with self.lock:
                        self.buf.append(img.convert("P", palette=Image.Palette.ADAPTIVE, colors=96))
                except Exception:
                    pass
                time.sleep(0.22)
            else:
                time.sleep(0.6)

    def save_gif(self):
        with self.lock:
            frames = list(self.buf)
        if not frames:
            return ""
        sdir = os.path.join(self.base_dir, "screenshots")
        os.makedirs(sdir, exist_ok=True)
        gid = self.running_game or "replay"
        fn = f"replay_{gid}_{time.strftime('%Y%m%d_%H%M%S')}.gif"
        out_p = os.path.join(sdir, fn)
        frames[0].save(out_p, save_all=True, append_images=frames[1:], duration=220, loop=0, optimize=True)
        save_shot_meta(self.base_dir, fn, gid, gid, "Instant Replay GIF", "F8")
        self.last_saved = out_p
        return out_p


REPLAY = InstantReplayRecorder()

def _dir_size_bytes(path):
    total = 0
    if not os.path.isdir(path):
        return 0
    for root, _, files in os.walk(path):
        for fn in files:
            try:
                total += os.path.getsize(os.path.join(root, fn))
            except Exception:
                pass
    return total


def get_cleaner_stats(base_dir):
    b_sz = _dir_size_bytes(os.path.join(base_dir, "backups"))
    s_sz = _dir_size_bytes(os.path.join(base_dir, "screenshots"))
    c_sz = 0
    for name in ("__pycache__", "cache", "logs", "core/__pycache__"):
        c_sz += _dir_size_bytes(os.path.join(base_dir, name))
    return {
        "backupsMb": round(b_sz / (1024 * 1024), 2),
        "screenshotsMb": round(s_sz / (1024 * 1024), 2),
        "cacheMb": round(c_sz / (1024 * 1024), 2),
        "totalMb": round((b_sz + s_sz + c_sz) / (1024 * 1024), 2)
    }


def run_safe_cleanup(base_dir, clean_backups=True, clean_cache=True):
    freed = 0
    if clean_cache:
        for name in ("__pycache__", "cache", "logs", os.path.join("core", "__pycache__")):
            p = os.path.join(base_dir, name)
            if os.path.isdir(p):
                freed += _dir_size_bytes(p)
                shutil.rmtree(p, ignore_errors=True)
    if clean_backups:
        bdir = os.path.join(base_dir, "backups")
        if os.path.isdir(bdir):
            zips = sorted(
                [os.path.join(bdir, f) for f in os.listdir(bdir) if f.lower().endswith(".zip")],
                key=os.path.getmtime, reverse=True
            )
            for old_z in zips[3:]:
                try:
                    freed += os.path.getsize(old_z)
                    os.remove(old_z)
                except Exception:
                    pass
    return {"ok": True, "freedMb": round(freed / (1024 * 1024), 2), "stats": get_cleaner_stats(base_dir)}

def _ver_tuple(v):
    nums = [int(x) for x in str(v).lstrip("vV").split(".") if x.isdigit()]
    return tuple(nums) if nums else (0,)


def check_github_update(cfg):
    repo = (cfg.get("githubRepo") or DEFAULT_GH_REPO).strip()
    api_url = f"https://api.github.com/repos/{repo}/releases/latest"
    req = urllib.request.Request(api_url, headers={"User-Agent": "SonicGamesLauncher/" + LAUNCHER_VERSION})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        latest = str(data.get("tag_name") or LAUNCHER_VERSION).lstrip("vV")
        has_upd = _ver_tuple(latest) > _ver_tuple(LAUNCHER_VERSION)
        return {
            "ok": True, "offline": False, "current": LAUNCHER_VERSION, "latest": latest,
            "hasUpdate": has_upd, "notes": str(data.get("body") or "Нет описания релиза."),
            "htmlUrl": str(data.get("html_url") or f"https://github.com/{repo}/releases")
        }
    except Exception as ex:
        return {
            "ok": False, "offline": True, "current": LAUNCHER_VERSION, "latest": LAUNCHER_VERSION,
            "hasUpdate": False, "notes": f"Не удалось проверить GitHub (оффлайн или релиз не найден): {ex}",
            "htmlUrl": f"https://github.com/{repo}/releases"
        }
