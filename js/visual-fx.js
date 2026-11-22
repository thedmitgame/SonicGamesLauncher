/* === VISUAL FX PACK A: SCREEN OVERLAYS & 3D CARD FOIL TILT === */
(function() {
    let overlayEl = null;
    let activeHoveredCard = null;

    const SHADER_EXTRAS = new Array(
        { val: 'mania_geo', text: 'Поп-арт геометрия' },
        { val: 'starfield', text: 'Звёздный полёт (Варп)' },
        { val: 'cyber_glitch', text: 'Цифровой глитч' }
    );

    const FX_OPTIONS = new Array(
        { val: 'none', text: 'Без фильтра (Чистый экран)' },
        { val: 'crt', text: 'ЭЛТ-монитор (CRT Scanlines + Виньетка)' },
        { val: 'halftone', text: 'Точечный растр (Halftone)' },
        { val: 'cybergrid', text: 'Цифровая сетка' },
        { val: 'vignette', text: 'Глубокая кино-виньетка' }
    );

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function injectStylesAndLayer() {
        if (document.getElementById('sgl-screen-fx-layer')) return;
        const st = document.createElement('style');
        const rules = new Array(
            '#sgl-screen-fx-layer{position:fixed;inset:0;pointer-events:none;z-index:12;opacity:0.45;transition:opacity 0.25s;}',
            '#sgl-screen-fx-layer.fx-none{display:none;}',
            '#sgl-screen-fx-layer.fx-crt{background:linear-gradient(rgba(18,16,16,0) 50%,rgba(0,0,0,0.42) 50%),radial-gradient(circle at center,transparent 58%,rgba(0,0,0,0.72) 100%);background-size:100% 4px,100% 100%;}',
            '#sgl-screen-fx-layer.fx-halftone{background-image:radial-gradient(rgba(255,215,0,0.28) 1.6px,transparent 1.6px),radial-gradient(circle at center,transparent 50%,rgba(0,0,0,0.55) 100%);background-size:14px 14px,100% 100%;}',
            '#sgl-screen-fx-layer.fx-cybergrid{background-image:linear-gradient(rgba(56,189,248,0.12) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.12) 1px,transparent 1px),radial-gradient(circle at center,transparent 55%,rgba(4,9,20,0.78) 100%);background-size:36px 36px,36px 36px,100% 100%;}',
            '#sgl-screen-fx-layer.fx-vignette{background:radial-gradient(circle at center,transparent 48%,rgba(0,0,0,0.88) 100%);}',
            '.game-card .cover-box{position:relative;overflow:hidden;transition:transform 0.14s ease-out;transform-style:preserve-3d;}',
            '.sgl-foil-glare{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity 0.2s;mix-blend-mode:overlay;z-index:4;}',
            '.game-card.selected:hover .sgl-foil-glare{opacity:1;}'
        );
        st.textContent = rules.join('\n');
        document.head.appendChild(st);

        overlayEl = mk('div', 'fx-none', '');
        overlayEl.id = 'sgl-screen-fx-layer';
        document.body.appendChild(overlayEl);
    }

    window.applyVisualFxPack = function() {
        injectStylesAndLayer();
        if (!overlayEl || typeof currentDesign === 'undefined' || !currentDesign) return;
        if (currentDesign.liteMode) {
            overlayEl.className = 'fx-none';
            return;
        }
        const fx = currentDesign.screenFx || 'none';
        const op = (currentDesign.screenFxOpacity ?? 45) / 100;
        overlayEl.className = 'fx-' + fx;
        overlayEl.style.opacity = String(op);
    };

    function injectCustomizerControls() {
        const shaderSel = document.getElementById('inp-shaderType');
        if (shaderSel) {
            const existingVals = Array.from(shaderSel.options).map(o => o.value);
            SHADER_EXTRAS.forEach(it => {
                if (!existingVals.includes(it.val)) {
                    const o = mk('option', '', '', it.text);
                    o.value = it.val;
                    shaderSel.appendChild(o);
                }
            });
        }

        if (document.getElementById('inp-screenFx')) return;
        const anchorGroup = shaderSel ? (shaderSel.closest('.custom-group') || shaderSel.parentElement || shaderSel) : null;
        if (!anchorGroup) return;

        const wrap = mk('div', 'custom-group', 'margin-top:8px;padding:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;');

        const topLbl = mk('label', '', 'display:flex;justify-content:space-between;align-items:center;');
        const leftSpan = mk('span', '', '', 'Экранный текстурный фильтр (Screen FX):');
        const rightSpan = mk('span', '', 'font-size:11px;opacity:0.75;', 'Интенсивность: ');
        const valB = mk('b', '', '', '45');
        valB.id = 'val-screenFxOpacity';
        rightSpan.append(valB, document.createTextNode('%'));
        topLbl.append(leftSpan, rightSpan);

        const ctrlGrid = mk('div', '', 'display:grid;grid-template-columns:1.3fr 1fr;gap:8px;align-items:center;margin-top:5px;');
        const fxSel = mk('select', 'custom-select', '');
        fxSel.id = 'inp-screenFx';
        FX_OPTIONS.forEach(opt => {
            const o = mk('option', '', '', opt.text);
            o.value = opt.val;
            fxSel.appendChild(o);
        });

        const fxRng = document.createElement('input');
        fxRng.type = 'range';
        fxRng.id = 'inp-screenFxOpacity';
        fxRng.min = '5';
        fxRng.max = '100';
        fxRng.value = '45';
        ctrlGrid.append(fxSel, fxRng);

        const chkRow = mk('div', 'custom-check-row', 'margin-top:8px;');
        const tiltChk = document.createElement('input');
        tiltChk.type = 'checkbox';
        tiltChk.id = 'inp-cardTilt3d';
        tiltChk.checked = true;
        const tiltLbl = mk('label', '', '', 'Голографический 3D-наклон и блик выбранной карточки');
        tiltLbl.setAttribute('for', 'inp-cardTilt3d');
        chkRow.append(tiltChk, tiltLbl);

        wrap.append(topLbl, ctrlGrid, chkRow);
        anchorGroup.after(wrap);

        const onChangeFx = () => {
            if (!currentDesign) return;
            currentDesign.screenFx = fxSel.value;
            currentDesign.screenFxOpacity = parseInt(fxRng.value || '45');
            currentDesign.cardTilt3d = tiltChk.checked;
            valB.textContent = String(currentDesign.screenFxOpacity);
            window.applyVisualFxPack();
        };

        fxSel.onchange = onChangeFx;
        fxRng.oninput = onChangeFx;
        tiltChk.onchange = onChangeFx;
    }

function syncControlsFromDesign() {
        injectCustomizerControls();
        if (typeof currentDesign === 'undefined' || !currentDesign) return;
        const fxSel = document.getElementById('inp-screenFx');
        const fxRng = document.getElementById('inp-screenFxOpacity');
        const fxVal = document.getElementById('val-screenFxOpacity');
        const tiltChk = document.getElementById('inp-cardTilt3d');
        const shSel = document.getElementById('inp-shaderType');

        if (shSel) shSel.value = currentDesign.shaderType || 'none';
        if (fxSel) fxSel.value = currentDesign.screenFx || 'none';
        if (fxRng) fxRng.value = String(currentDesign.screenFxOpacity ?? 45);
        if (fxVal) fxVal.textContent = String(currentDesign.screenFxOpacity ?? 45);
        if (tiltChk) tiltChk.checked = (currentDesign.cardTilt3d ?? true);
    }

    function clearAllInactiveTilts() {
        activeHoveredCard = null;
        document.querySelectorAll('.game-card:not(.selected) .cover-box').forEach(b => {
            b.style.transform = '';
        });
    }

    function resetCardTilt(card) {
        if (!card) return;
        const box = card.querySelector('.cover-box');
        if (box) box.style.transform = '';
    }

    window.addEventListener('pointermove', (e) => {
        if (typeof currentDesign === 'undefined' || !currentDesign) return;
        if (currentDesign.liteMode || currentDesign.cardTilt3d === false || document.body.classList.contains('hud-editing')) {
            if (activeHoveredCard) { resetCardTilt(activeHoveredCard); activeHoveredCard = null; }
            return;
        }
        const card = e.target.closest('.game-card.selected');
        if (!card || card.classList.contains('has-box3d')) {
            if (activeHoveredCard) { resetCardTilt(activeHoveredCard); activeHoveredCard = null; }
            return;
        }
        activeHoveredCard = card;
        const box = card.querySelector('.cover-box');
        if (!box) return;

        let glare = box.querySelector('.sgl-foil-glare');
        if (!glare) {
            glare = mk('div', 'sgl-foil-glare', '');
            box.appendChild(glare);
        }

        const r = box.getBoundingClientRect();
        const px = Math.max(0, Math.min(1, (e.clientX - r.left) / (r.width || 1)));
        const py = Math.max(0, Math.min(1, (e.clientY - r.top) / (r.height || 1)));
        const rotY = ((px - 0.5) * 18).toFixed(2);
        const rotX = ((0.5 - py) * 16).toFixed(2);
        const gx = (px * 100).toFixed(0);
        const gy = (py * 100).toFixed(0);

        box.style.transform = 'perspective(650px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg) scale3d(1.03, 1.03, 1.03)';
        glare.style.background = 'radial-gradient(circle at ' + gx + '% ' + gy + '%, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.08) 38%, transparent 70%)';
    }, { passive: true });

    const _initFx = () => {
        injectStylesAndLayer();
        injectCustomizerControls();

        const origApply = window.applyDesign;
        if (typeof origApply === 'function') {
            window.applyDesign = function() {
                const res = origApply.apply(this, arguments);
                window.applyVisualFxPack();
                return res;
            };
        }

        const origOpen = window.openCustomModal;
        if (typeof origOpen === 'function') {
            window.openCustomModal = function() {
                injectCustomizerControls();
                const res = origOpen.apply(this, arguments);
                syncControlsFromDesign();
                return res;
            };
        }

        const origSync = window.syncAllControlsToDesign;
        if (typeof origSync === 'function') {
            window.syncAllControlsToDesign = function() {
                const res = origSync.apply(this, arguments);
                const fxSel = document.getElementById('inp-screenFx');
                const fxRng = document.getElementById('inp-screenFxOpacity');
                const tiltChk = document.getElementById('inp-cardTilt3d');
                if (currentDesign && fxSel) currentDesign.screenFx = fxSel.value;
                if (currentDesign && fxRng) currentDesign.screenFxOpacity = parseInt(fxRng.value || '45');
                if (currentDesign && tiltChk) currentDesign.cardTilt3d = tiltChk.checked;
                return res;
            };
        }

        const origSelTilt = window.selectGame;
        if (typeof origSelTilt === 'function' && !window._tiltResetHooked) {
            window._tiltResetHooked = true;
            window.selectGame = function() {
                const r = origSelTilt.apply(this, arguments);
                clearAllInactiveTilts();
                return r;
            };
        }
        setTimeout(window.applyVisualFxPack, 400);
    };
    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', _initFx); else _initFx();
})();
