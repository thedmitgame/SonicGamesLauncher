import os, re, json
from datetime import datetime
from core.mods import resolve_mods_dir


def _find_s3air_rom(game_dir):
    appdata = os.path.join(os.environ.get("APPDATA", ""), "Sonic3AIR")
    cands = []
    for base in (appdata, game_dir):
        if base and os.path.isdir(base):
            for fn in os.listdir(base):
                low = fn.lower()
                if "sonic" in low and low.endswith((".bin", ".md", ".gen", ".smd")):
                    cands.append(os.path.join(base, fn))
    steam_guess = [
        r"C:\Program Files (x86)\Steam\steamapps\common\Sega Classics\uncompressed ROMs\Sonic_Knuckles_wSonic3.bin",
        r"D:\SteamLibrary\steamapps\common\Sega Classics\uncompressed ROMs\Sonic_Knuckles_wSonic3.bin"
    ]
    for sg in steam_guess:
        if os.path.isfile(sg):
            cands.append(sg)
    return cands[0] if cands else ""


def inspect_game_health(game_id, cfg):
    exe_p = cfg.get("paths", {}).get(game_id, "")
    checks = []
    has_exe = bool(exe_p and os.path.isfile(exe_p))
    game_dir = os.path.dirname(exe_p) if has_exe else ""

    checks.append({
        "ok": has_exe,
        "label_ru": "Исполняемый файл (.exe) подключён" if has_exe else "Путь к .exe файлу ещё не указан",
        "label_en": "Executable (.exe) is linked" if has_exe else "Executable (.exe) path is not set yet",
        "detail": os.path.basename(exe_p) if has_exe else ""
    })

    if has_exe:
        if game_id in ("sonic1", "sonic2", "soniccd"):
            rsdk_found = ""
            for fn in os.listdir(game_dir):
                if fn.lower() in ("data.rsdk", "data.rsdk.xmf"):
                    rsdk_found = fn
                    break
            if not rsdk_found and os.path.isdir(os.path.join(game_dir, "Data")):
                rsdk_found = "Data/ (распакованная папка)"
            checks.append({
                "ok": bool(rsdk_found),
                "label_ru": "Архив ресурсов Data.rsdk найден" if rsdk_found else "Внимание: в папке игры нет файла Data.rsdk!",
                "label_en": "Data.rsdk resource archive found" if rsdk_found else "Warning: Data.rsdk is missing in game folder!",
                "detail": rsdk_found
            })
        elif game_id == "sonic3":
            rom_p = _find_s3air_rom(game_dir)
            checks.append({
                "ok": bool(rom_p),
                "label_ru": "Базовый ROM S3&K обнаружен" if rom_p else "Проверьте наличие ROM Sonic_Knuckles_wSonic3.bin",
                "label_en": "Base S3&K ROM detected" if rom_p else "Make sure Sonic_Knuckles_wSonic3.bin ROM is provided",
                "detail": os.path.basename(rom_p) if rom_p else ""
            })
        elif game_id == "mania":
            has_rsdk = os.path.isfile(os.path.join(game_dir, "Data.rsdk")) or os.path.isdir(os.path.join(game_dir, "Data"))
            checks.append({
                "ok": has_rsdk,
                "label_ru": "Ресурсы Sonic Mania (Data.rsdk) на месте" if has_rsdk else "Файл Data.rsdk не найден рядом с .exe",
                "label_en": "Sonic Mania assets (Data.rsdk) found" if has_rsdk else "Data.rsdk not found next to .exe",
                "detail": "Data.rsdk" if has_rsdk else ""
            })
        elif game_id == "srb2":
            has_pk3 = os.path.isfile(os.path.join(game_dir, "srb2.pk3"))
            checks.append({
                "ok": has_pk3,
                "label_ru": "Базовый архив srb2.pk3 на месте" if has_pk3 else "Файл srb2.pk3 не найден в папке игры",
                "label_en": "Core archive srb2.pk3 found" if has_pk3 else "srb2.pk3 missing in game folder",
                "detail": "srb2.pk3" if has_pk3 else ""
            })

    mdir = resolve_mods_dir(game_id, cfg)
    has_mods = bool(mdir and os.path.isdir(mdir))
    checks.append({
        "ok": has_mods,
        "label_ru": "Папка модов готова к работе" if has_mods else "Папка модов пока не создана",
        "label_en": "Mods directory is ready" if has_mods else "Mods directory not created yet",
        "detail": mdir.replace("\\", "/") if has_mods else ""
    })

    local_notes = ""
    local_ver = ""
    updated_date = ""
    if has_exe:
        try:
            updated_date = datetime.fromtimestamp(os.path.getmtime(exe_p)).strftime("%d.%m.%Y")
        except Exception:
            pass
        for fn in ("changelog.txt", "CHANGELOG.md", "version.txt", "README.md", "readme.txt"):
            fp = os.path.join(game_dir, fn)
            if os.path.isfile(fp):
                try:
                    raw = open(fp, "r", encoding="utf-8", errors="ignore").read(2800).strip()
                    if raw and not local_notes:
                        local_notes = f"[{fn}]\n" + raw[:1200]
                    m = re.search(r"v?(\d+\.\d+(?:\.\d+)*)", raw)
                    if m and not local_ver:
                        local_ver = m.group(1)
                except Exception:
                    pass

    if game_id == "sonic3" and not local_ver:
        s3_set = os.path.join(os.environ.get("APPDATA", ""), "Sonic3AIR", "settings.json")
        if os.path.isfile(s3_set):
            try:
                local_ver = str(json.load(open(s3_set, "r", encoding="utf-8-sig")).get("Version", ""))
            except Exception:
                pass

    return {
        "ok": True,
        "gameId": game_id,
        "checks": checks,
        "localVer": local_ver,
        "exeDate": updated_date,
        "localChangelog": local_notes
    }
