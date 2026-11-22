import re
from core.backups import list_save_backups, create_save_backup, create_auto_save_backup, restore_save_backup, delete_save_backup, BACKUPS_DIR
import webbrowser
import shlex
import base64, zipfile, webview, json, os, subprocess
import threading, sys, time, shutil, ctypes, urllib.parse
from datetime import datetime
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

from core.config import (
    BASE_DIR, RESOURCE_DIR, CONFIG_FILE, IMAGES_DIR, MODELS_DIR, SOUNDS_DIR,
    FONTS_DIR, SCREENSHOTS_DIR, THEMES_DIR, DEFAULT_GAMES, DEFAULT_DESIGN,
    sanitize_filename, cleanup_old_files, load_config, save_config,
    find_asset, scan_all_sounds, find_floating_objects
)
from core.mods import resolve_mods_dir, get_game_mods, toggle_game_mod, save_mods_state
from core.codes import get_game_codes, toggle_game_code
from core.tweaks import get_game_tweaks, save_game_tweaks
from core.saves import parse_game_progress
from core.scanner import auto_scan_games
from core.guides import inspect_game_health
from core.mod_managers import MANAGER_TYPES, load_mm_paths, save_mm_paths, launch_manager_exe, find_manager_exe, resolve_mods_folder, list_ini_mods, toggle_ini_mod
from core.gamebanana import fetch_gb_mods, fetch_gb_mod_details, detect_local_game_version
from core.discord_rpc import discord_rpc

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
    discord_rpc.close_pipe()
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
    try:
        cfg_now = load_config()
        g_info = next((g for g in cfg_now.get("gamesOrder", []) if g.get("id") == game_id), {})
        discord_rpc.update_playing(
            g_info.get("name", game_id), g_info.get("tag", ""), game_id, start_ts, cfg_now.get("lang", "ru")
        )
    except Exception:
        pass
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
        dsg_now = cfg.get("design", {})
        if elapsed >= 5 and dsg_now.get("autoBackupSaves", False):
            try:
                lim = max(1, int(dsg_now.get("autoBackupLimit", 5) or 5))
                create_auto_save_backup(game_id, cfg, max_keep=lim)
            except Exception:
                pass

    active_game_id = None
    try:
        cfg_end = load_config()
        g_info = next((g for g in cfg_end.get("gamesOrder", []) if g.get("id") == game_id), {})
        discord_rpc.update_menu(g_info.get("name", ""), game_id, cfg_end.get("lang", "ru"))
    except Exception:
        pass
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

        if parsed.path == '/api/screenshots/delete':
            gid = sanitize_filename(payload.get("gameId", ""))
            fname = os.path.basename(payload.get("fileName", ""))
            target = os.path.join(SCREENSHOTS_DIR, gid, fname)
            if gid and fname and os.path.isfile(target):
                try:
                    os.remove(target)
                    self.send_json({"ok": True})
                    return
                except Exception as e:
                    self.send_json({"ok": False, "error": str(e)})
                    return
            self.send_json({"ok": False, "error": "Файл не найден"})
            return

        if parsed.path == '/api/mods/disable_all':
            gid = payload.get("gameId")
            cfg = load_config()
            cur = get_game_mods(gid, cfg).get("mods", [])
            for m in cur:
                m["enabled"] = False
            ok = save_mods_state(gid, cur, cfg)
            self.send_json({"ok": ok})
            return

        if parsed.path == '/api/mods/delete':
            gid = payload.get("gameId")
            mod_id = payload.get("modId", "")
            cfg = load_config()
            mods_dir = resolve_mods_dir(gid, cfg)
            if not mods_dir or not mod_id:
                self.send_json({"ok": False, "error": "Папка не найдена"})
                return
            norm_root = os.path.abspath(mods_dir)
            target_p = os.path.abspath(os.path.join(mods_dir, mod_id.replace("/", os.sep)))
            if not target_p.startswith(norm_root + os.sep) or not os.path.exists(target_p):
                self.send_json({"ok": False, "error": "Недопустимый путь мода"})
                return
            try:
                cur = [m for m in get_game_mods(gid, cfg).get("mods", []) if m["id"].lower() != mod_id.lower()]
                save_mods_state(gid, cur, cfg)
                if os.path.isdir(target_p):
                    shutil.rmtree(target_p)
                else:
                    os.remove(target_p)
                self.send_json({"ok": True})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)})
            return

        if parsed.path == '/api/backups/create':
            self.send_json(create_save_backup(payload.get('gameId', ''), load_config(), payload.get('note', '')))
            return
        if parsed.path == '/api/backups/restore':
            self.send_json(restore_save_backup(payload.get('gameId', ''), payload.get('file', ''), load_config()))
            return
        if parsed.path == '/api/backups/delete':
            self.send_json(delete_save_backup(payload.get('gameId', ''), payload.get('file', '')))
            return

        if parsed.path == '/api/emulators/browse_exe':
            p = open_native_dialog(filetypes=[('Emulator EXE', '*.exe')])
            self.send_json({"ok": bool(p), "path": p.replace("\\", "/") if p else ""})
            return

        if parsed.path == '/api/emulators/save':
            name = payload.get("name", "").strip()
            exe_p = payload.get("path", "").strip()
            args_tpl = payload.get("args", '"{rom}"').strip() or '"{rom}"'
            if name and exe_p and os.path.exists(exe_p):
                cfg = load_config()
                eid = f"emu_{int(time.time() * 1000)}"
                cfg.setdefault("emulators", []).append({"id": eid, "name": name, "path": exe_p, "args": args_tpl})
                save_config(cfg)
                self.send_json({"ok": True})
            else:
                self.send_json({"ok": False})
            return

        if parsed.path == '/api/emulators/browse_rom':
            rp = open_native_dialog(filetypes=[
                ('ROM / ISO', '*.bin *.md *.gen *.smd *.iso *.chd *.gdi *.cdi *.rvz *.gcm *.wbfs *.gba *.nds *.nes *.sfc *.smc *.cue *.cso *.pbp *.xex'),
                ('All Files', '*.*')
            ])
            self.send_json({"ok": bool(rp), "path": rp.replace("\\", "/") if rp else ""})
            return

        if parsed.path == '/api/emulators/add_rom_direct':
            emu_id = payload.get("emuId", "")
            name = payload.get("name", "").strip()
            rom_p = payload.get("romPath", "").strip()
            if emu_id and name and rom_p and os.path.exists(rom_p):
                cfg = load_config()
                emu_info = next((e for e in cfg.get("emulators", []) if e.get("id") == emu_id), None)
                emu_label = emu_info.get("name", "EMULATOR").upper() if emu_info else "EMULATOR"
                gid = f"rom_{int(time.time() * 1000)}"
                cfg.setdefault("gamesOrder", []).append({
                    "id": gid, "name": name, "color": "#8B5CF6",
                    "tag": f"ROM • {emu_label}", "custom": True, "emuId": emu_id
                })
                cfg.setdefault("paths", {})[gid] = rom_p
                save_config(cfg)
                self.send_json({"ok": True})
            else:
                self.send_json({"ok": False})
            return

        if parsed.path == '/api/emulators/scan_folder':
            folder = open_native_dialog(is_dir=True)
            if not folder or not os.path.isdir(folder):
                self.send_json({"ok": False, "items": []})
                return
            cfg = load_config()
            existing_paths = {os.path.normcase(os.path.abspath(p)) for p in cfg.get("paths", {}).values() if p}
            found = []
            cue_Bases = set()
            all_files = sorted(os.listdir(folder))
            for fn in all_files:
                if fn.lower().endswith((".cue", ".gdi")):
                    cue_Bases.add(os.path.splitext(fn)[0].lower())
            for fn in all_files:
                fp = os.path.join(folder, fn)
                if not os.path.isfile(fp):
                    continue
                stem, ext = os.path.splitext(fn)
                ext_l = ext.lower()
                if ext_l == ".bin" and stem.lower() not in cue_Bases:
                    valid = True
                else:
                    valid = ext_l in ROM_VALID_EXTS
                if not valid:
                    continue
                if os.path.normcase(os.path.abspath(fp)) in existing_paths:
                    continue
                found.append({
                    "path": fp.replace("\\", "/"),
                    "name": clean_rom_title(fn),
                    "ext": ext_l.lstrip(".").upper()
                })
            self.send_json({"ok": True, "folder": folder.replace("\\", "/"), "items": found})
            return

        if parsed.path == '/api/emulators/batch_add_roms':
            emu_id = payload.get("emuId", "")
            items = payload.get("items", [])
            cfg = load_config()
            emu_info = next((e for e in cfg.get("emulators", []) if e.get("id") == emu_id), None)
            emu_label = emu_info.get("name", "EMULATOR").upper() if emu_info else "EMULATOR"
            added = 0
            ts_base = int(time.time() * 1000)
            for idx, it in enumerate(items):
                r_path = it.get("path", "").strip()
                r_name = it.get("name", "").strip()
                if not r_path or not r_name:
                    continue
                gid = f"rom_{ts_base}_{idx}"
                cfg.setdefault("gamesOrder", []).append({
                    "id": gid,
                    "name": r_name,
                    "tag": f"ROM • {emu_label}",
                    "custom": True,
                    "emuId": emu_id
                })
                cfg.setdefault("paths", {})[gid] = r_path
                added += 1
            save_config(cfg)
            self.send_json({"ok": True, "added": added})
            return

        if parsed.path == '/api/jukebox/delete_track':
            fname = os.path.basename(payload.get('file', ''))
            fp = os.path.join(SOUNDS_DIR, 'music', fname)
            if fname and os.path.isfile(fp):
                os.remove(fp)
                self.send_json({'ok': True})
            else:
                self.send_json({'ok': False, 'error': 'Файл не найден'})
            return

        if parsed.path == '/api/jukebox/add_track':
            fp = open_native_dialog(filetypes=[('Audio Files', '*.mp3 *.ogg *.wav *.flac *.m4a')])
            if fp and os.path.isfile(fp):
                music_dir = os.path.join(SOUNDS_DIR, "music")
                os.makedirs(music_dir, exist_ok=True)
                dest = os.path.join(music_dir, os.path.basename(fp))
                if os.path.abspath(fp) != os.path.abspath(dest):
                    shutil.copy2(fp, dest)
                self.send_json({"ok": True, "name": os.path.basename(fp)})
            else:
                self.send_json({"ok": False})
            return

        if parsed.path == '/api/themes/apply_local':
            fname = os.path.basename(payload.get('file', ''))
            fp = os.path.join(THEMES_DIR, fname)
            if not fname or not os.path.isfile(fp):
                self.send_json({'ok': False, 'error': 'Файл темы не найден'})
                return
            try:
                cfg = load_config()
                if fname.lower().endswith('.json'):
                    with open(fp, 'r', encoding='utf-8') as tf:
                        imported = json.load(tf)
                    merged = {**DEFAULT_DESIGN, **imported}
                    cfg['design'] = merged
                    save_config(cfg)
                    self.send_json({'ok': True, 'design': merged, 'isPack': False})
                    return
                else:
                    new_design = None
                    with zipfile.ZipFile(fp, 'r') as zf:
                        for member in zf.namelist():
                            if member == 'design.json':
                                new_design = json.loads(zf.read(member).decode('utf-8'))
                            elif member.startswith(('images/', 'sounds/', 'fonts/', 'models/')) and not member.endswith('/'):
                                parts = member.split('/', 1)
                                p_head = parts.pop(0)
                                p_tail = parts.pop(0)
                                dest_dir = {'images': IMAGES_DIR, 'sounds': SOUNDS_DIR, 'fonts': FONTS_DIR, 'models': MODELS_DIR}.get(p_head, IMAGES_DIR)
                                os.makedirs(dest_dir, exist_ok=True)
                                with open(os.path.join(dest_dir, os.path.basename(p_tail)), 'wb') as out_f:
                                    out_f.write(zf.read(member))
                    if new_design:
                        merged = {**DEFAULT_DESIGN, **new_design}
                        cfg['design'] = merged
                        save_config(cfg)
                    self.send_json({'ok': True, 'design': cfg.get('design'), 'isPack': True})
                    return
            except Exception as e:
                self.send_json({'ok': False, 'error': str(e)})
                return

        if parsed.path == '/api/themes/delete_local':
            fname = os.path.basename(payload.get('file', ''))
            fp = os.path.join(THEMES_DIR, fname)
            if fname and os.path.isfile(fp):
                os.remove(fp)
                self.send_json({'ok': True})
            else:
                self.send_json({'ok': False})
            return

        if parsed.path == '/api/media/drop_install':
            gid = sanitize_filename(payload.get('gameId', ''))
            slot = payload.get('slot', 'cover')
            fname = payload.get('fileName', 'asset.png')
            b64_data = payload.get('dataBase64', '')
            if not b64_data or (slot != 'mainlogo' and not gid):
                self.send_json({'ok': False, 'error': 'Неверные параметры файла'})
                return
            try:
                _, ext = os.path.splitext(fname)
                ext = ext.lower()
                raw_bytes = base64.b64decode(b64_data.split(',').pop())
                os.makedirs(IMAGES_DIR, exist_ok=True)
                stamp = int(time.time())

                if slot in ('char_left', 'char_right'):
                    side = 'left' if slot == 'char_left' else 'right'
                    dest_name = f"{gid}_{side}_{stamp}{ext}"
                    with open(os.path.join(IMAGES_DIR, dest_name), 'wb') as out_f:
                        out_f.write(raw_bytes)
                    url = f"/images/{dest_name}"
                    cfg = load_config()
                    chars = cfg.setdefault('design', {}).setdefault('characters', {}).setdefault(gid, {})
                    cur_slot = chars.get(side, {'height': 65, 'offset': 2, 'offsetY': 0, 'flip': False})
                    cur_slot['url'] = url
                    cur_slot['name'] = os.path.basename(fname)
                    chars[side] = cur_slot
                    save_config(cfg)
                    self.send_json({'ok': True, 'url': url, 'slot': slot, 'name': os.path.basename(fname)})
                    return

                is_vid = (slot == 'video')
                prefix = 'mainlogo' if slot == 'mainlogo' else (gid if slot in ('cover', 'video') else f"{gid}{slot}")
                clean_exts = ('.mp4', '.webm', '.mkv') if is_vid else ('.gif', '.png', '.jpg', '.jpeg', '.webp')
                for e in clean_exts:
                    old_f = os.path.join(IMAGES_DIR, f"{prefix}{e}")
                    if os.path.isfile(old_f):
                        try:
                            os.remove(old_f)
                        except Exception:
                            pass

                dest_name = f"{prefix}{ext}"
                with open(os.path.join(IMAGES_DIR, dest_name), 'wb') as out_f:
                    out_f.write(raw_bytes)
                self.send_json({'ok': True, 'url': f"/images/{dest_name}?t={stamp}", 'slot': slot})
                return
            except Exception as e:
                self.send_json({'ok': False, 'error': str(e)})
                return

        if parsed.path == '/api/assets/pick_3d_or_img':
            pref = sanitize_filename(payload.get('prefix', 'mesh'))
            ft = [('3D Models & Images', '*.glb *.obj *.stl *.png *.gif *.webp *.jpg'), ('3D Models (.glb, .obj, .stl)', '*.glb *.obj *.stl'), ('Images (.png, .gif, .webp)', '*.png *.gif *.webp *.jpg')]
            fp = open_native_dialog(filetypes=ft)
            if fp and os.path.isfile(fp):
                _, ext = os.path.splitext(fp)
                low = ext.lower()
                is_3d = low in ('.glb', '.obj', '.stl')
                t_dir = MODELS_DIR if is_3d else IMAGES_DIR
                u_pre = '/models/' if is_3d else '/images/'
                os.makedirs(t_dir, exist_ok=True)
                dname = f'{pref}_{int(time.time() * 1000)}{low}'
                shutil.copy2(fp, os.path.join(t_dir, dname))
                self.send_json({'ok': True, 'url': u_pre + dname, 'name': os.path.basename(fp), 'kind': '3d' if is_3d else 'img', 'ext': low})
            else:
                self.send_json({'ok': False})
            return

        if parsed.path == '/api/assets/pick_cursor':
            slot = sanitize_filename(payload.get('slot', 'default'))
            ft = [('Cursors & PNG', '*.png *.cur *.ico *.gif *.webp')]
            fp = open_native_dialog(filetypes=ft)
            if fp and os.path.isfile(fp):
                _, ext = os.path.splitext(fp)
                dname = f'cursor_{slot}_{int(time.time() * 1000)}{ext.lower()}'
                shutil.copy2(fp, os.path.join(IMAGES_DIR, dname))
                self.send_json({'ok': True, 'url': f'/images/{dname}', 'name': os.path.basename(fp)})
            else:
                self.send_json({'ok': False})
            return

        if parsed.path == '/api/assets/pick_image':
            pref = sanitize_filename(payload.get('prefix', 'custom_asset'))
            fp = open_native_dialog(filetypes=[('Images', '*.png *.gif *.webp *.jpg *.jpeg *.svg')])
            if fp and os.path.isfile(fp):
                os.makedirs(IMAGES_DIR, exist_ok=True)
                _, ext = os.path.splitext(fp)
                dname = f'{pref}_{int(time.time() * 1000)}{ext.lower()}'
                shutil.copy2(fp, os.path.join(IMAGES_DIR, dname))
                self.send_json({'ok': True, 'url': f'/images/{dname}', 'name': os.path.basename(fp)})
            else:
                self.send_json({'ok': False})
            return

        if parsed.path == '/api/variants/save':
            gid = payload.get('gameId', '')
            if gid:
                cfg = load_config()
                if 'variants' in payload and isinstance(payload['variants'], list):
                    cfg.setdefault('gameVariants', {})[gid] = payload['variants']
                if 'installer' in payload:
                    cfg.setdefault('gameInstallers', {})[gid] = str(payload['installer'] or '').strip()
                save_config(cfg)
            self.send_json({'ok': True})
            return

        if parsed.path == '/api/variants/browse_file':
            kind = payload.get('kind', 'exe')
            if kind == 'installer':
                ft = [('Installer / Archive', '*.exe *.msi *.zip *.7z *.rar'), ('All Files', '*.*')]
            else:
                ft = [('Game Executable', '*.exe *.bat *.cmd'), ('All Files', '*.*')]
            fp = open_native_dialog(filetypes=ft)
            self.send_json({'ok': bool(fp), 'path': fp.replace('\\', '/') if fp else ''})
            return

        if parsed.path == '/api/variants/run_installer':
            gid = payload.get('gameId', '')
            cfg = load_config()
            inst_p = cfg.get('gameInstallers', {}).get(gid, '')
            if not inst_p or not os.path.isfile(inst_p):
                self.send_json({'ok': False, 'error': 'Файл установщика не найден'})
                return
            low = inst_p.lower()
            if low.endswith(('.exe', '.msi')):
                os.startfile(os.path.abspath(inst_p))
                self.send_json({'ok': True, 'mode': 'exec'})
                return
            dest_dir = open_native_dialog(is_dir=True)
            if not dest_dir:
                self.send_json({'ok': False, 'cancelled': True})
                return
            try:
                if low.endswith('.zip'):
                    with zipfile.ZipFile(inst_p, 'r') as zf:
                        zf.extractall(dest_dir)
                else:
                    subprocess.run(['tar.exe', '-xf', inst_p, '-C', dest_dir], check=True, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
                found_exe = ''
                for r, _, fs in os.walk(dest_dir):
                    for fn in fs:
                        if fn.lower().endswith('.exe') and 'unins' not in fn.lower() and 'crash' not in fn.lower():
                            found_exe = os.path.join(r, fn).replace('\\', '/')
                            break
                    if found_exe: break
                if found_exe and not cfg.get('paths', {}).get(gid):
                    cfg.setdefault('paths', {})[gid] = found_exe
                    save_config(cfg)
                self.send_json({'ok': True, 'mode': 'extracted', 'exe': found_exe})
            except Exception as e:
                self.send_json({'ok': False, 'error': str(e)})
            return

        if parsed.path == '/api/collections/save':
            cols = payload.get('collections', [])
            if isinstance(cols, list):
                cfg = load_config()
                cfg['collections'] = cols
                save_config(cfg)
            self.send_json({'ok': True})
            return

        if parsed.path == '/api/window/drag_by':
            if window_instance:
                try:
                    dx = int(payload.get('dx', 0))
                    dy = int(payload.get('dy', 0))
                    window_instance.move(window_instance.x + dx, window_instance.y + dy)
                except Exception:
                    pass
            self.send_json({'ok': True})
            return

        if parsed.path == '/api/window/minidock':
            enable = bool(payload.get('enable'))
            if window_instance:
                try:
                    u32 = ctypes.windll.user32
                    sw, sh = u32.GetSystemMetrics(0), u32.GetSystemMetrics(1)
                    hwnd = u32.FindWindowW(None, 'Sonic Launcher')
                    if enable:
                        if hwnd:
                            st = u32.GetWindowLongW(hwnd, -16)
                            if not getattr(window_instance, '_orig_style', 0):
                                window_instance._orig_style = st
                            u32.SetWindowLongW(hwnd, -16, st & ~0x00CF0000)
                            u32.SetWindowPos(hwnd, 0, 0, 0, 0, 0, 0x0027)
                        window_instance.resize(236, 510)
                        window_instance.move(max(12, sw - 254), max(40, (sh - 510) // 2))
                        window_instance.on_top = True
                    else:
                        window_instance.on_top = False
                        if hwnd and getattr(window_instance, '_orig_style', 0):
                            u32.SetWindowLongW(hwnd, -16, window_instance._orig_style)
                            u32.SetWindowPos(hwnd, 0, 0, 0, 0, 0, 0x0027)
                        window_instance.resize(1020, 680)
                        window_instance.move(max(20, (sw - 1020) // 2), max(20, (sh - 680) // 2))
                except Exception:
                    pass
            self.send_json({'ok': True, 'dock': enable})
            return

        if parsed.path == '/api/games/toggle_fav':
            gid = str(payload.get('gameId', '')).strip()
            favs = read_fav_list()
            if gid in favs:
                favs = [x for x in favs if x != gid]
                now_fav = False
            else:
                if gid:
                    favs.append(gid)
                now_fav = True
            saved = write_fav_list(favs)
            self.send_json({'ok': True, 'favorite': now_fav, 'favorites': saved})
            return

        if parsed.path == '/api/games/save_note':
            gid = payload.get('gameId', '')
            text = str(payload.get('note', ''))
            if gid:
                cfg = load_config()
                cfg.setdefault('gameNotes', {})[gid] = text
                save_config(cfg)
            self.send_json({'ok': True})
            return

        if parsed.path == '/api/mod_managers/select':
            m_type = payload.get('type', 'hmm')
            info = MANAGER_TYPES.get(m_type, MANAGER_TYPES['hmm'])
            fp = open_native_dialog(filetypes=[(info['title'], '*.exe'), ('EXE', '*.exe')])
            if fp and os.path.isfile(fp):
                cur = load_mm_paths(load_config())
                cur[m_type] = fp.replace('\\', '/')
                saved = save_mm_paths(cur)
                self.send_json({'ok': True, 'path': saved.get(m_type, ''), 'managers': saved})
            else:
                self.send_json({'ok': False})
            return

        if parsed.path == '/api/mod_managers/launch':
            m_type = payload.get('type', 'hmm')
            cur = load_mm_paths(load_config())
            ok = launch_manager_exe(cur.get(m_type, ''))
            self.send_json({'ok': ok})
            return

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

        if parsed.path == '/api/discord/status':
            if active_game_id is None:
                cfg = load_config()
                discord_rpc.update_menu(
                    payload.get("gameName", ""), payload.get("gameId", ""), cfg.get("lang", "ru")
                )
            self.send_json({"ok": True})
            return

        if parsed.path == '/api/studio/apply_live':
            cfg = load_config()
            merged = dict(cfg.get('design', {}))
            merged.update(payload)
            if isinstance(payload.get('gradients'), dict):
                merged['gradients'] = {**cfg.get('design', {}).get('gradients', {}), **payload['gradients']}
            cfg['design'] = merged
            save_config(cfg)
            LauncherHandler._studio_rev = getattr(LauncherHandler, '_studio_rev', 0) + 1
            self.send_json({'ok': True, 'rev': LauncherHandler._studio_rev})
            return

        if parsed.path == '/api/design':
            cfg = load_config()
            cfg["design"] = payload
            save_config(cfg)
            register_screenshot_hotkey(payload.get("screenshotKey", "f6"))
            start_tray_icon(payload.get("appIconUrl", ""))
            discord_rpc.configure(payload.get("discordRpc", True), payload.get("discordClientId", ""))
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
            if url.startswith(("https://gamebanana.com", "https://github.com/thedmitgame/SonicGamesLauncher", "https://github.com", "https://teamforeverdev.github.io", "https://sonic3air.org", "https://sonic3air.org", "https://srb2.org", "https://srb2.org")):
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

        elif parsed.path == '/api/codes/toggle':
            ok = toggle_game_code(payload.get('gameId', ''), payload.get('codeId', ''), bool(payload.get('enabled')), load_config())
            self.send_json({'ok': ok})

        elif parsed.path == '/api/mods/toggle':
            cfg = load_config()
            toggle_game_mod(payload.get('gameId', ''), payload.get('modId', ''), bool(payload.get('enabled')), cfg)
            self.send_json({'ok': True})

        elif parsed.path == '/api/mods/save_preset':
            gid, pname = payload.get('gameId', ''), payload.get('name', '').strip()
            if gid and pname:
                cfg = load_config()
                cfg.setdefault('modPresets', {}).setdefault(gid, {})[pname] = payload.get('enabledIds', [])
                save_config(cfg)
            self.send_json({'ok': True})

        elif parsed.path == '/api/mods/apply_preset':
            gid, pname = payload.get('gameId', ''), payload.get('name', '')
            cfg = load_config()
            eids = {str(x).lower() for x in cfg.get('modPresets', {}).get(gid, {}).get(pname, [])}
            cur = get_game_mods(gid, cfg).get('mods', [])
            for m in cur:
                m['enabled'] = m.get('id', '').lower() in eids
            save_mods_state(gid, cur, cfg)
            self.send_json({'ok': True})

        elif parsed.path == '/api/mods/delete_preset':
            cfg = load_config()
            cfg.get('modPresets', {}).get(payload.get('gameId', ''), {}).pop(payload.get('name', ''), None)
            save_config(cfg)
            self.send_json({'ok': True})

        elif parsed.path == '/api/mods/install_zip':
            gid = payload.get('gameId', '')
            fname = payload.get('fileName', 'mod.zip')
            b64_data = payload.get('zipBase64', '')
            mods_dir = resolve_mods_dir(gid, load_config())
            if not mods_dir:
                self.send_json({'ok': False, 'error': 'Папка модов не выбрана'})
                return
            os.makedirs(mods_dir, exist_ok=True)
            try:
                raw = base64.b64decode(b64_data.split(",")[-1])
                tmp_zip = os.path.join(mods_dir, "_temp_install.zip")
                with open(tmp_zip, "wb") as zf:
                    zf.write(raw)
                mod_folder_name = sanitize_filename(os.path.splitext(fname)[0]) or "InstalledMod"
                ext_low = os.path.splitext(fname)[1].lower()
                if ext_low == ".zip":
                    with zipfile.ZipFile(tmp_zip, 'r') as z:
                        names = z.namelist()
                        has_root_ini = (gid != "srb2") and any(os.path.basename(n).lower() in ("mod.ini", "mod.json") and "/" not in n.strip("/") for n in names)
                        target_dir = os.path.join(mods_dir, mod_folder_name) if has_root_ini else mods_dir
                        os.makedirs(target_dir, exist_ok=True)
                        z.extractall(target_dir)
                else:
                    stage_dir = os.path.join(mods_dir, f"_stage_{int(time.time())}")
                    os.makedirs(stage_dir, exist_ok=True)
                    r = subprocess.run(
                        ["tar.exe", "-xf", tmp_zip, "-C", stage_dir],
                        capture_output=True, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0)
                    )
                    if r.returncode != 0:
                        shutil.rmtree(stage_dir, ignore_errors=True)
                        os.remove(tmp_zip)
                        self.send_json({"ok": False, "error": "Не удалось распаковать архив (используйте .ZIP или обновите Windows tar)"})
                        return
                    entries = os.listdir(stage_dir)
                    has_root_ini = (gid != "srb2") and any(e.lower() in ("mod.ini", "mod.json") for e in entries)
                    dest_base = os.path.join(mods_dir, mod_folder_name) if has_root_ini else mods_dir
                    os.makedirs(dest_base, exist_ok=True)
                    for e in entries:
                        src_p = os.path.join(stage_dir, e)
                        dst_p = os.path.join(dest_base, e)
                        if os.path.exists(dst_p):
                            if os.path.isdir(dst_p): shutil.rmtree(dst_p)
                            else: os.remove(dst_p)
                        shutil.move(src_p, dst_p)
                    shutil.rmtree(stage_dir, ignore_errors=True)
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
                    for folder_name, folder_path in [("images", IMAGES_DIR), ("sounds", SOUNDS_DIR), ("fonts", FONTS_DIR), ("models", MODELS_DIR)]:
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
                        elif member.startswith(("images/", "sounds/", "fonts/", "models/")) and not member.endswith("/"):
                            parts = member.split("/", 1)
                            p_head = parts.pop(0)
                            dest_dir = {"images": IMAGES_DIR, "sounds": SOUNDS_DIR, "fonts": FONTS_DIR, "models": MODELS_DIR}.get(p_head, IMAGES_DIR)
                            os.makedirs(dest_dir, exist_ok=True)
                            dest_file = os.path.join(dest_dir, os.path.basename(parts.pop(0)))
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

        if parsed.path == '/api/playtime_ping':
            cfg = load_config()
            self.send_json({'playtime': cfg.get('playtime', {}), 'runningId': active_game_id})
            return

        if parsed.path == '/api/backups/list':
            gid = get_query_param(query, 'id')
            self.send_json(list_save_backups(gid))
            return

        if parsed.path == '/api/guides/check':
            gid = get_query_param(query, 'id') or 'sonic1'
            self.send_json(inspect_game_health(gid, load_config()))
            return

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
                    v_list = cfg.get("gameVariants", {}).get(gid, [])
                    inst_p = cfg.get("gameInstallers", {}).get(gid, "")
                    has_alt = any(v.get("path") and os.path.isfile(v.get("path")) for v in v_list)
                    exists = bool((p and os.path.exists(p)) or has_alt or (inst_p and os.path.isfile(inst_p)))
                result.append({
                    **g,
                    "variants": cfg.get("gameVariants", {}).get(gid, []),
                    "installer": cfg.get("gameInstallers", {}).get(gid, ""),
                    "path": p,
                    "args": args_map.get(gid, ""),
                    "exists": exists,
                    "playtime": playtime.get(gid, 0),
                    "running": active_game_id == gid,
                    "favorite": gid in read_fav_list(),
                    "note": cfg.get("gameNotes", {}).get(gid, ""),
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
                "collections": cfg.get("collections", []),
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
                elif gid == "mania":
                    from core.saves_extra import find_mania_savedata
                    mp = find_mania_savedata(game_dir)
                    target_dir = os.path.dirname(mp) if mp else game_dir
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

        elif parsed.path == '/api/studio/ping':
            self.send_json({'rev': getattr(LauncherHandler, '_studio_rev', 0)})
            return

        elif parsed.path == '/api/open_studio':
            port = self.server.server_port
            webbrowser.open(f'http://127.0.0.1:{port}/ThemeStudio.html')
            self.send_json({'ok': True})
            return

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

        elif parsed.path == '/api/hmm/autoscan':
            cfg = load_config()
            found = find_manager_exe('hmm', cfg)
            if found:
                cfg['smmPath'] = found
                save_config(cfg)
            self.send_json({'ok': bool(found), 'smmPath': found})
            return

        elif parsed.path == '/api/mod_managers/status':
            self.send_json({'managers': load_mm_paths(load_config())})
            return

        elif parsed.path == '/api/mod_managers/autoscan':
            cfg = load_config()
            cur = load_mm_paths(cfg)
            for k in ('hmm', 'samm', 'mml'):
                if not cur.get(k):
                    fp = find_manager_exe(k, cfg)
                    if fp:
                        cur[k] = fp
            saved = save_mm_paths(cur)
            self.send_json({'ok': True, 'managers': saved})
            return

        elif parsed.path == '/api/select_smm':
            file_path = open_native_dialog(filetypes=[('HedgeModManager', '*.exe')])
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

        elif parsed.path == '/api/codes/list':
            gid = get_query_param(query, 'id')
            self.send_json(get_game_codes(gid, load_config()))
            return

        elif parsed.path == '/api/mods/list':
            gid = get_query_param(query, 'id')
            self.send_json(get_game_mods(gid, load_config()))
            return

        elif parsed.path == '/api/mods/select_dir':
            gid = get_query_param(query, 'id')
            chosen = open_native_dialog(is_dir=True)
            if chosen and os.path.isdir(chosen):
                cfg = load_config()
                cfg.setdefault('modPaths', {})[gid] = chosen
                save_config(cfg)
                self.send_json({'modsDir': chosen})
            else:
                self.send_json({'modsDir': None})
            return

        elif parsed.path == '/api/mods/open_dir':
            gid = get_query_param(query, 'id')
            mdir = resolve_mods_dir(gid, load_config())
            if mdir and os.path.isdir(mdir):
                os.startfile(mdir)
            self.send_json({'ok': bool(mdir and os.path.isdir(mdir))})
            return

        elif parsed.path == '/api/backups/open_dir':
            b_dir = os.path.join(BACKUPS_DIR, sanitize_filename(get_query_param(query, 'id')))
            os.makedirs(b_dir, exist_ok=True)
            os.startfile(b_dir)
            self.send_json({'ok': True})
            return

        elif parsed.path == '/api/jukebox/stream':
            src_kind = get_query_param(query, 'src')
            fname = os.path.basename(get_query_param(query, 'f'))
            base_d = os.path.join(SOUNDS_DIR, "music") if src_kind == "music" else SOUNDS_DIR
            fp = os.path.join(base_d, fname)
            if fname and os.path.isfile(fp):
                ext = os.path.splitext(fp)[-1].lower()
                mime_map = {'.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.flac': 'audio/flac', '.m4a': 'audio/mp4'}
                fsize = os.path.getsize(fp)
                rng = self.headers.get('Range', '')
                if rng.startswith('bytes='):
                    p1, _, p2 = rng[6:].partition('-')
                    sb = int(p1) if p1.isdigit() else 0
                    eb = min(int(p2) if p2.isdigit() else fsize - 1, fsize - 1)
                    if 0 <= sb <= eb:
                        ln = eb - sb + 1
                        self.send_response(206)
                        self.send_header('Content-Type', mime_map.get(ext, 'audio/mpeg'))
                        self.send_header('Accept-Ranges', 'bytes')
                        self.send_header('Content-Range', f'bytes {sb}-{eb}/{fsize}')
                        self.send_header('Content-Length', str(ln))
                        self.end_headers()
                        with open(fp, 'rb') as af:
                            af.seek(sb)
                            self.wfile.write(af.read(ln))
                        return
                self.send_response(200)
                self.send_header('Content-Type', mime_map.get(ext, 'audio/mpeg'))
                self.send_header('Content-Length', str(fsize))
                self.send_header('Accept-Ranges', 'bytes')
                self.end_headers()
                with open(fp, 'rb') as af:
                    shutil.copyfileobj(af, self.wfile)
                return
            self.send_error(404)
            return

        elif parsed.path == '/api/jukebox/list':
            music_dir = os.path.join(SOUNDS_DIR, "music")
            os.makedirs(music_dir, exist_ok=True)
            tracks = []
            valid_exts = (".mp3", ".ogg", ".wav", ".flac", ".m4a")
            # Сначала подхватываем базовый bgm из sounds/, если есть
            for fn in sorted(os.listdir(SOUNDS_DIR)):
                stem, ext = os.path.splitext(fn)
                if stem.lower() == "bgm" and ext.lower() in valid_exts:
                    tracks.append({"title": "Main Theme (BGM)", "url": f"/api/jukebox/stream?src=root&f={urllib.parse.quote(fn)}"})
            for fn in sorted(os.listdir(music_dir)):
                stem, ext = os.path.splitext(fn)
                if ext.lower() in valid_exts:
                    tracks.append({"title": stem.replace("_", " "), "file": fn, "url": f"/api/jukebox/stream?src=music&f={urllib.parse.quote(fn)}"})
            self.send_json({"tracks": tracks})
            return

        elif parsed.path == '/api/jukebox/open_dir':
            music_dir = os.path.join(SOUNDS_DIR, "music")
            os.makedirs(music_dir, exist_ok=True)
            os.startfile(music_dir)
            self.send_json({"ok": True})
            return

        elif parsed.path == '/api/profile_summary':
            cfg = load_config()
            games_order = cfg.get("gamesOrder", DEFAULT_GAMES)
            paths = cfg.get("paths", {})
            playtime_map = cfg.get("playtime", {})
            total_sec = sum(int(v or 0) for v in playtime_map.values())
            total_em = 0
            max_em_all = 0
            total_ach_done = 0
            total_ach_all = 0
            installed_count = 0
            top_game_name = "—"
            top_game_sec = 0
            breakdown = []

            for g in games_order:
                gid = g.get("id", "")
                gname = g.get("name", gid)
                p = paths.get(gid, "")
                emu_id = g.get("emuId")
                if emu_id:
                    emu_obj = next((e for e in cfg.get("emulators", []) if e.get("id") == emu_id), None)
                    exists = bool(p and os.path.exists(p) and emu_obj and os.path.exists(emu_obj.get("path", "")))
                else:
                    exists = bool(p and os.path.exists(p))
                if exists:
                    installed_count += 1
                g_sec = int(playtime_map.get(gid, 0) or 0)
                if g_sec > top_game_sec:
                    top_game_sec = g_sec
                    top_game_name = gname

                em_cur, em_max, ach_done, ach_max = 0, 0, 0, 0
                if exists and not emu_id and not g.get("custom"):
                    try:
                        pr = parse_game_progress(gid, cfg)
                        if pr.get("supported"):
                            em_cur = int(pr.get("emeralds", 0) or 0)
                            em_max = int(pr.get("maxEmeralds", 7) or 0)
                            achs = pr.get("achievements", [])
                            ach_max = len(achs)
                            ach_done = sum(1 for a in achs if a.get("done"))
                            total_em += em_cur
                            max_em_all += em_max
                            total_ach_done += ach_done
                            total_ach_all += ach_max
                    except Exception:
                        pass

                if exists or g_sec > 0:
                    breakdown.append({
                        "id": gid,
                        "name": gname,
                        "color": g.get("color", "#3B82F6"),
                        "seconds": g_sec,
                        "emCur": em_cur,
                        "emMax": em_max,
                        "achDone": ach_done,
                        "achMax": ach_max
                    })

            self.send_json({
                "totalSeconds": total_sec,
                "installedCount": installed_count,
                "totalGames": len(games_order),
                "emeraldsCur": total_em,
                "emeraldsMax": max_em_all,
                "achDone": total_ach_done,
                "achMax": total_ach_all,
                "topGame": top_game_name,
                "topGameSeconds": top_game_sec,
                "games": breakdown
            })
            return

        elif parsed.path == '/api/themes/list':
            os.makedirs(THEMES_DIR, exist_ok=True)
            items = []
            for fn in sorted(os.listdir(THEMES_DIR)):
                low = fn.lower()
                if low.endswith(('.json', '.sonicpack')) and not low.startswith('_temp'):
                    fp = os.path.join(THEMES_DIR, fn)
                    if os.path.isfile(fp):
                        sz_kb = max(1, round(os.path.getsize(fp) / 1024))
                        kind = 'PACK' if low.endswith('.sonicpack') else 'JSON'
                        items.append({'file': fn, 'kind': kind, 'sizeKb': sz_kb})
            self.send_json({'items': items, 'dir': THEMES_DIR})
            return

        elif parsed.path == '/api/themes/open_dir':
            os.makedirs(THEMES_DIR, exist_ok=True)
            os.startfile(THEMES_DIR)
            self.send_json({'ok': True})
            return

        elif parsed.path == '/api/challenges/stats':
            cfg = load_config()
            total_mods = 0
            for g in cfg.get('gamesOrder', []):
                gid = g.get('id', '')
                if cfg.get('paths', {}).get(gid):
                    try:
                        total_mods += len(get_game_mods(gid, cfg).get('mods', []))
                    except Exception:
                        pass
            total_shots = 0
            if os.path.isdir(SCREENSHOTS_DIR):
                for _, _, fs in os.walk(SCREENSHOTS_DIR):
                    total_shots += sum(1 for fn in fs if fn.lower().endswith(('.png', '.jpg')))
            self.send_json({
                'modsCount': total_mods,
                'shotsCount': total_shots,
                'shelvesCount': len(cfg.get('collections', []))
            })
            return

        elif parsed.path == '/api/favorites':
            self.send_json({'favorites': read_fav_list()})
            return

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
            var_id = get_query_param(query, 'var')
            cfg = load_config()
            target_path = cfg["paths"].get(game_id)
            raw_args = cfg.get("launchArgs", {}).get(game_id, "").strip()
            if var_id and var_id != "primary":
                v_obj = next((v for v in cfg.get("gameVariants", {}).get(game_id, []) if v.get("id") == var_id), None)
                if v_obj and v_obj.get("path") and os.path.isfile(v_obj.get("path")):
                    target_path = v_obj["path"]
                    raw_args = str(v_obj.get("args", "")).strip()
            g_meta = next((g for g in cfg.get("gamesOrder", []) if g.get("id") == game_id), {})
            emu_id = g_meta.get("emuId")

            if target_path and os.path.exists(target_path) and active_game_id is None:
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


ROM_VALID_EXTS = (
    ".iso", ".rvz", ".gcm", ".wbfs", ".ciso", ".chd", ".cue",
    ".cdi", ".gdi", ".mds", ".pbp", ".cso", ".md", ".gen",
    ".smd", ".32x", ".gg", ".sms", ".sfc", ".smc", ".gba",
    ".nds", ".3ds", ".cci", ".nsp", ".xci", ".xex"
)


def clean_rom_title(filename):
    stem = filename.rsplit('.', 1).pop(0)
    out, depth = '', 0
    for ch in stem:
        if ch in ('(', chr(91)):
            depth += 1
        elif ch in (')', chr(93)) and depth > 0:
            depth -= 1
        elif depth == 0:
            out += ch
    res = out.replace('_', ' ').strip(' -.')
    return res or stem



FAV_FILE_PATH = os.path.join(BASE_DIR, "favorites.json")


def read_fav_list():
    if os.path.isfile(FAV_FILE_PATH):
        try:
            with open(FAV_FILE_PATH, "r", encoding="utf-8") as ff:
                data = json.load(ff)
                if isinstance(data, list):
                    return [str(x) for x in data if x]
        except Exception:
            pass
    return []


def write_fav_list(items):
    uniq = []
    for x in items:
        s = str(x).strip()
        if s and s not in uniq:
            uniq.append(s)
    with open(FAV_FILE_PATH, "w", encoding="utf-8") as ff:
        json.dump(uniq, ff, ensure_ascii=False, indent=2)
    return uniq


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


# --- AUTO-START DISCORD RPC ---
try:
    _init_cfg = load_config()
    _init_dsg = _init_cfg.get("design", {})
    discord_rpc.configure(_init_dsg.get("discordRpc", True), _init_dsg.get("discordClientId", ""))
    discord_rpc.update_menu("", "logo", _init_cfg.get("lang", "ru"))
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
