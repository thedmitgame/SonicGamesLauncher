import os, re

GAME_EXES = {
    "sonic1": ("sonicforever.exe", "sonic1forever.exe"),
    "sonic2": ("sonic2absolute.exe", "sonicabsolute.exe"),
    "soniccd": ("restored.exe", "legacy.exe", "soniccdrestored.exe"),
    "sonic3": ("sonic3air.exe",),
    "origins": ("sonicorigins.exe",),
    "mania": ("sonicmania.exe",),
    "srb2": ("srb2win.exe", "srb2sdl2.exe")
}

def get_search_roots():
    roots = []
    try:
        import winreg
        k = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam")
        sp, _ = winreg.QueryValueEx(k, "SteamPath")
        roots.append(os.path.join(sp, "steamapps", "common"))
        vdf = os.path.join(sp, "steamapps", "libraryfolders.vdf")
        if os.path.exists(vdf):
            with open(vdf, "r", encoding="utf-8", errors="ignore") as f:
                for p in re.findall(r'"path"\s+"([^"]+)"', f.read()):
                    roots.append(os.path.join(p.replace("\\\\", "\\"), "steamapps", "common"))
    except Exception:
        pass

    home = os.path.expanduser("~")
    for sub in ("Desktop", "Downloads", "Games"):
        roots.append(os.path.join(home, sub))

    for drv in "CDEFG":
        for folder in ("Games", "Sonic", "Program Files (x86)", "Program Files"):
            roots.append(f"{drv}:\\{folder}")

    return [r for r in dict.fromkeys(roots) if os.path.isdir(r)]

def auto_scan_games(cfg):
    found = {}
    paths = cfg.setdefault("paths", {})
    missing = {gid for gid in GAME_EXES if not (paths.get(gid) and os.path.exists(paths[gid]))}
    if not missing:
        return found

    for root_dir in get_search_roots():
        base_depth = root_dir.rstrip(os.sep).count(os.sep)
        for cur, dirs, files in os.walk(root_dir):
            if cur.count(os.sep) - base_depth > 3:
                dirs[:] = []
                continue
            low_map = {fn.lower(): fn for fn in files if fn.lower().endswith(".exe")}
            for gid in list(missing):
                for target in GAME_EXES[gid]:
                    if target in low_map:
                        # Для soniccd.exe отличаем ремастер от Steam-версии 2011 при необходимости, но подхватываем рабочий exe
                        full_p = os.path.join(cur, low_map[target])
                        paths[gid] = full_p
                        found[gid] = full_p
                        missing.remove(gid)
                        break
            if not missing:
                return found
    return found
