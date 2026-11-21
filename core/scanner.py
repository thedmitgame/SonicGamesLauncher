import os, string

CORE_SIGNATURES = {
    "sonic1": ("Sonic 1 Forever.exe", "Sonic1Forever.exe"),
    "sonic2": ("Sonic 2 Absolute.exe", "Sonic2Absolute.exe"),
    "soniccd": ("Sonic CD.exe", "SonicCD.exe"),
    "sonic3": ("Sonic3AIR.exe",),
    "origins": ("SonicOrigins.exe",),
    "mania": ("SonicMania.exe",),
    "srb2": ("srb2win.exe",)
}

EXTRA_PC_GAMES = (
    ("ext_gens", "Sonic Generations", "2011 • BOOST CLASSIC", "#2563EB", ("SonicGenerations.exe",), 5360),
    ("ext_sxsg", "SONIC X SHADOW GENERATIONS", "2024 • REMASTER", "#DC2626", ("SONIC_X_SHADOW_GENERATIONS.exe", "SONIC_GENERATIONS.exe"), 20366),
    ("ext_sadx", "Sonic Adventure DX", "2004 • DREAMCAST ERA", "#0EA5E9", ("sonic.exe", "Sonic Adventure DX.exe"), 5892),
    ("ext_sa2", "Sonic Adventure 2", "2012 • HERO & DARK", "#1D4ED8", ("sonic2app.exe",), 5893),
    ("ext_frontiers", "Sonic Frontiers", "2022 • OPEN ZONE", "#3B82F6", ("SonicFrontiers.exe",), 15779),
    ("ext_superstars", "Sonic Superstars", "2023 • CLASSIC 2.5D", "#F59E0B", ("SonicSuperstars.exe",), 18595),
    ("ext_colors", "Sonic Colors: Ultimate", "2021 • REMASTER", "#EC4899", ("Sonic Colors - Ultimate.exe", "SonicColorsUltimate.exe"), 12770),
    ("ext_forces", "Sonic Forces", "2017 • MODERN", "#EF4444", ("Sonic Forces.exe",), 6072),
    ("ext_lostworld", "Sonic Lost World", "2015 • PARKOUR", "#10B981", ("slw.exe",), 6060),
    ("ext_stt16", "Sonic Triple Trouble 16-Bit", "FAN REMAKE • 16-BIT", "#FACC15", ("Sonic Triple Trouble 16-Bit.exe", "STT16bit.exe"), 0),
    ("ext_ringracers", "Dr. Robotnik's Ring Racers", "KART RACER • FAN GAME", "#A855F7", ("ringracers.exe",), 0),
    ("ext_timetwisted", "Sonic Time Twisted", "FAN GAME • CLASSIC", "#06B6D4", ("SonicTimeTwisted.exe", "Sonic Time Twisted.exe"), 0)
)


def _collect_search_roots():
    roots = []
    try:
        import winreg
        k = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam")
        sp, _ = winreg.QueryValueEx(k, "SteamPath")
        sp = sp.replace("/", os.sep)
        vdf = os.path.join(sp, "steamapps", "libraryfolders.vdf")
        roots.append(os.path.join(sp, "steamapps", "common"))
        if os.path.isfile(vdf):
            with open(vdf, "r", encoding="utf-8", errors="ignore") as vf:
                for line in vf:
                    if '"path"' in line:
                        parts = line.split('"')
                        if len(parts) >= 4:
                            lib_p = parts.pop(3).replace("\\\\", os.sep)
                            roots.append(os.path.join(lib_p, "steamapps", "common"))
    except Exception:
        pass

    common_names = ("Games", "Sonic", "FanGames", "SteamLibrary\steamapps\common", "Program Files (x86)\Steam\steamapps\common")
    for drv in string.ascii_uppercase:
        d_root = f"{drv}:\\"
        if os.path.exists(d_root):
            for sub in common_names:
                cand = os.path.join(d_root, sub)
                if os.path.isdir(cand):
                    roots.append(cand)

    user_p = os.environ.get("USERPROFILE", "")
    for sub in ("Desktop", "Downloads", "Games"):
        cand = os.path.join(user_p, sub)
        if os.path.isdir(cand):
            roots.append(cand)

    seen, unique_roots = set(), []
    for r in roots:
        nr = os.path.normcase(os.path.abspath(r))
        if nr not in seen and os.path.isdir(r):
            seen.add(nr)
            unique_roots.append(r)
    return unique_roots


def auto_scan_games(cfg):
    paths = cfg.setdefault("paths", {})
    order = cfg.setdefault("gamesOrder", [])
    existing_ids = {g.get("id") for g in order}
    existing_exes = {os.path.normcase(os.path.abspath(p)) for p in paths.values() if p and os.path.exists(p)}

    found_ids = []
    roots = _collect_search_roots()

    for root in roots:
        base_depth = root.rstrip(os.sep).count(os.sep)
        for cur_dir, dirs, files in os.walk(root):
            if cur_dir.count(os.sep) - base_depth > 2:
                dirs[:] = []
                continue
            dirs[:] = [d for d in dirs if not d.startswith(".") and d.lower() not in ("windows", "appdata", "$recycle.bin", "mods")]
            f_map = {fn.lower(): fn for fn in files}
            dir_low = os.path.basename(cur_dir).lower()

            # 1. Проверяем 7 базовых игр
            for gid, exe_list in CORE_SIGNATURES.items():
                if paths.get(gid) and os.path.exists(paths.get(gid)):
                    continue
                for ex in exe_list:
                    if ex.lower() in f_map:
                        if ex.lower() == "rsdkv4.exe" and "2" in dir_low and gid == "sonic1":
                            continue
                        full_p = os.path.join(cur_dir, f_map.get(ex.lower()))
                        paths[gid] = full_p
                        existing_exes.add(os.path.normcase(os.path.abspath(full_p)))
                        found_ids.append(gid)
                        break

            # 2. Проверяем дополнительные официальные и фанатские ПК-игры
            for ext_id, title, tag, color, exe_list, gb_id in EXTRA_PC_GAMES:
                if ext_id in existing_ids and paths.get(ext_id) and os.path.exists(paths.get(ext_id)):
                    continue
                for ex in exe_list:
                    if ex.lower() in f_map:
                        if ex.lower() == "sonic.exe" and "adventure" not in dir_low and "sadx" not in dir_low:
                            continue
                        full_p = os.path.join(cur_dir, f_map.get(ex.lower()))
                        norm_p = os.path.normcase(os.path.abspath(full_p))
                        if norm_p in existing_exes:
                            continue
                        if ext_id not in existing_ids:
                            order.append({
                                "id": ext_id,
                                "name": title,
                                "color": color,
                                "tag": tag,
                                "custom": True
                            })
                            existing_ids.add(ext_id)
                        paths[ext_id] = full_p
                        if gb_id > 0:
                            cfg.setdefault("gbIds", {})[ext_id] = gb_id
                        existing_exes.add(norm_p)
                        found_ids.append(ext_id)
                        break

    return found_ids
