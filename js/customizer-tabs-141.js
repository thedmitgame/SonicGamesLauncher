/* === STAGE 2 POLISH (v1.4.2): 4-TAB CUSTOMIZER REORGANIZATION (SAFE) === */
(function() {
    let activeTabKey = 'look';
    let wasModalOpen = false;

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function setCls(el, cls, on) {
        if (!el) return;
        const has = el.classList.contains(cls);
        if (on && !has) el.classList.add(cls);
        else if (!on && has) el.classList.remove(cls);
    }

    function injectTab141Css() {
        if (document.getElementById('sgl-c141-css')) return;
        const st = mk('style', '', '');
        st.id = 'sgl-c141-css';
        st.textContent = Array.of(
            '#custom-modal .modal-box { width: 760px; max-width: 95vw; }',
            '#c141-tabs-bar { display: flex; flex-wrap: nowrap; gap: 6px; overflow-x: auto; scrollbar-width: none; padding: 5px; margin-bottom: 12px; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); }',
            '#c141-tabs-bar::-webkit-scrollbar { display: none; }',
            '#c141-tabs-bar .c141-tab { flex: 1 0 auto; padding: 8px 14px; border-radius: 9px; border: 1px solid transparent; background: transparent; color: #cbd5e1; font-size: 12.5px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: background 0.18s, color 0.18s; }',
            '#c141-tabs-bar .c141-tab:hover { background: rgba(255,255,255,0.07); color: #fff; }',
            '#c141-tabs-bar .c141-tab.active { background: #2563eb; color: #fff; box-shadow: 0 4px 14px rgba(37,99,235,0.4); }',
            '.c141-pane { display: none; flex-direction: column; gap: 14px; max-height: 58vh; overflow-y: auto; padding-right: 4px; }',
            '.c141-pane.active { display: flex; }',
            '.c141-card { background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.09); border-radius: 14px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }',
            '.c141-card-hdr { font-size: 12px; font-weight: 800; color: #fde047; letter-spacing: 0.4px; text-transform: uppercase; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.08); }',
            '.c141-legacy-hide { display: none !important; }'
        ).join('\n');
        document.head.appendChild(st);
    }

    const TAB_DEFS = Array.of(
        { key: 'look', label: 'Оформление' },
        { key: 'scene', label: 'Сцена и эффекты' },
        { key: 'sys', label: 'Звук и система' },
        { key: 'pro', label: 'Pro-студия' }
    );

    function ensureCard(pane, id, title) {
        let card = pane.querySelector('#' + id);
        if (!card) {
            card = mk('div', 'c141-card', '');
            card.id = id;
            card.appendChild(mk('div', 'c141-card-hdr', '', title));
            pane.appendChild(card);
        }
        return card;
    }

    function moveNode(node, targetCard) {
        if (!node || !targetCard || node.parentElement === targetCard) return;
        targetCard.appendChild(node);
    }


    function ensureFxSpeedAndFpsCard(cSceneBg) {
        if (!cSceneBg) return;
        let box = document.getElementById('sgl-fx-fps-box');
        if (!box) {
            box = mk('div', 'custom-group', 'margin:4px 0;padding:10px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(250,204,21,0.3);border-radius:10px;display:flex;flex-direction:column;gap:8px;');
            box.id = 'sgl-fx-fps-box';

            const curSpd = (typeof window.SGL_GET_FX_SPEED === 'function') ? window.SGL_GET_FX_SPEED() : Number(currentDesign?.fxSpeed || 1.0);
            const spLbl = mk('label', '', 'display:flex;justify-content:space-between;align-items:center;font-size:12px;');
            const spVal = mk('b', '', 'color:#fde047;', curSpd.toFixed(2) + 'x');
            spVal.id = 'val-fxSpeed';
            spLbl.append(mk('span', '', '', 'Скорость эффектов:'), spVal);

            const spRng = document.createElement('input');
            spRng.type = 'range'; spRng.id = 'inp-fxSpeed';
            spRng.min = '0.25'; spRng.max = '2.5'; spRng.step = '0.25';
            spRng.value = String(curSpd);
            spRng.oninput = () => {
                const v = parseFloat(spRng.value) || 1.0;
                if (typeof currentDesign !== 'undefined' && currentDesign) currentDesign.fxSpeed = v;
                spVal.textContent = v.toFixed(2) + 'x';
                document.documentElement.style.setProperty('--sgl-fx-speed', String(v));
                const actBg = document.querySelector('.bg-layer.active');
                if (actBg) { actBg.style.animation = 'none'; void actBg.offsetWidth; actBg.style.animation = ''; }
            };

            const fpsGrid = mk('div', '', 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:2px;');
            const mkFpsSel = (id, title, key, defVal) => {
                const w = mk('div', '', 'display:flex;flex-direction:column;gap:4px;font-size:11px;');
                w.appendChild(mk('span', '', 'opacity:0.85;', title));
                const s = mk('select', 'custom-select', ''); s.id = id;
                Array.of(
                    { v: '30', t: '30 FPS — Экономия GPU' },
                    { v: '60', t: '60 FPS — Макс. плавность' }
                ).forEach(o => { const op = mk('option', '', '', o.t); op.value = o.v; s.appendChild(op); });
                s.value = String((typeof currentDesign !== 'undefined' && currentDesign && currentDesign[key]) || defVal);
                s.onchange = () => { if (typeof currentDesign !== 'undefined' && currentDesign) currentDesign[key] = parseInt(s.value, 10) || defVal; };
                w.appendChild(s); return w;
            };
            fpsGrid.append(
                mkFpsSel('inp-fpsBg', 'Фоновые шейдеры и частицы (FPS):', 'fpsBg', 30),
                mkFpsSel('inp-fps3d', '3D-движок и мини-игры (FPS):', 'fps3d', 60)
            );
            box.append(spLbl, spRng, fpsGrid);
        }
        if (box.parentElement !== cSceneBg) {
            const shGrp = document.getElementById('inp-shaderType')?.closest('.custom-group');
            if (shGrp && shGrp.parentElement === cSceneBg) shGrp.after(box);
            else cSceneBg.appendChild(box);
        }
        const spInp = document.getElementById('inp-fxSpeed');
        const spTxt = document.getElementById('val-fxSpeed');
        const vNow = Number(currentDesign?.fxSpeed ?? 1.0);
        if (spInp) spInp.value = String(vNow);
        if (spTxt) spTxt.textContent = vNow.toFixed(2) + 'x';
        const bSel = document.getElementById('inp-fpsBg'); if (bSel) bSel.value = String(currentDesign?.fpsBg ?? 30);
        const dSel = document.getElementById('inp-fps3d'); if (dSel) dSel.value = String(currentDesign?.fps3d ?? 60);
    }

    function switchC141Tab(modal, key) {
        activeTabKey = key;
        modal.querySelectorAll('#c141-tabs-bar .c141-tab').forEach(b => {
            setCls(b, 'active', b.dataset.c141Key === key);
        });
        modal.querySelectorAll('.c141-pane').forEach(p => {
            setCls(p, 'active', p.dataset.c141Pane === key);
        });
    }

    function reorganizeCustomizer() {
        const modal = document.getElementById('custom-modal');
        if (!modal || !modal.classList.contains('active')) return;
        const box = modal.querySelector('.modal-box');
        if (!box) return;

        const oldBar = box.querySelector('.tabs-bar:not(#c141-tabs-bar)');
        if (oldBar) setCls(oldBar, 'c141-legacy-hide', true);

        let newBar = box.querySelector('#c141-tabs-bar');
        if (!newBar) {
            newBar = mk('div', '', '');
            newBar.id = 'c141-tabs-bar';
            TAB_DEFS.forEach(t => {
                const b = mk('button', 'c141-tab', '', t.label);
                b.type = 'button';
                b.dataset.c141Key = t.key;
                b.onclick = () => { if (typeof playSfx === 'function') playSfx('switch'); switchC141Tab(modal, t.key); };
                newBar.appendChild(b);
            });
            if (oldBar) oldBar.after(newBar); else box.prepend(newBar);
        }

        const panes = {};
        TAB_DEFS.forEach(t => {
            let p = box.querySelector('#c141-pane-' + t.key);
            if (!p) {
                p = mk('div', 'c141-pane', '');
                p.id = 'c141-pane-' + t.key;
                p.dataset.c141Pane = t.key;
                newBar.after(p);
            }
            panes[t.key] = p;
        });

        const cThemes = ensureCard(panes.look, 'c141-c-themes', 'Темы, пресеты и полка');
        const cLookBase = ensureCard(panes.look, 'c141-c-lookbase', 'Карточки, шрифт и цвета');
        const cSceneBg = ensureCard(panes.scene, 'c141-c-scenebg', 'Фон, шейдер и Screen FX');
        const cSceneMedia = ensureCard(panes.scene, 'c141-c-scenemedia', 'Графика, персонажи и SUPER-аура');
        const cSysAudio = ensureCard(panes.sys, 'c141-c-sysaudio', 'Звук, эквалайзер и Game Mode');
        const cSysTools = ensureCard(panes.sys, 'c141-c-systools', 'Витрина, события и система');
        const cPro = ensureCard(panes.pro, 'c141-c-pro', 'Инструменты создателя тем');

        const oldPanes = Array.from(box.querySelectorAll('.tab-pane:not(.c141-pane)'));
        oldPanes.forEach((op, idx) => {
            setCls(op, 'c141-legacy-hide', true);
            const kids = Array.from(op.children);
            kids.forEach(ch => {
                const id = ch.id || '';
                if (id === 'sgl-builtin-gallery-box' || id === 'sgl-theme-previews-box' || id === 'sgl-shelf3d-row') moveNode(ch, cThemes);
                else if (id === 'sgl-tmp-settings' || id === 'sgl-sys-extras-sec') moveNode(ch, cSysTools);
                else if (id === 'agp-audio-sec') moveNode(ch, cSysAudio);
                else if (idx === 0 || idx === 3) moveNode(ch, cLookBase);
                else if (idx === 1) moveNode(ch, cSceneBg);
                else if (idx === 2 || idx === 4) moveNode(ch, cSceneMedia);
                else if (idx === 5 || op.id === 'tab-audio') moveNode(ch, cSysAudio);
                else moveNode(ch, cPro);
            });
        });

        ensureFxSpeedAndFpsCard(cSceneBg);
        switchC141Tab(modal, activeTabKey);
        if (typeof window.openCustomModal === 'function' && document.getElementById('c141-c-scenebg')) { const b = document.getElementById('sgl-fx-fps-box'); const c = document.getElementById('c141-c-scenebg'); if (b && c && b.parentElement !== c) c.appendChild(b); }
    }

    function scheduleReorg() {
        setTimeout(reorganizeCustomizer, 70);
        setTimeout(reorganizeCustomizer, 280);
    }

    function bootC141() {
        injectTab141Css();
        const origOpen = window.openCustomModal;
        if (typeof origOpen === 'function' && !window._c141Hooked) {
            window._c141Hooked = true;
            window.openCustomModal = function() {
                const res = origOpen.apply(this, arguments);
                scheduleReorg();
                return res;
            };
        }
        const modal = document.getElementById('custom-modal');
        if (modal) {
            const obs = new MutationObserver(() => {
                const isOpen = modal.classList.contains('active');
                if (isOpen && !wasModalOpen) {
                    wasModalOpen = true;
                    scheduleReorg();
                } else if (!isOpen) {
                    wasModalOpen = false;
                }
            });
            obs.observe(modal, { attributes: true, attributeFilter: Array.of('class') });
        }
    }

    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', bootC141);
    else bootC141();
})();
