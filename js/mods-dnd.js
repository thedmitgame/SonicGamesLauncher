/* --- МОДУЛЬ 1: DRAG & DROP УСТАНОВКА ZIP-МОДОВ И ДЕТЕКТОР КОНФЛИКТОВ --- */
let modConflictsMap = {};

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
    const count = Object.keys(modConflictsMap).length;
    if (count === 0) {
        showToast("Конфликтов между активными модами нет!");
    }
    renderModsFromCache();
}

async function moveModPriority(idx, dir) {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= currentModsCache.length) return;
    const activeGame = availableGames.at(selectedIndex);
    if (!activeGame) return;

    playSfx('switch');
    const tmp = currentModsCache[idx];
    currentModsCache[idx] = currentModsCache[nextIdx];
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
    const activeGame = availableGames.at(selectedIndex);
    const listEl = document.getElementById('mods-list-container');
    if (!listEl || !activeGame) return;
    listEl.innerHTML = '';

    if (currentModsCache.length === 0) {
        listEl.innerHTML = '<div style="text-align:center;opacity:0.6;padding:20px;">Моды не обнаружены. Перетащите .ZIP архив с модом прямо в окно лаунчера!</div>';
        return;
    }

    currentModsCache.forEach((mod, idx) => {
        const item = document.createElement('div');
        item.className = 'mod-item';
        const warns = modConflictsMap[mod.id] || [];
        if (warns.length > 0) {
            item.style.borderColor = '#eab308';
            item.style.background = 'rgba(234, 179, 8, 0.12)';
        }

        const thumbHtml = mod.thumb
            ? `<img src="${mod.thumb}" style="width:46px;height:46px;border-radius:8px;object-fit:cover;flex-shrink:0;border:1px solid rgba(255,255,255,0.16);" alt="">`
            : '';
        const verBadge = mod.version
            ? `<span style="font-size:10px;background:rgba(255,255,255,0.12);padding:1px 6px;border-radius:6px;margin-left:6px;font-weight:600;color:#FFD700;">v${mod.version}</span>`
            : '';
        const descHtml = mod.desc
            ? `<div style="font-size:11px;color:rgba(255,255,255,0.68);margin-top:3px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${mod.desc}</div>`
            : '';
        const warnHtml = warns.length > 0
            ? `<div style="font-size:11px;color:#facc15;margin-top:3px;">Конфликт файлов (${warns.length}): ${warns.at(0)}</div>`
            : '';

        item.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:3px;flex-shrink:0;">
                <button type="button" class="btn-small" style="padding:2px 7px;font-size:10px;" onclick="moveModPriority(${idx}, -1)" ${idx === 0 ? 'disabled style="opacity:0.3;padding:2px 7px;font-size:10px;"' : ''} title="Повысить приоритет">▲</button>
                <button type="button" class="btn-small" style="padding:2px 7px;font-size:10px;" onclick="moveModPriority(${idx}, 1)" ${idx === currentModsCache.length - 1 ? 'disabled style="opacity:0.3;padding:2px 7px;font-size:10px;"' : ''} title="Понизить приоритет">▼</button>
            </div>
            ${thumbHtml}
            <div class="mod-info" style="flex-grow:1;">
                <div class="mod-title" style="display:flex;align-items:center;flex-wrap:wrap;"><span>${mod.title}</span>${verBadge}</div>
                <div class="mod-author">Автор: ${mod.author} • Приоритет #${idx + 1}</div>
                ${descHtml}
                ${warnHtml}
            </div>
            <input type="checkbox" class="mod-toggle" ${mod.enabled ? 'checked' : ''} 
                   onchange="toggleMod('${activeGame.id}', '${mod.id}', this.checked)">
        `;
        listEl.appendChild(item);
    });
}

window.addEventListener('dragover', (e) => {
    e.preventDefault();
    const dz = document.getElementById('global-drop-zone');
    if (dz) dz.style.display = 'flex';
});

window.addEventListener('dragleave', (e) => {
    if (e.target && e.target.id === 'global-drop-zone') {
        e.target.style.display = 'none';
    }
});

window.addEventListener('drop', async (e) => {
    e.preventDefault();
    const dz = document.getElementById('global-drop-zone');
    if (dz) dz.style.display = 'none';
    const file = e.dataTransfer?.files?.item(0);
    if (!file) return;

    const fname = file.name.toLowerCase();
    if (fname.endsWith('.zip')) {
        const activeGame = availableGames.at(selectedIndex);
        if (!activeGame) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const res = await fetch('/api/mods/install_zip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameId: activeGame.id,
                    fileName: file.name,
                    zipBase64: ev.target.result
                })
            });
            const data = await res.json();
            if (data.ok) {
                playSfx('launch');
                openModsModal();
            } else {
                showToast("Ошибка установки мода: " + (data.error || "неизвестная ошибка"), true);
            }
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
            if (data.ok) {
                playSfx('launch');
                await loadGames(false);
                showToast("Пакет темы (.sonicpack) установлен!");
            } else {
                showToast("Ошибка импорта .sonicpack: " + (data.error || "неизвестная ошибка"), true);
            }
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
            } catch (err) {
                showToast("Неверный формат JSON темы", true);
            }
        };
        reader.readAsText(file);
    }
});


