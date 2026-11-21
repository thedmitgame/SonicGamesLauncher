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

    g_dir = os.path.dirname(exe)
    if game_id == "srb2":
        cfg_p = os.path.join(g_dir, "config.cfg")
        tweaks = {"fullscreen": True, "borderless": False, "vsync": True, "devmode": False, "filtering": False, "supported": True}
        if os.path.exists(cfg_p):
            try:
                with open(cfg_p, "r", encoding="utf-8", errors="ignore") as f:
                    for line in f:
                        parts = line.strip().split(None, 1)
                        if len(parts) == 2:
                            k = parts.pop(0).lower()
                            v = parts.pop(0).strip(chr(34)).lower()
                            on = v in ("yes", "on", "1", "opengl", "linear")
                            if k == "fullscreen":
                                tweaks["fullscreen"] = on
                            elif k == "vid_borderlesswindow":
                                tweaks["borderless"] = on
                            elif k == "vid_wait":
                                tweaks["vsync"] = on
                            elif k == "renderer":
                                tweaks["filtering"] = (v == "opengl")
            except Exception:
                pass
        cur_args = cfg.get("launchArgs", {}).get("srb2", "")
        tweaks["devmode"] = ("-debug" in cur_args.lower() or "-devparm" in cur_args.lower())
        return tweaks

    cand_upper = os.path.join(g_dir, "Settings.ini")
    ini_path = cand_upper if os.path.exists(cand_upper) else os.path.join(g_dir, "settings.ini")
    tweaks = {"fullscreen": False, "borderless": False, "vsync": True, "devmode": False, "filtering": False, "supported": True}
    if os.path.exists(ini_path):
        try:
            with open(ini_path, "r", encoding="utf-8-sig", errors="ignore") as f:
                for line in f:
                    s = line.strip()
                    if "=" in s and not s.startswith(";"):
                        k, v = s.split("=", 1)
                        kl = k.strip().lower()
                        vs = v.strip().lower()
                        val = vs in ("true", "1", "yes", "y", "2")
                        if kl == "fs":
                            tweaks["fullscreen"] = val
                        elif kl == "windowed":
                            tweaks["fullscreen"] = vs in ("false", "0", "no", "n")
                        elif kl == "borderless":
                            tweaks["borderless"] = val
                        elif kl == "vsync":
                            tweaks["vsync"] = val
                        elif kl in ("devmenu", "enabledevmenu"):
                            tweaks["devmode"] = val
                        elif kl in ("pixelfilter", "filtering", "filter"):
                            tweaks["filtering"] = vs not in ("0", "false", "none", "no", "n")
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
    g_dir = os.path.dirname(exe)

    if game_id == "srb2":
        from core.config import save_config
        cfg_p = os.path.join(g_dir, "config.cfg")
        q = chr(34)
        kv = {
            "fullscreen": q + ("Yes" if tweaks.get("fullscreen") else "No") + q,
            "vid_borderlesswindow": q + ("On" if tweaks.get("borderless") else "Off") + q,
            "vid_wait": q + ("On" if tweaks.get("vsync") else "Off") + q,
            "renderer": q + ("OpenGL" if tweaks.get("filtering") else "Software") + q
        }
        lines, seen = [], set()
        if os.path.exists(cfg_p):
            with open(cfg_p, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    parts = line.strip().split(None, 1)
                    if parts:
                        k_low = parts.pop(0).lower()
                        if k_low in kv:
                            lines.append(f"{k_low} {kv.get(k_low)}\n")
                            seen.add(k_low)
                            continue
                    lines.append(line if line.endswith("\n") else line + "\n")
        for k_low, v_str in kv.items():
            if k_low not in seen:
                lines.append(f"{k_low} {v_str}\n")
        with open(cfg_p, "w", encoding="utf-8") as f:
            f.writelines(lines)

        cur_args = cfg.setdefault("launchArgs", {}).get("srb2", "")
        cleaned = " ".join(x for x in cur_args.split() if x.lower() not in ("-debug", "-devparm"))
        if tweaks.get("devmode"):
            cleaned = (cleaned + " -debug").strip()
        cfg["launchArgs"]["srb2"] = cleaned
        save_config(cfg)
        return True

    cand_upper = os.path.join(g_dir, "Settings.ini")
    ini_path = cand_upper if os.path.exists(cand_upper) else os.path.join(g_dir, "settings.ini")
    is_mania = (game_id == "mania")
    t_yes = "y" if is_mania else "true"
    t_no = "n" if is_mania else "false"
    key_map = {
        "fs": t_yes if tweaks.get("fullscreen") else t_no,
        "borderless": t_yes if tweaks.get("borderless") else t_no,
        "vsync": t_yes if tweaks.get("vsync") else t_no,
        "devmenu": t_yes if tweaks.get("devmode") else t_no,
        "pixelfilter": ("2" if is_mania else "true") if tweaks.get("filtering") else ("0" if is_mania else "false")
    }
    lines, updated = [], set()
    if os.path.exists(ini_path):
        try:
            with open(ini_path, "r", encoding="utf-8-sig", errors="ignore") as f:
                for line in f:
                    s = line.strip()
                    if "=" in s and not s.startswith(";"):
                        k, _ = s.split("=", 1)
                        kl = k.strip().lower()
                        if kl in key_map:
                            lines.append(f"{k.strip()}={key_map.get(kl)}\n")
                            updated.add(kl)
                            continue
                    lines.append(line if line.endswith("\n") else line + "\n")
        except Exception:
            pass
    sec_hdr = chr(91) + "Video" + chr(93)
    if not any(l.strip().lower() == sec_hdr.lower() for l in lines):
        lines.append(sec_hdr + "\n")
    for kl, val in key_map.items():
        if kl not in updated:
            lines.append(f"{kl}={val}\n")
    with open(ini_path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    return True
