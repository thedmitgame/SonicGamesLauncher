/* === MODULE: SOUND TEST EASTER EGGS, MOD PREVIEWS/CONFLICTS & 3D BOX SHELF === */
(function() {
    let stSeq = new Array();
    let debugModeOn = false;

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function injectPepCss() {
        if (document.getElementById('sgl-pep-css')) return;
        const st = mk('style', '', ''); st.id = 'sgl-pep-css';
        st.textContent = Array.of(
            '@keyframes pepEmeraldFlash{0%{opacity:0;transform:scale(0.85)}25%{opacity:1;transform:scale(1.03)}80%{opacity:0.9}100%{opacity:0;transform:scale(1.12)}}',
            '#sgl-emerald-burst{position:fixed;inset:0;pointer-events:none;z-index:9950;background:radial-gradient(circle,rgba(253,224,71,0.45),rgba(56,189,248,0.35),rgba(168,85,247,0.3),transparent 72%);animation:pepEmeraldFlash 2.2s ease-out forwards;}',
            '@keyframes pepDebugPop{0%{transform:translate(-50%,-50%) scale(0.6);opacity:1}100%{transform:translate(-50%,-115%) scale(1.15);opacity:0}}',
            '.sgl-debug-mon{position:fixed;pointer-events:none;z-index:9940;padding:3px 7px;border-radius:6px;background:rgba(15,23,42,0.92);border:2px solid #facc15;color:#fde047;font-size:11px;font-weight:900;box-shadow:0 0 14px rgba(250,204,21,0.7);animation:pepDebugPop 0.85s ease-out forwards;}',
            'body.sgl-shelf-3d #games-carousel .game-card{transform:perspective(900px) rotateY(42deg) scale(0.86) !important;margin:0 -18px !important;transition:transform 0.35s cubic-bezier(0.22,1,0.36,1),margin 0.35s !important;filter:brightness(0.75);}',
            'body.sgl-shelf-3d #games-carousel .game-card.selected{transform:perspective(900px) rotateY(0deg) translateZ(70px) scale(1.08) !important;margin:0 28px !important;z-index:20 !important;filter:brightness(1.05);}',
            '.pep-st-bar{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:10px;background:rgba(0,0,0,0.35);border:1px solid rgba(250,204,21,0.35);margin-top:6px;font-size:11px;}',
            '.pep-mod-thumb{width:42px;height:42px;object-fit:cover;border-radius:6px;border:1px solid rgba(255,255,255,0.2);flex-shrink:0;}',
            '.pep-conf-box{padding:8px 10px;border-radius:9px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.45);font-size:11px;color:#fca5a5;margin:6px 0;}'
        ).join('\n');
        document.head.appendChild(st);
    }

    async function saveArcadeSecret(patchObj) {
        try {
            const cur = await (await fetch('/api/arcade/state')).json();
            const merged = Object.assign({}, cur || {}, patchObj);
            await fetch('/api/arcade/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(merged) });
        } catch (_) {}
    }

    function triggerEmeraldRainbow() {
        document.getElementById('sgl-emerald-burst')?.remove();
        const fx = mk('div', '', ''); fx.id = 'sgl-emerald-burst';
        document.body.appendChild(fx);
        setTimeout(() => fx.remove(), 2250);
        if (typeof playSfx === 'function') playSfx('launch');
        if (typeof showToast === 'function') showToast('Сила всех 7 Изумрудов Хаоса активирована!');
    }

    function enableDebugMode(silent) {
        debugModeOn = true;
        window._sglDebugModeUnlocked = true;
        if (!silent) {
            saveArcadeSecret({ debugUnlocked: true });
            if (typeof playSfx === 'function') playSfx('launch');
            if (typeof showToast === 'function') showToast('Debug-режим открыт! Секретная 14-я статуэтка ждёт в 3D-Музее!');
        }
    }

    async function unlockSecretTitle(titleStr) {
        try {
            const cur = await (await fetch('/api/arcade/state')).json();
            const list = Array.isArray(cur.titles) ? cur.titles : new Array();
            if (!list.includes(titleStr)) list.push(titleStr);
            cur.titles = list; cur.activeTitle = titleStr;
            await fetch('/api/arcade/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cur) });
            if (typeof playSfx === 'function') playSfx('launch');
            if (typeof showToast === 'function') showToast('Секретная пасхалка! Получен титул: ' + titleStr);
        } catch (_) {}
    }

    function checkSoundTestCode(num) {
        stSeq.push(num);
        if (stSeq.length > 4) stSeq.shift();
        const s4 = stSeq.join(',');
        const s2 = stSeq.slice(-2).join(',');
        if (s4 === '19,65,9,17') { stSeq = new Array(); enableDebugMode(false); return true; }
        if (s4 === '4,1,2,6') { stSeq = new Array(); triggerEmeraldRainbow(); return true; }
        if (s2 === '12,25' || s4 === '1,9,9,1') { stSeq = new Array(); unlockSecretTitle('Хранитель Sound Test'); return true; }
        return false;
    }

    function buildSoundTestWidget() {
        const bar = mk('div', 'pep-st-bar', '');
        bar.appendChild(mk('span', '', 'font-weight:900;color:#fde047;letter-spacing:0.6px;', 'SOUND TEST'));
        let val = 0;
        const disp = mk('span', '', 'padding:2px 8px;border-radius:6px;background:#090d16;border:1px solid #38bdf8;color:#67e8f9;font-family:monospace;font-weight:900;font-size:13px;', '00');
        const upd = () => { disp.textContent = String(val).padStart(2, '0'); };
        const bMin = mk('button', 'btn-small', 'padding:2px 7px;', '-'); bMin.type = 'button';
        bMin.onclick = () => { val = (val + 99) % 100; upd(); if (typeof playSfx === 'function') playSfx('switch'); };
        const bPls = mk('button', 'btn-small', 'padding:2px 7px;', '+'); bPls.type = 'button';
        bPls.onclick = () => { val = (val + 1) % 100; upd(); if (typeof playSfx === 'function') playSfx('switch'); };
        const bOk = mk('button', 'btn-small btn-accent', 'padding:3px 9px;font-weight:800;', 'Ввод'); bOk.type = 'button';
        bOk.onclick = () => {
            if (!checkSoundTestCode(val) && typeof playSfx === 'function') playSfx('switch');
        };
        bar.append(bMin, disp, bPls, bOk);
        return bar;
    }

    window.addEventListener('pointerdown', (e) => {
        if (!debugModeOn) return;
        const m = mk('div', 'sgl-debug-mon', 'left:' + e.clientX + 'px;top:' + e.clientY + 'px;', '10 RINGS');
        document.body.appendChild(m);
        setTimeout(() => m.remove(), 860);
    }, { passive: true });

    let lastModsInspectTs = 0;
    async function enhanceModsModal() {
        const modal = document.getElementById('mods-modal');
        if (!modal || !modal.classList.contains('active')) return;
        if (Date.now() - lastModsInspectTs < 1200) return;
        lastModsInspectTs = Date.now();
        const g = (typeof availableGames !== 'undefined' && availableGames.length > 0) ? availableGames.at(selectedIndex) : null;
        if (!g) return;
        try {
            const d = await (await fetch('/api/mods/inspect_meta?id=' + encodeURIComponent(g.id))).json();
            if (!d || !d.ok) return;
            const items = d.items || {};
            modal.querySelectorAll('.mod-item').forEach(row => {
                if (row.dataset.pepEnhanced === '1') return;
                const tEl = row.querySelector('.mod-title');
                if (!tEl) return;
                const name = (tEl.textContent || '').trim();
                const meta = items[name] || Object.values(items).find((_, idx) => Object.keys(items).at(idx).toLowerCase() === name.toLowerCase());
                if (!meta) return;
                row.dataset.pepEnhanced = '1';
                if (meta.preview) {
                    const im = mk('img', 'pep-mod-thumb', ''); im.src = meta.preview;
                    row.prepend(im);
                }
                if (meta.author || meta.version) {
                    const sub = mk('div', '', 'font-size:10px;color:#93c5fd;margin-top:2px;', (meta.author ? ('Автор: ' + meta.author) : '') + (meta.version ? (' • v' + meta.version) : ''));
                    tEl.after(sub);
                }
            });
            document.getElementById('sgl-mod-conflicts-box')?.remove();
            const confKeys = Object.keys(d.conflicts || {});
            if (confKeys.length > 0) {
                const cBox = mk('div', 'pep-conf-box', ''); cBox.id = 'sgl-mod-conflicts-box';
                cBox.appendChild(mk('div', '', 'font-weight:900;margin-bottom:4px;', 'Найдены конфликты файлов между модами (' + confKeys.length + '):'));
                confKeys.slice(0, 6).forEach(f => {
                    cBox.appendChild(mk('div', '', 'font-size:10.5px;', f + ' -> ' + (d.conflicts[f] || new Array()).join(' / ')));
                });
                const listEl = modal.querySelector('.mods-list');
                if (listEl) listEl.before(cBox);
            }
        } catch (_) {}
    }

    function syncShelf3dMode() {
        const on = Boolean(typeof currentDesign !== 'undefined' && currentDesign && currentDesign.shelf3dMode);
        document.body.classList.toggle('sgl-shelf-3d', on);
    }

    function injectShelfToggleAndSoundTest() {
        const drw = document.getElementById('sgl-jb-drawer');
        if (drw && !document.getElementById('sgl-jb-soundtest')) {
            const w = buildSoundTestWidget(); w.id = 'sgl-jb-soundtest';
            drw.appendChild(w);
        }
        const ah = document.getElementById('sgl-arcade-hub-modal');
        if (ah && !document.getElementById('sgl-ah-soundtest')) {
            const box = ah.querySelector('.ah-modal');
            if (box) { const w = buildSoundTestWidget(); w.id = 'sgl-ah-soundtest'; box.insertBefore(w, box.lastElementChild); }
        }
        const tabView = document.querySelector('#custom-modal .tab-pane');
        if (tabView && !document.getElementById('sgl-shelf3d-row')) {
            const row = mk('label', '', 'display:flex;align-items:center;gap:8px;font-size:12px;margin:8px 0;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);cursor:pointer;');
            row.id = 'sgl-shelf3d-row';
            const chk = document.createElement('input'); chk.type = 'checkbox';
            chk.checked = Boolean(typeof currentDesign !== 'undefined' && currentDesign && currentDesign.shelf3dMode);
            chk.onchange = () => { if (currentDesign) currentDesign.shelf3dMode = chk.checked; syncShelf3dMode(); };
            row.append(chk, mk('span', '', '', 'Режим витрины «Полка с дисками» (3D Box Shelf)'));
            tabView.appendChild(row);
        }
        const mus = document.getElementById('sgl-museum-modal');
        if (mus && debugModeOn && !document.getElementById('sgl-secret-14-trophy')) {
            const grid = mus.querySelector('.mus-list, .mods-list');
            if (grid) {
                const t14 = mk('div', 'mod-item', 'border-left:3px solid #fde047;background:rgba(250,204,21,0.12);padding:8px 10px;');
                t14.id = 'sgl-secret-14-trophy';
                t14.appendChild(mk('div', '', 'font-size:12px;font-weight:900;color:#fde047;', '#14 Золотой Debug-Монитор (Sound Test 19-65-09-17)'));
                grid.appendChild(t14);
            }
        }
    }

    const _bootPep = () => {
        injectPepCss(); syncShelf3dMode();
        fetch('/api/arcade/state').then(r => r.json()).then(d => { if (d && d.debugUnlocked) enableDebugMode(true); }).catch(() => {});
        const obs = new MutationObserver(() => { injectShelfToggleAndSoundTest(); enhanceModsModal(); });
        obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: Array.of('class') });
        const origReset = window.resetDesign;
        if (typeof origReset === 'function') {
            window.resetDesign = function() {
                if (currentDesign) { currentDesign.shelf3dMode = false; currentDesign.cardStyle = 'glass'; }
                const r = origReset.apply(this, arguments); syncShelf3dMode(); return r;
            };
        }
    };
    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', _bootPep); else _bootPep();
})();
