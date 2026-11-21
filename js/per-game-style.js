/* === PER-GAME VISUAL STYLE OVERRIDE (SHADER, SCREEN FX, CARD STYLE, LAUNCH) === */
(function() {
    let baseGlobalSnap = null;

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function captureBaseIfClean() {
        if (!currentDesign) return;
        baseGlobalSnap = {
            shaderType: currentDesign.shaderType || 'none',
            screenFx: currentDesign.screenFx || 'none',
            cardStyle: currentDesign.cardStyle || 'sega',
            launchAnim: currentDesign.launchAnim || 'titlecard',
            clickFx: currentDesign.clickFx || 'rings'
        };
    }

    function restoreBaseToDesign() {
        if (!currentDesign || !baseGlobalSnap) return;
        currentDesign.shaderType = baseGlobalSnap.shaderType;
        currentDesign.screenFx = baseGlobalSnap.screenFx;
        currentDesign.cardStyle = baseGlobalSnap.cardStyle;
        currentDesign.launchAnim = baseGlobalSnap.launchAnim;
        currentDesign.clickFx = baseGlobalSnap.clickFx;
    }
    window.restoreGlobalDesignFields = restoreBaseToDesign;
    window.updateGlobalDesignSnap = captureBaseIfClean;

    window.applyPerGameVisuals = function(gameId) {
        if (typeof currentDesign === 'undefined' || !currentDesign) return;
        if (!baseGlobalSnap) captureBaseIfClean();

        const map = currentDesign.perGameStyle || {};
        const ov = (gameId && map[gameId]) ? map[gameId] : {};

        const effShader = ov.shaderType || baseGlobalSnap.shaderType || 'none';
        const effFx = ov.screenFx || baseGlobalSnap.screenFx || 'none';
        const effCard = ov.cardStyle || baseGlobalSnap.cardStyle || 'sega';
        const effLaunch = ov.launchAnim || baseGlobalSnap.launchAnim || 'titlecard';
        const effClick = ov.clickFx || baseGlobalSnap.clickFx || 'rings';

        currentDesign.shaderType = effShader;
        currentDesign.screenFx = effFx;
        currentDesign.cardStyle = effCard;
        currentDesign.launchAnim = effLaunch;
        currentDesign.clickFx = effClick;

        document.body.classList.remove('style-glass', 'style-neon', 'style-retro', 'style-sega', 'style-console');
        document.body.classList.add('style-' + effCard);

        if (typeof window.applyVisualFxPack === 'function') window.applyVisualFxPack();
        if (typeof window.syncClickFxStyle === 'function') window.syncClickFxStyle();
    };

const FIELD_DEFS = new Array(
        {
            key: 'shaderType',
            label: 'Фоновый шейдер для этой игры:',
            opts: new Array(
                { v: '', t: '— Как в общей теме —' },
                { v: 'none', t: 'Без шейдера' },
                { v: 'synthwave', t: 'Ретро-сетка (Synthwave)' },
                { v: 'speedlines', t: 'Скоростные линии' },
                { v: 'checker', t: 'Движущаяся шахматка' },
                { v: 'sparks', t: 'Золотые искры' },
                { v: 'mania_geo', t: 'Поп-арт геометрия' },
                { v: 'starfield', t: 'Звёздный полёт (Варп)' },
                { v: 'cyber_glitch', t: 'Цифровой глитч' }
            )
        },
        {
            key: 'screenFx',
            label: 'Экранный фильтр (Screen FX):',
            opts: new Array(
                { v: '', t: '— Как в общей теме —' },
                { v: 'none', t: 'Без фильтра' },
                { v: 'crt', t: 'ЭЛТ-монитор (CRT)' },
                { v: 'halftone', t: 'Точечный растр (Halftone)' },
                { v: 'cybergrid', t: 'Цифровая сетка' },
                { v: 'vignette', t: 'Глубокая кино-виньетка' }
            )
        },
        {
            key: 'cardStyle',
            label: 'Стиль рамок карточек:',
            opts: new Array(
                { v: '', t: '— Как в общей теме —' },
                { v: 'sega', t: 'Спортивный (скошенный)' },
                { v: 'console', t: 'Консольный HUD' },
                { v: 'retro', t: 'Ретро Пиксель' },
                { v: 'neon', t: 'Кибер-Неон' },
                { v: 'glass', t: 'Чистое Стекло' }
            )
        },
        {
            key: 'launchAnim',
            label: 'Анимация запуска игры:',
            opts: new Array(
                { v: '', t: '— Как в общей теме —' },
                { v: 'titlecard', t: 'Аркадные ленты' },
                { v: 'warpring', t: 'Кольцо-портал' },
                { v: 'crtoff', t: 'Выключение ЭЛТ' },
                { v: 'flash', t: 'Белая вспышка' }
            )
        },
        {
            key: 'clickFx',
            label: 'Частицы клика мыши:',
            opts: new Array(
                { v: '', t: '— Как в общей теме —' },
                { v: 'rings', t: 'Золотые кольца' },
                { v: 'emeralds', t: 'Гранёные кристаллы' },
                { v: 'stars', t: 'Аркадные звёзды' },
                { v: 'cyber', t: 'Кибер-пиксели' },
                { v: 'none', t: 'Без частиц' }
            )
        }
    );

    window.openPerGameStyleModal = function(targetGameId) {
        if (!currentDesign) return;
        const activeG = availableGames.at(selectedIndex);
        const gid = targetGameId || (activeG ? activeG.id : '');
        const gObj = gamesData.find(x => x.id === gid) || activeG;
        if (!gid || !gObj) return;

        document.getElementById('sgl-pgs-modal')?.remove();
        if (!currentDesign.perGameStyle) currentDesign.perGameStyle = {};
        const curOv = currentDesign.perGameStyle[gid] || {};

        const bg = mk('div', 'modal-backdrop active', 'z-index:9860;');
        bg.id = 'sgl-pgs-modal';
        const box = mk('div', 'modal-box', 'width:480px;max-width:94vw;');
        const h2 = mk('h2', '', 'margin-bottom:4px;', 'Индивидуальный стиль игры');
        const sub = mk('div', '', 'font-size:12px;color:#FFD700;font-weight:700;text-align:center;margin-bottom:12px;', gObj.name);

        const list = mk('div', 'mods-list', 'display:flex;flex-direction:column;gap:8px;max-height:390px;padding-right:4px;');
        const selectsMap = {};

        FIELD_DEFS.forEach(fd => {
            const row = mk('div', '', 'display:flex;flex-direction:column;gap:4px;background:rgba(255,255,255,0.04);padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);');
            row.appendChild(mk('span', '', 'font-size:11px;opacity:0.85;', fd.label));
            const sel = mk('select', 'custom-select', 'width:100%;padding:5px 8px;font-size:12px;');
            fd.opts.forEach(o => {
                const opt = mk('option', '', '', o.t);
                opt.value = o.v;
                sel.appendChild(opt);
            });
            sel.value = curOv[fd.key] || '';
            sel.onchange = () => {
                if (!currentDesign.perGameStyle[gid]) currentDesign.perGameStyle[gid] = {};
                if (sel.value) currentDesign.perGameStyle[gid][fd.key] = sel.value;
                else delete currentDesign.perGameStyle[gid][fd.key];
                if (activeG && activeG.id === gid) window.applyPerGameVisuals(gid);
            };
            selectsMap[fd.key] = sel;
            row.appendChild(sel);
            list.appendChild(row);
        });

        const acts = mk('div', 'modal-actions', 'margin-top:12px;display:flex;gap:8px;');
        const btnReset = mk('button', 'sgl-modal-btn-sec', 'flex:0.8;', 'Сбросить для игры');
        btnReset.type = 'button';
        btnReset.onclick = async () => {
            delete currentDesign.perGameStyle[gid];
            if (activeG && activeG.id === gid) window.applyPerGameVisuals(gid);
            restoreBaseToDesign();
            await fetch('/api/design', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentDesign)
            });
            if (activeG) window.applyPerGameVisuals(activeG.id);
            bg.remove();
            if (typeof showToast === 'function') showToast('Индивидуальный стиль сброшен');
        };

        const btnSave = mk('button', 'sgl-modal-btn-pri', 'flex:1.2;', 'Сохранить стиль');
        btnSave.type = 'button';
        btnSave.onclick = async () => {
            const cleaned = {};
            Object.keys(selectsMap).forEach(k => {
                const v = selectsMap[k].value;
                if (v) cleaned[k] = v;
            });
            if (Object.keys(cleaned).length > 0) currentDesign.perGameStyle[gid] = cleaned;
            else delete currentDesign.perGameStyle[gid];

            restoreBaseToDesign();
            await fetch('/api/design', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentDesign)
            });
            if (activeG) window.applyPerGameVisuals(activeG.id);
            if (typeof playSfx === 'function') playSfx('launch');
            bg.remove();
            if (typeof showToast === 'function') showToast('Стиль игры сохранён!');
        };

        acts.append(btnReset, btnSave);
        box.append(h2, sub, list, acts);
        bg.appendChild(box);
        document.body.appendChild(bg);
        if (typeof playSfx === 'function') playSfx('open_menu');
    };

const _bootPgs = () => {
        const origLoad = window.loadGames;
        if (typeof origLoad === 'function') {
            window.loadGames = async function() {
                const r = await origLoad.apply(this, arguments);
                captureBaseIfClean();
                const g = availableGames.at(selectedIndex);
                if (g) window.applyPerGameVisuals(g.id);
                return r;
            };
        }

        const origSel = window.selectGame;
        if (typeof origSel === 'function') {
            window.selectGame = function() {
                const r = origSel.apply(this, arguments);
                const g = availableGames.at(selectedIndex);
                if (g) window.applyPerGameVisuals(g.id);
                return r;
            };
        }

        const origOpenCustom = window.openCustomModal;
        if (typeof origOpenCustom === 'function') {
            window.openCustomModal = function() {
                restoreBaseToDesign();
                return origOpenCustom.apply(this, arguments);
            };
        }

        const origSaveCustom = window.saveAndCloseCustom;
        if (typeof origSaveCustom === 'function') {
            window.saveAndCloseCustom = async function() {
                const r = await origSaveCustom.apply(this, arguments);
                captureBaseIfClean();
                const g = availableGames.at(selectedIndex);
                if (g) window.applyPerGameVisuals(g.id);
                return r;
            };
        }

        // Добавляем кнопку "Стиль игры..." в каждую карточку менеджера Графика и видео
        const origMedia = window.renderMediaManager;
        if (typeof origMedia === 'function') {
            window.renderMediaManager = function() {
                const r = origMedia.apply(this, arguments);
                const cards = document.querySelectorAll('#media-settings-list .char-card-cfg');
                cards.forEach((card, idx) => {
                    const g = gamesData.at(idx);
                    const hdr = card.querySelector('.char-cfg-header');
                    if (g && hdr && !hdr.querySelector('.pgs-open-btn')) {
                        hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
                        const b = mk('button', 'btn-small btn-accent pgs-open-btn', 'font-size:10px;padding:3px 8px;', 'Свой стиль FX...');
                        b.type = 'button';
                        b.onclick = () => window.openPerGameStyleModal(g.id);
                        hdr.appendChild(b);
                    }
                });
                return r;
            };
        }

        setTimeout(() => {
            captureBaseIfClean();
            const g = availableGames.at(selectedIndex);
            if (g) window.applyPerGameVisuals(g.id);
        }, 450);
    };

    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', _bootPgs);
    else _bootPgs();
})();
