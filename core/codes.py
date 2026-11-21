import os, re, configparser
from core.mods import resolve_mods_dir, _find_real_hmm_modsdb, _find_mania_loader_ini, _clean_q

def _parse_lst_file(lst_path):
    items = []
    if not lst_path or not os.path.isfile(lst_path):
        return items
    pat = re.compile(r'^(?:Patch|Code)\s+"([^"]+)"(?:\s+in\s+"([^"]+)")?(?:\s+by\s+"([^"]+)")?')
    seen = set()
    for ln in open(lst_path, 'r', encoding='utf-8-sig', errors='ignore'):
        s = ln.strip()
        if not s or s.startswith(';'):
            continue
        m = pat.match(s)
        if m:
            name = m.group(1).strip()
            if name and name.lower() not in seen:
                seen.add(name.lower())
                cat = (m.group(2) or '').strip()
                auth = (m.group(3) or '').strip()
                items.append({'id': name, 'title': name, 'category': cat, 'author': auth})
    return items


def _parse_hmm_codes(hmm_path):
    items = []
    if not hmm_path or not os.path.isfile(hmm_path):
        return items
    txt = open(hmm_path, 'r', encoding='utf-8-sig', errors='ignore').read()
    pat = re.compile(r'(?:Patch|Code)\s+"([^"]+)"(?:\s+in\s+"([^"]+)")?(?:\s+by\s+"([^"]+)")?')
    seen = set()
    for m in pat.finditer(txt):
        name = m.group(1).strip()
        if not name or name.lower() in seen:
            continue
        seen.add(name.lower())
        cat = (m.group(2) or '').strip()
        auth = (m.group(3) or '').strip()
        full_id = f"{cat}/{name}" if cat else name
        items.append({'id': full_id, 'shortId': name, 'title': name, 'category': cat, 'author': auth})
    return items

def _rebuild_codes_dat_from_lst(lst_path, dat_path, active_set):
    # Собирает текстовый/скриптовый дамп выбранных кодов в Codes.dat, если игра использует текстовый загрузчик
    parsed = _parse_lst_file(lst_path)
    chosen = [c for c in parsed if c['id'].lower() in active_set]
    if not chosen:
        if os.path.isfile(dat_path):
            try:
                if open(dat_path, 'rb').read(6) != b'CODEv5':
                    open(dat_path, 'wb').write(b'')
            except Exception:
                pass
        return
    # Если Codes.dat бинарный (CODEv5 от MML/SADX), сам ModManager обновит байты, а если текстовый — пишем блоки
    if os.path.isfile(dat_path):
        try:
            hdr = open(dat_path, 'rb').read(6)
            if hdr.startswith(b'CODE'):
                return
        except Exception:
            pass

def get_game_codes(game_id, cfg):
    mods_dir = resolve_mods_dir(game_id, cfg)
    if not mods_dir or not os.path.isdir(mods_dir):
        return {'supported': False, 'codes': [], 'format': ''}

    hmm_file = os.path.join(mods_dir, 'Codes.hmm')
    lst_file = os.path.join(mods_dir, 'Codes.lst')

    # 1. Игры на HedgeModManager (Codes.hmm + ModsDB.ini)
    if os.path.isfile(hmm_file):
        catalog = _parse_hmm_codes(hmm_file)
        db = _find_real_hmm_modsdb(mods_dir) or os.path.join(mods_dir, 'ModsDB.ini')
        active_low = set()
        if os.path.isfile(db):
            cp = configparser.ConfigParser(interpolation=None, strict=False)
            cp.optionxform = str
            try:
                cp.read(db, encoding='utf-8-sig')
                if cp.has_section('Codes'):
                    cnt = int(_clean_q(cp.get('Codes', 'CodeCount', fallback='0')) or 0)
                    for i in range(cnt):
                        cname = _clean_q(cp.get('Codes', f'Code{i}', fallback=''))
                        if cname:
                            active_low.add(cname.lower())
            except Exception:
                pass
        out = []
        for c in catalog:
            out.append({**c, 'enabled': (c['id'].lower() in active_low or c.get('shortId', '').lower() in active_low)})
        return {'supported': True, 'codes': out, 'format': 'HMM'}

    # 2. Игры на Mania Mod Loader / SADX / SA2 (Codes.lst + ManiaModLoader.ini / SADXModLoader.ini)
    if os.path.isfile(lst_file):
        catalog = _parse_lst_file(lst_file)
        ini_p = _find_mania_loader_ini(mods_dir) if game_id == 'mania' else ''
        if not ini_p or not os.path.isfile(ini_p):
            parent = os.path.dirname(mods_dir.rstrip('/\\'))
            for fn in ('SADXModLoader.ini', 'SA2ModLoader.ini', 'ManiaModLoader.ini'):
                for base in (mods_dir, parent):
                    cand = os.path.join(base, fn)
                    if os.path.isfile(cand):
                        ini_p = cand
                        break
        active_low = set()
        if ini_p and os.path.isfile(ini_p):
            for ln in open(ini_p, 'r', encoding='utf-8-sig', errors='ignore'):
                s = ln.strip()
                if '=' in s and not s.startswith(';') and s.lower().startswith('code'):
                    k_p, _, v_p = s.partition('=')
                    if k_p.strip().lstrip('CcOoDdEe').isdigit() and _clean_q(v_p):
                        active_low.add(_clean_q(v_p).lower())
        out = []
        for c in catalog:
            out.append({
                'id': c['id'], 'title': c['title'],
                'category': c['category'], 'author': c['author'],
                'enabled': c['id'].lower() in active_low
            })
        return {'supported': True, 'codes': out, 'format': 'LST'}

    return {'supported': False, 'codes': [], 'format': ''}

def toggle_game_code(game_id, code_id, enabled, cfg):
    mods_dir = resolve_mods_dir(game_id, cfg)
    if not mods_dir or not os.path.isdir(mods_dir):
        return False
    hmm_file = os.path.join(mods_dir, 'Codes.hmm')
    lst_file = os.path.join(mods_dir, 'Codes.lst')

    if os.path.isfile(hmm_file):
        db = _find_real_hmm_modsdb(mods_dir) or os.path.join(mods_dir, 'ModsDB.ini')
        cp = configparser.ConfigParser(interpolation=None, strict=False)
        cp.optionxform = str
        if os.path.isfile(db):
            cp.read(db, encoding='utf-8-sig')
        if not cp.has_section('Codes'):
            cp.add_section('Codes')
        cnt = int(_clean_q(cp.get('Codes', 'CodeCount', fallback='0')) or 0)
        cur_codes = []
        for i in range(max(cnt, 80)):
            if cp.has_option('Codes', f'Code{i}'):
                v = _clean_q(cp.get('Codes', f'Code{i}'))
                if v and v not in cur_codes:
                    cur_codes.append(v)
                cp.remove_option('Codes', f'Code{i}')
        if enabled:
            if all(x.lower() != code_id.lower() for x in cur_codes):
                cur_codes.append(code_id)
        else:
            short_t = code_id.rsplit('/', 1)[-1].lower()
            cur_codes = [x for x in cur_codes if x.lower() != code_id.lower() and x.lower() != short_t]
        cp.remove_section('Codes')
        cp.add_section('Codes')
        cp.set('Codes', 'CodeCount', str(len(cur_codes)))
        for idx, cname in enumerate(cur_codes):
            cp.set('Codes', f'Code{idx}', f'"{cname}"')
        out_lines = []
        for sec in cp.sections():
            out_lines.append(f'[{sec}]')
            for k, v in cp.items(sec):
                out_lines.append(f'{k}={v}')
            out_lines.append('')
        with open(db, 'w', encoding='utf-8', newline='\r\n') as f:
            f.write('\n'.join(out_lines))
        return True

    if os.path.isfile(lst_file):
        ini_p = _find_mania_loader_ini(mods_dir) if game_id == 'mania' else os.path.join(mods_dir, 'SADXModLoader.ini')
        kept, cur_codes = [], []
        if os.path.isfile(ini_p):
            for ln in open(ini_p, 'r', encoding='utf-8-sig', errors='ignore'):
                s = ln.strip()
                if '=' in s and not s.startswith(';') and s.lower().startswith('code'):
                    k_p, _, v_p = s.partition('=')
                    if k_p.strip().lstrip('CcOoDdEe').isdigit():
                        if _clean_q(v_p):
                            cur_codes.append(_clean_q(v_p))
                        continue
                kept.append(ln if ln.endswith('\n') else ln + '\n')
        if enabled:
            if all(x.lower() != code_id.lower() for x in cur_codes):
                cur_codes.append(code_id)
        else:
            cur_codes = [x for x in cur_codes if x.lower() != code_id.lower()]
        for idx, cname in enumerate(cur_codes, 1):
            kept.append(f'Code{idx}={cname}\n')
        with open(ini_p, 'w', encoding='utf-8') as f:
            f.writelines(kept)
        return True
    return False
