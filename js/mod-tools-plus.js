/* === AUTONOMOUS PLUGIN: SHARE CODE, SAVE SANDBOX, IPS/BPS PATCHER & PORTABLE EXPORT === */
(function() {
    const SVG_SHARE = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
    const SVG_CHIP = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/></svg>';

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function activeGame() {
        if (typeof availableGames !== 'undefined' && availableGames.length > 0) {
            return availableGames.at(typeof selectedIndex !== 'undefined' ? selectedIndex : 0);
        }
        return null;
    }

    function showMissingModsModal(missing) {
        document.getElementById('sgl-missing-mods-modal')?.remove();
        const bg = mk('div', 'modal-backdrop active', 'z-index:9915;');
        bg.id = 'sgl-missing-mods-modal';
        const box = mk('div', 'modal-box', 'width:460px;max-width:92vw;');
        box.appendChild(mk('div', 'modal-title', 'color:#fde047;', 'Недостающие моды из сборки'));
        const list = mk('div', '', 'display:flex;flex-direction:column;gap:6px;max-height:260px;overflow-y:auto;margin-bottom:12px;');
        missing.forEach(name => {
            const row = mk('div', 'mod-item', 'padding:7px 10px;justify-content:space-between;');
            row.appendChild(mk('span', '', 'font-size:12px;font-weight:700;', name));
            const gb = mk('button', 'btn-small btn-accent', 'font-size:11px;', 'Найти в GameBanana');
            gb.type = 'button';
            gb.onclick = () => window.open('https://gamebanana.com/search?_sModelName=Mod&_sSearchString=' + encodeURIComponent(name), '_blank');
            row.appendChild(gb); list.appendChild(row);
        });
        const cl = mk('button', 'close-modal-btn', '', 'Закрыть');
        cl.type = 'button'; cl.onclick = () => bg.remove();
        box.append(list, cl); bg.appendChild(box); document.body.appendChild(bg);
    }

    function injectModsToolbar() {
        const modal = document.getElementById('mods-modal');
        if (!modal || !modal.classList.contains('active')) return;
        const box = modal.querySelector('.modal-box');
        if (!box || document.getElementById('sgl-modtools-bar')) return;

        const bar = mk('div', 'char-card-cfg', 'margin:8px 0;padding:10px;display:flex;flex-direction:column;gap:8px;');
        bar.id = 'sgl-modtools-bar';

        const r1 = mk('div', '', 'display:flex;gap:6px;flex-wrap:wrap;align-items:center;');
        const bCopy = mk('button', 'btn-small btn-accent', 'display:inline-flex;align-items:center;gap:5px;', '');
        bCopy.type = 'button'; bCopy.innerHTML = SVG_SHARE + '<span>Скопировать код</span>';
        bCopy.onclick = async () => {
            const g = activeGame(); if (!g) return;
            const d = await (await fetch('/api/mods/share_export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gameId: g.id }) })).json();
            if (d.ok && d.code) {
                try { await navigator.clipboard.writeText(d.code); } catch (_) {}
                if (typeof showToast === 'function') showToast('Код сборки скопирован: ' + d.code.slice(0, 22) + '...');
            }
        };

        const bPaste = mk('button', 'btn-small', '', 'Вставить код');
        bPaste.type = 'button';
        bPaste.onclick = async () => {
            const g = activeGame(); if (!g) return;
            const code = window.prompt('Вставьте код сборки (SGL-MODS:...):', '');
            if (!code) return;
            const d = await (await fetch('/api/mods/share_import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gameId: g.id, code }) })).json();
            if (!d.ok) { if (typeof showToast === 'function') showToast('Ошибка кода: ' + d.error, true); return; }
            if (typeof showToast === 'function') showToast('Активировано модов: ' + d.matched);
            if (typeof openModsModal === 'function') openModsModal();
            if (Array.isArray(d.missing) && d.missing.length > 0) showMissingModsModal(d.missing);
        };

        const bExp = mk('button', 'btn-small', '', 'Экспорт портативной сборки (.zip)');
        bExp.type = 'button';
        bExp.onclick = async () => {
            const g = activeGame(); if (!g) return;
            if (typeof showToast === 'function') showToast('Упаковка портативной сборки...');
            const d = await (await fetch('/api/mods/portable_export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gameId: g.id }) })).json();
            if (d.ok) { if (typeof showToast === 'function') showToast('Сборка сохранена: ' + d.zipPath); }
            else { if (typeof showToast === 'function') showToast('Ошибка экспорта: ' + d.error, true); }
        };
        r1.append(bCopy, bPaste, bExp);

        const r2 = mk('label', '', 'display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;');
        const sbChk = document.createElement('input'); sbChk.type = 'checkbox';
        const g = activeGame();
        sbChk.checked = Boolean(g && window.currentDesign && window._sglSandboxMap && window._sglSandboxMap[g.id]);
        sbChk.onchange = async () => {
            const cg = activeGame(); if (!cg) return;
            const d = await (await fetch('/api/mods/sandbox_toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gameId: cg.id, enabled: sbChk.checked }) })).json();
            if (d.ok) {
                window._sglSandboxMap = window._sglSandboxMap || {};
                window._sglSandboxMap[cg.id] = d.enabled;
                if (typeof showToast === 'function') showToast(d.enabled ? 'Песочница сейвов включена' : 'Песочница сейвов отключена');
            }
        };
        r2.append(sbChk, mk('span', '', '', 'Песочница сейвов для модов (изоляция ванильных сейвов)'));
        bar.append(r1, r2);
        const listEl = modal.querySelector('.mods-list') || box.firstElementChild;
        if (listEl) listEl.before(bar); else box.prepend(bar);
    }

    window.openRomPatcherModal = function() {
        document.getElementById('sgl-rompatch-modal')?.remove();
        const bg = mk('div', 'modal-backdrop active', 'z-index:9910;');
        bg.id = 'sgl-rompatch-modal';
        bg.onclick = e => { if (e.target === bg) bg.remove(); };

        const box = mk('div', 'modal-box', 'width:500px;max-width:94vw;display:flex;flex-direction:column;gap:10px;');
        box.appendChild(mk('div', 'modal-title', 'margin:0;', 'Патчер ромхаков (IPS / BPS)'));

        const mkField = (lbl, ph) => {
            const g = mk('div', 'custom-group', 'margin:0;');
            g.appendChild(mk('label', '', '', lbl));
            const inp = mk('input', 'custom-input', 'width:100%;'); inp.type = 'text'; inp.placeholder = ph;
            g.appendChild(inp); return { g, inp };
        };

        const fRom = mkField('Путь к базовому ROM-файлу (.bin / .md / .gen):', 'C:\\Games\\Sonic2.bin');
        const fPat = mkField('Путь к файлу патча (.ips или .bps):', 'C:\\Downloads\\hack.bps');
        const status = mk('div', '', 'font-size:12px;color:#93c5fd;min-height:18px;', '');

        let lastOut = '';
        const acts = mk('div', '', 'display:flex;gap:8px;flex-wrap:wrap;');
        const bApply = mk('button', 'btn-small btn-accent', 'padding:8px 14px;font-weight:800;', 'Применить патч');
        bApply.type = 'button';
        const bAdd = mk('button', 'btn-small', 'padding:8px 12px;display:none;', 'Добавить в библиотеку');
        bAdd.type = 'button';

        bApply.onclick = async () => {
            status.textContent = 'Применение патча...';
            const d = await (await fetch('/api/rompatch/apply', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rom: fRom.inp.value.trim(), patch: fPat.inp.value.trim() })
            })).json();
            if (d.ok) {
                lastOut = d.outPath; status.textContent = 'Готово: ' + lastOut;
                bAdd.style.display = 'inline-flex';
                if (typeof playSfx === 'function') playSfx('launch');
            } else {
                status.textContent = 'Ошибка: ' + d.error;
            }
        };

        bAdd.onclick = async () => {
            if (!lastOut) return;
            const d = await (await fetch('/api/rompatch/add_card', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ romPath: lastOut })
            })).json();
            if (d.ok) {
                if (typeof showToast === 'function') showToast('Ромхак добавлен в библиотеку!');
                if (typeof loadGames === 'function') loadGames();
                bg.remove();
            }
        };

        const cl = mk('button', 'close-modal-btn', 'margin:0;', 'Закрыть');
        cl.type = 'button'; cl.onclick = () => bg.remove();
        acts.append(bApply, bAdd);
        box.append(fRom.g, fPat.g, status, acts, cl);
        bg.appendChild(box); document.body.appendChild(bg);
    };

    function observeUi() {
        const obs = new MutationObserver(() => {
            injectModsToolbar();
            document.querySelectorAll('button').forEach(b => {
                const txt = (b.textContent || '').trim();
                if ((txt.includes('Аркада и Экстра') || txt.includes('Arcade & Extras')) && b.id === 'sgl-dd-arcade-hub' && b.parentElement && !b.parentElement.querySelector('#sgl-dd-rompatch')) {
                    const nb = mk('button', b.className, 'display:inline-flex;align-items:center;justify-content:flex-start;gap:8px;text-align:left;', '');
                    nb.type = 'button'; nb.id = 'sgl-dd-rompatch'; nb.innerHTML = SVG_CHIP + '<span>Патчер ромхаков (IPS / BPS)</span>';
                    nb.onclick = () => window.openRomPatcherModal();
                    b.after(nb);
                }
            });
        });
        obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: Array.of('class') });
    }

    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', observeUi); else observeUi();
})();
