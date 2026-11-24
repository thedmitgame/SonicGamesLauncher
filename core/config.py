import os, sys, json, re, time

if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
    RESOURCE_DIR = getattr(sys, '_MEIPASS', BASE_DIR)
else:
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    RESOURCE_DIR = BASE_DIR

CONFIG_FILE = os.path.join(BASE_DIR, 'sonic_launcher_config.json')
IMAGES_DIR = os.path.join(BASE_DIR, 'images')
MODELS_DIR = os.path.join(BASE_DIR, 'models')
VIDEOS_DIR = os.path.join(BASE_DIR, 'videos')
SOUNDS_DIR = os.path.join(BASE_DIR, 'sounds')
FONTS_DIR = os.path.join(BASE_DIR, 'fonts')
SCREENSHOTS_DIR = os.path.join(BASE_DIR, 'screenshots')
THEMES_DIR = os.path.join(BASE_DIR, 'themes')

for _d in (IMAGES_DIR, MODELS_DIR, VIDEOS_DIR, SOUNDS_DIR, FONTS_DIR, SCREENSHOTS_DIR, THEMES_DIR):
    os.makedirs(_d, exist_ok=True)

DEFAULT_GAMES = [
    {"id": "sonic1", "name": "Sonic 1 Forever", "tag": "1991 • REMASTER", "color": "#0066FF"},
    {"id": "sonic2", "name": "Sonic 2 Absolute", "tag": "1992 • REMASTER", "color": "#FF9900"},
    {"id": "soniccd", "name": "Sonic CD Restored", "tag": "1993 • REMASTER", "color": "#E6007E"},
    {"id": "sonic3", "name": "Sonic 3 A.I.R.", "tag": "1994 • WIDESCREEN", "color": "#CC0000"},
    {"id": "mania", "name": "Sonic Mania", "tag": "2017 • PLUS", "color": "#FFD700"},
    {"id": "srb2", "name": "Sonic Robo Blast 2", "tag": "3D • OPEN SOURCE", "color": "#00CC66"},
    {"id": "sadx", "name": "Sonic Adventure DX", "tag": "2004 • DREAMCAST ERA", "color": "#0088FF"}
]
DEFAULT_GAMES_ORDER = DEFAULT_GAMES

DEFAULT_DESIGN = {
    "gradients": {
        "default": [
            "#090d16",
            "#0d2b6b"
        ],
        "sonic1": [
            "#041436",
            "#0066FF"
        ],
        "sonic2": [
            "#331900",
            "#FF8800"
        ],
        "soniccd": [
            "#2b051e",
            "#E6007E"
        ],
        "sonic3": [
            "#330000",
            "#CC0000"
        ],
        "origins": [
            "#0c1445",
            "#3b82f6"
        ],
        "mania": [
            "#332600",
            "#E6AC00"
        ],
        "srb2": [
            "#002b16",
            "#00B359"
        ],
        "sadx": [
            "#001f4d",
            "#0088FF"
        ]
    },
    "cardWidth": 200,
    "cardRadius": 14,
    "cardAspect": "poster",
    "logoHeight": 75,
    "fontScale": 100,
    "btnScale": 100,
    "carouselY": 0,
    "carouselRadiusX": 100,
    "carouselRadiusY": 34,
    "backdropOpacity": 55,
    "backdropBlur": 4,
    "panelAlpha": 45,
    "textColor": "#ffffff",
    "titleColor": "#FFD700",
    "cardStyle": "glass",
    "carouselMode": "coverflow",
    "screenLayout": "classic",
    "headerPos": "center",
    "mainTitleStr": "SONIC LAUNCHER",
    "shaderType": "none",
    "screenFx": "none",
    "screenFxOpacity": 50,
    "launchAnim": "titlecard",
    "sfxVolume": 70,
    "bgmVolume": 40,
    "objCount": 14,
    "objSpeed": 5,
    "objOpacity": 35,
    "enableParallax": True,
    "superSaveFx": True,
    "enableEq": True,
    "liteMode": False,
    "lightUi": False,
    "showJukebox": True,
    "autoBackupSaves": False,
    "autoBackupLimit": 5,
    "minimizeOnLaunch": True,
    "minimizeToTray": False,
    "screenshotKey": "f6",
    "discordRpc": True,
    "discordClientId": "",
    "customFontUrl": "",
    "customFontName": "",
    "appIconUrl": "",
    "appIconName": "",
    "charAnim": "slide_up",
    "customLayout": {},
    "buttons": {},
    "hudWidgets": {
        "clock": False,
        "emeralds": False,
        "playtime": False,
        "notes": False
    },
    "perGameStyle": {},
    "cardDecor": {},
    "box3d": {},
    "uiModelSlots": {},
    "uiThemeBuilder": {},
    "trophyMuseum": [],
    "characters": {}
}

def sanitize_filename(s):
    return re.sub(r'[^a-zA-Z0-9_-]', '', str(s))[:40] or "custom"

def cleanup_old_files(folder, prefix):
    if not os.path.isdir(folder):
        return
    for fn in os.listdir(folder):
        if fn.lower().startswith(prefix.lower()):
            try:
                os.remove(os.path.join(folder, fn))
            except Exception:
                pass

def find_asset(folder, url_prefix, stem_name, exts):
    if not os.path.isdir(folder):
        return None
    low_stem = stem_name.lower()
    for ext in exts:
        cand = os.path.join(folder, low_stem + ext)
        if os.path.isfile(cand):
            mtime = int(os.path.getmtime(cand))
            return f"{url_prefix}/{os.path.basename(cand)}?t={mtime}"
    for fn in os.listdir(folder):
        st, ex = os.path.splitext(fn)
        if st.lower() == low_stem and ex.lower() in exts:
            fp = os.path.join(folder, fn)
            return f"{url_prefix}/{fn}?t={int(os.path.getmtime(fp))}"
    return None

def scan_all_sounds():
    res = {}
    if not os.path.isdir(SOUNDS_DIR):
        return res
    for fn in os.listdir(SOUNDS_DIR):
        fp = os.path.join(SOUNDS_DIR, fn)
        if os.path.isfile(fp):
            st, ex = os.path.splitext(fn)
            if ex.lower() in ('.mp3', '.wav', '.ogg'):
                res[st] = f"/sounds/{fn}?t={int(os.path.getmtime(fp))}"
    return res

def find_floating_objects():
    out = []
    if not os.path.isdir(IMAGES_DIR):
        return out
    for fn in sorted(os.listdir(IMAGES_DIR)):
        st, ex = os.path.splitext(fn)
        if st.lower().startswith("object") and ex.lower() in ('.png', '.gif', '.webp', '.jpg', '.jpeg'):
            fp = os.path.join(IMAGES_DIR, fn)
            out.append(f"/images/{fn}?t={int(os.path.getmtime(fp))}")
    return out

def load_config():
    cfg = {
        "paths": {},
        "gamesOrder": [dict(g) for g in DEFAULT_GAMES],
        "design": json.loads(json.dumps(DEFAULT_DESIGN)),
        "playtime": {},
        "launchArgs": {},
        "modPaths": {},
        "modPresets": {},
        "gbIds": {},
        "gameNotes": {},
        "emulators": [],
        "collections": [],
        "gameVariants": {},
        "gameInstallers": {},
        "srb2Mods": [],
        "smmPath": "",
        "intro_enabled": False,
        "intro_media_path": "",
        "daytime_fx": True,
        "daytime_override": "auto",
        "lang": "ru"
    }
    if os.path.isfile(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, dict):
                for k, v in data.items():
                    if k == "design" and isinstance(v, dict):
                        merged_dsg = json.loads(json.dumps(DEFAULT_DESIGN))
                        merged_dsg.update(v)
                        merged_dsg["gradients"] = {**DEFAULT_DESIGN["gradients"], **v.get("gradients", {})}
                        cfg["design"] = merged_dsg
                    elif k == "gamesOrder" and isinstance(v, list) and len(v) > 0:
                        cfg["gamesOrder"] = v
                    else:
                        cfg[k] = v
        except Exception as e:
            print("Config load error:", e)
    return cfg

def save_config(cfg):
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print("Config save error:", e)
