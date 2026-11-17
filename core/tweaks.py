import os, json

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

