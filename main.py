import hashlib
import struct
import re
import base64
import zipfile
import webview
import json
import os
import subprocess
import threading
import sys
import time
import shutil
import ctypes
from datetime import datetime
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import urllib.parse

try:
    import pystray
    from PIL import Image, ImageDraw, ImageGrab
    import keyboard
    HAS_EXTRAS = True
except ImportError:
    HAS_EXTRAS = False

if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
    RESOURCE_DIR = sys._MEIPASS
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    RESOURCE_DIR = BASE_DIR

def sanitize_filename(name):
    return re.sub(r'[\\/*?:"<>|]', "_", str(name)).strip() or "sonic_theme_pack"

def cleanup_old_files(folder, prefix):
    for fn in os.listdir(folder):
        if fn.startswith(prefix):
            try:
                os.remove(os.path.join(folder, fn))
            except Exception:
                pass
CONFIG_FILE = os.path.join(BASE_DIR, "sonic_launcher_config.json")
IMAGES_DIR = os.path.join(BASE_DIR, "images")
SOUNDS_DIR = os.path.join(BASE_DIR, "sounds")
FONTS_DIR = os.path.join(BASE_DIR, "fonts")
SCREENSHOTS_DIR = os.path.join(BASE_DIR, "screenshots")
THEMES_DIR = os.path.join(BASE_DIR, "themes")

for folder in (IMAGES_DIR, SOUNDS_DIR, FONTS_DIR, SCREENSHOTS_DIR, THEMES_DIR):
    os.makedirs(folder, exist_ok=True)

DEFAULT_GAMES = [
    {"id": "sonic1", "name": "Sonic 1 Forever", "color": "#1E90FF", "tag": "1991 • REMASTER"},
    {"id": "sonic2", "name": "Sonic 2 Absolute", "color": "#FF8C00", "tag": "1992 • REMASTER"},
    {"id": "soniccd", "name": "Sonic CD Restored", "color": "#FF69B4", "tag": "1993 • REMASTER"},
    {"id": "sonic3", "name": "Sonic 3 A.I.R.", "color": "#DC143C", "tag": "1994 • WIDESCREEN"},
    {"id": "origins", "name": "Sonic Origins", "color": "#2E8B57", "tag": "COLLECTION"}
]

DEFAULT_DESIGN = {
    "cardWidth": 210,
    "cardRadius": 14,
    "cardStyle": "glass",
    "shaderType": "none",
    "logoHeight": 75,
    "fontFamily": "'Segoe UI', Roboto, Arial, sans-serif",
    "customFontUrl": "",
    "customFontName": "",
    "fontScale": 100,
    "textColor": "#ffffff",
    "titleColor": "#FFD700",
    "backdropOpacity": 55,
    "backdropBlur": 4,
    "objOpacity": 45,
    "objCount": 14,
    "objSpeed": 5,
    "sfxVolume": 70,
    "bgmVolume": 40,
    "minimizeOnLaunch": True,
    "minimizeToTray": False,
    "appIconUrl": "",
    "appIconName": "",
    "screenshotKey": "f6",
    "characters": {},
    "customLayout": {},
    "gradients": {
        "default": ["#090d16", "#0d2b6b"],
        "sonic1": ["#041e42", "#0077ff"],
        "sonic2": ["#2b1100", "#ff7700"],
        "soniccd": ["#1a1446", "#d63384"],
        "sonic3": ["#091d42", "#c8102e"],
        "origins": ["#072617", "#1e8e54"]
    }
}

window_instance = None
tray_icon = None
active_game_id = None
current_hotkey = None

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if "paths" not in data:
                    return {
                        "gamesOrder": DEFAULT_GAMES, "paths": data, "launchArgs": {},
                        "modPaths": {}, "modPresets": {}, "smmPath": "",
                        "playtime": {}, "design": DEFAULT_DESIGN
                    }
                design = {**DEFAULT_DESIGN, **data.get("design", {})}
                return {
                    "gamesOrder": data.get("gamesOrder", DEFAULT_GAMES),
                    "paths": data.get("paths", {}),
                    "launchArgs": data.get("launchArgs", {}),
                    "modPaths": data.get("modPaths", {}),
                    "modPresets": data.get("modPresets", {}),
                    "smmPath": data.get("smmPath", ""),
                    "playtime": data.get("playtime", {}),
                    "design": design,
                    "intro_enabled": data.get("intro_enabled", False),
                    "intro_media_path": data.get("intro_media_path", ""),
                    "daytime_fx": data.get("daytime_fx", True),
                    "daytime_override": data.get("daytime_override", "auto"),
                    "lang": data.get("lang", "ru")
                }
        except Exception:
            pass
    return {
        "gamesOrder": DEFAULT_GAMES, "paths": {}, "launchArgs": {},
        "modPaths": {}, "modPresets": {}, "smmPath": "",
        "playtime": {}, "design": DEFAULT_DESIGN
    }

def save_config(data):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def find_asset(folder, url_prefix, name, extensions):
    for ext in extensions:
        filename = f"{name}{ext}"
        if os.path.exists(os.path.join(folder, filename)):
            return f"{url_prefix}/{filename}"
    return None

def scan_all_sounds():
    names = [
        "startup", "switch", "launch", "open_menu", "close_menu", "exit", "screenshot",
        "default_bgm", "sonic1_bgm", "sonic2_bgm", "soniccd_bgm", "sonic3_bgm", "origins_bgm"
    ]
    found = {}
    for n in names:
        url = find_asset(SOUNDS_DIR, "/sounds", n, ['.mp3', '.wav', '.ogg'])
        if url:
            found[n] = url
    return found

def find_floating_objects():
    objects = []
    if os.path.exists(IMAGES_DIR):
        for fname in sorted(os.listdir(IMAGES_DIR)):
            lower = fname.lower()
            if lower.startswith("object") and lower.endswith(('.png', '.jpg', '.jpeg', '.webp', '.gif')):
                objects.append(f"/images/{fname}")
    return objects

def resolve_mods_dir(game_id, cfg):
    custom = cfg.get("modPaths", {}).get(game_id, "")
    if custom and os.path.exists(custom):
        return custom
    if game_id == "sonic3":
        appdata = os.environ.get("APPDATA", "")
        s3_mods = os.path.join(appdata, "Sonic3AIR", "mods")
        if os.path.exists(s3_mods):
            return s3_mods
    exe = cfg.get("paths", {}).get(game_id, "")
    if exe and os.path.exists(exe):
        game_mods = os.path.join(os.path.dirname(exe), "mods")
        if os.path.exists(game_mods):
            return game_mods
    return ""

def find_modconfig_path(mods_dir):
    in_mods = os.path.join(mods_dir, "modconfig.ini")
    if os.path.exists(in_mods):
        return in_mods
    in_root = os.path.join(os.path.dirname(mods_dir), "modconfig.ini")
    if os.path.exists(in_root):
        return in_root
    return in_mods

def get_game_mods(game_id, cfg):
    mods_dir = resolve_mods_dir(game_id, cfg)
    presets = cfg.get("modPresets", {}).get(game_id, {})
    if not mods_dir or not os.path.exists(mods_dir):
        return {"modsDir": mods_dir, "mods": [], "presets": presets, "supported": game_id != "origins"}

    mods_list = []
    if game_id == "sonic3":
        active_file = os.path.join(os.path.dirname(mods_dir), "active-mods.json")
        active_lower = set()
        if os.path.exists(active_file):
            try:
                with open(active_file, "r", encoding="utf-8-sig") as f:
                    data = json.load(f)
                    for item in data.get("ActiveMods", []):
                        active_lower.add(str(item).strip().lower())
            except Exception:
                pass
        for folder in sorted(os.listdir(mods_dir)):
            full = os.path.join(mods_dir, folder)
            if not os.path.isdir(full):
                continue
            title, author = folder, "Неизвестно"
            meta = os.path.join(full, "mod.json")
            if os.path.exists(meta):
                try:
                    with open(meta, "r", encoding="utf-8-sig") as f:
                        m = json.load(f).get("Metadata", {})
                        title = m.get("Name", folder)
                        author = m.get("Author", "Неизвестно")
                except Exception:
                    pass
            mods_list.append({
                "id": folder, "title": title, "author": author,
                "enabled": folder.strip().lower() in active_lower
            })
    else:
        modconfig = find_modconfig_path(mods_dir)
        enabled_map = {}
        if os.path.exists(modconfig):
            try:
                with open(modconfig, "r", encoding="utf-8-sig", errors="ignore") as f:
                    for line in f:
                        line = line.strip()
                        if "=" in line and not line.startswith(";") and not line.startswith("#"):
                            k, v = line.split("=", 1)
                            enabled_map[k.strip().lower()] = v.strip().lower() in ("true", "1", "yes")
            except Exception:
                pass

        for folder in sorted(os.listdir(mods_dir)):
            full = os.path.join(mods_dir, folder)
            if not os.path.isdir(full):
                continue
            title, author = folder, "Неизвестно"
            ini_path = os.path.join(full, "mod.ini")
            if os.path.exists(ini_path):
                try:
                    with open(ini_path, "r", encoding="utf-8-sig", errors="ignore") as f:
                        for line in f:
                            line = line.strip()
                            if "=" in line:
                                k, v = line.split("=", 1)
                                kl = k.strip().lower()
                                if kl == "name":
                                    title = v.strip()
                                elif kl == "author":
                                    author = v.strip()
                except Exception:
                    pass
            mods_list.append({
                "id": folder, "title": title, "author": author,
                "enabled": enabled_map.get(folder.strip().lower(), False)
            })
    return {"modsDir": mods_dir, "mods": mods_list, "presets": presets, "supported": True}
def toggle_game_mod(game_id, mod_id, enabled, cfg):
    mods_dir = resolve_mods_dir(game_id, cfg)
    if not mods_dir or not os.path.exists(mods_dir):
        return False
    if game_id == "sonic3":
        active_file = os.path.join(os.path.dirname(mods_dir), "active-mods.json")
        data = {"ActiveMods": []}
        if os.path.exists(active_file):
            try:
                with open(active_file, "r", encoding="utf-8-sig") as f:
                    data = json.load(f)
            except Exception:
                pass
        active = [x for x in data.get("ActiveMods", []) if str(x).strip().lower() != mod_id.strip().lower()]
        if enabled:
            active.insert(0, mod_id)
        data["ActiveMods"] = active
        with open(active_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        return True
    else:
        modconfig = find_modconfig_path(mods_dir)
        lines = []
        found = False
        if os.path.exists(modconfig):
            try:
                with open(modconfig, "r", encoding="utf-8-sig", errors="ignore") as f:
                    for line in f:
                        stripped = line.strip()
                        if "=" in stripped and not stripped.startswith(";"):
                            k, _ = stripped.split("=", 1)
                            if k.strip().lower() == mod_id.strip().lower():
                                lines.append(f"{k.strip()}={'true' if enabled else 'false'}\n")
                                found = True
                                continue
                        lines.append(line if line.endswith("\n") else line + "\n")
            except Exception:
                pass
        if not found:
            if not any(l.strip().lower() == "[mods]" for l in lines):
                lines.append("[mods]\n")
            lines.append(f"{mod_id}={'true' if enabled else 'false'}\n")
        with open(modconfig, "w", encoding="utf-8") as f:
            f.writelines(lines)
        return True

def get_game_tweaks(game_id, cfg):
    if game_id == "sonic3":
        appdata = os.environ.get("APPDATA", "")
        s3_cfg = os.path.join(appdata, "Sonic3AIR", "settings.json")
        tweaks = {"fullscreen": False, "vsync": True, "devmode": False, "filtering": False, "supported": True}
        if os.path.exists(s3_cfg):
            try:
                with open(s3_cfg, "r", encoding="utf-8-sig") as f:
                    d = json.load(f)
                    tweaks["fullscreen"] = bool(d.get("Fullscreen", 0))
                    tweaks["vsync"] = bool(d.get("VSync", 1))
                    tweaks["devmode"] = bool(d.get("DevMode", 0))
                    tweaks["filtering"] = bool(d.get("Filtering", 0))
            except Exception:
                pass
        return tweaks

    exe = cfg.get("paths", {}).get(game_id, "")
    if not exe or not os.path.exists(exe) or game_id == "origins":
        return {"supported": False}

    ini_path = os.path.join(os.path.dirname(exe), "settings.ini")
    tweaks = {"fullscreen": False, "borderless": False, "vsync": True, "devmode": False, "filtering": False, "supported": True}
    if os.path.exists(ini_path):
        try:
            with open(ini_path, "r", encoding="utf-8-sig", errors="ignore") as f:
                for line in f:
                    s = line.strip()
                    if "=" in s and not s.startswith(";"):
                        k, v = s.split("=", 1)
                        kl = k.strip().lower()
                        val = v.strip().lower() in ("true", "1", "yes")
                        if kl == "fs":
                            tweaks["fullscreen"] = val
                        elif kl == "borderless":
                            tweaks["borderless"] = val
                        elif kl == "vsync":
                            tweaks["vsync"] = val
                        elif kl == "devmenu":
                            tweaks["devmode"] = val
                        elif kl in ("pixelfilter", "filtering"):
                            tweaks["filtering"] = val
        except Exception:
            pass
    return tweaks

def save_game_tweaks(game_id, tweaks, cfg):
    if game_id == "sonic3":
        appdata = os.environ.get("APPDATA", "")
        s3_cfg = os.path.join(appdata, "Sonic3AIR", "settings.json")
        if os.path.exists(s3_cfg):
            try:
                with open(s3_cfg, "r", encoding="utf-8-sig") as f:
                    d = json.load(f)
                d["Fullscreen"] = 1 if tweaks.get("fullscreen") else 0
                d["VSync"] = 1 if tweaks.get("vsync") else 0
                d["DevMode"] = 1 if tweaks.get("devmode") else 0
                d["Filtering"] = 1 if tweaks.get("filtering") else 0
                with open(s3_cfg, "w", encoding="utf-8") as f:
                    json.dump(d, f, indent=4)
                return True
            except Exception:
                pass
        return False

    exe = cfg.get("paths", {}).get(game_id, "")
    if not exe or not os.path.exists(exe):
        return False

    ini_path = os.path.join(os.path.dirname(exe), "settings.ini")
    key_map = {
        "fs": "true" if tweaks.get("fullscreen") else "false",
        "borderless": "true" if tweaks.get("borderless") else "false",
        "vsync": "true" if tweaks.get("vsync") else "false",
        "devmenu": "true" if tweaks.get("devmode") else "false",
        "pixelfilter": "true" if tweaks.get("filtering") else "false"
    }
    lines = []
    updated = set()
    if os.path.exists(ini_path):
        try:
            with open(ini_path, "r", encoding="utf-8-sig", errors="ignore") as f:
                for line in f:
                    s = line.strip()
                    if "=" in s and not s.startswith(";"):
                        k, _ = s.split("=", 1)
                        kl = k.strip().lower()
                        if kl in key_map:
                            lines.append(f"{k.strip()}={key_map[kl]}\n")
                            updated.add(kl)
                            continue
                    lines.append(line if line.endswith("\n") else line + "\n")
        except Exception:
            pass

    if not any(l.strip().lower() == "[video]" for l in lines):
        lines.append("[Video]\n")
    for kl, val in key_map.items():
        if kl not in updated:
            lines.append(f"{kl}={val}\n")

    with open(ini_path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    return True

def play_native_sound(sound_path, vol_percent=70):
    if not sound_path or not os.path.exists(sound_path) or vol_percent <= 0:
        return
    try:
        alias = f"snd_{int(time.time() * 1000)}"
        mci_vol = int(vol_percent * 10)
        ctypes.windll.winmm.mciSendStringW(f'open "{sound_path}" alias {alias}', None, 0, None)
        ctypes.windll.winmm.mciSendStringW(f'setaudio {alias} volume to {mci_vol}', None, 0, None)
        ctypes.windll.winmm.mciSendStringW(f'play {alias}', None, 0, None)
    except Exception:
        pass

def take_screenshot_action():
    if not HAS_EXTRAS:
        return
    target_id = active_game_id or "general"
    save_dir = os.path.join(SCREENSHOTS_DIR, target_id)
    os.makedirs(save_dir, exist_ok=True)
    fname = datetime.now().strftime("shot_%Y%m%d_%H%M%S.png")
    try:
        img = ImageGrab.grab()
        img.save(os.path.join(save_dir, fname))
        for ext in ('.wav', '.mp3', '.ogg'):
            s_path = os.path.join(SOUNDS_DIR, f"screenshot{ext}")
            if os.path.exists(s_path):
                threading.Thread(target=play_native_sound, args=(s_path,), daemon=True).start()
                break
    except Exception:
        pass

def register_screenshot_hotkey(key_name):
    global current_hotkey
    if not HAS_EXTRAS:
        return
    try:
        if current_hotkey:
            keyboard.remove_hotkey(current_hotkey)
    except Exception:
        pass
    if key_name:
        try:
            current_hotkey = keyboard.add_hotkey(key_name, take_screenshot_action)
        except Exception:
            current_hotkey = None

def build_tray_image(icon_url):
    if icon_url:
        local_path = os.path.join(BASE_DIR, icon_url.lstrip("/").replace("/", os.sep))
        if os.path.exists(local_path):
            try:
                return Image.open(local_path).resize((64, 64))
            except Exception:
                pass
    img = Image.new("RGBA", (64, 64), (13, 43, 107, 255))
    draw = ImageDraw.Draw(img)
    draw.ellipse((10, 10, 54, 54), outline=(255, 215, 0, 255), width=7)
    return img

def stop_tray_cleanly():
    global tray_icon
    if tray_icon:
        try:
            tray_icon.visible = False
            tray_icon.stop()
        except Exception:
            pass
        tray_icon = None

def start_tray_icon(icon_url=""):
    global tray_icon
    if not HAS_EXTRAS:
        return
    if tray_icon:
        try:
            tray_icon.icon = build_tray_image(icon_url)
            return
        except Exception:
            pass

    def on_show(icon, item):
        if window_instance:
            window_instance.show()
            window_instance.restore()

    def on_quit(icon, item):
        icon.stop()
        if window_instance:
            window_instance.destroy()
        os._exit(0)

    menu = pystray.Menu(
        pystray.MenuItem("Открыть Sonic Launcher", on_show, default=True),
        pystray.MenuItem("Выход", on_quit)
    )
    tray_icon = pystray.Icon("SonicLauncher", build_tray_image(icon_url), "Sonic Launcher", menu)
    threading.Thread(target=tray_icon.run, daemon=True).start()
def monitor_game_session(game_id, proc, minimize, to_tray):
    global active_game_id
    active_game_id = game_id
    start_ts = time.time()
    if window_instance:
        try:
            if to_tray:
                window_instance.hide()
            elif minimize:
                window_instance.minimize()
        except Exception:
            pass

    proc.wait()
    elapsed = int(time.time() - start_ts)
    if elapsed >= 1:
        cfg = load_config()
        pt = cfg.get("playtime", {})
        pt[game_id] = pt.get(game_id, 0) + elapsed
        cfg["playtime"] = pt
        save_config(cfg)

    active_game_id = None
    if window_instance:
        try:
            if to_tray or minimize:
                window_instance.show()
                window_instance.restore()
        except Exception:
            pass

def get_query_param(query, name):
    vals = query.get(name)
    return vals.pop(0) if vals else ""

def open_native_dialog(filetypes=None, is_dir=False, initialdir=None):
    chosen = {"path": ""}
    done_ev = threading.Event()
    def _run_tk():
        try:
            import tkinter as tk
            from tkinter import filedialog
            r = tk.Tk()
            r.withdraw()
            r.attributes('-topmost', True)
            if is_dir:
                res = filedialog.askdirectory(initialdir=initialdir) if initialdir else filedialog.askdirectory()
            else:
                ft = filetypes if filetypes else [('All', '*.*')]
                res = filedialog.askopenfilename(filetypes=ft, initialdir=initialdir) if initialdir else filedialog.askopenfilename(filetypes=ft)
            chosen["path"] = str(res) if res else ""
            r.destroy()
        except Exception:
            pass
        finally:
            done_ev.set()
    threading.Thread(target=_run_tk, daemon=True).start()
    done_ev.wait(timeout=120)
    return chosen["path"].strip()


RSDK_CACHE_DIR = os.path.join(BASE_DIR, "rsdk_cache")
os.makedirs(RSDK_CACHE_DIR, exist_ok=True)

def decrypt_origins_data_dat():
    app_base = os.path.join(os.environ.get("APPDATA", ""), "SEGA", "SonicOrigins", "steam")
    if not os.path.isdir(app_base):
        return b""
    dat_path = None
    for uid in os.listdir(app_base):
        cand = os.path.join(app_base, uid, "game", "data.dat")
        if os.path.exists(cand):
            dat_path = cand
            break
    if not dat_path:
        return b""
    try:
        with open(dat_path, "rb") as f:
            raw = f.read()
        if len(raw) <= 64:
            return b""
        body = raw[64:]
        xor_key = bytes.fromhex("dadecf25a079d673ab43f286b1188401")
        dec = bytes(b ^ xor_key[i % 16] for i, b in enumerate(body))
        return dec
    except Exception:
        return b""

def read_steam_origins_stats():
    try:
        import winreg
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam")
        steam_path, _ = winreg.QueryValueEx(key, "SteamPath")
        stats_dir = os.path.join(steam_path, "appcache", "stats")
        if not os.path.isdir(stats_dir):
            return {"found": False, "note": "Папка статистики Steam не найдена"}

        schema_path = os.path.join(stats_dir, "UserGameStatsSchema_1794960.bin")
        user_stats_path = None
        for fn in os.listdir(stats_dir):
            if "1794960" in fn and fn.lower().endswith(".bin") and "schema" not in fn.lower():
                user_stats_path = os.path.join(stats_dir, fn)
                break

        if not os.path.exists(schema_path) and not user_stats_path:
            return {"found": False, "note": "Статистика Steam для Sonic Origins (1794960) ещё не создана"}

        # 1. Извлекаем 36 официальных названий достижений из Steam Schema под выбранный язык (ru / en)
        cur_lang = load_config().get("lang", "ru")
        lang_tag = b"\x01russian\x00" if cur_lang == "ru" else b"\x01english\x00"
        ru_titles = []
        if os.path.exists(schema_path):
            with open(schema_path, "rb") as bf:
                raw = bf.read()
            lang_strings = re.findall(lang_tag + b"([^\x00]{2,140})\x00", raw)
            if not lang_strings and lang_tag != b"\x01english\x00":
                lang_strings = re.findall(b"\x01english\x00([^\x00]{2,140})\x00", raw)
            for i in range(0, len(lang_strings), 2):
                ru_titles.append(lang_strings[i].decode("utf-8", errors="ignore").strip())

        # 2. Читаем битовую маску 36 достижений из UserGameStats
        unlocked_mask = 0
        if user_stats_path and os.path.exists(user_stats_path):
            with open(user_stats_path, "rb") as uf:
                u_raw = uf.read()
            m1 = u_raw.find(b"\x001\x00\x02data\x00")
            if m1 != -1 and m1 + 13 <= len(u_raw):
                low32 = int.from_bytes(u_raw[m1 + 9 : m1 + 13], "little", signed=False)
                unlocked_mask |= low32
            cut_pos = u_raw.find(b"AchievementTimes")
            search_area = u_raw[:cut_pos] if cut_pos != -1 else u_raw
            m2 = search_area.find(b"\x002\x00\x02data\x00")
            if m2 != -1 and m2 + 13 <= len(search_area):
                high32 = int.from_bytes(search_area[m2 + 9 : m2 + 13], "little", signed=False)
                unlocked_mask |= (high32 << 32)
            for extra_bit in range(32, 36):
                tag = f"\x00{extra_bit}\x00\x02data\x00".encode("ascii")
                if tag in u_raw:
                    unlocked_mask |= (1 << extra_bit)

        ach_entries = []
        for i in range(36):
            title = ru_titles[i] if i < len(ru_titles) else f"Достижение #{i+1}"
            ach_entries.append({"name": title, "done": bool((unlocked_mask >> i) & 1)})

        # 3. Расшифровываем data.dat и проверяем точные диапазоны 4 игр (по бинарному анализу data.dat)
        dec_dat = b""
        app_base = os.path.join(os.environ.get("APPDATA", ""), "SEGA", "SonicOrigins", "steam")
        if os.path.isdir(app_base):
            for uid in os.listdir(app_base):
                cand = os.path.join(app_base, uid, "game", "data.dat")
                if os.path.exists(cand):
                    with open(cand, "rb") as df:
                        raw_d = df.read()
                    if len(raw_d) > 64:
                        xk = bytes.fromhex("dadecf25a079d673ab43f286b1188401")
                        dec_dat = bytes(b ^ xk[idx % 16] for idx, b in enumerate(raw_d[64:]))
                    break

        slots_info = []
        total_emeralds = 0
        if dec_dat and len(dec_dat) >= 5200:
            game_specs = [
                ("Sonic The Hedgehog 1", 0, 912, "Соник"),
                ("Sonic CD", 912, 2050, "Соник"),
                ("Sonic The Hedgehog 2", 3150, 5200, "Соник и Тейлз"),
                ("Sonic 3 & Knuckles", 4300, 4600, ""),
            ]
            # Строго проверяем достижения именно за сбор всех 7 Изумрудов Хаоса или 7 Камней Времени
            chaos_done = any(a["done"] and ("изумруд" in a["name"].lower() and "супер-изумруд" not in a["name"].lower()) for a in ach_entries)
            stones_done = any(a["done"] and ("камн" in a["name"].lower()) for a in ach_entries)
            super_em_done = any(a["done"] and ("супер-изумруд" in a["name"].lower()) for a in ach_entries)

            for g_name, s_start, s_end, default_hero in game_specs:
                seg = dec_dat[s_start:s_end]
                nz_words = sum(
                    1 for off in range(0, len(seg) - 3, 4)
                    if int.from_bytes(seg[off : off + 4], "little") not in (0, 0xFFFFFFFF)
                )
                if nz_words >= 4:
                    if g_name == "Sonic CD":
                        em_cnt = 7 if stones_done else 0
                    elif g_name == "Sonic 3 & Knuckles":
                        em_cnt = 7 if (chaos_done or super_em_done) else 0
                    else:
                        em_cnt = 7 if chaos_done else 0

                    total_emeralds = max(total_emeralds, em_cnt)
                    slots_info.append({
                        "name": g_name,
                        "info": f"Сохранение активно • Изумрудов/Камней: {em_cnt}/7"
                    })
                else:
                    slots_info.append({
                        "name": f"{g_name} (Нет сохранения)",
                        "info": "Слот пуст • Изумрудов/Камней: 0/7"
                    })
        else:
            slots_info.append({"name": "Steam Cloud Save (Sonic Origins)", "info": "Файл data.dat не найден"})

        total_done = sum(1 for a in ach_entries if a["done"])
        return {
            "found": True,
            "emeralds": total_emeralds,
            "slots": slots_info,
            "details": f"Открыто достижений Steam: {total_done} из 36",
            "achievements": ach_entries
        }
    except Exception as e:
        return {"found": False, "note": f"Ошибка чтения Steam: {e}"}

def rsdkv4_decrypt_chunk(data, filename_upper, file_size):
    key1 = hashlib.md5(filename_upper.encode("utf-8")).digest()
    key2 = hashlib.md5(str(file_size).encode("utf-8")).digest()
    out = bytearray(len(data))
    k1_pos = 0
    k2_pos = 8
    swap = False
    for i, b in enumerate(data):
        val = b ^ key1[k1_pos] ^ key2[k2_pos]
        if swap:
            val = ((val & 0x0F) << 4) | ((val & 0xF0) >> 4)
        out[i] = val
        k1_pos = (k1_pos + 1) & 15
        k2_pos = (k2_pos + 1) & 15
        if k1_pos == 0:
            swap = not swap
    return bytes(out)

BUILTIN_ACHIEVEMENTS = {
    "sonic1": [
        "Blast Processing",
        "Ring King",
        "Ramp Ring Acrobatics",
        "Secret of Marble Zone",
        "Block Buster",
        "Rooftop Run",
        "Chaos Connoisseur",
        "Secret of Labyrinth Zone",
        "Flawless Pursuit",
        "Out of Order",
        "Bombs Away",
        "Hidden Transporter",
        "Eye Protection",
        "One for the Road",
        "Beat the Clock",
        "Stairway To Heaven",
        "Death Chamber",
        "Get to the Points",
        "Monitor Mania"
    ],
    "sonic2": [
        "Super Sonic Time Attack",
        "Expert's Challenge",
        "Tour of the Plant",
        "Quick Run",
        "100% Chemical Free",
        "Early Bird Special",
        "Superstar",
        "Gambling Problem",
        "Bop Non-Stop",
        "Perfectionist",
        "No Future Here",
        "Metropolis Master",
        "Beat the Clock... Again...",
        "Scrambled Egg"
    ],
    "soniccd": [
        "88 Miles Per Hour",
        "Just one hug is enough",
        "Take the High Road",
        "King of the Rings",
        "Statue Saviour",
        "Heavy Metal",
        "Paradise Found",
        "All Stages Clear!",
        "Treasure Hunter",
        "Dr. Eggman Got Served",
        "Just in Time!",
        "Saviour of the Planet",
        "Dr. Robotnik Got Served"
    ],
    "sonic3": [
        "Attracted to Shiny Things",
        "Double Dose of Stars",
        "Old-Fashioned Life Insurance",
        "Going Hyper",
        "Score Millionaire",
        "Electrofishing",
        "Longplay",
        "Tidied Up the Place",
        "Is There An Exit Up There",
        "Jackpot",
        "Bursting Through the Jungle",
        "Attracted to Giant Shiny Things",
        "Greedy Snowboarder",
        "Once See the Sunrise",
        "Fluffy Fur Must Not Get Wet",
        "Display Smasher",
        "Squirrels On a Plane",
        "No Touchy"
    ]
}

def read_udata_bytes(game_dir):
    if not game_dir or not os.path.isdir(game_dir):
        return b""
    for root, _, files in os.walk(game_dir):
        for fn in files:
            if fn.lower() in ("udata.bin", "achdata.bin", "achievements.bin"):
                try:
                    with open(os.path.join(root, fn), "rb") as f:
                        return f.read()
                except Exception:
                    pass
    return b""

def extract_native_achievements(gid, game_dir, raw_save_bytes):
    titles = BUILTIN_ACHIEVEMENTS.get(gid, [])
    if not titles:
        return []

    udata_bytes = read_udata_bytes(game_dir)
    if not raw_save_bytes and not udata_bytes:
        return [{"name": t, "done": False} for t in titles]

    if gid == "sonic3":
        # Точное соответствие BUILTIN_ACHIEVEMENTS["sonic3"] и констант из defines_achievements.lemon:
        s3_ach_ids = (
            0x0001,  # 0: Attracted to Shiny Things (ACHIEVEMENT_300_RINGS)
            0x0002,  # 1: Double Dose of Stars (ACHIEVEMENT_DOUBLE_INVINCIBILITY)
            0x0010,  # 2: Old-Fashioned Life Insurance (ACHIEVEMENT_CONTINUES)
            0x0011,  # 3: Going Hyper (ACHIEVEMENT_GOING_HYPER)
            0x0012,  # 4: Score Millionaire (ACHIEVEMENT_SCORE)
            0x0013,  # 5: Electrofishing (ACHIEVEMENT_ELECTROCUTE)
            0x0020,  # 6: Longplay (ACHIEVEMENT_LONGPLAY)
            0x0101,  # 7: Tidied Up the Place (ACHIEVEMENT_SSZ_DECOYS / AIZ) -> проверим точное сопоставление ниже
            0x1401,  # 8: Is There An Exit Up There (ACHIEVEMENT_GS_EXIT_TOP)
            0x1501,  # 9: Jackpot (ACHIEVEMENT_SM_JACKPOT)
            0x0101,  # 10: Bursting Through the Jungle (ACHIEVEMENT_AIZ_TIMEATTACK)
            0x0301,  # 11: Attracted to Giant Shiny Things (ACHIEVEMENT_MGZ_GIANTRINGS)
            0x0501,  # 12: Greedy Snowboarder (ACHIEVEMENT_ICZ_SNOWBOARDING)
            0x0502,  # 13: Once See the Sunrise (ACHIEVEMENT_ICZ_KNUX_SUNRISE)
            0x0601,  # 14: Fluffy Fur Must Not Get Wet (ACHIEVEMENT_LBZ_STAY_DRY)
            0x0701,  # 15: Display Smasher (ACHIEVEMENT_MHZ_OPEN_MONITORS)
            0x0801,  # 16: Squirrels On a Plane (ACHIEVEMENT_FBZ_FREE_ANIMALS)
            0x1601,  # 17: No Touchy (ACHIEVEMENT_BS_PERFECT)
        )
        # Примечание: индекс 7 ("Tidied Up the Place") — это ACHIEVEMENT_SSZ_DECOYS (0x0c01)
        s3_ach_ids = (
            0x0001, 0x0002, 0x0010, 0x0011, 0x0012, 0x0013,
            0x0020, 0x0c01, 0x1401, 0x1501, 0x0101, 0x0301,
            0x0501, 0x0502, 0x0601, 0x0701, 0x0801, 0x1601
        )

        unlocked_ids = set()
        if raw_save_bytes:
            # Формат 1: новый контейнер OXY.PDATA (storage/s3air_achievements.bin)
            if raw_save_bytes.startswith(b"OXY.PDATA\x00"):
                sec_tag = b"Achievements"
                sec_pos = raw_save_bytes.find(sec_tag)
                if sec_pos != -1 and sec_pos + len(sec_tag) + 8 <= len(raw_save_bytes):
                    v_len = int.from_bytes(raw_save_bytes[sec_pos + len(sec_tag) : sec_pos + len(sec_tag) + 4], "little")
                    payload = raw_save_bytes[sec_pos + len(sec_tag) + 4 : sec_pos + len(sec_tag) + 4 + v_len]
                    if len(payload) >= 4:
                        cnt = int.from_bytes(payload[0:4], "little")
                        for i in range(cnt):
                            off = 4 + i * 8
                            if off + 8 <= len(payload):
                                aid = int.from_bytes(payload[off : off + 4], "little")
                                st = int.from_bytes(payload[off + 4 : off + 8], "little")
                                if st > 0:
                                    unlocked_ids.add(aid)

            # Формат 2: классический файл S3AIRPGR (playerprogress.bin)
            elif raw_save_bytes.startswith(b"S3AIRPGR") and len(raw_save_bytes) >= 0x26:
                cnt = int.from_bytes(raw_save_bytes[0x22:0x26], "little")
                for i in range(min(cnt, 64)):
                    off = 0x26 + i * 8
                    if off + 8 <= len(raw_save_bytes):
                        aid = int.from_bytes(raw_save_bytes[off : off + 4], "little")
                        st = int.from_bytes(raw_save_bytes[off + 4 : off + 8], "little")
                        if st > 0:
                            unlocked_ids.add(aid)

        results = []
        for idx, title in enumerate(titles):
            aid = s3_ach_ids[idx]
            results.append({"name": title, "done": aid in unlocked_ids})
        return results

    def get_ones_indices(buf):
        ones = set()
        limit = min(len(buf) - 3, 8192)
        for off in range(128, limit, 4):
            # Пропускаем область настроек движка (saveRAM[1000..1020] -> offset 4000..4080)
            if 4000 <= off <= 4080:
                continue
            val = int.from_bytes(buf[off : off + 4], "little", signed=False)
            if val in (1, 2):
                ones.add(off // 4)
        return ones

    sdata_ones = get_ones_indices(raw_save_bytes) if raw_save_bytes else set()
    udata_ones = get_ones_indices(udata_bytes) if udata_bytes else set()

    # Выводим в консоль найденные флаги для прозрачной диагностики любого сейва
    print(f"[Progress {gid}] SData saveRAM flags==1: {sorted(sdata_ones)} | UData flags: {sorted(udata_ones)}")

    results = []
    if gid == "sonic2":
        s2_exact_idx = (
            412,  # 0: Super Sonic Time Attack
            411,  # 1: Expert's Challenge
            414,  # 2: Tour of the Plant
            400,  # 3: Quick Run
            401,  # 4: 100% Chemical Free
            402,  # 5: Early Bird Special
            403,  # 6: Superstar
            404,  # 7: Gambling Problem
            405,  # 8: Bop Non-Stop
            406,  # 9: Perfectionist
            407,  # 10: No Future Here
            408,  # 11: Metropolis Master
            409,  # 12: Beat the Clock... Again...
            410,  # 13: Scrambled Egg
        )
        for idx, title in enumerate(titles):
            ram_idx = s2_exact_idx[idx]
            results.append({"name": title, "done": ram_idx in sdata_ones})
        return results

    # Для Sonic 1 Forever и Sonic CD Restored: проверяем стандартный блок RSDKv4 saveRAM[400+i], [630+i], [800+i] и UData
    if gid == "soniccd":
        scd_idx = (
            257,  # 0: 88 Miles Per Hour
            258,  # 1: Just one hug is enough
            260,  # 2: Take the High Road
            259,  # 3: King of the Rings
            262,  # 4: Statue Saviour
            261,  # 5: Heavy Metal
            263,  # 6: Paradise Found
            264,  # 7: All Stages Clear!
            265,  # 8: Treasure Hunter
            266,  # 9: Dr. Eggman Got Served
            267,  # 10: Just in Time!
            268,  # 11: Saviour of the Planet
            1605, # 12: Dr. Robotnik Got Served (бонусное 13-е достижение ремастера)
        )
        for idx, title in enumerate(titles):
            ram_i = scd_idx[idx]
            is_done = (ram_i in sdata_ones) or (idx == 12 and 269 in sdata_ones)
            results.append({"name": title, "done": is_done})
        return results

    for idx, title in enumerate(titles):
        is_done = ((400 + idx) in sdata_ones) or (idx in udata_ones)
        results.append({"name": title, "done": is_done})

    return results

def parse_game_progress(gid, cfg):
    if gid == "origins":
        st = read_steam_origins_stats()
        if st.get("found"):
            achs = st.get("achievements", [])
            done_cnt = sum(1 for a in achs if a.get("done"))
            return {
                "supported": True,
                "title": f"Достижения Steam ({done_cnt} из {len(achs)})",
                "hideEmeralds": True,
                "emeralds": 0, "maxEmeralds": 0,
                "slots": [],
                "achievements": achs
            }
        return {"supported": False, "note": st.get("note", "Запустите игру через Steam хотя бы один раз")}

    exe_path = cfg.get("paths", {}).get(gid, "")
    game_dir = os.path.dirname(exe_path) if exe_path else ""
    slots, max_emeralds, raw_bytes = [], 0, b""

    if gid == "sonic3":
        s3_appdata = os.path.join(os.environ.get("APPDATA", ""), "Sonic3AIR")
        slot_candidates = [
            os.path.join(s3_appdata, "storage", "s3air_saveslots.bin"),
            os.path.join(s3_appdata, "s3air_saveslots.bin"),
            os.path.join(game_dir, "storage", "s3air_saveslots.bin") if game_dir else "",
        ]
        slots_file = next((p for p in slot_candidates if p and os.path.exists(p)), None)

        if slots_file:
            with open(slots_file, "rb") as f:
                s_data = f.read()
            # В OXY.PDATA имя "SRAM_Saveslots" записано БЕЗ нулевого байта, сразу за ним идут 4 байта длины (0x50 = 80 байт = 8 слотов по 10 байт!)
            sec_tag = b"SRAM_Saveslots"
            sec_pos = s_data.find(sec_tag)
            if sec_pos != -1:
                data_off = sec_pos + len(sec_tag) + 4
                if data_off + 80 <= len(s_data):
                    char_map = {0: "Соник и Тейлз", 1: "Соник", 2: "Тейлз", 3: "Наклз", 4: "Наклз и Тейлз"}
                    for s_idx in range(8):
                        slot_chunk = s_data[data_off + s_idx * 10 : data_off + (s_idx + 1) * 10]
                        b0, b1, b2, b3, b4, b5, b6, b7, b8, b9 = struct.unpack("<10B", slot_chunk)
                        # По твоему дампу:
                        # Слот 1 (активный): 00 2a 01 00 00 02 00 00 03 00 (b0 != 0x80)
                        # Слоты 2..8 (пустые): 80 00 00 00 00 00 00 00 03 00 (b0 == 0x80 — пустой слот, b8 == 03 жизни)
                        if (b0 & 0x80) == 0:
                            char_id = b2 if b2 <= 4 else (b2 >> 4)
                            zone_num = b3 + 1
                            lives_val = b8 if 0 < b8 <= 99 else 3
                            # Изумруды в S3&K SRAM лежат в b6..b7 (по 2 бита на каждый из 7 изумрудов) или счётчиком в b5
                            em_word = (b6 << 8) | b7
                            mask_em = sum(1 for k in range(8) if ((em_word >> (k * 2)) & 3) > 0)
                            em_final = min(7, max(mask_em, b5 if b5 <= 7 else 0))
                            max_emeralds = max(max_emeralds, em_final)
                            hero_name = char_map.get(char_id, f"Герой #{char_id}")
                            stage_info = "Игра пройдена (CLEAR)" if (b0 & 0x03) >= 1 else f"Зона #{zone_num}"
                            slots.append({
                                "name": f"Слот сохранения #{s_idx + 1} ({hero_name})",
                                "info": f"{stage_info} • Жизней: {lives_val} • Изумрудов: {em_final}/7"
                            })

        p_candidates = [
            os.path.join(s3_appdata, "storage", "s3air_achievements.bin"),
            os.path.join(s3_appdata, "playerprogress.bin"),
            os.path.join(game_dir, "storage", "s3air_achievements.bin") if game_dir else "",
            os.path.join(game_dir, "savedata", "playerprogress.bin") if game_dir else "",
        ]
        p_file = next((p for p in p_candidates if p and os.path.exists(p)), None)
        if p_file:
            with open(p_file, "rb") as f:
                raw_bytes = f.read()
    elif game_dir and os.path.isdir(game_dir):
        save_path = next((os.path.join(r, fn) for r, _, fs in os.walk(game_dir) for fn in fs if fn.lower() in ("sdata.bin", "savedata.bin")), None)
        if save_path and os.path.exists(save_path):
            with open(save_path, "rb") as f:
                raw_bytes = f.read()

            # Строгая структура RSDKv3/v4 SData.bin:
            # 4 базовых слота лежат СТРОГО по смещению 0..127 байт, каждый слот = 32 байта (8 x int32):
            # [0]=character, [1]=lives, [2]=score, [3]=scoreBonus, [4]=stageListPos, [5]=emeraldsBitmask, [6]=continues, [7]=extra
            char_names = {0: "Соник", 1: "Тейлз", 2: "Эми", 3: "Наклз"} if gid == "soniccd" else {0: "Соник", 1: "Тейлз", 2: "Наклз", 3: "Соник и Тейлз", 4: "Наклз и Тейлз", 5: "Эми"}
            regions = [(4000, 8, 1)] if gid in ("sonic1", "sonic2") else [(0, 4, 1), (4000, 4, 5)]
            for base_off, count, start_num in regions:
                for i in range(count):
                    pos = base_off + i * 32
                    if len(raw_bytes) < pos + 32:
                        break
                    ints = struct.unpack("<8I", raw_bytes[pos : pos + 32])
                    if gid == "soniccd":
                        char_id, lives, score, stage_pos, em_bits, _, _, _ = ints
                    else:
                        char_id, lives, score, _, stage_pos, em_bits, _, _ = ints
                    if 0 < lives <= 99 and 0 < stage_pos <= 255:
                        em_count = bin(em_bits & 0x7F).count("1")
                        max_emeralds = max(max_emeralds, em_count)
                        c_name = char_names.get(char_id, f"Герой #{char_id}")
                        stage_str = "Игра пройдена (CLEAR)" if stage_pos >= 0x80 else f"Этап #{stage_pos}"
                        slots.append({
                            "name": f"Слот сохранения #{start_num + i} ({c_name})",
                            "info": f"{stage_str} • Жизней: {lives} • Очки: {score} • Изумрудов: {em_count}/7"
                        })

    return {
        "supported": True, "title": "Прогресс и сохранения",
        "emeralds": max_emeralds, "maxEmeralds": 7,
        "slots": slots if slots else [{"name": "Активных сохранений нет", "info": "Все слоты сохранения пусты (0 Изумрудов)"}],
        "achievements": extract_native_achievements(gid, game_dir, raw_bytes)
    }

class LauncherHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def translate_path(self, path):
        clean_p = urllib.parse.urlparse(path).path
        if clean_p in ('/', '/index.html', '/style.css', '/script.js'):
            rel = 'index.html' if clean_p == '/' else clean_p.lstrip('/')
            cand = os.path.join(RESOURCE_DIR, rel)
            if os.path.exists(cand):
                return cand
        return super().translate_path(path)

    def handle(self):
        try:
            super().handle()
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
            pass
            
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def log_message(self, format, *args):
        pass

    def send_json(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length else "{}"
        payload = json.loads(body)

        if parsed.path == '/api/intro/browse':
            fp = open_native_dialog(filetypes=[('Медиа заставки', '*.mp4 *.webm *.gif *.png *.jpg *.jpeg *.webp'), ('Все файлы', '*.*')])
            if fp and os.path.exists(fp):
                cfg = load_config()
                cfg['intro_media_path'] = fp
                cfg['intro_enabled'] = True
                save_config(cfg)
                self.send_json({'ok': True, 'path': fp})
            else:
                self.send_json({'ok': False})
            return

        if parsed.path == '/api/intro/settings':
            cfg = load_config()
            if 'intro_enabled' in payload:
                cfg['intro_enabled'] = bool(payload['intro_enabled'])
            if payload.get('clear_media'):
                cfg['intro_media_path'] = ''
            if 'daytime_fx' in payload:
                cfg['daytime_fx'] = bool(payload['daytime_fx'])
            if 'daytime_override' in payload:
                cfg['daytime_override'] = str(payload['daytime_override'])
            if 'lang' in payload:
                cfg['lang'] = str(payload['lang'])
            save_config(cfg)
            self.send_json({'ok': True})
            return

        if parsed.path == '/api/design':
            cfg = load_config()
            cfg["design"] = payload
            save_config(cfg)
            register_screenshot_hotkey(payload.get("screenshotKey", "f6"))
            start_tray_icon(payload.get("appIconUrl", ""))
            self.send_json({"ok": True})

        elif parsed.path == '/api/order':
            cfg = load_config()
            cfg["gamesOrder"] = payload.get("gamesOrder", DEFAULT_GAMES)
            save_config(cfg)
            self.send_json({"ok": True})

        elif parsed.path == '/api/args':
            cfg = load_config()
            gid = payload.get("gameId")
            if gid:
                cfg["launchArgs"][gid] = payload.get("args", "")
                save_config(cfg)
            self.send_json({"ok": True})

        elif parsed.path == '/api/mods/toggle':
            cfg = load_config()
            ok = toggle_game_mod(payload.get("gameId"), payload.get("modId"), payload.get("enabled"), cfg)
            self.send_json({"ok": ok})

        elif parsed.path == '/api/mods/save_preset':
            cfg = load_config()
            gid = payload.get("gameId")
            name = payload.get("name", "").strip()
            if gid and name:
                presets = cfg.setdefault("modPresets", {}).setdefault(gid, {})
                presets[name] = payload.get("enabledIds", [])
                save_config(cfg)
            self.send_json({"ok": True})

        elif parsed.path == '/api/mods/apply_preset':
            cfg = load_config()
            gid = payload.get("gameId")
            name = payload.get("name", "")
            enabled_set = set(x.lower() for x in cfg.get("modPresets", {}).get(gid, {}).get(name, []))
            mods_info = get_game_mods(gid, cfg)
            for m in mods_info.get("mods", []):
                toggle_game_mod(gid, m["id"], m["id"].lower() in enabled_set, cfg)
            self.send_json({"ok": True})

        elif parsed.path == '/api/mods/delete_preset':
            cfg = load_config()
            gid = payload.get("gameId")
            name = payload.get("name", "")
            if gid in cfg.get("modPresets", {}) and name in cfg["modPresets"][gid]:
                del cfg["modPresets"][gid][name]
                save_config(cfg)
            self.send_json({"ok": True})

        elif parsed.path == '/api/tweaks':
            cfg = load_config()
            ok = save_game_tweaks(payload.get("gameId"), payload.get("tweaks", {}), cfg)
            self.send_json({"ok": ok})

        elif parsed.path == '/api/mods/install_zip':
            gid = payload.get("gameId")
            b64_data = payload.get("zipBase64", "")
            fname = payload.get("fileName", "mod.zip")
            cfg = load_config()
            mods_dir = resolve_mods_dir(gid, cfg)
            if not mods_dir or not b64_data:
                self.send_json({"ok": False, "error": "Папка модов не найдена"})
                return
            os.makedirs(mods_dir, exist_ok=True)
            try:
                raw = base64.b64decode(b64_data.split(",")[-1])
                tmp_zip = os.path.join(mods_dir, "_temp_install.zip")
                with open(tmp_zip, "wb") as zf:
                    zf.write(raw)
                mod_folder_name = os.path.splitext(fname)[0]
                with zipfile.ZipFile(tmp_zip, 'r') as z:
                    names = z.namelist()
                    has_root_ini = any(n.lower() in ("mod.ini", "mod.json") for n in names)
                    target_dir = os.path.join(mods_dir, mod_folder_name) if has_root_ini else mods_dir
                    z.extractall(target_dir)
                os.remove(tmp_zip)
                self.send_json({"ok": True})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)})

        elif parsed.path == '/api/mods/conflicts':
            gid = payload.get("gameId")
            cfg = load_config()
            mods_dir = resolve_mods_dir(gid, cfg)
            if not mods_dir or not os.path.isdir(mods_dir):
                self.send_json({"conflicts": {}})
                return
            active_ids = {m['id'] for m in get_game_mods(gid, cfg).get('mods', []) if m.get('enabled')}
            file_owners = {}
            for entry in os.listdir(mods_dir):
                if entry not in active_ids:
                    continue
                mod_path = os.path.join(mods_dir, entry)
                if not os.path.isdir(mod_path):
                    continue
                for root, _, files in os.walk(mod_path):
                    for fn in files:
                        if fn.lower() in ("mod.ini", "mod.json", "preview.png", "thumbnail.png"):
                            continue
                        rel = os.path.relpath(os.path.join(root, fn), mod_path).lower()
                        file_owners.setdefault(rel, []).append(entry)
            conflicts = {}
            for rel_file, owners in file_owners.items():
                if len(owners) > 1:
                    for mod_id in owners:
                        others = [o for o in owners if o != mod_id]
                        conflicts.setdefault(mod_id, []).append(f"{rel_file} (с: {', '.join(others)})")
            self.send_json({"conflicts": conflicts})

        elif parsed.path == '/api/games/meta':
            cfg = load_config()
            gid = payload.get("gameId")
            if gid:
                if "tag" in payload:
                    for g in cfg.get("gamesOrder", []):
                        if g.get("id") == gid:
                            g["tag"] = str(payload["tag"]).strip()
                if "playtime" in payload and payload["playtime"] is not None:
                    try:
                        secs = max(0, int(payload["playtime"]))
                        cfg.setdefault("playtime", {})[gid] = secs
                    except Exception:
                        pass
                save_config(cfg)
            self.send_json({"ok": True})

        elif parsed.path == '/api/games/add':
            cfg = load_config()
            name = payload.get("name", "").strip()
            color = payload.get("color", "#1E90FF")
            tag = payload.get("tag", "CUSTOM GAME").strip() or "CUSTOM GAME"
            if name:
                gid = f"custom_{int(time.time())}"
                cfg["gamesOrder"].append({"id": gid, "name": name, "color": color, "tag": tag, "custom": True})
                save_config(cfg)
            self.send_json({"ok": True})

        elif parsed.path == '/api/games/delete':
            cfg = load_config()
            gid = payload.get("gameId")
            cfg["gamesOrder"] = [g for g in cfg["gamesOrder"] if g["id"] != gid]
            cfg["paths"].pop(gid, None)
            save_config(cfg)
            self.send_json({"ok": True})

        elif parsed.path == '/api/theme/export_pack':
            os.makedirs(THEMES_DIR, exist_ok=True)
            raw_name = payload.get("filename", "sonic_theme_pack")
            fname = sanitize_filename(raw_name) or "sonic_theme_pack"
            if not fname.endswith(".sonicpack"):
                fname += ".sonicpack"
            pack_path = os.path.join(THEMES_DIR, fname)
            design_obj = payload.get("design", {})
            try:
                with zipfile.ZipFile(pack_path, "w", zipfile.ZIP_DEFLATED) as zf:
                    zf.writestr("design.json", json.dumps(design_obj, ensure_ascii=False, indent=4))
                    for folder_name, folder_path in [("images", IMAGES_DIR), ("sounds", SOUNDS_DIR), ("fonts", FONTS_DIR)]:
                        if os.path.isdir(folder_path):
                            for fn in os.listdir(folder_path):
                                full_p = os.path.join(folder_path, fn)
                                if os.path.isfile(full_p):
                                    zf.write(full_p, arcname=f"{folder_name}/{fn}")
                os.startfile(THEMES_DIR)
                self.send_json({"ok": True, "path": pack_path})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)})

        elif parsed.path == '/api/theme/import_pack_b64':
            b64_data = payload.get("packBase64", "")
            if not b64_data:
                self.send_json({"ok": False})
                return
            try:
                os.makedirs(THEMES_DIR, exist_ok=True)
                raw = base64.b64decode(b64_data.split(",")[-1])
                tmp_pack = os.path.join(THEMES_DIR, "_temp_import.sonicpack")
                with open(tmp_pack, "wb") as tf:
                    tf.write(raw)
                new_design = None
                with zipfile.ZipFile(tmp_pack, "r") as zf:
                    for member in zf.namelist():
                        if member == "design.json":
                            new_design = json.loads(zf.read(member).decode("utf-8"))
                        elif member.startswith(("images/", "sounds/", "fonts/")) and not member.endswith("/"):
                            parts = member.split("/", 1)
                            dest_dir = IMAGES_DIR if parts[0] == "images" else (SOUNDS_DIR if parts[0] == "sounds" else FONTS_DIR)
                            os.makedirs(dest_dir, exist_ok=True)
                            dest_file = os.path.join(dest_dir, os.path.basename(parts[1]))
                            with open(dest_file, "wb") as out_f:
                                out_f.write(zf.read(member))
                os.remove(tmp_pack)
                if new_design:
                    cfg = load_config()
                    cfg["design"] = new_design
                    save_config(cfg)
                self.send_json({"ok": True})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)})

        elif parsed.path == '/api/theme/export':
            fname = payload.get("filename", "custom_theme.json")
            if not fname.endswith(".json"):
                fname += ".json"
            out_path = os.path.join(THEMES_DIR, fname)
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(payload.get("design", {}), f, indent=4, ensure_ascii=False)
            self.send_json({"path": out_path})
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/intro/media':
            cfg = load_config()
            intro_path = cfg.get('intro_media_path', '')
            if intro_path and os.path.isfile(intro_path):
                ext = os.path.splitext(intro_path)[1].lower()
                mimes = {
                    '.mp4': 'video/mp4', '.webm': 'video/webm', '.ogg': 'video/ogg',
                    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
                    '.gif': 'image/gif', '.webp': 'image/webp'
                }
                self.send_response(200)
                self.send_header('Content-Type', mimes.get(ext, 'application/octet-stream'))
                self.send_header('Content-Length', str(os.path.getsize(intro_path)))
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                with open(intro_path, 'rb') as mf:
                    while True:
                        chunk = mf.read(65536)
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                return
            self.send_error(404, 'Intro media not found')
            return
        query = urllib.parse.parse_qs(parsed.query)

        if parsed.path == '/api/games':
            cfg = load_config()
            games_order = cfg.get("gamesOrder", DEFAULT_GAMES)
            paths = cfg.get("paths", {})
            args_map = cfg.get("launchArgs", {})
            playtime = cfg.get("playtime", {})
            design = cfg.get("design", DEFAULT_DESIGN)
            img_exts = ['.gif', '.png', '.jpg', '.jpeg', '.webp']
            result = []
            for g in games_order:
                gid = g["id"]
                p = paths.get(gid, "")
                exists = bool(p and os.path.exists(p))
                result.append({
                    **g,
                    "path": p,
                    "args": args_map.get(gid, ""),
                    "exists": exists,
                    "playtime": playtime.get(gid, 0),
                    "running": active_game_id == gid,
                    "cover": find_asset(IMAGES_DIR, "/images", gid, img_exts),
                    "logo": find_asset(IMAGES_DIR, "/images", f"{gid}logo", img_exts),
                    "bg": find_asset(IMAGES_DIR, "/images", f"{gid}bg", img_exts),
                    "video": find_asset(IMAGES_DIR, "/images", gid, ['.mp4', '.webm', '.mkv']),
                    "modsDir": resolve_mods_dir(gid, cfg)
                })

            self.send_json({
                "games": result,
                "smmPath": cfg.get("smmPath", ""),
                "mainLogo": find_asset(IMAGES_DIR, "/images", "mainlogo", img_exts),
                "objects": find_floating_objects(),
                "sounds": scan_all_sounds(),
                "design": design,
                "defaultDesign": DEFAULT_DESIGN,
                "intro_enabled": cfg.get("intro_enabled", False),
                "intro_media_path": cfg.get("intro_media_path", ""),
                "daytime_fx": cfg.get("daytime_fx", True),
                "daytime_override": cfg.get("daytime_override", "auto"),
                "lang": cfg.get("lang", "ru")
            })

        elif parsed.path == '/api/open_folder':
            gid = get_query_param(query, 'id')
            target_type = get_query_param(query, 'type') or 'game'
            cfg = load_config()
            exe_path = cfg.get("paths", {}).get(gid, "")
            game_dir = os.path.dirname(exe_path) if exe_path else ""
            target_dir = ""

            if target_type == 'game':
                target_dir = game_dir
            elif target_type == 'saves':
                if gid == "sonic3":
                    cand = os.path.join(os.environ.get("APPDATA", ""), "Sonic3AIR")
                    target_dir = cand if os.path.isdir(cand) else game_dir
                elif gid == "origins":
                    cand = os.path.join(os.environ.get("APPDATA", ""), "SEGA", "SonicOrigins", "steam")
                    target_dir = cand if os.path.isdir(cand) else game_dir
                else:
                    target_dir = game_dir

            if target_dir and os.path.isdir(target_dir):
                os.startfile(target_dir)
                self.send_json({"ok": True})
            else:
                self.send_json({"ok": False, "error": "Папка не найдена"})

        elif parsed.path == '/api/locales':
            langs = {}
            ext_loc = os.path.join(BASE_DIR, "locales")
            os.makedirs(ext_loc, exist_ok=True)
            for l_dir in (os.path.join(RESOURCE_DIR, "locales"), ext_loc):
                if os.path.isdir(l_dir):
                    for fn in sorted(os.listdir(l_dir)):
                        if fn.lower().endswith(".json"):
                            code = fn[:-5].lower()
                            try:
                                with open(os.path.join(l_dir, fn), "r", encoding="utf-8") as lf:
                                    langs[code] = json.load(lf)
                            except Exception:
                                pass
            self.send_json({"locales": langs})

        elif parsed.path == '/api/fullscreen':
            if window_instance:
                window_instance.toggle_fullscreen()
            self.send_json({"ok": True})

        elif parsed.path == '/api/hide_tray':
            if window_instance and HAS_EXTRAS:
                window_instance.hide()
            self.send_json({"ok": True})

        elif parsed.path == '/api/exit':
            self.send_json({"ok": True})
            def shutdown():
                if tray_icon:
                    try:
                        tray_icon.stop()
                    except Exception:
                        pass
                if window_instance:
                    window_instance.destroy()
                os._exit(0)
            threading.Timer(0.15, shutdown).start()

        elif parsed.path == '/api/select':
            game_id = get_query_param(query, 'id')
            file_path = open_native_dialog(filetypes=[('EXE', '*.exe')])
            if file_path and os.path.exists(file_path):
                cfg = load_config()
                cfg["paths"][game_id] = file_path
                save_config(cfg)
                self.send_json({"path": file_path})
            else:
                self.send_json({"path": None})

        elif parsed.path == '/api/select_smm':
            file_path = open_native_dialog(filetypes=[('Sonic Mod Manager', '*.exe')])
            if file_path and os.path.exists(file_path):
                cfg = load_config()
                cfg["smmPath"] = file_path
                save_config(cfg)
                self.send_json({"smmPath": file_path})
            else:
                self.send_json({"smmPath": None})

        elif parsed.path == '/api/launch_smm':
            cfg = load_config()
            smm = cfg.get("smmPath", "")
            if smm and os.path.exists(smm):
                subprocess.Popen([smm], cwd=os.path.dirname(smm))
            self.send_json({"ok": True})
        elif parsed.path == '/api/select_font':
            file_path = open_native_dialog(filetypes=[('Fonts', '*.ttf *.otf *.woff *.woff2')])
            if file_path and os.path.exists(file_path):
                dest_name = os.path.basename(file_path)
                dest_path = os.path.join(FONTS_DIR, dest_name)
                if os.path.abspath(file_path) != os.path.abspath(dest_path):
                    shutil.copy2(file_path, dest_path)
                self.send_json({"fontUrl": f"/fonts/{dest_name}", "fontName": dest_name})
            else:
                self.send_json({"fontUrl": None})

        elif parsed.path == '/api/select_icon':
            file_path = open_native_dialog(filetypes=[('Icons', '*.png *.ico *.jpg')])
            if file_path and os.path.exists(file_path):
                dest_name = "app_icon_" + os.path.basename(file_path)
                dest_path = os.path.join(IMAGES_DIR, dest_name)
                shutil.copy2(file_path, dest_path)
                url = f"/images/{dest_name}"
                start_tray_icon(url)
                self.send_json({"iconUrl": url, "iconName": os.path.basename(file_path)})
            else:
                self.send_json({"iconUrl": None})
                
        elif parsed.path == '/api/select_media':
            gid = get_query_param(query, 'id')
            mtype = get_query_param(query, 'type') # cover, logo, bg, video, mainlogo, object
            is_vid = (mtype == 'video')
            ft = [('Video', '*.mp4 *.webm *.mkv')] if is_vid else [('Images', '*.png *.gif *.jpg *.jpeg *.webp')]
            file_path = open_native_dialog(filetypes=ft)
            if file_path and os.path.exists(file_path):
                _, ext = os.path.splitext(file_path)
                ext = ext.lower()
                if mtype == 'object':
                    dest_name = f"object_{int(time.time())}{ext}"
                else:
                    prefix = "mainlogo" if mtype == "mainlogo" else (gid if mtype in ("cover", "video") else f"{gid}{mtype}")
                    exts_to_clean = ('.mp4', '.webm', '.mkv') if is_vid else ('.gif', '.png', '.jpg', '.jpeg', '.webp')
                    for e in exts_to_clean:
                        old_f = os.path.join(IMAGES_DIR, f"{prefix}{e}")
                        if os.path.exists(old_f):
                            try: os.remove(old_f)
                            except Exception: pass
                    dest_name = f"{prefix}{ext}"
                shutil.copy2(file_path, os.path.join(IMAGES_DIR, dest_name))
                self.send_json({"url": f"/images/{dest_name}?t={int(time.time())}"})
            else:
                self.send_json({"url": None})

        elif parsed.path == '/api/select_btn_icon':
            btn_id = get_query_param(query, 'id')
            file_path = open_native_dialog(filetypes=[('Icons', '*.png *.gif *.svg *.webp *.ico')])
            if file_path and os.path.exists(file_path) and btn_id:
                cleanup_old_files(IMAGES_DIR, f"btnicon_{btn_id}_")
                _, ext = os.path.splitext(file_path)
                dest_name = f"btnicon_{btn_id}_{int(time.time())}{ext.lower()}"
                shutil.copy2(file_path, os.path.join(IMAGES_DIR, dest_name))
                self.send_json({"url": f"/images/{dest_name}"})
            else:
                self.send_json({"url": None})

        elif parsed.path == '/api/delete_media':
            gid = get_query_param(query, 'id')
            mtype = get_query_param(query, 'type')
            if mtype == 'object_all':
                for fn in os.listdir(IMAGES_DIR):
                    if fn.lower().startswith('object'):
                        try: os.remove(os.path.join(IMAGES_DIR, fn))
                        except Exception: pass
            else:
                prefix = "mainlogo" if mtype == "mainlogo" else (gid if mtype in ("cover", "video") else f"{gid}{mtype}")
                for e in ('.gif', '.png', '.jpg', '.jpeg', '.webp', '.mp4', '.webm', '.mkv'):
                    old_f = os.path.join(IMAGES_DIR, f"{prefix}{e}")
                    if os.path.exists(old_f):
                        try: os.remove(old_f)
                        except Exception: pass
            self.send_json({"ok": True})

        elif parsed.path == '/api/select_char':
            game_id = get_query_param(query, 'id')
            side = get_query_param(query, 'side') or 'left'
            file_path = open_native_dialog(filetypes=[('Images', '*.png *.gif *.webp *.jpg')])
            if file_path and os.path.exists(file_path):
                _, ext = os.path.splitext(file_path)
                dest_name = f"{game_id}_{side}_{int(time.time())}{ext.lower()}"
                dest_path = os.path.join(IMAGES_DIR, dest_name)
                shutil.copy2(file_path, dest_path)
                self.send_json({"url": f"/images/{dest_name}", "name": os.path.basename(file_path)})
            else:
                self.send_json({"url": None})

        elif parsed.path == '/api/select_sound':
            snd_key = get_query_param(query, 'key')
            file_path = open_native_dialog(filetypes=[('Audio', '*.mp3 *.wav *.ogg')])
            if file_path and os.path.exists(file_path) and snd_key:
                for old_ext in ('.mp3', '.wav', '.ogg'):
                    old_p = os.path.join(SOUNDS_DIR, f"{snd_key}{old_ext}")
                    if os.path.exists(old_p):
                        try:
                            os.remove(old_p)
                        except Exception:
                            pass
                _, ext = os.path.splitext(file_path)
                dest_name = f"{snd_key}{ext.lower()}"
                shutil.copy2(file_path, os.path.join(SOUNDS_DIR, dest_name))
                self.send_json({"url": f"/sounds/{dest_name}?t={int(time.time())}", "name": os.path.basename(file_path)})
            else:
                self.send_json({"url": None})

        elif parsed.path == '/api/delete_sound':
            snd_key = get_query_param(query, 'key')
            if snd_key:
                for old_ext in ('.mp3', '.wav', '.ogg'):
                    old_p = os.path.join(SOUNDS_DIR, f"{snd_key}{old_ext}")
                    if os.path.exists(old_p):
                        try:
                            os.remove(old_p)
                        except Exception:
                            pass
            self.send_json({"ok": True})        

        elif parsed.path == '/api/theme/import':
            file_path = open_native_dialog(filetypes=[('Theme JSON', '*.json')], initialdir=THEMES_DIR)
            if file_path and os.path.exists(file_path):
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        imported = json.load(f)
                    cfg = load_config()
                    merged = {**DEFAULT_DESIGN, **imported}
                    cfg["design"] = merged
                    save_config(cfg)
                    self.send_json({"design": merged})
                    return
                except Exception:
                    pass
            self.send_json({"design": None})

        elif parsed.path == '/api/mods/list':
            game_id = get_query_param(query, 'id')
            cfg = load_config()
            self.send_json(get_game_mods(game_id, cfg))

        elif parsed.path == '/api/mods/select_dir':
            game_id = get_query_param(query, 'id')
            folder = open_native_dialog(is_dir=True)
            if folder and os.path.exists(folder):
                cfg = load_config()
                cfg["modPaths"][game_id] = folder
                save_config(cfg)
                self.send_json({"modsDir": folder})
            else:
                self.send_json({"modsDir": None})

        elif parsed.path == '/api/mods/open_dir':
            game_id = get_query_param(query, 'id')
            cfg = load_config()
            mods_dir = resolve_mods_dir(game_id, cfg)
            if mods_dir and os.path.exists(mods_dir):
                os.startfile(mods_dir)
            self.send_json({"ok": True})

        elif parsed.path == '/api/tweaks':
            game_id = get_query_param(query, 'id')
            cfg = load_config()
            self.send_json(get_game_tweaks(game_id, cfg))

        elif parsed.path == '/api/progress':
            gid = get_query_param(query, 'id')
            cfg = load_config()
            self.send_json(parse_game_progress(gid, cfg))

        elif parsed.path == '/api/screenshots':
            game_id = get_query_param(query, 'id')
            shot_dir = os.path.join(SCREENSHOTS_DIR, game_id)
            shots = []
            if os.path.exists(shot_dir):
                for fn in sorted(os.listdir(shot_dir), reverse=True):
                    if fn.lower().endswith(('.png', '.jpg')):
                        shots.append(f"/screenshots/{game_id}/{fn}")
            self.send_json({"shots": shots, "dir": shot_dir})

        elif parsed.path == '/api/screenshots/open':
            game_id = get_query_param(query, 'id')
            shot_dir = os.path.join(SCREENSHOTS_DIR, game_id)
            os.makedirs(shot_dir, exist_ok=True)
            os.startfile(shot_dir)
            self.send_json({"ok": True})

        elif parsed.path == '/api/clear':
            game_id = get_query_param(query, 'id')
            cfg = load_config()
            if game_id in cfg["paths"]:
                del cfg["paths"][game_id]
                save_config(cfg)
            self.send_json({"ok": True})

        elif parsed.path == '/api/launch':
            game_id = get_query_param(query, 'id')
            cfg = load_config()
            exe_path = cfg["paths"].get(game_id)
            if exe_path and os.path.exists(exe_path) and active_game_id is None:
                raw_args = cfg.get("launchArgs", {}).get(game_id, "").strip()
                cmd_list = [exe_path] + (raw_args.split() if raw_args else [])
                proc = subprocess.Popen(cmd_list, cwd=os.path.dirname(exe_path))
                design = cfg.get("design", {})
                minimize = design.get("minimizeOnLaunch", True)
                to_tray = design.get("minimizeToTray", False)
                threading.Thread(
                    target=monitor_game_session,
                    args=(game_id, proc, minimize, to_tray),
                    daemon=True
                ).start()
            self.send_json({"ok": True})

        else:
            super().do_GET()

def on_app_loaded():
    cfg = load_config()
    design = cfg.get("design", DEFAULT_DESIGN)
    register_screenshot_hotkey(design.get("screenshotKey", "f6"))
    start_tray_icon(design.get("appIconUrl", ""))
    time.sleep(0.3)
    if window_instance:
        try:
            window_instance.evaluate_js("window.focus(); document.body.focus();")
        except Exception:
            pass

if __name__ == '__main__':
    try:
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID("sega.sonic.custom.launcher.v2")
    except Exception:
        pass
    server = ThreadingHTTPServer(('127.0.0.1', 0), LauncherHandler)
    _, port = server.server_address
    threading.Thread(target=server.serve_forever, daemon=True).start()

    window_instance = webview.create_window(
        'Sonic Launcher',
        url=f'http://127.0.0.1:{port}/index.html',
        width=1020,
        height=680,
        resizable=True,
        background_color='#090d16'
    )
    import atexit
    atexit.register(stop_tray_cleanly)
    try:
        window_instance.events.closed += stop_tray_cleanly
    except Exception:
        pass
    webview.start(on_app_loaded)
    stop_tray_cleanly()
