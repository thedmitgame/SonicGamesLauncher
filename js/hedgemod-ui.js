/* === CLEAN MOD MANAGERS UI & LIVE WINDOW FOCUS SYNC === */
(function() {
    let mmPaths = { hmm: '', samm: '', mml: '' };
    const MM_LIST = new Array(
        { id: 'hmm', name: 'HedgeModManager', sub: 'Origins • Generations • Frontiers • Forces' },
        { id: 'samm', name: 'SAModManager', sub: 'Sonic Adventure DX • Adventure 2' },
        { id: 'mml', name: 'Mania Mod Loader', sub: 'Sonic Mania' }
    );

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function detectNeededManager(gameId) {
        if (gameId === 'ext_sadx' || gameId === 'ext_sa2') return 'samm';
        if (gameId === 'mania') return 'mml';
        if (gameId === 'sonic1' || gameId === 'sonic2' || gameId === 'soniccd' || gameId === 'sonic3' || gameId === 'srb2') return '';
        return 'hmm';
    }

    async function refreshManagersState() {
        try {
            const res = await fetch('/api/mod_managers/status');
            const data = await res.json();
            mmPaths = data.managers || { hmm: '', samm: '', mml: '' };
        } catch (_) {}
        renderManagersBox();
    }

    function renderManagersBox() {
        // Полностью прячем старый блок Sonic Mod Manager из index.html
        const smmLbl = document.getElementById('smm-path-label');
        if (smmLbl) {
            const oldWrap = smmLbl.closest('.setting-row-block') || smmLbl.parentElement;
            if (oldWrap && oldWrap.id !== 'sgl-mm-panel') oldWrap.style.display = 'none';
        }

        const list = document.getElementById('settings-list');
        if (!list) return;
        let panel = document.getElementById('sgl-mm-panel');
        if (!panel) {
            panel = mk('div', 'setting-row-block', 'margin-bottom:12px;padding:10px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:10px;');
            panel.id = 'sgl-mm-panel';
            list.prepend(panel);
        }
        panel.innerHTML = '';

        const top = mk('div', '', 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.08);');
        top.appendChild(mk('span', '', 'font-size:12px;font-weight:800;color:#FFD700;', 'Внешние менеджеры модов'));
        const scanBtn = mk('button', 'btn-small', '', 'Автопоиск');
        scanBtn.type = 'button';
        scanBtn.onclick = async () => {
            const r = await fetch('/api/mod_managers/autoscan');
            const d = await r.json();
            mmPaths = d.managers || mmPaths;
            renderManagersBox();
            if (typeof showToast === 'function') showToast('Поиск менеджеров завершён!');
        };
        top.appendChild(scanBtn);
        panel.appendChild(top);

        const grid = mk('div', '', 'display:flex;flex-direction:column;gap:6px;');
        MM_LIST.forEach(m => {
            const curP = mmPaths[m.id] || '';
            const fname = curP ? curP.split('/').pop() : 'Не выбран';

            const row = mk('div', '', 'display:grid;grid-template-columns:1.2fr 1fr auto auto;align-items:center;gap:8px;padding:6px 8px;background:rgba(0,0,0,0.25);border-radius:7px;');
            const titleCol = mk('div', '', 'display:flex;flex-direction:column;');
            titleCol.append(
                mk('span', '', 'font-size:12px;font-weight:700;color:#fff;', m.name),
                mk('span', '', 'font-size:10px;opacity:0.55;', m.sub)
            );

            const pathBadge = mk('div', '', 'font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:' + (curP ? '#4ADE80' : 'rgba(255,255,255,0.4)') + ';', fname);
            pathBadge.title = curP || '';

            const pickB = mk('button', 'btn-small', '', 'Обзор');
            pickB.type = 'button';
            pickB.onclick = async () => {
                const r = await fetch('/api/mod_managers/select', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: m.id }) });
                const d = await r.json();
                if (d.ok) { mmPaths[m.id] = d.path; renderManagersBox(); }
            };

            const runB = mk('button', 'btn-small btn-accent', '', 'Запуск');
            runB.type = 'button';
            runB.disabled = !curP;
            runB.style.opacity = curP ? '1' : '0.35';
            runB.onclick = () => {
                if (!curP) return;
                if (typeof playSfx === 'function') playSfx('launch');
                fetch('/api/mod_managers/launch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: m.id }) });
            };

            row.append(titleCol, pathBadge, pickB, runB);
            grid.appendChild(row);
        });
        panel.appendChild(grid);
    }

    function updateModsModalButton() {
        const dirLabel = document.getElementById('mods-dir-label');
        const bar = dirLabel ? dirLabel.parentElement : null;
        if (!bar) return;

        let btn = document.getElementById('btn-mods-launch-mm');
        const activeG = availableGames.at(selectedIndex);
        const mType = detectNeededManager(activeG ? activeG.id : '');

        if (!mType) {
            if (btn) btn.style.display = 'none';
            return;
        }
        const info = MM_LIST.find(x => x.id === mType);
        if (!btn) {
            btn = mk('button', 'btn-small btn-accent', '', info.name);
            btn.type = 'button';
            btn.id = 'btn-mods-launch-mm';
            bar.appendChild(btn);
        }
        btn.style.display = 'inline-flex';
        btn.textContent = 'Открыть ' + info.name;
        btn.onclick = () => {
            if (mmPaths[mType]) {
                if (typeof playSfx === 'function') playSfx('launch');
                fetch('/api/mod_managers/launch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: mType }) });
            } else if (typeof showToast === 'function') {
                showToast('Сначала укажите путь к ' + info.name + ' в окне Игры и пути', true);
            }
        };
    }

    // Автоматическая синхронизация: когда возвращаешься из окна внешнего менеджера в лаунчер — список модов сам обновляется!
    window.addEventListener('focus', () => {
        const modsModal = document.getElementById('mods-modal');
        if (modsModal && modsModal.classList.contains('active') && typeof refreshModsList === 'function') {
            refreshModsList();
        }
    });

    const _boot = () => {
        const origOpen = window.openSettings;
        if (typeof origOpen === 'function') {
            window.openSettings = async function() {
                const r = await origOpen.apply(this, arguments);
                await refreshManagersState();
                return r;
            };
        }
        const origMods = window.openModsModal;
        if (typeof origMods === 'function') {
            window.openModsModal = async function() {
                await refreshManagersState();
                const r = await origMods.apply(this, arguments);
                updateModsModalButton();
                return r;
            };
        }
        setTimeout(async () => {
            try { await fetch('/api/mod_managers/autoscan'); await refreshManagersState(); } catch (_) {}
        }, 800);
    };

    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', _boot);
    else _boot();
})();

(function() {
    function fixModsHeaderRow() {
        const dirLbl = document.getElementById('mods-dir-label');
        const row = dirLbl ? dirLbl.parentElement : null;
        if (!row) return;
        row.style.display = 'flex';
        row.style.flexWrap = 'nowrap';
        row.style.alignItems = 'center';
        row.style.gap = '6px';
        dirLbl.style.flex = '1';
        dirLbl.style.minWidth = '0';
        dirLbl.style.overflow = 'hidden';
        dirLbl.style.textOverflow = 'ellipsis';
        dirLbl.style.whiteSpace = 'nowrap';
        row.querySelectorAll('button').forEach(b => {
            b.style.whiteSpace = 'nowrap';
            b.style.flexShrink = '0';
        });
        const strayBtn = row.querySelector('#btn-mods-launch-mm, #btn-mods-open-hmm');
        if (strayBtn) {
            const presetSel = document.getElementById('preset-select');
            const presetRow = presetSel ? presetSel.parentElement : null;
            if (presetRow) {
                let bar = document.getElementById('sgl-ext-mm-bar');
                if (!bar) {
                    bar = document.createElement('div');
                    bar.id = 'sgl-ext-mm-bar';
                    bar.style.cssText = 'display:flex;margin-bottom:6px;';
                    presetRow.before(bar);
                }
                strayBtn.style.width = '100%';
                strayBtn.style.justifyContent = 'center';
                bar.appendChild(strayBtn);
            }
        }
    }
    
    window.addEventListener('DOMContentLoaded', () => setTimeout(fixModsHeaderRow, 200));
})();
