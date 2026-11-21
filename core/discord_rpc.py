import os, json, struct, time, uuid, threading, ctypes
from ctypes import wintypes

DEFAULT_DISCORD_CLIENT_ID = "1572572909409533982"

k32 = ctypes.windll.kernel32
k32.CreateFileW.argtypes = [
    wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD,
    wintypes.LPVOID, wintypes.DWORD, wintypes.DWORD, wintypes.HANDLE
]
k32.CreateFileW.restype = wintypes.HANDLE
k32.WriteFile.argtypes = [wintypes.HANDLE, wintypes.LPCVOID, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD), wintypes.LPVOID]
k32.WriteFile.restype = wintypes.BOOL
k32.ReadFile.argtypes = [wintypes.HANDLE, wintypes.LPVOID, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD), wintypes.LPVOID]
k32.ReadFile.restype = wintypes.BOOL
k32.PeekNamedPipe.argtypes = [
    wintypes.HANDLE, wintypes.LPVOID, wintypes.DWORD,
    ctypes.POINTER(wintypes.DWORD), ctypes.POINTER(wintypes.DWORD), ctypes.POINTER(wintypes.DWORD)
]
k32.PeekNamedPipe.restype = wintypes.BOOL
k32.CloseHandle.argtypes = [wintypes.HANDLE]
k32.CloseHandle.restype = wintypes.BOOL

INVALID_HANDLE = wintypes.HANDLE(-1).value


class DiscordRPC:
    def __init__(self):
        self.handle = None
        self.connected_cid = ""
        self.enabled = True
        self.client_id = DEFAULT_DISCORD_CLIENT_ID
        self.menu_start_ms = int(time.time() * 1000)
        self.last_payload = None
        self._lock = threading.Lock()
        self._stop = False
        threading.Thread(target=self._worker, daemon=True).start()

    def configure(self, enabled=True, client_id=""):
        cid = DEFAULT_DISCORD_CLIENT_ID
        changed = (bool(enabled) != self.enabled) or (cid != self.client_id)
        self.enabled = bool(enabled)
        self.client_id = cid
        if not self.enabled or not self.client_id:
            self.close_pipe()
        elif changed:
            self.close_pipe()
            if self.last_payload:
                threading.Thread(target=self._flush_now, daemon=True).start()

    def close_pipe(self):
        with self._lock:
            if self.handle is not None:
                try:
                    k32.CloseHandle(self.handle)
                except Exception:
                    pass
                self.handle = None
                self.connected_cid = ""

    def _open_pipe(self, cid):
        for i in range(10):
            cand = rf"\\.\pipe\discord-ipc-{i}"
            res = k32.CreateFileW(cand, 0xC0000000, 0, None, 3, 0, None)
            if not res or res == INVALID_HANDLE:
                continue
            self.handle = res
            try:
                self._send_pkt(0, {"v": 1, "client_id": str(cid)})
                op, data = self._read_pkt(timeout=3.0)
                if op == 1 and data.get("evt") == "READY":
                    self.connected_cid = str(cid)
                    return True
            except Exception:
                pass
            k32.CloseHandle(res)
            self.handle = None
        return False

    def _send_pkt(self, op, obj):
        raw = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        pkt = struct.pack("<II", op, len(raw)) + raw
        w = wintypes.DWORD(0)
        if not k32.WriteFile(self.handle, pkt, len(pkt), ctypes.byref(w), None):
            raise OSError("WriteFile error")

    def _read_pkt(self, timeout=3.0):
        deadline = time.time() + timeout
        avail = wintypes.DWORD(0)
        while time.time() < deadline:
            if not k32.PeekNamedPipe(self.handle, None, 0, None, ctypes.byref(avail), None):
                raise OSError("Pipe closed")
            if avail.value >= 8:
                break
            time.sleep(0.04)
        else:
            raise TimeoutError("Discord IPC timeout")

        hdr = ctypes.create_string_buffer(8)
        r = wintypes.DWORD(0)
        k32.ReadFile(self.handle, hdr, 8, ctypes.byref(r), None)
        op, ln = struct.unpack("<II", hdr.raw)
        if ln > 0:
            buf = ctypes.create_string_buffer(ln)
            k32.ReadFile(self.handle, buf, ln, ctypes.byref(r), None)
            return op, json.loads(buf.raw[:r.value].decode("utf-8", errors="ignore"))
        return op, {}

    def update_menu(self, game_name="", game_id="", lang="ru"):
        if lang == "en":
            details = "In Game Selection Menu"
            state = f"Selected: {game_name}" if game_name else "Browsing games"
        else:
            details = "В меню выбора игр"
            state = f"Выбрана: {game_name}" if game_name else "Выбирает игру"
        self._set_activity(details, state, self.menu_start_ms, game_id or "logo", game_name or "Sonic Games Launcher", False)

    def update_playing(self, game_name, game_tag="", game_id="", start_ts=None, lang="ru"):
        ts_ms = int((start_ts or time.time()) * 1000)
        details = f"Playing {game_name}" if lang == "en" else f"Играет в {game_name}"
        state = game_tag if game_tag else ("In-Game" if lang == "en" else "В игре")
        self._set_activity(details, state, ts_ms, game_id or "logo", game_name, True)

    def _set_activity(self, details, state, start_ms, image_key="logo", image_text="Sonic Games Launcher", is_playing=False):
        uploaded_assets = {"logo", "mania", "sonic1", "sonic2", "sonic3", "soniccd", "srb2", "origins"}
        large_key = image_key if image_key in uploaded_assets else "logo"
        assets_obj = {
            "large_image": large_key,
            "large_text": (image_text or "Sonic Games Launcher")[:120]
        }
        if is_playing and large_key != "logo":
            assets_obj["small_image"] = "logo"
            assets_obj["small_text"] = "Sonic Games Launcher"

        self.last_payload = {
            "cmd": "SET_ACTIVITY",
            "args": {
                "pid": os.getpid(),
                "activity": {
                    "details": details[:120],
                    "state": state[:120],
                    "timestamps": {"start": int(start_ms)},
                    "assets": assets_obj
                }
            },
            "nonce": str(uuid.uuid4())
        }
        threading.Thread(target=self._flush_now, daemon=True).start()

    def _flush_now(self):
        if not self.enabled or not self.client_id or not self.last_payload:
            return
        with self._lock:
            if self.handle is None or self.connected_cid != self.client_id:
                if not self._open_pipe(self.client_id):
                    return
            try:
                self._send_pkt(1, self.last_payload)
                self._read_pkt(timeout=3.0)
            except Exception:
                try:
                    k32.CloseHandle(self.handle)
                except Exception:
                    pass
                self.handle = None
                self.connected_cid = ""

    def _worker(self):
        while not self._stop:
            time.sleep(10)
            if self.enabled and self.client_id and self.handle is None and self.last_payload:
                self._flush_now()


discord_rpc = DiscordRPC()
