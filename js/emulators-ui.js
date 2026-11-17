/* === EMULATORS & ROM GAMES UI === */
let emulatorsList = [];

(function() {
    const origLoad = window.loadGames;
    if (typeof origLoad === 'function') {
        window.loadGames = async function() {
            await origLoad.apply(this, arguments);
            emulatorsList = window._cachedEmulators || [];
        };
    }

    const origOpenSet = window.openSettings;
    if (typeof origOpenSet === 'function') {
        window.openSettings = async function() {
            await origOpenSet.apply(this, arguments);
            emulatorsList = window._cachedEmulators || [];
            window.renderEmulatorsPanel();
        };
    }
})();

window.renderEmulatorsPanel = function() {
    const list = document.getElementById('sgl-emu-container') || document.getElementById('settings-list');
    if (!list) return;
    list.innerHTML = '';
    if (!Array.isArray(emulatorsList) || emulatorsList.length === 0) return;

    const box = document.createElement('div');
    box.id = 'sgl-emu-panel';
    box.style.cssText = 'background:rgba(0,0,0,0.28);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:12px;margin-bottom:12px;';

    const rowsHtml = emulatorsList.map(e => {
        const exeName = e.path ? e.path.split(/[\\/]/).pop() : '';
        const safeName = String(e.name || '').replace(/'/g, '');
        return '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;">'
            + '<div style="overflow:hidden;"><b style="color:#FFD700;">' + e.name + '</b> <span style="opacity:0.6;font-size:11px;">(' + exeName + ')</span>'
            + '<div style="font-size:10.5px;opacity:0.55;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Аргументы: ' + e.args + '</div></div>'
            + '<div style="display:flex;gap:5px;flex-shrink:0;">'
            + '<button type="button" class="btn-small btn-accent" onclick="addRomForEmulator(\'' + e.id + '\', \'' + safeName + '\')">+ Добавить ROM</button>'
            + '<button type="button" class="btn-small btn-clear" onclick="deleteEmulator(\'' + e.id + '\')">×</button>'
            + '</div></div>';
    }).join('');

    box.innerHTML = '<div style="font-size:13px;font-weight:700;color:#FFD700;">Эмуляторы и ROM-игры</div>' + rowsHtml;
    list.appendChild(box);
};

window.addNewEmulator = async function() {
    const name = await askDialog("Название эмулятора (например: Dolphin / RetroArch Genesis):", "");
    if (!name || !name.trim()) return;
    const args = await askDialog('Шаблон аргументов ({rom} = путь к игре). Для большинства оставьте "{rom}":', '"{rom}"');
    if (args === null) return;

    showToast("Выберите .exe файл эмулятора в открывшемся окне...");
    const res = await fetch('/api/emulators/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), args: args.trim() || '"{rom}"' })
    });
    const data = await res.json();
    if (data.ok) {
        if (typeof playSfx === 'function') playSfx('launch');
        showToast("Эмулятор подключён!");
        await loadGames(false);
        await openSettings();
    }
};

window.deleteEmulator = async function(emuId) {
    if (!(await askDialog("Удалить этот эмулятор из списка?", null))) return;
    await fetch('/api/emulators/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emuId })
    });
    await loadGames(false);
    await openSettings();
};

window.addRomForEmulator = async function(emuId, emuName) {
    const name = await askDialog(`Название игры для ${emuName} (например: Sonic Riders):`, "");
    if (!name || !name.trim()) return;
    const tag = (await askDialog("Подпись консоли (например: GAMECUBE • ROM):", `${emuName.toUpperCase()} • ROM`)) || "EMULATOR ROM";
    const color = (await askDialog("Цвет подсветки карточки (HEX):", "#8B5CF6")) || "#8B5CF6";

    showToast("Выберите файл образа игры (ROM / ISO / CHD / BIN)...");
    const res = await fetch('/api/games/add_rom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emuId, name: name.trim(), tag: tag.trim(), color: color.trim() })
    });
    const data = await res.json();
    if (data.ok) {
        if (typeof playSfx === 'function') playSfx('launch');
        showToast(`Игра «${name.trim()}» добавлена в карусель!`);
        await loadGames(false);
        await openSettings();
    }
};
