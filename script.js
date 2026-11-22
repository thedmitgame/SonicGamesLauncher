
function onSelectPresetLayout(val) {
    if (!currentDesign) return;
    currentDesign.screenLayout = val;

    // Обновлённые пресеты с красивой расстановкой всех элементов (включая язык, рулетку и атмосферу)
    const presets = {
        classic: {},
        console_left: {
            lang:  { x: 92, y: 4.5, scale: 0.95, anchor: 'center' },
            m5bar: { x: 64, y: 4.5, scale: 0.95, anchor: 'center' },
            m4btn: { x: 81, y: 4.5, scale: 0.95, anchor: 'center' }
        },
        arcade_bottom: {
            lang:  { x: 7,  y: 4.5, scale: 0.95, anchor: 'center' },
            m5bar: { x: 68, y: 4.5, scale: 0.95, anchor: 'center' },
            m4btn: { x: 89, y: 4.5, scale: 0.95, anchor: 'center' }
        },
        top_bar: {
            lang:  { x: 7,  y: 94,  scale: 0.95, anchor: 'center' },
            m5bar: { x: 50, y: 94,  scale: 0.95, anchor: 'center' },
            m4btn: { x: 86, y: 94,  scale: 0.95, anchor: 'center' }
        },
        showcase_pro: {
            header: { x: 22, y: 8, scale: 0.9, anchor: 'center' },
            lang:   { x: 92, y: 93, scale: 0.95, anchor: 'center' },
            m5bar:  { x: 66, y: 6,  scale: 0.92, anchor: 'center' },
            m4btn:  { x: 91, y: 6,  scale: 0.92, anchor: 'center' }
        }
    };
    if (val === 'showcase_pro') currentDesign.carouselMode = 'showcase';

    currentDesign.customLayout = JSON.parse(JSON.stringify(presets[val] || {}));
    applyDesign(currentDesign);
}

let gamesData = [];
let availableGames = [];
let selectedIndex = 0;
let floatingObjects = [];
let soundsMap = {};
let smmPath = "";
let currentDesign = null;
let defaultDesign = null;

let currentBgmAudio = null;
let currentBgmUrl = "";
let bgmFadeInterval = null;
let gamepadCooldown = 0;
let shaderAnimId = null;

const THEME_LABELS = {
    default: "Общий фон (по умолчанию)",
    sonic1: "Sonic 1 Forever",
    sonic2: "Sonic 2 Absolute",
    soniccd: "Sonic CD Restored",
    sonic3: "Sonic 3 A.I.R.",
    origins: "Sonic Origins",
    mania: "Sonic Mania",
    srb2: "Sonic Robo Blast 2"
};

const SOUND_SLOTS = [
    { key: "startup", label: "Запуск лаунчера" },
    { key: "switch", label: "Переключение игр" },
    { key: "launch", label: "Запуск игры" },
    { key: "screenshot", label: "Звук скриншота" },
    { key: "open_menu", label: "Открытие меню" },
    { key: "close_menu", label: "Закрытие меню" },
    { key: "exit", label: "Выход из лаунчера" },
    { key: "default_bgm", label: "Музыка: Общий фон" },
    { key: "sonic1_bgm", label: "Музыка: Sonic 1" },
    { key: "sonic2_bgm", label: "Музыка: Sonic 2" },
    { key: "soniccd_bgm", label: "Музыка: Sonic CD" },
    { key: "sonic3_bgm", label: "Музыка: Sonic 3 A.I.R." },
    { key: "origins_bgm", label: "Музыка: Sonic Origins" },
    { key: "mania_bgm", label: "Музыка: Sonic Mania" },
    { key: "srb2_bgm", label: "Музыка: Sonic Robo Blast 2" }
];

const DEFAULT_BUTTONS_CFG = {
    settings: { label: "Игры и пути", iconMode: "svg", customIcon: "" },
    mods:     { label: "Моды", iconMode: "svg", customIcon: "" },
    tweaks:   { label: "Настройки игры", iconMode: "svg", customIcon: "" },
    shots:    { label: "Скриншоты", iconMode: "svg", customIcon: "" },
    progress: { label: "Прогресс", iconMode: "svg", customIcon: "" },
    custom:   { label: "", iconMode: "svg", customIcon: "" },
    tray:     { label: "", iconMode: "svg", customIcon: "" },
    exit:     { label: "", iconMode: "svg", customIcon: "" }
};

const SVG_ICONS_MAP = {
    settings: '<svg class="btn-svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    mods:     '<svg class="btn-svg-icon" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    tweaks:   '<svg class="btn-svg-icon" viewBox="0 0 24 24"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>',
    shots:    '<svg class="btn-svg-icon" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    progress: '<svg class="btn-svg-icon" viewBox="0 0 24 24"><polygon points="12 2 19 8 16 21 8 21 5 8 12 2"/></svg>',
    custom:   '<svg class="btn-svg-icon" viewBox="0 0 24 24"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',
    tray:     '<svg class="btn-svg-icon" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    exit:     '<svg class="btn-svg-icon" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
};

const BUTTON_DOM_MAP = {
    settings: "btn-ui-settings",
    mods: "mods-btn",
    tweaks: "tweaks-btn",
    shots: "shots-btn",
    progress: "progress-btn",
    custom: "btn-ui-custom",
    tray: "btn-ui-tray",
    exit: "btn-ui-exit"
};

const BUTTON_TITLES_RU = {
    settings: "Кнопка «Игры и пути»",
    mods: "Кнопка «Моды»",
    tweaks: "Кнопка «Настройки игры»",
    shots: "Кнопка «Скриншоты»",
    progress: "Кнопка «Прогресс»",
    custom: "Кнопка «Настройки темы»",
    tray: "Кнопка «Свернуть в трей»",
    exit: "Кнопка «Выход»",
    lang: "Переключатель языка"
};

window.addEventListener('DOMContentLoaded', async () => {
    await loadGames(true);
    window.focus();
    startShaderLoop();
    startEqLoop();
    initMouseParallax();
    
});

window.addEventListener('resize', () => {
    updateCarouselPositions();
    resizeShaderCanvas();
});

setInterval(() => {
    if (!document.hidden && document.querySelector('.modal-backdrop.active') === null) {
        refreshPlaytimeOnly();
    }
}, 5000);

document.addEventListener('visibilitychange', () => {
    const vid = document.getElementById('backdrop-video-layer');
    if (vid && vid.classList.contains('visible')) {
        if (document.hidden) vid.pause();
        else vid.play().catch(() => {});
    }
    if (!document.hidden) refreshPlaytimeOnly();
});

async function refreshPlaytimeOnly() {
    try {
        const res = await fetch('/api/playtime_ping');
        const data = await res.json();
        const ptMap = data.playtime || {};
        const runId = data.runningId || null;

        gamesData.forEach(g => {
            if (ptMap[g.id] !== undefined) g.playtime = ptMap[g.id];
            g.running = (g.id === runId);
        });
        availableGames.forEach((g, idx) => {
            if (ptMap[g.id] !== undefined) g.playtime = ptMap[g.id];
            g.running = (g.id === runId);
            const badge = document.getElementById(`pt-${idx}`);
            if (badge) {
                badge.innerText = g.running ? "● В игре" : formatPlaytime(g.playtime);
                badge.className = g.running ? "playtime-badge running" : "playtime-badge";
            }
        });

        const anyRunning = Boolean(runId);
        const vid = document.getElementById('backdrop-video-layer');
        if (anyRunning && !pausedForRunningGame) {
            pausedForRunningGame = true;
            if (currentBgmAudio && !currentBgmAudio.paused) currentBgmAudio.pause();
            if (vid && !vid.paused) vid.pause();
        } else if (!anyRunning && pausedForRunningGame) {
            pausedForRunningGame = false;
            if (!userPausedMusic && currentBgmAudio && currentBgmAudio.paused && getMasterBgmVol() > 0) {
                currentBgmAudio.play().catch(() => {});
            }
            if (vid && vid.classList.contains('visible') && !document.hidden) vid.play().catch(() => {});
        }
    } catch (e) {}
}

function playSfx(name) {
    const url = soundsMap[name];
    if (!url || !currentDesign) return;
    const vol = (currentDesign.sfxVolume ?? 70) / 100;
    if (vol <= 0) return;
    try {
        const audio = new Audio(url);
        audio.volume = vol;
        audio.play().catch(() => {});
    } catch (e) {}
}

let realAudioCtx = null;
let realAnalyser = null;
let realFreqData = null;
const connectedMediaEls = new WeakSet();
let userPausedMusic = false;
let pausedForRunningGame = false;
let jukeboxOverrideActive = false;

function ensureMasterAudioGraph() {
    if (!realAudioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        realAudioCtx = new Ctx();
        realAnalyser = realAudioCtx.createAnalyser();
        realAnalyser.fftSize = 128;
        realAnalyser.smoothingTimeConstant = 0.78;
        realFreqData = new Uint8Array(realAnalyser.frequencyBinCount);
        realAnalyser.connect(realAudioCtx.destination);
    }
    if (realAudioCtx.state === 'suspended') {
        realAudioCtx.resume().catch(() => {});
    }
}

function attachRealAnalyser(audioEl) {
    if (!audioEl || connectedMediaEls.has(audioEl)) return;
    try {
        ensureMasterAudioGraph();
        if (realAudioCtx && realAnalyser) {
            const src = realAudioCtx.createMediaElementSource(audioEl);
            src.connect(realAnalyser);
            connectedMediaEls.add(audioEl);
        }
    } catch (e) {}
}
window.attachRealAnalyser = attachRealAnalyser;

function getMasterBgmVol() {
    return Math.max(0, Math.min(1, (currentDesign?.bgmVolume ?? 40) / 100));
}

function setMasterMusicTrack(url, loopTrack = true, withFade = true) {
    const targetVol = getMasterBgmVol();
    if (!url) {
        if (currentBgmAudio) {
            currentBgmAudio.pause();
            currentBgmAudio = null;
        }
        currentBgmUrl = "";
        if (typeof window.onMasterMusicStateChange === 'function') window.onMasterMusicStateChange();
        return null;
    }

    if (url === currentBgmUrl && currentBgmAudio) {
        currentBgmAudio.loop = loopTrack;
        currentBgmAudio.volume = targetVol;
        if (!userPausedMusic && !pausedForRunningGame && targetVol > 0 && currentBgmAudio.paused) {
            ensureMasterAudioGraph();
            currentBgmAudio.play().catch(() => {});
        }
        if (typeof window.onMasterMusicStateChange === 'function') window.onMasterMusicStateChange();
        return currentBgmAudio;
    }

    currentBgmUrl = url;
    if (bgmFadeInterval) clearInterval(bgmFadeInterval);

    const oldAudio = currentBgmAudio;
    if (oldAudio) {
        oldAudio.onended = null;
        if (withFade) {
            let fadeOut = setInterval(() => {
                if (oldAudio.volume > 0.05) {
                    oldAudio.volume = Math.max(0, oldAudio.volume - 0.05);
                } else {
                    oldAudio.pause();
                    clearInterval(fadeOut);
                }
            }, 25);
        } else {
            oldAudio.pause();
        }
    }

    const newAudio = new Audio();
    newAudio.crossOrigin = "anonymous";
    newAudio.preload = "auto";
    newAudio.loop = loopTrack;
    newAudio.src = url;
    newAudio.volume = withFade ? 0 : targetVol;
    attachRealAnalyser(newAudio);
    currentBgmAudio = newAudio;

    newAudio.addEventListener('play', () => {
        ensureMasterAudioGraph();
        if (typeof window.onMasterMusicStateChange === 'function') window.onMasterMusicStateChange();
    });
    newAudio.addEventListener('pause', () => {
        if (typeof window.onMasterMusicStateChange === 'function') window.onMasterMusicStateChange();
    });

    if (!userPausedMusic && !pausedForRunningGame && targetVol > 0) {
        newAudio.play().then(() => {
            if (withFade) {
                bgmFadeInterval = setInterval(() => {
                    const maxV = getMasterBgmVol();
                    if (currentBgmAudio !== newAudio) { clearInterval(bgmFadeInterval); return; }
                    if (newAudio.volume < maxV - 0.03) {
                        newAudio.volume = Math.min(maxV, newAudio.volume + 0.03);
                    } else {
                        newAudio.volume = maxV;
                        clearInterval(bgmFadeInterval);
                    }
                }, 35);
            }
        }).catch(() => {});
    }
    return newAudio;
}
window.setMasterMusicTrack = setMasterMusicTrack;

function forceStartAudio() {
    ensureMasterAudioGraph();
    if (!userPausedMusic && !pausedForRunningGame && currentBgmAudio && currentBgmAudio.paused && getMasterBgmVol() > 0) {
        currentBgmAudio.volume = getMasterBgmVol();
        currentBgmAudio.play().catch(() => {});
    }
}
window.addEventListener('pointerdown', forceStartAudio, { passive: true });
window.addEventListener('keydown', forceStartAudio, { passive: true });

function switchBgm(themeId) {
    const specificUrl = soundsMap[`${themeId}_bgm`] || "";
    const fallbackUrl = soundsMap["default_bgm"] || "";

    if (specificUrl) {
        jukeboxOverrideActive = false;
        const g = availableGames.find(x => x.id === themeId);
        if (typeof window.setJukeboxExternalLabel === 'function') {
            window.setJukeboxExternalLabel(g ? `Тема: ${g.name}` : `Тема: ${themeId}`);
        }
        setMasterMusicTrack(specificUrl, true, true);
        return;
    }

    if (typeof window.hasJukeboxTracks === 'function' && window.hasJukeboxTracks()) {
        if (!jukeboxOverrideActive || !currentBgmAudio) {
            jukeboxOverrideActive = true;
            window.startJukeboxPlayback(false);
        }
        return;
    }

    if (fallbackUrl) {
        if (typeof window.setJukeboxExternalLabel === 'function') {
            window.setJukeboxExternalLabel('Общий фон (BGM)');
        }
        setMasterMusicTrack(fallbackUrl, true, true);
    } else {
        setMasterMusicTrack("", true, false);
    }
}


document.addEventListener('keydown', (e) => {
    if (e.key === 'F11' || e.keyCode === 122) {
        e.preventDefault();
        fetch('/api/fullscreen');
        return;
    }

    const activeTag = document.activeElement ? document.activeElement.tagName : '';
    if (activeTag === 'INPUT' || activeTag === 'SELECT') return;

    const isModalOpen = document.querySelector('.modal-backdrop.active') !== null;
    if (isModalOpen || availableGames.length === 0) return;

    if (e.key === 'ArrowRight' || e.keyCode === 39 || e.code === 'KeyD') {
        e.preventDefault();
        moveSelection(1);
    } else if (e.key === 'ArrowLeft' || e.keyCode === 37 || e.code === 'KeyA') {
        e.preventDefault();
        moveSelection(-1);
    } else if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault();
        triggerGameLaunch(availableGames.at(selectedIndex));
    }
}, true);

function resizeShaderCanvas() {
    const canvas = document.getElementById('bg-shader-canvas');
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
}

function startShaderLoop() {
    resizeShaderCanvas();
    const canvas = document.getElementById('bg-shader-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const sparks = Array.from({ length: 45 }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: 1.5 + Math.random() * 3,
        vy: 0.4 + Math.random() * 1.2,
        vx: (Math.random() - 0.5) * 0.6,
        alpha: 0.2 + Math.random() * 0.6
    }));

    const speedLines = Array.from({ length: 30 }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        len: 60 + Math.random() * 160,
        vx: 14 + Math.random() * 18
    }));

    const warpStars = Array.from({ length: 75 }, () => ({
        x: (Math.random() - 0.5) * 1600,
        y: (Math.random() - 0.5) * 1000,
        z: Math.random() * 1000 + 50
    }));

    const maniaShapes = Array.from({ length: 18 }, (_, idx) => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: 18 + Math.random() * 28,
        rot: Math.random() * 6.28,
        vRot: (Math.random() - 0.5) * 0.03,
        vx: 0.5 + Math.random() * 0.9,
        vy: -0.4 - Math.random() * 0.8,
        kind: idx % 3,
        col: (idx % 3 === 0) ? '#FACC15' : ((idx % 3 === 1) ? '#EC4899' : '#38BDF8')
    }));

    const cyberCols = Array.from({ length: 28 }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        h: 35 + Math.random() * 110,
        vy: 2.2 + Math.random() * 4.5,
        hue: Math.random() > 0.35 ? 'rgba(56, 189, 248, 0.22)' : 'rgba(244, 63, 94, 0.24)'
    }));

    let tick = 0;

    function renderFrame() {
        const mode = currentDesign?.shaderType || 'none';
        if (document.hidden || mode === 'none' || currentDesign?.liteMode) {
            if (mode === 'none' || currentDesign?.liteMode) ctx.clearRect(0, 0, canvas.width, canvas.height);
            setTimeout(() => { shaderAnimId = requestAnimationFrame(renderFrame); }, 250);
            return;
        }
        tick += 1;
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        if (mode === 'synthwave') {
            const horizon = h * 0.56;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
            ctx.lineWidth = 1;
            const vLines = 18;
            for (let i = -vLines; i <= vLines; i++) {
                const topX = w * 0.5 + i * 28;
                const botX = w * 0.5 + i * 130;
                ctx.beginPath();
                ctx.moveTo(topX, horizon);
                ctx.lineTo(botX, h);
                ctx.stroke();
            }
            const offset = (tick * 1.4) % 40;
            for (let y = horizon; y < h; y += 22) {
                const progress = (y - horizon) / (h - horizon);
                const drawY = y + offset * progress;
                if (drawY <= h) {
                    ctx.beginPath();
                    ctx.moveTo(0, drawY);
                    ctx.lineTo(w, drawY);
                    ctx.stroke();
                }
            }
        } else if (mode === 'speedlines') {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.lineWidth = 2;
            speedLines.forEach(line => {
                line.x -= line.vx;
                if (line.x + line.len < 0) {
                    line.x = w + 50;
                    line.y = Math.random() * h;
                }
                ctx.beginPath();
                ctx.moveTo(line.x, line.y);
                ctx.lineTo(line.x + line.len, line.y);
                ctx.stroke();
            });
        } else if (mode === 'checker') {
            const size = 48;
            const shift = (tick * 0.6) % (size * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            for (let x = -size * 2; x < w + size * 2; x += size) {
                for (let y = -size * 2; y < h + size * 2; y += size) {
                    const col = Math.floor(x / size);
                    const row = Math.floor(y / size);
                    if ((col + row) % 2 === 0) {
                        ctx.fillRect(x + shift, y + shift * 0.5, size, size);
                    }
                }
            }
        } else if (mode === 'sparks') {
            sparks.forEach(sp => {
                sp.y -= sp.vy;
                sp.x += sp.vx;
                if (sp.y < -10) {
                    sp.y = h + 10;
                    sp.x = Math.random() * w;
                }
                ctx.fillStyle = `rgba(255, 215, 0, ${sp.alpha})`;
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
                ctx.fill();
            });
        } else if (mode === 'starfield') {
            const cx = w * 0.5;
            const cy = h * 0.5;
            warpStars.forEach(st => {
                st.z -= 8.5;
                if (st.z <= 15) {
                    st.x = (Math.random() - 0.5) * 1600;
                    st.y = (Math.random() - 0.5) * 1000;
                    st.z = 1000;
                }
                const k = 260 / st.z;
                const sx = cx + st.x * k;
                const sy = cy + st.y * k;
                if (sx >= 0 && sx <= w && sy >= 0 && sy <= h) {
                    const r = Math.max(0.8, (1 - st.z / 1000) * 3.8);
                    const al = (1 - st.z / 1000).toFixed(2);
                    ctx.fillStyle = 'rgba(255, 245, 200, ' + al + ')';
                    ctx.beginPath();
                    ctx.arc(sx, sy, r, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        } else if (mode === 'mania_geo') {
            maniaShapes.forEach(sh => {
                sh.x += sh.vx;
                sh.y += sh.vy;
                sh.rot += sh.vRot;
                if (sh.x > w + 60) sh.x = -50;
                if (sh.y < -60) sh.y = h + 50;
                ctx.save();
                ctx.translate(sh.x, sh.y);
                ctx.rotate(sh.rot);
                ctx.globalAlpha = 0.24;
                ctx.strokeStyle = sh.col;
                ctx.lineWidth = 3;
                const s = sh.size;
                if (sh.kind === 0) {
                    ctx.beginPath();
                    ctx.moveTo(0, -s * 0.6);
                    ctx.lineTo(s * 0.55, s * 0.5);
                    ctx.lineTo(-s * 0.55, s * 0.5);
                    ctx.closePath();
                    ctx.stroke();
                } else if (sh.kind === 1) {
                    ctx.beginPath();
                    ctx.arc(0, 0, s * 0.48, 0, Math.PI * 2);
                    ctx.stroke();
                } else {
                    ctx.strokeRect(-s * 0.42, -s * 0.42, s * 0.84, s * 0.84);
                }
                ctx.restore();
            });
        } else if (mode === 'cyber_glitch') {
            cyberCols.forEach(c => {
                c.y -= c.vy;
                if (c.y + c.h < 0) {
                    c.y = h + 40;
                    c.x = Math.random() * w;
                }
                ctx.fillStyle = c.hue;
                ctx.fillRect(c.x, c.y, 2.5, c.h);
            });
            if (tick % 38 < 3) {
                const gy = Math.random() * h;
                ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
                ctx.fillRect(0, gy, w, 4 + Math.random() * 10);
            }
        }

                shaderAnimId = requestAnimationFrame(renderFrame);
    }

    renderFrame();
}

function startEqLoop() {
    const canvas = document.getElementById('audio-eq-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function drawEq() {
        const enabled = (currentDesign?.enableEq ?? true) && !currentDesign?.liteMode;
        const isPlaying = currentBgmAudio && !currentBgmAudio.paused && currentBgmAudio.volume > 0;
        if (document.hidden || !enabled || !isPlaying) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setTimeout(() => requestAnimationFrame(drawEq), 200);
            return;
        }

        if (canvas.width !== window.innerWidth) canvas.width = window.innerWidth;
        if (canvas.height !== 85) canvas.height = 85;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const activeGame = availableGames.at(selectedIndex);
        ctx.fillStyle = activeGame ? activeGame.color : '#FFD700';

        const bars = 48;
        const barWidth = (canvas.width / bars) * 0.65;
        const gap = canvas.width / bars;

        if (realAnalyser && realFreqData) {
            realAnalyser.getByteFrequencyData(realFreqData);
        }

        for (let i = 0; i < bars; i++) {
            const binIndex = Math.floor((i / bars) * 44);
            const rawVal = realFreqData ? (realFreqData[binIndex] || 0) : 0;
            const barH = Math.max(2, Math.pow(rawVal / 255, 1.35) * 78);
            const x = i * gap + (gap - barWidth) / 2;
            ctx.fillRect(x, canvas.height - barH, barWidth, barH);
        }

        requestAnimationFrame(drawEq);
    }

    drawEq();
}

function initMouseParallax() {
    const styleFix = document.createElement('style');
    styleFix.textContent = `#character-stage { overflow: visible !important; will-change: transform; }`;
    document.head.appendChild(styleFix);

    window.addEventListener('mousemove', (e) => {
        const enabled = (currentDesign?.enableParallax ?? true) && !currentDesign?.liteMode;
        const stage = document.getElementById('character-stage');
        if (!stage) return;
        if (!enabled) {
            stage.style.transform = 'none';
            return;
        }
        const normX = (e.clientX / window.innerWidth - 0.5) * -22;
        const normY = (e.clientY / window.innerHeight - 0.5) * -14;
        stage.style.transform = `translate3d(${normX.toFixed(1)}px, ${normY.toFixed(1)}px, 0) scale(1.06)`;
    }, { passive: true });
}

async function loadGames(isStartup = false) {
    try {
        const res = await fetch('/api/games');
        const data = await res.json();
        gamesData = data.games;
        window._cachedEmulators = data.emulators || [];
        smmPath = data.smmPath || "";
        floatingObjects = data.objects;
        soundsMap = data.sounds || {};
        currentDesign = data.design;
        if (!currentDesign.characters) currentDesign.characters = {};
        defaultDesign = data.defaultDesign;

        const mainLogoImg = document.getElementById('main-logo-img');
        const mainTitleText = document.getElementById('main-title-text');
        if (data.mainLogo) {
            mainLogoImg.src = data.mainLogo;
            mainLogoImg.style.display = 'block';
            mainTitleText.style.display = 'none';
        } else {
            mainLogoImg.style.display = 'none';
            mainTitleText.style.display = 'block';
        }

        applyDesign(currentDesign);
        renderMainScreen();
        renderFloatingObjects();

        if (isStartup) {
            setTimeout(() => {
                const curtain = document.getElementById('intro-curtain');
                if (curtain) curtain.classList.add('fade-out');
                document.body.classList.add('app-ready');
                playSfx('startup');
            }, 400);
        } else {
            const curtain = document.getElementById('intro-curtain');
            if (curtain) curtain.classList.add('fade-out');
            document.body.classList.add('app-ready');
        }
    } catch (e) {
        console.error("Ошибка загрузки:", e);
    }
}

function applyDesign(design) {
    if (!design) return;
    document.documentElement.style.setProperty('--card-w', `${design.cardWidth}px`);
    document.documentElement.style.setProperty('--card-radius', `${design.cardRadius ?? 14}px`);
    document.documentElement.style.setProperty('--logo-h', `${design.logoHeight ?? 75}px`);
    document.documentElement.style.setProperty('--font-scale', (design.fontScale ?? 100) / 100);
    document.documentElement.style.setProperty('--text-color', design.textColor || '#ffffff');
    document.documentElement.style.setProperty('--title-color', design.titleColor || '#FFD700');
    document.documentElement.style.setProperty('--bg-opacity', (design.backdropOpacity ?? 55) / 100);
    document.documentElement.style.setProperty('--bg-blur', `${design.backdropBlur ?? 4}px`);
    document.documentElement.style.setProperty('--obj-opacity', design.objOpacity / 100);
    document.documentElement.style.setProperty('--panel-alpha', (design.panelAlpha ?? 45) / 100);
    document.documentElement.style.setProperty('--carousel-y', `${design.carouselY ?? 0}px`);
    document.documentElement.style.setProperty('--btn-scale', (design.btnScale ?? 100) / 100);

    document.body.classList.remove('style-glass', 'style-neon', 'style-retro', 'style-sega', 'style-console');
    document.body.classList.add(`style-${design.cardStyle || 'sega'}`);
    document.body.classList.toggle('lite-mode', Boolean(design.liteMode));

    document.body.classList.remove('layout-classic', 'layout-console_left', 'layout-arcade_bottom', 'layout-top_bar', 'layout-showcase_pro');
    document.body.classList.add(`layout-${design.screenLayout || 'classic'}`);

    const headerEl = document.querySelector('header');
    if (headerEl) {
        headerEl.classList.remove('pos-center', 'pos-left', 'pos-hidden');
        headerEl.classList.add(`pos-${design.headerPos || 'center'}`);
    }

    const shotKeyLabel = (design.screenshotKey || 'F6').toUpperCase();
    const subHint = document.getElementById('sub-hint');
    if (subHint) {
        subHint.innerText = `← → ВЫБОР • ENTER ЗАПУСК • ${shotKeyLabel} СКРИНШОТ • F11 ПОЛНЫЙ ЭКРАН`;
    }

    const fontStyleTag = document.getElementById('dynamic-font-style');
    if (design.customFontUrl) {
        fontStyleTag.innerHTML = `@font-face { font-family: 'CustomSonicFont'; src: url('${design.customFontUrl}'); }`;
        document.documentElement.style.setProperty('--font-main', `'CustomSonicFont', sans-serif`);
    } else {
        fontStyleTag.innerHTML = '';
        document.documentElement.style.setProperty('--font-main', design.fontFamily || "'Segoe UI', Roboto, Arial, sans-serif");
    }

    if (currentBgmAudio) {
        const vol = getMasterBgmVol();
        currentBgmAudio.volume = vol;
        if (vol <= 0 && !currentBgmAudio.paused) {
            currentBgmAudio.pause();
        } else if (vol > 0 && currentBgmAudio.paused && !userPausedMusic && !pausedForRunningGame) {
            currentBgmAudio.play().catch(() => {});
        }
    }

    for (const [themeId, colors] of Object.entries(design.gradients)) {
        const layer = document.getElementById(`bg-${themeId}`);
        if (layer && Array.isArray(colors) && colors.length >= 2) {
            const c0 = colors.at(0);
            const c1 = colors.at(1);
            layer.style.backgroundImage = `linear-gradient(-45deg, ${c0}, ${c1}, ${c0})`;
        }
    }

    const activeGame = availableGames.at(selectedIndex);
    if (activeGame) {
        updateCharacterStage(activeGame.id);
    }
    applyButtonsAndHud();
    updateCarouselPositions();
}

function applySingleCharSlot(imgId, slotCfg, side) {
    const imgEl = document.getElementById(imgId);
    if (!imgEl) return;
    if (!slotCfg || !slotCfg.url) {
        imgEl.classList.remove('visible', 'char-anim-slide_up', 'char-anim-slide_side', 'char-anim-fade', 'char-anim-pop', 'char-anim-dash');
        imgEl.removeAttribute('data-active-url');
        imgEl.removeAttribute('src');
        return;
    }
    if (imgEl.getAttribute('src') !== slotCfg.url) {
        imgEl.src = slotCfg.url;
    }
    const heightVh = slotCfg.height ?? 65;
    const posX = slotCfg.offset ?? 2;
    const posY = slotCfg.offsetY ?? 0;
    const flip = slotCfg.flip ? -1 : 1;

    imgEl.style.height = `${heightVh}vh`;
    imgEl.style.bottom = `${posY}%`;
    if (side === 'right') {
        imgEl.style.left = 'auto';
        imgEl.style.right = `${posX}%`;
    } else {
        imgEl.style.right = 'auto';
        imgEl.style.left = `${posX}%`;
    }
    const animType = currentDesign?.charAnim || 'slide_up';
    const wasVisible = imgEl.classList.contains('visible');
    const prevUrl = imgEl.getAttribute('data-active-url') || '';

    imgEl.style.setProperty('--char-flip', flip);

    if (!wasVisible || prevUrl !== slotCfg.url) {
        imgEl.setAttribute('data-active-url', slotCfg.url);
        imgEl.classList.remove('visible', 'char-anim-slide_up', 'char-anim-slide_side', 'char-anim-fade', 'char-anim-pop', 'char-anim-dash');
        void imgEl.offsetWidth;
        if (animType !== 'none') {
            imgEl.classList.add(`char-anim-${animType}`);
            imgEl.onanimationend = () => {
                imgEl.classList.remove(`char-anim-${animType}`);
            };
        }
    }
    imgEl.style.transform = `scaleX(${flip})`;
    imgEl.classList.add('visible');
}

function updateCharacterStage(gameId) {
    if (!currentDesign) return;
    const gameChars = currentDesign.characters ? currentDesign.characters[gameId] : null;
    applySingleCharSlot('character-left-img', gameChars?.left, 'left');
    applySingleCharSlot('character-right-img', gameChars?.right, 'right');
}

function formatPlaytime(seconds) {
    if (!seconds || seconds <= 0) return "Не запускалась";
    if (seconds < 60) return `В игре: ${seconds} сек.`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `В игре: ${mins} мин.`;
    const hours = (seconds / 3600).toFixed(1);
    return `В игре: ${hours} ч.`;
}

function setBackgroundTheme(themeId, backdropUrl = null, videoUrl = null) {
    document.querySelectorAll('.bg-layer').forEach(layer => layer.classList.remove('active'));
    const target = document.getElementById(`bg-${themeId}`) || document.getElementById('bg-default');
    target.classList.add('active');

    const bgImgLayer = document.getElementById('backdrop-image-layer');
    const bgVidLayer = document.getElementById('backdrop-video-layer');

    if (videoUrl) {
        bgImgLayer.classList.remove('visible');
        if (bgVidLayer.getAttribute('data-src') !== videoUrl) {
            bgVidLayer.setAttribute('data-src', videoUrl);
            bgVidLayer.src = videoUrl;
            bgVidLayer.play().catch(() => {});
        }
        bgVidLayer.classList.add('visible');
    } else {
        bgVidLayer.classList.remove('visible');
        setTimeout(() => {
            if (!bgVidLayer.classList.contains('visible')) {
                bgVidLayer.pause();
                bgVidLayer.removeAttribute('src');
                bgVidLayer.removeAttribute('data-src');
            }
        }, 800);

        if (backdropUrl) {
            bgImgLayer.style.backgroundImage = `url('${backdropUrl}')`;
            bgImgLayer.classList.add('visible');
        } else {
            bgImgLayer.classList.remove('visible');
        }
    }
}

function renderFloatingObjects() {
    const container = document.getElementById('floating-objects');
    container.innerHTML = '';
    if (!floatingObjects || floatingObjects.length === 0 || !currentDesign) return;
    const totalCount = currentDesign.objCount !== undefined ? currentDesign.objCount : 14;
    const speedLevel = currentDesign.objSpeed !== undefined ? currentDesign.objSpeed : 5;
    if (totalCount <= 0) return;
    const baseDuration = 34 - (speedLevel * 2.6);

    for (let i = 0; i < totalCount; i++) {
        const src = floatingObjects.at(i % floatingObjects.length);
        const img = document.createElement('img');
        img.src = src;
        img.className = 'floater';
        img.style.animationName = `flyPath${i % 4}`;
        img.style.width = `${Math.floor(32 + Math.random() * 42)}px`;
        img.style.left = `${(Math.random() * 30 - 15).toFixed(1)}vw`;
        img.style.top = `${(Math.random() * 30 - 15).toFixed(1)}vh`;
        const duration = Math.max(4, baseDuration + (Math.random() * 8 - 4)).toFixed(1);
        img.style.animationDuration = `${duration}s`;
        img.style.animationDelay = `${-(Math.random() * duration).toFixed(1)}s`;
        container.appendChild(img);
    }
}

function updateCarouselPositions() {
    const cards = Array.from(document.querySelectorAll('.game-card'));
    const total = cards.length;
    if (total === 0) return;

    const mode = currentDesign?.carouselMode || 'coverflow';
    const sampleCard = cards.at(0);
    const baseW = sampleCard ? sampleCard.offsetWidth : 200;

    if (mode === 'coverflow' && total >= 3) {
        const rxScale = (currentDesign?.carouselRadiusX ?? 100) / 100;
        const radiusX = Math.min(window.innerWidth * 0.44, baseW * 1.85) * rxScale;
        const radiusY = currentDesign?.carouselRadiusY ?? 34;

        cards.forEach((card, i) => {
            let diff = i - selectedIndex;
            if (diff > total / 2) diff -= total;
            if (diff < -total / 2) diff += total;

            const angle = (diff / total) * Math.PI * 2;
            const sinA = Math.sin(angle);
            const cosA = Math.cos(angle); // 1.0 = строго спереди, -1.0 = строго сзади
            const depthNorm = (cosA + 1) / 2; // от 0 (сзади) до 1 (спереди)

            const offsetX = sinA * radiusX;
            const offsetY = (1 - cosA) * -radiusY;
            const scale = 0.56 + Math.pow(depthNorm, 1.35) * 0.52;
            const opacity = depthNorm < 0.25 ? (0.28 + depthNorm * 0.6) : (0.45 + depthNorm * 0.55);
            const zIdx = Math.round(depthNorm * 20) + 1;

            if (diff === 0) {
                card.classList.add('selected');
                card.style.filter = 'none';
            } else {
                card.classList.remove('selected');
                card.style.filter = cosA < 0.1 ? `brightness(${(0.55 + depthNorm * 0.45).toFixed(2)})` : 'none';
            }

            card.style.transform = `translate(calc(-50% + ${offsetX.toFixed(1)}px), calc(-50% + ${offsetY.toFixed(1)}px)) scale(${scale.toFixed(3)})`;
            card.style.opacity = opacity.toFixed(2);
            card.style.zIndex = `${zIdx}`;
            card.style.pointerEvents = cosA > -0.35 ? 'auto' : 'none';
        });
        return;
    }

    const spacing = mode === 'row' ? baseW * 1.15 : baseW * 0.92;
    cards.forEach((card, i) => {
        card.style.filter = 'none';
        let diff = i - selectedIndex;
        if (total >= 3) {
            if (diff > total / 2) diff -= total;
            if (diff < -total / 2) diff += total;
        }
        const absDiff = Math.abs(diff);

        if (diff === 0) {
            card.classList.add('selected');
            const yShift = mode === 'arc' ? '-54%' : '-50%';
            card.style.transform = `translate(-50%, ${yShift}) scale(1.08)`;
            card.style.opacity = '1';
            card.style.zIndex = '10';
            card.style.pointerEvents = 'auto';
        } else {
            card.classList.remove('selected');
            const scale = mode === 'row' ? 0.92 : Math.max(0.65, 0.84 - (absDiff - 1) * 0.12);
            const offsetX = diff * spacing;
            const arcY = mode === 'arc' ? Math.pow(absDiff, 1.5) * 28 : 0;
            const opacity = absDiff > 2 ? 0 : (mode === 'row' ? 0.85 : Math.max(0.35, 0.65 - (absDiff - 1) * 0.25));

            card.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${arcY}px)) scale(${scale})`;
            card.style.opacity = `${opacity}`;
            card.style.zIndex = `${10 - absDiff}`;
            card.style.pointerEvents = absDiff <= 2 ? 'auto' : 'none';
        }
    });
}


function selectGame(index, withSound = false) {
    if (availableGames.length === 0) return;

    selectedIndex = (index + availableGames.length) % availableGames.length;
    updateCarouselPositions();

    if (withSound) {
        playSfx('switch');
    }

    const activeGame = availableGames.at(selectedIndex);
    const logoImg = document.getElementById('active-logo-img');
    const modsBtn = document.getElementById('mods-btn');
    const tweaksBtn = document.getElementById('tweaks-btn');
    const shotsBtn = document.getElementById('shots-btn');

    if (activeGame) {
        setBackgroundTheme(activeGame.id, activeGame.bg, activeGame.video);
        switchBgm(activeGame.id);
        updateCharacterStage(activeGame.id);
        shotsBtn.classList.remove('hidden');
        const progBtn = document.getElementById('progress-btn');
        if (progBtn) progBtn.classList.remove('hidden');

        if (!activeGame.emuId) {
            modsBtn.classList.remove('hidden');
            tweaksBtn.classList.remove('hidden');
        } else {
            modsBtn.classList.add('hidden');
            tweaksBtn.classList.add('hidden');
        }

        if (activeGame.logo) {
            if (logoImg.getAttribute('src') !== activeGame.logo) {
                logoImg.classList.remove('visible');
                setTimeout(() => {
                    logoImg.src = activeGame.logo;
                    logoImg.classList.add('visible');
                }, 120);
            } else {
                logoImg.classList.add('visible');
            }
        } else {
            logoImg.classList.remove('visible');
        }
    }
}

function moveSelection(step) {
    if (availableGames.length <= 1) return;
    selectGame(selectedIndex + step, true);
}

function triggerGameLaunch(game) {
    if (!game) return;
    pausedForRunningGame = true;
    if (currentBgmAudio && !currentBgmAudio.paused) currentBgmAudio.pause();
    playSfx('launch');

    const flash = document.getElementById('launch-flash');
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 450);

    fetch(`/api/launch?id=${game.id}`);
}

function hideToTray() {
    playSfx('close_menu');
    fetch('/api/hide_tray');
}

function exitLauncher() {
    playSfx('exit');
    document.body.classList.remove('app-entering');
    void document.body.offsetWidth;
    document.body.classList.add('app-exiting');
    setTimeout(() => {
        fetch('/api/exit');
    }, 550);
}

function renderMainScreen() {
    const container = document.getElementById('games-container');
    const prevBtn = document.getElementById('nav-prev');
    const nextBtn = document.getElementById('nav-next');
    const logoImg = document.getElementById('active-logo-img');
    const modsBtn = document.getElementById('mods-btn');
    const tweaksBtn = document.getElementById('tweaks-btn');
    const shotsBtn = document.getElementById('shots-btn');
    container.innerHTML = '';

    availableGames = gamesData.filter(g => g.exists);

    if (availableGames.length <= 1) {
        prevBtn.classList.add('hidden');
        nextBtn.classList.add('hidden');
    } else {
        prevBtn.classList.remove('hidden');
        nextBtn.classList.remove('hidden');
    }

    if (availableGames.length === 0) {
        setBackgroundTheme('default', null, null);
        switchBgm('default');
        logoImg.classList.remove('visible');
        modsBtn.classList.add('hidden');
        tweaksBtn.classList.add('hidden');
        shotsBtn.classList.add('hidden');
        const progBtn = document.getElementById('progress-btn');
        if (progBtn) progBtn.classList.add('hidden');
        container.innerHTML = `
            <div class="empty-state">
                Пока не добавлено ни одной игры.<br>
                Нажмите <b>«Игры и пути»</b> внизу,<br>
                чтобы указать .exe файлы.<br><button class="btn-small btn-accent" style="margin-top:12px;padding:8px 16px;" onclick="runAutoScanGames()">Найти игры автоматически</button>
            </div>
        `;
        return;
    }

    if (selectedIndex >= availableGames.length) {
        selectedIndex = 0;
    }

    availableGames.forEach((game, idx) => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.style.setProperty('--accent-color', game.color);

        card.onclick = () => {
            if (selectedIndex === idx) {
                triggerGameLaunch(game);
            } else {
                selectGame(idx, true);
            }
        };

        const coverHtml = game.cover 
            ? `<img src="${game.cover}" alt="${game.name}">`
            : `<div class="cover-placeholder">${game.name}</div>`;

        const ptClass = game.running ? "playtime-badge running" : "playtime-badge";
        const ptText = game.running ? "● В игре" : formatPlaytime(game.playtime);

        card.innerHTML = `
            <div class="cover-box">
                ${coverHtml}
                <div class="play-overlay">
                    <div class="play-circle">▶</div>
                </div>
            </div>
            <div class="game-title">${game.name}</div>
            <div class="game-tag">${game.tag}</div>
            <div class="${ptClass}" id="pt-${idx}">${ptText}</div>
        `;
        container.appendChild(card);
    });

    selectGame(selectedIndex, false);
}


async function runAutoScanGames() {
    showToast("Сканируем диски и Steam...");
    const res = await fetch('/api/games/autoscan');
    const data = await res.json();
    if (data.count > 0) {
        playSfx('launch');
        showToast(`Найдено и подключено игр: ${data.count}`);
        await loadGames(false);
        if (document.getElementById('settings-modal').classList.contains('active')) {
            await openSettings();
        }
    } else {
        showToast("Новых игр в стандартных папках не найдено");
    }
}

async function openSettings() {
    playSfx('open_menu');
    if (gamesData.length === 0) await loadGames(false);

    const smmLabel = document.getElementById('smm-path-label');
    const smmBtn = document.getElementById('btn-launch-smm');
    if (smmPath) {
        smmLabel.innerText = smmPath.split(/[\\/]/).pop();
        smmLabel.classList.add('selected');
        smmBtn.classList.remove('hidden');
    } else {
        smmLabel.innerText = "Не указан";
        smmLabel.classList.remove('selected');
        smmBtn.classList.add('hidden');
    }

    const list = document.getElementById('settings-list');
    list.innerHTML = `<div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
        <button class="btn-small btn-accent" onclick="runAutoScanGames()">Автопоиск установленных игр</button>
    </div>`;

    gamesData.forEach((game, idx) => {
        const block = document.createElement('div');
        block.className = 'setting-row-block';
        const fileName = game.path ? game.path.split(/[\\/]/).pop() : 'Не выбрано';
        const statusClass = game.exists ? 'selected' : '';

        const minsVal = Math.floor((game.playtime || 0) / 60);
        block.innerHTML = `
            <div class="setting-row">
                <button class="btn-small" onclick="moveGameOrder(${idx}, -1)" title="Выше">↑</button>
                <button class="btn-small" onclick="moveGameOrder(${idx}, 1)" title="Ниже">↓</button>
                <div class="setting-name">${game.name}</div>
                <div class="setting-file ${statusClass}" id="file-${game.id}">${fileName}</div>
                <button class="btn-small" onclick="selectFile('${game.id}')">Обзор</button>
                <button class="btn-small btn-clear" onclick="clearFile('${game.id}')">×</button>
                ${game.custom ? `<button class="btn-small btn-clear" onclick="deleteCustomGame('${game.id}', '${game.name}')" title="Удалить игру">Удалить</button>` : ''}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 120px;gap:6px;margin-top:6px;">
                <input type="text" class="args-input" style="margin-top:0;" placeholder="Подпись (например: 1994 • WIDESCREEN)" 
                       value="${(game.tag || '').replace(/"/g, '&quot;')}" onchange="saveGameMeta('${game.id}', { tag: this.value })">
                <input type="text" class="args-input" style="margin-top:0;" placeholder="Аргументы запуска (-windowed)" 
                       value="${(game.args || '').replace(/"/g, '&quot;')}" onchange="saveLaunchArgs('${game.id}', this.value)">
                <input type="number" min="0" class="args-input" style="margin-top:0;" title="Время в игре (в минутах)" 
                       placeholder="Мин. в игре" value="${minsVal}" onchange="saveGameMeta('${game.id}', { playtime: parseInt(this.value || '0') * 60 })">
            </div>
        `;
        list.appendChild(block);
    });

    if (typeof renderEmulatorsPanel === 'function') renderEmulatorsPanel();
    document.getElementById('settings-modal').classList.add('active');
}

async function addCustomGame() {
    const name = await askDialog("Введите название игры (например: Sonic Mania):", "");
    if (!name || !name.trim()) return;
    const tag = (await askDialog("Подзаголовок (например: 2017 • REMASTER):", "CUSTOM GAME")) || "CUSTOM GAME";
    const color = (await askDialog("Цвет подсветки в HEX (например: #1E90FF):", "#1E90FF")) || "#1E90FF";

    await fetch('/api/games/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), tag: tag.trim(), color: color.trim() })
    });
    await loadGames(false);
    await openSettings();
}

async function deleteCustomGame(gameId, gameName) {
    if (!(await askDialog(`Удалить игру «${gameName}» из списка лаунчера?`, null))) return;
    await fetch('/api/games/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId })
    });
    await loadGames(false);
    await openSettings();
}

async function moveGameOrder(index, dir) {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= gamesData.length) return;
    playSfx('switch');

    const temp = gamesData.at(index);
    gamesData[index] = gamesData.at(newIndex);
    gamesData[newIndex] = temp;

    const cleanOrder = gamesData.map(g => ({
        id: g.id, name: g.name, color: g.color, tag: g.tag, custom: Boolean(g.custom), emuId: g.emuId || undefined
    }));

    await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gamesOrder: cleanOrder })
    });
    await openSettings();
}

async function saveGameMeta(gameId, patch) {
    await fetch('/api/games/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, ...patch })
    });
    const g = gamesData.find(x => x.id === gameId);
    if (g) {
        if (patch.tag !== undefined) g.tag = patch.tag;
        if (patch.playtime !== undefined) g.playtime = patch.playtime;
    }
}

async function saveLaunchArgs(gameId, argsVal) {
    await fetch('/api/args', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, args: argsVal })
    });
}

async function selectSmmExe() {
    const res = await fetch('/api/select_smm');
    const data = await res.json();
    if (data.smmPath) {
        smmPath = data.smmPath;
        await openSettings();
    }
}

function launchSmm() {
    playSfx('launch');
    fetch('/api/launch_smm');
}

function closeSettings() {
    playSfx('close_menu');
    document.getElementById('settings-modal').classList.remove('active');
    renderMainScreen();
}

async function selectFile(gameId) {
    const res = await fetch(`/api/select?id=${gameId}`);
    const data = await res.json();
    if (data.path) {
        await loadGames(false);
        await openSettings();
    }
}

async function clearFile(gameId) {
    await fetch(`/api/clear?id=${gameId}`);
    await loadGames(false);
    await openSettings();
}

let currentModsCache = [];

async function openModsModal() {
    const activeGame = availableGames.at(selectedIndex);
    if (!activeGame) return;
    playSfx('open_menu');
    document.getElementById('mods-modal-title').innerText = `Моды: ${activeGame.name}`;
    document.getElementById('mods-modal').classList.add('active');
    await refreshModsList();
}

function closeModsModal() {
    playSfx('close_menu');
    document.getElementById('mods-modal').classList.remove('active');
}

async function refreshModsList() {
    const activeGame = availableGames.at(selectedIndex);
    if (!activeGame) return;
    const listEl = document.getElementById('mods-list-container');
    const dirLabel = document.getElementById('mods-dir-label');
    const presetSelect = document.getElementById('preset-select');
    listEl.innerHTML = '<div style="text-align:center;opacity:0.6;padding:20px;">Поиск модов...</div>';

    const res = await fetch(`/api/mods/list?id=${activeGame.id}`);
    const data = await res.json();
    currentModsCache = data.mods || [];
    let szStr = '';
    const bVal = data.sizeBytes || 0;
    if (bVal >= 1073741824) szStr = `${(bVal / 1073741824).toFixed(2)} ГБ`;
    else if (bVal >= 1048576) szStr = `${(bVal / 1048576).toFixed(1)} МБ`;
    else if (bVal > 0) szStr = `${Math.max(1, Math.round(bVal / 1024))} КБ`;

    dirLabel.innerText = data.modsDir ? data.modsDir : "Папка модов не найдена (нажмите Обзор...)";
    dirLabel.title = data.modsDir || "";

    let szBadge = document.getElementById('mods-size-badge');
    if (!szBadge && dirLabel.parentElement) {
        szBadge = document.createElement('span');
        szBadge.id = 'mods-size-badge';
        szBadge.style.cssText = 'flex-shrink:0;font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;background:rgba(96,165,250,0.16);color:#93C5FD;white-space:nowrap;';
        dirLabel.after(szBadge);
    }
    if (szBadge) {
        szBadge.innerText = szStr;
        szBadge.style.display = szStr ? 'inline-block' : 'none';
    }
    
    presetSelect.innerHTML = '<option value="">-- Выберите пресет модов --</option>';
    for (const pName of Object.keys(data.presets || {})) {
        const opt = document.createElement('option');
        opt.value = pName;
        opt.innerText = pName;
        presetSelect.appendChild(opt);
    }

    modConflictsMap = {};
    renderModsFromCache();
}

async function toggleMod(gameId, modId, enabled) {
    playSfx('switch');
    const target = currentModsCache.find(m => m.id === modId);
    if (target) target.enabled = enabled;
    await fetch('/api/mods/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, modId, enabled })
    });
}

async function saveModPreset() {
    const activeGame = availableGames.at(selectedIndex);
    if (!activeGame) return;
    const name = await askDialog("Введите название пресета:", "");
    if (!name || !name.trim()) return;
    const enabledIds = currentModsCache.filter(m => m.enabled).map(m => m.id);
    await fetch('/api/mods/save_preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: activeGame.id, name: name.trim(), enabledIds })
    });
    await refreshModsList();
}

async function applyModPreset() {
    const activeGame = availableGames.at(selectedIndex);
    const name = document.getElementById('preset-select').value;
    if (!activeGame || !name) return;
    playSfx('launch');
    await fetch('/api/mods/apply_preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: activeGame.id, name })
    });
    await refreshModsList();
}

async function deleteModPreset() {
    const activeGame = availableGames.at(selectedIndex);
    const name = document.getElementById('preset-select').value;
    if (!activeGame || !name) return;
    await fetch('/api/mods/delete_preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: activeGame.id, name })
    });
    await refreshModsList();
}

async function selectCustomModsDir() {
    const activeGame = availableGames.at(selectedIndex);
    if (!activeGame) return;
    const res = await fetch(`/api/mods/select_dir?id=${activeGame.id}`);
    const data = await res.json();
    if (data.modsDir) await refreshModsList();
}

function openModsFolder() {
    const activeGame = availableGames.at(selectedIndex);
    if (activeGame) fetch(`/api/mods/open_dir?id=${activeGame.id}`);
}

async function openTweaksModal() {
    const activeGame = availableGames.at(selectedIndex);
    if (!activeGame) return;
    playSfx('open_menu');
    document.getElementById('tweaks-modal-title').innerText = `Настройки движка: ${activeGame.name}`;
    const listEl = document.getElementById('tweaks-list');
    listEl.innerHTML = '<div style="text-align:center;opacity:0.6;padding:20px;">Чтение конфига игры...</div>';
    document.getElementById('tweaks-modal').classList.add('active');

    const res = await fetch(`/api/tweaks?id=${activeGame.id}`);
    const data = await res.json();
    if (!data.supported) {
        listEl.innerHTML = '<div style="text-align:center;opacity:0.6;padding:20px;">Для этой игры настройки не поддерживаются</div>';
        return;
    }

    const isSrb2 = (activeGame.id === 'srb2');
    const isMania = (activeGame.id === 'mania');
    const items = [
        { key: 'devmode', label: isSrb2 ? 'Режим отладки (-debug)' : 'Режим разработчика (Dev Menu)', val: data.devmode },
        { key: 'fullscreen', label: 'Полноэкранный режим (Fullscreen)', val: data.fullscreen },
        { key: 'vsync', label: 'Вертикальная синхронизация (VSync)', val: data.vsync },
        { key: 'filtering', label: isSrb2 ? 'Аппаратный 3D-рендерер (OpenGL)' : (isMania ? 'Эффект ЭЛТ-экрана (CRT Filter)' : 'Сглаживание пикселей (Filtering)'), val: data.filtering }
    ];
    if (activeGame.id !== 'sonic3') {
        items.splice(2, 0, { key: 'borderless', label: 'Окно без рамок (Borderless)', val: data.borderless });
    }

    listEl.innerHTML = '';
    items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'tweak-item';
        row.innerHTML = `
            <span class="mod-title">${item.label}</span>
            <input type="checkbox" class="mod-toggle" id="tw-${item.key}" ${item.val ? 'checked' : ''}>
        `;
        listEl.appendChild(row);
    });
}

function closeTweaksModal() {
    playSfx('close_menu');
    document.getElementById('tweaks-modal').classList.remove('active');
}

async function saveTweaks() {
    const activeGame = availableGames.at(selectedIndex);
    if (!activeGame) return;
    const tweaks = {};
    ['devmode', 'fullscreen', 'borderless', 'vsync', 'filtering'].forEach(k => {
        const el = document.getElementById(`tw-${k}`);
        if (el) tweaks[k] = el.checked;
    });
    playSfx('launch');
    await fetch('/api/tweaks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: activeGame.id, tweaks })
    });
    document.getElementById('tweaks-modal').classList.remove('active');
}

async function openShotsModal() {
    const activeGame = availableGames.at(selectedIndex);
    if (!activeGame) return;
    playSfx('open_menu');
    document.getElementById('shots-modal-title').innerText = `Скриншоты: ${activeGame.name}`;
    const grid = document.getElementById('shots-grid');
    const dirLabel = document.getElementById('shots-dir-label');
    grid.innerHTML = '<div style="text-align:center;opacity:0.6;padding:20px;">Загрузка...</div>';
    document.getElementById('shots-modal').classList.add('active');

    const res = await fetch(`/api/screenshots?id=${activeGame.id}`);
    const data = await res.json();
    dirLabel.innerText = data.dir || "";
    grid.innerHTML = '';

    if (!data.shots || data.shots.length === 0) {
        const keyName = (currentDesign?.screenshotKey || 'F6').toUpperCase();
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;opacity:0.6;padding:25px;">
            Скриншотов пока нет.<br>Нажмите <b>${keyName}</b> во время игры, чтобы сделать снимок!
        </div>`;
        return;
    }

    data.shots.forEach(url => {
        const img = document.createElement('img');
        img.src = url;
        img.className = 'shot-thumb';
        img.onclick = () => {
            document.getElementById('shot-lightbox-img').src = url;
            document.getElementById('shot-lightbox').classList.add('active');
        };
        grid.appendChild(img);
    });
}

function closeShotsModal() {
    playSfx('close_menu');
    document.getElementById('shots-modal').classList.remove('active');
}

function openShotsFolder() {
    const activeGame = availableGames.at(selectedIndex);
    if (activeGame) fetch(`/api/screenshots/open?id=${activeGame.id}`);
}

function switchCustomTab(tabName, btnEl) {
    playSfx('switch');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    const target = document.getElementById(`tab-${tabName}`);
    if (target) target.classList.add('active');
}

function applyButtonsAndHud() {
    if (!currentDesign) return;
    if (!currentDesign.buttons) currentDesign.buttons = JSON.parse(JSON.stringify(DEFAULT_BUTTONS_CFG));

    const titleEl = document.getElementById('main-title-text');
    if (titleEl) {
        titleEl.innerText = currentDesign.mainTitleStr || "SONIC LAUNCHER";
    }

    for (const [key, domId] of Object.entries(BUTTON_DOM_MAP)) {
        const el = document.getElementById(domId);
        if (!el) continue;
        const cfg = { ...DEFAULT_BUTTONS_CFG[key], ...(currentDesign.buttons[key] || {}) };
        let iconHtml = "";
        if (cfg.iconMode === "custom" && cfg.customIcon) {
            iconHtml = `<img src="${cfg.customIcon}" class="btn-custom-img" alt="">`;
        } else if (cfg.iconMode !== "none") {
            iconHtml = SVG_ICONS_MAP[key] || "";
        }
        const labelHtml = cfg.label ? `<span>${cfg.label}</span>` : "";
        el.innerHTML = `<span class="btn-inner-wrap">${iconHtml}${labelHtml}</span>`;

        el.style.position = '';
        el.style.left = '';
        el.style.top = '';
        el.style.right = '';
        el.style.bottom = '';
        el.style.margin = '';
        el.style.transform = '';
        el.style.opacity = '';
        el.style.pointerEvents = '';

        if (['custom', 'tray', 'exit'].includes(key)) {
            el.style.width = cfg.label ? 'auto' : '38px';
            el.style.height = '38px';
            el.style.padding = cfg.label ? '0 14px' : '0';
            el.style.borderRadius = cfg.label ? '20px' : '50%';
        } else {
            el.style.width = '';
        }
    }

    // Применение точных координат из автономной студии тем (customLayout)
    const cLayout = currentDesign.customLayout || {};
    document.querySelectorAll('[data-hud-id]').forEach(el => {
        const id = el.getAttribute('data-hud-id');
        const pos = cLayout[id];

        el.style.position = '';
        el.style.left = '';
        el.style.top = '';
        el.style.right = '';
        el.style.bottom = '';
        el.style.margin = '';
        el.style.transform = '';
        el.style.transformOrigin = '';
        el.style.width = '';
        el.style.height = '';
        el.style.textAlign = '';
        if (pos && pos.hidden) {
            el.style.display = 'none';
            return;
        } else {
            el.style.display = '';
        }
        if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
            el.style.position = 'fixed';
            el.style.right = 'auto';
            el.style.bottom = 'auto';
            el.style.margin = '0';
            el.style.transformOrigin = 'center center';

            const sc = pos.scale || 1;
            const skew = (document.body.classList.contains('style-sega') && el.classList.contains('settings-btn')) ? ' skewX(-14deg)' : '';

            // Если старый файл без anchor:'center', пересчитываем его в центр, иначе берем x/y как центр
            const cx = pos.anchor === 'center' ? pos.x : (id === 'header' || id === 'carousel' || id === 'gamelogo' ? 50 : pos.x);
            const cy = (pos.anchor !== 'center' && id === 'carousel') ? 50 : pos.y;

            el.style.left = `${cx}%`;
            el.style.top = `${cy}%`;
            el.style.transform = `translate(-50%, -50%) scale(${sc})${skew}`;

            if (id === 'header') {
                el.style.width = 'max-content';
                el.style.textAlign = 'center';
            } else if (id === 'carousel') {
                el.style.width = '100vw';
                el.style.height = '44vh';
            }
        }
    });
}

function renderButtonsCustomList() {
    const container = document.getElementById('buttons-custom-list');
    if (!container || !currentDesign) return;
    if (!currentDesign.buttons) currentDesign.buttons = JSON.parse(JSON.stringify(DEFAULT_BUTTONS_CFG));
    container.innerHTML = '';

    for (const [key, title] of Object.entries(BUTTON_TITLES_RU)) {
        const cfg = { ...DEFAULT_BUTTONS_CFG[key], ...(currentDesign.buttons[key] || {}) };
        const card = document.createElement('div');
        card.className = 'char-card-cfg';
        card.innerHTML = `
            <div class="char-cfg-header"><span>${title}</span></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;">
                <div>
                    Текст на кнопке:
                    <input type="text" class="args-input" style="margin-top:3px;" value="${cfg.label}" 
                           placeholder="Без текста (только иконка)" oninput="updateBtnCfg('${key}', 'label', this.value)">
                </div>
                <div>
                    Режим иконки:
                    <select class="custom-select" style="width:100%;margin-top:3px;" onchange="updateBtnCfg('${key}', 'iconMode', this.value)">
                        <option value="svg" ${cfg.iconMode === 'svg' ? 'selected' : ''}>Строгая иконка (SVG)</option>
                        <option value="custom" ${cfg.iconMode === 'custom' ? 'selected' : ''}>Своя картинка</option>
                        <option value="none" ${cfg.iconMode === 'none' ? 'selected' : ''}>Без иконки (только текст)</option>
                    </select>
                </div>
            </div>
            <div style="display:flex;gap:6px;margin-top:4px;">
                <button class="btn-small" onclick="pickCustomBtnIcon('${key}')">Выбрать свою иконку...</button>
                <button class="btn-small btn-clear" onclick="resetSingleBtnCfg('${key}')">Сбросить кнопку</button>
            </div>
        `;
        container.appendChild(card);
    }
}

function updateBtnCfg(key, field, value) {
    if (!currentDesign.buttons) currentDesign.buttons = JSON.parse(JSON.stringify(DEFAULT_BUTTONS_CFG));
    if (!currentDesign.buttons[key]) currentDesign.buttons[key] = { ...DEFAULT_BUTTONS_CFG[key] };
    currentDesign.buttons[key][field] = value;
    applyButtonsAndHud();
}

async function pickCustomBtnIcon(key) {
    const res = await fetch(`/api/select_btn_icon?id=${key}`);
    const data = await res.json();
    if (data.url) {
        updateBtnCfg(key, 'customIcon', data.url);
        updateBtnCfg(key, 'iconMode', 'custom');
        renderButtonsCustomList();
    }
}

function resetSingleBtnCfg(key) {
    if (!currentDesign.buttons) currentDesign.buttons = {};
    currentDesign.buttons[key] = { ...DEFAULT_BUTTONS_CFG[key] };
    renderButtonsCustomList();
    applyButtonsAndHud();
}

function renderMediaManager() {
    const container = document.getElementById('media-settings-list');
    if (!container) return;
    container.innerHTML = '';

    gamesData.forEach(game => {
        const card = document.createElement('div');
        card.className = 'char-card-cfg';
        card.innerHTML = `
            <div class="char-cfg-header"><span>${game.name}</span></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;">
                <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.25);padding:5px 8px;border-radius:6px;">
                    <span>Обложка: <b style="color:${game.cover ? '#4ADE80' : '#888'}">${game.cover ? 'Есть' : 'Нет'}</b></span>
                    <div>
                        <button class="btn-small" onclick="pickMediaSlot('${game.id}', 'cover')">Обзор</button>
                        <button class="btn-small btn-clear" onclick="deleteMediaSlot('${game.id}', 'cover')">×</button>
                    </div>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.25);padding:5px 8px;border-radius:6px;">
                    <span>Логотип: <b style="color:${game.logo ? '#4ADE80' : '#888'}">${game.logo ? 'Есть' : 'Нет'}</b></span>
                    <div>
                        <button class="btn-small" onclick="pickMediaSlot('${game.id}', 'logo')">Обзор</button>
                        <button class="btn-small btn-clear" onclick="deleteMediaSlot('${game.id}', 'logo')">×</button>
                    </div>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.25);padding:5px 8px;border-radius:6px;">
                    <span>Фон (Арт): <b style="color:${game.bg ? '#4ADE80' : '#888'}">${game.bg ? 'Есть' : 'Нет'}</b></span>
                    <div>
                        <button class="btn-small" onclick="pickMediaSlot('${game.id}', 'bg')">Обзор</button>
                        <button class="btn-small btn-clear" onclick="deleteMediaSlot('${game.id}', 'bg')">×</button>
                    </div>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.25);padding:5px 8px;border-radius:6px;">
                    <span>Видеофон: <b style="color:${game.video ? '#4ADE80' : '#888'}">${game.video ? 'Есть' : 'Нет'}</b></span>
                    <div>
                        <button class="btn-small" onclick="pickMediaSlot('${game.id}', 'video')">Обзор</button>
                        <button class="btn-small btn-clear" onclick="deleteMediaSlot('${game.id}', 'video')">×</button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

async function pickMediaSlot(gameId, type) {
    const res = await fetch(`/api/select_media?id=${gameId}&type=${type}`);
    const data = await res.json();
    if (data.url) {
        await loadGames(false);
        renderMediaManager();
    }
}

async function deleteMediaSlot(gameId, type) {
    await fetch(`/api/delete_media?id=${gameId}&type=${type}`);
    await loadGames(false);
    renderMediaManager();
}

function getCharSlotObj(gameId, side) {
    if (!currentDesign.characters) currentDesign.characters = {};
    if (!currentDesign.characters[gameId]) currentDesign.characters[gameId] = {};
    if (!currentDesign.characters[gameId][side]) {
        currentDesign.characters[gameId][side] = { url: "", name: "Не выбрано", height: 65, offset: 2, offsetY: 0, flip: false };
    }
    return currentDesign.characters[gameId][side];
}

function setCharEntranceAnim(val) {
    if (!currentDesign) return;
    currentDesign.charAnim = val;
    const activeGame = availableGames.at(selectedIndex);
    if (activeGame) {
        ['character-left-img', 'character-right-img'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.remove('visible');
                el.removeAttribute('data-active-url');
            }
        });
        updateCharacterStage(activeGame.id);
    }
}

function renderCharactersSettings() {
    const container = document.getElementById('characters-settings-list');
    if (!container || !currentDesign) return;
    container.innerHTML = '';

    const curAnim = currentDesign.charAnim || 'slide_up';
    const animBox = document.createElement('div');
    animBox.className = 'char-card-cfg';
    animBox.style.marginBottom = '10px';
    animBox.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:12px;">
            <b>Анимация появления персонажей:</b>
            <select class="custom-select" style="width:210px;" onchange="setCharEntranceAnim(this.value)">
                <option value="slide_up" ${curAnim === 'slide_up' ? 'selected' : ''}>Снизу вверх (плавно)</option>
                <option value="slide_side" ${curAnim === 'slide_side' ? 'selected' : ''}>Сбоку (с краёв экрана)</option>
                <option value="fade" ${curAnim === 'fade' ? 'selected' : ''}>Плавное проявление (Fade)</option>
                <option value="pop" ${curAnim === 'pop' ? 'selected' : ''}>Пружинка (Pop / Scale)</option>
                <option value="dash" ${curAnim === 'dash' ? 'selected' : ''}>Скоростной рывок (Dash)</option>
                <option value="none" ${curAnim === 'none' ? 'selected' : ''}>Без анимации</option>
            </select>
        </div>
    `;
    container.appendChild(animBox);

    gamesData.forEach(game => {
        const leftCfg = getCharSlotObj(game.id, 'left');
        const rightCfg = getCharSlotObj(game.id, 'right');
        const card = document.createElement('div');
        card.className = 'char-card-cfg';
        card.innerHTML = `
            <div class="char-cfg-header"><span>${game.name}</span></div>
            ${buildCharSlotHtml(game.id, 'left', '◀ Левый персонаж', leftCfg)}
            <div style="border-top:1px solid rgba(255,255,255,0.08);margin:4px 0;"></div>
            ${buildCharSlotHtml(game.id, 'right', '▶ Правый персонаж', rightCfg)}
        `;
        container.appendChild(card);
    });
}

function buildCharSlotHtml(gameId, side, title, cfg) {
    return `
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;">
            <span><b>${title}:</b> <span style="color:#4ADE80;">${cfg.name || 'Не выбрано'}</span></span>
            <div style="display:flex;gap:4px;">
                <button class="btn-small" onclick="pickCharacterArt('${gameId}', '${side}')">Обзор...</button>
                <button class="btn-small btn-clear" onclick="clearCharacterArt('${gameId}', '${side}')">×</button>
            </div>
        </div>
        <div class="char-cfg-controls">
            <div>
                Размер (<span>${cfg.height ?? 65}</span>%):
                <input type="range" min="20" max="120" value="${cfg.height ?? 65}" style="width:100%;" oninput="updateCharField('${gameId}', '${side}', 'height', parseInt(this.value), this.previousElementSibling)">
            </div>
            <div style="display:flex;align-items:center;gap:6px;padding-top:14px;">
                <input type="checkbox" ${cfg.flip ? 'checked' : ''} onchange="updateCharField('${gameId}', '${side}', 'flip', this.checked)">
                <span>Отзеркалить (Flip)</span>
            </div>
            <div>
                Позиция X (<span>${cfg.offset ?? 2}</span>%):
                <input type="range" min="-50" max="75" value="${cfg.offset ?? 2}" style="width:100%;" oninput="updateCharField('${gameId}', '${side}', 'offset', parseInt(this.value), this.previousElementSibling)">
            </div>
            <div>
                Позиция Y (<span>${cfg.offsetY ?? 0}</span>%):
                <input type="range" min="-50" max="60" value="${cfg.offsetY ?? 0}" style="width:100%;" oninput="updateCharField('${gameId}', '${side}', 'offsetY', parseInt(this.value), this.previousElementSibling)">
            </div>
        </div>
    `;
}

async function pickCharacterArt(gameId, side) {
    const res = await fetch(`/api/select_char?id=${gameId}&side=${side}`);
    const data = await res.json();
    if (data.url) {
        const slot = getCharSlotObj(gameId, side);
        slot.url = data.url;
        slot.name = data.name;
        renderCharactersSettings();
        const activeGame = availableGames.at(selectedIndex);
        if (activeGame && activeGame.id === gameId) updateCharacterStage(gameId);
    }
}

function clearCharacterArt(gameId, side) {
    if (currentDesign.characters && currentDesign.characters[gameId]) {
        delete currentDesign.characters[gameId][side];
    }
    renderCharactersSettings();
    const activeGame = availableGames.at(selectedIndex);
    if (activeGame && activeGame.id === gameId) updateCharacterStage(gameId);
}

function updateCharField(gameId, side, field, value, labelEl = null) {
    const slot = getCharSlotObj(gameId, side);
    slot[field] = value;
    if (labelEl) labelEl.innerText = value;
    const activeGame = availableGames.at(selectedIndex);
    if (activeGame && activeGame.id === gameId) updateCharacterStage(gameId);
}

function renderSoundsManager() {
    const container = document.getElementById('sounds-manager-list');
    if (!container) return;
    container.innerHTML = '';

    SOUND_SLOTS.forEach(slot => {
        const hasUrl = Boolean(soundsMap[slot.key]);
        const row = document.createElement('div');
        row.className = 'sound-cfg-row';
        row.innerHTML = `
            <span class="sound-cfg-name">${slot.label}</span>
            <span class="sound-cfg-status ${hasUrl ? 'loaded' : ''}">${hasUrl ? 'Установлен' : 'Нет файла'}</span>
            <button class="btn-small" onclick="testSoundSlot('${slot.key}')" ${hasUrl ? '' : 'disabled'}>▶</button>
            <button class="btn-small" onclick="pickSoundSlot('${slot.key}')">Обзор...</button>
            <button class="btn-small btn-clear" onclick="deleteSoundSlot('${slot.key}')">×</button>
        `;
        container.appendChild(row);
    });
}

let previewSoundAudio = null;

function testSoundSlot(key) {
    const url = soundsMap[key];
    if (!url) return;
    if (previewSoundAudio) {
        previewSoundAudio.pause();
        previewSoundAudio = null;
    }
    if (currentBgmAudio && !currentBgmAudio.paused) {
        currentBgmAudio.volume = getMasterBgmVol() * 0.2;
    }
    previewSoundAudio = new Audio();
    previewSoundAudio.crossOrigin = "anonymous";
    previewSoundAudio.src = url;
    const isBgm = key.endsWith('_bgm');
    const rawVol = isBgm ? (currentDesign?.bgmVolume ?? 50) : (currentDesign?.sfxVolume ?? 70);
    previewSoundAudio.volume = Math.max(0.1, rawVol / 100);
    attachRealAnalyser(previewSoundAudio);
    previewSoundAudio.onended = () => {
        if (currentBgmAudio) currentBgmAudio.volume = getMasterBgmVol();
    };
    previewSoundAudio.play().catch(() => {});
}

async function pickSoundSlot(key) {
    const res = await fetch(`/api/select_sound?key=${key}`);
    const data = await res.json();
    if (data.url) {
        soundsMap[key] = data.url;
        renderSoundsManager();
        if (key.endsWith('_bgm')) {
            currentBgmUrl = "";
            const activeGame = availableGames.at(selectedIndex);
            switchBgm(activeGame ? activeGame.id : 'default');
        }
    }
}

async function deleteSoundSlot(key) {
    await fetch(`/api/delete_sound?key=${key}`);
    delete soundsMap[key];
    renderSoundsManager();
}

function syncAllControlsToDesign() {
    if (!currentDesign) return;
    const getVal = (id) => document.getElementById(id)?.value;
    const getChk = (id) => document.getElementById(id)?.checked;

    if (getVal('inp-screenLayout')) currentDesign.screenLayout = getVal('inp-screenLayout');
    if (getVal('inp-carouselY') !== undefined) currentDesign.carouselY = parseInt(getVal('inp-carouselY'));
    if (getVal('inp-btnScale') !== undefined) currentDesign.btnScale = parseInt(getVal('inp-btnScale'));
    if (getVal('inp-carouselMode')) currentDesign.carouselMode = getVal('inp-carouselMode');
    if (getVal('inp-cardStyle')) currentDesign.cardStyle = getVal('inp-cardStyle');
    if (getVal('inp-headerPos')) currentDesign.headerPos = getVal('inp-headerPos');
    if (getVal('inp-panelAlpha') !== undefined) currentDesign.panelAlpha = parseInt(getVal('inp-panelAlpha'));
    if (getVal('inp-mainTitleStr') !== undefined) currentDesign.mainTitleStr = getVal('inp-mainTitleStr');
    if (getChk('inp-enableEq') !== undefined) currentDesign.enableEq = getChk('inp-enableEq');
    if (getChk('inp-enableParallax') !== undefined) currentDesign.enableParallax = getChk('inp-enableParallax');
    if (getChk('inp-liteMode') !== undefined) currentDesign.liteMode = getChk('inp-liteMode');
    if (getChk('inp-discordRpc') !== undefined) currentDesign.discordRpc = getChk('inp-discordRpc');
    if (getChk('inp-showJukebox') !== undefined) currentDesign.showJukebox = getChk('inp-showJukebox');
    if (getChk('inp-autoBackupSaves') !== undefined) currentDesign.autoBackupSaves = getChk('inp-autoBackupSaves');
    if (getVal('inp-autoBackupLimit')) currentDesign.autoBackupLimit = parseInt(getVal('inp-autoBackupLimit'));
}

function openCustomModal() {
    if (!currentDesign) return;
    playSfx('open_menu');

    if (document.getElementById('inp-screenLayout')) document.getElementById('inp-screenLayout').value = currentDesign.screenLayout || 'classic';
    if (document.getElementById('inp-carouselY')) {
        document.getElementById('inp-carouselY').value = currentDesign.carouselY ?? 0;
        document.getElementById('val-carouselY').innerText = currentDesign.carouselY ?? 0;
    }
    if (document.getElementById('inp-btnScale')) {
        document.getElementById('inp-btnScale').value = currentDesign.btnScale ?? 100;
        document.getElementById('val-btnScale').innerText = currentDesign.btnScale ?? 100;
    }
    if (document.getElementById('inp-carouselMode')) document.getElementById('inp-carouselMode').value = currentDesign.carouselMode || 'coverflow';
    if (document.getElementById('inp-shaderType')) document.getElementById('inp-shaderType').value = currentDesign.shaderType || 'none';
    if (document.getElementById('inp-cardStyle')) document.getElementById('inp-cardStyle').value = currentDesign.cardStyle || 'sega';
    if (document.getElementById('inp-headerPos')) document.getElementById('inp-headerPos').value = currentDesign.headerPos || 'center';
    if (document.getElementById('inp-panelAlpha')) {
        document.getElementById('inp-panelAlpha').value = currentDesign.panelAlpha ?? 45;
        document.getElementById('val-panelAlpha').innerText = currentDesign.panelAlpha ?? 45;
    }
    if (document.getElementById('inp-mainTitleStr')) {
        document.getElementById('inp-mainTitleStr').value = currentDesign.mainTitleStr || 'SONIC LAUNCHER';
    }

    document.getElementById('inp-cardWidth').value = currentDesign.cardWidth;
    document.getElementById('val-cardWidth').innerText = currentDesign.cardWidth;
    document.getElementById('inp-cardRadius').value = currentDesign.cardRadius ?? 14;
    document.getElementById('val-cardRadius').innerText = currentDesign.cardRadius ?? 14;
    document.getElementById('inp-logoHeight').value = currentDesign.logoHeight ?? 75;
    document.getElementById('val-logoHeight').innerText = currentDesign.logoHeight ?? 75;
    document.getElementById('inp-backdropOpacity').value = currentDesign.backdropOpacity ?? 55;
    document.getElementById('val-backdropOpacity').innerText = currentDesign.backdropOpacity ?? 55;
    document.getElementById('inp-backdropBlur').value = currentDesign.backdropBlur ?? 4;
    document.getElementById('val-backdropBlur').innerText = currentDesign.backdropBlur ?? 4;
    document.getElementById('val-customFont').innerText = currentDesign.customFontName || "Стандартный";
    document.getElementById('inp-fontScale').value = currentDesign.fontScale ?? 100;
    document.getElementById('val-fontScale').innerText = currentDesign.fontScale ?? 100;
    document.getElementById('inp-textColor').value = currentDesign.textColor || '#ffffff';
    document.getElementById('inp-titleColor').value = currentDesign.titleColor || '#FFD700';
    document.getElementById('val-appIcon').innerText = currentDesign.appIconName || "Стандартное кольцо";
    document.getElementById('inp-screenshotKey').value = currentDesign.screenshotKey || 'f6';
    document.getElementById('inp-sfxVolume').value = currentDesign.sfxVolume ?? 70;
    document.getElementById('val-sfxVolume').innerText = currentDesign.sfxVolume ?? 70;
    document.getElementById('inp-bgmVolume').value = currentDesign.bgmVolume ?? 40;
    document.getElementById('val-bgmVolume').innerText = currentDesign.bgmVolume ?? 40;
    document.getElementById('inp-objCount').value = currentDesign.objCount ?? 14;
    document.getElementById('val-objCount').innerText = currentDesign.objCount ?? 14;
    document.getElementById('inp-objSpeed').value = currentDesign.objSpeed ?? 5;
    document.getElementById('val-objSpeed').innerText = currentDesign.objSpeed ?? 5;
    document.getElementById('inp-objOpacity').value = currentDesign.objOpacity;
    document.getElementById('val-objOpacity').innerText = currentDesign.objOpacity;

    document.getElementById('inp-minimizeOnLaunch').checked = currentDesign.minimizeOnLaunch ?? true;
    document.getElementById('inp-minimizeToTray').checked = currentDesign.minimizeToTray ?? false;
    if (document.getElementById('inp-enableEq')) document.getElementById('inp-enableEq').checked = currentDesign.enableEq ?? true;
    if (document.getElementById('inp-enableParallax')) document.getElementById('inp-enableParallax').checked = currentDesign.enableParallax ?? true;
    if (document.getElementById('inp-liteMode')) document.getElementById('inp-liteMode').checked = currentDesign.liteMode ?? false;
    if (document.getElementById('inp-discordRpc')) document.getElementById('inp-discordRpc').checked = currentDesign.discordRpc ?? true;
    if (document.getElementById('inp-showJukebox')) document.getElementById('inp-showJukebox').checked = currentDesign.showJukebox ?? true;
    if (document.getElementById('inp-autoBackupSaves')) document.getElementById('inp-autoBackupSaves').checked = currentDesign.autoBackupSaves ?? false;
    if (document.getElementById('inp-autoBackupLimit')) document.getElementById('inp-autoBackupLimit').value = String(currentDesign.autoBackupLimit ?? 5);

    const list = document.getElementById('color-pickers-list');
    list.innerHTML = '';
    for (const [themeId, label] of Object.entries(THEME_LABELS)) {
        const colors = currentDesign.gradients[themeId] || ["#090d16", "#0d2b6b"];
        const row = document.createElement('div');
        row.className = 'color-row';
        row.innerHTML = `
            <span>${label}</span>
            <div class="color-inputs">
                <input type="color" id="col-${themeId}-0" value="${colors.at(0)}" oninput="previewDesign('${themeId}')">
                <input type="color" id="col-${themeId}-1" value="${colors.at(1)}" oninput="previewDesign('${themeId}')">
            </div>
        `;
        list.appendChild(row);
    }

    renderMediaManager();
    renderButtonsCustomList();
    renderCharactersSettings();
    renderSoundsManager();
    document.getElementById('custom-modal').classList.add('active');
}

async function pickCustomFont() {
    const res = await fetch('/api/select_font');
    const data = await res.json();
    if (data.fontUrl) {
        currentDesign.customFontUrl = data.fontUrl;
        currentDesign.customFontName = data.fontName;
        document.getElementById('val-customFont').innerText = data.fontName;
        applyDesign(currentDesign);
    }
}

function clearCustomFont() {
    currentDesign.customFontUrl = "";
    currentDesign.customFontName = "";
    document.getElementById('val-customFont').innerText = "Стандартный";
    applyDesign(currentDesign);
}

async function pickAppIcon() {
    const res = await fetch('/api/select_icon');
    const data = await res.json();
    if (data.iconUrl) {
        currentDesign.appIconUrl = data.iconUrl;
        currentDesign.appIconName = data.iconName;
        document.getElementById('val-appIcon').innerText = data.iconName;
    }
}

async function exportThemeFile() {
    syncAllControlsToDesign();
    const fname = await askDialog("Введите имя файла темы:", "custom_theme");
    if (!fname) return;
    const res = await fetch('/api/theme/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: fname, design: currentDesign })
    });
    const data = await res.json();
    if (data.path) {
        showToast("Тема сохранена: " + data.path);
    }
}

async function importThemeFile() {
    const res = await fetch('/api/theme/import');
    const data = await res.json();
    if (data.design) {
        currentDesign = data.design;
        applyDesign(currentDesign);
        renderFloatingObjects();
        openCustomModal();
    }
}

function previewDesign(previewThemeId = null, rebuildObjects = false) {
    syncAllControlsToDesign();
    currentDesign.shaderType = document.getElementById('inp-shaderType').value;
    currentDesign.cardWidth = parseInt(document.getElementById('inp-cardWidth').value);
    currentDesign.cardRadius = parseInt(document.getElementById('inp-cardRadius').value);
    currentDesign.logoHeight = parseInt(document.getElementById('inp-logoHeight').value);
    currentDesign.backdropOpacity = parseInt(document.getElementById('inp-backdropOpacity').value);
    currentDesign.backdropBlur = parseInt(document.getElementById('inp-backdropBlur').value);
    currentDesign.fontScale = parseInt(document.getElementById('inp-fontScale').value);
    currentDesign.textColor = document.getElementById('inp-textColor').value;
    currentDesign.titleColor = document.getElementById('inp-titleColor').value;
    currentDesign.screenshotKey = document.getElementById('inp-screenshotKey').value;
    currentDesign.sfxVolume = parseInt(document.getElementById('inp-sfxVolume').value);
    currentDesign.bgmVolume = parseInt(document.getElementById('inp-bgmVolume').value);
    currentDesign.objCount = parseInt(document.getElementById('inp-objCount').value);
    currentDesign.objSpeed = parseInt(document.getElementById('inp-objSpeed').value);
    currentDesign.objOpacity = parseInt(document.getElementById('inp-objOpacity').value);
    currentDesign.minimizeOnLaunch = document.getElementById('inp-minimizeOnLaunch').checked;
    currentDesign.minimizeToTray = document.getElementById('inp-minimizeToTray').checked;

    document.getElementById('val-carouselY').innerText = currentDesign.carouselY ?? 0;
    document.getElementById('val-btnScale').innerText = currentDesign.btnScale ?? 100;
    document.getElementById('val-panelAlpha').innerText = currentDesign.panelAlpha ?? 45;
    document.getElementById('val-cardWidth').innerText = currentDesign.cardWidth;
    document.getElementById('val-cardRadius').innerText = currentDesign.cardRadius;
    document.getElementById('val-logoHeight').innerText = currentDesign.logoHeight;
    document.getElementById('val-backdropOpacity').innerText = currentDesign.backdropOpacity;
    document.getElementById('val-backdropBlur').innerText = currentDesign.backdropBlur;
    document.getElementById('val-fontScale').innerText = currentDesign.fontScale;
    document.getElementById('val-sfxVolume').innerText = currentDesign.sfxVolume;
    document.getElementById('val-bgmVolume').innerText = currentDesign.bgmVolume;
    document.getElementById('val-objCount').innerText = currentDesign.objCount;
    document.getElementById('val-objSpeed').innerText = currentDesign.objSpeed;
    document.getElementById('val-objOpacity').innerText = currentDesign.objOpacity;

    for (const themeId of Object.keys(THEME_LABELS)) {
        const el0 = document.getElementById(`col-${themeId}-0`);
        const el1 = document.getElementById(`col-${themeId}-1`);
        if (el0 && el1) {
            currentDesign.gradients[themeId] = [el0.value, el1.value];
        }
    }

    applyDesign(currentDesign);
    if (rebuildObjects) renderFloatingObjects();
    if (previewThemeId) setBackgroundTheme(previewThemeId, null, null);
}

function resetDesign() {
    currentDesign = JSON.parse(JSON.stringify(defaultDesign || {}));
    currentDesign.customLayout = {};
    currentDesign.screenLayout = 'classic';
    currentDesign.cardStyle = 'glass';
    currentDesign.carouselMode = 'coverflow';
    currentDesign.headerPos = 'center';
    currentDesign.carouselY = 0;
    currentDesign.btnScale = 100;
    currentDesign.shaderType = 'none';
    currentDesign._baseShader = 'none';
    currentDesign.screenFx = 'none';
    currentDesign.clickFx = 'rings';
    currentDesign.lightUi = false;
    currentDesign.perGameStyle = {};
    currentDesign.gameShaders = {};
    currentDesign.cardDecor = {};
    currentDesign.box3d = {};
    if (currentDesign.uiThemeBuilder) currentDesign.uiThemeBuilder.enabled = false;
    if (typeof window.updateGlobalDesignSnap === 'function') window.updateGlobalDesignSnap();
    openCustomModal();
    applyDesign(currentDesign);
    if (typeof window.syncLightUiClass === 'function') window.syncLightUiClass();
    if (typeof window.applyVisualFxPack === 'function') window.applyVisualFxPack();
    if (typeof window.syncClickFxStyle === 'function') window.syncClickFxStyle();
    if (typeof window.applyUiBuilderStyles === 'function') window.applyUiBuilderStyles();
    if (typeof window.applyBox3dToCarousel === 'function') window.applyBox3dToCarousel();
    if (typeof window.renderActiveCardDecor === 'function') window.renderActiveCardDecor('silent');
    renderFloatingObjects();
    selectGame(selectedIndex, false);
}

async function saveAndCloseCustom() {
    syncAllControlsToDesign();
    playSfx('close_menu');
    await fetch('/api/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentDesign)
    });
    selectGame(selectedIndex, false);
    document.getElementById('custom-modal').classList.remove('active');
}

let wheelCooldown = 0;
window.addEventListener('wheel', (e) => {
    const isModalOpen = document.querySelector('.modal-backdrop.active') !== null
        || document.getElementById('m4-modal')?.classList.contains('open')
        || document.getElementById('sgl-dlg-bg')?.classList.contains('open')
        || document.getElementById('sgl-tour-bg')?.classList.contains('open')
        || document.body.classList.contains('hud-editing');
    if (isModalOpen || availableGames.length <= 1) return;

    const now = performance.now();
    if (now - wheelCooldown < 145) return;
    if (Math.abs(e.deltaY) < 8 && Math.abs(e.deltaX) < 8) return;

    wheelCooldown = now;
    const dir = (e.deltaY > 0 || e.deltaX > 0) ? 1 : -1;
    moveSelection(dir);
}, { passive: true });

let _discordDebounceTimer = null;
(function() {
    const _origSelectGame = window.selectGame;
    if (typeof _origSelectGame === 'function') {
        window.selectGame = function() {
            _origSelectGame.apply(this, arguments);
            clearTimeout(_discordDebounceTimer);
            _discordDebounceTimer = setTimeout(() => {
                const g = availableGames.at(selectedIndex);
                if (g && (currentDesign?.discordRpc ?? true)) {
                    fetch('/api/discord/status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ gameId: g.id, gameName: g.name })
                    }).catch(() => {});
                }
            }, 1200);
        };
    }
})();
