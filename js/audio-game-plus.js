/* === MODULE: PRO EQUALIZER, OST SCANNER, GAME MODE & VANILLA SAFE BOOT === */
(function() {
    const EQ_KEY = 'sgl_audio_plus_v1';
    let bassNode = null, midNode = null, trebleNode = null, eqWired = false;
    let shiftHeld = false, gameModeRunning = false, lastCrashTs = 0, ostTracks = new Array(), ostFilter = 'all';

    const SVG_EQ = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>';
    const SVG_SCAN = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    const SVG_SHIELD = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';

    const EQ_PRESETS = Array.of(
        { id: 'flat', name: 'Чистый', b: 0, m: 0, t: 0 },
        { id: 'md_bass', name: 'Mega Drive Bass', b: 8, m: -1, t: 3 },
        { id: 'rock', name: 'Crush 40 Rock', b: 5, m: 4, t: 6 },
        { id: 'retro16', name: 'Ретро 16-bit', b: -2, m: 6, t: 4 },
        { id: 'soft', name: 'Мягкий фон', b: 3, m: -3, t: -4 }
    );

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function getCfg() {
        const def = { mode: 'bars', colorMode: 'auto', customColor: '#38bdf8', barCount: 48, glow: 12, fallSpeed: 4, bass: 0, mid: 0, treble: 0, preset: 'flat', gameMode: true };
        let ls = {};
        try { ls = JSON.parse(localStorage.getItem(EQ_KEY) || '{}'); } catch (_) {}
        const dsg = (typeof currentDesign !== 'undefined' && currentDesign && currentDesign.audioPlus) ? currentDesign.audioPlus : {};
        return Object.assign(def, ls, dsg);
    }

    function saveCfg(next) {
        try { localStorage.setItem(EQ_KEY, JSON.stringify(next)); } catch (_) {}
        if (typeof currentDesign !== 'undefined' && currentDesign) currentDesign.audioPlus = Object.assign({}, next);
        applyAudioFilters();
    }

    function injectPlusCss() {
        if (document.getElementById('sgl-agp-css')) return;
        const st = mk('style', '', '');
        st.id = 'sgl-agp-css';
        st.textContent = Array.of(
            '#audio-eq-canvas{display:none !important;}',
            '#sgl-pro-eq-canvas{position:fixed;bottom:0;left:0;width:100%;height:110px;z-index:1;pointer-events:none;opacity:0.85;}',
            'body.sgl-game-mode-active #bg-shader-canvas, body.sgl-game-mode-active #sgl-pro-eq-canvas, body.sgl-game-mode-active #floating-objects{opacity:0 !important;animation-play-state:paused !important;}',
            '#sgl-safe-pill{position:fixed;bottom:68px;left:50%;transform:translateX(-50%);z-index:960;display:none;align-items:center;gap:7px;padding:6px 14px;border-radius:999px;background:rgba(15,23,42,0.92);border:1.5px solid #4ade80;color:#4ade80;font-size:11.5px;font-weight:800;box-shadow:0 8px 24px rgba(0,0,0,0.6);pointer-events:none;}',
            'body.sgl-safe-boot-hold #sgl-safe-pill{display:inline-flex;}',
            'body.sgl-safe-boot-hold .game-card.selected .play-circle{background:#16a34a !important;box-shadow:0 0 20px rgba(74,222,128,0.85) !important;}',
            '.agp-eq-box{width:540px;max-width:94vw;}',
            '.agp-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px;}',
            '.agp-ost-box{margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.12);display:flex;flex-direction:column;gap:5px;}',
            '.agp-ost-list{max-height:130px;overflow-y:auto;display:flex;flex-direction:column;gap:3px;}'
        ).join('\n');
        document.head.appendChild(st);
    }

    function wireWebAudioEq() {
        if (eqWired || typeof realAudioCtx === 'undefined' || !realAudioCtx || !realAnalyser) return;
        try {
            bassNode = realAudioCtx.createBiquadFilter(); bassNode.type = 'lowshelf'; bassNode.frequency.value = 120;
            midNode = realAudioCtx.createBiquadFilter(); midNode.type = 'peaking'; midNode.frequency.value = 1000; midNode.Q.value = 1.0;
            trebleNode = realAudioCtx.createBiquadFilter(); trebleNode.type = 'highshelf'; trebleNode.frequency.value = 6000;
            realAnalyser.disconnect();
            realAnalyser.connect(bassNode);
            bassNode.connect(midNode);
            midNode.connect(trebleNode);
            trebleNode.connect(realAudioCtx.destination);
            eqWired = true;
            applyAudioFilters();
        } catch (_) {}
    }

    function applyAudioFilters() {
        if (!eqWired || !bassNode) return;
        const c = getCfg();
        bassNode.gain.value = Number(c.bass || 0);
        midNode.gain.value = Number(c.mid || 0);
        trebleNode.gain.value = Number(c.treble || 0);
    }

    function startProEqRenderer() {
        let cvs = document.getElementById('sgl-pro-eq-canvas');
        if (!cvs) { cvs = mk('canvas', '', ''); cvs.id = 'sgl-pro-eq-canvas'; document.body.appendChild(cvs); }
        const ctx = cvs.getContext('2d');
        const peaks = new Float32Array(128);
        let timeBuf = null;

        function resolveStroke(c, ratio) {
            if (c.colorMode === 'gold') return '#facc15';
            if (c.colorMode === 'emerald') return ratio > 0.5 ? '#34d399' : '#10b981';
            if (c.colorMode === 'cyber') return ratio > 0.5 ? '#f472b6' : '#22d3ee';
            if (c.colorMode === 'custom') return c.customColor || '#38bdf8';
            const g = (typeof availableGames !== 'undefined' && availableGames.length > 0) ? availableGames.at(selectedIndex) : null;
            return g && g.color ? g.color : '#ffd700';
        }

        function loop() {
            const cfg = getCfg();
            const enabled = (typeof currentDesign === 'undefined' || currentDesign?.enableEq !== false) && !currentDesign?.liteMode;
            const playing = typeof currentBgmAudio !== 'undefined' && currentBgmAudio && !currentBgmAudio.paused && currentBgmAudio.volume > 0;
            if (document.hidden || !enabled || !playing || gameModeRunning) {
                ctx.clearRect(0, 0, cvs.width, cvs.height);
                setTimeout(() => requestAnimationFrame(loop), 220);
                return;
            }
            wireWebAudioEq();
            const w = window.innerWidth, h = cfg.mode === 'ring' ? 180 : 110;
            if (cvs.width !== w) cvs.width = w;
            if (cvs.height !== h) { cvs.height = h; cvs.style.height = h + 'px'; }
            ctx.clearRect(0, 0, w, h);

            if (typeof realAnalyser === 'undefined' || !realAnalyser || !realFreqData) { requestAnimationFrame(loop); return; }
            const bars = Math.max(16, Math.min(96, Number(cfg.barCount || 48)));
            const fall = Math.max(0.5, Number(cfg.fallSpeed || 4)) * 0.7;
            ctx.shadowBlur = Number(cfg.glow || 0);

            if (cfg.mode === 'wave') {
                if (!timeBuf || timeBuf.length !== realAnalyser.fftSize) timeBuf = new Uint8Array(realAnalyser.fftSize);
                realAnalyser.getByteTimeDomainData(timeBuf);
                const col = resolveStroke(cfg, 0.5);
                ctx.strokeStyle = col; ctx.shadowColor = col; ctx.lineWidth = 2.6;
                ctx.beginPath();
                for (let i = 0; i < timeBuf.length; i++) {
                    const x = (i / (timeBuf.length - 1)) * w;
                    const y = (timeBuf.at(i) / 255) * h;
                    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();
            } else {
                realAnalyser.getByteFrequencyData(realFreqData);
                for (let i = 0; i < bars; i++) {
                    const bin = Math.floor((i / bars) * Math.min(48, realFreqData.length));
                    const raw = realFreqData.at(bin) || 0;
                    const val = Math.max(2, Math.pow(raw / 255, 1.3) * (h - 14));
                    const prev = peaks.at(i) || 0;
                    const cur = val > prev ? val : Math.max(2, prev - fall);
                    peaks.fill(cur, i, i + 1);
                    const col = resolveStroke(cfg, i / bars);
                    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.shadowColor = col;

                    if (cfg.mode === 'ring') {
                        const ang = (i / bars) * Math.PI * 2 - Math.PI * 0.5;
                        const cx = w * 0.5, cy = h * 0.55, r0 = 34, r1 = r0 + cur * 0.52;
                        ctx.lineWidth = Math.max(2, (160 / bars));
                        ctx.beginPath();
                        ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
                        ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
                        ctx.stroke();
                    } else if (cfg.mode === 'mirror') {
                        const bw = (w / bars) * 0.65, x = i * (w / bars) + ((w / bars) - bw) * 0.5;
                        ctx.fillRect(x, h * 0.5 - cur * 0.45, bw, cur * 0.9);
                    } else if (cfg.mode === 'led') {
                        const bw = (w / bars) * 0.68, x = i * (w / bars) + ((w / bars) - bw) * 0.5;
                        const segs = Math.floor(cur / 7);
                        for (let s = 0; s < segs; s++) ctx.fillRect(x, h - (s + 1) * 7, bw, 5);
                    } else {
                        const bw = (w / bars) * 0.66, x = i * (w / bars) + ((w / bars) - bw) * 0.5;
                        ctx.fillRect(x, h - cur, bw, cur);
                    }
                }
            }
            ctx.shadowBlur = 0;
            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);
    }

    window.openEqCustomizerModal = function() {
        document.getElementById('sgl-eq-modal')?.remove();
        const c = getCfg();
        const bg = mk('div', 'modal-backdrop active', 'z-index:9895;');
        bg.id = 'sgl-eq-modal';
        bg.onclick = e => { if (e.target === bg) bg.remove(); };

        const box = mk('div', 'modal-box agp-eq-box', '');
        box.appendChild(mk('div', 'modal-title', '', 'Настройка эквалайзера и визуализатора'));

        const mkSel = (lbl, opts, val, onCh) => {
            const g = mk('div', 'custom-group', 'margin-bottom:6px;');
            g.appendChild(mk('label', '', '', lbl));
            const s = mk('select', 'custom-select', '');
            opts.forEach(o => { const op = mk('option', '', '', o.t); op.value = o.v; s.appendChild(op); });
            s.value = val; s.onchange = () => onCh(s.value);
            g.appendChild(s); return g;
        };

        const mkRng = (lbl, min, max, val, unit, onIn) => {
            const g = mk('div', 'custom-group', 'margin-bottom:6px;');
            const sp = mk('span', '', '', val + unit);
            const l = mk('label', '', '', lbl + ': '); l.appendChild(sp);
            const r = document.createElement('input'); r.type = 'range'; r.min = min; r.max = max; r.value = val;
            r.oninput = () => { sp.textContent = r.value + unit; onIn(Number(r.value)); };
            g.append(l, r); return { g, r, sp };
        };

        const g1 = mk('div', 'agp-grid', '');
        g1.append(
            mkSel('Режим визуализации:', Array.of(
                { v: 'bars', t: 'Столбики (Bars)' }, { v: 'led', t: 'Ретро-сегменты (LED Blocks)' },
                { v: 'wave', t: 'Звуковая волна (Waveform)' }, { v: 'mirror', t: 'Симметричный импульс (Mirror)' },
                { v: 'ring', t: 'Круговой спектр (Sonic Ring)' }
            ), c.mode, v => { c.mode = v; saveCfg(c); }),
            mkSel('Цвет визуализатора:', Array.of(
                { v: 'auto', t: 'Авто от акцента темы' }, { v: 'gold', t: 'Золотое кольцо' },
                { v: 'emerald', t: 'Изумрудный градиент' }, { v: 'cyber', t: 'Кибер-неон' },
                { v: 'custom', t: 'Свой цвет' }
            ), c.colorMode, v => { c.colorMode = v; saveCfg(c); })
        );

        const colRow = mk('div', '', 'display:flex;align-items:center;justify-content:space-between;font-size:12px;margin:4px 0 8px;');
        colRow.appendChild(mk('span', '', '', 'Свой цвет спектра:'));
        const cInp = document.createElement('input'); cInp.type = 'color'; cInp.value = c.customColor || '#38bdf8';
        cInp.oninput = () => { c.customColor = cInp.value; c.colorMode = 'custom'; saveCfg(c); };
        colRow.appendChild(cInp);

        const rBars = mkRng('Количество полос', 16, 96, c.barCount, '', v => { c.barCount = v; saveCfg(c); });
        const rGlow = mkRng('Сила неонового свечения', 0, 28, c.glow, ' px', v => { c.glow = v; saveCfg(c); });
        const rFall = mkRng('Скорость падения пиков', 1, 10, c.fallSpeed, '', v => { c.fallSpeed = v; saveCfg(c); });

        const eqCard = mk('div', 'char-card-cfg', 'margin-top:8px;');
        eqCard.appendChild(mk('div', 'char-cfg-header', 'color:#fde047;', 'Звуковой эквалайзер (Bass / Mid / Treble)'));
        const rBass = mkRng('Низкие (Bass)', -12, 12, c.bass, ' dB', v => { c.bass = v; saveCfg(c); });
        const rMid = mkRng('Средние (Mid)', -12, 12, c.mid, ' dB', v => { c.mid = v; saveCfg(c); });
        const rTreb = mkRng('Высокие (Treble)', -12, 12, c.treble, ' dB', v => { c.treble = v; saveCfg(c); });

        const preRow = mk('div', '', 'display:flex;gap:5px;flex-wrap:wrap;margin-bottom:6px;');
        EQ_PRESETS.forEach(pr => {
            const b = mk('button', 'btn-small', 'font-size:11px;', pr.name);
            b.type = 'button';
            b.onclick = () => {
                c.preset = pr.id; c.bass = pr.b; c.mid = pr.m; c.treble = pr.t; saveCfg(c);
                rBass.r.value = pr.b; rBass.sp.textContent = pr.b + ' dB';
                rMid.r.value = pr.m; rMid.sp.textContent = pr.m + ' dB';
                rTreb.r.value = pr.t; rTreb.sp.textContent = pr.t + ' dB';
            };
            preRow.appendChild(b);
        });
        eqCard.append(preRow, rBass.g, rMid.g, rTreb.g);

        const closeB = mk('button', 'close-modal-btn', '', 'Готово');
        closeB.type = 'button'; closeB.onclick = () => bg.remove();
        box.append(g1, colRow, rBars.g, rGlow.g, rFall.g, eqCard, closeB);
        bg.appendChild(box); document.body.appendChild(bg);
        if (typeof playSfx === 'function') playSfx('open_menu');
    };

    function renderOstScannerIntoDrawer() {
        const drw = document.getElementById('sgl-jb-drawer');
        if (!drw) return;
        let box = document.getElementById('sgl-ost-drawer-box');
        if (!box) {
            box = mk('div', 'agp-ost-box', ''); box.id = 'sgl-ost-drawer-box';
            const top = mk('div', '', 'display:flex;gap:5px;align-items:center;justify-content:space-between;');
            const scanB = mk('button', 'btn-small btn-accent', 'font-size:10.5px;padding:4px 8px;display:inline-flex;align-items:center;gap:5px;', '');
            scanB.type = 'button'; scanB.innerHTML = SVG_SCAN + '<span>Сканировать OST игр</span>';
            const fltSel = mk('select', 'custom-select', 'font-size:10.5px;padding:3px 6px;max-width:125px;');
            fltSel.id = 'sgl-ost-filter';
            const list = mk('div', 'agp-ost-list', ''); list.id = 'sgl-ost-list';
            scanB.onclick = async () => {
                if (typeof showToast === 'function') showToast('Сканирование OST в папках игр...');
                try {
                    const r = await (await fetch('/api/jukebox/scan_game_ost')).json();
                    ostTracks = r.tracks || new Array();
                    if (typeof showToast === 'function') showToast('Найдено треков OST: ' + ostTracks.length);
                    drawOstList();
                } catch (_) {}
            };
            fltSel.onchange = () => { ostFilter = fltSel.value; drawOstList(); };
            top.append(scanB, fltSel);
            box.append(top, list);
            drw.appendChild(box);
        }
        drawOstList();
    }

    function drawOstList() {
        const fltSel = document.getElementById('sgl-ost-filter');
        const list = document.getElementById('sgl-ost-list');
        if (!fltSel || !list) return;
        const gamesMap = new Map();
        ostTracks.forEach(t => { gamesMap.set(t.gameId, t.gameName); });
        fltSel.innerHTML = '';
        const oAll = mk('option', '', '', 'Все игры (' + ostTracks.length + ')'); oAll.value = 'all'; fltSel.appendChild(oAll);
        gamesMap.forEach((nm, id) => { const o = mk('option', '', '', nm); o.value = id; fltSel.appendChild(o); });
        fltSel.value = gamesMap.has(ostFilter) ? ostFilter : 'all';

        list.innerHTML = '';
        const items = ostFilter === 'all' ? ostTracks : ostTracks.filter(t => t.gameId === ostFilter);
        items.slice(0, 80).forEach(tr => {
            const row = mk('div', 'jb-track-row', 'font-size:11px;justify-content:space-between;');
            row.append(
                mk('span', '', 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;', tr.title),
                mk('span', '', 'font-size:9.5px;opacity:0.6;margin-left:6px;flex-shrink:0;', tr.gameName)
            );
            row.onclick = () => {
                if (typeof window.setJukeboxExternalLabel === 'function') window.setJukeboxExternalLabel(tr.gameName + ' — ' + tr.title);
                if (typeof window.setMasterMusicTrack === 'function') window.setMasterMusicTrack(tr.url, true, false);
            };
            list.appendChild(row);
        });
    }

    function injectJukeboxAndAudioControls() {
        const jb = document.getElementById('sgl-jukebox');
        if (jb && !document.getElementById('jb-eq-btn')) {
            const eqB = mk('button', 'jb-btn jb-full-part', '', '');
            eqB.type = 'button'; eqB.id = 'jb-eq-btn'; eqB.title = 'Настроить эквалайзер'; eqB.innerHTML = SVG_EQ;
            eqB.onclick = () => window.openEqCustomizerModal();
            jb.insertBefore(eqB, jb.lastElementChild);
        }
        renderOstScannerIntoDrawer();

        const tabAudio = document.getElementById('tab-audio');
        if (tabAudio && !document.getElementById('agp-audio-sec')) {
            const sec = mk('div', 'char-card-cfg', 'margin-top:8px;'); sec.id = 'agp-audio-sec';
            const row = mk('div', '', 'display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;');
            const eqBtn = mk('button', 'btn-small btn-accent', 'display:inline-flex;align-items:center;gap:6px;', '');
            eqBtn.type = 'button'; eqBtn.innerHTML = SVG_EQ + '<span>Настроить эквалайзер</span>';
            eqBtn.onclick = () => window.openEqCustomizerModal();

            const gmLbl = mk('label', '', 'display:flex;align-items:center;gap:7px;font-size:12px;cursor:pointer;');
            const gmChk = document.createElement('input'); gmChk.type = 'checkbox'; gmChk.checked = getCfg().gameMode !== false;
            gmChk.onchange = () => { const c = getCfg(); c.gameMode = gmChk.checked; saveCfg(c); };
            gmLbl.append(gmChk, mk('span', '', '', 'Game Mode (авто-пауза фона и Jukebox)'));
            row.append(gmLbl, eqBtn);
            sec.appendChild(row);
            tabAudio.prepend(sec);
        }
    }

    function showCrashDiagnosticModal(gameId) {
        document.getElementById('sgl-crash-modal')?.remove();
        const gObj = (typeof gamesData !== 'undefined') ? gamesData.find(x => x.id === gameId) : null;
        const bg = mk('div', 'modal-backdrop active', 'z-index:9920;');
        bg.id = 'sgl-crash-modal';
        const box = mk('div', 'modal-box', 'width:460px;max-width:92vw;text-align:center;');
        box.append(
            mk('div', 'modal-title', 'color:#f87171;', 'Диагностика быстрого вылета'),
            mk('div', '', 'font-size:13px;line-height:1.5;margin-bottom:14px;opacity:0.9;', 'Игра закрылась слишком быстро. Возможен конфликт модов или повреждён Data.rsdk' + (gObj ? (' (' + gObj.name + ')') : '') + '.')
        );
        const acts = mk('div', '', 'display:flex;gap:8px;justify-content:center;flex-wrap:wrap;');
        const bSafe = mk('button', 'btn-small btn-accent', 'padding:9px 14px;font-weight:800;', 'Запустить без модов');
        bSafe.type = 'button';
        bSafe.onclick = () => { bg.remove(); fetch('/api/launch?id=' + encodeURIComponent(gameId) + '&safe=1'); };
        const bMods = mk('button', 'btn-small', 'padding:9px 14px;', 'Открыть моды');
        bMods.type = 'button';
        bMods.onclick = () => { bg.remove(); if (typeof openModsModal === 'function') openModsModal(); };
        const bClose = mk('button', 'btn-reset', 'padding:9px 14px;', 'Закрыть');
        bClose.type = 'button'; bClose.onclick = () => bg.remove();
        acts.append(bSafe, bMods, bClose);
        box.appendChild(acts); bg.appendChild(box); document.body.appendChild(bg);
    }

    function setupSafeBootAndGameMode() {
        if (!document.getElementById('sgl-safe-pill')) {
            const pill = mk('div', '', ''); pill.id = 'sgl-safe-pill';
            pill.innerHTML = SVG_SHIELD + '<span>Чистый запуск (без модов)</span>';
            document.body.appendChild(pill);
        }
        const setShift = (on) => {
            if (shiftHeld === on) return;
            shiftHeld = on;
            document.body.classList.toggle('sgl-safe-boot-hold', on);
            const scBtn = document.querySelector('#sgl-showcase-panel .sc-play-btn');
            if (scBtn) scBtn.textContent = on ? 'Чистый запуск (без модов)' : '▶ ИГРАТЬ';
        };
        window.addEventListener('keydown', e => { if (e.key === 'Shift') setShift(true); });
        window.addEventListener('keyup', e => { if (e.key === 'Shift') setShift(false); });
        window.addEventListener('blur', () => setShift(false));

        let safeBootUntil = 0;
        const origLaunchAgp = window.triggerGameLaunch;
        if (typeof origLaunchAgp === 'function' && !window._agpSafeHooked) {
            window._agpSafeHooked = true;
            window.triggerGameLaunch = function() {
                if (shiftHeld) safeBootUntil = Date.now() + 4500;
                return origLaunchAgp.apply(this, arguments);
            };
        }
        const origFetch = window.fetch.bind(window);
        window.fetch = function(input, init) {
            if ((shiftHeld || Date.now() < safeBootUntil) && typeof input === 'string' && input.includes('/api/launch?') && !input.includes('safe=1')) {
                safeBootUntil = 0;
                input = input + '&safe=1';
                if (typeof showToast === 'function') showToast('Чистый запуск (без модов)');
            }
            return origFetch(input, init);
        };

        setInterval(async () => {
            try {
                const d = await (await origFetch('/api/playtime_ping')).json();
                const isRun = Boolean(d.runningId);
                const gmOn = getCfg().gameMode !== false;
                gameModeRunning = isRun && gmOn;
                document.body.classList.toggle('sgl-game-mode-active', gameModeRunning);
                const ls = d.lastSession;
                if (ls && ls.ts && ls.ts !== lastCrashTs) {
                    lastCrashTs = ls.ts;
                    if (ls.elapsed < 5 && !ls.safe) showCrashDiagnosticModal(ls.gameId);
                }
            } catch (_) {}
        }, 3000);
    }

    const _bootAgp = () => {
        injectPlusCss();
        startProEqRenderer();
        setupSafeBootAndGameMode();
        setTimeout(injectJukeboxAndAudioControls, 450);
        const origOpen = window.openCustomModal;
        if (typeof origOpen === 'function') {
            window.openCustomModal = function() { const r = origOpen.apply(this, arguments); injectJukeboxAndAudioControls(); return r; };
        }
    };
    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', _bootAgp); else _bootAgp();
})();
