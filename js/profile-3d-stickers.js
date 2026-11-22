/* === EXTERNAL SIDE 3D STAGE & PROGRESS-REACTIVE TEXTURES/MATERIALS === */
(function() {
    let activeViewers = {};

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    const SLOT_DEFS = Array.of(
        { key: 'profile', title: 'Сбоку от окна «Профиль игрока» (Внешний 3D-спутник)' },
        { key: 'header', title: 'Шапка лаунчера (Эмблема рядом с названием)' },
        { key: 'showcase', title: 'Карточка Витрины (Внутри панели Showcase)' },
        { key: 'stage_left', title: 'Главный экран: Слева от карусели' },
        { key: 'stage_right', title: 'Главный экран: Справа от карусели' }
    );

    const MAT_OPTS = Array.of(
        { v: 'original', t: 'Текстура / Оригинальный цвет' },
        { v: 'emerald_tint', t: 'Изумрудный перелив текстуры' },
        { v: 'super_tint', t: 'Супер-форма (Золотая текстура)' },
        { v: 'hyper_tint', t: 'Гипер-форма (Радужная текстура)' },
        { v: 'emerald', t: 'Чистый кристалл Изумруда' },
        { v: 'gold', t: 'Чистое золото' },
        { v: 'chrome', t: 'Серебряный хром' },
        { v: 'holo', t: 'Голограмма' }
    );

    function injectSlotCss() {
        if (document.getElementById('sgl-uislots3d-css')) return;
        const st = mk('style', '', '');
        st.id = 'sgl-uislots3d-css';
        st.textContent = Array.of(
            '#sgl-hdr-3d-slot{width:64px;height:64px;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;margin-right:8px;pointer-events:auto;}',
            '#sgl-sc-3d-slot{width:100%;height:130px;border-radius:10px;background:rgba(0,0,0,0.28);border:1px solid rgba(255,255,255,0.1);overflow:hidden;}',
            '.sgl-stage-side-3d{position:fixed;top:52%;transform:translateY(-50%);width:var(--st3d-sz,220px);height:var(--st3d-sz,220px);z-index:14;pointer-events:auto;}',
            '#sgl-stage3d-left{left:3%;}',
            '#sgl-stage3d-right{right:3%;}',
            'body.minidock-mode .sgl-stage-side-3d{display:none !important;}',
            '.sgl-prof-ext-stage{width:290px;height:440px;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;pointer-events:auto;flex-shrink:0;}',
            '.sgl-prof-ext-canvas{position:absolute;inset:0 0 34px 0;filter:drop-shadow(0 18px 28px rgba(0,0,0,0.75));}',
            '.sgl-prof-ring-glow{width:180px;height:26px;border-radius:50%;border:2px solid var(--p-ring,#FFD700);background:radial-gradient(ellipse at center,rgba(255,215,0,0.28) 0%,transparent 72%);box-shadow:0 0 22px rgba(255,215,0,0.35);margin-bottom:8px;pointer-events:none;}'
        ).join('\n');
        document.head.appendChild(st);
    }

    function getSlotsMap() {
        if (typeof currentDesign === 'undefined' || !currentDesign) return {};
        if (!currentDesign.uiModelSlots) {
            currentDesign.uiModelSlots = {
                profile: { enabled: true, side: 'left', kind: '3d', url: 'builtin_emerald', texUrl: '', flipUv: false, material: 'original', progMode: 'auto_aura', tierTexMid: '', tierTexHigh: '', tierTexMax: '', speed: 1.0, zoom: 1.05, size: 290 }
            };
        }
        return currentDesign.uiModelSlots;
    }

    // Вычисляет итоговую текстуру и материал в зависимости от реального % прохождения профиля!
    function resolveEffectiveVisuals(cfg, pctVal) {
        const pct = (typeof pctVal === 'number') ? pctVal : (window._lastProfilePct || 0);
        const pMode = cfg.progMode || 'off';
        let effTex = cfg.texUrl || '';
        let effMat = cfg.material || 'original';
        let ringCol = '#38BDF8';

        if (pMode === 'auto_aura') {
            if (pct >= 100) { effMat = 'hyper_tint'; ringCol = '#F472B6'; }
            else if (pct >= 70) { effMat = 'super_tint'; ringCol = '#FFD700'; }
            else if (pct >= 30) { effMat = 'emerald_tint'; ringCol = '#4ADE80'; }
            else { effMat = cfg.material || 'original'; ringCol = '#38BDF8'; }
        } else if (pMode === 'custom_tex') {
            if (pct >= 100 && cfg.tierTexMax) { effTex = cfg.tierTexMax; ringCol = '#F472B6'; }
            else if (pct >= 65 && cfg.tierTexHigh) { effTex = cfg.tierTexHigh; ringCol = '#FFD700'; }
            else if (pct >= 30 && cfg.tierTexMid) { effTex = cfg.tierTexMid; ringCol = '#4ADE80'; }
            effMat = 'original';
        }
        return { texUrl: effTex, material: effMat, ringCol };
    }

    async function saveSlotsCfg() {
        if (typeof currentDesign === 'undefined' || !currentDesign) return;
        if (typeof window.restoreGlobalDesignFields === 'function') window.restoreGlobalDesignFields();
        await fetch('/api/design', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(currentDesign) });
        const g = (typeof availableGames !== 'undefined' && availableGames.length > 0) ? availableGames.at(selectedIndex) : null;
        if (g && typeof window.applyPerGameVisuals === 'function') window.applyPerGameVisuals(g.id);
    }

    function renderIntoBox(slotKey, hostEl, cfg, pctOverride) {
        if (activeViewers[slotKey]) { activeViewers[slotKey].destroy(); delete activeViewers[slotKey]; }
        if (!hostEl) return;
        hostEl.innerHTML = '';
        if (!cfg || !cfg.enabled) return;

        const vis = (slotKey === 'profile') ? resolveEffectiveVisuals(cfg, pctOverride) : { texUrl: cfg.texUrl || '', material: cfg.material || 'original' };

        if (cfg.kind === 'img' && cfg.url) {
            const im = document.createElement('img');
            im.src = vis.texUrl || cfg.url;
            im.style.cssText = 'width:100%;height:100%;object-fit:contain;transform:scale(' + (cfg.zoom || 1) + ');';
            hostEl.appendChild(im);
        } else if (typeof window.mountSgl3dViewer === 'function') {
            activeViewers[slotKey] = window.mountSgl3dViewer(hostEl, {
                url: cfg.url || 'builtin_emerald',
                texUrl: vis.texUrl,
                flipUv: Boolean(cfg.flipUv),
                material: vis.material,
                speed: cfg.speed ?? 1.0,
                zoom: cfg.zoom ?? 1.0,
                interactive: true
            });
        }
    }

    window.mountExternalProfile3D = function(pctVal) {
        injectSlotCss();
        const leftHost = document.getElementById('sgl-prof-side-left');
        const rightHost = document.getElementById('sgl-prof-side-right');
        if (!leftHost || !rightHost) return;
        leftHost.innerHTML = '';
        rightHost.innerHTML = '';

        const map = getSlotsMap();
        if (!map.profile) map.profile = { enabled: true, side: 'left', kind: '3d', url: 'builtin_emerald', material: 'emerald', progMode: 'auto_aura', speed: 1.0, zoom: 1.05, size: 290 };
        const cfg = map.profile;

        if (!cfg.enabled) {
            // Оставляем маленькую аккуратную кнопку возврата 3D-спутника
            const miniBtn = mk('button', 'btn-small', 'writing-mode:vertical-rl;padding:12px 6px;opacity:0.75;', '+ 3D Спутник');
            miniBtn.type = 'button';
            miniBtn.onclick = () => window.openUiModelSlotsModal('profile');
            leftHost.appendChild(miniBtn);
            return;
        }

        const targetHost = (cfg.side === 'right') ? rightHost : leftHost;
        const vis = resolveEffectiveVisuals(cfg, pctVal);
        const wPx = Math.max(180, Number(cfg.size || 290));

        const stage = mk('div', 'sgl-prof-ext-stage', 'width:' + wPx + 'px;');
        stage.style.setProperty('--p-ring', vis.ringCol);

        const cvsWrap = mk('div', 'sgl-prof-ext-canvas', '');
        const ring = mk('div', 'sgl-prof-ring-glow', '');

        const btnBar = mk('div', '', 'display:flex;gap:6px;z-index:5;');
        const sideToggle = mk('button', 'btn-small', 'padding:4px 9px;font-size:11px;background:rgba(12,18,32,0.88);border:1px solid rgba(255,255,255,0.2);', cfg.side === 'right' ? '◀ Влево' : 'Вправо ▶');
        sideToggle.type = 'button';
        sideToggle.onclick = async () => {
            cfg.side = (cfg.side === 'right') ? 'left' : 'right';
            window.mountExternalProfile3D(pctVal);
            await saveSlotsCfg();
        };

        const cfgBtn = mk('button', 'btn-small btn-accent', 'padding:4px 12px;font-size:11px;', '⚙ 3D и Эволюция');
        cfgBtn.type = 'button';
        cfgBtn.onclick = () => window.openUiModelSlotsModal('profile');

        btnBar.append(sideToggle, cfgBtn);
        stage.append(cvsWrap, ring, btnBar);
        targetHost.appendChild(stage);
        renderIntoBox('profile', cvsWrap, cfg, pctVal);
    };

    window.syncAllUiModelSlots = function() {
        injectSlotCss();
        const map = getSlotsMap();

        document.getElementById('sgl-hdr-3d-slot')?.remove();
        const hdrCfg = map.header;
        const hdrEl = document.querySelector('header');
        if (hdrCfg && hdrCfg.enabled && hdrEl) {
            const hs = mk('span', '', ''); hs.id = 'sgl-hdr-3d-slot';
            const sz = Number(hdrCfg.size || 64);
            hs.style.width = sz + 'px'; hs.style.height = sz + 'px';
            hdrEl.prepend(hs);
            renderIntoBox('header', hs, hdrCfg);
        }

        document.getElementById('sgl-sc-3d-slot')?.remove();
        const scCfg = map.showcase;
        const scPanel = document.getElementById('sgl-showcase-panel');
        if (scCfg && scCfg.enabled && scPanel) {
            const ss = mk('div', '', ''); ss.id = 'sgl-sc-3d-slot';
            ss.style.height = Number(scCfg.size || 130) + 'px';
            scPanel.insertBefore(ss, scPanel.lastElementChild);
            renderIntoBox('showcase', ss, scCfg);
        }

        Array.of('left', 'right').forEach(side => {
            const k = 'stage_' + side;
            document.getElementById('sgl-stage3d-' + side)?.remove();
            const c = map[k];
            if (c && c.enabled && !currentDesign?.liteMode) {
                const nd = mk('div', 'sgl-stage-side-3d', '');
                nd.id = 'sgl-stage3d-' + side;
                nd.style.setProperty('--st3d-sz', Number(c.size || 220) + 'px');
                document.body.appendChild(nd);
                renderIntoBox(k, nd, c);
            }
        });
    };

    window.openUiModelSlotsModal = function(initialSlot) {
        if (!currentDesign) return;
        const map = getSlotsMap();
        let curSlot = initialSlot || 'profile';
        let previewTestPct = window._lastProfilePct ?? 38;

        document.getElementById('sgl-uislots-modal')?.remove();
        const bg = mk('div', 'modal-backdrop active', 'z-index:9895;');
        bg.id = 'sgl-uislots-modal';
        bg.onclick = (e) => { if (e.target === bg) bg.remove(); };

        const box = mk('div', 'modal-box', 'width:880px;max-width:95vw;max-height:92vh;overflow-y:auto;padding:22px 24px;');
        box.appendChild(mk('div', 'modal-title', 'margin-bottom:12px;', '3D-модели, позиция и эволюция от прогресса'));

        const slotRow = mk('div', '', 'display:flex;gap:10px;align-items:center;margin-bottom:12px;flex-wrap:wrap;');
        slotRow.appendChild(mk('span', '', 'font-size:12.5px;font-weight:800;color:#FFD700;', 'Слот:'));
        const slotSel = mk('select', 'custom-select', 'flex:1;font-weight:700;padding:8px 12px;');
        SLOT_DEFS.forEach(s => { const o = mk('option', '', '', s.title); o.value = s.key; slotSel.appendChild(o); });
        slotSel.value = curSlot;
        slotRow.appendChild(slotSel);

        const grid = mk('div', '', 'display:grid;grid-template-columns:270px minmax(0,1fr);gap:16px;align-items:start;');
        const prevCol = mk('div', '', 'display:flex;flex-direction:column;gap:8px;');
        const prevBox = mk('div', '', 'height:310px;background:radial-gradient(circle at 50% 60%,rgba(56,189,248,0.22),#090d16);border:1px solid rgba(255,255,255,0.15);border-radius:14px;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;');
        const testSimWrap = mk('div', '', 'font-size:11px;background:rgba(0,0,0,0.28);padding:7px 10px;border-radius:9px;display:flex;flex-direction:column;gap:4px;');
        const testSimLbl = mk('span', '', 'color:#FFD700;font-weight:700;', 'Тест прогресса: ' + previewTestPct + '%');
        const testSimRng = document.createElement('input');
        testSimRng.type = 'range'; testSimRng.min = '0'; testSimRng.max = '100'; testSimRng.value = String(previewTestPct);
        prevCol.append(prevBox, testSimWrap);
        testSimWrap.append(testSimLbl, testSimRng);

        const formCol = mk('div', '', 'display:flex;flex-direction:column;gap:9px;min-width:0;');
        grid.append(prevCol, formCol);

        let modalViewer = null;
        function ensureSlotObj(k) {
            if (!map[k]) map[k] = { enabled: false, side: 'left', kind: '3d', url: 'builtin_emerald', texUrl: '', flipUv: false, material: 'original', progMode: 'off', speed: 1.0, zoom: 1.0, size: (k === 'header' ? 64 : 280) };
            return map[k];
        }

        function applyLiveEverywhere() {
            window.syncAllUiModelSlots();
            if (document.getElementById('profile-stats-modal')?.classList.contains('active')) {
                window.mountExternalProfile3D(window._lastProfilePct || 0);
            }
        }

        function refreshPreview() {
            const c = ensureSlotObj(curSlot);
            if (modalViewer) { modalViewer.destroy(); modalViewer = null; }
            prevBox.innerHTML = '';
            const vis = (curSlot === 'profile') ? resolveEffectiveVisuals(c, previewTestPct) : { texUrl: c.texUrl || '', material: c.material || 'original' };
            if (c.kind === 'img' && c.url) {
                const im = document.createElement('img'); im.src = vis.texUrl || c.url;
                im.style.cssText = 'max-width:88%;max-height:88%;object-fit:contain;transform:scale(' + (c.zoom || 1) + ');';
                prevBox.appendChild(im);
            } else if (typeof window.mountSgl3dViewer === 'function') {
                modalViewer = window.mountSgl3dViewer(prevBox, { url: c.url || 'builtin_emerald', texUrl: vis.texUrl, flipUv: Boolean(c.flipUv), material: vis.material, speed: c.speed ?? 1, zoom: c.zoom ?? 1 });
            }
        }

        testSimRng.oninput = () => {
            previewTestPct = Number(testSimRng.value);
            testSimLbl.textContent = 'Тест прогресса: ' + previewTestPct + '%';
            refreshPreview();
        };

        function renderForm() {
            const c = ensureSlotObj(curSlot);
            testSimWrap.style.display = (curSlot === 'profile') ? 'flex' : 'none';
            formCol.innerHTML = '';

            const topOptRow = mk('div', '', 'display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 12px;background:rgba(255,255,255,0.06);border-radius:9px;flex-wrap:wrap;');
            const enLbl = mk('label', '', 'display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:800;cursor:pointer;', '');
            const enChk = document.createElement('input');
            enChk.type = 'checkbox'; enChk.style.accentColor = '#4ADE80'; enChk.checked = Boolean(c.enabled);
            enChk.onchange = () => { c.enabled = enChk.checked; applyLiveEverywhere(); };
            enLbl.append(enChk, mk('span', '', '', 'Включить 3D-модель в этом слоте'));
            topOptRow.appendChild(enLbl);

            if (curSlot === 'profile') {
                const sideSel = mk('select', 'custom-select', 'padding:4px 10px;font-size:11.5px;');
                Array.of(
                    { v: 'left', t: 'Позиция: Слева от окна Профиля' },
                    { v: 'right', t: 'Позиция: Справа от окна Профиля' }
                ).forEach(o => {
                    const op = mk('option', '', '', o.t); op.value = o.v; sideSel.appendChild(op);
                });
                sideSel.value = c.side || 'left';
                sideSel.onchange = () => { c.side = sideSel.value; applyLiveEverywhere(); };
                topOptRow.appendChild(sideSel);
            }

            const modCard = mk('div', 'char-card-cfg', 'margin-bottom:0;gap:6px;padding:9px 11px;');
            modCard.appendChild(mk('div', '', 'font-size:11.5px;font-weight:700;color:#93C5FD;', '1. Модель (.GLB, .OBJ, .STL) и базовая текстура: ' + (c.name || '3D Изумруд')));
            const modBtns = mk('div', '', 'display:flex;gap:6px;flex-wrap:wrap;align-items:center;');
            const bPickMod = mk('button', 'btn-small btn-accent', '', 'Выбрать 3D-модель...');
            bPickMod.type = 'button';
            bPickMod.onclick = async () => {
                const r = await (await fetch('/api/assets/pick_3d_or_img', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: 'slot_' + curSlot }) })).json();
                if (!r.ok || !r.url) return;
                c.enabled = true; c.kind = r.kind; c.url = r.url; c.name = r.name; c.material = 'original';
                renderForm(); refreshPreview(); applyLiveEverywhere();
            };
            const bPickTex = mk('button', 'btn-small', '', 'Базовая текстура (.PNG/.JPG)');
            bPickTex.type = 'button';
            bPickTex.onclick = async () => {
                const r = await (await fetch('/api/assets/pick_image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: 'tex_' + curSlot }) })).json();
                if (!r.ok || !r.url) return;
                c.texUrl = r.url; c.material = 'original';
                renderForm(); refreshPreview(); applyLiveEverywhere();
            };
            const flipLbl = mk('label', '', 'display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;', '');
            const flipChk = document.createElement('input');
            flipChk.type = 'checkbox'; flipChk.checked = Boolean(c.flipUv);
            flipChk.onchange = () => { c.flipUv = flipChk.checked; refreshPreview(); applyLiveEverywhere(); };
            flipLbl.append(flipChk, mk('span', '', '', 'Flip UV'));
            modBtns.append(bPickMod, bPickTex, flipLbl);
            modCard.appendChild(modBtns);

            let evoCard = null;
            if (curSlot === 'profile') {
                evoCard = mk('div', 'char-card-cfg', 'margin-bottom:0;gap:7px;padding:9px 11px;border-color:rgba(255,215,0,0.35);');
                const evoHdr = mk('div', '', 'display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;');
                evoHdr.appendChild(mk('span', '', 'font-size:11.5px;font-weight:800;color:#FFD700;', '2. Смена цвета / текстуры от прогресса профиля:'));
                const pSel = mk('select', 'custom-select', 'padding:4px 8px;font-size:11px;');
                Array.of(
                    { v: 'auto_aura', t: 'Авто-эволюция цвета (Обычный -> Изумруд -> Супер Золото -> Гипер)' },
                    { v: 'custom_tex', t: 'Свои текстуры на каждый ранг (30% / 65% / 100%)' },
                    { v: 'off', t: 'Выкл (всегда один стиль)' }
                ).forEach(o => { const op = mk('option', '', '', o.t); op.value = o.v; pSel.appendChild(op); });
                pSel.value = c.progMode || 'auto_aura';
                pSel.onchange = () => { c.progMode = pSel.value; renderForm(); refreshPreview(); applyLiveEverywhere(); };
                evoHdr.appendChild(pSel);
                evoCard.appendChild(evoHdr);

                if (c.progMode === 'custom_tex') {
                    const tiersBox = mk('div', '', 'display:grid;grid-template-columns:repeat(3,1fr);gap:6px;font-size:10.5px;');
                    Array.of(
                        { f: 'tierTexMid', lbl: 'От 30% (Ранг B)' },
                        { f: 'tierTexHigh', lbl: 'От 65% (Супер)' },
                        { f: 'tierTexMax', lbl: '100% (Гипер)' }
                    ).forEach(tr => {
                        const cell = mk('div', '', 'background:rgba(0,0,0,0.28);padding:6px;border-radius:7px;display:flex;flex-direction:column;gap:4px;');
                        cell.appendChild(mk('span', '', 'font-weight:700;color:' + (c[tr.f] ? '#4ADE80' : '#94A3B8') + ';', tr.lbl + (c[tr.f] ? ' ✓' : '')));
                        const bRow = mk('div', '', 'display:flex;gap:4px;');
                        const bSet = mk('button', 'btn-small', 'flex:1;padding:3px 6px;font-size:10px;', 'Текстура...');
                        bSet.type = 'button';
                        bSet.onclick = async () => {
                            const r = await (await fetch('/api/assets/pick_image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: tr.f }) })).json();
                            if (r.ok && r.url) { c[tr.f] = r.url; renderForm(); refreshPreview(); applyLiveEverywhere(); }
                        };
                        const bClr = mk('button', 'btn-small btn-clear', 'padding:3px 6px;font-size:10px;', '×');
                        bClr.type = 'button';
                        bClr.onclick = () => { c[tr.f] = ''; renderForm(); refreshPreview(); applyLiveEverywhere(); };
                        bRow.append(bSet, bClr);
                        cell.appendChild(bRow);
                        tiersBox.appendChild(cell);
                    });
                    evoCard.appendChild(tiersBox);
                }
            }

            const slidersRow = mk('div', '', 'display:grid;grid-template-columns:1.3fr 1fr 1fr 1fr;gap:8px;align-items:end;font-size:11px;');
            const mSel = mk('select', 'custom-select', 'padding:6px;font-size:11px;');
            MAT_OPTS.forEach(o => { const op = mk('option', '', '', o.t); op.value = o.v; mSel.appendChild(op); });
            mSel.value = c.material || 'original';
            mSel.onchange = () => { c.material = mSel.value; refreshPreview(); applyLiveEverywhere(); };

            const makeRng = (lbl, min, max, stp, val, cb) => {
                const w = mk('div', '', 'display:flex;flex-direction:column;gap:3px;min-width:0;');
                const sp = mk('span', '', '', lbl + ': ' + val);
                const inp = document.createElement('input');
                inp.type = 'range'; inp.min = min; inp.max = max; inp.step = stp; inp.value = val; inp.style.width = '100%';
                inp.oninput = () => { sp.textContent = lbl + ': ' + inp.value; cb(Number(inp.value)); };
                w.append(sp, inp);
                return w;
            };
            slidersRow.append(
                mSel,
                makeRng('Вращение', 0, 3, 0.2, c.speed ?? 1, v => { c.speed = v; if (modalViewer) modalViewer.update({ speed: v }); applyLiveEverywhere(); }),
                makeRng('Приближение', 0.5, 2.4, 0.1, c.zoom ?? 1, v => { c.zoom = v; if (modalViewer) modalViewer.update({ zoom: v }); else refreshPreview(); applyLiveEverywhere(); }),
                makeRng('Ширина', 60, 380, 10, c.size || 290, v => { c.size = v; applyLiveEverywhere(); })
            );

            formCol.append(topOptRow, modCard);
            if (evoCard) formCol.appendChild(evoCard);
            formCol.appendChild(slidersRow);
        }

        slotSel.onchange = () => { curSlot = slotSel.value; renderForm(); refreshPreview(); };
        const saveB = mk('button', 'close-modal-btn', 'margin-top:14px;', 'Сохранить настройки 3D-элементов');
        saveB.type = 'button';
        saveB.onclick = async () => {
            if (modalViewer) modalViewer.destroy();
            await saveSlotsCfg();
            applyLiveEverywhere();
            bg.remove();
            if (typeof showToast === 'function') showToast('Настройки 3D и эволюции сохранены!');
        };

        box.append(slotRow, grid, saveB);
        bg.appendChild(box);
        document.body.appendChild(bg);
        renderForm();
        refreshPreview();
    };

    function ensureCustomizerSlotRow() {
        const pane = document.getElementById('tab-appearance');
        if (!pane || document.getElementById('sgl-open-uislots3d-btn')) return;
        const row = mk('div', 'char-card-cfg', 'flex-direction:row;justify-content:space-between;align-items:center;padding:9px 12px;margin-bottom:10px;border-color:rgba(74,222,128,0.45);');
        row.id = 'sgl-open-uislots3d-btn';
        const btn = mk('button', 'btn-small btn-accent', '', 'Настроить 3D-слоты...');
        btn.type = 'button';
        btn.onclick = () => window.openUiModelSlotsModal('profile');
        row.append(mk('span', '', 'font-size:12px;font-weight:800;color:#4ADE80;', '3D-модели и эволюция в элементах интерфейса'), btn);
        const anchor = document.getElementById('sgl-open-b3d-btn') || document.getElementById('inp-cardStyle')?.closest('.custom-group');
        if (anchor) anchor.after(row); else pane.appendChild(row);
    }

    const _boot = () => {
        injectSlotCss();
        ensureCustomizerSlotRow();
        const origCustom = window.openCustomModal;
        if (typeof origCustom === 'function' && !window._slots3dCustomHooked) {
            window._slots3dCustomHooked = true;
            window.openCustomModal = function() {
                const r = origCustom.apply(this, arguments);
                ensureCustomizerSlotRow();
                return r;
            };
        }
        setTimeout(window.syncAllUiModelSlots, 450);
    };
    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', _boot);
    else _boot();
})();
