/* === OST JUKEBOX (UNIFIED WITH MASTER AUDIO & EQUALIZER) === */
(function() {
    let playlist = new Array();
    let trackIdx = 0;
    let externalLabel = '';
    let jbCollapsed = (localStorage.getItem('sgl_jb_collapsed') === '1');

    function mkSvg(vb, inner) {
        return '<svg class="btn-svg-icon" viewBox="' + vb + '">' + inner + '</svg>';
    }

    const IC_PLAY = mkSvg('0 0 24 24', '<polygon points="5 3 19 12 5 21 5 3"/>');
    const IC_PAUSE = mkSvg('0 0 24 24', '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>');
    const IC_NEXT = mkSvg('0 0 24 24', '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>');
    const IC_NOTE = mkSvg('0 0 24 24', '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>');
    const IC_DIR = mkSvg('0 0 24 24', '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>');

    function applyVisibility() {
        const bar = document.getElementById('sgl-jukebox');
        if (!bar) return;
        const hiddenInSettings = (typeof currentDesign !== 'undefined' && currentDesign && currentDesign.showJukebox === false);
        const hiddenInHud = Boolean(currentDesign?.customLayout?.jukebox?.hidden);
        bar.style.display = (hiddenInSettings || hiddenInHud) ? 'none' : 'flex';
        bar.classList.toggle('collapsed', jbCollapsed);
    }
    window.syncJukeboxVisibility = applyVisibility;
    window.syncJukeboxVolume = function() {};

    function updateUiState() {
        const btn = document.getElementById('jb-play-btn');
        const titleEl = document.getElementById('jb-title');
        const isPlaying = Boolean(typeof currentBgmAudio !== 'undefined' && currentBgmAudio && !currentBgmAudio.paused);
        if (btn) btn.innerHTML = isPlaying ? IC_PAUSE : IC_PLAY;
        if (titleEl) {
            if (externalLabel) {
                titleEl.textContent = externalLabel;
            } else if (playlist.length > 0) {
                const tr = playlist.at(trackIdx) || playlist.at(0);
                titleEl.textContent = tr.title;
            } else {
                titleEl.textContent = 'Нет музыки (+ трек)';
            }
        }
    }
    window.onMasterMusicStateChange = updateUiState;

    window.hasJukeboxTracks = function() {
        return playlist.length > 0;
    };

    window.setJukeboxExternalLabel = function(lbl) {
        externalLabel = lbl || '';
        updateUiState();
    };

    window.startJukeboxPlayback = function(forcePlay) {
        if (playlist.length === 0) {
            updateUiState();
            return;
        }
        externalLabel = '';
        if (trackIdx >= playlist.length) trackIdx = 0;
        const tr = playlist.at(trackIdx);
        if (forcePlay) userPausedMusic = false;
        const aud = setMasterMusicTrack(tr.url, playlist.length === 1, false);
        if (aud) {
            aud.onended = () => {
                if (playlist.length > 1 && !externalLabel) {
                    trackIdx = (trackIdx + 1) % playlist.length;
                    window.startJukeboxPlayback(false);
                }
            };
        }
        updateUiState();
    };

    function togglePlayPause() {
        if (playlist.length === 0 && (!currentBgmAudio || !currentBgmUrl)) {
            addTrackViaDialog();
            return;
        }
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

    function nextTrack() {
        if (playlist.length === 0) {
            addTrackViaDialog();
            return;
        }
        jukeboxOverrideActive = true;
        externalLabel = '';
        userPausedMusic = false;
        trackIdx = (trackIdx + 1) % playlist.length;
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
            // Фильтруем только пользовательские треки из sounds/music, чтобы не дублировать слоты soundsMap
            playlist = (data.tracks || new Array()).filter(t => !t.url.includes('src=root'));
        } catch (_) {
            playlist = new Array();
        }
        if (initialBoot && playlist.length > 0) {
            const activeGame = availableGames.at(selectedIndex);
            const hasGameSpecific = activeGame && soundsMap && soundsMap[activeGame.id + '_bgm'];
            if (!hasGameSpecific) {
                jukeboxOverrideActive = true;
                window.startJukeboxPlayback(false);
            }
        }
        updateUiState();
    }

    function buildWidget() {
        if (document.getElementById('sgl-jukebox')) return;
        const st = document.createElement('style');
        st.textContent = '#sgl-jukebox{position:fixed;top:58px;right:18px;z-index:52;display:flex;align-items:center;gap:5px;background:rgba(12,18,32,0.84);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.16);border-radius:24px;padding:4px 9px;box-shadow:0 8px 24px rgba(0,0,0,0.5);max-width:290px;}'
            + '#sgl-jukebox.collapsed{padding:5px 8px;gap:0;}'
            + '#sgl-jukebox.collapsed .jb-full-part{display:none !important;}'
            + '.jb-btn{background:transparent;border:none;color:#fff;cursor:pointer;padding:4px;display:flex;align-items:center;justify-content:center;opacity:0.82;transition:0.15s;border-radius:50%;font-size:13px;line-height:1;}'
            + '.jb-btn:hover{opacity:1;color:#FFD700;background:rgba(255,255,255,0.1);}'
            + '#jb-title{font-size:11px;font-weight:700;color:rgba(255,255,255,0.92);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px;cursor:pointer;padding:0 3px;}'
            + '#jb-title:hover{color:#FFD700;}';
        document.head.appendChild(st);

        const bar = document.createElement('div');
        bar.id = 'sgl-jukebox';
        bar.dataset.hudId = 'jukebox';

        const noteBtn = document.createElement('button');
        noteBtn.type = 'button';
        noteBtn.className = 'jb-btn';
        noteBtn.style.color = '#FFD700';
        noteBtn.title = 'Развернуть / Свернуть плеер';
        noteBtn.innerHTML = IC_NOTE;
        noteBtn.onclick = () => {
            jbCollapsed = !jbCollapsed;
            localStorage.setItem('sgl_jb_collapsed', jbCollapsed ? '1' : '0');
            applyVisibility();
        };

        const titleEl = document.createElement('span');
        titleEl.id = 'jb-title';
        titleEl.className = 'jb-full-part';
        titleEl.title = 'Нажмите, чтобы добавить трек (.mp3 / .ogg / .wav)';
        titleEl.textContent = 'Нет музыки (+ трек)';
        titleEl.onclick = addTrackViaDialog;

        const playBtn = document.createElement('button');
        playBtn.type = 'button';
        playBtn.id = 'jb-play-btn';
        playBtn.className = 'jb-btn jb-full-part';
        playBtn.title = 'Пауза / Воспроизвести';
        playBtn.innerHTML = IC_PLAY;
        playBtn.onclick = togglePlayPause;

        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'jb-btn jb-full-part';
        nextBtn.title = 'Следующий трек';
        nextBtn.innerHTML = IC_NEXT;
        nextBtn.onclick = nextTrack;

        const dirBtn = document.createElement('button');
        dirBtn.type = 'button';
        dirBtn.className = 'jb-btn jb-full-part';
        dirBtn.title = 'Открыть папку музыки (sounds/music)';
        dirBtn.innerHTML = IC_DIR;
        dirBtn.onclick = () => fetch('/api/jukebox/open_dir');

        const hideBtn = document.createElement('button');
        hideBtn.type = 'button';
        hideBtn.className = 'jb-btn jb-full-part';
        hideBtn.title = 'Свернуть плеер';
        hideBtn.textContent = '×';
        hideBtn.onclick = () => {
            jbCollapsed = true;
            localStorage.setItem('sgl_jb_collapsed', '1');
            applyVisibility();
        };

        bar.append(noteBtn, titleEl, playBtn, nextBtn, dirBtn, hideBtn);
        document.body.appendChild(bar);
        applyVisibility();
    }

    window.addEventListener('DOMContentLoaded', () => {
        buildWidget();
        setTimeout(() => reloadTracks(true), 650);
    });
})();
