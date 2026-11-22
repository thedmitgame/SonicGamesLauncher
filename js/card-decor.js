/* === CLEAN CARD DECORATIONS v3 (NO BOX ARTIFACTS + FIXED EXIT LAYER) === */
(function() {
    let activeLiveNodes = [];
    let lastSelectedIdx = -1;

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function injectDecorStyles() {
        if (document.getElementById('sgl-decor-css')) return;
        const st = mk('style', '', '');
        st.id = 'sgl-decor-css';
        st.textContent = [
            '.game-card .cover-box{z-index:2;}',
            '.game-card .game-title,.game-card .game-tag,.game-card .playtime-badge{position:relative;z-index:3;}',
            '.sgl-dec-wrap{position:absolute;left:50%;top:42%;width:0;height:0;pointer-events:none;border:none !important;background:none !important;box-shadow:none !important;}',
            '.sgl-dec-back{z-index:1;}',
            '.sgl-dec-front{z-index:9;}',
            '.sgl-dec-slot{position:absolute;transform:translate(-50%,-50%);pointer-events:none;border:none !important;outline:none !important;background:transparent !important;box-shadow:none !important;}',
            '.sgl-dec-enter{width:100%;height:100%;border:none !important;background:transparent !important;}',
            '.sgl-dec-img{display:block;width:100%;height:100%;object-fit:contain;border:none !important;outline:none !important;background:transparent !important;box-shadow:none !important;filter:none !important;}',
            '@keyframes decInPop{0%{opacity:0;transform:scale(0.15)}70%{opacity:1;transform:scale(1.15)}100%{opacity:1;transform:scale(1)}}',
            '@keyframes decInRise{0%{opacity:0;transform:translateY(42px) scale(0.7)}100%{opacity:1;transform:translateY(0) scale(1)}}',
            '@keyframes decInZoom{0%{opacity:0;transform:scale(1.85)}100%{opacity:1;transform:scale(1)}}',
            '@keyframes decInSpin{0%{opacity:0;transform:rotate(-180deg) scale(0.2)}100%{opacity:1;transform:rotate(0deg) scale(1)}}',
            '@keyframes decInFade{0%{opacity:0}100%{opacity:1}}',
            '.dec-in-pop{animation:decInPop 0.44s cubic-bezier(0.34,1.56,0.64,1) both;}',
            '.dec-in-rise{animation:decInRise 0.42s cubic-bezier(0.22,1,0.36,1) both;}',
            '.dec-in-zoom{animation:decInZoom 0.38s cubic-bezier(0.22,1,0.36,1) both;}',
            '.dec-in-spin{animation:decInSpin 0.48s cubic-bezier(0.22,1,0.36,1) both;}',
            '.dec-in-fade{animation:decInFade 0.35s ease-out both;}',
            '@keyframes decLoopFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-11px)}}',
            '@keyframes decLoopPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}',
            '@keyframes decLoopSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}',
            '@keyframes decLoopOrbit{0%{transform:rotate(0deg) translateX(16px) rotate(0deg)}100%{transform:rotate(360deg) translateX(16px) rotate(-360deg)}}',
            '.dec-loop-float{animation:decLoopFloat var(--dec-dur,2.6s) ease-in-out infinite;}',
            '.dec-loop-pulse{animation:decLoopPulse var(--dec-dur,2.0s) ease-in-out infinite;}',
            '.dec-loop-spin{animation:decLoopSpin var(--dec-dur,5.0s) linear infinite;}',
            '.dec-loop-orbit{animation:decLoopOrbit var(--dec-dur,4.0s) linear infinite;}',
            '@keyframes decOutScatter{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--out-dx,65px),var(--out-dy,-45px)) scale(0.2)}}',
            '@keyframes decOutShrink{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(0.05)}}',
            '@keyframes decOutDrop{0%{opacity:1;transform:translateY(0) scale(1)}25%{transform:translateY(-14px) scale(1.05)}100%{opacity:0;transform:translateY(85px) scale(0.55)}}',
            '@keyframes decOutFade{0%{opacity:1}100%{opacity:0}}',
            '.dec-out-scatter{animation:decOutScatter 0.42s cubic-bezier(0.16,1,0.3,1) forwards !important;}',
            '.dec-out-shrink{animation:decOutShrink 0.36s ease-in forwards !important;}',
            '.dec-out-drop{animation:decOutDrop 0.44s ease-in forwards !important;}',
            '.dec-out-fade{animation:decOutFade 0.32s ease-out forwards !important;}'
        ].join('\n');
        document.head.appendChild(st);
    }
    function appendKeyframes() {}

    function getDecorList(scopeKey) {
        if (typeof currentDesign === 'undefined' || !currentDesign) return [];
        if (!currentDesign.cardDecor) currentDesign.cardDecor = {};
        if (!Array.isArray(currentDesign.cardDecor[scopeKey])) currentDesign.cardDecor[scopeKey] = [];
        return currentDesign.cardDecor[scopeKey];
    }

    function exitCardDecor(cardEl) {
        if (!cardEl) return;
        const wraps = Array.from(cardEl.querySelectorAll('.sgl-dec-wrap:not(.sgl-dec-exiting)'));
        wraps.forEach(w => {
            w.classList.add('sgl-dec-exiting');
            let hasAnim = false;
            w.querySelectorAll('.sgl-dec-enter').forEach(en => {
                const outMode = en.dataset.exitAnim || 'scatter';
                if (outMode === 'none') {
                    en.style.display = 'none';
                } else {
                    hasAnim = true;
                    en.style.animationDelay = '0s';
                    en.className = 'sgl-dec-enter dec-out-' + outMode;
                }
            });
            if (!hasAnim) w.remove();
            else setTimeout(() => w.remove(), 460);
        });
    }

    function playExitGhosts() {
        const curCard = document.querySelectorAll('.game-card').item(selectedIndex);
        if (curCard) exitCardDecor(curCard);
        activeLiveNodes = [];
    }

    window.renderActiveCardDecor = function(mode) {
        injectDecorStyles();
        if (mode === 'preview_out') {
            playExitGhosts();
            return;
        }
        document.querySelectorAll('.sgl-dec-wrap:not(.sgl-dec-exiting)').forEach(el => el.remove());
        activeLiveNodes = [];
        if (typeof currentDesign === 'undefined' || !currentDesign || currentDesign.liteMode) return;

        const g = (typeof availableGames !== 'undefined' && availableGames.length > 0) ? availableGames.at(selectedIndex) : null;
        const cards = document.querySelectorAll('.game-card');
        const selCard = g ? cards.item(selectedIndex) : null;
        const coverBox = selCard ? selCard.querySelector('.cover-box') : null;
        if (!g || !selCard || !coverBox) return;

        const playEnter = (mode === 'switch' || mode === 'preview_in');
        const merged = [...getDecorList('global'), ...getDecorList(g.id)];
        if (merged.length === 0) return;

        const backW = mk('div', 'sgl-dec-wrap sgl-dec-back', '');
        const frontW = mk('div', 'sgl-dec-wrap sgl-dec-front', '');

        merged.forEach((it, i) => {
            if (!it || !it.url) return;
            const sz = it.size || 52;
            const rot = it.rot || 0;
            const ox = it.x || 0, oy = it.y || 0;
            const dur = (2.8 / Math.max(0.4, Number(it.speed || 1))).toFixed(2) + 's';
            const enterAnim = it.enterAnim || 'pop';
            const loopAnim = it.anim || 'float';
            const exitAnim = it.exitAnim || 'scatter';

            const slot = mk('div', 'sgl-dec-slot', 'left:' + ox + 'px;top:' + oy + 'px;width:' + sz + 'px;height:' + sz + 'px;transform:translate(-50%,-50%) rotate(' + rot + 'deg);');
            const enterBox = mk('div', 'sgl-dec-enter' + (playEnter && enterAnim !== 'none' ? (' dec-in-' + enterAnim) : ''), '');
            enterBox.dataset.exitAnim = exitAnim;
            enterBox.style.setProperty('--out-dx', (ox >= 0 ? 68 : -68) + 'px');
            enterBox.style.setProperty('--out-dy', (oy >= 0 ? 48 : -48) + 'px');
            enterBox.dataset.exitAnim = exitAnim;
            enterBox.style.setProperty('--out-dx', (ox >= 0 ? 68 : -68) + 'px');
            enterBox.style.setProperty('--out-dy', (oy >= 0 ? 48 : -48) + 'px');
            if (playEnter) enterBox.style.animationDelay = ((i * 0.04) % 0.3).toFixed(2) + 's';

            const img = document.createElement('img');
            img.src = it.url;
            img.className = 'sgl-dec-img' + (loopAnim !== 'none' ? (' dec-loop-' + loopAnim) : '');
            img.style.setProperty('--dec-dur', dur);

            enterBox.appendChild(img);
            slot.appendChild(enterBox);
            if (it.layer === 'back') backW.appendChild(slot);
            else frontW.appendChild(slot);

            activeLiveNodes.push({ el: slot, url: it.url, ox, oy, rot, exitAnim });
        });

        coverBox.before(backW);
        coverBox.after(frontW);
    };

    const ENTER_OPTS = [
        { v: 'pop', t: 'Вход: Пружина (Pop)' },
        { v: 'rise', t: 'Вход: Подъём снизу' },
        { v: 'zoom', t: 'Вход: Слёт к центру' },
        { v: 'spin', t: 'Вход: Вкручивание' },
        { v: 'fade', t: 'Вход: Проявление' },
        { v: 'none', t: 'Вход: Мгновенно' }
    ];
    const LOOP_OPTS = [
        { v: 'float', t: 'Цикл: Левитация' },
        { v: 'orbit', t: 'Цикл: Орбита' },
        { v: 'pulse', t: 'Цикл: Пульсация' },
        { v: 'spin', t: 'Цикл: Вращение 360°' },
        { v: 'none', t: 'Цикл: Статика' }
    ];
    const EXIT_OPTS = [
        { v: 'scatter', t: 'Уход: Разлёт в стороны' },
        { v: 'shrink', t: 'Уход: Сжатие в точку' },
        { v: 'drop', t: 'Уход: Падение вниз' },
        { v: 'fade', t: 'Уход: Растворение' },
        { v: 'none', t: 'Уход: Мгновенно' }
    ];

    window.openCardDecorModal = function(targetGameId) {
        if (typeof currentDesign === 'undefined' || !currentDesign) return;
        const activeG = (typeof availableGames !== 'undefined') ? availableGames.at(selectedIndex) : null;
        const gid = targetGameId || (activeG ? activeG.id : 'sonic1');
        const gObj = (typeof gamesData !== 'undefined' ? gamesData.find(x => x.id === gid) : null) || activeG;
        let curScope = gid;

        document.getElementById('sgl-decor-modal')?.remove();
        const bg = mk('div', 'modal-backdrop active', 'z-index:9875;');
        bg.id = 'sgl-decor-modal';
        bg.onclick = (e) => { if (e.target === bg) bg.remove(); };

        const box = mk('div', 'modal-box', 'width:900px;max-width:95vw;max-height:90vh;padding:22px 24px;');
        box.appendChild(mk('div', 'modal-title', 'margin-bottom:10px;font-size:19px;', 'Декорации вокруг обложки игры'));

        const topBar = mk('div', '', 'display:flex;gap:10px;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;');
        const scopeSel = mk('select', 'custom-select', 'flex:1;min-width:220px;font-weight:700;padding:8px 12px;');
        const oGame = mk('option', '', '', 'Только для: ' + (gObj ? gObj.name : gid)); oGame.value = gid;
        const oGlob = mk('option', '', '', 'Для всех игр (Общий декор)'); oGlob.value = 'global';
        scopeSel.append(oGame, oGlob);

        const topBtns = mk('div', '', 'display:flex;gap:6px;flex-wrap:wrap;');
        const testInB = mk('button', 'btn-small', 'padding:8px 12px;', '▶ Тест входа');
        testInB.type = 'button';
        const testOutB = mk('button', 'btn-small', 'padding:8px 12px;', '▶ Тест ухода');
        testOutB.type = 'button';
        const addBtn = mk('button', 'btn-small btn-accent', 'padding:8px 15px;font-weight:700;', '+ Добавить объект (.png / .gif)');
        addBtn.type = 'button';
        topBtns.append(testInB, testOutB, addBtn);
        topBar.append(scopeSel, topBtns);

        const workGrid = mk('div', '', 'display:grid;grid-template-columns:330px minmax(0,1fr);gap:16px;align-items:stretch;');
        const stage = mk('div', '', 'height:380px;background:radial-gradient(circle at center,rgba(30,41,59,0.7),rgba(6,10,20,0.85));border:1px solid rgba(255,255,255,0.16);border-radius:14px;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;');
        const mockCard = mk('div', '', 'width:150px;height:214px;border-radius:12px;border:2px solid ' + (gObj?.color || '#FFD700') + ';background:#0f172a;overflow:hidden;position:relative;z-index:2;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;text-align:center;padding:10px;pointer-events:none;');
        if (gObj && gObj.cover) {
            const cImg = document.createElement('img');
            cImg.src = gObj.cover;
            cImg.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            mockCard.appendChild(cImg);
        } else {
            mockCard.textContent = gObj ? gObj.name : 'COVER';
        }
        stage.append(mockCard, mk('div', '', 'position:absolute;bottom:8px;left:0;right:0;text-align:center;font-size:11px;opacity:0.65;pointer-events:none;', 'Перетаскивайте объекты мышкой прямо на сцене'));

        const listEl = mk('div', 'mods-list', 'max-height:380px;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;gap:9px;padding-right:6px;min-width:0;');
        workGrid.append(stage, listEl);

        function makeSel(opts, curVal, onChg) {
            const s = mk('select', 'custom-select', 'padding:5px 7px;font-size:11px;width:100%;min-width:0;');
            opts.forEach(o => { const op = mk('option', '', '', o.t); op.value = o.v; s.appendChild(op); });
            s.value = curVal;
            s.onchange = () => onChg(s.value);
            return s;
        }

        function renderStageAndRows(previewPhase) {
            stage.querySelectorAll('.dec-drag-handle').forEach(e => e.remove());
            listEl.innerHTML = '';
            const items = getDecorList(curScope);
            const sc = 0.72;

            if (items.length === 0) {
                listEl.appendChild(mk('div', '', 'font-size:12.5px;opacity:0.65;text-align:center;padding:40px 16px;', 'Объектов пока нет. Нажмите «+ Добавить объект», чтобы загрузить изумруды, кольца или свои спрайты!'));
            }

            items.forEach((it, idx) => {
                const hSz = Math.max(22, Math.round((it.size || 52) * sc));
                const ox = it.x || 0, oy = it.y || 0;
                const h = mk('div', 'dec-drag-handle', 'position:absolute;left:calc(50% + ' + Math.round(ox * sc) + 'px);top:calc(50% + ' + Math.round(oy * sc) + 'px);width:' + hSz + 'px;height:' + hSz + 'px;transform:translate(-50%,-50%) rotate(' + (it.rot || 0) + 'deg);cursor:grab;z-index:' + (it.layer === 'back' ? '1' : '5') + ';');
                h.style.setProperty('--out-dx', (ox >= 0 ? 55 : -55) + 'px');
                h.style.setProperty('--out-dy', (oy >= 0 ? 45 : -45) + 'px');
                let inOutCls = '';
                if (previewPhase === 'in' && (it.enterAnim || 'pop') !== 'none') inOutCls = ' dec-in-' + (it.enterAnim || 'pop');
                if (previewPhase === 'out' && (it.exitAnim || 'scatter') !== 'none') inOutCls = ' dec-out-' + (it.exitAnim || 'scatter');
                const innerBox = mk('div', 'sgl-dec-enter' + inOutCls, '');
                innerBox.style.setProperty('--out-dx', (ox >= 0 ? 55 : -55) + 'px');
                innerBox.style.setProperty('--out-dy', (oy >= 0 ? 45 : -45) + 'px');
                const hImg = document.createElement('img');
                hImg.src = it.url;
                hImg.className = 'sgl-dec-img' + (!previewPhase && (it.anim || 'float') !== 'none' ? (' dec-loop-' + (it.anim || 'float')) : '');
                hImg.style.pointerEvents = 'none';
                innerBox.appendChild(hImg);
                h.appendChild(innerBox);

                h.onpointerdown = (ev) => {
                    ev.preventDefault();
                    const sx = ev.clientX, sy = ev.clientY, startX = it.x || 0, startY = it.y || 0;
                    const onMv = (me) => {
                        it.x = Math.max(-210, Math.min(210, Math.round(startX + (me.clientX - sx) / sc)));
                        it.y = Math.max(-220, Math.min(220, Math.round(startY + (me.clientY - sy) / sc)));
                        h.style.left = 'calc(50% + ' + Math.round(it.x * sc) + 'px)';
                        h.style.top = 'calc(50% + ' + Math.round(it.y * sc) + 'px)';
                        window.renderActiveCardDecor('silent');
                    };
                    const onUp = () => { window.removeEventListener('pointermove', onMv); window.removeEventListener('pointerup', onUp); renderStageAndRows(); };
                    window.addEventListener('pointermove', onMv);
                    window.addEventListener('pointerup', onUp);
                };
                stage.appendChild(h);

                const row = mk('div', 'char-card-cfg', 'padding:10px 12px;margin-bottom:0;gap:8px;min-width:0;');
                const rTop = mk('div', '', 'display:flex;justify-content:space-between;align-items:center;gap:8px;min-width:0;');
                rTop.appendChild(mk('span', '', 'font-size:12px;font-weight:800;color:#FFD700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;', '#' + (idx + 1) + ' • ' + (it.name || 'Sprite') + ' (X:' + ox + ', Y:' + oy + ')'));

                const topRight = mk('div', '', 'display:flex;gap:5px;align-items:center;flex-shrink:0;');
                const layerSel = makeSel([{ v: 'front', t: 'Поверх обложки' }, { v: 'back', t: 'За обложкой' }], it.layer || 'front', v => { it.layer = v; renderStageAndRows(); window.renderActiveCardDecor('silent'); });
                layerSel.style.width = '132px';
                const dupB = mk('button', 'btn-small', 'padding:4px 8px;', 'Копия');
                dupB.type = 'button';
                dupB.onclick = () => { const cp = JSON.parse(JSON.stringify(it)); cp.x = -ox || 65; items.push(cp); renderStageAndRows('in'); window.renderActiveCardDecor('preview_in'); };
                const delB = mk('button', 'btn-small btn-clear', 'padding:4px 9px;', '×');
                delB.type = 'button';
                delB.onclick = () => { items.splice(idx, 1); renderStageAndRows(); window.renderActiveCardDecor('silent'); };
                topRight.append(layerSel, dupB, delB);
                rTop.appendChild(topRight);

                const rAnims = mk('div', '', 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;');
                rAnims.append(
                    makeSel(ENTER_OPTS, it.enterAnim || 'pop', v => { it.enterAnim = v; renderStageAndRows('in'); window.renderActiveCardDecor('preview_in'); }),
                    makeSel(LOOP_OPTS, it.anim || 'float', v => { it.anim = v; renderStageAndRows(); window.renderActiveCardDecor('silent'); }),
                    makeSel(EXIT_OPTS, it.exitAnim || 'scatter', v => { it.exitAnim = v; renderStageAndRows('out'); setTimeout(() => renderStageAndRows(), 480); })
                );

                const rSliders = mk('div', '', 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;font-size:11px;');
                const makeRng = (lbl, min, max, step, val, cb) => {
                    const w = mk('div', '', 'display:flex;flex-direction:column;gap:3px;min-width:0;');
                    const sp = mk('span', '', 'opacity:0.82;', lbl + ': ' + val);
                    const inp = document.createElement('input');
                    inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = val;
                    inp.style.cssText = 'width:100%;min-width:0;';
                    inp.oninput = () => { sp.textContent = lbl + ': ' + inp.value; cb(Number(inp.value)); };
                    w.append(sp, inp);
                    return w;
                };
                rSliders.append(
                    makeRng('Размер', 20, 170, 2, it.size || 52, v => { it.size = v; renderStageAndRows(); window.renderActiveCardDecor('silent'); }),
                    makeRng('Угол °', -180, 180, 5, it.rot || 0, v => { it.rot = v; renderStageAndRows(); window.renderActiveCardDecor('silent'); }),
                    makeRng('Скорость', 0.4, 2.8, 0.2, it.speed || 1, v => { it.speed = v; window.renderActiveCardDecor('silent'); })
                );

                row.append(rTop, rAnims, rSliders);
                listEl.appendChild(row);
            });
        }

        testInB.onclick = () => { renderStageAndRows('in'); window.renderActiveCardDecor('preview_in'); };
        testOutB.onclick = () => {
            renderStageAndRows('out');
            window.renderActiveCardDecor('preview_out');
            setTimeout(() => { renderStageAndRows(); window.renderActiveCardDecor('preview_in'); }, 520);
        };
        scopeSel.onchange = () => { curScope = scopeSel.value; renderStageAndRows(); };
        addBtn.onclick = async () => {
            const r = await (await fetch('/api/assets/pick_image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: 'decor_' + curScope }) })).json();
            if (!r.ok || !r.url) return;
            const list = getDecorList(curScope);
            const ang = (list.length * 1.05);
            list.push({
                url: r.url, name: r.name,
                x: Math.round(Math.cos(ang) * 105), y: Math.round(Math.sin(ang) * 105),
                size: 52, rot: 0, speed: 1,
                enterAnim: 'pop', anim: 'float', exitAnim: 'scatter', layer: 'front'
            });
            if (typeof playSfx === 'function') playSfx('switch');
            renderStageAndRows('in');
            window.renderActiveCardDecor('preview_in');
        };

        const acts = mk('div', 'modal-actions', 'margin-top:14px;display:flex;gap:10px;');
        const clrBtn = mk('button', 'btn-reset', 'flex:0.5;', 'Очистить всё');
        clrBtn.type = 'button';
        clrBtn.onclick = () => { currentDesign.cardDecor[curScope] = []; renderStageAndRows(); window.renderActiveCardDecor('silent'); };
        const saveBtn = mk('button', 'close-modal-btn', 'margin-top:0;flex:1.5;', 'Сохранить декорации');
        saveBtn.type = 'button';
        saveBtn.onclick = async () => {
            if (typeof window.restoreGlobalDesignFields === 'function') window.restoreGlobalDesignFields();
            await fetch('/api/design', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(currentDesign) });
            if (activeG && typeof window.applyPerGameVisuals === 'function') window.applyPerGameVisuals(activeG.id);
            window.renderActiveCardDecor('silent');
            if (typeof playSfx === 'function') playSfx('launch');
            bg.remove();
            if (typeof showToast === 'function') showToast('Декорации обложки сохранены!');
        };
        acts.append(clrBtn, saveBtn);

        box.append(topBar, workGrid, acts);
        bg.appendChild(box);
        document.body.appendChild(bg);
        renderStageAndRows();
        if (typeof playSfx === 'function') playSfx('open_menu');
    };

    const _bootDec = () => {
        injectDecorStyles();
        appendKeyframes();

        const origSel = window.selectGame;
        if (typeof origSel === 'function' && !window._decSelHookedV3) {
            window._decSelHookedV3 = true;
            window.selectGame = function(idx) {
                const total = (typeof availableGames !== 'undefined') ? availableGames.length : 0;
                const nextNorm = total > 0 ? ((idx + total) % total) : 0;
                const changed = (lastSelectedIdx !== -1 && nextNorm !== lastSelectedIdx);
                if (changed) playExitGhosts();
                const r = origSel.apply(this, arguments);
                lastSelectedIdx = selectedIndex;
                window.renderActiveCardDecor(changed ? 'preview_in' : 'silent');
                return r;
            };
        }

        setTimeout(() => { lastSelectedIdx = (typeof selectedIndex !== 'undefined' ? selectedIndex : 0); window.renderActiveCardDecor('silent'); }, 480);
    };

    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', _bootDec);
    else _bootDec();
})();
