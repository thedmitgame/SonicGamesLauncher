/* === CHALLENGES SYSTEM, ZEN CLEAN MODE (H) & RANDOM LOOK DICE === */
(function() {
    let zenActive = false;
    let backupBeforeDice = null;

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function injectZenCss() {
        if (document.getElementById('sgl-zen-css')) return;
        const st = mk('style', '', '');
        st.id = 'sgl-zen-css';
        st.textContent = Array.of(
            'header, footer, .carousel-wrapper, #active-logo-stage, #m5-top-bar, #m4-btn, #m6-lang-select, #sgl-jukebox, #sgl-cat-bar, .corner-btn, .sgl-hud-widget{transition:opacity 0.35s ease, transform 0.35s ease;}',
            'body.sgl-zen-mode header, body.sgl-zen-mode footer, body.sgl-zen-mode .carousel-wrapper, body.sgl-zen-mode #active-logo-stage, body.sgl-zen-mode #m5-top-bar, body.sgl-zen-mode #m4-btn, body.sgl-zen-mode #m6-lang-select, body.sgl-zen-mode #sgl-jukebox, body.sgl-zen-mode #sgl-cat-bar, body.sgl-zen-mode .corner-btn, body.sgl-zen-mode .sgl-hud-widget{opacity:0 !important;pointer-events:none !important;}',
            'body.sgl-zen-mode header{transform:translateY(-24px) !important;}',
            'body.sgl-zen-mode footer{transform:translateY(24px) !important;}',
            '#sgl-zen-pill{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:9400;padding:6px 16px;border-radius:999px;background:rgba(10,15,28,0.65);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.16);color:rgba(255,255,255,0.75);font-size:11px;font-weight:700;display:none;cursor:pointer;transition:opacity 0.25s;}',
            'body.sgl-zen-mode #sgl-zen-pill{display:block;}',
            '#sgl-zen-pill:hover{color:#FFD700;border-color:#FFD700;}'
        ).join('\n');
        document.head.appendChild(st);

        const pill = mk('div', '', '', 'Чистый экран (Zen) • Нажмите H или кликните, чтобы вернуть интерфейс');
        pill.id = 'sgl-zen-pill';
        pill.onclick = () => window.toggleZenCleanMode(false);
        document.body.appendChild(pill);
    }

    window.toggleZenCleanMode = function(force) {
        injectZenCss();
        zenActive = (typeof force === 'boolean') ? force : !zenActive;
        document.body.classList.toggle('sgl-zen-mode', zenActive);
        if (typeof playSfx === 'function') playSfx('switch');
    };

    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
        const modalOpen = document.querySelector('.modal-backdrop.active') !== null
            || document.getElementById('m4-modal')?.classList.contains('open')
            || document.body.classList.contains('hud-editing')
            || document.body.classList.contains('minidock-mode');
        if (modalOpen) return;

        if (e.code === 'KeyH') {
            e.preventDefault();
            window.toggleZenCleanMode();
        } else if (e.key === 'Escape' && zenActive) {
            e.preventDefault();
            window.toggleZenCleanMode(false);
        }
    });

    const HARMONIC_PALETTES = Array.of(
        { bg: Array.of('#041436', '#0066FF'), title: '#FFD700', text: '#FFFFFF', light: false },
        { bg: Array.of('#1E1B4B', '#DB2777'), title: '#F472B6', text: '#F8FAFC', light: false },
        { bg: Array.of('#022C22', '#059669'), title: '#34D399', text: '#ECFDF5', light: false },
        { bg: Array.of('#2E1005', '#D97706'), title: '#FDE047', text: '#FFFBEB', light: false },
        { bg: Array.of('#090D16', '#3B82F6'), title: '#38BDF8', text: '#F1F5F9', light: false },
        { bg: Array.of('#27091C', '#E11D48'), title: '#FDA4AF', text: '#FFF1F2', light: false },
        { bg: Array.of('#170F2E', '#7C3AED'), title: '#C4B5FD', text: '#F5F3FF', light: false },
        { bg: Array.of('#E0F2FE', '#BAE6FD'), title: '#DC2626', text: '#0F172A', light: true }
    );

    const pickRnd = (arr) => arr.at(Math.floor(Math.random() * arr.length));

    window.rollRandomLauncherStyle = function() {
        if (typeof currentDesign === 'undefined' || !currentDesign) return;
        if (!backupBeforeDice) {
            backupBeforeDice = JSON.parse(JSON.stringify(currentDesign));
        }

        const pal = pickRnd(HARMONIC_PALETTES);
        const cardStyles = Array.of('glass', 'sega', 'console', 'neon', 'retro');
        const shaders = Array.of('none', 'starfield', 'mania_geo', 'synthwave', 'speedlines', 'sparks', 'cyber_glitch');
        const fxs = Array.of('none', 'none', 'crt', 'vignette', 'halftone', 'cybergrid');
        const clicks = Array.of('rings', 'emeralds', 'stars', 'cyber');
        const modes = Array.of('coverflow', 'arc', 'row', 'showcase');

        const chosenCard = pickRnd(cardStyles);
        const chosenShader = pickRnd(shaders);
        const chosenFx = pickRnd(fxs);
        const chosenClick = pickRnd(clicks);
        const chosenMode = pickRnd(modes);

        currentDesign.lightUi = pal.light;
        currentDesign.titleColor = pal.title;
        currentDesign.textColor = pal.text;
        currentDesign.cardStyle = chosenCard;
        currentDesign.shaderType = chosenShader;
        currentDesign._baseShader = chosenShader;
        currentDesign.screenFx = chosenFx;
        currentDesign.clickFx = chosenClick;
        currentDesign.carouselMode = chosenMode;
        currentDesign.cardRadius = chosenCard === 'retro' ? 0 : (chosenCard === 'sega' ? 6 : (8 + Math.floor(Math.random() * 14)));

        if (!currentDesign.gradients) currentDesign.gradients = {};
        currentDesign.gradients.default = pal.bg.slice();
        const activeG = (typeof availableGames !== 'undefined' && availableGames.length > 0) ? availableGames.at(selectedIndex) : null;
        if (activeG) currentDesign.gradients[activeG.id] = pal.bg.slice();

        if (typeof window.updateGlobalDesignSnap === 'function') window.updateGlobalDesignSnap();
        if (typeof applyDesign === 'function') applyDesign(currentDesign);
        if (typeof window.syncLightUiClass === 'function') window.syncLightUiClass();
        if (typeof window.applyVisualFxPack === 'function') window.applyVisualFxPack();
        if (typeof window.syncClickFxStyle === 'function') window.syncClickFxStyle();
        if (activeG && typeof setBackgroundTheme === 'function') setBackgroundTheme(activeG.id, activeG.bg, activeG.video);

        const undoBtn = document.getElementById('sgl-dice-undo-btn');
        if (undoBtn) undoBtn.style.display = 'inline-block';

        if (typeof playSfx === 'function') playSfx('launch');
        if (typeof showToast === 'function') showToast('🎲 Подобран случайный стиль! Нажмите «Сохранить», если понравился.');
    };

    window.undoRandomLauncherStyle = function() {
        if (!backupBeforeDice) return;
        currentDesign = JSON.parse(JSON.stringify(backupBeforeDice));
        backupBeforeDice = null;
        if (typeof window.updateGlobalDesignSnap === 'function') window.updateGlobalDesignSnap();
        if (typeof applyDesign === 'function') applyDesign(currentDesign);
        if (typeof window.syncLightUiClass === 'function') window.syncLightUiClass();
        if (typeof window.applyVisualFxPack === 'function') window.applyVisualFxPack();
        const activeG = (typeof availableGames !== 'undefined' && availableGames.length > 0) ? availableGames.at(selectedIndex) : null;
        if (activeG && typeof setBackgroundTheme === 'function') setBackgroundTheme(activeG.id, activeG.bg, activeG.video);
        const undoBtn = document.getElementById('sgl-dice-undo-btn');
        if (undoBtn) undoBtn.style.display = 'none';
        if (typeof playSfx === 'function') playSfx('switch');
        if (typeof showToast === 'function') showToast('Предыдущий стиль восстановлен!');
    };

    const CHALLENGES_LIST = Array.of(
        {
            id: 'ch_mods', title: 'Инженер-моддер',
            desc: 'Установить в библиотеку суммарно не менее 5 модов',
            rewardName: 'Платиновый Медальон Мастера',
            check: (s) => ({ cur: s.modsCount, max: 5, done: s.modsCount >= 5 })
        },
        {
            id: 'ch_emeralds', title: 'Хранитель Изумрудов',
            desc: 'Собрать 7 или более Изумрудов и Камней в сохранениях',
            rewardName: 'Кристалл Гипер-Призмы',
            check: (s) => ({ cur: s.emeraldsCur, max: 7, done: s.emeraldsCur >= 7 })
        },
        {
            id: 'ch_style', title: 'Архитектор атмосферы',
            desc: 'Настроить собственный стиль UI, 3D-бокс или витрину трофеев',
            rewardName: 'Золотой Кубок Архитектора',
            check: (s) => {
                const ok = Boolean(currentDesign?.uiThemeBuilder?.enabled || currentDesign?.box3d?._global?.enabled || (currentDesign?.trophyMuseum || []).length > 0);
                return { cur: ok ? 1 : 0, max: 1, done: ok };
            }
        },
        {
            id: 'ch_shelves', title: 'Куратор коллекции',
            desc: 'Создать хотя бы 1 пользовательскую полку (коллекцию) игр',
            rewardName: 'Бонус ранга профиля',
            check: (s) => ({ cur: s.shelvesCount, max: 1, done: s.shelvesCount >= 1 })
        },
        {
            id: 'ch_shots', title: 'Летописец приключений',
            desc: 'Сделать 3 или более игровых скриншота через лаунчер',
            rewardName: 'Бонус ранга профиля',
            check: (s) => ({ cur: s.shotsCount, max: 3, done: s.shotsCount >= 3 })
        },
        {
            id: 'ch_hours', title: 'Сверхзвуковой марафон',
            desc: 'Провести в играх лаунчера суммарно 3 часа или больше',
            rewardName: 'Бонус ранга профиля',
            check: (s) => {
                const hrs = +(s.totalSeconds / 3600).toFixed(1);
                return { cur: Math.min(3, hrs), max: 3, done: s.totalSeconds >= 10800 };
            }
        }
    );

    window.renderChallengesIntoMuseum = async function(rightCol, shelfGrid) {
        if (!rightCol || !shelfGrid || document.getElementById('sgl-mus-subtabs')) return;

        let extra = { modsCount: 0, shotsCount: 0, shelvesCount: 0 };
        let prof = window._lastProfileStats || { emeraldsCur: 0, totalSeconds: 0 };
        try { extra = await (await fetch('/api/challenges/stats')).json(); } catch (_) {}
        const mergedStats = Object.assign({}, prof, extra);

        const bar = mk('div', 'tabs-bar', 'margin-bottom:4px;padding:4px;');
        bar.id = 'sgl-mus-subtabs';
        const bShelf = mk('button', 'tab-btn active', 'padding:6px 10px;', 'Полка трофеев (3D)');
        bShelf.type = 'button';
        const bChal = mk('button', 'tab-btn', 'padding:6px 10px;', '⚡ Испытания (Квесты)');
        bChal.type = 'button';

        const chalBox = mk('div', 'mods-list', 'display:none;max-height:370px;overflow-y:auto;flex-direction:column;gap:8px;padding-right:4px;');

        CHALLENGES_LIST.forEach(ch => {
            const st = ch.check(mergedStats);
            const row = mk('div', 'mod-item', 'padding:10px 12px;border-left:3px solid ' + (st.done ? '#4ADE80' : '#64748B') + ';background:' + (st.done ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.04)') + ';');
            const info = mk('div', 'mod-info', 'flex:1;');
            info.append(
                mk('div', 'mod-title', 'color:' + (st.done ? '#4ADE80' : '#fff') + ';', (st.done ? '✓ ' : '○ ') + ch.title),
                mk('div', 'mod-author', 'margin-top:2px;', ch.desc),
                mk('div', '', 'font-size:10.5px;color:#FFD700;margin-top:4px;font-weight:700;', 'Награда: ' + ch.rewardName)
            );
            const badge = mk('div', '', 'font-size:11.5px;font-weight:900;padding:4px 10px;border-radius:8px;background:rgba(0,0,0,0.35);color:' + (st.done ? '#4ADE80' : '#94A3B8') + ';flex-shrink:0;', st.done ? 'ВЫПОЛНЕНО' : (st.cur + ' / ' + st.max));
            row.append(info, badge);
            chalBox.appendChild(row);
        });

        bShelf.onclick = () => {
            bShelf.classList.add('active'); bChal.classList.remove('active');
            shelfGrid.style.display = 'grid'; chalBox.style.display = 'none';
        };
        bChal.onclick = () => {
            bChal.classList.add('active'); bShelf.classList.remove('active');
            shelfGrid.style.display = 'none'; chalBox.style.display = 'flex';
        };

        bar.append(bShelf, bChal);
        rightCol.prepend(bar);
        rightCol.appendChild(chalBox);
    };

    function injectDiceButtonInCustomizer() {
        const ioBar = document.querySelector('#custom-modal .theme-io-bar');
        if (!ioBar || document.getElementById('sgl-dice-btn')) return;

        const diceBtn = mk('button', 'btn-small btn-accent', 'background:linear-gradient(135deg,#ec4899,#8b5cf6);font-weight:800;', '🎲 Случайный стиль');
        diceBtn.type = 'button';
        diceBtn.id = 'sgl-dice-btn';
        diceBtn.title = 'Подобрать случайную гармоничную комбинацию темы, шейдера и эффектов';
        diceBtn.onclick = () => window.rollRandomLauncherStyle();

        const undoBtn = mk('button', 'btn-small', 'display:none;', '↩ Откатить');
        undoBtn.type = 'button';
        undoBtn.id = 'sgl-dice-undo-btn';
        undoBtn.onclick = () => window.undoRandomLauncherStyle();

        ioBar.append(diceBtn, undoBtn);
    }

    const _bootFinalTrio = () => {
        injectZenCss();
        injectDiceButtonInCustomizer();

        const origCustom = window.openCustomModal;
        if (typeof origCustom === 'function' && !window._diceCustomHooked) {
            window._diceCustomHooked = true;
            window.openCustomModal = function() {
                const r = origCustom.apply(this, arguments);
                injectDiceButtonInCustomizer();
                return r;
            };
        }
    };

    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', _bootFinalTrio);
    else _bootFinalTrio();
})();
