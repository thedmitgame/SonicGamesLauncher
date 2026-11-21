import os, re, struct
from core.config import load_config


def get_steam_root():
    try:
        import winreg
        k = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam")
        sp, _ = winreg.QueryValueEx(k, "SteamPath")
        return sp.replace("/", os.sep)
    except Exception:
        return ""


def read_steam_app_achievements(app_id, total_expected=18):
    steam_path = get_steam_root()
    if not steam_path:
        return []
    stats_dir = os.path.join(steam_path, "appcache", "stats")
    if not os.path.isdir(stats_dir):
        return []

    schema_p = os.path.join(stats_dir, f"UserGameStatsSchema_{app_id}.bin")
    user_p = None
    for fn in os.listdir(stats_dir):
        low = fn.lower()
        if str(app_id) in low and low.endswith(".bin") and "schema" not in low:
            user_p = os.path.join(stats_dir, fn)
            break

    if not os.path.exists(schema_p) and not user_p:
        return []

    cur_lang = load_config().get("lang", "ru")
    lang_tag = b"\x01russian\x00" if cur_lang == "ru" else b"\x01english\x00"
    titles = []
    if os.path.exists(schema_p):
        try:
            with open(schema_p, "rb") as bf:
                raw = bf.read()
            found_strs = re.findall(lang_tag + b"([^\x00]{2,140})\x00", raw)
            if not found_strs and lang_tag != b"\x01english\x00":
                found_strs = re.findall(b"\x01english\x00([^\x00]{2,140})\x00", raw)
            for idx in range(0, len(found_strs), 2):
                s = found_strs.pop(0).decode("utf-8", errors="ignore").strip()
                if found_strs:
                    found_strs.pop(0)
                titles.append(s)
        except Exception:
            pass

    unlocked_mask = 0
    if user_p and os.path.exists(user_p):
        try:
            with open(user_p, "rb") as uf:
                u_raw = uf.read()
            m1 = u_raw.find(b"\x001\x00\x02data\x00")
            if m1 != -1 and m1 + 13 <= len(u_raw):
                chunk = u_raw[m1 + 9 : m1 + 13]
                unlocked_mask |= int.from_bytes(chunk, "little", signed=False)
        except Exception:
            pass

    count = max(len(titles), total_expected) if titles else total_expected
    out = []
    for i in range(min(count, 32)):
        t_name = titles[i] if i < len(titles) else f"Achievement #{i + 1}"
        out.append({"name": t_name, "done": bool((unlocked_mask >> i) & 1)})
    return out


def find_mania_savedata(game_dir):
    if game_dir and os.path.isdir(game_dir):
        for r, dirs, fs in os.walk(game_dir):
            dirs[:] = [d for d in dirs if d.lower() not in ("mods", "screenshots")]
            for fn in fs:
                if fn.lower() == "savedata.bin":
                    return os.path.join(r, fn)
    sp = get_steam_root()
    if sp:
        udata = os.path.join(sp, "userdata")
        if os.path.isdir(udata):
            for uid in os.listdir(udata):
                cand = os.path.join(udata, uid, "584400", "remote", "SaveData.bin")
                if os.path.isfile(cand):
                    return cand
    return ""


def parse_mania_progress(game_dir):
    save_file = find_mania_savedata(game_dir)
    achs = read_steam_app_achievements(584400, 18)
    slots = []
    max_em = 0

    char_map = {
        0: "Соник и Тейлз",
        1: "Соник",
        2: "Тейлз",
        3: "Наклз",
        4: "Майти",
        5: "Рэй"
    }
    mania_zones = (
        "Green Hill", "Chemical Plant", "Studiopolis", "Flying Battery",
        "Press Garden", "Stardust Speedway", "Hydrocity", "Mirage Saloon",
        "Oil Ocean", "Lava Reef", "Metallic Madness", "Titanic Monarch", "Egg Reverie"
    )

    if save_file and os.path.isfile(save_file):
        try:
            with open(save_file, "rb") as f:
                raw = f.read()
            # В RSDKv5 SaveData.bin каждый слот занимает 0x400 (1024 байта) или 0x200 байт;
            # проверяем стандартную сетку слотов по смещениям 0x58 + i * step и 0 + i * 36
            checked_offsets = []
            if len(raw) >= 8192:
                for s_i in range(8):
                    checked_offsets.append((s_i + 1, 0x58 + s_i * 0x400))
            if len(raw) >= 512:
                for s_i in range(8):
                    checked_offsets.append((s_i + 1, s_i * 0x40))

            seen_slots = set()
            for slot_num, off in checked_offsets:
                if slot_num in seen_slots or off + 28 > len(raw):
                    continue
                vals = struct.unpack("<7I", raw[off : off + 28])
                state_v, char_id, zone_id, lives, score, _, em_bits = vals
                if state_v in (1, 2) and 0 <= char_id <= 15 and 0 < lives <= 99 and zone_id <= 30:
                    seen_slots.add(slot_num)
                    em_cnt = bin(em_bits & 0x7F).count("1")
                    max_em = max(max_em, em_cnt)
                    hero = char_map.get(char_id, f"Герой #{char_id}")
                    if state_v == 2 or zone_id >= len(mania_zones):
                        z_label = "Игра пройдена (CLEAR)"
                    else:
                        z_label = mania_zones[zone_id]
                    slots.append({
                        "name": f"Слот сохранения #{slot_num} ({hero})",
                        "info": f"{z_label} • Жизней: {lives} • Очки: {score} • Изумрудов: {em_cnt}/7"
                    })

            if not slots and len(raw) >= 64:
                # Фоллбек: если формат декомпиляции отличается смещением, ищем валидные сигнатуры слотов
                for off in range(0, min(len(raw) - 28, 16384), 4):
                    if len(slots) >= 8:
                        break
                    vals = struct.unpack("<7I", raw[off : off + 28])
                    st_v, ch_v, zn_v, lv_v, sc_v, bonus_v, em_v = vals
                    if st_v in (1, 2) and ch_v <= 5 and 1 <= lv_v <= 99 and zn_v <= 14 and sc_v <= 9999999 and (sc_v % 10 == 0) and em_v <= 0xFF:
                        em_cnt = bin(em_v & 0x7F).count("1")
                        max_em = max(max_em, em_cnt)
                        hero = char_map.get(ch_v, "Соник")
                        z_label = "Игра пройдена (CLEAR)" if st_v == 2 or zn_v >= len(mania_zones) else mania_zones[zn_v]
                        slots.append({
                            "name": f"Слот сохранения #{len(slots) + 1} ({hero})",
                            "info": f"{z_label} • Жизней: {lv_v} • Очки: {sc_v} • Изумрудов: {em_cnt}/7"
                        })
        except Exception:
            pass

    return {
        "supported": True,
        "title": "Достижения Sonic Mania",
        "emeralds": max_em,
        "maxEmeralds": 7,
        "slots": slots if slots else [{"name": "Активных сохранений нет", "info": "Файл SaveData.bin пуст или игра ещё не начата"}],
        "achievements": achs
    }


def _read_cstring(buf, pos):
    end = buf.find(b"\x00", pos)
    if end == -1:
        return "", len(buf)
    return buf[pos:end].decode("ascii", errors="ignore"), end + 1


def _format_srb2_hero(skin_raw):
    names = {
        "sonic": "Соник",
        "tails": "Тейлз",
        "knuckles": "Наклз",
        "amy": "Эми",
        "fang": "Фэнг",
        "metalsonic": "Метал Соник"
    }
    s = (skin_raw or "").strip().lower()
    if not s:
        return ""
    return names.get(s, skin_raw.strip().title())


def _format_srb2_map(map_id):
    zones = {
        1: "Greenflower Zone Act 1", 2: "Greenflower Zone Act 2", 3: "Greenflower Zone Act 3",
        4: "Techno Hill Zone Act 1", 5: "Techno Hill Zone Act 2", 6: "Techno Hill Zone Act 3",
        7: "Deep Sea Zone Act 1", 8: "Deep Sea Zone Act 2", 9: "Deep Sea Zone Act 3",
        10: "Castle Eggman Zone Act 1", 11: "Castle Eggman Zone Act 2", 12: "Castle Eggman Zone Act 3",
        13: "Arid Canyon Zone Act 1", 14: "Arid Canyon Zone Act 2", 15: "Arid Canyon Zone Act 3",
        16: "Red Volcano Zone Act 1",
        22: "Egg Rock Zone Act 1", 23: "Egg Rock Zone Act 2", 24: "Egg Rock Zone Act 3",
        25: "Black Core Zone Act 1", 26: "Black Core Zone Act 2", 27: "Black Core Zone Act 3"
    }
    return zones.get(map_id, f"Уровень MAP{map_id:02d}")


def parse_srb2_progress(game_dir):
    if not game_dir or not os.path.isdir(game_dir):
        return {"supported": False, "note": "Укажите путь к исполняемому файлу SRB2"}

    slots = []
    max_em = 0

    gdata_p = os.path.join(game_dir, "gamedata.dat")
    ach_list = []
    if os.path.isfile(gdata_p):
        sz = os.path.getsize(gdata_p)
        ach_list.append({"name": f"Файл глобального прогресса gamedata.dat ({sz} байт)", "done": sz > 100})

    ssg_files = sorted(fn for fn in os.listdir(game_dir) if fn.lower().endswith(".ssg"))
    for fn in ssg_files:
        fp = os.path.join(game_dir, fn)
        try:
            with open(fp, "rb") as sf:
                buf = sf.read(256)

            if len(buf) >= 40 and buf.startswith(b"version "):
                # Смещение 0x10: номер карты; 0x11: флаг прохождения (0x20 = пройдено);
                # Смещение 0x12: зашифрованные Изумруды Хаоса (значение - 0x65 = битовая маска 0..0x7F)
                raw_map = buf[16]
                clear_flag = buf[17]
                raw_em = buf[18]
                em_mask = (raw_em - 0x65) if 0x65 <= raw_em <= 0xE4 else 0
                em_cnt = bin(em_mask & 0x7F).count("1")
                max_em = max(max_em, em_cnt)

                _, pos = _read_cstring(buf, 20)
                pos += 2
                p1_raw, pos = _read_cstring(buf, pos)
                p2_raw, pos = _read_cstring(buf, pos)

                h1 = _format_srb2_hero(p1_raw) or "Соник"
                h2 = _format_srb2_hero(p2_raw)
                hero_label = f"{h1} и {h2}" if h2 else h1

                zone_str = "Игра пройдена (CLEAR)" if (clear_flag & 0x20) else _format_srb2_map(raw_map)

                if pos + 10 <= len(buf):
                    lives = buf[pos + 1]
                    score, = struct.unpack_from("<I", buf, pos + 2)
                    continues, = struct.unpack_from("<I", buf, pos + 6)
                    slots.append({
                        "name": f"Слот {fn} ({hero_label})",
                        "info": f"{zone_str} • Жизней: {lives} • Очки: {score} • Продолжений: {continues} • Изумрудов: {em_cnt}/7"
                    })
                    continue

            slots.append({
                "name": f"Слот {fn}",
                "info": f"Размер файла: {os.path.getsize(fp)} байт"
            })
        except Exception:
            pass

    return {
        "supported": True,
        "title": "Статистика профиля SRB2",
        "emeralds": max_em,
        "maxEmeralds": 7,
        "slots": slots if slots else [{"name": "Файлов .ssg пока нет", "info": "Создайте сохранение внутри Sonic Robo Blast 2"}],
        "achievements": ach_list
    }
