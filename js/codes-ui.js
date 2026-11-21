/* === UNIFIED GAME CODES / PATCHES TAB (FIXED SELECTORS) === */
(function() {
    let codesCache = new Array();
    let codesQuery = '';
    let onlyEnabledCodes = false;

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function getModsTabButtons() {
        const modal = document.getElementById('mods-modal');
        if (!modal) return null;
        const btns = Array.from(modal.querySelectorAll('button'));
        const gbBtn = btns.find(b => (b.getAttribute('onclick') || '').includes('gb') || (b.textContent || '').includes('GameBanana'));
        const locBtn = btns.find(b => (b.getAttribute('onclick') || '').includes('local') || (b.textContent || '').includes('Установленные') || (b.textContent || '').includes('Installed'));
        return gbBtn ? { row: gbBtn.parentElement, locBtn: locBtn, gbBtn: gbBtn } : null;
    }

    function setLocalAndGbPanesVisible(mode) {
        const listEl = document.getElementById('mods-list-container');
        const localWrap = document.getElementById('mods-local-view') || (listEl ? listEl.parentElement : null);
        const gbWrap = document.getElementById('mods-gb-view') || document.getElementById('gb-mods-container')?.parentElement;
        const cPane = document.getElementById('mods-codes-view');

        if (mode === 'codes') {
            if (localWrap && localWrap !== cPane?.parentElement) {
                localWrap.style.display = 'none';
            } else {
                ['mods-list-container', 'sgl-mods-filter-bar', 'sgl-ext-mm-bar'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.style.display = 'none';
                });
                const dLbl = document.getElementById('mods-dir-label');
                if (dLbl && dLbl.parentElement) dLbl.parentElement.style.display = 'none';
                const pSel = document.getElementById('preset-select');
                if (pSel && pSel.parentElement) pSel.parentElement.style.display = 'none';
            }
            if (gbWrap) gbWrap.style.display = 'none';
                    if (cPane) {
            const modalBox = document.querySelector('#mods-modal .modal-box');
            const closeBtn = modalBox ? Array.from(modalBox.querySelectorAll('button')).find(b => (b.textContent || '').trim() === 'Закрыть' || (b.textContent || '').trim() === 'Close') : null;
            const anchor = closeBtn && closeBtn.parentElement !== modalBox ? closeBtn.parentElement : closeBtn;
            if (anchor && cPane.nextElementSibling !== anchor) anchor.before(cPane);
            cPane.style.display = 'flex';
        }
        } else {
            if (cPane) cPane.style.display = 'none';
            if (localWrap && localWrap.id !== 'mods-local-view') {
                ['mods-list-container', 'sgl-mods-filter-bar', 'sgl-ext-mm-bar'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.style.display = (mode === 'local') ? (id === 'mods-list-container' ? '' : 'flex') : 'none';
                });
                const dLbl = document.getElementById('mods-dir-label');
                if (dLbl && dLbl.parentElement) dLbl.parentElement.style.display = (mode === 'local') ? 'flex' : 'none';
                const pSel = document.getElementById('preset-select');
                if (pSel && pSel.parentElement) pSel.parentElement.style.display = (mode === 'local') ? 'flex' : 'none';
            }
        }
    }

    function ensureCodesTabUI() {
        const tabs = getModsTabButtons();
        if (!tabs || document.getElementById('tab-src-codes')) return;

        const baseCls = tabs.gbBtn.className.replace('active', '').trim();
        const codesBtn = mk('button', baseCls, '', 'Коды (Патчи)');
        codesBtn.type = 'button';
        codesBtn.id = 'tab-src-codes';
        codesBtn.onclick = () => switchToCodesPane();
        tabs.row.appendChild(codesBtn);

        const modalBox = document.querySelector('#mods-modal .modal-box');
        const actionsRow = modalBox ? modalBox.querySelector('.modal-actions') : null;
        if (modalBox && !document.getElementById('mods-codes-view')) {
            const pane = mk('div', '', 'display:none;flex-direction:column;gap:8px;margin-top:6px;');
            pane.id = 'mods-codes-view';

            const topBar = mk('div', '', 'display:flex;gap:6px;align-items:center;');
            const searchInp = mk('input', 'args-input', 'flex:1;margin-top:0;user-select:text !important;', '');
            searchInp.type = 'text';
            searchInp.placeholder = 'Поиск по названию кода или категории...';
            searchInp.oninput = () => { codesQuery = searchInp.value.trim().toLowerCase(); renderCodesList(); };

            const filterSel = mk('select', 'custom-select', 'padding:5px 8px;', '');
            const oAll = mk('option', '', '', 'Все коды'); oAll.value = 'all';
            const oOn = mk('option', '', '', 'Активные'); oOn.value = 'on';
            filterSel.append(oAll, oOn);
            filterSel.onchange = () => { onlyEnabledCodes = (filterSel.value === 'on'); renderCodesList(); };

            topBar.append(searchInp, filterSel);
            const listWrap = mk('div', 'mods-list', 'max-height:360px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;');
            listWrap.id = 'sgl-codes-list';
            pane.append(topBar, listWrap);

            const closeBtn = Array.from(modalBox.querySelectorAll('button')).find(b =>
                (b.getAttribute('onclick') || '').includes('closeModsModal') || (b.textContent || '').trim() === 'Закрыть' || (b.textContent || '').trim() === 'Close'
            );
            const closeAnchor = actionsRow || (closeBtn && closeBtn.parentElement !== modalBox ? closeBtn.parentElement : closeBtn);
            if (closeAnchor) closeAnchor.before(pane);
            else modalBox.appendChild(pane);
        }

        const origSwitch = window.switchModsSourceTab;
        if (typeof origSwitch === 'function' && !window._codesTabWrapped2) {
            window._codesTabWrapped2 = true;
            window.switchModsSourceTab = function(mode) {
                document.getElementById('tab-src-codes')?.classList.remove('active');
                setLocalAndGbPanesVisible(mode);
                return origSwitch.apply(this, arguments);
            };
        }
    }

    async function switchToCodesPane() {
        if (typeof playSfx === 'function') playSfx('switch');
        const tabs = getModsTabButtons();
        if (tabs) {
            Array.from(tabs.row.children).forEach(b => b.classList.remove('active'));
        }
        document.getElementById('tab-src-codes')?.classList.add('active');
        setLocalAndGbPanesVisible('codes');
        await loadGameCodes();
    }

    async function loadGameCodes() {
        const activeG = availableGames.at(selectedIndex);
        const listWrap = document.getElementById('sgl-codes-list');
        if (!activeG || !listWrap) return;
        listWrap.innerHTML = '';
        listWrap.appendChild(mk('div', '', 'text-align:center;opacity:0.6;padding:20px;', 'Чтение базы кодов...'));
        let data = { supported: false, codes: [] };
        try {
            const res = await fetch('/api/codes/list?id=' + encodeURIComponent(activeG.id));
            data = await res.json();
        } catch (_) {}
        if (!data.supported || !data.codes || data.codes.length === 0) {
            listWrap.innerHTML = '';
            listWrap.appendChild(mk('div', '', 'text-align:center;opacity:0.6;padding:24px;', 'База кодов (Codes.hmm / Codes.lst) в папке модов не обнаружена.'));
            return;
        }
        codesCache = data.codes;
        renderCodesList();
    }

    function renderCodesList() {
        const activeG = availableGames.at(selectedIndex);
        const listWrap = document.getElementById('sgl-codes-list');
        if (!activeG || !listWrap) return;
        listWrap.innerHTML = '';
        const filtered = codesCache.filter(c => {
            if (onlyEnabledCodes && !c.enabled) return false;
            if (codesQuery) {
                const hay = (c.title + ' ' + (c.category || '') + ' ' + (c.author || '')).toLowerCase();
                if (!hay.includes(codesQuery)) return false;
            }
            return true;
        });
        if (filtered.length === 0) {
            listWrap.appendChild(mk('div', '', 'text-align:center;opacity:0.6;padding:18px;', 'По вашему запросу кодов не найдено'));
            return;
        }
        filtered.slice(0, 200).forEach(code => {
            const row = mk('div', 'mod-item', 'padding:8px 12px;');
            const info = mk('div', 'mod-info', 'flex:1;');
            const titleRow = mk('div', 'mod-title', 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;');
            if (code.category) {
                titleRow.appendChild(mk('span', '', 'font-size:10px;padding:1px 6px;border-radius:5px;background:rgba(59,130,246,0.22);color:#93C5FD;', code.category));
            }
            titleRow.appendChild(mk('span', '', '', code.title));
            info.appendChild(titleRow);
            if (code.author) info.appendChild(mk('div', 'mod-author', '', 'Автор: ' + code.author));
            const chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.className = 'mod-toggle';
            chk.checked = Boolean(code.enabled);
            chk.onchange = async () => {
                if (typeof playSfx === 'function') playSfx('switch');
                code.enabled = chk.checked;
                await fetch('/api/codes/toggle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gameId: activeG.id, codeId: code.id, enabled: chk.checked })
                });
            };
            row.append(info, chk);
            listWrap.appendChild(row);
        });
    }

    
    window.addEventListener('focus', () => {
        const cPane = document.getElementById('mods-codes-view');
        const mModal = document.getElementById('mods-modal');
        if (mModal && mModal.classList.contains('active') && cPane && cPane.style.display !== 'none') {
            loadGameCodes();
        }
    });

    const _origOpenM = window.openModsModal; if (typeof _origOpenM === 'function') { window.openModsModal = async function() { ensureCodesTabUI(); return _origOpenM.apply(this, arguments); }; }
    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', ensureCodesTabUI);
    else ensureCodesTabUI();
})();
