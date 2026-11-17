import os, sys, re, json

if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
    RESOURCE_DIR = sys._MEIPASS
else:
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    RESOURCE_DIR = BASE_DIR

def sanitize_filename(name):
    return re.sub(r'[\\/*?:"<>|]', "_", str(name)).strip() or "sonic_theme_pack"

def cleanup_old_files(folder, prefix):
    for fn in os.listdir(folder):
        if fn.startswith(prefix):
            try:
                os.remove(os.path.join(folder, fn))
            except Exception:
                pass
CONFIG_FILE = os.path.join(BASE_DIR, "sonic_launcher_config.json")
IMAGES_DIR = os.path.join(BASE_DIR, "images")
SOUNDS_DIR = os.path.join(BASE_DIR, "sounds")
FONTS_DIR = os.path.join(BASE_DIR, "fonts")
SCREENSHOTS_DIR = os.path.join(BASE_DIR, "screenshots")
THEMES_DIR = os.path.join(BASE_DIR, "themes")

for folder in (IMAGES_DIR, SOUNDS_DIR, FONTS_DIR, SCREENSHOTS_DIR, THEMES_DIR):
    os.makedirs(folder, exist_ok=True)

DEFAULT_GAMES = [
    {"id": "sonic1", "name": "Sonic 1 Forever", "color": "#1E90FF", "tag": "1991 • REMASTER"},
    {"id": "sonic2", "name": "Sonic 2 Absolute", "color": "#FF8C00", "tag": "1992 • REMASTER"},
    {"id": "soniccd", "name": "Sonic CD Restored", "color": "#FF69B4", "tag": "1993 • REMASTER"},
    {"id": "sonic3", "name": "Sonic 3 A.I.R.", "color": "#DC143C", "tag": "1994 • WIDESCREEN"},
    {"id": "origins", "name": "Sonic Origins", "color": "#2E8B57", "tag": "COLLECTION"},
    {"id": "mania", "name": "Sonic Mania", "color": "#F59E0B", "tag": "2017 • PLUS"},
    {"id": "srb2", "name": "Sonic Robo Blast 2", "color": "#3B82F6", "tag": "3D FAN GAME"}
]

DEFAULT_DESIGN = {
    "cardWidth": 210,
    "cardRadius": 14,
    "cardStyle": "glass",
    "shaderType": "none",
    "logoHeight": 75,
    "fontFamily": "'Segoe UI', Roboto, Arial, sans-serif",
    "customFontUrl": "",
    "customFontName": "",
    "fontScale": 100,
    "textColor": "#ffffff",
    "titleColor": "#FFD700",
    "backdropOpacity": 55,
    "backdropBlur": 4,
    "objOpacity": 45,
    "objCount": 14,
    "objSpeed": 5,
    "sfxVolume": 70,
    "bgmVolume": 40,
    "minimizeOnLaunch": True,
    "minimizeToTray": False,
    "appIconUrl": "",
    "appIconName": "",
    "screenshotKey": "f6",
    "characters": {},
    "customLayout": {},
    "gradients": {
        "default": ["#090d16", "#0d2b6b"],
        "sonic1": ["#041e42", "#0077ff"],
        "sonic2": ["#2b1100", "#ff7700"],
        "soniccd": ["#1a1446", "#d63384"],
        "sonic3": ["#091d42", "#c8102e"],
        "origins": ["#072617", "#1e8e54"],
        "mania": ["#2e1503", "#f59e0b"],
        "srb2": ["#081c38", "#2563eb"]
    }
}


def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if "paths" not in data:
                    return {
                        "gamesOrder": DEFAULT_GAMES, "paths": data, "launchArgs": {},
                        "modPaths": {}, "modPresets": {}, "smmPath": "", "emulators": [], "srb2Mods": [], "gbIds": {}, "sgdbApiKey": "",
                        "playtime": {}, "design": DEFAULT_DESIGN
                    }
                saved_order = data.get("gamesOrder", DEFAULT_GAMES)
                known_ids = {g.get("id") for g in saved_order}
                for dg in DEFAULT_GAMES:
                    if dg["id"] not in known_ids:
                        saved_order.append(dg)
                design = {**DEFAULT_DESIGN, **data.get("design", {})}
                design["gradients"] = {**DEFAULT_DESIGN["gradients"], **design.get("gradients", {})}
                return {
                    "gamesOrder": saved_order,
                    "paths": data.get("paths", {}),
                    "launchArgs": data.get("launchArgs", {}),
                    "modPaths": data.get("modPaths", {}),
                    "modPresets": data.get("modPresets", {}),
                    "smmPath": data.get("smmPath", ""),
                    "emulators": data.get("emulators", []),
                    "srb2Mods": data.get("srb2Mods", []),
                    "gbIds": data.get("gbIds", {}),
                    "sgdbApiKey": data.get("sgdbApiKey", ""),
                    "playtime": data.get("playtime", {}),
                    "design": design,
                    "intro_enabled": data.get("intro_enabled", False),
                    "intro_media_path": data.get("intro_media_path", ""),
                    "daytime_fx": data.get("daytime_fx", True),
                    "daytime_override": data.get("daytime_override", "auto"),
                    "lang": data.get("lang", "ru")
                }
        except Exception:
            pass
    return {
        "gamesOrder": DEFAULT_GAMES, "paths": {}, "launchArgs": {},
        "modPaths": {}, "modPresets": {}, "smmPath": "", "emulators": [], "srb2Mods": [], "gbIds": {}, "sgdbApiKey": "",
        "playtime": {}, "design": DEFAULT_DESIGN
    }

def save_config(data):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def find_asset(folder, url_prefix, name, extensions):
    for ext in extensions:
        filename = f"{name}{ext}"
        if os.path.exists(os.path.join(folder, filename)):
            return f"{url_prefix}/{filename}"
    return None

def scan_all_sounds():
    names = [
        "startup", "switch", "launch", "open_menu", "close_menu", "exit", "screenshot",
        "default_bgm", "sonic1_bgm", "sonic2_bgm", "soniccd_bgm", "sonic3_bgm", "origins_bgm", "mania_bgm", "srb2_bgm"
    ]
    found = {}
    for n in names:
        url = find_asset(SOUNDS_DIR, "/sounds", n, ['.mp3', '.wav', '.ogg'])
        if url:
            found[n] = url
    return found

def find_floating_objects():
    objects = []
    if os.path.exists(IMAGES_DIR):
        for fname in sorted(os.listdir(IMAGES_DIR)):
            lower = fname.lower()
            if lower.startswith("object") and lower.endswith(('.png', '.jpg', '.jpeg', '.webp', '.gif')):
                objects.append(f"/images/{fname}")
    return objects

