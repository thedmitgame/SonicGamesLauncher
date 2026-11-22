/* === EMULATORS 2.0: PURE DOM EDITION === */
let emulatorsCache = new Array();
let scannedRomsCache = new Array();
let activeCarouselCategory = 'all';
const DQ = String.fromCharCode(34);

const EMU_PRESETS = new Array(
    { label: '-- Выбрать готовый шаблон эмулятора --', name: '', args: DQ + '{rom}' + DQ },
    { label: 'Dolphin (GameCube / Wii)', name: 'Dolphin', args: '-b -e ' + DQ + '{rom}' + DQ },
    { label: 'PCSX2 (PlayStation 2)', name: 'PCSX2', args: '-batch -- ' + DQ + '{rom}' + DQ },
    { label: 'DuckStation (PlayStation 1)', name: 'DuckStation', args: '-batch -- ' + DQ + '{rom}' + DQ },
    { label: 'Flycast (Dreamcast)', name: 'Flycast', args: DQ + '{rom}' + DQ },
    { label: 'PPSSPP (PSP)', name: 'PPSSPP', args: '--fullscreen ' + DQ + '{rom}' + DQ },
    { label: 'RPCS3 (PlayStation 3)', name: 'RPCS3', args: '--no-gui ' + DQ + '{rom}' + DQ },
    { label: 'Xenia (Xbox 360)', name: 'Xenia', args: '--fullscreen ' + DQ + '{rom}' + DQ },
    { label: 'Kega Fusion (Mega Drive / CD / 32X)', name: 'Kega Fusion', args: DQ + '{rom}' + DQ + ' -fullscreen' },
    { label: 'RetroArch (Genesis Plus GX)', name: 'RetroArch MD', args: '-f -L cores/genesis_plus_gx_libretro.dll ' + DQ + '{rom}' + DQ }
);

function mkEl(tag, cls, css, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (css) e.style.cssText = css;
    if (txt !== undefined && txt !== null) e.textContent = txt;
    return e;
}

function mkBtn(cls, css, txt, fn) {
    const b = mkEl('button', cls, css, txt);
    b.type = 'button';
    b.onclick = fn;
    return b;
}

function mkInp(id, ph, ro, css) {
    const i = mkEl('input', 'args-input', 'margin-top:0;user-select:text !important;' + (css || ''));
    i.type = 'text';
    i.id = id;
    i.placeholder = ph;
    if (ro) i.readOnly = true;
    return i;
}

function stripRomTags(raw) {
    let out = '', depth = 0;
    for (const ch of raw) {
        const c = ch.charCodeAt(0);
        if (c === 40 || c === 91) depth++;
        else if ((c === 41 || c === 93) && depth > 0) depth--;
        else if (depth === 0) out += ch;
    }
    return out.replace(/_/g, ' ').trim() || raw;
}

function ensureEmulatorsModal() {
    let m = document.getElementById('emulators-modal');
    if (m) return m;

    m = mkEl('div', 'modal-backdrop', 'z-index:9800;');
    m.id = 'emulators-modal';

    const box = mkEl('div', 'modal-box', 'width:620px;max-width:95vw;');
    const h2 = mkEl('h2', '', '', 'Подключение эмуляторов и ROM-игр');
    const wrap = mkEl('div', 'mods-list', 'max-height:460px;padding-right:6px;');

    const sec1 = mkEl('div', '', 'background:rgba(255,255,255,0.04);padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);');
    const s1Top = mkEl('div', '', 'display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;');
    const preSel = mkEl('select', 'custom-select', 'padding:4px 8px;font-size:11px;');
    preSel.id = 'emu-preset-sel';
    EMU_PRESETS.forEach((p, idx) => {
        const o = mkEl('option', '', '', p.label);
        o.value = String(idx);
        preSel.appendChild(o);
    });
    preSel.onchange = () => applyEmuPreset(preSel.value);
    s1Top.append(mkEl('div', '', 'font-size:12px;font-weight:700;color:#FFD700;', '1. Добавить внешний эмулятор'), preSel);

    const s1Row1 = mkEl('div', '', 'display:flex;gap:6px;margin-bottom:6px;');
    s1Row1.append(mkInp('emu-name-inp', 'Название (например: Dolphin)', false, 'flex:1;'), mkBtn('btn-small btn-accent', '', 'Выбрать .EXE', browseNewEmuExe));

    const exeInp = mkInp('emu-exe-inp', 'Путь к .exe эмулятора...', true, 'margin-bottom:6px;width:100%;');
    const s1Row2 = mkEl('div', '', 'display:flex;gap:6px;align-items:center;');
    const argsInp = mkInp('emu-args-inp', 'Шаблон аргументов ({rom})', false, 'flex:1;');
    argsInp.value = DQ + '{rom}' + DQ;
    s1Row2.append(argsInp, mkBtn('btn-save', 'flex:0 0 auto;padding:8px 16px;', '+ Сохранить', saveNewEmulator));
    sec1.append(s1Top, s1Row1, exeInp, s1Row2);

    const savedList = mkEl('div', '', 'display:flex;flex-direction:column;gap:6px;margin-top:6px;');
    savedList.id = 'emu-saved-list';

    const sec2 = mkEl('div', '', 'background:rgba(59,130,246,0.08);padding:12px;border-radius:10px;border:1px solid rgba(59,130,246,0.28);margin-top:8px;');
    const s2Top = mkEl('div', '', 'display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;');
    s2Top.append(mkEl('div', '', 'font-size:12px;font-weight:700;color:#60a5fa;', '2. Добавить ROM / ISO в карусель'), mkBtn('btn-small btn-accent', '', 'Сканировать папку с ROM-ами', scanRomFolderForEmulator));

    const s2Row1 = mkEl('div', '', 'display:flex;gap:6px;margin-bottom:6px;');
    const romSel = mkEl('select', 'custom-select', 'flex:1;');
    romSel.id = 'rom-emu-select';
    s2Row1.append(romSel, mkInp('rom-title-inp', 'Название игры (напр. Sonic Heroes)', false, 'flex:1.2;'));

    const s2Row2 = mkEl('div', '', 'display:flex;gap:6px;');
    s2Row2.append(mkInp('rom-path-inp', 'Путь к .iso / .rvz / .bin / .md...', true, 'flex:1;'), mkBtn('btn-small', '', 'Обзор ROM', browseRomFile), mkBtn('btn-save', 'flex:0 0 auto;padding:8px 14px;', 'В карусель', addRomToCarousel));

    const batchBox = mkEl('div', '', 'display:none;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.12);');
    batchBox.id = 'rom-batch-box';
    const bTop = mkEl('div', '', 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:6px;flex-wrap:wrap;');
    const bTitle = mkEl('span', '', 'font-size:11px;font-weight:700;color:#FFD700;', 'Найдено образов: 0');
    bTitle.id = 'rom-batch-title';
    const bBtns = mkEl('div', '', 'display:flex;gap:5px;');
    bBtns.append(mkBtn('btn-small', '', 'Все', () => toggleAllBatchRoms(true)), mkBtn('btn-small', '', 'Снять', () => toggleAllBatchRoms(false)), mkBtn('btn-small btn-accent', '', '+ Импортировать выбранные', confirmBatchAddRoms));
    bTop.append(bTitle, bBtns);

    const bList = mkEl('div', '', 'max-height:150px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;');
    bList.id = 'rom-batch-list';
    batchBox.append(bTop, bList);
    sec2.append(s2Top, s2Row1, s2Row2, batchBox);

    wrap.append(sec1, savedList, sec2);
    const acts = mkEl('div', 'modal-actions', '');
    acts.appendChild(mkBtn('btn-cancel', 'flex:1;', 'Закрыть', () => m.classList.remove('active')));
    box.append(h2, wrap, acts);
    m.appendChild(box);
    document.body.appendChild(m);
    return m;
}

function applyEmuPreset(idxStr) {
    const p = EMU_PRESETS.at(Number(idxStr));
    if (!p || !p.name) return;
    document.getElementById('emu-name-inp').value = p.name;
    document.getElementById('emu-args-inp').value = p.args;
    if (typeof playSfx === 'function') playSfx('switch');
}

async function openEmulatorsModal() {
    const m = ensureEmulatorsModal();
    const bBox = document.getElementById('rom-batch-box');
    if (bBox) bBox.style.display = 'none';
    m.classList.add('active');
    if (typeof playSfx === 'function') playSfx('open_menu');
    try {
        await refreshEmulatorsData();
    } catch (err) {
        console.error('Emulators load error:', err);
    }
}
window.openEmulatorsModal = openEmulatorsModal;
window.openEmuModal = openEmulatorsModal;

async function refreshEmulatorsData() {
    const res = await fetch('/api/games');
    const data = await res.json();
    emulatorsCache = data.emulators || new Array();

    const listEl = document.getElementById('emu-saved-list');
    const selEl = document.getElementById('rom-emu-select');
    if (!listEl || !selEl) return;
    listEl.innerHTML = '';
    selEl.innerHTML = '';

    if (emulatorsCache.length === 0) {
        listEl.appendChild(mkEl('div', '', 'font-size:11px;opacity:0.55;text-align:center;padding:4px;', 'Пока не подключено ни одного эмулятора'));
        const emptyOpt = mkEl('option', '', '', '-- Сначала добавьте эмулятор выше --');
        emptyOpt.value = '';
        selEl.appendChild(emptyOpt);
        return;
    }

    emulatorsCache.forEach(emu => {
        const row = mkEl('div', 'mod-item', 'padding:8px 12px;');
        const info = mkEl('div', 'mod-info', '');
        info.append(
            mkEl('div', 'mod-title', '', emu.name),
            mkEl('div', 'mod-author', '', (emu.path || emu.exe || '') + ' • ' + (emu.args || (DQ + '{rom}' + DQ)))
        );
        row.append(info, mkBtn('btn-small btn-clear', '', '×', () => deleteEmulator(emu.id)));
        listEl.appendChild(row);

        const opt = mkEl('option', '', '', emu.name);
        opt.value = emu.id;
        selEl.appendChild(opt);
    });
}

async function browseNewEmuExe() {
    const res = await fetch('/api/emulators/browse_exe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const data = await res.json();
    if (data.ok && data.path) {
        document.getElementById('emu-exe-inp').value = data.path;
        const nameInp = document.getElementById('emu-name-inp');
        if (!nameInp.value.trim()) {
            const fname = data.path.split('/').pop();
            const dotPos = fname.lastIndexOf('.');
            const base = dotPos > 0 ? fname.slice(0, dotPos) : fname;
            nameInp.value = base;
            const low = base.toLowerCase();
            const found = EMU_PRESETS.find(p => p.name && low.includes(p.name.toLowerCase().split(' ').at(0)));
            if (found) document.getElementById('emu-args-inp').value = found.args;
        }
    }
}

async function saveNewEmulator() {
    const name = document.getElementById('emu-name-inp').value.trim();
    const exe = document.getElementById('emu-exe-inp').value.trim();
    const args = document.getElementById('emu-args-inp').value.trim() || (DQ + '{rom}' + DQ);
    if (!name || !exe) { showToast('Укажите название и выберите .EXE эмулятора!', true); return; }

    await fetch('/api/emulators/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, path: exe, args: args })
    });
    document.getElementById('emu-name-inp').value = '';
    document.getElementById('emu-exe-inp').value = '';
    document.getElementById('emu-preset-sel').value = '0';
    if (typeof playSfx === 'function') playSfx('launch');
    await refreshEmulatorsData();
}

async function deleteEmulator(id) {
    await fetch('/api/emulators/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emuId: id })
    });
    await refreshEmulatorsData();
}

async function browseRomFile() {
    const res = await fetch('/api/emulators/browse_rom', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const data = await res.json();
    if (data.ok && data.path) {
        document.getElementById('rom-path-inp').value = data.path;
        const titleInp = document.getElementById('rom-title-inp');
        if (!titleInp.value.trim()) {
            const fname = data.path.split('/').pop();
            const dotPos = fname.lastIndexOf('.');
            const rawName = dotPos > 0 ? fname.slice(0, dotPos) : fname;
            titleInp.value = stripRomTags(rawName);
        }
    }
}

async function addRomToCarousel() {
    const emuId = document.getElementById('rom-emu-select').value;
    const name = document.getElementById('rom-title-inp').value.trim();
    const romPath = document.getElementById('rom-path-inp').value.trim();
    if (!emuId || !name || !romPath) { showToast('Выберите эмулятор, название и файл ROM!', true); return; }

    const res = await fetch('/api/emulators/add_rom_direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emuId: emuId, name: name, romPath: romPath })
    });
    const data = await res.json();
    if (data.ok) {
        if (typeof playSfx === 'function') playSfx('launch');
        document.getElementById('rom-title-inp').value = '';
        document.getElementById('rom-path-inp').value = '';
        document.getElementById('emulators-modal').classList.remove('active');
        await loadGames(false);
        if (document.getElementById('settings-modal')?.classList.contains('active') && typeof openSettings === 'function') await openSettings();
        showToast('Игра добавлена в карусель!');
    }
}

async function scanRomFolderForEmulator() {
    const emuId = document.getElementById('rom-emu-select').value;
    if (!emuId) { showToast('Сначала выберите или добавьте эмулятор!', true); return; }
    const res = await fetch('/api/emulators/scan_folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const data = await res.json();
    if (!data.ok) return;

    scannedRomsCache = data.items || new Array();
    const box = document.getElementById('rom-batch-box');
    const list = document.getElementById('rom-batch-list');
    const title = document.getElementById('rom-batch-title');
    box.style.display = 'block';
    list.innerHTML = '';
    title.textContent = 'Найдено новых образов: ' + scannedRomsCache.length;

    if (scannedRomsCache.length === 0) {
        list.appendChild(mkEl('div', '', 'font-size:11px;opacity:0.6;padding:6px;', 'Подходящих новых ROM/ISO файлов в этой папке не найдено'));
        return;
    }

    scannedRomsCache.forEach((it, idx) => {
        const lbl = mkEl('label', '', 'display:flex;align-items:center;gap:8px;padding:5px 8px;background:rgba(0,0,0,0.28);border-radius:6px;font-size:12px;cursor:pointer;');
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.className = 'rom-batch-chk';
        chk.dataset.idx = String(idx);
        chk.checked = true;
        lbl.append(
            chk,
            mkEl('span', '', 'flex:1;font-weight:600;color:#fff;', it.name),
            mkEl('span', '', 'font-size:10px;padding:1px 6px;border-radius:4px;background:rgba(255,215,0,0.16);color:#FFD700;', it.ext)
        );
        list.appendChild(lbl);
    });
}

function toggleAllBatchRoms(state) {
    document.querySelectorAll('.rom-batch-chk').forEach(c => { c.checked = state; });
}

async function confirmBatchAddRoms() {
    const emuId = document.getElementById('rom-emu-select').value;
    if (!emuId) return;
    const chosen = new Array();
    document.querySelectorAll('.rom-batch-chk').forEach(c => {
        if (c.checked) {
            const item = scannedRomsCache.at(Number(c.dataset.idx));
            if (item) chosen.push(item);
        }
    });
    if (chosen.length === 0) { showToast('Отметьте хотя бы одну игру!', true); return; }
    const res = await fetch('/api/emulators/batch_add_roms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emuId: emuId, items: chosen })
    });
    const data = await res.json();
    if (data.ok) {
        if (typeof playSfx === 'function') playSfx('launch');
        document.getElementById('rom-batch-box').style.display = 'none';
        document.getElementById('emulators-modal').classList.remove('active');
        await loadGames(false);
        if (document.getElementById('settings-modal')?.classList.contains('active') && typeof openSettings === 'function') await openSettings();
        showToast('Добавлено игр в карусель: ' + data.added);
    }
}

document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const txt = (btn.textContent || '').trim();
    if (txt.includes('Подключить эмулятор') || txt.includes('Connect Emulator')) {
        e.preventDefault();
        e.stopPropagation();
        openEmulatorsModal();
    }
}, true);

(function() {
    let fullInstalledGames = new Array();

    function ensureCategoryPills() {
        let bar = document.getElementById('sgl-cat-bar');
        const hasEmu = fullInstalledGames.some(g => Boolean(g.emuId));
        const hasCustomPc = fullInstalledGames.some(g => Boolean(g.custom && !g.emuId));
        if (!hasEmu && !hasCustomPc) {
            if (bar) bar.style.display = 'none';
            return;
        }
        if (!bar) {
            const st = mkEl('style', '', '',
                '#sgl-cat-bar{position:fixed;left:50%;transform:translateX(-50%);z-index:68;display:flex;gap:6px;background:rgba(12,18,32,0.72);backdrop-filter:blur(8px);padding:4px 6px;border-radius:20px;border:1px solid rgba(255,255,255,0.12);}'
                + '.sgl-cat-pill{background:transparent;border:none;color:rgba(255,255,255,0.7);font-size:11px;font-weight:700;padding:4px 12px;border-radius:14px;cursor:pointer;transition:0.18s;}'
                + '.sgl-cat-pill:hover{color:#fff;background:rgba(255,255,255,0.08);}'
                + '.sgl-cat-pill.active{background:rgba(255,215,0,0.2);color:#FFD700;}'
                + 'body.hud-editing #sgl-cat-bar{pointer-events:none;opacity:0.5;}'
            );
            document.head.appendChild(st);
            bar = mkEl('div', '', '');
            bar.id = 'sgl-cat-bar';
            const hdr = document.querySelector('header'); if (hdr) hdr.after(bar); else document.body.appendChild(bar);
        }
        bar.style.display = (typeof currentDesign !== 'undefined' && currentDesign?.customLayout?.catbar?.hidden) ? 'none' : 'flex';
        bar.innerHTML = '';
        const tabs = new Array({ id: 'all', label: 'Все игры' }, { id: 'core', label: 'Базовые' });
        if (hasEmu) tabs.push({ id: 'emu', label: 'Эмуляторы' });
        if (hasCustomPc) tabs.push({ id: 'pc', label: 'Сторонние ПК' });
        tabs.forEach(t => {
            const cls = 'sgl-cat-pill' + (activeCarouselCategory === t.id ? ' active' : '');
            bar.appendChild(mkBtn(cls, '', t.label, () => window.switchCarouselCategory(t.id)));
        });
    }

    window.switchCarouselCategory = function(catId) {
        activeCarouselCategory = catId;
        let nextList = fullInstalledGames.slice();
        if (catId === 'core') nextList = fullInstalledGames.filter(g => !g.custom);
        else if (catId === 'emu') nextList = fullInstalledGames.filter(g => Boolean(g.emuId));
        else if (catId === 'pc') nextList = fullInstalledGames.filter(g => Boolean(g.custom && !g.emuId));
        if (nextList.length === 0) {
            activeCarouselCategory = 'all';
            nextList = fullInstalledGames.slice();
        }
        availableGames = nextList;
        selectedIndex = 0;
        if (typeof playSfx === 'function') playSfx('switch');
        if (typeof renderMainScreen === 'function') { const sv = gamesData; gamesData = nextList; renderMainScreen(); gamesData = sv; }
        ensureCategoryPills();
    };

    const origLoad = window.loadGames;
    if (typeof origLoad === 'function' && !window._catLoadWrapped) {
        window._catLoadWrapped = true;
        window.loadGames = async function() {
            const r = await origLoad.apply(this, arguments);
            fullInstalledGames = availableGames.slice();
            if (activeCarouselCategory !== 'all') window.switchCarouselCategory(activeCarouselCategory);
            else ensureCategoryPills();
            return r;
        };
    }
})();
