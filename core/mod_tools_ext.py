import base64
import json
import os
import shutil
import struct
import time
import zipfile
import zlib

SAVE_EXTS = (".bin", ".sav", ".srm", ".dat")
SAVE_NAMES = ("sdata.bin", "savedata.bin", "save.bin", "sram.bin", "gamedata.bin")


def encode_share_code(game_id, mods_list):
    active = [m.get("name") or m.get("folder") or "" for m in mods_list if m.get("enabled")]
    payload = {"v": 1, "g": game_id, "m": [x for x in active if x]}
    raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    comp = zlib.compress(raw, 9)
    return "SGL-MODS:" + base64.urlsafe_b64encode(comp).decode("ascii")


def decode_share_code(code_str):
    s = (code_str or "").strip()
    if not s.startswith("SGL-MODS:"):
        raise ValueError("Invalid prefix (expected SGL-MODS:)")
    raw = zlib.decompress(base64.urlsafe_b64decode(s[9:].encode("ascii")))
    data = json.loads(raw.decode("utf-8"))
    return {"gameId": data.get("g", ""), "mods": data.get("m", [])}

def find_game_save_files(game_id, cfg):
    exe_p = (cfg.get("paths") or {}).get(game_id, "")
    if not exe_p or not os.path.exists(exe_p):
        return []
    gdir = os.path.dirname(os.path.abspath(exe_p))
    found = []
    for root, dirs, files in os.walk(gdir):
        if root.count(os.sep) - gdir.count(os.sep) > 2:
            continue
        dirs[:] = [d for d in dirs if d.lower() not in ("mods", "addons", "screenshots", "logs")]
        for fn in files:
            low = fn.lower()
            if low in SAVE_NAMES or (low.endswith(SAVE_EXTS) and "save" in low):
                found.append(os.path.join(root, fn))
    return found


def sandbox_before_launch(game_id, cfg, base_dir, safe_mode=False):
    sb_map = cfg.get("modSandbox") or {}
    if safe_mode or not sb_map.get(game_id):
        return None
    saves = find_game_save_files(game_id, cfg)
    if not saves:
        return None
    preset = (cfg.get("activeModPreset") or {}).get(game_id) or "default"
    sb_root = os.path.join(base_dir, "backups", "mod_sandboxes", game_id)
    van_dir = os.path.join(sb_root, "_vanilla_bak")
    pre_dir = os.path.join(sb_root, preset)
    os.makedirs(van_dir, exist_ok=True)
    os.makedirs(pre_dir, exist_ok=True)
    snap = {"gameId": game_id, "vanDir": van_dir, "preDir": pre_dir, "files": []}
    for fp in saves:
        fn = os.path.basename(fp)
        shutil.copy2(fp, os.path.join(van_dir, fn))
        pre_f = os.path.join(pre_dir, fn)
        if os.path.isfile(pre_f):
            shutil.copy2(pre_f, fp)
        snap["files"].append({"orig": fp, "name": fn})
    return snap


def sandbox_after_exit(snap):
    if not snap:
        return
    for item in snap.get("files", []):
        orig, fn = item["orig"], item["name"]
        if os.path.isfile(orig):
            shutil.copy2(orig, os.path.join(snap["preDir"], fn))
        van_f = os.path.join(snap["vanDir"], fn)
        if os.path.isfile(van_f):
            shutil.copy2(van_f, orig)

def apply_ips_patch(rom_bytes, patch_bytes):
    if patch_bytes[:5] != b"PATCH":
        raise ValueError("Invalid IPS header (missing PATCH)")
    out = bytearray(rom_bytes)
    pos, n = 5, len(patch_bytes)
    while pos + 3 <= n:
        if patch_bytes[pos:pos + 3] == b"EOF":
            return bytes(out)
        offset = int.from_bytes(patch_bytes[pos:pos + 3], "big")
        pos += 3
        size = int.from_bytes(patch_bytes[pos:pos + 2], "big")
        pos += 2
        if size == 0:
            rle_len = int.from_bytes(patch_bytes[pos:pos + 2], "big")
            val = patch_bytes[pos + 2]
            pos += 3
            if offset + rle_len > len(out):
                out.extend(b"\x00" * (offset + rle_len - len(out)))
            out[offset:offset + rle_len] = bytes([val]) * rle_len
        else:
            chunk = patch_bytes[pos:pos + size]
            pos += size
            if offset + size > len(out):
                out.extend(b"\x00" * (offset + size - len(out)))
            out[offset:offset + size] = chunk
    raise ValueError("IPS patch ended without EOF")


def _bps_vlq(data, pos):
    val, shift = 0, 1
    while True:
        b = data[pos]
        pos += 1
        val += (b & 0x7F) * shift
        if b & 0x80:
            return val, pos
        shift <<= 7
        val += shift

def apply_bps_patch(rom_bytes, patch_bytes):
    if patch_bytes[:4] != b"BPS1" or len(patch_bytes) < 16:
        raise ValueError("Invalid BPS1 header")
    src_crc, dst_crc, pat_crc = struct.unpack("<III", patch_bytes[-12:])
    if (zlib.crc32(patch_bytes[:-4]) & 0xFFFFFFFF) != pat_crc:
        raise ValueError("BPS patch CRC32 mismatch")
    if (zlib.crc32(rom_bytes) & 0xFFFFFFFF) != src_crc:
        raise ValueError("Source ROM CRC32 mismatch")
    pos = 4
    src_sz, pos = _bps_vlq(patch_bytes, pos)
    dst_sz, pos = _bps_vlq(patch_bytes, pos)
    meta_sz, pos = _bps_vlq(patch_bytes, pos)
    pos += meta_sz
    out = bytearray()
    src_off = dst_off = 0
    end_pos = len(patch_bytes) - 12
    while pos < end_pos:
        act, pos = _bps_vlq(patch_bytes, pos)
        cmd, length = act & 3, (act >> 2) + 1
        if cmd == 0:
            s = len(out)
            out.extend(rom_bytes[s:s + length])
        elif cmd == 1:
            out.extend(patch_bytes[pos:pos + length])
            pos += length
        elif cmd == 2:
            d, pos = _bps_vlq(patch_bytes, pos)
            src_off += (-1 if (d & 1) else 1) * (d >> 1)
            out.extend(rom_bytes[src_off:src_off + length])
            src_off += length
        else:
            d, pos = _bps_vlq(patch_bytes, pos)
            dst_off += (-1 if (d & 1) else 1) * (d >> 1)
            for _ in range(length):
                out.append(out[dst_off])
                dst_off += 1
    if (zlib.crc32(out) & 0xFFFFFFFF) != dst_crc:
        raise ValueError("Target ROM CRC32 mismatch")
    return bytes(out)


def patch_rom_file(rom_path, patch_path, base_dir):
    with open(rom_path, "rb") as rf:
        rom_b = rf.read()
    with open(patch_path, "rb") as pf:
        pat_b = pf.read()
    ext = os.path.splitext(patch_path)[1].lower()
    res = apply_bps_patch(rom_b, pat_b) if ext == ".bps" else apply_ips_patch(rom_b, pat_b)
    out_dir = os.path.join(base_dir, "romhacks")
    os.makedirs(out_dir, exist_ok=True)
    stem = os.path.splitext(os.path.basename(patch_path))[0]
    rom_ext = os.path.splitext(rom_path)[1] or ".bin"
    out_path = os.path.join(out_dir, f"{stem}{rom_ext}")
    with open(out_path, "wb") as wf:
        wf.write(res)
    return out_path


def export_portable_pack(game_id, cfg, mods_list, out_dir):
    exe_p = (cfg.get("paths") or {}).get(game_id, "")
    if not exe_p or not os.path.exists(exe_p):
        raise ValueError("Game path not configured")
    gdir = os.path.dirname(os.path.abspath(exe_p))
    os.makedirs(out_dir, exist_ok=True)
    ts = time.strftime("%Y%m%d_%H%M%S")
    zpath = os.path.join(out_dir, f"SGL_Portable_{game_id}_{ts}.zip")
    active_names = {m.get("folder") or m.get("name") for m in mods_list if m.get("enabled")}
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(gdir):
            rel_r = os.path.relpath(root, gdir)
            if rel_r.lower().startswith("mods" + os.sep):
                top_mod = rel_r.split(os.sep)[1]
                if active_names and top_mod not in active_names:
                    continue
            for fn in files:
                fp = os.path.join(root, fn)
                zf.write(fp, os.path.join("game", os.path.relpath(fp, gdir)))
        readme = (
            f"Sonic Games Launcher - Portable Pack\nGame ID: {game_id}\n"
            f"Exported: {ts}\nActive mods: {', '.join(sorted(active_names)) or 'None'}\n"
            "Unpack and run the game executable inside /game/.\n"
        )
        zf.writestr("README_SGL.txt", readme.encode("utf-8"))
    return zpath


IMG_CANDIDATES = ("preview.png", "thumb.png", "icon.png", "preview.jpg", "thumb.jpg")


def _parse_mod_ini(text):
    res = {}
    for ln in text.splitlines():
        if "=" in ln and not ln.strip().startswith((";", "#")):
            k, v = ln.split("=", 1)
            res[k.strip().lower()] = v.strip().strip('"')
    return res


def inspect_game_mods_meta(game_id, cfg, mods_list):
    exe_p = (cfg.get("paths") or {}).get(game_id, "")
    if not exe_p or not os.path.exists(exe_p):
        return {"items": {}, "conflicts": {}}
    gdir = os.path.dirname(os.path.abspath(exe_p))
    mdir = os.path.join(gdir, "mods")
    if not os.path.isdir(mdir):
        return {"items": {}, "conflicts": {}}
    items, file_owners = {}, {}
    for m in mods_list:
        key = m.get("folder") or m.get("name") or ""
        if not key:
            continue
        p = os.path.join(mdir, key)
        meta = {"author": "", "version": "", "preview": "", "files": []}
        if os.path.isdir(p):
            for jf in ("mod.json", "mod.ini"):
                fp = os.path.join(p, jf)
                if os.path.isfile(fp):
                    try:
                        txt = open(fp, "r", encoding="utf-8", errors="ignore").read()
                        d = json.loads(txt) if jf.endswith(".json") else _parse_mod_ini(txt)
                        meta["author"] = str(d.get("Author") or d.get("author") or "")
                        meta["version"] = str(d.get("Version") or d.get("version") or "")
                    except Exception:
                        pass
            for im in IMG_CANDIDATES:
                ip = os.path.join(p, im)
                if os.path.isfile(ip):
                    try:
                        ext = os.path.splitext(im)[1].lstrip(".").lower()
                        b64 = base64.b64encode(open(ip, "rb").read()).decode("ascii")
                        meta["preview"] = f"data:image/{ext};base64,{b64}"
                        break
                    except Exception:
                        pass
            if m.get("enabled"):
                for root, _, files in os.walk(p):
                    for fn in files:
                        rel = os.path.relpath(os.path.join(root, fn), p).replace("\\", "/").lower()
                        if rel not in ("mod.json", "mod.ini") and not rel.endswith((".png", ".jpg", ".txt")):
                            file_owners.setdefault(rel, []).append(key)
        elif os.path.isfile(p) and p.lower().endswith(".zip"):
            try:
                with zipfile.ZipFile(p, "r") as zf:
                    for zn in zf.namelist():
                        low = os.path.basename(zn).lower()
                        if low in ("mod.json", "mod.ini") and not meta["author"]:
                            txt = zf.read(zn).decode("utf-8", errors="ignore")
                            d = json.loads(txt) if low.endswith(".json") else _parse_mod_ini(txt)
                            meta["author"] = str(d.get("Author") or d.get("author") or "")
                            meta["version"] = str(d.get("Version") or d.get("version") or "")
                        elif low in IMG_CANDIDATES and not meta["preview"]:
                            ext = os.path.splitext(low)[1].lstrip(".").lower()
                            meta["preview"] = f"data:image/{ext};base64,{base64.b64encode(zf.read(zn)).decode('ascii')}"
            except Exception:
                pass
        items[key] = meta
    conflicts = {f: owners for f, owners in file_owners.items() if len(owners) > 1}
    return {"items": items, "conflicts": conflicts}
