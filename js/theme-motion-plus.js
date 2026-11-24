/* === MODULE: AUTO-PREVIEW .SONICPACK, LAYER MIXER, SPIN DASH, CALENDAR & ATTRACT MODE === */
(function() {
    let savedPreviews = {}, activeTagFilter = 'ALL';
    let spinVel = 0, spinAcc = 0, spinRaf = 0, calRaf = 0;
    let attractActive = false, attractIdleTs = Date.now(), attractCycleTimer = 0;

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function mkGrad(c1, c2) {
        return { default: Array.of(c1, c2), sonic1: Array.of(c1, c2), sonic2: Array.of(c1, c2), soniccd: Array.of(c1, c2), sonic3: Array.of(c1, c2), origins: Array.of(c1, c2), mania: Array.of(c1, c2), srb2: Array.of(c1, c2) };
    }

    const LAYER_PRESETS = Array.of(
        { id: 'default_glass', name: 'Заводской (Glass)', bg: { shaderType: 'none', gradients: mkGrad('#0f172a', '#1e293b') }, card: { cardStyle: 'glass', cardRadius: 16, carouselMode: 'coverflow' }, pal: { lightUi: false, textColor: '#f8fafc', titleColor: '#ffd700' }, fx: { screenFx: 'none', screenFxOpacity: 45, clickFx: 'rings' } },
        { id: 'mania_pop', name: 'Поп-Арт Комикс', bg: { shaderType: 'mania_geo', gradients: mkGrad('#fef08a', '#fb7185') }, card: { cardStyle: 'retro', cardRadius: 8, carouselMode: 'arc' }, pal: { lightUi: true, textColor: '#111827', titleColor: '#dc2626' }, fx: { screenFx: 'halftone', screenFxOpacity: 52, clickFx: 'stars' } },
        { id: 'megadrive_crt', name: 'Ретро ЭЛТ 90-х', bg: { shaderType: 'checker', gradients: mkGrad('#09090b', '#172554') }, card: { cardStyle: 'retro', cardRadius: 4, carouselMode: 'row' }, pal: { lightUi: false, textColor: '#f8fafc', titleColor: '#facc15' }, fx: { screenFx: 'crt', screenFxOpacity: 60, clickFx: 'rings' } },
        { id: 'frontiers_cyber', name: 'Кибер-Матрица', bg: { shaderType: 'cyber_glitch', gradients: mkGrad('#020617', '#083344') }, card: { cardStyle: 'neon', cardRadius: 12, carouselMode: 'coverflow' }, pal: { lightUi: false, textColor: '#ecfeff', titleColor: '#22d3ee' }, fx: { screenFx: 'cybergrid', screenFxOpacity: 55, clickFx: 'cyber' } },
        { id: 'angel_island', name: 'Изумрудный Алтарь', bg: { shaderType: 'sparks', gradients: mkGrad('#022c22', '#059669') }, card: { cardStyle: 'glass', cardRadius: 14, carouselMode: 'coverflow' }, pal: { lightUi: false, textColor: '#ecfdf5', titleColor: '#fde047' }, fx: { screenFx: 'vignette', screenFxOpacity: 42, clickFx: 'emeralds' } },
        { id: 'casino_synth', name: 'Неоновый Синтвейв', bg: { shaderType: 'synthwave', gradients: mkGrad('#1e1b4b', '#581c87') }, card: { cardStyle: 'neon', cardRadius: 14, carouselMode: 'coverflow' }, pal: { lightUi: false, textColor: '#faf5ff', titleColor: '#fde047' }, fx: { screenFx: 'crt', screenFxOpacity: 42, clickFx: 'stars' } }
    );

    function injectCss() {
        if (document.getElementById('sgl-tmp-css')) return;
        const st = mk('style', '', ''); st.id = 'sgl-tmp-css';
        st.textContent = Array.of(
            '#sgl-cal-canvas{position:fixed;inset:0;pointer-events:none;z-index:42;}',
            '#sgl-bday-badge{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:940;padding:5px 14px;border-radius:999px;background:rgba(15,23,42,0.88);border:1.5px solid #facc15;color:#fde047;font-size:11.5px;font-weight:900;box-shadow:0 6px 20px rgba(0,0,0,0.5);pointer-events:none;}',
            'body.sgl-attract-mode header, body.sgl-attract-mode .top-bar, body.sgl-attract-mode #top-controls, body.sgl-attract-mode #sgl-jukebox{opacity:0 !important;pointer-events:none !important;transition:opacity 0.6s;}',
            '#sgl-attract-hud{position:fixed;left:28px;bottom:28px;z-index:950;display:none;gap:12px;align-items:center;padding:12px 16px;border-radius:14px;background:rgba(9,13,22,0.86);border:1px solid rgba(250,204,21,0.45);backdrop-filter:blur(10px);max-width:460px;box-shadow:0 12px 36px rgba(0,0,0,0.65);}',
            'body.sgl-attract-mode #sgl-attract-hud{display:flex;}',
            '.tmp-tag{padding:2px 7px;border-radius:999px;font-size:9.5px;font-weight:800;background:rgba(56,189,248,0.16);border:1px solid rgba(56,189,248,0.4);color:#7dd3fc;}',
            '.tmp-prev-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:8px;margin-top:6px;}',
            '.tmp-prev-card{border-radius:10px;overflow:hidden;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.14);padding:6px;display:flex;flex-direction:column;gap:5px;}'
        ).join('\n');
        document.head.appendChild(st);
    }

    window.computeThemeAutoTags = function(d) {
        const tags = new Array();
        if (!d) return tags;
        if (d.shaderType && d.shaderType !== 'none') tags.push('Shader');
        if (d.screenFx && d.screenFx !== 'none') tags.push('ScreenFX');
        if (d.box3d?._global?.enabled || d.cardTilt3d !== false) tags.push('3D');
        tags.push(d.lightUi ? 'Light' : 'Dark');
        return tags;
    };

    window.generateThemePreviewData = function(d) {
        const cvs = mk('canvas', '', ''); cvs.width = 320; cvs.height = 180;
        const ctx = cvs.getContext('2d');
        const pair = (d?.gradients?.default && d.gradients.default.length >= 2) ? d.gradients.default : Array.of('#0f172a', '#1e293b');
        const c1 = pair.at(0) || '#0f172a', c2 = pair.at(1) || '#1e293b';
        const g = ctx.createLinearGradient(0, 0, 320, 180);
        g.addColorStop(0, c1); g.addColorStop(1, c2);
        ctx.fillStyle = g; ctx.fillRect(0, 0, 320, 180);

        ctx.fillStyle = d?.lightUi ? 'rgba(255,255,255,0.75)' : 'rgba(15,23,42,0.72)';
        ctx.strokeStyle = d?.titleColor || '#ffd700'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.roundRect(22, 24, 118, 132, Math.min(20, Number(d?.cardRadius || 12))); ctx.fill(); ctx.stroke();

        ctx.fillStyle = d?.titleColor || '#ffd700'; ctx.font = 'bold 14px sans-serif';
        ctx.fillText('SONIC PACK', 34, 96);
        ctx.fillStyle = d?.textColor || '#f8fafc'; ctx.font = '11px sans-serif';
        ctx.fillText('Style: ' + (d?.cardStyle || 'glass'), 156, 46);
        ctx.fillText('Shader: ' + (d?.shaderType || 'none'), 156, 68);
        ctx.fillText('FX: ' + (d?.screenFx || 'none'), 156, 90);

        const swatches = Array.of(c1, c2, d?.titleColor || '#ffd700', d?.textColor || '#f8fafc');
        swatches.forEach((col, idx) => {
            ctx.fillStyle = col;
            ctx.beginPath(); ctx.arc(166 + idx * 28, 128, 10, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
        });
        return { pngDataUrl: cvs.toDataURL('image/png'), tags: window.computeThemeAutoTags(d) };
    };

    async function saveCurrentThemePreview(customName) {
        if (typeof currentDesign === 'undefined' || !currentDesign) return;
        const name = customName || ('Theme_' + new Date().toISOString().slice(11, 19).replace(/:/g, ''));
        const gen = window.generateThemePreviewData(currentDesign);
        try {
            await fetch('/api/themes/save_preview', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, pngDataUrl: gen.pngDataUrl, tags: gen.tags })
            });
            await loadSavedPreviews();
        } catch (_) {}
    }

    async function loadSavedPreviews() {
        try {
            const r = await (await fetch('/api/themes/previews')).json();
            if (r && r.ok) savedPreviews = r.items || {};
        } catch (_) {}
        renderSavedPreviewsBar();
    }

    function renderSavedPreviewsBar() {
        const gal = document.getElementById('sgl-builtin-gallery-box');
        if (!gal) return;
        let box = document.getElementById('sgl-theme-previews-box');
        if (!box) {
            box = mk('div', '', 'margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.12);');
            box.id = 'sgl-theme-previews-box';
            gal.appendChild(box);
        }
        box.innerHTML = '';

        const top = mk('div', '', 'display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px;');
        const bMix = mk('button', 'btn-small btn-accent', 'font-weight:800;', 'Миксер слоёв тем');
        bMix.type = 'button'; bMix.onclick = () => window.openThemeLayerMixer();
        const bCap = mk('button', 'btn-small', '', 'Сделать превью (.sonicpack)');
        bCap.type = 'button';
        bCap.onclick = async () => {
            const nm = window.prompt('Название превью темы:', 'MySonicTheme');
            if (!nm) return;
            await saveCurrentThemePreview(nm);
            if (typeof showToast === 'function') showToast('Превью preview.png и теги сохранены!');
        };
        top.append(bMix, bCap);

        const fltRow = mk('div', '', 'display:flex;gap:5px;flex-wrap:wrap;margin-bottom:6px;');
        Array.of('ALL', 'Shader', 'ScreenFX', '3D', 'Dark', 'Light').forEach(tag => {
            const b = mk('button', 'btn-small ' + (activeTagFilter === tag ? 'btn-accent' : ''), 'font-size:10px;padding:3px 8px;', tag === 'ALL' ? 'Все теги' : tag);
            b.type = 'button'; b.onclick = () => { activeTagFilter = tag; renderSavedPreviewsBar(); };
            fltRow.appendChild(b);
        });

        const grid = mk('div', 'tmp-prev-grid', '');
        Object.keys(savedPreviews).forEach(nm => {
            const it = savedPreviews[nm];
            const tList = it.tags || new Array();
            if (activeTagFilter !== 'ALL' && !tList.includes(activeTagFilter)) return;
            const card = mk('div', 'tmp-prev-card', '');
            if (it.img) { const im = mk('img', '', 'width:100%;height:78px;object-fit:cover;border-radius:6px;'); im.src = it.img; card.appendChild(im); }
            card.appendChild(mk('div', '', 'font-size:11px;font-weight:800;color:#fde047;', nm));
            const tw = mk('div', '', 'display:flex;gap:4px;flex-wrap:wrap;');
            tList.forEach(t => tw.appendChild(mk('span', 'tmp-tag', '', t)));
            card.appendChild(tw);
            grid.appendChild(card);
        });
        box.append(top, fltRow, grid);
    }

    window.openThemeLayerMixer = function() {
        document.getElementById('sgl-layer-mixer-modal')?.remove();
        const bg = mk('div', 'modal-backdrop active', 'z-index:9905;');
        bg.id = 'sgl-layer-mixer-modal';
        bg.onclick = e => { if (e.target === bg) bg.remove(); };

        const box = mk('div', 'modal-box', 'width:500px;max-width:94vw;display:flex;flex-direction:column;gap:10px;');
        box.appendChild(mk('div', 'modal-title', 'margin:0;', 'Миксер слоёв тем'));

        const state = { bg: 'default_glass', card: 'default_glass', pal: 'default_glass', fx: 'default_glass' };
        function applyHybrid() {
            if (typeof currentDesign === 'undefined' || !currentDesign) return;
            const pBg = LAYER_PRESETS.find(x => x.id === state.bg);
            const pCd = LAYER_PRESETS.find(x => x.id === state.card);
            const pPl = LAYER_PRESETS.find(x => x.id === state.pal);
            const pFx = LAYER_PRESETS.find(x => x.id === state.fx);
            if (pBg) {
                currentDesign.gradients = JSON.parse(JSON.stringify(pBg.bg.gradients));
                currentDesign.shaderType = pBg.bg.shaderType; currentDesign._baseShader = pBg.bg.shaderType;
            }
            if (pCd) { currentDesign.cardStyle = pCd.card.cardStyle; currentDesign.cardRadius = pCd.card.cardRadius; currentDesign.carouselMode = pCd.card.carouselMode; }
            if (pPl) { currentDesign.lightUi = pPl.pal.lightUi; currentDesign.textColor = pPl.pal.textColor; currentDesign.titleColor = pPl.pal.titleColor; }
            if (pFx) { currentDesign.screenFx = pFx.fx.screenFx; currentDesign._baseScreenFx = pFx.fx.screenFx; currentDesign.screenFxOpacity = pFx.fx.screenFxOpacity; currentDesign.clickFx = pFx.fx.clickFx; }
            if (typeof window.updateGlobalDesignSnap === 'function') window.updateGlobalDesignSnap();
            if (typeof applyDesign === 'function') applyDesign(currentDesign);
            if (typeof window.syncLightUiClass === 'function') window.syncLightUiClass();
            if (typeof window.applyVisualFxPack === 'function') window.applyVisualFxPack();
        }

        const mkRow = (lbl, key) => {
            const g = mk('div', 'custom-group', 'margin:0;');
            g.appendChild(mk('label', '', '', lbl));
            const s = mk('select', 'custom-select', '');
            LAYER_PRESETS.forEach(p => { const o = mk('option', '', '', p.name); o.value = p.id; s.appendChild(o); });
            s.onchange = () => { state[key] = s.value; applyHybrid(); if (typeof playSfx === 'function') playSfx('switch'); };
            g.appendChild(s); return g;
        };

        const bSave = mk('button', 'btn-small btn-accent', 'padding:9px;font-weight:900;', 'Сохранить гибрид и превью');
        bSave.type = 'button';
        bSave.onclick = async () => {
            applyHybrid();
            try { await fetch('/api/design', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(currentDesign) }); } catch (_) {}
            await saveCurrentThemePreview('Hybrid_' + state.bg + '_' + state.card);
            if (typeof showToast === 'function') showToast('Гибридная тема сохранена!');
            bg.remove();
        };
        const bClose = mk('button', 'close-modal-btn', 'margin:0;', 'Закрыть');
        bClose.type = 'button'; bClose.onclick = () => bg.remove();
        box.append(
            mkRow('1. Фон и шейдер:', 'bg'), mkRow('2. Стиль карточек и рамок:', 'card'),
            mkRow('3. Палитра кнопок и текста:', 'pal'), mkRow('4. Экранный фильтр (Screen FX):', 'fx'),
            bSave, bClose
        );
        bg.appendChild(box); document.body.appendChild(bg);
    };

    function setupSpinDashScroll() {
        function tickSpin() {
            const track = document.getElementById('games-carousel') || document.querySelector('.carousel-container');
            if (Math.abs(spinVel) < 0.08) {
                spinVel = 0; spinRaf = 0;
                if (track) track.style.transform = '';
                return;
            }
            spinAcc += spinVel;
            const tilt = Math.max(-10, Math.min(10, spinVel * 0.42));
            if (track) track.style.transform = 'skewX(' + (-tilt).toFixed(2) + 'deg)';
            if (Math.abs(spinAcc) >= 28) {
                const dir = spinAcc > 0 ? 1 : -1;
                spinAcc -= dir * 28;
                if (typeof availableGames !== 'undefined' && availableGames.length > 0 && typeof selectGame === 'function') {
                    const nextIdx = (selectedIndex + dir + availableGames.length) % availableGames.length;
                    selectGame(nextIdx);
                }
            }
            spinVel *= 0.86;
            spinRaf = requestAnimationFrame(tickSpin);
        }

        window.addEventListener('wheel', (e) => {
            if (typeof currentDesign !== 'undefined' && currentDesign && (currentDesign.spinDashScroll === false || currentDesign.liteMode)) return;
            if (document.querySelector('.modal-backdrop.active')) return;
            if (e.target && e.target.closest && e.target.closest('#sgl-jb-drawer, .dropdown-menu')) return;
            const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
            if (Math.abs(delta) < 4) return;
            e.preventDefault();
            spinVel = Math.max(-36, Math.min(36, spinVel + Math.sign(delta) * Math.min(14, Math.abs(delta) * 0.12)));
            if (!spinRaf) spinRaf = requestAnimationFrame(tickSpin);
        }, { passive: false });
    }

    function syncCalendarEasterEggs() {
        if (calRaf) { cancelAnimationFrame(calRaf); calRaf = 0; }
        document.getElementById('sgl-cal-canvas')?.remove();
        document.getElementById('sgl-bday-badge')?.remove();
        if (typeof currentDesign !== 'undefined' && currentDesign && (currentDesign.seasonalFx === false || currentDesign.liteMode)) return;

        const mode = (typeof currentDesign !== 'undefined' && currentDesign && currentDesign.seasonalPreview) || 'auto';
        if (mode === 'off') return;
        const now = new Date();
        const isBday = mode === 'bday' || (mode === 'auto' && now.getMonth() === 5 && now.getDate() === 23);
        const isWinter = mode === 'winter' || (mode === 'auto' && (now.getMonth() === 11 || now.getMonth() === 0));
        const isSalute = mode === 'salute';
        if (!isBday && !isWinter && !isSalute) return;

        if (isBday) {
            const b = mk('div', '', '', 'С Днём рождения, Соник! (23 июня)');
            b.id = 'sgl-bday-badge';
            document.body.appendChild(b);
        }

        const cvs = mk('canvas', '', ''); cvs.id = 'sgl-cal-canvas';
        document.body.appendChild(cvs);
        const ctx = cvs.getContext('2d');
        const parts = new Array();
        for (let i = 0; i < (isBday ? 22 : 42); i++) {
            parts.push({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, r: isBday ? (6 + Math.random() * 5) : (1.5 + Math.random() * 2.5), vy: 0.6 + Math.random() * 1.4, vx: (Math.random() - 0.5) * 0.6, a: Math.random() * 6.28 });
        }

        function drawCal() {
            if (!cvs.isConnected) return;
            calRaf = requestAnimationFrame(drawCal);
            if (document.hidden || document.body.classList.contains('sgl-game-mode-active')) return;
            if (cvs.width !== window.innerWidth || cvs.height !== window.innerHeight) { cvs.width = window.innerWidth; cvs.height = window.innerHeight; }
            ctx.clearRect(0, 0, cvs.width, cvs.height);
            parts.forEach(p => {
                p.y += p.vy; p.x += p.vx + Math.sin(p.a) * 0.35; p.a += 0.03;
                if (p.y > cvs.height + 16) { p.y = -16; p.x = Math.random() * cvs.width; }
                if (isSalute) {
                    ctx.fillStyle = 'rgba(253,224,71,' + (0.45 + 0.5 * Math.abs(Math.sin(p.a * 2))).toFixed(2) + ')';
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.75, 0, Math.PI * 2); ctx.fill();
                } else if (isBday) {
                    ctx.strokeStyle = 'rgba(250,204,21,0.72)'; ctx.lineWidth = 2.4;
                    ctx.beginPath(); ctx.ellipse(p.x, p.y, Math.max(2, Math.abs(Math.cos(p.a)) * p.r), p.r, 0, 0, Math.PI * 2); ctx.stroke();
                } else {
                    ctx.fillStyle = 'rgba(226,232,240,0.65)';
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
                }
            });
        }
        calRaf = requestAnimationFrame(drawCal);
    }

    function setupAttractMode() {
        let hud = document.getElementById('sgl-attract-hud');
        if (!hud) { hud = mk('div', '', ''); hud.id = 'sgl-attract-hud'; document.body.appendChild(hud); }

        function exitAttract() {
            attractIdleTs = Date.now();
            if (!attractActive) return;
            attractActive = false;
            document.body.classList.remove('sgl-attract-mode');
            if (attractCycleTimer) { clearInterval(attractCycleTimer); attractCycleTimer = 0; }
        }

        async function updateAttractHud() {
            const g = (typeof availableGames !== 'undefined' && availableGames.length > 0) ? availableGames.at(selectedIndex) : null;
            if (!g) return;
            const info = window._sglSaveSummary?.games ? window._sglSaveSummary.games[g.id] : null;
            const prog = info ? ((info.allEmeralds ? '7 Изумрудов • ' : '') + (info.completed ? 'CLEAR' : 'В процессе')) : 'Готово к запуску';
            hud.innerHTML = '';
            const txt = mk('div', '', 'display:flex;flex-direction:column;gap:4px;');
            txt.append(
                mk('div', '', 'font-size:10px;font-weight:800;color:#38bdf8;letter-spacing:1.2px;', 'ATTRACT MODE • ВИТРИНА'),
                mk('div', '', 'font-size:15px;font-weight:900;color:#fde047;', g.name),
                mk('div', '', 'font-size:11.5px;opacity:0.85;', 'Прогресс сейва: ' + prog)
            );
            hud.appendChild(txt);
            try {
                const sc = await (await fetch('/api/screenshots?id=' + encodeURIComponent(g.id))).json();
                const list = sc.files || sc.screenshots || new Array();
                if (list.length > 0) {
                    const pick = list.at(Math.floor(Math.random() * list.length));
                    const im = mk('img', '', 'width:110px;height:64px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,0.2);');
                    im.src = typeof pick === 'string' ? pick : (pick.url || '');
                    if (im.src) hud.prepend(im);
                }
            } catch (_) {}
        }

        Array.of('mousemove', 'keydown', 'pointerdown', 'wheel').forEach(ev => window.addEventListener(ev, exitAttract, { passive: true }));

        window.triggerAttractModeNow = function() {
            if (attractActive) return;
            attractActive = true;
            document.body.classList.add('sgl-attract-mode');
            updateAttractHud();
            attractCycleTimer = setInterval(() => {
                if (typeof availableGames !== 'undefined' && availableGames.length > 1 && typeof selectGame === 'function') {
                    selectGame((selectedIndex + 1) % availableGames.length);
                    updateAttractHud();
                }
            }, 6000);
        };
        setInterval(() => {
            const en = Boolean(typeof currentDesign !== 'undefined' && currentDesign && currentDesign.attractEnabled);
            const secs = Math.max(15, Math.min(3600, Number(currentDesign?.attractSecs || 120)));
            if (!en || attractActive) return;
            if (document.body.classList.contains('sgl-game-mode-active') || document.querySelector('.modal-backdrop.active')) { attractIdleTs = Date.now(); return; }
            if (Date.now() - attractIdleTs >= secs * 1000) window.triggerAttractModeNow();
        }, 2500);
    }

    function injectMotionSettings() {
        const tabBg = document.getElementById('tab-bg') || document.querySelectorAll('#custom-modal .tab-pane').item(1);
        if (tabBg && !document.getElementById('sgl-tmp-settings')) {
            const box = mk('div', 'char-card-cfg', 'margin-top:8px;display:flex;flex-direction:column;gap:8px;');
            box.id = 'sgl-tmp-settings';
            const mkChk = (lbl, key, defVal, onCh) => {
                const l = mk('label', '', 'display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;');
                const c = document.createElement('input'); c.type = 'checkbox';
                c.checked = (currentDesign && currentDesign[key] !== undefined) ? Boolean(currentDesign[key]) : defVal;
                c.onchange = () => { if (currentDesign) currentDesign[key] = c.checked; if (onCh) onCh(); };
                l.append(c, mk('span', '', '', lbl)); return l;
            };
            const evRow = mk('div', '', 'display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px;');
            evRow.appendChild(mk('span', '', '', 'Режим / Превью события:'));
            const evSel = mk('select', 'custom-select', 'max-width:210px;');
            Array.of(
                { v: 'auto', t: 'Авто (по дате)' }, { v: 'bday', t: 'День рождения Соника (Кольца)' },
                { v: 'winter', t: 'Зимний Мобиус (Снег)' }, { v: 'salute', t: 'Золотой салют 100%' }, { v: 'off', t: 'Выключено' }
            ).forEach(o => { const op = mk('option', '', '', o.t); op.value = o.v; evSel.appendChild(op); });
            evSel.value = currentDesign?.seasonalPreview || 'auto';
            evSel.onchange = () => { if (currentDesign) currentDesign.seasonalPreview = evSel.value; syncCalendarEasterEggs(); };
            evRow.appendChild(evSel);

            const atRow = mk('div', '', 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;');
            const atNum = mk('input', 'custom-input', 'width:76px;padding:4px 6px;');
            atNum.type = 'number'; atNum.min = '15'; atNum.max = '3600'; atNum.value = String(currentDesign?.attractSecs || 120);
            atNum.onchange = () => { if (currentDesign) currentDesign.attractSecs = Math.max(15, Math.min(3600, parseInt(atNum.value, 10) || 120)); };
            const bTest = mk('button', 'btn-small btn-accent', 'padding:5px 10px;', 'Тест витрины сейчас');
            bTest.type = 'button';
            bTest.onclick = () => {
                document.getElementById('custom-modal')?.classList.remove('active');
                setTimeout(() => { if (typeof window.triggerAttractModeNow === 'function') window.triggerAttractModeNow(); }, 250);
            };
            atRow.append(mkChk('Attract Mode (сек.):', 'attractEnabled', false), atNum, bTest);

            box.append(
                mkChk('Инерционная Spin Dash физика скролла', 'spinDashScroll', true),
                evRow, atRow
            );
            tabBg.appendChild(box);
        }
        loadSavedPreviews();
    }

    const _bootTmp = () => {
        injectCss(); setupSpinDashScroll(); setupAttractMode();
        setTimeout(syncCalendarEasterEggs, 600);
        const origOpen = window.openCustomModal;
        if (typeof origOpen === 'function') {
            window.openCustomModal = function() { const r = origOpen.apply(this, arguments); setTimeout(injectMotionSettings, 60); return r; };
        }
        const origReset = window.resetDesign;
        if (typeof origReset === 'function') {
            window.resetDesign = function() {
                if (currentDesign) { currentDesign.spinDashScroll = true; currentDesign.seasonalFx = true; currentDesign.attractMins = 0; currentDesign.cardStyle = 'glass'; }
                const r = origReset.apply(this, arguments);
                syncCalendarEasterEggs();
                return r;
            };
        }
    };
    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', _bootTmp); else _bootTmp();
})();
