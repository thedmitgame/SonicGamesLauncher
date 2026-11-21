/* --- МОДУЛЬ 2: ОКНО ПРОГРЕССА, ИЗУМРУДОВ ХАОСА И ДОСТИЖЕНИЙ --- */
const EMERALD_COLORS = ['#22c55e', '#3b82f6', '#eab308', '#ef4444', '#a855f7', '#06b6d4', '#f8fafc'];

async function openProgressModal() {
    const activeGame = availableGames.at(selectedIndex);
    if (!activeGame) return;
    playSfx('open_menu');
    document.getElementById('progress-modal-title').innerText = `Прогресс: ${activeGame.name}`;
    const box = document.getElementById('progress-content');
    box.innerHTML = '<div style="text-align:center;opacity:0.6;padding:20px;">Чтение сохранений...</div>';
    document.getElementById('progress-modal').classList.add('active');

    const res = await fetch(`/api/progress?id=${activeGame.id}`);
    const data = await res.json();

    if (!data.supported) {
        box.innerHTML = `<div style="text-align:center;opacity:0.75;padding:24px;font-size:13px;">${data.note || 'Данные прогресса пока недоступны'}</div>`;
        return;
    }

    let emeraldsHtml = '';
    if (!data.hideEmeralds) {
        const maxEm = data.maxEmeralds ?? 7;
        emeraldsHtml = '<div style="display:flex;justify-content:center;gap:10px;margin:14px 0;">';
        for (let i = 0; i < maxEm; i++) {
            const unlocked = i < (data.emeralds || 0);
            const col = unlocked ? EMERALD_COLORS[i % EMERALD_COLORS.length] : 'rgba(255,255,255,0.12)';
            const glow = unlocked ? `filter:drop-shadow(0 0 8px ${col});` : 'opacity:0.35;';
            emeraldsHtml += `<svg width="34" height="30" viewBox="0 0 32 28" style="${glow}"><polygon points="7,2 25,2 30,9 16,26 2,9" fill="${col}" stroke="rgba(255,255,255,0.7)" stroke-width="1.2"/><polygon points="10,5 22,5 25,9 16,21 7,9" fill="rgba(255,255,255,0.28)"/><line x1="2" y1="9" x2="30" y2="9" stroke="rgba(255,255,255,0.5)" stroke-width="1"/></svg>`;
        }
        emeraldsHtml += '</div>';
    }

    let slotsHtml = '';
    if (data.slots && data.slots.length > 0) {
        slotsHtml = '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px;">';
        data.slots.forEach(s => {
            slotsHtml += `<div style="background:rgba(255,255,255,0.06);padding:8px 12px;border-radius:8px;font-size:12px;">
                <div style="font-weight:700;color:#FFD700;">${s.name}</div>
                <div style="opacity:0.8;margin-top:2px;">${s.info}</div>
            </div>`;
        });
        slotsHtml += '</div>';
    }

    let achHtml = '';
    if (data.achievements && data.achievements.length > 0) {
        achHtml = `<div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.7);margin-bottom:6px;">${data.title || "Достижения"}:</div><div style="display:flex;flex-direction:column;gap:5px;max-height:${data.hideEmeralds ? '300px' : '190px'};overflow-y:auto;padding-right:6px;">`;
        data.achievements.forEach(a => {
            achHtml += `<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.28);padding:7px 12px;border-radius:8px;font-size:12px;gap:8px;">
                <span>${a.name}</span>
                <span style="color:${a.done ? '#4ADE80' : '#64748b'};font-weight:700;flex-shrink:0;">${a.done ? 'Выполнено' : 'Закрыто'}</span>
            </div>`;
        });
        achHtml += '</div>';
    } else {
        achHtml = '<div style="text-align:center;opacity:0.55;font-size:11px;margin-top:6px;">Текстовые описания достижений упакованы внутри ресурсов игры</div>';
    }

    box.innerHTML = emeraldsHtml + slotsHtml + achHtml;
}

function closeProgressModal() {
    playSfx('close_menu');
    document.getElementById('progress-modal').classList.remove('active');
}


/* --- МОДУЛЬ 3: УПАКОВКА И УСТАНОВКА ЕДИНОГО ПАКЕТА .SONICPACK --- */
async function exportSonicPack() {
    syncAllControlsToDesign();
    const fname = await askDialog("Введите имя файла пакета (.sonicpack):", "my_sonic_bundle");
    if (!fname) return;
    const res = await fetch('/api/theme/export_pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: fname, design: currentDesign })
    });
    const data = await res.json();
    if (data.ok) {
        playSfx('launch');
        showToast("Пакет .sonicpack сохранён: " + data.path);
    }
}



/* --- BACKUPS BAR IN PROGRESS MODAL --- */
async function refreshBackupsBar(gameId) {
    const sel = document.getElementById('sgl-backup-select');
    if (!sel) return;
    const res = await fetch('/api/backups/list?id=' + encodeURIComponent(gameId));
    const data = await res.json();
    sel.innerHTML = '';
    const items = data.items || new Array();
    if (items.length === 0) {
        const o = document.createElement('option');
        o.value = '';
        o.textContent = '-- Бэкапов пока нет --';
        sel.appendChild(o);
    } else {
        items.forEach(it => {
            const o = document.createElement('option');
            o.value = it.file;
            o.textContent = it.label;
            sel.appendChild(o);
        });
    }
}

async function createGameSaveBackup() {
    const activeGame = availableGames.at(selectedIndex);
    if (!activeGame) return;
    const note = await askDialog('Подпись к бэкапу (необязательно):', '');
    if (note === null) return;
    const res = await fetch('/api/backups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: activeGame.id, note: note })
    });
    const data = await res.json();
    if (data.ok) {
        if (typeof playSfx === 'function') playSfx('launch');
        showToast('Бэкап сохранений создан!');
        await refreshBackupsBar(activeGame.id);
    } else {
        showToast(data.error || 'Не удалось создать бэкап', true);
    }
}

async function restoreGameSaveBackup() {
    const activeGame = availableGames.at(selectedIndex);
    const file = document.getElementById('sgl-backup-select')?.value;
    if (!activeGame || !file) return;
    if (!(await askDialog('Восстановить этот бэкап? Текущие сохранения будут перезаписаны!', null))) return;
    const res = await fetch('/api/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: activeGame.id, file: file })
    });
    const data = await res.json();
    if (data.ok) {
        if (typeof playSfx === 'function') playSfx('launch');
        showToast('Сохранения успешно восстановлены!');
        await openProgressModal();
    } else {
        showToast(data.error || 'Ошибка восстановления', true);
    }
}

async function deleteGameSaveBackup() {
    const activeGame = availableGames.at(selectedIndex);
    const file = document.getElementById('sgl-backup-select')?.value;
    if (!activeGame || !file) return;
    if (!(await askDialog('Удалить выбранный архив бэкапа?', null))) return;
    const res = await fetch('/api/backups/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: activeGame.id, file: file })
    });
    const data = await res.json();
    if (data.ok) {
        if (typeof playSfx === 'function') playSfx('close_menu');
        showToast('Бэкап удалён');
        await refreshBackupsBar(activeGame.id);
    }
}

function openGameBackupsFolder() {
    const activeGame = availableGames.at(selectedIndex);
    if (activeGame) fetch('/api/backups/open_dir?id=' + encodeURIComponent(activeGame.id));
}

(function() {
    const origOpenProg = window.openProgressModal;
    if (typeof origOpenProg === 'function' && !window._progBackupsWrapped) {
        window._progBackupsWrapped = true;
        window.openProgressModal = async function() {
            await origOpenProg.apply(this, arguments);
            const activeGame = availableGames.at(selectedIndex);
            const box = document.getElementById('progress-content');
            if (!activeGame || !box) return;
            document.getElementById('sgl-backups-bar')?.remove();

            const bar = document.createElement('div');
            bar.id = 'sgl-backups-bar';
            bar.style.cssText = 'background:rgba(0,0,0,0.32);border:1px solid rgba(255,215,0,0.22);border-radius:10px;padding:10px;margin-bottom:12px;display:flex;flex-direction:column;gap:8px;';

            const row1 = document.createElement('div');
            row1.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:6px;';
            const titleSpan = document.createElement('span');
            titleSpan.style.cssText = 'font-size:12px;font-weight:700;color:#FFD700;';
            titleSpan.textContent = 'Резервные копии сохранений';

            const btnGroup = document.createElement('div');
            btnGroup.style.cssText = 'display:flex;gap:5px;';
            const bAdd = document.createElement('button');
            bAdd.type = 'button'; bAdd.className = 'btn-small btn-accent';
            bAdd.textContent = '+ Создать бэкап'; bAdd.onclick = createGameSaveBackup;
            const bDir = document.createElement('button');
            bDir.type = 'button'; bDir.className = 'btn-small';
            bDir.textContent = 'Папка'; bDir.onclick = openGameBackupsFolder;
            btnGroup.append(bAdd, bDir);
            row1.append(titleSpan, btnGroup);

            const row2 = document.createElement('div');
            row2.style.cssText = 'display:flex;gap:6px;align-items:center;';
            const sel = document.createElement('select');
            sel.id = 'sgl-backup-select'; sel.className = 'custom-select';
            sel.style.cssText = 'flex:1;padding:5px 8px;';
            const bRes = document.createElement('button');
            bRes.type = 'button'; bRes.className = 'btn-small';
            bRes.textContent = 'Восстановить'; bRes.onclick = restoreGameSaveBackup;
            const bDel = document.createElement('button');
            bDel.type = 'button'; bDel.className = 'btn-small btn-clear';
            bDel.textContent = '×'; bDel.title = 'Удалить бэкап'; bDel.onclick = deleteGameSaveBackup;
            row2.append(sel, bRes, bDel);

            bar.append(row1, row2);
            box.prepend(bar);
            await refreshBackupsBar(activeGame.id);
        };
    }
})();
