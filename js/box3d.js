/* === 3D PHYSICAL GAME BOXES v3 (PURE CHROMIUM-SAFE 3D PRISM) === */
(function() {
    let flippedCardIdx = -1;

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function injectBox3dStyles() {
        let st = document.getElementById('sgl-box3d-css');
        if (!st) {
            st = mk('style', '', '');
            st.id = 'sgl-box3d-css';
            document.head.appendChild(st);
        }
        st.textContent = [
            '.carousel-wrapper{overflow:visible !important;}',
            '.game-card.has-box3d .cover-box{overflow:visible !important;background:none !important;border:none !important;box-shadow:none !important;backdrop-filter:none !important;perspective:950px;}',
            '.game-card.has-box3d .cover-box > img, .game-card.has-box3d .cover-box > .cover-placeholder{opacity:0 !important;pointer-events:none !important;}',
            '.game-card.has-box3d .cover-box > .play-overlay{display:none !important;}',
            '.sgl-b3d-rig{position:absolute;inset:4px;transform-style:preserve-3d;-webkit-transform-style:preserve-3d;transition:transform 0.52s cubic-bezier(0.22,1,0.36,1);}',
            '.b3d-gloss{position:absolute;inset:0;background:linear-gradient(125deg,rgba(255,255,255,0.18) 0%,rgba(255,255,255,0.03) 38%,transparent 45%);pointer-events:none;z-index:3;}',
            /* ВАЖНО: на .b3d-face НЕТ overflow:hidden и НЕТ filter — иначе Chromium ломает backface-visibility! */
            '.b3d-face{position:absolute;transform-style:flat;backface-visibility:hidden;-webkit-backface-visibility:hidden;box-sizing:border-box;}',
            '.b3d-inner{width:100%;height:100%;overflow:hidden;position:relative;box-sizing:border-box;backface-visibility:hidden;-webkit-backface-visibility:hidden;}',
            '.b3d-front-in{border-radius:2px 7px 7px 2px;background:linear-gradient(160deg,#162033 0%,#0b101d 100%);border:1.5px solid rgba(255,255,255,0.18);border-left:1px solid rgba(255,255,255,0.32);box-shadow:0 14px 28px rgba(0,0,0,0.68);display:flex;flex-direction:column;align-items:center;justify-content:space-between;}',
            '.game-card.selected .b3d-front-in{border-color:#FFD700;box-shadow:0 16px 34px rgba(0,0,0,0.78), 0 0 18px rgba(255,215,0,0.28);}',
            '.b3d-back-in{border-radius:7px 2px 2px 7px;background:linear-gradient(155deg,#131c2e,#090d16);border:2px solid var(--b3d-col,#334155);box-shadow:0 16px 32px rgba(0,0,0,0.72);display:flex;flex-direction:column;justify-content:space-between;padding:12px;color:#fff;text-align:left;}',
            '.b3d-spine-in{background:linear-gradient(90deg,#090d16,var(--b3d-col,#1e293b),#090d16);border:1px solid rgba(255,255,255,0.22);display:flex;align-items:center;justify-content:center;}',
            '.b3d-spine-txt{writing-mode:vertical-rl;transform:rotate(180deg);font-size:10px;font-weight:900;letter-spacing:1.2px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-height:90%;text-transform:uppercase;}',
            '.b3d-edge-in{background:linear-gradient(90deg,#0f172a 0%,#475569 42%,#e2e8f0 50%,#475569 58%,#0f172a 100%);border-top:2px solid var(--b3d-col,#334155);border-bottom:2px solid var(--b3d-col,#334155);}',
            '.b3d-cap-in{background:var(--b3d-col,#1e293b);border:1px solid rgba(255,255,255,0.12);}',
            '.case-cd .b3d-front-in,.case-cd .b3d-back-in{border-color:rgba(226,232,240,0.55);border-left:7px solid #0f172a;border-radius:3px;}',
            '.case-dvd .b3d-front-in{border-top:13px solid var(--b3d-col,#1d4ed8);border-radius:3px 9px 9px 3px;}',
            '.sgl-flip-btn{position:absolute;top:-28px;left:50%;transform:translateX(-50%) translateZ(45px);z-index:40;padding:3px 11px;border-radius:999px;border:1px solid rgba(255,215,0,0.75);background:rgba(9,13,22,0.92);backdrop-filter:blur(6px);color:#FFD700;font-size:10.5px;font-weight:900;cursor:pointer;opacity:0;transition:opacity 0.2s,background 0.15s;white-space:nowrap;box-shadow:0 6px 16px rgba(0,0,0,0.6);}',
            '.sgl-flip-btn::after{content:"";position:absolute;left:-12px;right:-12px;top:100%;height:16px;}',
            '.game-card.has-box3d.selected:hover .sgl-flip-btn, .game-card.has-box3d.is-flipped .sgl-flip-btn{opacity:1;}',
            '.sgl-flip-btn:hover{background:#FFD700;color:#090d16;}'
        ].join('\n');
    }

    function getBoxCfg(gameId) {
        if (typeof currentDesign === 'undefined' || !currentDesign) return { enabled: false };
        const root = currentDesign.box3d || {};
        const glob = root._global || {};
        const spec = (gameId && root[gameId]) ? root[gameId] : {};
        const mode = spec.mode || (glob.enabled ? (glob.caseType || 'cartridge') : 'flat');
        if (mode === 'flat') return { enabled: false };
        return {
            enabled: true,
            caseType: mode,
            depth: Number(spec.depth || glob.depth || (mode === 'cd' ? 14 : (mode === 'dvd' ? 20 : 28))),
            caseColor: spec.caseColor || glob.caseColor || '',
            spineUrl: spec.spineUrl || '',
            backUrl: spec.backUrl || '',
            backText: spec.backText || ''
        };
    }

    function buildPrismNode(g, cfg, rotX, rotY, noTransition) {
        const d = Math.max(10, Math.min(52, Number(cfg.depth || 26)));
        const hd = (d / 2).toFixed(1);
        const col = cfg.caseColor || g.color || '#1E293B';

        const rig = mk('div', 'sgl-b3d-rig case-' + (cfg.caseType || 'cartridge'), (noTransition ? 'transition:none;' : '') + 'transform:rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg);');
        rig.style.setProperty('--b3d-col', col);

        // 1. Передняя крышка (+hd по Z, нормаль +Z)
        const fFace = mk('div', 'b3d-face', 'inset:0;transform:translate3d(0,0,' + hd + 'px);');
        const fIn = mk('div', 'b3d-inner b3d-front-in', '');
        if (g.cover) {
            const im = document.createElement('img');
            im.src = g.cover;
            im.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
            fIn.appendChild(im);
        } else {
            const hdrStrip = mk('div', '', 'width:100%;padding:5px 8px;background:linear-gradient(90deg,' + col + ',rgba(15,23,42,0.9));font-size:8.5px;font-weight:900;letter-spacing:1.2px;color:#fff;text-align:right;box-sizing:border-box;border-bottom:1px solid rgba(255,255,255,0.2);', (cfg.caseType || 'BOX').toUpperCase());
            const midArt = mk('div', '', 'flex:1;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px;box-sizing:border-box;background:radial-gradient(circle at 50% 38%,' + col + '44 0%,transparent 72%);gap:6px;');
            midArt.append(
                mk('div', '', 'font-weight:900;font-size:13px;line-height:1.2;text-align:center;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,0.8);', g.name),
                mk('div', '', 'font-size:8.5px;font-weight:800;padding:2px 7px;border-radius:999px;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.75);', g.tag || 'EDITION')
            );
            const botBar = mk('div', '', 'width:100%;height:4px;background:' + col + ';opacity:0.85;');
            fIn.append(hdrStrip, midArt, botBar);
        }
        fIn.appendChild(mk('div', 'b3d-gloss', ''));
        fFace.appendChild(fIn);

        // 2. Задняя крышка (-hd по Z, нормаль -Z -> rotateY(180deg) translateZ(hd))
        const bFace = mk('div', 'b3d-face', 'inset:0;transform:rotateY(180deg) translate3d(0,0,' + hd + 'px);');
        const bIn = mk('div', 'b3d-inner b3d-back-in', '');
        if (cfg.backUrl) {
            const im = document.createElement('img');
            im.src = cfg.backUrl;
            im.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
            bIn.appendChild(im);
        } else {
            const topB = mk('div', '', '');
            topB.append(
                mk('div', '', 'font-size:11px;font-weight:900;color:#FFD700;margin-bottom:5px;', g.name),
                mk('div', '', 'font-size:9.5px;line-height:1.4;opacity:0.84;', cfg.backText || g.note || (g.tag ? ('Издание: ' + g.tag) : 'Физическое 3D-издание'))
            );
            const botB = mk('div', '', 'font-size:8.5px;opacity:0.55;border-top:1px solid rgba(255,255,255,0.15);padding-top:5px;display:flex;justify-content:space-between;');
            botB.append(mk('span', '', '', '1P'), mk('span', '', '', (cfg.caseType || 'BOX').toUpperCase()));
            bIn.append(topB, botB);
        }
        bFace.appendChild(bIn);

        // 3. Левый корешок (ширина d, центр на X=0 -> left:-hd, поворот rotateY(-90deg), нормаль смотрит наружу влево!)
        const sFace = mk('div', 'b3d-face', 'top:0;bottom:0;left:-' + hd + 'px;width:' + d + 'px;transform:rotateY(-90deg);');
        const sIn = mk('div', 'b3d-inner b3d-spine-in', '');
        if (cfg.spineUrl) {
            const im = document.createElement('img');
            im.src = cfg.spineUrl;
            im.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            sIn.appendChild(im);
        } else {
            sIn.appendChild(mk('span', 'b3d-spine-txt', '', g.name));
        }
        sFace.appendChild(sIn);

        // 4. Правый торец (ширина d, right:-hd, поворот rotateY(+90deg), нормаль смотрит наружу вправо!)
        const eFace = mk('div', 'b3d-face', 'top:2px;bottom:2px;right:-' + hd + 'px;width:' + d + 'px;transform:rotateY(90deg);');
        eFace.appendChild(mk('div', 'b3d-inner b3d-edge-in', ''));

        // 5. Верхняя и нижняя крышки (высота d, top:-hd / bottom:-hd)
        const tFace = mk('div', 'b3d-face', 'left:0;right:0;top:-' + hd + 'px;height:' + d + 'px;transform:rotateX(90deg);');
        tFace.appendChild(mk('div', 'b3d-inner b3d-cap-in', ''));
        const btFace = mk('div', 'b3d-face', 'left:0;right:0;bottom:-' + hd + 'px;height:' + d + 'px;transform:rotateX(-90deg);');
        btFace.appendChild(mk('div', 'b3d-inner b3d-cap-in', ''));

        rig.append(fFace, bFace, sFace, eFace, tFace, btFace);
        return rig;
    }

    window.applyBox3dToCarousel = function() {
        injectBox3dStyles();
        const cards = document.querySelectorAll('.game-card');
        cards.forEach((card, idx) => {
            card.querySelector('.sgl-b3d-rig')?.remove();
            card.querySelector('.sgl-flip-btn')?.remove();
            card.classList.remove('has-box3d', 'is-flipped');

            if (typeof currentDesign !== 'undefined' && currentDesign?.liteMode) return;
            const g = (typeof availableGames !== 'undefined') ? availableGames.at(idx) : null;
            const coverBox = card.querySelector('.cover-box');
            if (!g || !coverBox) return;

            const cfg = getBoxCfg(g.id);
            if (!cfg.enabled) return;

            card.classList.add('has-box3d');
            const isSel = (idx === selectedIndex);
            const isFlp = (isSel && flippedCardIdx === idx);
            if (isFlp) card.classList.add('is-flipped');

            // Положительный rotateY(+25deg) поворачивает левый корешок вперёд к зрителю!
            const isGridOrRow = document.body.classList.contains('mode-grid-active') || (typeof currentDesign !== 'undefined' && currentDesign?.carouselMode === 'row');
            const ry = isFlp ? 204 : (isGridOrRow ? 28 : (isSel ? 26 : 30));
            const rx = isFlp ? -3 : -4;
            const rig = buildPrismNode(g, cfg, rx, ry, false);
            coverBox.appendChild(rig);

            card.onmouseenter = () => {
                if (card.classList.contains('has-box3d') && card.classList.contains('selected') && !card.classList.contains('is-flipped')) {
                    rig.style.transform = 'rotateX(-2deg) rotateY(14deg)';
                }
            };
            card.onmouseleave = () => {
                if (card.classList.contains('has-box3d') && !card.classList.contains('is-flipped')) {
                    const curSel = card.classList.contains('selected');
                    rig.style.transform = 'rotateX(-4deg) rotateY(' + (curSel ? 24 : 30) + 'deg)';
                }
            };

            const flipB = mk('button', 'sgl-flip-btn', '', '↻ 180°');
            flipB.type = 'button';
            flipB.title = 'Повернуть коробку обратной стороной';
            flipB.onclick = (ev) => {
                ev.stopPropagation();
                const nowFlip = !card.classList.contains('is-flipped');
                flippedCardIdx = nowFlip ? idx : -1;
                card.classList.toggle('is-flipped', nowFlip);
                rig.style.transform = nowFlip ? 'rotateX(-3deg) rotateY(202deg)' : 'rotateX(-4deg) rotateY(24deg)';
                if (typeof playSfx === 'function') playSfx('switch');
            };
            card.appendChild(flipB);
        });
    };

    window.openBox3dModal = function(targetGameId) {
        if (typeof currentDesign === 'undefined' || !currentDesign) return;
        if (!currentDesign.box3d) currentDesign.box3d = {};
        if (!currentDesign.box3d._global) currentDesign.box3d._global = { enabled: false, caseType: 'cartridge', depth: 26, caseColor: '#1E293B' };

        const activeG = (typeof availableGames !== 'undefined' && availableGames.length > 0) ? availableGames.at(selectedIndex) : null;
        let gid = targetGameId || (activeG ? activeG.id : 'sonic1');

        document.getElementById('sgl-b3d-modal')?.remove();
        const bg = mk('div', 'modal-backdrop active', 'z-index:9878;');
        bg.id = 'sgl-b3d-modal';
        bg.onclick = (e) => { if (e.target === bg) bg.remove(); };

        const box = mk('div', 'modal-box', 'width:860px;max-width:95vw;padding:22px 24px;');
        box.appendChild(mk('div', 'modal-title', 'margin-bottom:12px;', 'Конструктор 3D-коробок игр (Box Art)'));

        const globBar = mk('div', '', 'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;border-radius:10px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);margin-bottom:14px;flex-wrap:wrap;');
        const gChkWrap = mk('label', '', 'display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;cursor:pointer;', '');
        const gChk = document.createElement('input');
        gChk.type = 'checkbox'; gChk.style.accentColor = '#FFD700';
        gChk.checked = Boolean(currentDesign.box3d._global.enabled);
        gChkWrap.append(gChk, mk('span', '', '', 'Включить 3D-коробки по умолчанию для всех игр'));

        const gTypeSel = mk('select', 'custom-select', 'width:230px;');
        [
            { v: 'cartridge', t: 'Формат: Картридж-бокс (Толстый)' },
            { v: 'dvd', t: 'Формат: DVD / Консольный кейс' },
            { v: 'cd', t: 'Формат: CD Jewel Case' }
        ].forEach(o => { const op = mk('option', '', '', o.t); op.value = o.v; gTypeSel.appendChild(op); });
        gTypeSel.value = currentDesign.box3d._global.caseType || 'cartridge';
        globBar.append(gChkWrap, gTypeSel);

        const mainGrid = mk('div', '', 'display:grid;grid-template-columns:310px minmax(0,1fr);gap:16px;align-items:stretch;');
        const previewArea = mk('div', '', 'height:355px;background:radial-gradient(circle at center,#1e293b,#090d16);border:1px solid rgba(255,255,255,0.14);border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;perspective:1050px;cursor:grab;overflow:hidden;');
        const previewHost = mk('div', '', 'width:154px;height:220px;position:relative;transform-style:preserve-3d;');
        previewArea.append(previewHost, mk('div', '', 'position:absolute;bottom:8px;font-size:10.5px;opacity:0.65;pointer-events:none;', 'Крутите 3D-коробку мышкой влево-вправо (360°)'));

        const rightPane = mk('div', '', 'display:flex;flex-direction:column;gap:9px;min-width:0;');
        mainGrid.append(previewArea, rightPane);

        let dragRotY = 26, dragRotX = -5;
        previewArea.onpointerdown = (ev) => {
            const sx = ev.clientX, sy = ev.clientY, oy = dragRotY, ox = dragRotX;
            const mv = (me) => {
                dragRotY = oy + (me.clientX - sx) * 0.8;
                dragRotX = Math.max(-30, Math.min(30, ox - (me.clientY - sy) * 0.4));
                const r = previewHost.firstElementChild;
                if (r) r.style.transform = 'rotateX(' + dragRotX.toFixed(1) + 'deg) rotateY(' + dragRotY.toFixed(1) + 'deg)';
            };
            const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
            window.addEventListener('pointermove', mv);
            window.addEventListener('pointerup', up);
        };

        function getSpecObj() {
            if (!currentDesign.box3d[gid]) currentDesign.box3d[gid] = {};
            return currentDesign.box3d[gid];
        }

        function rebuildPreviewAndForm() {
            const gObj = (typeof gamesData !== 'undefined' ? gamesData.find(x => x.id === gid) : null) || activeG || { id: gid, name: gid };
            const eff = getBoxCfg(gid);
            const spec = getSpecObj();
            const previewCfg = {
                enabled: true,
                caseType: eff.enabled ? eff.caseType : (spec.mode && spec.mode !== 'flat' ? spec.mode : 'cartridge'),
                depth: Number(spec.depth || eff.depth || 26),
                caseColor: spec.caseColor || eff.caseColor || gObj.color || '#1E293B',
                spineUrl: spec.spineUrl || '',
                backUrl: spec.backUrl || '',
                backText: spec.backText || ''
            };

            previewHost.innerHTML = '';
            previewHost.appendChild(buildPrismNode(gObj, previewCfg, dragRotX, dragRotY, true));

            rightPane.innerHTML = '';
            const gameSel = mk('select', 'custom-select', 'font-weight:700;');
            (typeof gamesData !== 'undefined' ? gamesData : [gObj]).forEach(gm => {
                const op = mk('option', '', '', 'Игра: ' + gm.name); op.value = gm.id; gameSel.appendChild(op);
            });
            gameSel.value = gid;
            gameSel.onchange = () => { gid = gameSel.value; rebuildPreviewAndForm(); };

            const modeRow = mk('div', '', 'display:grid;grid-template-columns:1.3fr 1fr auto;gap:8px;align-items:center;');
            const mSel = mk('select', 'custom-select', '');
            [
                { v: '', t: '— По общей настройке темы —' },
                { v: 'flat', t: 'Плоская карточка (2D)' },
                { v: 'cartridge', t: '3D Картридж-бокс' },
                { v: 'dvd', t: '3D DVD / Консольный бокс' },
                { v: 'cd', t: '3D CD Jewel Case' }
            ].forEach(o => { const op = mk('option', '', '', o.t); op.value = o.v; mSel.appendChild(op); });
            mSel.value = spec.mode || '';
            mSel.onchange = () => { if (mSel.value) spec.mode = mSel.value; else delete spec.mode; rebuildPreviewAndForm(); window.applyBox3dToCarousel(); };

            const dInp = document.createElement('input');
            dInp.type = 'range'; dInp.min = '10'; dInp.max = '48'; dInp.value = String(previewCfg.depth);
            dInp.title = 'Толщина коробки';
            dInp.oninput = () => { spec.depth = Number(dInp.value); rebuildPreviewAndForm(); window.applyBox3dToCarousel(); };

            const colInp = document.createElement('input');
            colInp.type = 'color'; colInp.value = previewCfg.caseColor;
            colInp.style.cssText = 'width:38px;height:32px;border:none;background:none;cursor:pointer;';
            colInp.oninput = () => { spec.caseColor = colInp.value; rebuildPreviewAndForm(); window.applyBox3dToCarousel(); };
            modeRow.append(mSel, dInp, colInp);

            const makeSlotRow = (titleTxt, fieldKey, pref) => {
                const r = mk('div', '', 'display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);padding:7px 10px;border-radius:8px;font-size:12px;');
                r.appendChild(mk('span', '', '', titleTxt + ': ' + (spec[fieldKey] ? 'Своя картинка' : 'Авто-генерация')));
                const btns = mk('div', '', 'display:flex;gap:5px;');
                const bPick = mk('button', 'btn-small', '', 'Обзор...');
                bPick.type = 'button';
                bPick.onclick = async () => {
                    const res = await (await fetch('/api/assets/pick_image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: pref + '_' + gid }) })).json();
                    if (res.ok && res.url) { spec[fieldKey] = res.url; rebuildPreviewAndForm(); window.applyBox3dToCarousel(); }
                };
                const bClr = mk('button', 'btn-small btn-clear', '', '×');
                bClr.type = 'button';
                bClr.onclick = () => { delete spec[fieldKey]; rebuildPreviewAndForm(); window.applyBox3dToCarousel(); };
                btns.append(bPick, bClr);
                r.appendChild(btns);
                return r;
            };

            const txtArea = mk('textarea', 'args-input', 'height:74px;resize:none;padding:8px;font-size:11.5px;user-select:text !important;');
            txtArea.placeholder = 'Описание на задней крышке коробки (если не выбрана картинка задника)...';
            txtArea.value = spec.backText || '';
            txtArea.oninput = () => {
                spec.backText = txtArea.value;
                previewCfg.backText = txtArea.value;
                previewHost.innerHTML = '';
                previewHost.appendChild(buildPrismNode(gObj, previewCfg, dragRotX, dragRotY, true));
                window.applyBox3dToCarousel();
            };

            const quickRotRow = mk('div', '', 'display:flex;gap:6px;');
            const bFront = mk('button', 'btn-small', 'flex:1;', 'Вид спереди');
            bFront.type = 'button'; bFront.onclick = () => { dragRotY = 26; dragRotX = -5; rebuildPreviewAndForm(); };
            const bSpine = mk('button', 'btn-small', 'flex:1;', 'Вид корешка');
            bSpine.type = 'button'; bSpine.onclick = () => { dragRotY = 82; dragRotX = 0; rebuildPreviewAndForm(); };
            const bBack = mk('button', 'btn-small', 'flex:1;', 'Задняя сторона (180°)');
            bBack.type = 'button'; bBack.onclick = () => { dragRotY = 202; dragRotX = -4; rebuildPreviewAndForm(); };
            quickRotRow.append(bFront, bSpine, bBack);

            rightPane.append(
                gameSel,
                modeRow,
                makeSlotRow('Корешок (Spine)', 'spineUrl', 'spine'),
                makeSlotRow('Задняя обложка (Back)', 'backUrl', 'back'),
                txtArea,
                quickRotRow
            );
        }

        gChk.onchange = () => { currentDesign.box3d._global.enabled = gChk.checked; rebuildPreviewAndForm(); window.applyBox3dToCarousel(); };
        gTypeSel.onchange = () => { currentDesign.box3d._global.caseType = gTypeSel.value; rebuildPreviewAndForm(); window.applyBox3dToCarousel(); };

        const acts = mk('div', 'modal-actions', 'margin-top:14px;display:flex;gap:10px;');
        const closeB = mk('button', 'btn-reset', 'flex:0.6;', 'Закрыть');
        closeB.type = 'button'; closeB.onclick = () => bg.remove();
        const saveB = mk('button', 'close-modal-btn', 'margin-top:0;flex:1.4;', 'Сохранить настройки 3D-боксов');
        saveB.type = 'button';
        saveB.onclick = async () => {
            if (typeof window.restoreGlobalDesignFields === 'function') window.restoreGlobalDesignFields();
            await fetch('/api/design', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(currentDesign) });
            if (activeG && typeof window.applyPerGameVisuals === 'function') window.applyPerGameVisuals(activeG.id);
            window.applyBox3dToCarousel();
            if (typeof playSfx === 'function') playSfx('launch');
            bg.remove();
            if (typeof showToast === 'function') showToast('Настройки 3D-коробок сохранены!');
        };
        acts.append(closeB, saveB);

        box.append(globBar, mainGrid, acts);
        bg.appendChild(box);
        document.body.appendChild(bg);
        rebuildPreviewAndForm();
        if (typeof playSfx === 'function') playSfx('open_menu');
    };

    const _bootB3d = () => {
        injectBox3dStyles();

        const origRender = window.renderMainScreen;
        if (typeof origRender === 'function' && !window._b3dRenderHooked) {
            window._b3dRenderHooked = true;
            window.renderMainScreen = function() {
                const r = origRender.apply(this, arguments);
                window.applyBox3dToCarousel();
                return r;
            };
        }

        const origSel = window.selectGame;
        if (typeof origSel === 'function' && !window._b3dSelHooked) {
            window._b3dSelHooked = true;
            window.selectGame = function() {
                flippedCardIdx = -1;
                const r = origSel.apply(this, arguments);
                window.applyBox3dToCarousel();
                return r;
            };
        }

        const origOpenCustom = window.openCustomModal;
        if (typeof origOpenCustom === 'function' && !window._b3dCustomHooked) {
            window._b3dCustomHooked = true;
            window.openCustomModal = function() {
                const r = origOpenCustom.apply(this, arguments);
                const pane = document.getElementById('tab-appearance');
                if (pane && !document.getElementById('sgl-open-b3d-btn')) {
                    const row = mk('div', 'char-card-cfg', 'flex-direction:row;justify-content:space-between;align-items:center;padding:9px 12px;margin-bottom:10px;border-color:rgba(96,165,250,0.35);');
                    row.id = 'sgl-open-b3d-btn';
                    row.append(
                        mk('span', '', 'font-size:12px;font-weight:800;color:#93C5FD;', 'Объёмные 3D-коробки игр (Корешок и Задняя сторона)'),
                        (() => { const b = mk('button', 'btn-small btn-accent', '', 'Настроить 3D-боксы...'); b.type = 'button'; b.onclick = () => window.openBox3dModal(); return b; })()
                    );
                    const anchor = document.getElementById('inp-cardStyle')?.closest('.custom-group');
                    if (anchor) anchor.after(row); else pane.appendChild(row);
                }
                return r;
            };
        }

        setTimeout(window.applyBox3dToCarousel, 460);
    };

    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', _bootB3d);
    else _bootB3d();
})();
