import os, json, string, configparser

MM_STORE_FILE = os.path.join(os.getcwd(), "mod_managers.json")

MANAGER_TYPES = {
    "hmm": {"title": "HedgeModManager", "exes": ("HedgeModManager.exe",)},
    "samm": {"title": "SAModManager", "exes": ("SAModManager.exe",)},
    "mml": {"title": "Mania Mod Loader", "exes": ("SonicManiaModManager.exe", "ManiaModLoader.exe", "ManiaModManager.exe")}
}


def load_mm_paths(cfg=None):
    data = {"hmm": "", "samm": "", "mml": ""}
    if os.path.isfile(MM_STORE_FILE):
        try:
            with open(MM_STORE_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                if isinstance(saved, dict):
                    for k in ("hmm", "samm", "mml"):
                        p = saved.get(k, "")
                        if p and os.path.isfile(p):
                            data[k] = p.replace("\\", "/")
        except Exception:
            pass
    if cfg and not data["hmm"]:
        legacy = cfg.get("smmPath", "")
        if legacy and os.path.isfile(legacy):
            data["hmm"] = legacy.replace("\\", "/")
    return data


def save_mm_paths(data):
    clean = {}
    for k in ("hmm", "samm", "mml"):
        p = str(data.get(k, "") or "").strip()
        clean[k] = p.replace("\\", "/") if (p and os.path.isfile(p)) else ""
    with open(MM_STORE_FILE, "w", encoding="utf-8") as f:
        json.dump(clean, f, ensure_ascii=False, indent=2)
    return clean


def launch_manager_exe(exe_path):
    if not exe_path or not os.path.isfile(exe_path):
        return False
    norm = os.path.abspath(exe_path)
    prev_cwd = os.getcwd()
    try:
        os.chdir(os.path.dirname(norm))
        os.startfile(norm)
        return True
    except Exception:
        return False
    finally:
        os.chdir(prev_cwd)


def find_manager_exe(m_type, cfg=None):
    cur = load_mm_paths(cfg).get(m_type, "")
    if cur and os.path.isfile(cur):
        return cur
    info = MANAGER_TYPES.get(m_type)
    if not info:
        return ""
    roots = [os.getcwd()]
    if cfg:
        for p in cfg.get("paths", {}).values():
            if p and os.path.exists(p):
                gd = os.path.dirname(p)
                cur_d = gd
                for _ in range(5):
                    roots.extend([cur_d, os.path.join(cur_d, "SAManager"), os.path.join(cur_d, "mods"), os.path.join(cur_d, "Mods")])
                    cur_d = os.path.dirname(cur_d)
    up = os.environ.get("USERPROFILE", "")
    la = os.environ.get("LOCALAPPDATA", "")
    for sub in ("Desktop", "Downloads", "Games", "HedgeModManager", "SAModManager"):
        roots.append(os.path.join(up, sub))
    if la:
        roots.append(os.path.join(la, "NeverFinishAnything", "HedgeModManager"))
        roots.append(os.path.join(la, "SAModManager"))
    for drv in string.ascii_uppercase:
        if os.path.exists(f"{drv}:\\"):
            roots.extend([f"{drv}:\\Games", f"{drv}:\\HedgeModManager", f"{drv}:\\SAModManager"])
    seen = set()
    for r in roots:
        nr = os.path.normcase(r)
        if nr in seen or not os.path.isdir(r):
            continue
        seen.add(nr)
        for ex in info["exes"]:
            cand = os.path.join(r, ex)
            if os.path.isfile(cand):
                return cand.replace("\\", "/")
    return ""


def _hmm_registry_mods_dirs():
    found = []
    try:
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\HEDGEMODMANAGER") as root_k:
            idx = 0
            while True:
                try:
                    sub_name = winreg.EnumKey(root_k, idx)
                    idx += 1
                    with winreg.OpenKey(root_k, sub_name) as sub_k:
                        mdir, _ = winreg.QueryValueEx(sub_k, "ModsDir")
                        if mdir and os.path.isdir(mdir):
                            found.append(mdir)
                except OSError:
                    break
    except Exception:
        pass
    # Также проверяем конфиг HMM 8 (NeverFinishAnything/HedgeModManager)
    la = os.environ.get("LOCALAPPDATA", "")
    hmm8_cfg = os.path.join(la, "NeverFinishAnything", "HedgeModManager", "Config.json")
    if os.path.isfile(hmm8_cfg):
        try:
            raw = open(hmm8_cfg, "r", encoding="utf-8-sig").read()
            for token in raw.split('"'):
                if ("Mods" in token or "mods" in token) and os.path.isdir(token):
                    found.append(token)
        except Exception:
            pass
    return found


def resolve_mods_folder(game_id, exe_path, saved_dir=""):
    if saved_dir and os.path.isfile(os.path.join(saved_dir, "ModsDB.ini")):
        return saved_dir
    if not exe_path or not os.path.exists(exe_path):
        return saved_dir or ""

    exe_abs = os.path.normcase(os.path.abspath(exe_path))
    gdir = os.path.dirname(os.path.abspath(exe_path))

    # 1. Ищем ModsDB.ini вверх по дереву папок (до 5 уровней вверх для SonicOrigins/build/main/projects/exec!)
    cur = gdir
    best_with_db = ""
    best_existing = ""
    for _ in range(6):
        for sub in ("Mods", "mods", ""):
            cand = os.path.join(cur, sub) if sub else cur
            if os.path.isfile(os.path.join(cand, "ModsDB.ini")):
                return cand
            if sub and os.path.isdir(cand) and not best_existing:
                best_existing = cand
        parent = os.path.dirname(cur)
        if parent == cur or len(parent) <= 3:
            break
        cur = parent

    # 2. Проверяем пути ModsDir прямо из реестра Windows HEDGEMODMANAGER!
    game_keywords = {
        "origins": "origins", "ext_gens": "generations", "ext_sxsg": "shadow",
        "ext_frontiers": "frontiers", "ext_forces": "forces", "ext_lostworld": "lost world"
    }
    kw = game_keywords.get(game_id, "")
    for reg_dir in _hmm_registry_mods_dirs():
        low_r = os.path.normcase(reg_dir)
        if (kw and kw in low_r) or os.path.commonpath([exe_abs, low_r]) != os.path.splitdrive(exe_abs)[0] + os.sep:
            if os.path.isfile(os.path.join(reg_dir, "ModsDB.ini")):
                return reg_dir

    return saved_dir or best_existing or os.path.join(gdir, "Mods")


def _clean(s):
    return str(s or '').strip().strip('"').strip("'").strip()

def _read_ini_desc(mdir):
    ini = os.path.join(mdir, 'mod.ini')
    title = os.path.basename(mdir)
    auth, ver, desc = 'Mod', '', ''
    if os.path.isfile(ini):
        txt = open(ini, 'r', encoding='utf-8-sig', errors='ignore').read()
        if chr(91) not in txt:
            txt = chr(91) + 'Desc' + chr(93) + '\n' + txt
        cp = configparser.ConfigParser(interpolation=None, strict=False)
        try:
            cp.read_string(txt)
            for sec in cp.sections():
                title = _clean(cp.get(sec, 'Title', fallback=cp.get(sec, 'Name', fallback=title))) or title
                auth = _clean(cp.get(sec, 'Author', fallback=auth)) or auth
                ver = _clean(cp.get(sec, 'Version', fallback=ver))
                desc = _clean(cp.get(sec, 'Description', fallback=desc)).replace('\\n', ' ')
        except Exception:
            pass
    return title, auth, ver, desc

def list_ini_mods(mods_dir):
    if not mods_dir or not os.path.isdir(mods_dir):
        return None
    db = os.path.join(mods_dir, 'ModsDB.ini')
    parent = os.path.dirname(mods_dir.rstrip('/\\'))
    mania_ini = os.path.join(parent, 'SonicMania.ini')
    all_dirs = {}
    for entry in os.listdir(mods_dir):
        mdir = os.path.join(mods_dir, entry)
        if os.path.isdir(mdir) and os.path.isfile(os.path.join(mdir, 'mod.ini')):
            all_dirs[entry.lower()] = entry
    if not os.path.isfile(db) and not os.path.isfile(mania_ini) and not all_dirs:
        return None
    active_folders = []
    if os.path.isfile(db):
        cp = configparser.ConfigParser(interpolation=None, strict=False)
        cp.optionxform = str
        try:
            cp.read(db, encoding='utf-8-sig')
            msec = {k: _clean(v) for k, v in cp.items('Mods')} if cp.has_section('Mods') else {}
            cnt = int(_clean(cp.get('Main', 'ActiveModCount', fallback='0')) or 0) if cp.has_section('Main') else 0
            for i in range(cnt):
                mid = _clean(cp.get('Main', f'ActiveMod{i}', fallback=''))
                rel = msec.get(mid, '').replace('/', '\\')
                fld = rel.split('\\').pop(0) if '\\' in rel else (os.path.basename(rel) or mid)
                if fld:
                    active_folders.append(fld.lower())
        except Exception:
            pass
    elif os.path.isfile(mania_ini):
        for ln in open(mania_ini, 'r', encoding='utf-8-sig', errors='ignore'):
            s = ln.strip()
            if '=' in s and s.lower().startswith('mod'):
                k_part, v_part = s.split('=', 1)
                if k_part.strip().lstrip('MmOoDd').isdigit() and _clean(v_part):
                    active_folders.append(_clean(v_part).lower())
    out, seen = [], set()
    for low_f in active_folders:
        if low_f in all_dirs and low_f not in seen:
            real_f = all_dirs[low_f]
            seen.add(low_f)
            t, a, v, d = _read_ini_desc(os.path.join(mods_dir, real_f))
            out.append({'id': real_f, 'name': t, 'author': a, 'version': v, 'description': d, 'enabled': True, 'folder': real_f})
    for low_f in sorted(all_dirs.keys()):
        if low_f not in seen:
            real_f = all_dirs[low_f]
            t, a, v, d = _read_ini_desc(os.path.join(mods_dir, real_f))
            out.append({'id': real_f, 'name': t, 'author': a, 'version': v, 'description': d, 'enabled': False, 'folder': real_f})
    return out

def toggle_ini_mod(mods_dir, mod_id, enabled):
    if not mods_dir or not os.path.isdir(mods_dir):
        return False
    db = os.path.join(mods_dir, 'ModsDB.ini')
    if not os.path.isfile(db):
        return False
    cp = configparser.ConfigParser(interpolation=None, strict=False)
    cp.optionxform = str
    cp.read(db, encoding='utf-8-sig')
    if not cp.has_section('Main'):
        cp.add_section('Main')
    if not cp.has_section('Mods'):
        cp.add_section('Mods')
    target_key = None
    for k, v in cp.items('Mods'):
        rel = _clean(v).replace('/', '\\')
        fld = rel.split('\\').pop(0) if '\\' in rel else rel
        if fld.lower() == mod_id.lower() or k.lower() == mod_id.lower():
            target_key = k
            break
    if not target_key:
        target_key = mod_id
        cp.set('Mods', target_key, f'{mod_id}\\mod.ini')
    cnt = int(_clean(cp.get('Main', 'ActiveModCount', fallback='0')) or 0)
    active = []
    for i in range(cnt):
        m = _clean(cp.get('Main', f'ActiveMod{i}', fallback=''))
        if m and m not in active:
            active.append(m)
        if cp.has_option('Main', f'ActiveMod{i}'):
            cp.remove_option('Main', f'ActiveMod{i}')
    if enabled:
        if target_key not in active:
            active.append(target_key)
    else:
        active = [x for x in active if x.lower() != target_key.lower() and x.lower() != mod_id.lower()]
    cp.set('Main', 'ActiveModCount', str(len(active)))
    for idx, k in enumerate(active):
        cp.set('Main', f'ActiveMod{idx}', k)
    out_lines = []
    for sec in cp.sections():
        out_lines.append(chr(91) + sec + chr(93))
        for k, v in cp.items(sec):
            out_lines.append(f'{k}={v}')
        out_lines.append('')
    with open(db, 'w', encoding='utf-8', newline='\r\n') as out_f:
        out_f.write('\n'.join(out_lines))
    return True
