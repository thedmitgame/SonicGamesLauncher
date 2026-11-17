import webbrowser
import shlex
import base64, zipfile, webview, json, os, subprocess
import threading, sys, time, shutil, ctypes, urllib.parse
from datetime import datetime
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

from core.config import (
    BASE_DIR, RESOURCE_DIR, CONFIG_FILE, IMAGES_DIR, SOUNDS_DIR,
    FONTS_DIR, SCREENSHOTS_DIR, THEMES_DIR, DEFAULT_GAMES, DEFAULT_DESIGN,
    sanitize_filename, cleanup_old_files, load_config, save_config,
    find_asset, scan_all_sounds, find_floating_objects
)
from core.mods import resolve_mods_dir, get_game_mods, toggle_game_mod, save_mods_state
from core.tweaks import get_game_tweaks, save_game_tweaks
from core.saves import parse_game_progress
from core.scanner import auto_scan_games
from core.gamebanana import fetch_gb_mods, fetch_gb_mod_details, detect_local_game_version

try:
    import pystray
    from PIL import Image, ImageDraw, ImageGrab
    import keyboard
    HAS_EXTRAS = True
except ImportError:
    HAS_EXTRAS = False


window_instance = None
tray_icon = None
active_game_id = None
current_hotkey = None


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



class LauncherHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def translate_path(self, path):
        clean_p = urllib.parse.urlparse(path).path
        if clean_p in ('/', '/index.html', '/style.css', '/script.js', '/ThemeStudio.html', '/icon.ico') or clean_p.startswith(('/js/', '/locales/')):
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

        elif parsed.path == '/api/gb/open_url':
            url = payload.get("url", "")
            if url.startswith("https://gamebanana.com"):
                webbrowser.open(url)
            self.send_json({"ok": True})

        elif parsed.path == '/api/gb/set_game_id':
            cfg = load_config()
            gid = payload.get("gameId")
            gb_id = int(payload.get("gbId") or 0)
            if gid and gb_id > 0:
                cfg.setdefault("gbIds", {})[gid] = gb_id
                save_config(cfg)
            self.send_json({"ok": True})

        elif parsed.path == '/api/mods/reorder':
            cfg = load_config()
            ok = save_mods_state(payload.get("gameId"), payload.get("mods", []), cfg)
            self.send_json({"ok": ok})

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
                    has_root_ini = (gid != "srb2") and any(n.lower() in ("mod.ini", "mod.json") for n in names)
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

        elif parsed.path == '/api/emulators/add':
            name = payload.get("name", "").strip()
            args_tpl = payload.get("args", '"{rom}"').strip() or '"{rom}"'
            exe_p = open_native_dialog(filetypes=[('Emulator EXE', '*.exe')])
            if name and exe_p and os.path.exists(exe_p):
                cfg = load_config()
                eid = f"emu_{int(time.time())}"
                cfg.setdefault("emulators", []).append({"id": eid, "name": name, "path": exe_p, "args": args_tpl})
                save_config(cfg)
                self.send_json({"ok": True})
            else:
                self.send_json({"ok": False})

        elif parsed.path == '/api/emulators/delete':
            eid = payload.get("emuId")
            cfg = load_config()
            cfg["emulators"] = [e for e in cfg.get("emulators", []) if e.get("id") != eid]
            save_config(cfg)
            self.send_json({"ok": True})

        elif parsed.path == '/api/games/add_rom':
            emu_id = payload.get("emuId", "")
            name = payload.get("name", "").strip()
            color = payload.get("color", "#8B5CF6")
            tag = payload.get("tag", "EMULATOR ROM").strip() or "EMULATOR ROM"
            rom_p = open_native_dialog(filetypes=[
                ('ROM / ISO', '*.bin *.md *.gen *.smd *.iso *.chd *.gdi *.cdi *.rvz *.gcm *.wbfs *.gba *.nds *.nes *.sfc *.smc *.cue *.zip *.7z'),
                ('All Files', '*.*')
            ])
            if emu_id and name and rom_p and os.path.exists(rom_p):
                cfg = load_config()
                gid = f"rom_{int(time.time())}"
                cfg["gamesOrder"].append({"id": gid, "name": name, "color": color, "tag": tag, "custom": True, "emuId": emu_id})
                cfg["paths"][gid] = rom_p
                save_config(cfg)
                self.send_json({"ok": True})
            else:
                self.send_json({"ok": False})

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
                emu_id = g.get("emuId")
                if emu_id:
                    emu_obj = next((e for e in cfg.get("emulators", []) if e["id"] == emu_id), None)
                    exists = bool(p and os.path.exists(p) and emu_obj and os.path.exists(emu_obj.get("path", "")))
                else:
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
                "emulators": cfg.get("emulators", []),
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

        elif parsed.path == '/api/open_studio':
            cand1 = os.path.join(BASE_DIR, 'ThemeStudio.html')
            cand2 = os.path.join(RESOURCE_DIR, 'ThemeStudio.html')
            target = cand1 if os.path.isfile(cand1) else (cand2 if os.path.isfile(cand2) else '')
            if target:
                os.startfile(target)
                self.send_json({'ok': True})
            else:
                self.send_json({'ok': False, 'error': 'Файл ThemeStudio.html не найден рядом с лаунчером'})

        elif parsed.path == '/api/sgdb/open':
            q = urllib.parse.quote(get_query_param(query, 'q').strip() or 'Sonic')
            host = "www." + "steamgriddb" + ".com"
            path = chr(47) + "search" + chr(47) + "grids"
            target_url = urllib.parse.urlunsplit(('https', host, path, 'term=' + q, ''))
            webbrowser.open(target_url)
            self.send_json({"ok": True})

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

        elif parsed.path == '/api/games/autoscan':
            cfg = load_config()
            found = auto_scan_games(cfg)
            if found:
                save_config(cfg)
            self.send_json({"ok": True, "count": len(found), "found": found})

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

        elif parsed.path == '/api/mods/thumb':
            gid = get_query_param(query, 'id')
            mname = os.path.basename(get_query_param(query, 'mod'))
            mdir = resolve_mods_dir(gid, load_config())
            mfull = os.path.join(mdir, mname) if mdir else ""
            for fn in ("preview.png", "thumbnail.png", "icon.png", "preview.jpg", "thumbnail.jpg"):
                p = os.path.join(mfull, fn)
                if os.path.isfile(p):
                    self.send_response(200)
                    self.send_header('Content-Type', 'image/jpeg' if fn.endswith('.jpg') else 'image/png')
                    self.end_headers()
                    with open(p, 'rb') as imgf:
                        self.wfile.write(imgf.read())
                    return
            self.send_error(404)

        elif parsed.path == '/api/gb/details':
            mid = get_query_param(query, 'mod')
            self.send_json(fetch_gb_mod_details(mid))

        elif parsed.path == '/api/gb/browse':
            gid = get_query_param(query, 'id')
            q = get_query_param(query, 'q')
            page = int(get_query_param(query, 'page') or '1')
            self.send_json(fetch_gb_mods(gid, load_config(), q, page))

        elif parsed.path == '/api/mods/list':
            game_id = get_query_param(query, 'id')
            cfg = load_config()
            m_res = get_game_mods(game_id, cfg); m_res['localVer'] = detect_local_game_version(game_id, cfg); self.send_json(m_res)

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
            target_path = cfg["paths"].get(game_id)
            g_meta = next((g for g in cfg.get("gamesOrder", []) if g.get("id") == game_id), {})
            emu_id = g_meta.get("emuId")

            if target_path and os.path.exists(target_path) and active_game_id is None:
                raw_args = cfg.get("launchArgs", {}).get(game_id, "").strip()
                extra_args = shlex.split(raw_args, posix=False) if raw_args else []
                if emu_id:
                    emu = next((e for e in cfg.get("emulators", []) if e.get("id") == emu_id), None)
                    if not emu or not os.path.exists(emu.get("path", "")):
                        self.send_json({"ok": False})
                        return
                    exe_path = emu["path"]
                    tpl = emu.get("args", '"{rom}"')
                    filled = tpl.replace("{rom}", target_path) if "{rom}" in tpl else f'{tpl} "{target_path}"'
                    cmd_list = [exe_path] + [a.strip('"') for a in shlex.split(filled, posix=False)] + extra_args
                    work_dir = os.path.dirname(exe_path)
                else:
                    exe_path = target_path
                    cmd_list = [exe_path] + extra_args
                    if game_id == "srb2":
                        mdir = resolve_mods_dir("srb2", cfg)
                        act_files = [os.path.join(mdir, m["id"].replace("/", os.sep)) for m in cfg.get("srb2Mods", []) if m.get("enabled")]
                        act_files = [p for p in act_files if os.path.isfile(p)]
                        if act_files:
                            cmd_list += ["-file"] + act_files
                    work_dir = os.path.dirname(exe_path)
                proc = subprocess.Popen(cmd_list, cwd=work_dir)
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
