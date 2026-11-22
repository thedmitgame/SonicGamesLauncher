/* === OST JUKEBOX 2.0 === */
(function() {
    let playlist = new Array();
    let trackIdx = 0;
    let externalLabel = '';
    let jbCollapsed = (localStorage.getItem('sgl_jb_collapsed') === '1');
    let jbShuffle = (localStorage.getItem('sgl_jb_shuffle') === '1');
    let drawerOpen = false;
    let isSeeking = false;

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function mkSvg(vb, inner) {
        return '<svg class="btn-svg-icon" viewBox="' + vb + '">' + inner + '</svg>';
    }

    const IC_PLAY = mkSvg('0 0 24 24', '<polygon points="5 3 19 12 5 21 5 3"/>');
    const IC_PAUSE = mkSvg('0 0 24 24', '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>');
    const IC_PREV = mkSvg('0 0 24 24', '<polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/>');
    const IC_NEXT = mkSvg('0 0 24 24', '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>');
    const IC_NOTE = mkSvg('0 0 24 24', '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>');
    const IC_LIST = mkSvg('0 0 24 24', '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>');
    const IC_SHUF = mkSvg('0 0 24 24', '<polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>');
    const IC_DIR = mkSvg('0 0 24 24', '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>');

    function fmtTime(sec) {
        if (!isFinite(sec) || sec < 0) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function positionDrawer() {
        const bar = document.getElementById('sgl-jukebox');
        const drw = document.getElementById('sgl-jb-drawer');
        if (!bar || !drw || !drawerOpen) return;
        const r = bar.getBoundingClientRect();
        const w = 310;
        const left = Math.max(10, Math.min(window.innerWidth - w - 10, r.right - w));
        const top = (r.bottom + 320 > window.innerHeight) ? Math.max(10, r.top - 315) : (r.bottom + 8);
        drw.style.left = left + 'px';
        drw.style.top = top + 'px';
    }

    function applyVisibility() {
        const bar = document.getElementById('sgl-jukebox');
        const drw = document.getElementById('sgl-jb-drawer');
        if (!bar) return;
        const hideSet = (typeof currentDesign !== 'undefined' && currentDesign && currentDesign.showJukebox === false);
        const hideHud = Boolean(currentDesign?.customLayout?.jukebox?.hidden);
        const hideAll = (hideSet || hideHud);
        bar.style.display = hideAll ? 'none' : 'flex';
        bar.classList.toggle('collapsed', jbCollapsed);
        if (hideAll || jbCollapsed) drawerOpen = false;
        if (drw) drw.classList.toggle('open', drawerOpen && !hideAll && !jbCollapsed);
        positionDrawer();
    }
    window.syncJukeboxVisibility = applyVisibility;
    window.syncJukeboxVolume = function() {};

    function renderDrawerList() {
        const listEl = document.getElementById('jb-drawer-list');
        const shufBtn = document.getElementById('jb-shuf-btn');
        if (shufBtn) shufBtn.classList.toggle('active-shuf', jbShuffle);
        if (!listEl) return;
        listEl.innerHTML = '';

        if (playlist.length === 0) {
            listEl.appendChild(mk('div', '', 'font-size:11px;opacity:0.6;text-align:center;padding:18px 8px;', 'Плейлист пуст. Добавьте треки кнопкой «+ Трек»!'));
            return;
        }

        playlist.forEach((tr, idx) => {
            const isCur = (!externalLabel && idx === trackIdx);
            const row = mk('div', 'jb-track-row' + (isCur ? ' active' : ''), '');
            const num = mk('span', '', 'font-size:10px;opacity:0.55;width:18px;flex-shrink:0;', String(idx + 1));
            const name = mk('span', '', 'flex:1;font-size:11.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;', tr.title);
            const playThis = () => {
                trackIdx = idx;
                jukeboxOverrideActive = true;
                externalLabel = '';
                window.startJukeboxPlayback(true);
            };
            row.append(num, name);
            row.onclick = (e) => { if (!e.target.closest('button')) playThis(); };

            if (tr.file) {
                const del = mk('button', 'jb-del-btn', '', '×');
                del.type = 'button';
                del.title = 'Удалить трек из плейлиста';
                del.onclick = async (ev) => {
                    ev.stopPropagation();
                    if (typeof askDialog === 'function' && !(await askDialog('Удалить трек «' + tr.title + '» из папки sounds/music?', null))) return;
                    const r = await fetch('/api/jukebox/delete_track', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ file: tr.file })
                    });
                    const d = await r.json();
                    if (d.ok) {
                        const wasCur = (!externalLabel && idx === trackIdx);
                        await reloadTracks(false);
                        if (wasCur) {
                            if (playlist.length > 0) window.startJukeboxPlayback(true);
                            else setMasterMusicTrack('', true, false);
                        }
                    }
                };
                row.appendChild(del);
            }
            listEl.appendChild(row);
        });
    }

    function updateUiState() {
        const btn = document.getElementById('jb-play-btn');
        const titleEl = document.getElementById('jb-title');
        const isPlaying = Boolean(typeof currentBgmAudio !== 'undefined' && currentBgmAudio && !currentBgmAudio.paused);
        if (btn) btn.innerHTML = isPlaying ? IC_PAUSE : IC_PLAY;
        if (titleEl) {
            if (externalLabel) titleEl.textContent = externalLabel;
            else if (playlist.length > 0) titleEl.textContent = (playlist.at(trackIdx) || playlist.at(0)).title;
            else titleEl.textContent = 'Нет музыки (+ трек)';
        }
        renderDrawerList();
    }
    window.onMasterMusicStateChange = updateUiState;
    window.hasJukeboxTracks = () => playlist.length > 0;
    window.setJukeboxExternalLabel = (lbl) => { externalLabel = lbl || ''; updateUiState(); };

    function pickNextIndex(step) {
        if (playlist.length <= 1) return 0;
        if (jbShuffle && step > 0) {
            let next = trackIdx;
            for (let k = 0; k < 6 && next === trackIdx; k++) next = Math.floor(Math.random() * playlist.length);
            return next;
        }
        return (trackIdx + step + playlist.length) % playlist.length;
    }

    window.startJukeboxPlayback = function(forcePlay) {
        if (playlist.length === 0) { updateUiState(); return; }
        externalLabel = '';
        if (trackIdx >= playlist.length) trackIdx = 0;
        const tr = playlist.at(trackIdx);
        if (forcePlay) userPausedMusic = false;
        const aud = setMasterMusicTrack(tr.url, playlist.length === 1, false);
        if (aud) {
            aud.onended = () => {
                if (playlist.length > 1 && !externalLabel) {
                    trackIdx = pickNextIndex(1);
                    window.startJukeboxPlayback(false);
                }
            };
        }
        updateUiState();
    };

    function togglePlayPause() {
        if (playlist.length === 0 && (!currentBgmAudio || !currentBgmUrl)) { addTrackViaDialog(); return; }
        if (currentBgmAudio && !currentBgmAudio.paused) {
            userPausedMusic = true;
            currentBgmAudio.pause();
        } else {
            userPausedMusic = false;
            pausedForRunningGame = false;
            if (currentBgmAudio && currentBgmUrl) {
                ensureMasterAudioGraph();
                currentBgmAudio.volume = getMasterBgmVol();
                currentBgmAudio.play().catch(() => {});
            } else if (playlist.length > 0) {
                jukeboxOverrideActive = true;
                window.startJukeboxPlayback(true);
            }
        }
        updateUiState();
    }

    function stepTrack(dir) {
        if (playlist.length === 0) { addTrackViaDialog(); return; }
        jukeboxOverrideActive = true;
        externalLabel = '';
        userPausedMusic = false;
        trackIdx = pickNextIndex(dir);
        window.startJukeboxPlayback(true);
    }

    async function addTrackViaDialog() {
        const res = await fetch('/api/jukebox/add_track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        const data = await res.json();
        if (data.ok) {
            if (typeof showToast === 'function') showToast('Трек добавлен в плейлист!');
            await reloadTracks(false);
            trackIdx = Math.max(0, playlist.length - 1);
            jukeboxOverrideActive = true;
            window.startJukeboxPlayback(true);
        }
    }

    async function reloadTracks(initialBoot) {
        try {
            const res = await fetch('/api/jukebox/list');
            const data = await res.json();
            playlist = (data.tracks || new Array()).filter(t => !t.url.includes('src=root'));
        } catch (_) { playlist = new Array(); }
        if (trackIdx >= playlist.length) trackIdx = 0;
        if (initialBoot && playlist.length > 0) {
            const activeGame = availableGames.at(selectedIndex);
            const hasSpec = activeGame && soundsMap && soundsMap[activeGame.id + '_bgm'];
            if (!hasSpec) { jukeboxOverrideActive = true; window.startJukeboxPlayback(false); }
        }
        updateUiState();
    }

    function buildWidget() {
        if (document.getElementById('sgl-jukebox')) return;
        const st = mk('style', '', '');
        st.textContent = [
            '#sgl-jukebox{position:fixed;top:58px;right:18px;z-index:52;display:flex;align-items:center;gap:4px;background:rgba(12,18,32,0.86);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.16);border-radius:24px;padding:4px 9px;box-shadow:0 8px 24px rgba(0,0,0,0.5);max-width:330px;}',
            '#sgl-jukebox.collapsed{padding:5px 8px;gap:0;}',
            '#sgl-jukebox.collapsed .jb-full-part{display:none !important;}',
            '.jb-btn{background:transparent;border:none;color:#fff;cursor:pointer;padding:4px;display:flex;align-items:center;justify-content:center;opacity:0.82;transition:0.15s;border-radius:50%;font-size:13px;line-height:1;}',
            '.jb-btn:hover{opacity:1;color:#FFD700;background:rgba(255,255,255,0.1);}',
            '.jb-btn.active-shuf{color:#4ADE80;opacity:1;background:rgba(74,222,128,0.14);}',
            '#jb-title{font-size:11px;font-weight:700;color:rgba(255,255,255,0.92);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:135px;cursor:pointer;padding:0 3px;}',
            '#jb-title:hover{color:#FFD700;}',
            '#sgl-jb-drawer{position:fixed;top:96px;right:18px;width:310px;z-index:920;display:none;flex-direction:column;gap:8px;background:rgba(13,19,33,0.96);backdrop-filter:blur(14px);border:1px solid rgba(255,215,0,0.32);border-radius:14px;padding:11px;box-shadow:0 16px 40px rgba(0,0,0,0.8);color:#fff;}',
            '#sgl-jb-drawer.open{display:flex;}',
            '.jb-seek-row{display:flex;align-items:center;gap:7px;font-size:10px;opacity:0.88;}',
            '#jb-seek-range{flex:1;accent-color:#FFD700;cursor:pointer;height:4px;}',
            '#jb-drawer-list{max-height:190px;overflow-y:auto;display:flex;flex-direction:column;gap:3px;padding-right:2px;}',
            '.jb-track-row{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:8px;cursor:pointer;background:rgba(255,255,255,0.03);transition:0.15s;}',
            '.jb-track-row:hover{background:rgba(255,255,255,0.1);}',
            '.jb-track-row.active{background:rgba(255,215,0,0.16);color:#FFD700;}',
            '.jb-del-btn{background:transparent;border:none;color:rgba(255,255,255,0.45);cursor:pointer;font-size:14px;padding:0 4px;border-radius:4px;}',
            '.jb-del-btn:hover{color:#f87171;background:rgba(239,68,68,0.15);}',
            'body.sgl-light-ui #sgl-jb-drawer{background:rgba(255,255,255,0.95);color:#0F172A;border:2px solid #0F172A;}',
            'body.sgl-light-ui .jb-track-row{color:#0F172A;background:rgba(15,23,42,0.05);}',
            'body.sgl-light-ui .jb-track-row.active{background:#FEF08A;color:#0F172A;}'
        ].join('\n');
        document.head.appendChild(st);

        const bar = mk('div', '', '');
        bar.id = 'sgl-jukebox';
        bar.dataset.hudId = 'jukebox';

        const toggleDrawer = () => { drawerOpen = !drawerOpen; applyVisibility(); renderDrawerList(); };

        const noteBtn = mk('button', 'jb-btn', 'color:#FFD700;', '');
        noteBtn.type = 'button'; noteBtn.title = 'Развернуть / Свернуть плеер'; noteBtn.innerHTML = IC_NOTE;
        noteBtn.onclick = () => { jbCollapsed = !jbCollapsed; localStorage.setItem('sgl_jb_collapsed', jbCollapsed ? '1' : '0'); applyVisibility(); };

        const titleEl = mk('span', 'jb-full-part', '', 'Нет музыки (+ трек)');
        titleEl.id = 'jb-title'; titleEl.title = 'Открыть плейлист и перемотку'; titleEl.onclick = toggleDrawer;

        const prevBtn = mk('button', 'jb-btn jb-full-part', '', '');
        prevBtn.type = 'button'; prevBtn.title = 'Предыдущий трек'; prevBtn.innerHTML = IC_PREV; prevBtn.onclick = () => stepTrack(-1);

        const playBtn = mk('button', 'jb-btn jb-full-part', '', '');
        playBtn.type = 'button'; playBtn.id = 'jb-play-btn'; playBtn.title = 'Пауза / Воспроизвести'; playBtn.innerHTML = IC_PLAY; playBtn.onclick = togglePlayPause;

        const nextBtn = mk('button', 'jb-btn jb-full-part', '', '');
        nextBtn.type = 'button'; nextBtn.title = 'Следующий трек'; nextBtn.innerHTML = IC_NEXT; nextBtn.onclick = () => stepTrack(1);

        const listBtn = mk('button', 'jb-btn jb-full-part', '', '');
        listBtn.type = 'button'; listBtn.title = 'Список треков и перемотка'; listBtn.innerHTML = IC_LIST; listBtn.onclick = toggleDrawer;

        const hideBtn = mk('button', 'jb-btn jb-full-part', '', '×');
        hideBtn.type = 'button'; hideBtn.title = 'Свернуть плеер';
        hideBtn.onclick = () => { jbCollapsed = true; localStorage.setItem('sgl_jb_collapsed', '1'); applyVisibility(); };

        bar.append(noteBtn, titleEl, prevBtn, playBtn, nextBtn, listBtn, hideBtn);
        document.body.appendChild(bar);

        const drw = mk('div', '', '');
        drw.id = 'sgl-jb-drawer';
        const hdr = mk('div', '', 'display:flex;justify-content:space-between;align-items:center;gap:6px;');
        hdr.appendChild(mk('span', '', 'font-size:11.5px;font-weight:800;color:#FFD700;', 'Плейлист (OST Jukebox)'));

        const hdrBtns = mk('div', '', 'display:flex;align-items:center;gap:4px;');
        const shufBtn = mk('button', 'jb-btn' + (jbShuffle ? ' active-shuf' : ''), 'padding:4px 6px;', '');
        shufBtn.type = 'button'; shufBtn.id = 'jb-shuf-btn'; shufBtn.title = 'Случайный порядок (Shuffle)'; shufBtn.innerHTML = IC_SHUF;
        shufBtn.onclick = () => {
            jbShuffle = !jbShuffle;
            localStorage.setItem('sgl_jb_shuffle', jbShuffle ? '1' : '0');
            shufBtn.classList.toggle('active-shuf', jbShuffle);
            if (typeof showToast === 'function') showToast(jbShuffle ? 'Случайный порядок треков включён' : 'Случайный порядок выключен');
        };
        const addBtn = mk('button', 'btn-small btn-accent', 'padding:3px 8px;font-size:11px;', '+ Трек');
        addBtn.type = 'button'; addBtn.onclick = addTrackViaDialog;
        const dirBtn = mk('button', 'jb-btn', 'padding:4px 6px;', '');
        dirBtn.type = 'button'; dirBtn.title = 'Открыть папку музыки (sounds/music)'; dirBtn.innerHTML = IC_DIR;
        dirBtn.onclick = () => fetch('/api/jukebox/open_dir');
        hdrBtns.append(shufBtn, addBtn, dirBtn);
        hdr.appendChild(hdrBtns);

        const seekRow = mk('div', 'jb-seek-row', '');
        const tCur = mk('span', '', 'min-width:30px;', '0:00');
        const seekInp = document.createElement('input');
        seekInp.type = 'range'; seekInp.id = 'jb-seek-range'; seekInp.min = '0'; seekInp.max = '1000'; seekInp.value = '0';
        const tDur = mk('span', '', 'min-width:30px;text-align:right;', '0:00');

        seekInp.onpointerdown = () => { isSeeking = true; };
        seekInp.oninput = () => {
            if (currentBgmAudio && isFinite(currentBgmAudio.duration) && currentBgmAudio.duration > 0) {
                tCur.textContent = fmtTime((Number(seekInp.value) / 1000) * currentBgmAudio.duration);
            }
        };
        const commitSeek = () => {
            if (!isSeeking) return;
            isSeeking = false;
            if (currentBgmAudio && isFinite(currentBgmAudio.duration) && currentBgmAudio.duration > 0) {
                currentBgmAudio.currentTime = (Number(seekInp.value) / 1000) * currentBgmAudio.duration;
            }
        };
        seekInp.onchange = commitSeek;
        seekInp.onpointerup = commitSeek;
        seekRow.append(tCur, seekInp, tDur);

        const listBox = mk('div', '', '');
        listBox.id = 'jb-drawer-list';
        drw.append(hdr, seekRow, listBox);
        document.body.appendChild(drw);

        window.addEventListener('pointerdown', (ev) => {
            if (drawerOpen && !drw.contains(ev.target) && !bar.contains(ev.target) && !ev.target.closest('#sgl-dlg-bg')) {
                drawerOpen = false;
                applyVisibility();
            }
        });
        window.addEventListener('resize', positionDrawer);

        setInterval(() => {
            if (!drawerOpen || isSeeking || document.hidden) return;
            const aud = (typeof currentBgmAudio !== 'undefined') ? currentBgmAudio : null;
            if (aud && isFinite(aud.duration) && aud.duration > 0) {
                tCur.textContent = fmtTime(aud.currentTime);
                tDur.textContent = fmtTime(aud.duration);
                seekInp.value = String(Math.round((aud.currentTime / aud.duration) * 1000));
            } else {
                tCur.textContent = '0:00'; tDur.textContent = '0:00'; seekInp.value = '0';
            }
        }, 350);

        applyVisibility();
    }

    window.addEventListener('DOMContentLoaded', () => {
        buildWidget();
        setTimeout(() => reloadTracks(true), 650);
    });
})();
