/* === 3D TROPHY ROOM & COLLECTIBLES MUSEUM (SMASH / GENERATIONS STYLE) === */
(function() {
    let stageViewer = null;

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function injectMuseumCss() {
        if (document.getElementById('sgl-museum-css')) return;
        const st = mk('style', '', '');
        st.id = 'sgl-museum-css';
        st.textContent = Array.of(
            '.mus-layout{display:grid;grid-template-columns:340px minmax(0,1fr);gap:16px;align-items:stretch;min-height:430px;}',
            '.mus-stage-col{background:radial-gradient(circle at 50% 48%,rgba(37,99,235,0.26),#070b14 76%);border:1px solid rgba(255,215,0,0.28);border-radius:16px;padding:14px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;}',
            '.mus-canvas-host{flex:1;min-height:240px;position:relative;z-index:2;}',
            '.mus-base-puck{width:190px;height:30px;margin:-14px auto 8px;border-radius:50%;position:relative;z-index:1;pointer-events:none;}',
            '.mus-orbit-ring{position:absolute;left:50%;top:46%;width:210px;height:74px;margin:-37px 0 0 -105px;border-radius:50%;border:2px dashed rgba(255,215,0,0.42);box-shadow:0 0 18px rgba(255,215,0,0.22);pointer-events:none;z-index:1;animation:musOrbitSpin 9s linear infinite;}',
            '@keyframes musOrbitSpin{0%{transform:rotate(-14deg) scale(0.96)}50%{transform:rotate(-14deg) scale(1.04)}100%{transform:rotate(-14deg) scale(0.96)}}',
            '.puck-smash{background:radial-gradient(ellipse at center,#fde047 0%,#ca8a04 65%,#713f12 100%);border:2px solid #fef08a;box-shadow:0 8px 24px rgba(234,179,8,0.45);}',
            '.puck-altar{background:radial-gradient(ellipse at center,#4ade80 0%,#15803d 65%,#052e16 100%);border:2px solid #bbf7d0;box-shadow:0 8px 24px rgba(34,197,94,0.45);}',
            '.puck-neon{background:radial-gradient(ellipse at center,rgba(56,189,248,0.45) 0%,rgba(15,23,42,0.95) 75%);border:2px solid #38bdf8;box-shadow:0 0 24px rgba(56,189,248,0.6);}',
            '.mus-info-card{background:rgba(9,13,24,0.82);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:10px 12px;z-index:3;}',
            '.mus-shelf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:10px;max-height:380px;overflow-y:auto;padding-right:6px;align-content:start;}',
            '.mus-tile{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:10px 8px;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;transition:0.16s;text-align:center;position:relative;}',
            '.mus-tile:hover{background:rgba(255,255,255,0.09);transform:translateY(-2px);}',
            '.mus-tile.active{border-color:#FFD700;background:rgba(255,215,0,0.12);box-shadow:0 0 18px rgba(255,215,0,0.22);}',
            '.mus-tile.locked{opacity:0.68;border-style:dashed;}',
            '.mus-icon{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;background:rgba(0,0,0,0.38);border:1px solid rgba(255,255,255,0.15);}'
        ).join('\n');
        document.head.appendChild(st);
    }

    const BUILTIN_TROPHIES = Array.of(
        {
            id: 'tr_ring', builtin: true, icon: '◎',
            name: 'Золотое Кольцо (Power Ring)', game: 'Sonic Series',
            url: 'builtin_ring', material: 'gold', base: 'smash',
            desc: 'Вечный символ серии. Защищает владельца от любого урона и открывает путь в Специальные этапы.',
            condText: 'Подключить хотя бы 1 игру в лаунчере',
            checkUnlock: (st) => (st.installedCount >= 1 || st.totalSeconds > 0)
        },
        {
            id: 'tr_emerald', builtin: true, icon: '◆',
            name: 'Изумруд Хаоса (Chaos Emerald)', game: 'South Island / West Side',
            url: 'builtin_emerald', material: 'emerald', base: 'altar',
            desc: 'Мистический реликвий бесконечной энергии. Семь собранных камней пробуждают Супер-форму.',
            condText: 'Собрать хотя бы 1 Изумруд Хаоса в любой игре',
            checkUnlock: (st) => (st.emeraldsCur >= 1)
        },
        {
            id: 'tr_monitor', builtin: true, icon: '📺',
            name: 'Монитор Снаряжения (Item Box)', game: '16-Bit Classic Era',
            url: 'builtin_monitor', material: 'original', base: 'neon',
            desc: 'Классический придорожный ТВ-монитор Dr. Eggman Industries с бонусами скорости, щитов и дополнительных жизней.',
            condText: 'Открыть минимум 5 достижений в профиле',
            checkUnlock: (st) => (st.achDone >= 5)
        },
        {
            id: 'tr_starpost', builtin: true, icon: '★',
            name: 'Звезда Чекпоинта (Star Post)', game: 'Sonic 1 • 2 • 3 & K',
            url: 'builtin_starpost', material: 'gold', base: 'smash',
            desc: 'Контрольный столб зоны. При достаточном запасе колец открывает портал в бонусный этап над головой.',
            condText: 'Наиграть суммарно более 2 часов в лаунчере',
            checkUnlock: (st) => (st.totalSeconds >= 7200)
        },
        {
            id: 'tr_hyper', builtin: true, icon: '♛',
            name: 'Супер Изумруд Мастера', game: 'Hidden Palace Altar',
            url: 'builtin_super_emerald', material: 'hyper_tint', base: 'altar',
            desc: 'Высшая форма Изумруда, усиленная энергией Мастера Изумруда на Алтаре Сокрытого Дворца.',
            condText: 'Достичь 70% общего ранга профиля',
            checkUnlock: (st, pct) => (pct >= 70)
        }        ,
        {
            id: 'tr_goalplate', builtin: true, icon: '🚩',
            name: 'Табличка Финиша (Goal Plate)', game: 'Act Clear',
            url: 'builtin_goalplate', material: 'original', base: 'smash',
            desc: 'Вращающийся финишный знак в конце каждого акта. Пронеситесь мимо него на полной скорости, чтобы заработать бонус!',
            condText: 'Открыть хотя бы 1 достижение в любой игре',
            checkUnlock: (st) => (st.achDone >= 1)
        },
        {
            id: 'tr_redring', builtin: true, icon: '✪',
            name: 'Красное Звёздное Кольцо', game: 'Sonic Colors / Generations',
            url: 'builtin_redring', material: 'original', base: 'neon',
            desc: 'Редкое коллекционное кольцо со звездой внутри, спрятанное в самых труднодоступных уголках уровней.',
            condText: 'Собрать все 7 Изумрудов Хаоса в любой игре',
            checkUnlock: (st) => (st.emeraldsCur >= 7)
        },
        {
            id: 'tr_capsule', builtin: true, icon: '💊',
            name: 'Капсула Освобождения', game: 'Eggman Prison Capsule',
            url: 'builtin_capsule', material: 'original', base: 'neon',
            desc: 'Фирменная тюремная капсула Доктора Эггмана. Прыгните на красную кнопку сверху, чтобы освободить лесных друзей!',
            condText: 'Открыть минимум 15 достижений в профиле',
            checkUnlock: (st) => (st.achDone >= 15)
        },
        {
            id: 'tr_timestone', builtin: true, icon: '💠',
            name: 'Камень Времени (Time Stone)', game: 'Sonic CD • Little Planet',
            url: 'builtin_timestone', material: 'original', base: 'altar',
            desc: 'Древний кристалл с Маленькой Планеты, способный управлять потоком времени и создавать светлое будущее.',
            condText: 'Наиграть суммарно более 5 часов в лаунчере',
            checkUnlock: (st) => (st.totalSeconds >= 18000)
        },
        {
            id: 'tr_cup', builtin: true, icon: '🏆',
            name: 'Кубок Абсолютного Чемпиона', game: '100% Hall of Fame',
            url: 'builtin_cup', material: 'original', base: 'smash',
            desc: 'Высшая награда Зала славы Sonic Games Launcher, вручаемая истинным мастерам, покорившим 100% испытаний.',
            condText: 'Достичь 100% общего ранга профиля',
            checkUnlock: (st, pct) => (pct >= 100)
        }        ,
        {
            id: 'tr_ch_medal', builtin: true, icon: '🎖',
            name: 'Платиновый Медальон Мастера', game: 'Испытание: Инженер-моддер',
            url: 'builtin_medallion', material: 'chrome', base: 'neon',
            desc: 'Эксклюзивная награда за установку 5 и более модификаций в библиотеку лаунчера.',
            condText: 'Выполнить испытание «Инженер-моддер» (5+ модов)',
            checkUnlock: (st) => ((st.modsCount || 0) >= 5)
        },
        {
            id: 'tr_ch_prism', builtin: true, icon: '🔮',
            name: 'Кристалл Гипер-Призмы', game: 'Испытание: Хранитель Изумрудов',
            url: 'builtin_prism', material: 'hyper_tint', base: 'altar',
            desc: 'Редчайший призматический артефакт, переливающийся всеми цветами энергии Хаоса.',
            condText: 'Выполнить испытание «Хранитель Изумрудов» (7+ камней)',
            checkUnlock: (st) => ((st.emeraldsCur || 0) >= 7)
        },
        {
            id: 'tr_ch_arch', builtin: true, icon: '🏛',
            name: 'Золотой Кубок Архитектора', game: 'Испытание: Архитектор атмосферы',
            url: 'builtin_cup', material: 'gold', base: 'smash',
            desc: 'Вручается творцам, создавшим собственный неповторимый стиль интерфейса лаунчера.',
            condText: 'Включить свой стиль UI, 3D-коробки или добавить свою фигурку',
            checkUnlock: () => Boolean(currentDesign?.uiThemeBuilder?.enabled || currentDesign?.box3d?._global?.enabled || (currentDesign?.trophyMuseum || []).length > 0)
        },
        {
            id: 'tr_game_sonic1', builtin: true, icon: '◎',
            name: 'Золотое Кольцо Вечности', game: 'Sonic 1 Forever',
            url: 'builtin_ring', material: 'super_tint', base: 'smash',
            desc: 'Особая реликвия за прохождение Sonic 1 Forever (7 Изумрудов или ≥80% достижений).',
            condText: 'Пройти Sonic 1 Forever (7 Изумрудов или ≥80% достижений)',
            checkUnlock: (_st, _pct, saves) => Boolean(saves && saves.sonic1 && saves.sonic1.completed)
        },
        {
            id: 'tr_game_sonic2', builtin: true, icon: '★',
            name: 'Эмблема Крыла Торнадо', game: 'Sonic 2 Absolute',
            url: 'builtin_starpost', material: 'super_tint', base: 'smash',
            desc: 'Награда за покорение Sonic 2 Absolute и небесной крепости Death Egg.',
            condText: 'Пройти Sonic 2 Absolute (7 Изумрудов или ≥80% достижений)',
            checkUnlock: (_st, _pct, saves) => Boolean(saves && saves.sonic2 && saves.sonic2.completed)
        },
        {
            id: 'tr_game_soniccd', builtin: true, icon: '💠',
            name: 'Хроно-кристалл Маленькой Планеты', game: 'Sonic CD Restored',
            url: 'builtin_timestone', material: 'original', base: 'altar',
            desc: 'Редкий Хроно-кристалл за спасение будущего в Sonic CD Restored.',
            condText: 'Пройти Sonic CD Restored (7 Камней Времени или ≥80% достижений)',
            checkUnlock: (_st, _pct, saves) => Boolean(saves && saves.soniccd && saves.soniccd.completed)
        },
        {
            id: 'tr_game_sonic3', builtin: true, icon: '◆',
            name: 'Мастер Изумрудов Алтаря', game: 'Sonic 3 A.I.R.',
            url: 'builtin_super_emerald', material: 'emerald', base: 'altar',
            desc: 'Величественный Мастер Изумрудов за прохождение Sonic 3 A.I.R.!',
            condText: 'Пройти Sonic 3 A.I.R. (7 Изумрудов или ≥80% достижений)',
            checkUnlock: (_st, _pct, saves) => Boolean(saves && saves.sonic3 && saves.sonic3.completed)
        },
        {
            id: 'tr_game_mania', builtin: true, icon: '🔮',
            name: 'Призма Фантомного Рубина', game: 'Sonic Mania',
            url: 'builtin_prism', material: 'hyper_tint', base: 'neon',
            desc: 'Сияющий артефакт измерений за прохождение Sonic Mania.',
            condText: 'Пройти Sonic Mania (7 Изумрудов или ≥80% достижений)',
            checkUnlock: (_st, _pct, saves) => Boolean(saves && saves.mania && saves.mania.completed)
        },
        {
            id: 'tr_game_srb2', builtin: true, icon: '🎖',
            name: 'Медальон 3D-Первопроходца', game: 'Sonic Robo Blast 2',
            url: 'builtin_medallion', material: 'chrome', base: 'neon',
            desc: 'Почётная награда за прохождение Sonic Robo Blast 2.',
            condText: 'Пройти Sonic Robo Blast 2 (7 Изумрудов)',
            checkUnlock: (_st, _pct, saves) => Boolean(saves && saves.srb2 && saves.srb2.completed)
        },
        {
            id: 'tr_game_origins', builtin: true, icon: '🏆',
            name: 'Кубок Классической Коллекции', game: 'Sonic Origins',
            url: 'builtin_cup', material: 'gold', base: 'smash',
            desc: 'Награда Зала славы за прохождение Sonic Origins (≥80% достижений Steam).',
            condText: 'Пройти Sonic Origins (≥80% достижений Steam)',
            checkUnlock: (_st, _pct, saves) => Boolean(saves && saves.origins && saves.origins.completed)
        }
    );

    function getCustomTrophies() {
        if (typeof currentDesign === 'undefined' || !currentDesign) return new Array();
        if (!Array.isArray(currentDesign.trophyMuseum)) currentDesign.trophyMuseum = new Array();
        return currentDesign.trophyMuseum;
    }

    async function persistMuseum() {
        if (typeof currentDesign === 'undefined' || !currentDesign) return;
        if (typeof window.restoreGlobalDesignFields === 'function') window.restoreGlobalDesignFields();
        await fetch('/api/design', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(currentDesign) });
    }

    window.openTrophyMuseumModal = async function() {
        injectMuseumCss();
        document.getElementById('sgl-museum-modal')?.remove();
        if (stageViewer) { stageViewer.destroy(); stageViewer = null; }

        let stats = window._lastProfileStats;
        if (!stats) {
            try { stats = await (await fetch('/api/profile_summary')).json(); const ex = await (await fetch('/api/challenges/stats')).json(); Object.assign(stats, ex); window._lastProfileStats = stats; }
            catch (_) { stats = { installedCount: 1, totalSeconds: 0, emeraldsCur: 0, emeraldsMax: 7, achDone: 0, achMax: 10 }; }
        }
        let savesMap = (window._sglSaveSummary && window._sglSaveSummary.games) ? window._sglSaveSummary.games : {};
        if (typeof window.refreshSaveSummaryCache === 'function') {
            const freshSum = await window.refreshSaveSummaryCache(true);
            if (freshSum && freshSum.games) savesMap = freshSum.games;
        }
        const emP = stats.emeraldsMax > 0 ? (stats.emeraldsCur / stats.emeraldsMax) : 0;
        const acP = stats.achMax > 0 ? (stats.achDone / stats.achMax) : 0;
        const dv = (stats.emeraldsMax > 0 ? 1 : 0) + (stats.achMax > 0 ? 1 : 0);
        const pct = dv > 0 ? Math.round(((emP + acP) / dv) * 100) : 0;

        const bg = mk('div', 'modal-backdrop active', 'z-index:9898;');
        bg.id = 'sgl-museum-modal';
        bg.onclick = (e) => { if (e.target === bg) { if (stageViewer) stageViewer.destroy(); bg.remove(); } };

        const box = mk('div', 'modal-box', 'width:920px;max-width:96vw;padding:20px 24px;');
        const topHdr = mk('div', '', 'display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;');
        topHdr.appendChild(mk('div', 'modal-title', 'margin:0;', '🏛 Зал славы и 3D-Музей трофеев'));

        const hdrRight = mk('div', '', 'display:flex;gap:8px;align-items:center;');
        const countBadge = mk('span', '', 'font-size:12px;font-weight:800;color:#4ADE80;padding:5px 12px;border-radius:999px;background:rgba(74,222,128,0.14);border:1px solid rgba(74,222,128,0.35);', '');
        const addBtn = mk('button', 'btn-small btn-accent', 'padding:7px 14px;font-weight:800;', '+ Поставить свою 3D-фигурку');
        addBtn.type = 'button';
        hdrRight.append(countBadge, addBtn);
        topHdr.appendChild(hdrRight);

        const layout = mk('div', 'mus-layout', '');
        const stageCol = mk('div', 'mus-stage-col', '');
        const cvsHost = mk('div', 'mus-canvas-host', '');
        const puckEl = mk('div', 'mus-base-puck puck-smash', '');
        const infoBox = mk('div', 'mus-info-card', '');
        stageCol.append(cvsHost, puckEl, infoBox);

        const rightCol = mk('div', '', 'display:flex;flex-direction:column;gap:10px;min-width:0;');
        const shelfGrid = mk('div', 'mus-shelf-grid', '');
        rightCol.appendChild(shelfGrid);
        layout.append(stageCol, rightCol);

        let selectedId = 'tr_ring';

        function isItemUnlocked(item) {
            if (item.builtin) return Boolean(item.checkUnlock(stats, pct, savesMap));
            const req = Number(item.reqPct || 0);
            return pct >= req;
        }

        function getAllItems() {
            return Array.of(...BUILTIN_TROPHIES, ...getCustomTrophies());
        }

        function selectTrophy(item) {
            selectedId = item.id;
            const unlocked = isItemUnlocked(item);
            if (stageViewer) { stageViewer.destroy(); stageViewer = null; }

            puckEl.className = 'mus-base-puck puck-' + (item.base || 'smash');
            if (typeof window.mountSgl3dViewer === 'function') {
                stageViewer = window.mountSgl3dViewer(cvsHost, {
                    url: item.url || 'builtin_emerald',
                    texUrl: unlocked ? (item.texUrl || '') : '',
                    flipUv: Boolean(item.flipUv),
                    material: unlocked ? (item.material || 'original') : 'silhouette',
                    speed: 0.9,
                    zoom: Number(item.zoom || 0.72),
                    interactive: true
                });
            }

            infoBox.innerHTML = '';
            const stTag = mk('div', '', 'font-size:10px;font-weight:900;letter-spacing:1px;margin-bottom:3px;color:' + (unlocked ? '#FFD700' : '#94A3B8') + ';', unlocked ? ('★ ОТКРЫТО • ' + (item.game || 'Коллекция')) : '🔒 СЕКРЕТНЫЙ ТРОФЕЙ (СИЛУЭТ)');
            const tName = mk('div', '', 'font-size:15px;font-weight:900;color:#fff;margin-bottom:5px;', unlocked ? item.name : '???');
            const tDesc = mk('div', '', 'font-size:11.5px;line-height:1.45;color:rgba(255,255,255,0.82);', unlocked ? (item.desc || 'Коллекционная 3D-фигурка музея.') : ('Условие открытия: ' + (item.condText || ('Достичь ' + (item.reqPct || 0) + '% прогресса профиля'))));
            infoBox.append(stTag, tName, tDesc);

            if (!item.builtin) {
                const actRow = mk('div', '', 'display:flex;gap:6px;margin-top:8px;justify-content:flex-end;');
                const texB = mk('button', 'btn-small', 'font-size:10.5px;padding:3px 8px;', 'Текстура (.PNG)');
                texB.type = 'button';
                texB.onclick = async () => {
                    const r = await (await fetch('/api/assets/pick_image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: 'trtex' }) })).json();
                    if (r.ok && r.url) { item.texUrl = r.url; item.material = 'original'; await persistMuseum(); selectTrophy(item); }
                };
                const flipB = mk('button', 'btn-small', 'font-size:10.5px;padding:3px 8px;', 'Flip UV');
                flipB.type = 'button';
                flipB.onclick = async () => { item.flipUv = !item.flipUv; await persistMuseum(); selectTrophy(item); };
                const delB = mk('button', 'btn-small btn-clear', 'font-size:10.5px;padding:3px 8px;', 'Убрать с полки');
                delB.type = 'button';
                delB.onclick = async () => {
                    const arr = getCustomTrophies();
                    const ix = arr.findIndex(x => x.id === item.id);
                    if (ix !== -1) arr.splice(ix, 1);
                    await persistMuseum();
                    renderShelf();
        if (typeof window.renderChallengesIntoMuseum === 'function') window.renderChallengesIntoMuseum(rightCol, shelfGrid);
                    selectTrophy(BUILTIN_TROPHIES.at(0));
                };
                actRow.append(texB, flipB, delB);
                infoBox.appendChild(actRow);
            }

            shelfGrid.querySelectorAll('.mus-tile').forEach(el => {
                el.classList.toggle('active', el.dataset.tid === item.id);
            });
        }

        function renderShelf() {
            shelfGrid.innerHTML = '';
            const all = getAllItems();
            let unCnt = 0;
            all.forEach(it => {
                const un = isItemUnlocked(it);
                if (un) unCnt++;
                const tile = mk('div', 'mus-tile' + (un ? '' : ' locked') + (it.id === selectedId ? ' active' : ''), '');
                tile.dataset.tid = it.id;
                const ic = mk('div', 'mus-icon', 'color:' + (un ? '#FFD700' : '#64748B') + ';border-color:' + (un ? 'rgba(255,215,0,0.45)' : 'rgba(255,255,255,0.1)') + ';', un ? (it.icon || '🧊') : '?');
                const nm = mk('div', '', 'font-size:11.5px;font-weight:800;line-height:1.25;color:#fff;', un ? it.name : 'Скрытый трофей');
                const sub = mk('div', '', 'font-size:9.5px;opacity:0.6;', un ? (it.game || '3D Trophy') : ('Нужно: ' + (it.builtin ? 'Прогресс' : (it.reqPct + '%'))));
                tile.append(ic, nm, sub);
                tile.onclick = () => { if (typeof playSfx === 'function') playSfx('switch'); selectTrophy(it); };
                shelfGrid.appendChild(tile);
            });
            countBadge.textContent = 'Открыто: ' + unCnt + ' / ' + all.length;
        }

        // Форма добавления своей фигурки на полку музея
        addBtn.onclick = async () => {
            const pick = await (await fetch('/api/assets/pick_3d_or_img', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: 'museum' }) })).json();
            if (!pick.ok || !pick.url || pick.kind !== '3d') {
                if (pick.ok && pick.kind !== '3d' && typeof showToast === 'function') showToast('Выберите 3D-файл (.GLB, .OBJ или .STL)!', true);
                return;
            }
            const rawBaseName = pick.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
            const title = (typeof askDialog === 'function') ? await askDialog('Название трофея / фигурки:', rawBaseName) : rawBaseName;
            if (!title) return;
            const desc = (typeof askDialog === 'function') ? await askDialog('Описание экспоната (игра, история):', 'Экземпляр личной коллекции 3D-музея.') : '';
            const reqStr = (typeof askDialog === 'function') ? await askDialog('С какого % прогресса профиля открывать? (0 = открыт сразу):', '0') : '0';
            const newTr = {
                id: 'cust_tr_' + Date.now(), builtin: false, icon: '🏆',
                name: title.trim(), game: 'Коллекция игрока',
                url: pick.url, texUrl: '', flipUv: false,
                material: (pick.ext === '.glb') ? 'original' : 'gold',
                base: 'smash', zoom: 1.05,
                desc: (desc || '').trim(),
                reqPct: Math.max(0, Math.min(100, parseInt(reqStr || '0', 10) || 0))
            };
            getCustomTrophies().push(newTr);
            await persistMuseum();
            if (typeof playSfx === 'function') playSfx('launch');
            renderShelf();
            selectTrophy(newTr);
        };

        const closeB = mk('button', 'close-modal-btn', 'margin-top:14px;', 'Закрыть музей');
        closeB.type = 'button';
        closeB.onclick = () => { if (stageViewer) stageViewer.destroy(); bg.remove(); };

        box.append(topHdr, layout, closeB);
        bg.appendChild(box);
        document.body.appendChild(bg);
        renderShelf();
        selectTrophy(getAllItems().at(0));
        if (typeof playSfx === 'function') playSfx('open_menu');
    };

    function injectMuseumEntryButtons() {
        // 1. Внутри окна Профиля (рядом с заголовком)
        const obs = new MutationObserver(() => {
            const pModal = document.getElementById('profile-stats-modal');
            const pBody = document.getElementById('profile-stats-body');
            if (pModal && pModal.classList.contains('active') && pBody && pBody.children.length > 1 && !document.getElementById('sgl-open-museum-banner')) {
                const banner = mk('div', '', 'display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 14px;border-radius:10px;background:linear-gradient(90deg,rgba(250,204,21,0.16),rgba(59,130,246,0.12));border:1px solid rgba(255,215,0,0.4);margin-bottom:8px;');
                banner.id = 'sgl-open-museum-banner';
                const btn = mk('button', 'btn-small btn-accent', 'background:#FFD700;color:#090d16;font-weight:900;padding:6px 14px;', '🏛 Открыть 3D-Музей трофеев');
                btn.type = 'button';
                btn.onclick = () => window.openTrophyMuseumModal();
                banner.append(mk('span', '', 'font-size:12px;font-weight:800;color:#FFD700;', 'Комната 3D-трофеев и коллекционных фигурок'), btn);
                pBody.prepend(banner);
            }
        });
        obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: Array.of('class') });
    }

    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', injectMuseumEntryButtons);
    else injectMuseumEntryButtons();
})();
