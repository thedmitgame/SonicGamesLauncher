import os, zipfile
from datetime import datetime
from core.config import BASE_DIR, sanitize_filename

BACKUPS_DIR = os.path.join(BASE_DIR, "backups")
os.makedirs(BACKUPS_DIR, exist_ok=True)

SAVE_NAMES = (
    "sdata.bin", "udata.bin", "achdata.bin", "savedata.bin",
    "gamedata.dat", "data.dat", "playerprogress.bin",
    "s3air_saveslots.bin", "s3air_achievements.bin"
)


def resolve_save_root_and_files(game_id, cfg):
    appdata = os.environ.get("APPDATA", "")
    exe_p = cfg.get("paths", {}).get(game_id, "")
    game_dir = os.path.dirname(exe_p) if (exe_p and os.path.exists(exe_p)) else ""

    if game_id == "sonic3":
        root = os.path.join(appdata, "Sonic3AIR")
        if os.path.isdir(root):
            found = []
            for r, _, fs in os.walk(root):
                if os.path.basename(r).lower() in ("mods", "logs", "cache"):
                    continue
                for fn in fs:
                    if fn.lower().endswith((".bin", ".json")) and "log" not in fn.lower():
                        found.append(os.path.join(r, fn))
            return root, found

    if game_id == 'mania':
        from core.saves_extra import find_mania_savedata
        mp = find_mania_savedata(game_dir)
        if mp and os.path.isfile(mp):
            return os.path.dirname(mp), [mp]

    if game_id == "origins":
        root = os.path.join(appdata, "SEGA", "SonicOrigins", "steam")
        if os.path.isdir(root):
            found = []
            for r, _, fs in os.walk(root):
                for fn in fs:
                    if fn.lower().endswith((".dat", ".bin", ".sav")):
                        found.append(os.path.join(r, fn))
            return root, found

    if not game_dir or not os.path.isdir(game_dir):
        return "", []

    found = []
    base_depth = game_dir.rstrip(os.sep).count(os.sep)
    skip_Set = {"mods", "addons", "screenshots", "videos", "music", "sound"}
    ignore_files = {"data.rsdk", "data.rsdk.xmf", "srb2.pk3", "zones.pk3", "player.dta"}

    for r, dirs, fs in os.walk(game_dir):
        dirs[:] = [d for d in dirs if d.lower() not in skip_Set]
        if r.count(os.sep) - base_depth > 2:
            continue
        for fn in fs:
            low = fn.lower()
            if (low in SAVE_NAMES or low.endswith((".ssg", ".sav", ".srm"))) and low not in ignore_files:
                found.append(os.path.join(r, fn))
    return game_dir, found


def list_save_backups(game_id):
    g_dir = os.path.join(BACKUPS_DIR, sanitize_filename(game_id))
    if not os.path.isdir(g_dir):
        return {"dir": g_dir, "items": []}
    items = []
    for fn in sorted(os.listdir(g_dir), reverse=True):
        if fn.lower().endswith(".zip"):
            fp = os.path.join(g_dir, fn)
            sz_kb = max(1, round(os.path.getsize(fp) / 1024))
            dt_str = datetime.fromtimestamp(os.path.getmtime(fp)).strftime("%d.%m.%Y %H:%M")
            items.append({"file": fn, "label": f"{dt_str} ({sz_kb} KB) — {fn}"})
    return {"dir": g_dir, "items": items}


def create_save_backup(game_id, cfg, note=""):
    root, files = resolve_save_root_and_files(game_id, cfg)
    if not root or not files:
        return {"ok": False, "error": "Файлы сохранений для этой игры пока не найдены"}
    g_dir = os.path.join(BACKUPS_DIR, sanitize_filename(game_id))
    os.makedirs(g_dir, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    clean_note = ("_" + sanitize_filename(note)) if str(note).strip() else ""
    zip_name = f"save_{stamp}{clean_note}.zip"
    zip_path = os.path.join(g_dir, zip_name)
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for fp in files:
            zf.write(fp, arcname=os.path.relpath(fp, root))
    return {"ok": True, "file": zip_name, "count": len(files)}


def restore_save_backup(game_id, file_name, cfg):
    root, _ = resolve_save_root_and_files(game_id, cfg)
    if not root:
        appdata = os.environ.get("APPDATA", "")
        if game_id == "sonic3":
            root = os.path.join(appdata, "Sonic3AIR")
        elif game_id == "origins":
            root = os.path.join(appdata, "SEGA", "SonicOrigins", "steam")
        else:
            exe_p = cfg.get("paths", {}).get(game_id, "")
            root = os.path.dirname(exe_p) if exe_p else ""
    if not root:
        return {"ok": False, "error": "Папка сохранений не найдена"}
    zp = os.path.join(BACKUPS_DIR, sanitize_filename(game_id), os.path.basename(file_name))
    if not os.path.isfile(zp):
        return {"ok": False, "error": "Архив бэкапа не найден"}
    os.makedirs(root, exist_ok=True)
    norm_root = os.path.abspath(root)
    with zipfile.ZipFile(zp, "r") as zf:
        for member in zf.namelist():
            dest = os.path.abspath(os.path.join(root, member))
            if dest.startswith(norm_root + os.sep) and not member.endswith("/"):
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                with open(dest, "wb") as out_f:
                    out_f.write(zf.read(member))
    return {"ok": True}


def delete_save_backup(game_id, file_name):
    zp = os.path.join(BACKUPS_DIR, sanitize_filename(game_id), os.path.basename(file_name))
    if os.path.isfile(zp):
        os.remove(zp)
        return {"ok": True}
    return {"ok": False, "error": "Файл не найден"}
