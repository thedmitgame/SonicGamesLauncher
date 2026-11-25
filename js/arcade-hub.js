/* === AUTONOMOUS MODULE: ARCADE & EXTRAS HUB v2.0 (NO EMOJI, ORIGINAL CHAO, ANIMATED SLOTS) === */
(function() {
    const STORE_KEY = 'sgl_arcade_hub_v1';
    let liveStats = { totalSeconds: 0, installedCount: 0, emeraldsCur: 0, emeraldsMax: 7, achDone: 0, achMax: 10, modsCount: 0, shotsCount: 0, shelvesCount: 0 };
    let saveSummary = { anyAllEmeralds: false, completedIds: new Array(), games: {} };
    let chaoRaf = 0, quizAudio = null, quizTimer = 0, wasRunning = null;

    const SVG_PAD = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="4"/><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15.5" cy="11" r="1"/><circle cx="17.5" cy="13" r="1"/></svg>';
    const SVG_RING = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" stroke="#fde047" stroke-width="2.6"/></svg>';
    const SVG_STAR = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    const SVG_BOLT = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
    const SVG_NOTE = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function todayKey() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function loadState() {
        const def = { rings: 100, chao: { feed: 0, pet: 0, xp: 0 }, doneCh: new Array(), activeCh: null, emblems: new Array(), titles: new Array(), activeTitle: '', heatmap: {}, quizBest: 0, spins: 0, lastDaily: '' };
        if (diskCache) return Object.assign(def, diskCache);
        try { return Object.assign(def, JSON.parse(localStorage.getItem(STORE_KEY) || '{}')); } catch (_) { return def; }
    }
    let diskCache = null;
    function saveState(st) {
        diskCache = Object.assign({}, st);
        try { localStorage.setItem(STORE_KEY, JSON.stringify(st)); } catch (_) {}
        fetch('/api/arcade/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(st) }).catch(() => {});
    }
    async function syncStateFromDisk() {
        try {
            const d = await (await fetch('/api/arcade/state')).json();
            if (d && typeof d === 'object' && Object.keys(d).length > 0) {
                const merged = Object.assign(loadState(), d);
                diskCache = merged;
                try { localStorage.setItem(STORE_KEY, JSON.stringify(merged)); } catch (_) {}
            }
        } catch (_) {}
    }

    function logHeatmap(minsAdd, launchAdd, gameName) {
        const st = loadState(), k = todayKey();
        if (!st.heatmap) st.heatmap = {};
        const cur = st.heatmap[k] || { mins: 0, launches: 0, games: {} };
        cur.mins = +(cur.mins + (minsAdd || 0)).toFixed(1);
        cur.launches += (launchAdd || 0);
        if (!cur.games) cur.games = {};
        if (gameName) cur.games[gameName] = +((cur.games[gameName] || 0) + Math.max(0.5, minsAdd || 1)).toFixed(1);
        st.heatmap[k] = cur;
        saveState(st);
    }

    function injectStyles() {
        if (document.getElementById('sgl-arcade-hub-css')) return;
        const st = mk('style', '', '');
        st.id = 'sgl-arcade-hub-css';
        st.textContent = Array.of(
            '.ah-modal{width:920px;max-width:96vw;max-height:90vh;display:flex;flex-direction:column;gap:12px;}',
            '.ah-top{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;}',
            '.ah-rings{display:inline-flex;align-items:center;gap:6px;padding:5px 13px;border-radius:999px;background:rgba(250,204,21,0.16);border:1px solid rgba(250,204,21,0.45);color:#fde047;font-size:12px;font-weight:900;}',
            '.ah-body{flex:1;min-height:430px;max-height:62vh;overflow-y:auto;padding-right:4px;}',
            '.ah-chao-grid{display:grid;grid-template-columns:320px minmax(0,1fr);gap:16px;align-items:stretch;}',
            '.ah-stage{background:radial-gradient(circle at 50% 42%,rgba(56,189,248,0.22),#070b14 78%);border:1px solid rgba(255,255,255,0.14);border-radius:14px;position:relative;height:360px;overflow:hidden;cursor:grab;}',
            '.ah-card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;position:relative;}',
            '.ah-bar{height:8px;border-radius:999px;background:rgba(255,255,255,0.1);overflow:hidden;}',
            '.ah-bar>i{display:block;height:100%;background:linear-gradient(90deg,#38bdf8,#facc15);transition:width 0.3s;}',
            '.ah-emb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:8px;margin-bottom:14px;}',
            '.ah-emb{padding:9px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);text-align:center;font-size:11px;display:flex;flex-direction:column;gap:5px;align-items:center;}',
            '.ah-emb.on{border-color:#fde047;background:rgba(250,204,21,0.1);}.ah-emb.off{opacity:0.48;filter:grayscale(0.9);border-style:dashed;}',
            '.ah-heat-wrap{overflow-x:auto;padding:12px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:12px;display:flex;flex-direction:column;gap:8px;}',
            '.ah-heat-months{display:grid;grid-auto-flow:column;grid-auto-columns:14px;padding-left:28px;font-size:10px;color:#94a3b8;font-weight:700;height:14px;}',
            '.ah-heat-main{display:flex;gap:6px;align-items:flex-start;}',
            '.ah-heat-days{display:grid;grid-template-rows:repeat(7,11px);gap:3px;font-size:9.5px;color:#94a3b8;font-weight:700;width:22px;line-height:11px;}',
            '.ah-heat-grid{display:grid;grid-auto-flow:column;grid-template-rows:repeat(7,11px);gap:3px;width:max-content;}',
            '.ah-cell{width:11px;height:11px;border-radius:2px;background:#0f172a;border:1px solid rgba(255,255,255,0.06);transition:transform 0.12s;}',
            '.ah-cell:hover{transform:scale(1.35);border-color:#fde047;z-index:2;}',
            '.ah-c1{background:#064e3b;}.ah-c2{background:#059669;}.ah-c3{background:#10b981;}.ah-c4{background:#34d399;box-shadow:0 0 6px rgba(52,211,153,0.65);}',
            '.ah-heat-legend{display:flex;align-items:center;justify-content:flex-end;gap:5px;font-size:10px;color:#94a3b8;}',
            '#ah-heat-tip{position:fixed;z-index:9999;pointer-events:none;padding:7px 10px;border-radius:8px;background:rgba(9,13,22,0.96);border:1px solid rgba(250,204,21,0.55);color:#f8fafc;font-size:11px;line-height:1.4;box-shadow:0 8px 24px rgba(0,0,0,0.75);display:none;}',
            '.ah-slots-wrap{position:relative;margin:10px 0;}',
            '.ah-win-line{position:absolute;left:-4px;right:-4px;top:50%;height:3px;transform:translateY(-50%);background:linear-gradient(90deg,transparent,#facc15,#fde047,#facc15,transparent);opacity:0.25;pointer-events:none;z-index:3;transition:opacity 0.25s,box-shadow 0.25s;}',
            '.ah-win-line.lit{opacity:1;box-shadow:0 0 14px #facc15;}',
            '.ah-slots{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;position:relative;}',
            '.ah-reel{height:96px;border-radius:12px;background:linear-gradient(180deg,#050811 0%,#1e1b4b 50%,#050811 100%);border:2px solid #facc15;overflow:hidden;position:relative;box-shadow:inset 0 0 22px rgba(0,0,0,0.9);}',
            '.ah-reel-strip{position:absolute;left:0;right:0;top:0;will-change:transform;}',
            '.ah-reel-item{height:96px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;}',
            '.ah-slot-fx{position:absolute;inset:0;pointer-events:none;z-index:5;}',
            '.ah-quiz-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;}',
            '.ah-title-pill{display:inline-block;padding:2px 9px;border-radius:999px;background:rgba(250,204,21,0.18);border:1px solid rgba(250,204,21,0.5);color:#fde047;font-size:10.5px;font-weight:800;}'
        ).join('\n');
        document.head.appendChild(st);
    }

    const CHAOS_CHALLENGES = Array.of(
        { id: 'c01', game: 'sonic1', name: 'Первый Изумруд S1', desc: 'Добыть +1 Изумруд в Sonic 1 Forever за сессию', reward: 60, type: 'emeralds', need: 1 },
        { id: 'c02', game: 'sonic2', name: 'Охотник за Хаосом S2', desc: 'Добыть +1 Изумруд в Sonic 2 Absolute', reward: 65, type: 'emeralds', need: 1 },
        { id: 'c03', game: 'soniccd', name: 'Камень Времени CD', desc: 'Найти +1 Камень Времени в Sonic CD Restored', reward: 70, type: 'emeralds', need: 1 },
        { id: 'c04', game: 'sonic3', name: 'Сила A.I.R.', desc: 'Добыть +1 Изумруд в Sonic 3 A.I.R.', reward: 70, type: 'emeralds', need: 1 },
        { id: 'c05', game: 'mania', name: 'Мания Изумрудов', desc: 'Добыть +1 Изумруд в Sonic Mania', reward: 75, type: 'emeralds', need: 1 },
        { id: 'c06', game: 'srb2', name: '3D-Изумруд SRB2', desc: 'Получить +1 Изумруд в Sonic Robo Blast 2', reward: 80, type: 'emeralds', need: 1 },
        { id: 'c07', game: 'any', name: 'Скоростной разогрев', desc: 'Провести в любой игре минимум 5 минут за сессию', reward: 35, type: 'mins', need: 5 },
        { id: 'c08', game: 'any', name: 'Аркадный забег', desc: 'Провести в любой игре минимум 15 минут за сессию', reward: 60, type: 'mins', need: 15 },
        { id: 'c09', game: 'any', name: 'Сверхзвуковой марафон', desc: 'Играть 30 минут подряд в одной сессии', reward: 110, type: 'mins', need: 30 },
        { id: 'c10', game: 'any', name: 'Охотник за трофеями', desc: 'Открыть +1 новое достижение в выбранной игре', reward: 85, type: 'ach', need: 1 },
        { id: 'c11', game: 'any', name: 'Двойной триумф', desc: 'Открыть +2 достижения за одну игровую сессию', reward: 140, type: 'ach', need: 2 },
        { id: 'c12', game: 'sonic1', name: 'Очковый штурм S1', desc: 'Набрать +10 000 очков в сохранении Sonic 1 Forever', reward: 55, type: 'score', need: 10000 },
        { id: 'c13', game: 'sonic2', name: 'Рекордсмен S2', desc: 'Набрать +20 000 очков в Sonic 2 Absolute', reward: 65, type: 'score', need: 20000 },
        { id: 'c14', game: 'soniccd', name: 'Мастер скорости CD', desc: 'Набрать +15 000 очков в Sonic CD Restored', reward: 65, type: 'score', need: 15000 },
        { id: 'c15', game: 'mania', name: 'Звезда Студиополиса', desc: 'Набрать +25 000 очков в Sonic Mania', reward: 75, type: 'score', need: 25000 },
        { id: 'c16', game: 'srb2', name: 'Герой 3D-Зон', desc: 'Набрать +15 000 очков в Sonic Robo Blast 2', reward: 75, type: 'score', need: 15000 },
        { id: 'c17', game: 'any', name: 'Стальные нервы', desc: 'Играть 10+ мин. без потери жизней в сейве', reward: 95, type: 'noloss', need: 10 },
        { id: 'c18', game: 'any', name: 'Запас жизней', desc: 'Увеличить число жизней в сейве минимум на +2', reward: 70, type: 'lives', need: 2 },
        { id: 'c19', game: 'any', name: 'Двойной Изумруд', desc: 'Собрать +2 Изумруда за одну игровую сессию', reward: 150, type: 'emeralds', need: 2 },
        { id: 'c20', game: 'any', name: 'Финал кампании', desc: 'Получить статус прохождения CLEAR в слоте игры', reward: 180, type: 'clear', need: 1 }
    );

    const RARE_TITLES = Array.of('Сверхзвуковой', 'Повелитель Изумрудов', 'Король Казино', 'Легенда Мобиуса', 'Мастер Хаоса', 'Хранитель Времени');

    const EMBLEM_DEFS = Array.of(
        { id: 'e01', code: '01', name: 'Первый старт', cond: 'Запустить игру через лаунчер', fn: (s, a) => Object.keys(a.heatmap || {}).length >= 1 },
        { id: 'e02', code: '02', name: '100% Кампания', cond: 'Пройти любую игру на 100% / 7 Изумрудов', fn: () => (saveSummary.completedIds || new Array()).length >= 1 },
        { id: 'e03', code: '03', name: 'Семь Изумрудов', cond: 'Собрать 7+ Изумрудов в сумме', fn: (s) => (s.emeraldsCur || 0) >= 7 },
        { id: 'e04', code: '04', name: 'Хранитель Хаоса', cond: 'Собрать 14+ Изумрудов в сумме', fn: (s) => (s.emeraldsCur || 0) >= 14 },
        { id: 'e05', code: '05', name: 'Моддер-инженер', cond: 'Установить 5+ модов в библиотеку', fn: (s) => (s.modsCount || 0) >= 5 },
        { id: 'e06', code: '06', name: 'Ночной бегун', cond: 'Запустить игру ночью (23:00–05:00)', fn: (s, a) => Boolean(a.nightRun) },
        { id: 'e07', code: '07', name: 'Дизайнер тем', cond: 'Настроить UI Builder или 3D-боксы', fn: () => Boolean(window.currentDesign?.uiThemeBuilder?.enabled || window.currentDesign?.box3d?._global?.enabled) },
        { id: 'e08', code: '08', name: 'Первый вызов', cond: 'Выполнить 1 Челлендж Хаоса', fn: (s, a) => (a.doneCh || new Array()).length >= 1 },
        { id: 'e09', code: '09', name: 'Ветеран Хаоса', cond: 'Выполнить 5 Челленджей Хаоса', fn: (s, a) => (a.doneCh || new Array()).length >= 5 },
        { id: 'e10', code: '10', name: 'Повелитель вызовов', cond: 'Выполнить 10 Челленджей Хаоса', fn: (s, a) => (a.doneCh || new Array()).length >= 10 },
        { id: 'e11', code: '11', name: 'Джекпот 777', cond: 'Сорвать Джекпот в Casino Night Slots', fn: (s, a) => Boolean(a.slotJackpot) },
        { id: 'e12', code: '12', name: 'Меломан', cond: 'Серия 3 победы в «Угадай трек»', fn: (s, a) => (a.quizBest || 0) >= 3 },
        { id: 'e13', code: '13', name: 'Маэстро OST', cond: 'Серия 5 побед в «Угадай трек»', fn: (s, a) => (a.quizBest || 0) >= 5 },
        { id: 'e14', code: '14', name: 'Друг Чао', cond: 'Прокачать Кристального Чао до 3 уровня', fn: (s, a) => getChaoLevel(s, a) >= 3 },
        { id: 'e15', code: '15', name: 'Мастер Сада Чао', cond: 'Прокачать Кристального Чао до 5 уровня', fn: (s, a) => getChaoLevel(s, a) >= 5 },
        { id: 'e16', code: '16', name: 'Час на скорости', cond: 'Наиграть 1+ час в лаунчере', fn: (s) => (s.totalSeconds || 0) >= 3600 },
        { id: 'e17', code: '17', name: 'Марафонец', cond: 'Наиграть 5+ часов в лаунчере', fn: (s) => (s.totalSeconds || 0) >= 18000 },
        { id: 'e18', code: '18', name: 'Легенда времени', cond: 'Наиграть 10+ часов в лаунчере', fn: (s) => (s.totalSeconds || 0) >= 36000 },
        { id: 'e19', code: '19', name: 'Коллекционер', cond: 'Подключить 3+ игры в лаунчере', fn: (s) => (s.installedCount || 0) >= 3 },
        { id: 'e20', code: '20', name: 'Полная полка', cond: 'Подключить 5+ игр в лаунчере', fn: (s) => (s.installedCount || 0) >= 5 },
        { id: 'e21', code: '21', name: 'Десять трофеев', cond: 'Открыть 10+ достижений в играх', fn: (s) => (s.achDone || 0) >= 10 },
        { id: 'e22', code: '22', name: 'Зал славы', cond: 'Открыть 25+ достижений в играх', fn: (s) => (s.achDone || 0) >= 25 },
        { id: 'e23', code: '23', name: 'Фотограф зон', cond: 'Сделать 3+ игровых скриншота', fn: (s) => (s.shotsCount || 0) >= 3 },
        { id: 'e24', code: '24', name: 'Кольцевой магнат', cond: 'Накопить 500+ Колец лаунчера', fn: (s, a) => (a.rings || 0) >= 500 }
    );

    function getChaoLevel(stats, st) {
        const xp = Math.floor((stats.totalSeconds || 0) / 180) + (st.chao?.xp || 0) + (stats.emeraldsCur || 0) * 12;
        return Math.max(1, Math.floor(xp / 25) + 1);
    }

    function determineChaoForm(stats) {
        const completed = (saveSummary.completedIds || new Array()).length;
        if ((stats.emeraldsCur || 0) >= 7 || completed >= 1) return { id: 'gold', name: 'Chaos Gold', body: '#facc15', tip: '#fef08a', belly: '#fffbeb', wing: '#fde047', halo: '#fef08a' };
        if ((stats.emeraldsCur || 0) >= 3 || (stats.achDone || 0) >= 10) return { id: 'hero', name: 'Hero Crystal', body: '#f8fafc', tip: '#38bdf8', belly: '#bae6fd', wing: '#7dd3fc', halo: '#facc15' };
        const h = new Date().getHours();
        if (h >= 22 || h < 5 || (stats.modsCount || 0) >= 5) return { id: 'dark', name: 'Dark Crystal', body: '#1e1b4b', tip: '#e11d48', belly: '#4c1d95', wing: '#f43f5e', halo: '#fb7185' };
        return { id: 'neutral', name: 'Neutral Crystal', body: '#38bdf8', tip: '#fde047', belly: '#bae6fd', wing: '#f472b6', halo: '#fde047' };
    }

    async function pullLiveStats() {
        await syncStateFromDisk();
        try {
            const p = await (await fetch('/api/profile_summary')).json();
            const c = await (await fetch('/api/challenges/stats')).json();
            const s = await (await fetch('/api/saves/summary')).json();
            liveStats = Object.assign(liveStats, p || {}, c || {});
            if (s && s.ok) saveSummary = s;
        } catch (_) {}
        evaluateEmblems();
    }

    function evaluateEmblems() {
        const st = loadState();
        let added = 0;
        EMBLEM_DEFS.forEach(em => {
            if (!st.emblems.includes(em.id) && em.fn(liveStats, st)) { st.emblems.push(em.id); st.rings = (st.rings || 0) + 25; added++; }
        });
        if (added > 0) {
            saveState(st);
            if (typeof showToast === 'function') showToast('Открыто новых эмблем: ' + added + ' (+' + (added * 25) + ' Колец)');
        }
    }

    async function captureGameSnapshot(gid) {
        let em = 0, lives = 0, score = 0, ach = 0, cleared = false;
        try {
            const pr = await (await fetch('/api/progress?id=' + encodeURIComponent(gid))).json();
            em = Number(pr.emeralds || 0);
            ach = (pr.achievements || new Array()).filter(a => a.done).length;
            (pr.slots || new Array()).forEach(sl => {
                const inf = String(sl.info || '');
                const ml = inf.match(/(?:Жизней|Lives):\s*(\d+)/i);
                const ms = inf.match(/(?:Очки|Score):\s*(\d+)/i);
                if (ml) lives = Math.max(lives, parseInt(ml.at(1), 10) || 0);
                if (ms) score = Math.max(score, parseInt(ms.at(1), 10) || 0);
                if (inf.toUpperCase().includes('CLEAR')) cleared = true;
            });
        } catch (_) {}
        return { em, lives, score, ach, cleared, ts: Date.now() };
    }

    async function activateChallenge(ch) {
        const st = loadState();
        const curG = (typeof availableGames !== 'undefined' && availableGames.length > 0) ? availableGames.at(selectedIndex) : null;
        const targetGid = ch.game === 'any' ? (curG ? curG.id : 'sonic1') : ch.game;
        const snap = await captureGameSnapshot(targetGid);
        st.activeCh = { id: ch.id, gameId: targetGid, snap };
        saveState(st);
        if (typeof playSfx === 'function') playSfx('switch');
        if (typeof showToast === 'function') showToast('Челлендж активирован: ' + ch.name);
    }

    async function verifyActiveChallenge(finishedGid, elapsedMins) {
        const st = loadState();
        if (!st.activeCh) return;
        const ch = CHAOS_CHALLENGES.find(x => x.id === st.activeCh.id);
        if (!ch || (ch.game !== 'any' && ch.game !== finishedGid)) return;
        const nowSnap = await captureGameSnapshot(finishedGid);
        const old = st.activeCh.snap || { em: 0, lives: 0, score: 0, ach: 0, cleared: false };
        let ok = false;
        if (ch.type === 'emeralds') ok = (nowSnap.em - old.em) >= ch.need;
        else if (ch.type === 'ach') ok = (nowSnap.ach - old.ach) >= ch.need;
        else if (ch.type === 'score') ok = (nowSnap.score - old.score) >= ch.need;
        else if (ch.type === 'lives') ok = (nowSnap.lives - old.lives) >= ch.need;
        else if (ch.type === 'mins') ok = elapsedMins >= ch.need;
        else if (ch.type === 'noloss') ok = elapsedMins >= ch.need && nowSnap.lives >= old.lives;
        else if (ch.type === 'clear') ok = nowSnap.cleared && !old.cleared;
        if (ok) {
            if (!st.doneCh.includes(ch.id)) st.doneCh.push(ch.id);
            st.rings = (st.rings || 0) + ch.reward; st.chao.xp = (st.chao.xp || 0) + 15; st.activeCh = null;
            saveState(st); if (typeof playSfx === 'function') playSfx('launch');
            if (typeof showToast === 'function') showToast('Челлендж выполнен: ' + ch.name + ' (+' + ch.reward + ' Колец)!');
            evaluateEmblems();
        }
    }

    function hookSessionTracking() {
        const origLaunch = window.triggerGameLaunch;
        if (typeof origLaunch === 'function' && !window._ahLaunchHooked) {
            window._ahLaunchHooked = true;
            window.triggerGameLaunch = function(game) {
                if (game) {
                    const st = loadState();
                    const hr = new Date().getHours();
                    if (hr >= 23 || hr < 5) { st.nightRun = true; saveState(st); }
                    logHeatmap(0, 1, game.name || game.id);
                }
                return origLaunch.apply(this, arguments);
            };
        }
        setInterval(async () => {
            try {
                const r = await (await fetch('/api/playtime_ping')).json();
                const runId = r.runningId || null;
                if (runId && !wasRunning) wasRunning = { id: runId, ts: Date.now() };
                else if (!runId && wasRunning) {
                    const mins = Math.max(0.5, (Date.now() - wasRunning.ts) / 60000);
                    logHeatmap(mins, 0, wasRunning.id);
                    const st = loadState(); st.chao.xp = (st.chao.xp || 0) + Math.floor(mins); saveState(st);
                    await verifyActiveChallenge(wasRunning.id, mins);
                    wasRunning = null; pullLiveStats();
                }
            } catch (_) {}
        }, 6000);
    }

    function mountChaoCanvas(host, form, onPet) {
        if (chaoRaf) cancelAnimationFrame(chaoRaf);
        host.innerHTML = '';
        const cvs = mk('canvas', '', 'width:100%;height:100%;display:block;');
        host.appendChild(cvs);
        const ctx = cvs.getContext('2d');
        let yaw = 0.18, pitch = 0.04, drag = false, lx = 0, ly = 0, bounce = 0, emoTimer = 0, emoShape = 'ball';
        const sparks = new Array();

        cvs.onpointerdown = e => { drag = true; lx = e.clientX; ly = e.clientY; cvs.setPointerCapture(e.pointerId); };
        cvs.onpointermove = e => {
            if (!drag) return;
            yaw += (e.clientX - lx) * 0.015;
            pitch = Math.max(-0.35, Math.min(0.35, pitch + (e.clientY - ly) * 0.01));
            lx = e.clientX; ly = e.clientY;
        };
        cvs.onpointerup = e => {
            if (drag && Math.hypot(e.clientX - lx, e.clientY - ly) < 6) {
                bounce = 1; emoTimer = 110;
                const shapes = Array.of('heart', 'star', 'halo');
                emoShape = shapes.at(Math.floor(Math.random() * shapes.length));
                onPet();
                for (let i = 0; i < 16; i++) {
                    const ang = (i / 16) * Math.PI * 2;
                    sparks.push({ x: cvs.width * 0.5, y: cvs.height * 0.36, vx: Math.cos(ang) * (1.8 + Math.random() * 2.8), vy: Math.sin(ang) * (1.8 + Math.random() * 2.8) - 1.2, life: 1, sz: 2 + Math.random() * 2.5 });
                }
            }
            drag = false;
        };

        function drawEmo(cx, oy, col, shape, t) {
            ctx.save(); ctx.translate(cx, oy); ctx.shadowColor = col; ctx.shadowBlur = 18;
            ctx.fillStyle = col; ctx.strokeStyle = col;
            if (shape === 'heart') {
                const sc = 1 + Math.sin(t * 0.015) * 0.12; ctx.scale(sc, sc);
                ctx.beginPath(); ctx.moveTo(0, 6);
                ctx.bezierCurveTo(-12, -4, -10, -14, 0, -6);
                ctx.bezierCurveTo(10, -14, 12, -4, 0, 6); ctx.fill();
            } else if (shape === 'star') {
                ctx.rotate(t * 0.004);
                ctx.beginPath();
                for (let i = 0; i < 10; i++) {
                    const r = i % 2 === 0 ? 11 : 5, a = (i * Math.PI) / 5 - Math.PI * 0.5;
                    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                }
                ctx.closePath(); ctx.fill();
            } else if (shape === 'halo') {
                ctx.lineWidth = 3.2; ctx.beginPath(); ctx.ellipse(0, 0, 24, 7.5, 0, 0, Math.PI * 2); ctx.stroke();
            } else {
                const g = ctx.createRadialGradient(-3, -3, 1, 0, 0, 10);
                g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, col); g.addColorStop(1, 'rgba(255,255,255,0.1)');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 9.5, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }
        function frame(t) {
            if (!cvs.isConnected) return;
            chaoRaf = requestAnimationFrame(frame);
            const w = host.clientWidth || 320, h = host.clientHeight || 360;
            if (cvs.width !== w || cvs.height !== h) { cvs.width = w; cvs.height = h; }
            if (!drag) yaw += 0.011;
            bounce *= 0.88;
            if (emoTimer > 0) emoTimer--;
            ctx.clearRect(0, 0, w, h);

            const breath = Math.sin(t * 0.0032) * 0.03;
            const bob = Math.sin(t * 0.0038) * 6.5 - bounce * 18;
            const cx = w * 0.5, cy = h * 0.56 + bob + pitch * 18;
            const sinY = Math.sin(yaw), cosY = Math.cos(yaw), faceX = sinY * 20;

            ctx.fillStyle = 'rgba(0,0,0,0.42)';
            ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.86, 52 * (1 - bounce * 0.2), 12, 0, 0, Math.PI * 2); ctx.fill();

            // Полупрозрачные крылышки за спиной
            const flap = Math.sin(t * 0.011) * 0.22;
            ctx.save(); ctx.globalAlpha = 0.72; ctx.fillStyle = form.wing; ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.2;
            ctx.save(); ctx.translate(cx - 22, cy + 20); ctx.rotate(-0.55 - flap);
            ctx.beginPath(); ctx.ellipse(-10, 0, 15, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
            ctx.save(); ctx.translate(cx + 22, cy + 20); ctx.rotate(0.55 + flap);
            ctx.beginPath(); ctx.ellipse(10, 0, 15, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
            ctx.restore();

            // Ножки
            ctx.fillStyle = form.body;
            ctx.beginPath(); ctx.ellipse(cx - 13 + sinY * 5, cy + 62, 10, 14, -0.18, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(cx + 13 + sinY * 5, cy + 62, 10, 14, 0.18, 0, Math.PI * 2); ctx.fill();

            // Единый плавный силуэт: туловище + шея + каплевидная голова с хохолком
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(1 + breath, 1 - breath * 0.7);
            const bodyG = ctx.createRadialGradient(-12, -26, 8, 0, 12, 86);
            bodyG.addColorStop(0, '#ffffff'); bodyG.addColorStop(0.28, form.body); bodyG.addColorStop(0.82, form.belly); bodyG.addColorStop(1, form.body);
            ctx.fillStyle = bodyG; ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(-sinY * 14, -84);
            ctx.bezierCurveTo(22, -74, 46, -42, 44, -14);
            ctx.bezierCurveTo(42, 2, 24, 6, 22, 12);
            ctx.bezierCurveTo(32, 24, 30, 56, 0, 58);
            ctx.bezierCurveTo(-30, 56, -32, 24, -22, 12);
            ctx.bezierCurveTo(-24, 6, -42, 2, -44, -14);
            ctx.bezierCurveTo(-46, -42, -22, -74, -sinY * 14, -84);
            ctx.closePath(); ctx.fill(); ctx.stroke();

            // Кончик хохолка
            ctx.fillStyle = form.tip;
            ctx.beginPath(); ctx.arc(-sinY * 13, -76, 8.5, 0, Math.PI * 2); ctx.fill();

            // Ручки-лапки
            const armW = Math.sin(t * 0.005) * 0.22;
            ctx.save(); ctx.translate(-26, 22); ctx.rotate(0.5 + armW);
            ctx.fillStyle = form.body; ctx.beginPath(); ctx.ellipse(0, 8, 8.5, 16, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = form.tip; ctx.beginPath(); ctx.arc(0, 19, 6.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            ctx.save(); ctx.translate(26, 22); ctx.rotate(-0.5 - armW);
            ctx.fillStyle = form.body; ctx.beginPath(); ctx.ellipse(0, 8, 8.5, 16, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = form.tip; ctx.beginPath(); ctx.arc(0, 19, 6.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();

            // Глаза с двумя бликами, морганием и румянцем
            if (cosY > -0.2) {
                const blink = (t % 3800) < 130 ? 0.14 : 1;
                ctx.globalAlpha = Math.max(0.25, cosY);
                const ex1 = faceX - 15 * cosY, ex2 = faceX + 15 * cosY, ey = -22;
                ctx.fillStyle = 'rgba(244,114,182,0.34)';
                ctx.beginPath(); ctx.ellipse(ex1 - 7, ey + 10, 6.5, 3.6, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(ex2 + 7, ey + 10, 6.5, 3.6, 0, 0, Math.PI * 2); ctx.fill();
                Array.of(ex1, ex2).forEach(ex => {
                    ctx.fillStyle = '#0f172a';
                    ctx.beginPath(); ctx.ellipse(ex, ey, 7.5 * Math.max(0.45, cosY), 11 * blink, 0, 0, Math.PI * 2); ctx.fill();
                    if (blink > 0.3) {
                        ctx.fillStyle = '#38bdf8';
                        ctx.beginPath(); ctx.ellipse(ex, ey + 3, 5 * Math.max(0.45, cosY), 6, 0, 0, Math.PI * 2); ctx.fill();
                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath(); ctx.arc(ex - 2.2, ey - 4.2, 2.8, 0, Math.PI * 2); ctx.fill();
                        ctx.beginPath(); ctx.arc(ex + 2.4, ey + 2.2, 1.3, 0, Math.PI * 2); ctx.fill();
                    }
                });
                ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(faceX, ey + 11, 4.5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
            }
            ctx.restore();

            const defShape = (form.id === 'hero' || form.id === 'gold') ? 'halo' : 'ball';
            drawEmo(cx, cy - 106 + Math.sin(t * 0.006) * 5, form.halo, emoTimer > 0 ? emoShape : defShape, t);

            for (let i = sparks.length - 1; i >= 0; i--) {
                const sp = sparks.at(i); sp.x += sp.vx; sp.y += sp.vy; sp.life -= 0.028;
                if (sp.life <= 0) { sparks.splice(i, 1); continue; }
                ctx.fillStyle = 'rgba(253,224,71,' + sp.life.toFixed(2) + ')';
                ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.sz, 0, Math.PI * 2); ctx.fill();
            }
        }
        chaoRaf = requestAnimationFrame(frame);
    }

    function renderChaoTab(body, refreshHeader) {
        body.innerHTML = '';
        const st = loadState(), form = determineChaoForm(liveStats), lv = getChaoLevel(liveStats, st);
        const fullness = Math.min(100, 30 + (st.chao.feed || 0) * 14 + Math.floor((liveStats.totalSeconds || 0) / 600) * 5);
        const xpPct = ((Math.floor((liveStats.totalSeconds || 0) / 180) + (st.chao.xp || 0) + (liveStats.emeraldsCur || 0) * 12) % 25) * 4;

        const grid = mk('div', 'ah-chao-grid', '');
        const stage = mk('div', 'ah-stage', '');
        const info = mk('div', '', 'display:flex;flex-direction:column;gap:10px;');

        const c1 = mk('div', 'ah-card', '');
        c1.append(
            mk('div', '', 'font-size:15px;font-weight:900;color:#fde047;', 'Кристальный Чао • Ур. ' + lv),
            mk('div', '', 'font-size:12px;color:#93c5fd;font-weight:700;', 'Форма эволюции: ' + form.name),
            mk('div', '', 'font-size:11.5px;opacity:0.78;line-height:1.45;', 'Вращай спутника мышью и кликай, чтобы погладить. Форма Чао растёт вместе с Изумрудами, трофеями и часами в играх.')
        );

        const mkMeter = (lbl, pct) => {
            const w = mk('div', '', 'display:flex;flex-direction:column;gap:4px;font-size:11.5px;');
            const b = mk('div', 'ah-bar', ''); b.appendChild(mk('i', '', 'width:' + pct + '%;', ''));
            w.append(mk('span', '', '', lbl + ': ' + pct + '%'), b);
            return w;
        };
        const c2 = mk('div', 'ah-card', '');
        c2.append(mkMeter('Сытость и настроение', fullness), mkMeter('Опыт до следующего уровня', xpPct));

        const actRow = mk('div', '', 'display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;');
        const feedB = mk('button', 'btn-small btn-accent', 'padding:8px 14px;font-weight:800;', 'Покормить (-10 Колец)');
        feedB.type = 'button';
        feedB.onclick = () => {
            const cur = loadState();
            if ((cur.rings || 0) < 10) { if (typeof showToast === 'function') showToast('Недостаточно Колец лаунчера!', true); return; }
            cur.rings -= 10; cur.chao.feed = (cur.chao.feed || 0) + 1; cur.chao.xp = (cur.chao.xp || 0) + 10;
            saveState(cur); if (typeof playSfx === 'function') playSfx('launch');
            refreshHeader(); renderChaoTab(body, refreshHeader);
        };
        const dailyB = mk('button', 'btn-small', 'padding:8px 12px;', 'Бонус дня (+25 Колец)');
        dailyB.type = 'button';
        dailyB.onclick = () => {
            const cur = loadState(), tk = todayKey();
            if (cur.lastDaily === tk) { if (typeof showToast === 'function') showToast('Бонус дня уже получен сегодня!'); return; }
            cur.lastDaily = tk; cur.rings = (cur.rings || 0) + 25; saveState(cur);
            if (typeof playSfx === 'function') playSfx('launch');
            refreshHeader(); if (typeof showToast === 'function') showToast('Получено +25 Колец лаунчера!');
        };
        actRow.append(feedB, dailyB); c2.appendChild(actRow); info.append(c1, c2); grid.append(stage, info); body.appendChild(grid);
        mountChaoCanvas(stage, form, () => { const cur = loadState(); cur.chao.pet = (cur.chao.pet || 0) + 1; cur.chao.xp = (cur.chao.xp || 0) + 2; saveState(cur); if (typeof playSfx === 'function') playSfx('switch'); });
    }

    function renderChallengesTab(body, refreshHeader) {
        body.innerHTML = '';
        const st = loadState();
        const top = mk('div', '', 'display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;');
        top.appendChild(mk('span', '', 'font-size:12px;font-weight:800;color:#4ade80;', 'Выполнено вызовов: ' + (st.doneCh || new Array()).length + ' / ' + CHAOS_CHALLENGES.length));
        const rndBtn = mk('button', 'btn-small btn-accent', 'padding:7px 14px;font-weight:800;', 'Случайный вызов (Chaos Roulette)');
        rndBtn.type = 'button';
        rndBtn.onclick = async () => {
            const pool = CHAOS_CHALLENGES.filter(c => !(st.doneCh || new Array()).includes(c.id));
            const list = pool.length > 0 ? pool : CHAOS_CHALLENGES;
            const pick = list.at(Math.floor(Math.random() * list.length));
            if (pick) { await activateChallenge(pick); renderChallengesTab(body, refreshHeader); }
        };
        top.appendChild(rndBtn); body.appendChild(top);

        if (st.activeCh) {
            const ach = CHAOS_CHALLENGES.find(x => x.id === st.activeCh.id);
            if (ach) {
                const ban = mk('div', 'ah-card', 'border-color:#fde047;background:rgba(250,204,21,0.1);margin-bottom:10px;flex-direction:row;justify-content:space-between;align-items:center;');
                const l = mk('div', '', '');
                l.append(mk('div', '', 'font-size:12px;font-weight:900;color:#fde047;', 'АКТИВНЫЙ ВЫЗОВ: ' + ach.name), mk('div', '', 'font-size:11px;opacity:0.85;', ach.desc + ' • Запустите игру — проверка сработает после выхода!'));
                const cancelB = mk('button', 'btn-small btn-clear', '', 'Отменить');
                cancelB.type = 'button'; cancelB.onclick = () => { const s2 = loadState(); s2.activeCh = null; saveState(s2); renderChallengesTab(body, refreshHeader); };
                ban.append(l, cancelB); body.appendChild(ban);
            }
        }

        const list = mk('div', '', 'display:flex;flex-direction:column;gap:7px;');
        CHAOS_CHALLENGES.forEach(ch => {
            const done = (st.doneCh || new Array()).includes(ch.id), isAct = st.activeCh && st.activeCh.id === ch.id;
            const row = mk('div', 'mod-item', 'padding:9px 12px;border-left:3px solid ' + (done ? '#4ade80' : (isAct ? '#fde047' : '#3b82f6')) + ';');
            const inf = mk('div', 'mod-info', 'flex:1;');
            inf.append(mk('div', 'mod-title', 'font-size:12.5px;color:' + (done ? '#4ade80' : '#fff') + ';', (done ? '[OK] ' : '') + ch.name + ' (+' + ch.reward + ' Колец)'), mk('div', 'mod-author', '', ch.desc));
            const btn = mk('button', 'btn-small ' + (done ? '' : 'btn-accent'), '', done ? 'Выполнено' : (isAct ? 'Активен' : 'Принять'));
            btn.type = 'button'; btn.disabled = done;
            btn.onclick = async () => { await activateChallenge(ch); renderChallengesTab(body, refreshHeader); };
            row.append(inf, btn); list.appendChild(row);
        });
        body.appendChild(list);
    }

    function renderEmblemsTab(body) {
        body.innerHTML = ''; evaluateEmblems();
        const st = loadState(), unlocked = new Set(st.emblems || new Array());
        body.appendChild(mk('div', '', 'font-size:12.5px;font-weight:800;color:#fde047;margin-bottom:8px;', 'Стена Эмблем SA2 (' + unlocked.size + ' / ' + EMBLEM_DEFS.length + ')'));

        const grid = mk('div', 'ah-emb-grid', '');
        EMBLEM_DEFS.forEach(em => {
            const isOn = unlocked.has(em.id);
            const cell = mk('div', 'ah-emb ' + (isOn ? 'on' : 'off'), '');
            const badge = mk('div', '', 'width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;border:2px solid ' + (isOn ? '#fde047' : '#64748b') + ';color:' + (isOn ? '#fde047' : '#94a3b8') + ';background:rgba(0,0,0,0.35);', '#' + em.code);
            cell.append(badge, mk('div', '', 'font-weight:800;color:' + (isOn ? '#fde047' : '#cbd5e1') + ';', em.name), mk('div', '', 'font-size:9.5px;opacity:0.75;line-height:1.25;', em.cond));
            grid.appendChild(cell);
        });
        body.appendChild(grid);

        body.appendChild(mk('div', '', 'font-size:12.5px;font-weight:800;color:#34d399;margin-bottom:6px;', 'Карта активности за год'));
        const hWrap = mk('div', 'ah-heat-wrap', ''), hGrid = mk('div', 'ah-heat-grid', ''), hm = st.heatmap || {}, now = new Date();
        for (let d = 363; d >= 0; d--) {
            const dt = new Date(now.getTime() - d * 86400000);
            const key = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
            const rec = hm[key] || { mins: 0, launches: 0 }, score = rec.mins + rec.launches * 4;
            const lvl = score >= 45 ? 'ah-c4' : (score >= 20 ? 'ah-c3' : (score >= 8 ? 'ah-c2' : (score > 0 ? 'ah-c1' : '')));
            const sq = mk('div', 'ah-cell ' + lvl, ''); sq.title = key + ': ' + rec.mins + ' мин., запусков: ' + rec.launches;
            hGrid.appendChild(sq);
        }
        hWrap.appendChild(hGrid); body.appendChild(hWrap);
    }

    function stopQuizAudio() { if (quizTimer) { clearTimeout(quizTimer); quizTimer = 0; } if (quizAudio) { quizAudio.pause(); quizAudio = null; } }

    function renderArcadeTab(body, refreshHeader) {
        body.innerHTML = ''; stopQuizAudio();
        const grid = mk('div', '', 'display:grid;grid-template-columns:1fr 1fr;gap:14px;');
        const slotCard = mk('div', 'ah-card', '');
        slotCard.append(
            mk('div', '', 'font-size:14px;font-weight:900;color:#fde047;', 'Casino Night Slots'),
            mk('div', '', 'font-size:11px;opacity:0.78;', 'Ставка: 15 Колец. Выбивайте комбинации, Джекпот 777 и редкие титулы профиля!')
        );

        const SYMS = Array.of(
            { id: 'SONIC', col: '#38bdf8', tag: 'SPEED' },
            { id: 'TAILS', col: '#fb923c', tag: 'FLY' },
            { id: 'KNUX',  col: '#f87171', tag: 'POWER' },
            { id: 'RING',  col: '#facc15', tag: 'BONUS' },
            { id: '777',   col: '#fde047', tag: 'JACKPOT' }
        );

        const wrap = mk('div', 'ah-slots-wrap', '');
        const winLine = mk('div', 'ah-win-line', '');
        const reelsBox = mk('div', 'ah-slots', '');
        const fxCvs = mk('canvas', 'ah-slot-fx', '');
        const strips = new Array();

        function makeSymEl(sym) {
            const it = mk('div', 'ah-reel-item', '');
            it.append(
                mk('span', '', 'font-size:19px;font-weight:900;letter-spacing:1px;color:' + sym.col + ';text-shadow:0 0 12px ' + sym.col + ';', sym.id),
                mk('span', '', 'font-size:9px;font-weight:800;opacity:0.65;letter-spacing:1.2px;', sym.tag)
            );
            return it;
        }

        for (let r = 0; r < 3; r++) {
            const reel = mk('div', 'ah-reel', '');
            const strip = mk('div', 'ah-reel-strip', '');
            for (let k = 0; k < 24; k++) strip.appendChild(makeSymEl(SYMS.at(k % SYMS.length)));
            strip.style.transform = 'translateY(-384px)';
            reel.appendChild(strip); reelsBox.appendChild(reel); strips.push(strip);
        }
        wrap.append(winLine, reelsBox, fxCvs);

        function burstGoldParticles() {
            fxCvs.width = wrap.clientWidth || 360; fxCvs.height = wrap.clientHeight || 100;
            const ctx = fxCvs.getContext('2d'), pts = new Array();
            for (let i = 0; i < 36; i++) {
                pts.push({ x: fxCvs.width * (0.2 + Math.random() * 0.6), y: fxCvs.height * 0.5, vx: (Math.random() - 0.5) * 7, vy: -2 - Math.random() * 5, life: 1, r: 2.5 + Math.random() * 3 });
            }
            function step() {
                if (!fxCvs.isConnected) return;
                ctx.clearRect(0, 0, fxCvs.width, fxCvs.height);
                let alive = 0;
                pts.forEach(p => {
                    if (p.life <= 0) return;
                    alive++; p.x += p.vx; p.y += p.vy; p.vy += 0.22; p.life -= 0.025;
                    ctx.fillStyle = 'rgba(250,204,21,' + Math.max(0, p.life).toFixed(2) + ')';
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
                });
                if (alive > 0) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        }

        const resLbl = mk('div', '', 'font-size:12px;font-weight:700;text-align:center;min-height:20px;color:#93c5fd;', 'Нажмите «Крутить», чтобы испытать удачу');
        const spinBtn = mk('button', 'btn-small btn-accent', 'padding:9px;font-weight:900;', 'Крутить барабан (-15 Колец)');
        spinBtn.type = 'button';

        let spinning = false;
        spinBtn.onclick = () => {
            if (spinning) return;
            const st = loadState();
            if ((st.rings || 0) < 15) { if (typeof showToast === 'function') showToast('Недостаточно Колец (нужно 15)!', true); return; }
            st.rings -= 15; st.spins = (st.spins || 0) + 1; saveState(st); refreshHeader();
            spinning = true; spinBtn.disabled = true; winLine.classList.remove('lit');
            if (typeof playSfx === 'function') playSfx('switch');

            const chosenIdx = Array.of(
                Math.floor(Math.random() * SYMS.length),
                Math.floor(Math.random() * SYMS.length),
                Math.floor(Math.random() * SYMS.length)
            );
            const durations = Array.of(900, 1400, 1900);
            const t0 = performance.now();

            strips.forEach((strip, idx) => {
                const dur = durations.at(idx);
                const targetSlot = 15 + chosenIdx.at(idx);
                const targetY = targetSlot * 96;
                function animReel(now) {
                    const p = Math.min(1, (now - t0) / dur);
                    const ease = 1 - Math.pow(1 - p, 3);
                    const bounceOff = p > 0.88 ? Math.sin(((p - 0.88) / 0.12) * Math.PI) * 14 : 0;
                    const y = ease * targetY + bounceOff;
                    strip.style.transform = 'translateY(' + (-y).toFixed(1) + 'px)';
                    strip.style.filter = p < 0.72 ? 'blur(1.2px)' : 'none';
                    if (p < 1) requestAnimationFrame(animReel);
                    else {
                        strip.style.transform = 'translateY(' + (-targetY) + 'px)';
                        strip.style.filter = 'none';
                        if (typeof playSfx === 'function') playSfx('switch');
                    }
                }
                requestAnimationFrame(animReel);
            });

            setTimeout(() => {
                spinning = false; spinBtn.disabled = false;
                const a = SYMS.at(chosenIdx.at(0)).id, b = SYMS.at(chosenIdx.at(1)).id, c = SYMS.at(chosenIdx.at(2)).id;
                const cur = loadState();
                let won = false;
                if (a === '777' && b === '777' && c === '777') { cur.rings += 300; cur.slotJackpot = true; resLbl.textContent = 'ДЖЕКПОТ 777! +300 Колец!'; won = true; }
                else if (a === b && b === c) { cur.rings += 120; resLbl.textContent = 'Тройное совпадение! +120 Колец!'; won = true; }
                else if (a === b || b === c || a === c) { cur.rings += 35; resLbl.textContent = 'Пара! +35 Колец!'; won = true; }
                else { resLbl.textContent = 'В этот раз не повезло — попробуй ещё!'; }

                if (won) { winLine.classList.add('lit'); burstGoldParticles(); }
                if (won && Math.random() < 0.45) {
                    const lockedT = RARE_TITLES.filter(t => !(cur.titles || new Array()).includes(t));
                    if (lockedT.length > 0) {
                        const wonT = lockedT.at(Math.floor(Math.random() * lockedT.length));
                        cur.titles.push(wonT); cur.activeTitle = wonT;
                        resLbl.textContent += ' Новый титул: ' + wonT;
                    }
                }
                saveState(cur); refreshHeader(); evaluateEmblems(); updateTitlePicker();
                if (typeof playSfx === 'function') playSfx('launch');
            }, 1960);
        };

        const titleSel = mk('select', 'custom-select', 'margin-top:4px;');
        function updateTitlePicker() {
            const cur = loadState(); titleSel.innerHTML = '';
            const o0 = mk('option', '', '', '-- Активный титул профиля --'); o0.value = ''; titleSel.appendChild(o0);
            (cur.titles || new Array()).forEach(t => { const o = mk('option', '', '', t); o.value = t; titleSel.appendChild(o); });
            titleSel.value = cur.activeTitle || '';
        }
        titleSel.onchange = () => { const cur = loadState(); cur.activeTitle = titleSel.value; saveState(cur); refreshHeader(); };
        updateTitlePicker();
        slotCard.append(wrap, resLbl, spinBtn, titleSel);
        grid.appendChild(slotCard);
        renderQuizCard(grid, refreshHeader);
        body.appendChild(grid);
    }

    function renderQuizCard(grid, refreshHeader) {
        const card = mk('div', 'ah-card', '');
        let streak = 0;
        const st = loadState();
        const hdr = mk('div', '', 'display:flex;align-items:center;gap:6px;font-size:14px;font-weight:900;color:#67e8f9;', '');
        hdr.innerHTML = SVG_NOTE + '<span>Викторина «Угадай трек»</span>';
        const info = mk('div', '', 'font-size:11px;opacity:0.8;', 'Слушайте 5-секундный фрагмент из Jukebox и угадывайте название (+15 Колец за ответ).');
        const stLbl = mk('div', '', 'font-size:11.5px;font-weight:800;color:#4ade80;', 'Серия: 0 • Рекорд: ' + (st.quizBest || 0));
        const playBtn = mk('button', 'btn-small btn-accent', 'padding:8px;font-weight:800;', 'Начать раунд (5 сек.)');
        playBtn.type = 'button';
        const optsBox = mk('div', 'ah-quiz-opts', '');

        playBtn.onclick = async () => {
            stopQuizAudio(); optsBox.innerHTML = '';
            let pool = new Array();
            try { const jl = await (await fetch('/api/jukebox/list')).json(); pool = (jl.tracks || new Array()).slice(); } catch (_) {}
            if (typeof soundsMap === 'object' && soundsMap) {
                Object.keys(soundsMap).forEach(k => { if (k.endsWith('_bgm') && soundsMap[k]) pool.push({ title: k.replace('_bgm', '').toUpperCase() + ' BGM', url: soundsMap[k] }); });
            }
            if (pool.length < 2) {
                optsBox.appendChild(mk('div', '', 'grid-column:1/-1;font-size:11.5px;opacity:0.7;text-align:center;padding:12px;', 'Добавьте минимум 2 трека в OST Jukebox (sounds/music), чтобы играть!'));
                return;
            }
            const target = pool.at(Math.floor(Math.random() * pool.length));
            const choices = Array.of(target);
            const others = pool.filter(x => x.url !== target.url);
            while (choices.length < Math.min(4, pool.length) && others.length > 0) {
                choices.push(others.splice(Math.floor(Math.random() * others.length), 1).at(0));
            }
            choices.sort(() => Math.random() - 0.5);
            if (window.currentBgmAudio && !window.currentBgmAudio.paused) window.currentBgmAudio.pause();
            quizAudio = new Audio(target.url); quizAudio.volume = 0.65;
            quizAudio.addEventListener('loadedmetadata', () => { if (quizAudio && isFinite(quizAudio.duration) && quizAudio.duration > 10) quizAudio.currentTime = Math.random() * (quizAudio.duration - 7); });
            quizAudio.play().catch(() => {});
            quizTimer = setTimeout(() => { if (quizAudio) quizAudio.pause(); }, 5000);

            choices.forEach(ch => {
                const b = mk('button', 'btn-small', 'padding:8px;font-size:11px;white-space:normal;', ch.title);
                b.type = 'button';
                b.onclick = () => {
                    stopQuizAudio();
                    const cur = loadState();
                    if (ch.url === target.url) {
                        streak++; cur.rings = (cur.rings || 0) + 15;
                        if (streak > (cur.quizBest || 0)) cur.quizBest = streak;
                        saveState(cur); refreshHeader(); evaluateEmblems();
                        if (typeof playSfx === 'function') playSfx('launch');
                        if (typeof showToast === 'function') showToast('Верно! +15 Колец (Серия: ' + streak + ')');
                    } else {
                        streak = 0; if (typeof playSfx === 'function') playSfx('close_menu');
                        if (typeof showToast === 'function') showToast('Мимо! Это был: ' + target.title, true);
                    }
                    stLbl.textContent = 'Серия: ' + streak + ' • Рекорд: ' + (loadState().quizBest || 0);
                    optsBox.innerHTML = '';
                };
                optsBox.appendChild(b);
            });
        };
        card.append(hdr, info, stLbl, playBtn, optsBox); grid.appendChild(card);
    }

    window.openArcadeHubModal = async function(initialTab) {
        injectStyles(); await pullLiveStats();
        document.getElementById('sgl-arcade-hub-modal')?.remove();
        if (chaoRaf) cancelAnimationFrame(chaoRaf);
        stopQuizAudio();

        const bg = mk('div', 'modal-backdrop active', 'z-index:9896;');
        bg.id = 'sgl-arcade-hub-modal';
        const closeAll = () => { if (chaoRaf) cancelAnimationFrame(chaoRaf); stopQuizAudio(); bg.remove(); };
        bg.onclick = e => { if (e.target === bg) closeAll(); };

        const box = mk('div', 'modal-box ah-modal', '');
        const top = mk('div', 'ah-top', '');
        const tLeft = mk('div', '', 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;');
        const mTitle = mk('div', 'modal-title', 'margin:0;display:flex;align-items:center;gap:8px;', '');
        mTitle.innerHTML = SVG_PAD + '<span>Аркада и Экстра</span>';
        const titleBadge = mk('span', 'ah-title-pill', '', '');
        const ringsBadge = mk('span', 'ah-rings', '', '');
        tLeft.append(mTitle, titleBadge);
        top.append(tLeft, ringsBadge);

        function refreshHeader() {
            const st = loadState();
            ringsBadge.innerHTML = SVG_RING + '<span>Колец лаунчера: ' + (st.rings || 0) + '</span>';
            titleBadge.textContent = st.activeTitle || '';
            titleBadge.style.display = st.activeTitle ? 'inline-block' : 'none';
        }
        refreshHeader();

        const tabsBar = mk('div', 'tabs-bar', 'margin-bottom:0;');
        const body = mk('div', 'ah-body', '');
        const TABS = Array.of(
            { id: 'chao', lbl: 'Кристальный Чао', fn: () => renderChaoTab(body, refreshHeader) },
            { id: 'challenges', lbl: 'Челленджи Хаоса', fn: () => renderChallengesTab(body, refreshHeader) },
            { id: 'emblems', lbl: 'Эмблемы и Активность', fn: () => renderEmblemsTab(body) },
            { id: 'arcade', lbl: 'Мини-аркада', fn: () => renderArcadeTab(body, refreshHeader) }
        );
        const tabBtns = new Array();
        function switchTab(id) {
            if (chaoRaf) cancelAnimationFrame(chaoRaf);
            stopQuizAudio();
            TABS.forEach((t, idx) => { const act = t.id === id; tabBtns.at(idx).classList.toggle('active', act); if (act) t.fn(); });
        }
        TABS.forEach(t => {
            const b = mk('button', 'tab-btn', '', t.lbl); b.type = 'button';
            b.onclick = () => { if (typeof playSfx === 'function') playSfx('switch'); switchTab(t.id); };
            tabBtns.push(b); tabsBar.appendChild(b);
        });

        const closeB = mk('button', 'close-modal-btn', 'margin-top:0;', 'Закрыть');
        closeB.type = 'button'; closeB.onclick = closeAll;
        box.append(top, tabsBar, body, closeB); bg.appendChild(box); document.body.appendChild(bg);
        switchTab(initialTab || 'chao');
        if (typeof playSfx === 'function') playSfx('open_menu');
    };

    function injectEntryPoints() {
        const obs = new MutationObserver(() => {
            const pModal = document.getElementById('profile-stats-modal');
            const pBody = document.getElementById('profile-stats-body');
            if (pModal && pModal.classList.contains('active') && pBody && !document.getElementById('sgl-open-arcade-banner')) {
                const st = loadState();
                const ban = mk('div', '', 'display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 14px;border-radius:10px;background:linear-gradient(90deg,rgba(56,189,248,0.16),rgba(250,204,21,0.12));border:1px solid rgba(56,189,248,0.4);margin-bottom:8px;');
                ban.id = 'sgl-open-arcade-banner';
                const btn = mk('button', 'btn-small btn-accent', 'font-weight:900;padding:6px 14px;display:inline-flex;align-items:center;gap:6px;', '');
                btn.type = 'button'; btn.innerHTML = SVG_PAD + '<span>Аркада и Экстра</span>'; btn.onclick = () => window.openArcadeHubModal();
                const lblTxt = 'Кристальный Чао, Челленджи и Эмблемы' + (st.activeTitle ? (' • ' + st.activeTitle) : '');
                ban.append(mk('span', '', 'font-size:12px;font-weight:800;color:#67e8f9;', lblTxt), btn);
                pBody.prepend(ban);
            }
            document.querySelectorAll('button').forEach(b => {
                const txt = (b.textContent || '').trim();
                if ((txt.includes('Гайды и читы') || txt.includes('Guides & Cheats')) && b.parentElement && !b.parentElement.querySelector('#sgl-dd-arcade-hub')) {
                    const nb = mk('button', b.className, 'display:inline-flex;align-items:center;justify-content:flex-start;gap:8px;text-align:left;', '');
                    nb.type = 'button'; nb.id = 'sgl-dd-arcade-hub'; nb.innerHTML = SVG_PAD + '<span>Аркада и Экстра</span>';
                    nb.onclick = () => window.openArcadeHubModal(); b.after(nb);
                }
            });
        });
        obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: Array.of('class') });
    }

    const _boot = () => { syncStateFromDisk(); injectStyles(); hookSessionTracking(); injectEntryPoints(); setTimeout(pullLiveStats, 1200); };
    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', _boot); else _boot();
})();
