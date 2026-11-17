import os, json
from core.config import save_config

SRB2_EXTS = (".pk3", ".wad", ".lua", ".soc")


def resolve_mods_dir(game_id, cfg):
    custom = cfg.get("modPaths", {}).get(game_id, "")
    if custom and os.path.exists(custom):
        return custom
    if game_id == "sonic3":
        s3 = os.path.join(os.environ.get("APPDATA", ""), "Sonic3AIR", "mods")
        if os.path.exists(s3):
            return s3
    if game_id == "srb2":
        exe = cfg.get("paths", {}).get("srb2", "")
        if exe and os.path.exists(exe):
            ad = os.path.join(os.path.dirname(exe), "addons")
            os.makedirs(ad, exist_ok=True)
            return ad
    exe = cfg.get("paths", {}).get(game_id, "")
    if exe and os.path.exists(exe):
        gm = os.path.join(os.path.dirname(exe), "mods")
        if os.path.exists(gm):
            return gm
    return ""

def find_modconfig_path(mods_dir):
    p1 = os.path.join(mods_dir, "modconfig.ini")
    p2 = os.path.join(os.path.dirname(mods_dir), "modconfig.ini")
    return p1 if os.path.exists(p1) else (p2 if os.path.exists(p2) else p1)

def find_mod_thumb(mod_full_dir, game_id, folder):
    for fn in ("preview.png", "thumbnail.png", "icon.png", "preview.jpg", "thumbnail.jpg"):
        if os.path.exists(os.path.join(mod_full_dir, fn)):
            return f"/api/mods/thumb?id={game_id}&mod={folder}"
    return ""

def get_game_mods(game_id, cfg):
    mods_dir = resolve_mods_dir(game_id, cfg)
    presets = cfg.get("modPresets", {}).get(game_id, {})
    if not mods_dir or not os.path.exists(mods_dir):
        return {"modsDir": mods_dir, "mods": [], "presets": presets, "supported": game_id != "origins"}

    if game_id == "srb2":
        all_files = []
        for r, _, fs in os.walk(mods_dir):
            for fn in fs:
                if fn.lower().endswith(SRB2_EXTS):
                    rel = os.path.relpath(os.path.join(r, fn), mods_dir).replace("\\", "/")
                    all_files.append(rel)
        saved = cfg.get("srb2Mods", [])
        saved_map = {m["id"].lower(): bool(m.get("enabled")) for m in saved if "id" in m}
        by_low = {f.lower(): f for f in all_files}
        ordered = []
        for m in saved:
            low = m.get("id", "").lower()
            if low in by_low and by_low[low] not in ordered:
                ordered.append(by_low[low])
        for f in sorted(all_files):
            if f not in ordered:
                ordered.append(f)
        res = []
        for rel in ordered:
            ext = os.path.splitext(rel)[1].upper().lstrip(".")
            res.append({
                "id": rel, "title": os.path.basename(rel),
                "author": f"SRB2 {ext} Addon", "desc": rel if "/" in rel else "",
                "version": "", "gameVersion": "", "thumb": "",
                "enabled": saved_map.get(rel.lower(), False)
            })
        return {"modsDir": mods_dir, "mods": res, "presets": presets, "supported": True}

    folders = [f for f in os.listdir(mods_dir) if os.path.isdir(os.path.join(mods_dir, f))]
    by_low = {f.strip().lower(): f for f in folders}
    ordered = []

    if game_id == "sonic3":
        af = os.path.join(os.path.dirname(mods_dir), "active-mods.json")
        act_list = []
        if os.path.exists(af):
            try:
                with open(af, "r", encoding="utf-8-sig") as f:
                    act_list = [str(x).strip().lower() for x in json.load(f).get("ActiveMods", [])]
            except Exception:
                pass
        act_set = set(act_list)
        for low in act_list:
            if low in by_low and by_low[low] not in ordered:
                ordered.append(by_low[low])
        for f in sorted(folders):
            if f not in ordered:
                ordered.append(f)

        res = []
        for folder in ordered:
            full = os.path.join(mods_dir, folder)
            title, author, desc, ver, gver = folder, "Неизвестно", "", "", ""
            meta = os.path.join(full, "mod.json")
            if os.path.exists(meta):
                try:
                    with open(meta, "r", encoding="utf-8-sig") as mf:
                        m = json.load(mf).get("Metadata", {})
                        title = m.get("Name", folder)
                        author = m.get("Author", "Неизвестно")
                        desc = m.get("Description", "")
                        ver = m.get("ModVersion", "")
                        gver = m.get("GameVersion", "")
                except Exception:
                    pass
            res.append({
                "id": folder, "title": title, "author": author,
                "desc": desc, "version": ver, "gameVersion": gver,
                "thumb": find_mod_thumb(full, game_id, folder),
                "enabled": folder.strip().lower() in act_set
            })
        return {"modsDir": mods_dir, "mods": res, "presets": presets, "supported": True}

    mc = find_modconfig_path(mods_dir)
    en_map, ini_ord = {}, []
    if os.path.exists(mc):
        try:
            with open(mc, "r", encoding="utf-8-sig", errors="ignore") as f:
                for line in f:
                    s = line.strip()
                    if "=" in s and not s.startswith(";") and not s.startswith("#"):
                        k, v = s.split("=", 1)
                        kl = k.strip().lower()
                        ini_ord.append(kl)
                        en_map[kl] = v.strip().lower() in ("true", "1", "yes")
        except Exception:
            pass

    for low in ini_ord:
        if low in by_low and by_low[low] not in ordered:
            ordered.append(by_low[low])
    for f in sorted(folders):
        if f not in ordered:
            ordered.append(f)

    res = []
    for folder in ordered:
        full = os.path.join(mods_dir, folder)
        title, author, desc, ver = folder, "Неизвестно", "", ""
        ini_p = os.path.join(full, "mod.ini")
        if os.path.exists(ini_p):
            try:
                with open(ini_p, "r", encoding="utf-8-sig", errors="ignore") as mf:
                    for line in mf:
                        s = line.strip()
                        if "=" in s and not s.startswith(";"):
                            k, v = s.split("=", 1)
                            kl = k.strip().lower()
                            if kl == "name": title = v.strip()
                            elif kl == "author": author = v.strip()
                            elif kl == "description": desc = v.strip()
                            elif kl == "version": ver = v.strip()
            except Exception:
                pass
        res.append({
            "id": folder, "title": title, "author": author,
            "desc": desc, "version": ver, "gameVersion": "",
            "thumb": find_mod_thumb(full, game_id, folder),
            "enabled": en_map.get(folder.strip().lower(), False)
        })
    return {"modsDir": mods_dir, "mods": res, "presets": presets, "supported": True}

def save_mods_state(game_id, ordered_mods, cfg):
    mods_dir = resolve_mods_dir(game_id, cfg)
    if not mods_dir or not os.path.exists(mods_dir):
        return False

    if game_id == "srb2":
        cfg["srb2Mods"] = [{"id": m["id"], "enabled": bool(m.get("enabled"))} for m in ordered_mods]
        save_config(cfg)
        return True

    if game_id == "sonic3":
        af = os.path.join(os.path.dirname(mods_dir), "active-mods.json")
        act = [m["id"] for m in ordered_mods if m.get("enabled")]
        data = {"ActiveMods": act, "UseLegacyLoading": False}
        if os.path.exists(af):
            try:
                with open(af, "r", encoding="utf-8-sig") as f:
                    old = json.load(f)
                    old["ActiveMods"] = act
                    data = old
            except Exception:
                pass
        with open(af, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        return True

    mc = find_modconfig_path(mods_dir)
    hdr = []
    if os.path.exists(mc):
        try:
            with open(mc, "r", encoding="utf-8-sig", errors="ignore") as f:
                in_sec = False
                for line in f:
                    s = line.strip()
                    if s.startswith("[") and s.endswith("]"):
                        in_sec = (s.lower() == "[mods]")
                        if not in_sec:
                            hdr.append(line if line.endswith("\n") else line + "\n")
                        continue
                    if not in_sec and ("=" not in s or s.startswith(";")):
                        hdr.append(line if line.endswith("\n") else line + "\n")
        except Exception:
            pass

    out = hdr + ["[Mods]\n"]
    for m in ordered_mods:
        out.append(f"{m['id']}={'true' if m.get('enabled') else 'false'}\n")
    with open(mc, "w", encoding="utf-8") as f:
        f.writelines(out)
    return True

def toggle_game_mod(game_id, mod_id, enabled, cfg):
    cur = get_game_mods(game_id, cfg).get("mods", [])
    found = False
    for m in cur:
        if m["id"].strip().lower() == mod_id.strip().lower():
            m["enabled"] = bool(enabled)
            found = True
    if not found and enabled:
        cur.insert(0, {"id": mod_id, "enabled": True})
    return save_mods_state(game_id, cur, cfg)
