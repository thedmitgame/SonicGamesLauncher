import os, json, uuid, configparser
from core.config import save_config
from core.mod_managers import resolve_mods_folder

SRB2_EXTS = (".pk3", ".wad", ".lua", ".soc")
RSDK_DECOMP_IDS = ("sonic1", "sonic2", "soniccd")


def _clean_q(val):
    return str(val or "").strip().strip('"').strip("'").strip()


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
    if game_id not in RSDK_DECOMP_IDS and exe and os.path.exists(exe):
        found_hmm = resolve_mods_folder(game_id, exe, "")
        if found_hmm and os.path.isdir(found_hmm):
            return found_hmm
    if exe and os.path.exists(exe):
        for sub in ("mods", "Mods"):
            gm = os.path.join(os.path.dirname(exe), sub)
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


def _parse_mod_ini_fields(mod_full_dir, fallback_name):
    title, author, desc, ver = fallback_name, "Неизвестно", "", ""
    ini_p = os.path.join(mod_full_dir, "mod.ini")
    if os.path.isfile(ini_p):
        try:
            with open(ini_p, "r", encoding="utf-8-sig", errors="ignore") as mf:
                for line in mf:
                    s = line.strip()
                    if "=" in s and not s.startswith(";") and not s.startswith("#"):
                        k, v = s.split("=", 1)
                        kl = k.strip().lower()
                        vc = _clean_q(v)
                        if kl in ("name", "title") and vc:
                            title = vc
                        elif kl == "author" and vc:
                            author = vc
                        elif kl == "description" and vc:
                            desc = vc.replace("\\n", " ")
                        elif kl == "version" and vc:
                            ver = vc
        except Exception:
            pass
    return title, author, desc, ver


def _extract_mod_folder(raw_val, fallback=""):
    s = _clean_q(raw_val).replace("/", "\\")
    if not s:
        return fallback
    if s.lower().endswith(".ini"):
        return os.path.basename(os.path.dirname(s))
    return os.path.basename(s.rstrip("\\")) or fallback


def _find_real_hmm_modsdb(mods_dir):
    # Ищем настоящий ModsDB.ini (с секцией [Main] и ActiveModCount): рядом с exe, в родительских папках, реестре и AppData HMM
    p_norm = os.path.normcase(os.path.abspath(mods_dir))
    cands = [
        os.path.join(mods_dir, "ModsDB.ini"),
        os.path.join(os.path.dirname(mods_dir.rstrip("/\\")), "ModsDB.ini"),
    ]
    cur = os.path.dirname(mods_dir.rstrip("/\\"))
    for _ in range(5):
        cands.append(os.path.join(cur, "ModsDB.ini"))
        cands.append(os.path.join(cur, "Mods", "ModsDB.ini"))
        cur = os.path.dirname(cur)

    for env_k in ("LOCALAPPDATA", "APPDATA"):
        base_a = os.environ.get(env_k, "")
        for folder_n in ("NeverFinishAnything", "HedgeModManager", "HEDGEMODMANAGER"):
            r_dir = os.path.join(base_a, folder_n)
            if os.path.isdir(r_dir):
                for root, _, files in os.walk(r_dir):
                    for fn in files:
                        if fn.lower() == "modsdb.ini":
                            cands.append(os.path.join(root, fn))

    sub_names = [d.lower() for d in os.listdir(mods_dir) if os.path.isdir(os.path.join(mods_dir, d))]
    best_p, best_mt = "", -1
    seen = set()
    for c in cands:
        nc = os.path.normcase(os.path.abspath(c))
        if nc in seen or not os.path.isfile(c):
            continue
        seen.add(nc)
        try:
            raw = open(c, "r", encoding="utf-8-sig", errors="ignore").read()
            raw_low = raw.lower().replace("/", "\\")
            if "[main]" in raw_low and (p_norm in raw_low or any(sn in raw_low for sn in sub_names)):
                mt = os.path.getmtime(c)
                if mt > best_mt:
                    best_mt, best_p = mt, c
        except Exception:
            pass
    return best_p


def _uses_hmm_db(game_id, mods_dir):
    if game_id in RSDK_DECOMP_IDS or game_id in ("sonic3", "srb2", "mania"):
        return False
    if game_id in ("origins", "ext_gens", "ext_sxsg", "ext_frontiers", "ext_forces", "ext_lostworld", "ext_colors"):
        return True
    return bool(_find_real_hmm_modsdb(mods_dir))


def _find_mania_loader_ini(mods_dir):
    parent = os.path.dirname(mods_dir.rstrip("/\\"))
    for cand in (
        os.path.join(mods_dir, "ManiaModLoader.ini"),
        os.path.join(parent, "ManiaModLoader.ini"),
        os.path.join(mods_dir, "ManiaLoader.ini"),
        os.path.join(parent, "ManiaLoader.ini"),
        os.path.join(parent, "SonicMania.ini"),
        os.path.join(mods_dir, "SonicMania.ini"),
    ):
        if os.path.isfile(cand):
            return cand
    return os.path.join(mods_dir, "ManiaModLoader.ini")


def _locate_real_hmm_db(mods_dir):
    # 1) Прямо в папке mods или рядом с exe (из cpkredir.ini)
    direct = os.path.join(mods_dir, 'ModsDB.ini')
    if os.path.isfile(direct):
        return direct
    parent_exe_dir = os.path.dirname(mods_dir.rstrip('/\\'))
    cpk_ini = os.path.join(parent_exe_dir, 'cpkredir.ini')
    if os.path.isfile(cpk_ini):
        for ln in open(cpk_ini, 'r', encoding='utf-8-sig', errors='ignore'):
            if 'modsdbini' in ln.lower() and '=' in ln:
                cand_p = _clean_q(ln.split('=', 1).pop())
                if not os.path.isabs(cand_p):
                    cand_p = os.path.join(parent_exe_dir, cand_p)
                if os.path.isfile(cand_p):
                    return cand_p
    # 2) В профилях HedgeModManager v7 / v8 в LocalAppData и Roaming AppData
    sub_folders = [d.lower() for d in os.listdir(mods_dir) if os.path.isdir(os.path.join(mods_dir, d))]
    best_db, best_mt = '', 0
    for env_name in ('LOCALAPPDATA', 'APPDATA'):
        base_a = os.environ.get(env_name, '')
        for vendor in ('NeverFinishAnything', 'HedgeModManager', 'HEDGEMODMANAGER'):
            r_dir = os.path.join(base_a, vendor)
            if not os.path.isdir(r_dir):
                continue
            for root, _, files in os.walk(r_dir):
                for fn in files:
                    if fn.lower() == 'modsdb.ini' or (fn.lower().endswith('.json') and 'profile' in root.lower()):
                        fp = os.path.join(root, fn)
                        raw_l = open(fp, 'r', encoding='utf-8-sig', errors='ignore').read().lower()
                        if any(sf in raw_l for sf in sub_folders) or os.path.normcase(mods_dir) in raw_l.replace('/', '\\'):
                            mt = os.path.getmtime(fp)
                            if mt >= best_mt:
                                best_mt, best_db = mt, fp
    return best_db or direct


def _read_modconfig_lines(mc_path):
    raw = open(mc_path, "rb").read()
    if raw.startswith((b"\xff\xfe", b"\xfe\xff")) or b"\x00" in raw[:40]:
        text = raw.decode("utf-16", errors="ignore")
    else:
        text = raw.decode("utf-8-sig", errors="ignore")
    return text.splitlines()



def _calc_dir_mb(folder):
    if not folder or not os.path.isdir(folder):
        return 0.0
    total = 0
    try:
        for r, _, fs in os.walk(folder):
            for fn in fs:
                fp = os.path.join(r, fn)
                if not os.path.islink(fp):
                    total += os.path.getsize(fp)
    except Exception:
        pass
    return round(total / (1024 * 1024), 1)


def get_game_mods(game_id, cfg):
    mods_dir = resolve_mods_dir(game_id, cfg)
    presets = cfg.get('modPresets', {}).get(game_id, {})
    if not mods_dir or not os.path.exists(mods_dir):
        return {'modsDir': mods_dir, 'mods': [], 'presets': presets, 'supported': True, 'sizeMb': _calc_dir_mb(mods_dir)}

    if game_id == 'srb2':
        all_files = []
        for r, _, fs in os.walk(mods_dir):
            for fn in fs:
                if fn.lower().endswith(SRB2_EXTS):
                    rel = os.path.relpath(os.path.join(r, fn), mods_dir).replace('\\', '/')
                    all_files.append(rel)
        saved = cfg.get('srb2Mods', [])
        saved_map = {m.get('id', '').lower(): bool(m.get('enabled')) for m in saved if 'id' in m}
        by_low = {f.lower(): f for f in all_files}
        ordered = []
        for m in saved:
            low = m.get('id', '').lower()
            if low in by_low and by_low[low] not in ordered:
                ordered.append(by_low[low])
        for f in sorted(all_files):
            if f not in ordered:
                ordered.append(f)
        res = []
        for rel in ordered:
            ext = os.path.splitext(rel)[1].upper().lstrip('.')
            res.append({
                'id': rel, 'title': os.path.basename(rel), 'name': os.path.basename(rel),
                'author': f'SRB2 {ext} Addon', 'desc': rel if '/' in rel else '',
                'version': '', 'gameVersion': '', 'thumb': '',
                'enabled': saved_map.get(rel.lower(), False)
            })
        return {'modsDir': mods_dir, 'mods': res, 'presets': presets, 'supported': True, 'sizeMb': _calc_dir_mb(mods_dir)}

    folders = [f for f in os.listdir(mods_dir) if os.path.isdir(os.path.join(mods_dir, f)) and not f.startswith('.')]
    by_low = {f.strip().lower(): f for f in folders}
    ordered = []

    if game_id == 'sonic3':
        af = os.path.join(os.path.dirname(mods_dir), 'active-mods.json')
        act_list = []
        if os.path.exists(af):
            try:
                with open(af, 'r', encoding='utf-8-sig') as f:
                    act_list = [str(x).strip().lower() for x in json.load(f).get('ActiveMods', [])]
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
            title, author, desc, ver, gver = folder, 'Неизвестно', '', '', ''
            meta = os.path.join(full, 'mod.json')
            if os.path.exists(meta):
                try:
                    with open(meta, 'r', encoding='utf-8-sig') as mf:
                        m = json.load(mf).get('Metadata', {})
                        title = m.get('Name', folder)
                        author = m.get('Author', 'Неизвестно')
                        desc = m.get('Description', '')
                        ver = m.get('ModVersion', '')
                        gver = m.get('GameVersion', '')
                except Exception:
                    pass
            res.append({
                'id': folder, 'title': title, 'name': title, 'author': author,
                'desc': desc, 'version': ver, 'gameVersion': gver,
                'thumb': find_mod_thumb(full, game_id, folder),
                'enabled': folder.strip().lower() in act_set
            })
        return {'modsDir': mods_dir, 'mods': res, 'presets': presets, 'supported': True, 'sizeMb': _calc_dir_mb(mods_dir)}

    if game_id == 'mania':
        ml_ini = _find_mania_loader_ini(mods_dir)
        act_low = []
        if os.path.isfile(ml_ini):
            with open(ml_ini, 'r', encoding='utf-8-sig', errors='ignore') as f:
                for ln in f:
                    s = ln.strip()
                    if '=' in s and not s.startswith(';') and s.lower().startswith('mod'):
                        k_p, _, v_p = s.partition('=')
                        num_s = k_p.strip()[3:] if False else k_p.strip().lstrip('MmOoDd')
                        if num_s.isdigit() and _clean_q(v_p):
                            act_low.append(_clean_q(v_p).lower())
        act_set = set(act_low)
        for low in act_low:
            if low in by_low and by_low[low] not in ordered:
                ordered.append(by_low[low])
        for f in sorted(folders):
            if f not in ordered:
                ordered.append(f)
        res = []
        for folder in ordered:
            full = os.path.join(mods_dir, folder)
            title, author, desc, ver = _parse_mod_ini_fields(full, folder)
            res.append({
                'id': folder, 'title': title, 'name': title, 'author': author,
                'desc': desc, 'version': ver, 'gameVersion': '',
                'thumb': find_mod_thumb(full, game_id, folder),
                'enabled': folder.strip().lower() in act_set
            })
        return {'modsDir': mods_dir, 'mods': res, 'presets': presets, 'supported': True, 'sizeMb': _calc_dir_mb(mods_dir)}

    if _uses_hmm_db(game_id, mods_dir):
        db = _find_real_hmm_modsdb(mods_dir) or os.path.join(mods_dir, "ModsDB.ini")
        active_low = []
        if os.path.isfile(db):
            cp = configparser.ConfigParser(interpolation=None, strict=False)
            cp.optionxform = str
            try:
                cp.read(db, encoding="utf-8-sig")
                msec = {k.strip(): _clean_q(v) for k, v in cp.items("Mods")} if cp.has_section("Mods") else {}
                cnt = int(_clean_q(cp.get("Main", "ActiveModCount", fallback="0")) or 0) if cp.has_section("Main") else 0
                for i in range(cnt):
                    mid = _clean_q(cp.get("Main", f"ActiveMod{i}", fallback=""))
                    rel = msec.get(mid, "")
                    fld = _extract_mod_folder(rel, mid)
                    if fld:
                        active_low.append(fld.lower())
            except Exception:
                pass
        act_set = set(active_low)
        for low in active_low:
            if low in by_low and by_low[low] not in ordered:
                ordered.append(by_low[low])
        for f in sorted(folders):
            if f not in ordered and os.path.isfile(os.path.join(mods_dir, f, "mod.ini")):
                ordered.append(f)
        res = []
        for folder in ordered:
            full = os.path.join(mods_dir, folder)
            title, author, desc, ver = _parse_mod_ini_fields(full, folder)
            res.append({
                "id": folder, "title": title, "name": title, "author": author,
                "desc": desc, "version": ver, "gameVersion": "",
                "thumb": find_mod_thumb(full, game_id, folder),
                "enabled": folder.strip().lower() in act_set
            })
        return {"modsDir": mods_dir, "mods": res, "presets": presets, "supported": True, "sizeMb": _calc_dir_mb(mods_dir)}

    mc = find_modconfig_path(mods_dir)
    en_map, ini_ord = {}, []
    if os.path.exists(mc):
        try:
            for line in _read_modconfig_lines(mc):
                s = line.replace("\x00", "").strip()
                if "=" in s and not s.startswith(";") and not s.startswith("#") and not s.startswith("["):
                    k, v = s.split("=", 1)
                    kl = _clean_q(k).lower()
                    vl = _clean_q(v).lower()
                    ini_ord.append(kl)
                    en_map[kl] = vl in ("true", "1", "yes")
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
        title, author, desc, ver = _parse_mod_ini_fields(full, folder)
        res.append({
            'id': folder, 'title': title, 'name': title, 'author': author,
            'desc': desc, 'version': ver, 'gameVersion': '',
            'thumb': find_mod_thumb(full, game_id, folder),
            'enabled': en_map.get(folder.strip().lower(), False)
        })
    return {'modsDir': mods_dir, 'mods': res, 'presets': presets, 'supported': True, 'sizeMb': _calc_dir_mb(mods_dir)}


def save_mods_state(game_id, ordered_mods, cfg):
    mods_dir = resolve_mods_dir(game_id, cfg)
    if not mods_dir or not os.path.exists(mods_dir):
        return False

    if game_id == 'srb2':
        cfg['srb2Mods'] = [{'id': m.get('id', ''), 'enabled': bool(m.get('enabled'))} for m in ordered_mods]
        save_config(cfg)
        return True

    if game_id == 'sonic3':
        af = os.path.join(os.path.dirname(mods_dir), 'active-mods.json')
        act = [m.get('id', '') for m in ordered_mods if m.get('enabled')]
        data = {'ActiveMods': act, 'UseLegacyLoading': False}
        if os.path.exists(af):
            try:
                with open(af, 'r', encoding='utf-8-sig') as f:
                    old = json.load(f)
                    old['ActiveMods'] = act
                    data = old
            except Exception:
                pass
        with open(af, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        return True

    if game_id == 'mania':
        ml_ini = _find_mania_loader_ini(mods_dir)
        kept = []
        if os.path.isfile(ml_ini):
            with open(ml_ini, 'r', encoding='utf-8-sig', errors='ignore') as f:
                for ln in f:
                    s = ln.strip()
                    if '=' in s and not s.startswith(';') and s.lower().startswith('mod'):
                        k_p, _, _ = s.partition('=')
                        if k_p.strip().lstrip('MmOoDd').isdigit():
                            continue
                    kept.append(ln if ln.endswith('\n') else ln + '\n')
        idx_m = 1
        for m in ordered_mods:
            if m.get('enabled') and m.get('id'):
                kept.append(f"Mod{idx_m}={m.get('id')}\n")
                idx_m += 1
        with open(ml_ini, 'w', encoding='utf-8') as f:
            f.writelines(kept)
        return True

    if _uses_hmm_db(game_id, mods_dir):
        db = _find_real_hmm_modsdb(mods_dir) or os.path.join(mods_dir, "ModsDB.ini")
        cp = configparser.ConfigParser(interpolation=None, strict=False)
        cp.optionxform = str
        if os.path.isfile(db):
            try:
                cp.read(db, encoding="utf-8-sig")
            except Exception:
                pass
        if not cp.has_section("Main"):
            cp.add_section("Main")
            cp.set("Main", "ManifestVersion", "1.1")
            cp.set("Main", "ReverseLoadOrder", "0")
        if not cp.has_section("Mods"):
            cp.add_section("Mods")

        folder_to_uuid = {}
        for k, v in cp.items("Mods"):
            fld = _extract_mod_folder(v, k)
            folder_to_uuid[fld.lower()] = k.strip()

        old_cnt = int(_clean_q(cp.get("Main", "ActiveModCount", fallback="0")) or 0)
        for i in range(max(old_cnt, 60)):
            if cp.has_option("Main", f"ActiveMod{i}"):
                cp.remove_option("Main", f"ActiveMod{i}")

        active_keys = []
        for m in ordered_mods:
            mid = m.get("id", "")
            if not mid:
                continue
            ukey = folder_to_uuid.get(mid.lower())
            if not ukey:
                ukey = str(uuid.uuid4()).lower()
                full_ini = os.path.abspath(os.path.join(mods_dir, mid, "mod.ini"))
                cp.set("Mods", ukey, f'"{full_ini}"')
                folder_to_uuid[mid.lower()] = ukey
            if m.get("enabled") and ukey not in active_keys:
                active_keys.append(ukey)

        # Аккуратно пересобираем [Main], сохраняя кавычки ActiveMod0="uuid" в точности как у HedgeModManager
        fav_cnt = cp.get("Main", "FavoriteModCount", fallback="0")
        rev_ord = cp.get("Main", "ReverseLoadOrder", fallback="0")
        man_ver = cp.get("Main", "ManifestVersion", fallback="1.1")
        extra_main = [(k, v) for k, v in cp.items("Main") if not k.startswith("ActiveMod") and k not in ("ManifestVersion", "ReverseLoadOrder", "FavoriteModCount")]
        cp.remove_section("Main")
        cp.add_section("Main")
        cp.set("Main", "ManifestVersion", man_ver)
        cp.set("Main", "ReverseLoadOrder", rev_ord)
        for idx, k in enumerate(active_keys):
            cp.set("Main", f"ActiveMod{idx}", f'"{k}"')
        cp.set("Main", "ActiveModCount", str(len(active_keys)))
        cp.set("Main", "FavoriteModCount", fav_cnt)
        for ek, ev in extra_main:
            cp.set("Main", ek, ev)

        out_lines = []
        for sec in cp.sections():
            out_lines.append(f"[{sec}]")
            for k, v in cp.items(sec):
                out_lines.append(f"{k}={v}")
            out_lines.append("")
        with open(db, "w", encoding="utf-8", newline="\r\n") as out_f:
            out_f.write("\n".join(out_lines))
        return True

    mc = find_modconfig_path(mods_dir)
    hdr = []
    if os.path.exists(mc):
        try:
            with open(mc, 'r', encoding='utf-8-sig', errors='ignore') as f:
                in_sec = False
                for line in f:
                    s = line.strip()
                    if s.startswith('[') and s.endswith(']'):
                        in_sec = (s.lower() == '[mods]')
                        if not in_sec:
                            hdr.append(line if line.endswith('\n') else line + '\n')
                        continue
                    if not in_sec and ('=' not in s or s.startswith(';')):
                        hdr.append(line if line.endswith('\n') else line + '\n')
        except Exception:
            pass

    out = hdr + ['[Mods]\n']
    for m in ordered_mods:
        out.append(f"{m.get('id', '')}={'true' if m.get('enabled') else 'false'}\n")
    with open(mc, 'w', encoding='utf-8') as f:
        f.writelines(out)
    return True


def toggle_game_mod(game_id, mod_id, enabled, cfg):
    cur = get_game_mods(game_id, cfg).get('mods', [])
    found = False
    for m in cur:
        if m.get('id', '').strip().lower() == mod_id.strip().lower():
            m['enabled'] = bool(enabled)
            found = True
    if not found and enabled:
        cur.insert(0, {'id': mod_id, 'enabled': True})
    return save_mods_state(game_id, cur, cfg)

_raw_get_game_mods = get_game_mods


def _calc_dir_bytes(folder):
    if not folder or not os.path.isdir(folder):
        return 0
    total = 0
    try:
        for r, _, fs in os.walk(folder):
            for fn in fs:
                fp = os.path.join(r, fn)
                if not os.path.islink(fp):
                    total += os.path.getsize(fp)
    except Exception:
        pass
    return total


def get_game_mods(game_id, cfg):
    res = _raw_get_game_mods(game_id, cfg)
    if isinstance(res, dict):
        mdir = res.get("modsDir") or resolve_mods_dir(game_id, cfg)
        b_size = _calc_dir_bytes(mdir)
        res["sizeBytes"] = b_size
        res["sizeMb"] = round(b_size / (1024 * 1024), 2)
    return res
