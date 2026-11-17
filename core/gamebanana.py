import os, re, json, subprocess, urllib.request, urllib.parse

GB_GAME_IDS = {
    "sonic1": 10601, "sonic2": 15019, "soniccd": 6108,
    "sonic3": 6878, "origins": 15780, "mania": 6045, "srb2": 6786
}

def gb_get_json(endpoint_or_url, params=None):
    sep = chr(47)
    base_api = sep.join(("https:", "", "gamebanana.com", "apiv11"))
    url = endpoint_or_url if endpoint_or_url.startswith("http") else (base_api + sep + endpoint_or_url.lstrip(sep))
    if params:
        url = url + "?" + urllib.parse.urlencode(params)

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "SonicGamesLauncher/1.1"})
        with urllib.request.urlopen(req, timeout=12) as resp:
            raw = resp.read().decode("utf-8", errors="ignore").strip()
            if raw.startswith(("{", "[")):
                return json.loads(raw)
    except Exception:
        pass

    r = subprocess.run(
        ["curl.exe", "-g", "-L", "-s", "--max-time", "15", "-A", "SonicGamesLauncher/1.1", url],
        capture_output=True, text=True, encoding="utf-8", errors="ignore",
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0)
    )
    txt = r.stdout.strip()
    if r.returncode == 0 and txt.startswith(("{", "[")):
        return json.loads(txt)
    raise RuntimeError(f"Ошибка ответа GameBanana (code {r.returncode})")

def detect_local_game_version(game_id, cfg):
    if game_id == "sonic3":
        p = os.path.join(os.environ.get("APPDATA", ""), "Sonic3AIR", "settings.json")
        if os.path.isfile(p):
            try:
                with open(p, "r", encoding="utf-8-sig") as f:
                    return str(json.load(f).get("Version", "")).strip()
            except Exception:
                pass
    exe = cfg.get("paths", {}).get(game_id, "")
    if exe and os.path.isfile(exe):
        gdir = os.path.dirname(exe)
        for fn in ("version.txt", "README.txt", "readme.md", "changelog.txt"):
            fp = os.path.join(gdir, fn)
            if os.path.isfile(fp):
                try:
                    with open(fp, "r", encoding="utf-8", errors="ignore") as f:
                        m = re.search(r"v?(\d+\.\d+(?:\.\d+)*)", f.read(1500))
                        if m:
                            return m.group(1)
                except Exception:
                    pass
    return ""

def fetch_gb_mods(game_id, cfg, query="", page=1):
    gb_id = cfg.get("gbIds", {}).get(game_id) or GB_GAME_IDS.get(game_id)
    if not gb_id:
        return {"ok": False, "error": "Для этой игры не указан ID GameBanana", "items": []}
    q = query.strip()
    sep = chr(47)
    fk = "_aFilters" + chr(91) + "Generic_Game" + chr(93)
    try:
        if q:
            try:
                data = gb_get_json("Util/Search/Results", {"_sModelName": "Mod", "_idGameRow": gb_id, "_sSearchString": q, "_nPage": page, "_nPerpage": 15})
            except Exception:
                data = gb_get_json("Mod/Index", {"_nPage": page, "_nPerPage": 15, "_sName": "*" + q + "*", fk: gb_id})
        else:
            try:
                data = gb_get_json("Mod/Index", {"_nPage": page, "_nPerPage": 15, "_sSort": "Generic_Newest", fk: gb_id})
            except Exception:
                data = gb_get_json("Game" + sep + str(gb_id) + sep + "Subfeed", {"_nPage": page, "_nPerpage": 15, "_csvModelInclusions": "Mod"})

        items = []
        for r in (data.get("_aRecords") or []):
            mid = r.get("_idRow")
            if not mid:
                continue
            thumb = ""
            imgs = (r.get("_aPreviewMedia") or {}).get("_aImages") or []
            if imgs:
                im = next(iter(imgs))
                fn = im.get("_sFile220") or im.get("_sFile530") or im.get("_sFile") or ""
                base = im.get("_sBaseUrl") or ""
                if base and fn:
                    thumb = base + sep + fn
            items.append({
                "id": mid,
                "name": r.get("_sName", "Mod #" + str(mid)),
                "author": (r.get("_aSubmitter") or {}).get("_sName", "Unknown"),
                "likes": r.get("_nLikeCount", 0),
                "version": str(r.get("_sVersion") or "").strip(),
                "category": (r.get("_aRootCategory") or {}).get("_sName", ""),
                "thumb": thumb,
                "url": r.get("_sProfileUrl") or sep.join(("https:", "", "gamebanana.com", "mods", str(mid)))
            })
        return {
            "ok": True, "gbGameId": gb_id,
            "hubUrl": sep.join(("https:", "", "gamebanana.com", "games", str(gb_id))),
            "localVer": detect_local_game_version(game_id, cfg),
            "items": items
        }
    except Exception as e:
        return {"ok": False, "error": "Ошибка связи: " + str(e), "items": []}

def fetch_gb_mod_details(mod_id):
    sep = chr(47)
    try:
        prof = gb_get_json("Mod" + sep + str(mod_id) + sep + "ProfilePage")
        imgs = []
        for im in ((prof.get("_aPreviewMedia") or {}).get("_aImages") or []):
            base = im.get("_sBaseUrl") or ""
            fn = im.get("_sFile530") or im.get("_sFile") or im.get("_sFile220") or ""
            if base and fn:
                imgs.append(base + sep + fn)
        raw_html = str(prof.get("_sText") or prof.get("_sDescription") or "")
        clean_txt = re.sub(r"<br\s*/?>", "\n", raw_html, flags=re.I)
        clean_txt = re.sub(r"</p>", "\n\n", clean_txt, flags=re.I)
        clean_txt = re.sub(r"<[^>]+>", "", clean_txt).strip()
        files_out = []
        for fobj in (prof.get("_aFiles") or []):
            fid = fobj.get("_idRow")
            dl_u = str(fobj.get("_sDownloadUrl") or sep.join(("https:", "", "gamebanana.com", "dl", str(fid))))
            files_out.append({
                "id": fid,
                "name": str(fobj.get("_sFile") or f"mod_{fid}.zip"),
                "url": dl_u,
                "sizeMb": round((fobj.get("_nFilesize") or 0) / 1048576, 2),
                "desc": str(fobj.get("_sDescription") or "")
            })
        return {
            "ok": True,
            "name": prof.get("_sName", ""),
            "author": (prof.get("_aSubmitter") or {}).get("_sName", "Unknown"),
            "version": str(prof.get("_sVersion") or ""),
            "text": clean_txt or "Описание отсутствует.",
            "images": imgs,
            "files": files_out,
            "profileUrl": prof.get("_sProfileUrl") or sep.join(("https:", "", "gamebanana.com", "mods", str(mod_id)))
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}
