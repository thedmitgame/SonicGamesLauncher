/* --- MODS SEARCH, FILTER, DELETE & CONFLICTS --- */
let modConflictsMap = {};
let modSearchQuery = '';
let modFilterState = 'all';

function ensureModsFilterBar() {
    const listEl = document.getElementById('mods-list-container');
    if (!listEl || document.getElementById('sgl-mods-filter-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'sgl-mods-filter-bar';
    bar.style.cssText = 'display:flex;gap:6px;margin-bottom:10px;align-items:center;flex-wrap:wrap;';
    bar.innerHTML = '<input type="text" id="sgl-mod-search" class="args-input" style="flex:1;min-width:150px;margin-top:0;user-select:text !important;" placeholder="Поиск по установленным модам...">'
        + '<select id="sgl-mod-filter" class="custom-select" style="padding:5px 8px;">'
        + '<option value="all">Все моды</option>'
        + '<option value="on">Активные</option>'
        + '<option value="off">Выключенные</option>'
        + '</select>'
        + '<button type="button" class="btn-small" onclick="disableAllMods()" title="Отключить все активные моды">Откл. все</button>';
    listEl.before(bar);
    document.getElementById('sgl-mod-search').oninput = function() {
        modSearchQuery = this.value.trim().toLowerCase();
        renderModsFromCache();
    };
    document.getElementById('sgl-mod-filter').onchange = function() {
        modFilterState = this.value;
        renderModsFromCache();
    };
    const origSw = window.switchModsSourceTab;
    if (typeof origSw === 'function' && !window._modsFilterTabWrapped) {
        window._modsFilterTabWrapped = true;
        window.switchModsSourceTab = function(mode) {
            const res = origSw.apply(this, arguments);
            const fBar = document.getElementById('sgl-mods-filter-bar');
            if (fBar) fBar.style.display = (mode === 'gb') ? 'none' : 'flex';
            return res;
        };
    }
}

async function disableAllMods() {
    const activeGame = availableGames.at(selectedIndex);
    if (!activeGame || currentModsCache.length === 0) return;
    if (!(await askDialog('Отключить все активные моды для этой игры?', null))) return;
    playSfx('switch');
    await fetch('/api/mods/disable_all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: activeGame.id })
    });
    showToast('Все моды отключены');
    await refreshModsList();
}

async function deleteInstalledMod(idx) {
    const activeGame = availableGames.at(selectedIndex);
    const mod = currentModsCache.at(idx);
    if (!activeGame || !mod) return;
    if (!(await askDialog('Удалить мод «' + (mod.title || mod.name || mod.id) + '» с диска безвозвратно?', null))) return;
    const res = await fetch('/api/mods/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: activeGame.id, modId: mod.id })
    });
    const data = await res.json();
    if (data.ok) {
        playSfx('close_menu');
        showToast('Мод удалён');
        await refreshModsList();
    } else {
        showToast('Ошибка удаления: ' + (data.error || 'неизвестная ошибка'), true);
    }
}

async function checkModsConflicts() {
    const activeGame = availableGames.at(selectedIndex);
    if (!activeGame) return;
    playSfx('switch');
    const res = await fetch('/api/mods/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: activeGame.id })
    });
    const data = await res.json();
    modConflictsMap = data.conflicts || {};
    if (Object.keys(modConflictsMap).length === 0) {
        showToast('Конфликтов между активными модами нет!');
    }
    renderModsFromCache();
}

async function moveModPriority(idx, dir) {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= currentModsCache.length) return;
    const activeGame = availableGames.at(selectedIndex);
    if (!activeGame) return;
    playSfx('switch');
    const tmp = currentModsCache.at(idx);
    currentModsCache[idx] = currentModsCache.at(nextIdx);
    currentModsCache[nextIdx] = tmp;
    renderModsFromCache();
    await fetch('/api/mods/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            gameId: activeGame.id,
            mods: currentModsCache.map(m => ({ id: m.id, enabled: Boolean(m.enabled) }))
        })
    });
}

function renderModsFromCache() {
    ensureModsFilterBar();
    const activeGame = availableGames.at(selectedIndex);
    const listEl = document.getElementById('mods-list-container');
    if (!listEl || !activeGame) return;
    listEl.innerHTML = '';
    if (currentModsCache.length === 0) {
        listEl.innerHTML = '<div style="text-align:center;opacity:0.6;padding:20px;">Моды не обнаружены. Перетащите .ZIP / .7Z архив с модом прямо в окно лаунчера!</div>';
        return;
    }
    const filtered = currentModsCache
        .map((mod, realIdx) => ({ mod, realIdx }))
        .filter(({ mod }) => {
            if (modFilterState === 'on' && !mod.enabled) return false;
            if (modFilterState === 'off' && mod.enabled) return false;
            if (modSearchQuery) {
                const hay = ((mod.title || mod.name || mod.id) + ' ' + mod.author + ' ' + mod.id).toLowerCase();
                if (!hay.includes(modSearchQuery)) return false;
            }
            return true;
        });
    if (filtered.length === 0) {
        listEl.innerHTML = '<div style="text-align:center;opacity:0.6;padding:20px;">По вашему фильтру модов не найдено</div>';
        return;
    }
    const isFiltering = Boolean(modSearchQuery || modFilterState !== 'all');
    filtered.forEach(({ mod, realIdx }) => {
        const item = document.createElement('div');
        item.className = 'mod-item';
        const warns = modConflictsMap[mod.id] || [];
        if (warns.length > 0) {
            item.style.borderColor = '#eab308';
            item.style.background = 'rgba(234, 179, 8, 0.12)';
        }
        const thumbHtml = mod.thumb ? '<img src="' + mod.thumb + '" style="width:46px;height:46px;border-radius:8px;object-fit:cover;flex-shrink:0;border:1px solid rgba(255,255,255,0.16);" alt="">' : '';
        const verBadge = mod.version ? '<span style="font-size:10px;background:rgba(255,255,255,0.12);padding:1px 6px;border-radius:6px;margin-left:6px;font-weight:600;color:#FFD700;">v' + mod.version + '</span>' : '';
        const descHtml = mod.desc ? '<div style="font-size:11px;color:rgba(255,255,255,0.68);margin-top:3px;">' + mod.desc + '</div>' : '';
        const warnHtml = warns.length > 0 ? '<div style="font-size:11px;color:#facc15;margin-top:3px;">Конфликт файлов (' + warns.length + '): ' + warns.at(0) + '</div>' : '';
        const upDis = (realIdx === 0 || isFiltering);
        const dnDis = (realIdx === currentModsCache.length - 1 || isFiltering);
        const leftBtns = document.createElement('div');
        leftBtns.style.cssText = 'display:flex;flex-direction:column;gap:3px;flex-shrink:0;';
        leftBtns.innerHTML = '<button type="button" class="btn-small" style="padding:2px 7px;font-size:10px;' + (upDis ? 'opacity:0.3;' : '') + '" ' + (upDis ? 'disabled' : '') + ' title="Повысить приоритет">▲</button>'
            + '<button type="button" class="btn-small" style="padding:2px 7px;font-size:10px;' + (dnDis ? 'opacity:0.3;' : '') + '" ' + (dnDis ? 'disabled' : '') + ' title="Понизить приоритет">▼</button>';
        const bList = leftBtns.querySelectorAll('button');
        bList.item(0).onclick = () => moveModPriority(realIdx, -1);
        bList.item(1).onclick = () => moveModPriority(realIdx, 1);

        const infoDiv = document.createElement('div');
        infoDiv.className = 'mod-info';
        infoDiv.style.flexGrow = '1';
        infoDiv.innerHTML = '<div class="mod-title" style="display:flex;align-items:center;flex-wrap:wrap;"><span>' + (mod.title || mod.name || mod.id) + '</span>' + verBadge + '</div>'
            + '<div class="mod-author">Автор: ' + mod.author + ' • Приоритет #' + (realIdx + 1) + '</div>' + descHtml + warnHtml;

        const rightBox = document.createElement('div');
        rightBox.style.cssText = 'display:flex;align-items:center;gap:8px;flex-shrink:0;';
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.className = 'mod-toggle';
        chk.checked = Boolean(mod.enabled);
        chk.onchange = () => toggleMod(activeGame.id, mod.id, chk.checked).then(() => { if (modFilterState !== 'all') renderModsFromCache(); });
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'btn-small btn-clear';
        delBtn.style.padding = '4px 8px';
        delBtn.title = 'Удалить мод с диска';
        delBtn.textContent = '×';
        delBtn.onclick = () => deleteInstalledMod(realIdx);
        rightBox.append(chk, delBtn);

        item.appendChild(leftBtns);
        if (thumbHtml) item.insertAdjacentHTML('beforeend', thumbHtml);
        item.append(infoDiv, rightBox);
        listEl.appendChild(item);
    });
}

window.addEventListener('dragover', (e) => {
    e.preventDefault();
    const dz = document.getElementById('global-drop-zone');
    if (dz) dz.style.display = 'flex';
});
window.addEventListener('dragleave', (e) => {
    if (e.target && e.target.id === 'global-drop-zone') e.target.style.display = 'none';
});
window.addEventListener('drop', async (e) => {
    e.preventDefault();
    const dz = document.getElementById('global-drop-zone');
    if (dz) dz.style.display = 'none';
    const file = e.dataTransfer?.files?.item(0);
    if (!file) return;
    const fname = file.name.toLowerCase();
    if (fname.endsWith('.zip') || fname.endsWith('.7z') || fname.endsWith('.rar')) {
        const activeGame = availableGames.at(selectedIndex);
        if (!activeGame) return;
        showToast('Распаковка и установка мода...');
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const res = await fetch('/api/mods/install_zip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: activeGame.id, fileName: file.name, zipBase64: ev.target.result })
            });
            const data = await res.json();
            if (data.ok) { playSfx('launch'); showToast('Мод успешно установлен!'); openModsModal(); }
            else showToast('Ошибка установки мода: ' + (data.error || 'неизвестная ошибка'), true);
        };
        reader.readAsDataURL(file);
    } else if (fname.endsWith('.sonicpack')) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const res = await fetch('/api/theme/import_pack_b64', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packBase64: ev.target.result })
            });
            const data = await res.json();
            if (data.ok) { playSfx('launch'); await loadGames(false); showToast('Пакет темы (.sonicpack) установлен!'); }
            else showToast('Ошибка импорта .sonicpack: ' + (data.error || 'неизвестная ошибка'), true);
        };
        reader.readAsDataURL(file);
    } else if (fname.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target.result);
                currentDesign = { ...defaultDesign, ...parsed };
                applyDesign(currentDesign);
                renderFloatingObjects();
                playSfx('launch');
            } catch (_) { showToast('Неверный формат JSON темы', true); }
        };
        reader.readAsText(file);
    }
});

/* --- SCREENSHOTS LIGHTBOX 2.0 --- */
(function() {
    function initLightboxControls() {
        const lb = document.getElementById('shot-lightbox');
        if (!lb || document.getElementById('sgl-shot-actions')) return;
        const bar = document.createElement('div');
        bar.id = 'sgl-shot-actions';
        bar.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);display:flex;gap:10px;background:rgba(15,21,36,0.92);padding:8px 14px;border-radius:30px;border:1px solid rgba(255,215,0,0.4);box-shadow:0 10px 30px rgba(0,0,0,0.85);z-index:210;';
        bar.onclick = (e) => e.stopPropagation();
        const copyIcon = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
        const delIcon = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';
        bar.innerHTML = '<button type="button" class="settings-btn" style="padding:7px 14px;" onclick="copyActiveScreenshot()"><span class="btn-inner-wrap">' + copyIcon + '<span>Скопировать</span></span></button>'
            + '<button type="button" class="settings-btn" style="padding:7px 14px;border-color:rgba(239,68,68,0.55);color:#fca5a5;" onclick="deleteActiveScreenshot()"><span class="btn-inner-wrap">' + delIcon + '<span>Удалить снимок</span></span></button>';
        lb.appendChild(bar);
    }
    if (document.body) initLightboxControls();
    else window.addEventListener('DOMContentLoaded', initLightboxControls);

    window.copyActiveScreenshot = async function() {
        const imgEl = document.getElementById('shot-lightbox-img');
        if (!imgEl || !imgEl.src) return;
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = imgEl.src;
            await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
            const c = document.createElement('canvas');
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;
            c.getContext('2d').drawImage(img, 0, 0);
            const blob = await new Promise(r => c.toBlob(r, 'image/png'));
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            if (typeof playSfx === 'function') playSfx('launch');
            showToast('Скриншот скопирован в буфер обмена!');
        } catch (_) {
            showToast('Не удалось скопировать скриншот в буфер', true);
        }
    };

    window.deleteActiveScreenshot = async function() {
        const imgEl = document.getElementById('shot-lightbox-img');
        const activeGame = availableGames.at(selectedIndex);
        if (!imgEl || !imgEl.src || !activeGame) return;
        const rawLast = imgEl.src.split('/').pop() || '';
        const fileName = decodeURIComponent(rawLast.split('?').at(0) || '');
        if (!(await askDialog('Удалить этот скриншот с диска?', null))) return;
        const res = await fetch('/api/screenshots/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId: activeGame.id, fileName })
        });
        const data = await res.json();
        if (data.ok) {
            playSfx('close_menu');
            document.getElementById('shot-lightbox').classList.remove('active');
            showToast('Скриншот удалён');
            await openShotsModal();
        } else {
            showToast('Ошибка удаления: ' + (data.error || ''), true);
        }
    };
})();
