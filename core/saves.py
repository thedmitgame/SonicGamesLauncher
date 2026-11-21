from core.saves_extra import parse_mania_progress, parse_srb2_progress, find_mania_savedata
import os, re, json, struct, hashlib
from core.config import BASE_DIR, load_config

RSDK_CACHE_DIR = os.path.join(BASE_DIR, "rsdk_cache")
os.makedirs(RSDK_CACHE_DIR, exist_ok=True)

def decrypt_origins_data_dat():
    app_base = os.path.join(os.environ.get("APPDATA", ""), "SEGA", "SonicOrigins", "steam")
    if not os.path.isdir(app_base):
        return b""
    dat_path = None
    for uid in os.listdir(app_base):
        cand = os.path.join(app_base, uid, "game", "data.dat")
        if os.path.exists(cand):
            dat_path = cand
            break
    if not dat_path:
        return b""
    try:
        with open(dat_path, "rb") as f:
            raw = f.read()
        if len(raw) <= 64:
            return b""
        body = raw[64:]
        xor_key = bytes.fromhex("dadecf25a079d673ab43f286b1188401")
        dec = bytes(b ^ xor_key[i % 16] for i, b in enumerate(body))
        return dec
    except Exception:
        return b""

def read_steam_origins_stats():
    try:
        import winreg
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam")
        steam_path, _ = winreg.QueryValueEx(key, "SteamPath")
        stats_dir = os.path.join(steam_path, "appcache", "stats")
        if not os.path.isdir(stats_dir):
            return {"found": False, "note": "Папка статистики Steam не найдена"}

        schema_path = os.path.join(stats_dir, "UserGameStatsSchema_1794960.bin")
        user_stats_path = None
        for fn in os.listdir(stats_dir):
            if "1794960" in fn and fn.lower().endswith(".bin") and "schema" not in fn.lower():
                user_stats_path = os.path.join(stats_dir, fn)
                break

        if not os.path.exists(schema_path) and not user_stats_path:
            return {"found": False, "note": "Статистика Steam для Sonic Origins (1794960) ещё не создана"}

        # 1. Извлекаем 36 официальных названий достижений из Steam Schema под выбранный язык (ru / en)
        cur_lang = load_config().get("lang", "ru")
        lang_tag = b"\x01russian\x00" if cur_lang == "ru" else b"\x01english\x00"
        ru_titles = []
        if os.path.exists(schema_path):
            with open(schema_path, "rb") as bf:
                raw = bf.read()
            lang_strings = re.findall(lang_tag + b"([^\x00]{2,140})\x00", raw)
            if not lang_strings and lang_tag != b"\x01english\x00":
                lang_strings = re.findall(b"\x01english\x00([^\x00]{2,140})\x00", raw)
            for i in range(0, len(lang_strings), 2):
                ru_titles.append(lang_strings[i].decode("utf-8", errors="ignore").strip())

        # 2. Читаем битовую маску 36 достижений из UserGameStats
        unlocked_mask = 0
        if user_stats_path and os.path.exists(user_stats_path):
            with open(user_stats_path, "rb") as uf:
                u_raw = uf.read()
            m1 = u_raw.find(b"\x001\x00\x02data\x00")
            if m1 != -1 and m1 + 13 <= len(u_raw):
                low32 = int.from_bytes(u_raw[m1 + 9 : m1 + 13], "little", signed=False)
                unlocked_mask |= low32
            cut_pos = u_raw.find(b"AchievementTimes")
            search_area = u_raw[:cut_pos] if cut_pos != -1 else u_raw
            m2 = search_area.find(b"\x002\x00\x02data\x00")
            if m2 != -1 and m2 + 13 <= len(search_area):
                high32 = int.from_bytes(search_area[m2 + 9 : m2 + 13], "little", signed=False)
                unlocked_mask |= (high32 << 32)
            for extra_bit in range(32, 36):
                tag = f"\x00{extra_bit}\x00\x02data\x00".encode("ascii")
                if tag in u_raw:
                    unlocked_mask |= (1 << extra_bit)

        ach_entries = []
        for i in range(36):
            title = ru_titles[i] if i < len(ru_titles) else f"Достижение #{i+1}"
            ach_entries.append({"name": title, "done": bool((unlocked_mask >> i) & 1)})

        # 3. Расшифровываем data.dat и проверяем точные диапазоны 4 игр (по бинарному анализу data.dat)
        dec_dat = b""
        app_base = os.path.join(os.environ.get("APPDATA", ""), "SEGA", "SonicOrigins", "steam")
        if os.path.isdir(app_base):
            for uid in os.listdir(app_base):
                cand = os.path.join(app_base, uid, "game", "data.dat")
                if os.path.exists(cand):
                    with open(cand, "rb") as df:
                        raw_d = df.read()
                    if len(raw_d) > 64:
                        xk = bytes.fromhex("dadecf25a079d673ab43f286b1188401")
                        dec_dat = bytes(b ^ xk[idx % 16] for idx, b in enumerate(raw_d[64:]))
                    break

        slots_info = []
        total_emeralds = 0
        if dec_dat and len(dec_dat) >= 5200:
            game_specs = [
                ("Sonic The Hedgehog 1", 0, 912, "Соник"),
                ("Sonic CD", 912, 2050, "Соник"),
                ("Sonic The Hedgehog 2", 3150, 5200, "Соник и Тейлз"),
                ("Sonic 3 & Knuckles", 4300, 4600, ""),
            ]
            # Строго проверяем достижения именно за сбор всех 7 Изумрудов Хаоса или 7 Камней Времени
            chaos_done = any(a["done"] and ("изумруд" in a["name"].lower() and "супер-изумруд" not in a["name"].lower()) for a in ach_entries)
            stones_done = any(a["done"] and ("камн" in a["name"].lower()) for a in ach_entries)
            super_em_done = any(a["done"] and ("супер-изумруд" in a["name"].lower()) for a in ach_entries)

            for g_name, s_start, s_end, default_hero in game_specs:
                seg = dec_dat[s_start:s_end]
                nz_words = sum(
                    1 for off in range(0, len(seg) - 3, 4)
                    if int.from_bytes(seg[off : off + 4], "little") not in (0, 0xFFFFFFFF)
                )
                if nz_words >= 4:
                    if g_name == "Sonic CD":
                        em_cnt = 7 if stones_done else 0
                    elif g_name == "Sonic 3 & Knuckles":
                        em_cnt = 7 if (chaos_done or super_em_done) else 0
                    else:
                        em_cnt = 7 if chaos_done else 0

                    total_emeralds = max(total_emeralds, em_cnt)
                    slots_info.append({
                        "name": g_name,
                        "info": f"Сохранение активно • Изумрудов/Камней: {em_cnt}/7"
                    })
                else:
                    slots_info.append({
                        "name": f"{g_name} (Нет сохранения)",
                        "info": "Слот пуст • Изумрудов/Камней: 0/7"
                    })
        else:
            slots_info.append({"name": "Steam Cloud Save (Sonic Origins)", "info": "Файл data.dat не найден"})

        total_done = sum(1 for a in ach_entries if a["done"])
        return {
            "found": True,
            "emeralds": total_emeralds,
            "slots": slots_info,
            "details": f"Открыто достижений Steam: {total_done} из 36",
            "achievements": ach_entries
        }
    except Exception as e:
        return {"found": False, "note": f"Ошибка чтения Steam: {e}"}

def rsdkv4_decrypt_chunk(data, filename_upper, file_size):
    key1 = hashlib.md5(filename_upper.encode("utf-8")).digest()
    key2 = hashlib.md5(str(file_size).encode("utf-8")).digest()
    out = bytearray(len(data))
    k1_pos = 0
    k2_pos = 8
    swap = False
    for i, b in enumerate(data):
        val = b ^ key1[k1_pos] ^ key2[k2_pos]
        if swap:
            val = ((val & 0x0F) << 4) | ((val & 0xF0) >> 4)
        out[i] = val
        k1_pos = (k1_pos + 1) & 15
        k2_pos = (k2_pos + 1) & 15
        if k1_pos == 0:
            swap = not swap
    return bytes(out)

BUILTIN_ACHIEVEMENTS = {
    "sonic1": [
        "Blast Processing",
        "Ring King",
        "Ramp Ring Acrobatics",
        "Secret of Marble Zone",
        "Block Buster",
        "Rooftop Run",
        "Chaos Connoisseur",
        "Secret of Labyrinth Zone",
        "Flawless Pursuit",
        "Out of Order",
        "Bombs Away",
        "Hidden Transporter",
        "Eye Protection",
        "One for the Road",
        "Beat the Clock",
        "Stairway To Heaven",
        "Death Chamber",
        "Get to the Points",
        "Monitor Mania"
    ],
    "sonic2": [
        "Super Sonic Time Attack",
        "Expert's Challenge",
        "Tour of the Plant",
        "Quick Run",
        "100% Chemical Free",
        "Early Bird Special",
        "Superstar",
        "Gambling Problem",
        "Bop Non-Stop",
        "Perfectionist",
        "No Future Here",
        "Metropolis Master",
        "Beat the Clock... Again...",
        "Scrambled Egg"
    ],
    "soniccd": [
        "88 Miles Per Hour",
        "Just one hug is enough",
        "Take the High Road",
        "King of the Rings",
        "Statue Saviour",
        "Heavy Metal",
        "Paradise Found",
        "All Stages Clear!",
        "Treasure Hunter",
        "Dr. Eggman Got Served",
        "Just in Time!",
        "Saviour of the Planet",
        "Dr. Robotnik Got Served"
    ],
    "sonic3": [
        "Attracted to Shiny Things",
        "Double Dose of Stars",
        "Old-Fashioned Life Insurance",
        "Going Hyper",
        "Score Millionaire",
        "Electrofishing",
        "Longplay",
        "Tidied Up the Place",
        "Is There An Exit Up There",
        "Jackpot",
        "Bursting Through the Jungle",
        "Attracted to Giant Shiny Things",
        "Greedy Snowboarder",
        "Once See the Sunrise",
        "Fluffy Fur Must Not Get Wet",
        "Display Smasher",
        "Squirrels On a Plane",
        "No Touchy"
    ]
}

def read_udata_bytes(game_dir):
    if not game_dir or not os.path.isdir(game_dir):
        return b""
    for root, _, files in os.walk(game_dir):
        for fn in files:
            if fn.lower() in ("udata.bin", "achdata.bin", "achievements.bin"):
                try:
                    with open(os.path.join(root, fn), "rb") as f:
                        return f.read()
                except Exception:
                    pass
    return b""

def extract_native_achievements(gid, game_dir, raw_save_bytes):
    titles = BUILTIN_ACHIEVEMENTS.get(gid, [])
    if not titles:
        return []

    udata_bytes = read_udata_bytes(game_dir)
    if not raw_save_bytes and not udata_bytes:
        return [{"name": t, "done": False} for t in titles]

    if gid == "sonic3":
        # Точное соответствие BUILTIN_ACHIEVEMENTS["sonic3"] и констант из defines_achievements.lemon:
        s3_ach_ids = (
            0x0001,  # 0: Attracted to Shiny Things (ACHIEVEMENT_300_RINGS)
            0x0002,  # 1: Double Dose of Stars (ACHIEVEMENT_DOUBLE_INVINCIBILITY)
            0x0010,  # 2: Old-Fashioned Life Insurance (ACHIEVEMENT_CONTINUES)
            0x0011,  # 3: Going Hyper (ACHIEVEMENT_GOING_HYPER)
            0x0012,  # 4: Score Millionaire (ACHIEVEMENT_SCORE)
            0x0013,  # 5: Electrofishing (ACHIEVEMENT_ELECTROCUTE)
            0x0020,  # 6: Longplay (ACHIEVEMENT_LONGPLAY)
            0x0101,  # 7: Tidied Up the Place (ACHIEVEMENT_SSZ_DECOYS / AIZ) -> проверим точное сопоставление ниже
            0x1401,  # 8: Is There An Exit Up There (ACHIEVEMENT_GS_EXIT_TOP)
            0x1501,  # 9: Jackpot (ACHIEVEMENT_SM_JACKPOT)
            0x0101,  # 10: Bursting Through the Jungle (ACHIEVEMENT_AIZ_TIMEATTACK)
            0x0301,  # 11: Attracted to Giant Shiny Things (ACHIEVEMENT_MGZ_GIANTRINGS)
            0x0501,  # 12: Greedy Snowboarder (ACHIEVEMENT_ICZ_SNOWBOARDING)
            0x0502,  # 13: Once See the Sunrise (ACHIEVEMENT_ICZ_KNUX_SUNRISE)
            0x0601,  # 14: Fluffy Fur Must Not Get Wet (ACHIEVEMENT_LBZ_STAY_DRY)
            0x0701,  # 15: Display Smasher (ACHIEVEMENT_MHZ_OPEN_MONITORS)
            0x0801,  # 16: Squirrels On a Plane (ACHIEVEMENT_FBZ_FREE_ANIMALS)
            0x1601,  # 17: No Touchy (ACHIEVEMENT_BS_PERFECT)
        )
        # Примечание: индекс 7 ("Tidied Up the Place") — это ACHIEVEMENT_SSZ_DECOYS (0x0c01)
        s3_ach_ids = (
            0x0001, 0x0002, 0x0010, 0x0011, 0x0012, 0x0013,
            0x0020, 0x0c01, 0x1401, 0x1501, 0x0101, 0x0301,
            0x0501, 0x0502, 0x0601, 0x0701, 0x0801, 0x1601
        )

        unlocked_ids = set()
        if raw_save_bytes:
            # Формат 1: новый контейнер OXY.PDATA (storage/s3air_achievements.bin)
            if raw_save_bytes.startswith(b"OXY.PDATA\x00"):
                sec_tag = b"Achievements"
                sec_pos = raw_save_bytes.find(sec_tag)
                if sec_pos != -1 and sec_pos + len(sec_tag) + 8 <= len(raw_save_bytes):
                    v_len = int.from_bytes(raw_save_bytes[sec_pos + len(sec_tag) : sec_pos + len(sec_tag) + 4], "little")
                    payload = raw_save_bytes[sec_pos + len(sec_tag) + 4 : sec_pos + len(sec_tag) + 4 + v_len]
                    if len(payload) >= 4:
                        cnt = int.from_bytes(payload[0:4], "little")
                        for i in range(cnt):
                            off = 4 + i * 8
                            if off + 8 <= len(payload):
                                aid = int.from_bytes(payload[off : off + 4], "little")
                                st = int.from_bytes(payload[off + 4 : off + 8], "little")
                                if st > 0:
                                    unlocked_ids.add(aid)

            # Формат 2: классический файл S3AIRPGR (playerprogress.bin)
            elif raw_save_bytes.startswith(b"S3AIRPGR") and len(raw_save_bytes) >= 0x26:
                cnt = int.from_bytes(raw_save_bytes[0x22:0x26], "little")
                for i in range(min(cnt, 64)):
                    off = 0x26 + i * 8
                    if off + 8 <= len(raw_save_bytes):
                        aid = int.from_bytes(raw_save_bytes[off : off + 4], "little")
                        st = int.from_bytes(raw_save_bytes[off + 4 : off + 8], "little")
                        if st > 0:
                            unlocked_ids.add(aid)

        results = []
        for idx, title in enumerate(titles):
            aid = s3_ach_ids[idx]
            results.append({"name": title, "done": aid in unlocked_ids})
        return results

    def get_ones_indices(buf):
        ones = set()
        limit = min(len(buf) - 3, 8192)
        for off in range(128, limit, 4):
            # Пропускаем область настроек движка (saveRAM[1000..1020] -> offset 4000..4080)
            if 4000 <= off <= 4080:
                continue
            val = int.from_bytes(buf[off : off + 4], "little", signed=False)
            if val in (1, 2):
                ones.add(off // 4)
        return ones

    sdata_ones = get_ones_indices(raw_save_bytes) if raw_save_bytes else set()
    udata_ones = get_ones_indices(udata_bytes) if udata_bytes else set()

    # Выводим в консоль найденные флаги для прозрачной диагностики любого сейва
    results = []
    if gid == "sonic2":
        s2_exact_idx = (
            412,  # 0: Super Sonic Time Attack
            411,  # 1: Expert's Challenge
            414,  # 2: Tour of the Plant
            400,  # 3: Quick Run
            401,  # 4: 100% Chemical Free
            402,  # 5: Early Bird Special
            403,  # 6: Superstar
            404,  # 7: Gambling Problem
            405,  # 8: Bop Non-Stop
            406,  # 9: Perfectionist
            407,  # 10: No Future Here
            408,  # 11: Metropolis Master
            409,  # 12: Beat the Clock... Again...
            410,  # 13: Scrambled Egg
        )
        for idx, title in enumerate(titles):
            ram_idx = s2_exact_idx[idx]
            results.append({"name": title, "done": ram_idx in sdata_ones})
        return results

    # Для Sonic 1 Forever и Sonic CD Restored: проверяем стандартный блок RSDKv4 saveRAM[400+i], [630+i], [800+i] и UData
    if gid == "soniccd":
        scd_idx = (
            257,  # 0: 88 Miles Per Hour
            258,  # 1: Just one hug is enough
            260,  # 2: Take the High Road
            259,  # 3: King of the Rings
            262,  # 4: Statue Saviour
            261,  # 5: Heavy Metal
            263,  # 6: Paradise Found
            264,  # 7: All Stages Clear!
            265,  # 8: Treasure Hunter
            266,  # 9: Dr. Eggman Got Served
            267,  # 10: Just in Time!
            268,  # 11: Saviour of the Planet
            1605, # 12: Dr. Robotnik Got Served (бонусное 13-е достижение ремастера)
        )
        for idx, title in enumerate(titles):
            ram_i = scd_idx[idx]
            is_done = (ram_i in sdata_ones) or (idx == 12 and 269 in sdata_ones)
            results.append({"name": title, "done": is_done})
        return results

    for idx, title in enumerate(titles):
        is_done = ((400 + idx) in sdata_ones) or (idx in udata_ones)
        results.append({"name": title, "done": is_done})

    return results

def parse_game_progress(gid, cfg):
    if gid == 'mania':
        exe_m = cfg.get('paths', {}).get('mania', '')
        return parse_mania_progress(os.path.dirname(exe_m) if exe_m else '')
    if gid == 'srb2':
        exe_s = cfg.get('paths', {}).get('srb2', '')
        return parse_srb2_progress(os.path.dirname(exe_s) if exe_s else '')
    if gid == "origins":
        st = read_steam_origins_stats()
        if st.get("found"):
            achs = st.get("achievements", [])
            done_cnt = sum(1 for a in achs if a.get("done"))
            return {
                "supported": True,
                "title": f"Достижения Steam ({done_cnt} из {len(achs)})",
                "hideEmeralds": True,
                "emeralds": 0, "maxEmeralds": 0,
                "slots": [],
                "achievements": achs
            }
        return {"supported": False, "note": st.get("note", "Запустите игру через Steam хотя бы один раз")}

    exe_path = cfg.get("paths", {}).get(gid, "")
    game_dir = os.path.dirname(exe_path) if exe_path else ""
    slots, max_emeralds, raw_bytes = [], 0, b""

    if gid == "sonic3":
        s3_appdata = os.path.join(os.environ.get("APPDATA", ""), "Sonic3AIR")
        slot_candidates = [
            os.path.join(s3_appdata, "storage", "s3air_saveslots.bin"),
            os.path.join(s3_appdata, "s3air_saveslots.bin"),
            os.path.join(game_dir, "storage", "s3air_saveslots.bin") if game_dir else "",
        ]
        slots_file = next((p for p in slot_candidates if p and os.path.exists(p)), None)

        if slots_file:
            with open(slots_file, "rb") as f:
                s_data = f.read()
            # В OXY.PDATA имя "SRAM_Saveslots" записано БЕЗ нулевого байта, сразу за ним идут 4 байта длины (0x50 = 80 байт = 8 слотов по 10 байт!)
            sec_tag = b"SRAM_Saveslots"
            sec_pos = s_data.find(sec_tag)
            if sec_pos != -1:
                data_off = sec_pos + len(sec_tag) + 4
                if data_off + 80 <= len(s_data):
                    char_map = {0: "Соник и Тейлз", 1: "Соник", 2: "Тейлз", 3: "Наклз", 4: "Наклз и Тейлз"}
                    for s_idx in range(8):
                        slot_chunk = s_data[data_off + s_idx * 10 : data_off + (s_idx + 1) * 10]
                        b0, b1, b2, b3, b4, b5, b6, b7, b8, b9 = struct.unpack("<10B", slot_chunk)
                        # По твоему дампу:
                        # Слот 1 (активный): 00 2a 01 00 00 02 00 00 03 00 (b0 != 0x80)
                        # Слоты 2..8 (пустые): 80 00 00 00 00 00 00 00 03 00 (b0 == 0x80 — пустой слот, b8 == 03 жизни)
                        if (b0 & 0x80) == 0:
                            char_id = b2 if b2 <= 4 else (b2 >> 4)
                            zone_num = b3 + 1
                            lives_val = b8 if 0 < b8 <= 99 else 3
                            # Изумруды в S3&K SRAM лежат в b6..b7 (по 2 бита на каждый из 7 изумрудов) или счётчиком в b5
                            em_word = (b6 << 8) | b7
                            mask_em = sum(1 for k in range(8) if ((em_word >> (k * 2)) & 3) > 0)
                            em_final = min(7, max(mask_em, b5 if b5 <= 7 else 0))
                            max_emeralds = max(max_emeralds, em_final)
                            hero_name = char_map.get(char_id, f"Герой #{char_id}")
                            stage_info = "Игра пройдена (CLEAR)" if (b0 & 0x03) >= 1 else f"Зона #{zone_num}"
                            slots.append({
                                "name": f"Слот сохранения #{s_idx + 1} ({hero_name})",
                                "info": f"{stage_info} • Жизней: {lives_val} • Изумрудов: {em_final}/7"
                            })

        p_candidates = [
            os.path.join(s3_appdata, "storage", "s3air_achievements.bin"),
            os.path.join(s3_appdata, "playerprogress.bin"),
            os.path.join(game_dir, "storage", "s3air_achievements.bin") if game_dir else "",
            os.path.join(game_dir, "savedata", "playerprogress.bin") if game_dir else "",
        ]
        p_file = next((p for p in p_candidates if p and os.path.exists(p)), None)
        if p_file:
            with open(p_file, "rb") as f:
                raw_bytes = f.read()
    elif game_dir and os.path.isdir(game_dir):
        save_path = next((os.path.join(r, fn) for r, _, fs in os.walk(game_dir) for fn in fs if fn.lower() in ("sdata.bin", "savedata.bin")), None)
        if save_path and os.path.exists(save_path):
            with open(save_path, "rb") as f:
                raw_bytes = f.read()

            # Строгая структура RSDKv3/v4 SData.bin:
            # 4 базовых слота лежат СТРОГО по смещению 0..127 байт, каждый слот = 32 байта (8 x int32):
            # [0]=character, [1]=lives, [2]=score, [3]=scoreBonus, [4]=stageListPos, [5]=emeraldsBitmask, [6]=continues, [7]=extra
            char_names = {0: "Соник", 1: "Тейлз", 2: "Эми", 3: "Наклз"} if gid == "soniccd" else {0: "Соник", 1: "Тейлз", 2: "Наклз", 3: "Соник и Тейлз", 4: "Наклз и Тейлз", 5: "Эми"}
            regions = [(4000, 8, 1)] if gid in ("sonic1", "sonic2") else [(0, 4, 1), (4000, 4, 5)]
            for base_off, count, start_num in regions:
                for i in range(count):
                    pos = base_off + i * 32
                    if len(raw_bytes) < pos + 32:
                        break
                    ints = struct.unpack("<8I", raw_bytes[pos : pos + 32])
                    if gid == "soniccd":
                        char_id, lives, score, stage_pos, em_bits, _, _, _ = ints
                    else:
                        char_id, lives, score, _, stage_pos, em_bits, _, _ = ints
                    if 0 < lives <= 99 and 0 < stage_pos <= 255:
                        em_count = bin(em_bits & 0x7F).count("1")
                        max_emeralds = max(max_emeralds, em_count)
                        c_name = char_names.get(char_id, f"Герой #{char_id}")
                        stage_str = "Игра пройдена (CLEAR)" if stage_pos >= 0x80 else f"Этап #{stage_pos}"
                        slots.append({
                            "name": f"Слот сохранения #{start_num + i} ({c_name})",
                            "info": f"{stage_str} • Жизней: {lives} • Очки: {score} • Изумрудов: {em_count}/7"
                        })

    return {
        "supported": True, "title": "Прогресс и сохранения",
        "emeralds": max_emeralds, "maxEmeralds": 7,
        "slots": slots if slots else [{"name": "Активных сохранений нет", "info": "Все слоты сохранения пусты (0 Изумрудов)"}],
        "achievements": extract_native_achievements(gid, game_dir, raw_bytes)
    }

