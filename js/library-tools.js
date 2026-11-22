/* === LIBRARY TOOLS: FAVORITES, QUICK FINDER & CHEATS PAD === */
(function() {
    let finderOpen = false;
    let finderIdx = 0;
    let finderMatches = new Array();
    const NL = String.fromCharCode(10);

    const SVG_SEARCH = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    const SVG_STAR_SOLID = '<svg viewBox="0 0 24 24" width="14" height="14" fill="#FFD700" stroke="#090d16" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';

    const BUILTIN_CHEATS = {
        sonic1: 'Level Select (Forever): В меню зажмите Вверх, Вниз, Влево, Вправо + Старт.' + NL + 'Debug Mode: В звуковом тесте 01, 09, 09, 01, 00, 06, 02, 03.',
        sonic2: 'Level Select: В Sound Test проиграйте 19, 65, 09, 17.' + NL + 'Debug Mode: В Level Select проиграйте 01, 09, 09, 02, 01, 01, 02, 04.' + NL + 'Все Изумруды: 04, 01, 02, 06.',
        soniccd: 'Sound Test / Секреты: Вниз, Вниз, Вниз, Влево, Вправо + Прыжок на титульном экране.' + NL + 'Debug: FM 07, PCM 12, DA 11.',
        sonic3: 'Sonic 3 A.I.R.: Level Select и Debug Mode включаются напрямую в меню Настройки -> Tweaks внутри самой игры.',
        mania: 'Level Select (Mania): Включите Dev Menu в окне «Настройки игры» лаунчера (Esc / Backspace в игре открывает отладчик).',
        srb2: 'Консоль SRB2 (клавиша ~):' + NL + '• map 01 — переход на карту' + NL + '• charability — тест способностей' + NL + '• devmode 1 — режим отладки (требует -debug)'
    };

    const BUILTIN_CHEATS_EN = {
        sonic1: 'Level Select (Forever): Hold Up, Down, Left, Right + Start on Title Screen.' + NL + 'Debug Mode: In Sound Test play 01, 09, 09, 01, 00, 06, 02, 03.',
        sonic2: 'Level Select: In Sound Test play 19, 65, 09, 17.' + NL + 'Debug Mode: In Level Select Sound Test play 01, 09, 09, 02, 01, 01, 02, 04.' + NL + 'All Chaos Emeralds: 04, 01, 02, 06.',
        soniccd: 'Sound Test / Secrets: Down, Down, Down, Left, Right + Jump on Title Screen.' + NL + 'Debug Mode: FM 07, PCM 12, DA 11.',
        sonic3: 'Sonic 3 A.I.R.: Level Select and Debug Mode can be toggled directly in Options -> Tweaks inside the game.',
        mania: 'Level Select (Mania): Enable Dev Menu in Launcher Game Tweaks (press Esc / Backspace in-game to open debugger).',
        srb2: 'SRB2 Console (~ key):' + NL + '• map 01 — warp to stage' + NL + '• charability — test character abilities' + NL + '• devmode 1 — debug mode (requires -debug flag)'
    };

    function isEnglishUi() {
        const langSel = document.getElementById('m6-lang-select') || document.querySelector('select[onchange*="Lang"]');
        if (langSel && String(langSel.value).toLowerCase().includes('en')) return true;
        if (typeof currentDesign !== 'undefined' && currentDesign && currentDesign.lang === 'en') return true;
        const modalHdr = document.querySelector('#sgl-notes-modal h2');
        if (modalHdr && modalHdr.textContent.includes('Notes')) return true;
        return document.documentElement.lang === 'en';
    }

    function getCheatText(gid) {
        if (isEnglishUi() && BUILTIN_CHEATS_EN[gid]) return BUILTIN_CHEATS_EN[gid];
        return BUILTIN_CHEATS[gid] || '';
    }

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function injectLibraryStyles() {
        if (document.getElementById('sgl-lib-tools-css')) return;
        const st = mk('style', '', '');
        st.id = 'sgl-lib-tools-css';
        const rules = new Array(
            '.sgl-modal-btn-sec{padding:9px 14px;border-radius:9px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.08);color:#fff;font-size:12px;font-weight:700;cursor:pointer;transition:0.15s;}','.sgl-modal-btn-sec:hover{background:rgba(255,255,255,0.16);border-color:rgba(255,255,255,0.4);}','.sgl-modal-btn-pri{padding:9px 16px;border-radius:9px;border:none;background:linear-gradient(135deg,#2563EB,#3B82F6);color:#fff;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(37,99,235,0.4);transition:0.15s;}','.sgl-modal-btn-pri:hover{filter:brightness(1.12);transform:translateY(-1px);}',
            '.sgl-fav-badge{position:absolute;top:8px;right:8px;z-index:6;width:24px;height:24px;border-radius:50%;background:rgba(9,13,22,0.85);border:1px solid rgba(255,215,0,0.65);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(0,0,0,0.6);pointer-events:none;}',
            '#sgl-finder-bg{position:fixed;inset:0;z-index:9880;background:rgba(5,9,18,0.72);backdrop-filter:blur(6px);display:none;align-items:flex-start;justify-content:center;padding-top:12vh;}',
            '#sgl-finder-bg.open{display:flex;}',
            '.sgl-finder-box{width:460px;max-width:92vw;background:rgba(15,22,38,0.96);border:1px solid rgba(255,215,0,0.45);border-radius:14px;padding:12px;box-shadow:0 20px 50px rgba(0,0,0,0.85);}',
            '.sgl-finder-row{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;color:#fff;}',
            '.sgl-finder-row.active, .sgl-finder-row:hover{background:rgba(255,215,0,0.18);color:#FFD700;}'
        );
        st.textContent = rules.join(NL);
        document.head.appendChild(st);
    }

    let favSet = new Set();

    async function pullFavoritesFromServer() {
        try {
            const res = await fetch('/api/favorites');
            const data = await res.json();
            favSet = new Set(data.favorites || new Array());
            window.decorateFavoriteCards();
            window.syncFavoritesFilterPill();
        } catch (_) {}
    }

    window.isGameFavorite = function(gameId) {
        return favSet.has(String(gameId || ''));
    };

    window.decorateFavoriteCards = function() {
        injectLibraryStyles();
        if (typeof gamesData !== 'undefined') {
            gamesData.forEach(g => { g.favorite = favSet.has(g.id); });
        }
        if (typeof availableGames !== 'undefined') {
            availableGames.forEach(g => { g.favorite = favSet.has(g.id); });
        }
        const cards = document.querySelectorAll('.game-card');
        cards.forEach((card, idx) => {
            card.querySelector('.sgl-fav-badge')?.remove();
            const g = availableGames.at(idx);
            if (g && favSet.has(g.id)) {
                const box = card.querySelector('.cover-box');
                if (box) {
                    const b = mk('div', 'sgl-fav-badge', '');
                    b.innerHTML = SVG_STAR_SOLID;
                    box.appendChild(b);
                }
            }
        });
    };

    window.toggleGameFavorite = async function(gameId) {
        if (!gameId) return;
        const res = await fetch('/api/games/toggle_fav', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId: gameId })
        });
        const data = await res.json();
        if (data.ok) {
            if (typeof playSfx === 'function') playSfx('switch');
            favSet = new Set(data.favorites || new Array());
            window.decorateFavoriteCards();
            window.syncFavoritesFilterPill();
            const favTab = document.getElementById('sgl-fav-cat-pill');
            if (favTab && favTab.classList.contains('active')) {
                const rem = gamesData.filter(g => g.exists && favSet.has(g.id));
                if (rem.length > 0) {
                    const savedAll = gamesData.slice();
                    gamesData = rem;
                    renderMainScreen();
                    gamesData = savedAll;
                    window.decorateFavoriteCards();
                } else {
                    availableGames = gamesData.filter(g => g.exists);
                    renderMainScreen();
                }
            }
            if (typeof showToast === 'function') {
                showToast(data.favorite ? 'Добавлено в Избранное ★' : 'Убрано из Избранного');
            }
        }
    };

    setTimeout(pullFavoritesFromServer, 200);

    window.openGameNotesModal = function(gameId) {
        const activeG = availableGames.at(selectedIndex);
        const gid = gameId || (activeG ? activeG.id : '');
        const gObj = gamesData.find(x => x.id === gid) || activeG;
        if (!gid || !gObj) return;

        document.getElementById('sgl-notes-modal')?.remove();
        const bg = mk('div', 'modal-backdrop active', 'z-index:9870;');
        bg.id = 'sgl-notes-modal';

        const box = mk('div', 'modal-box', 'width:500px;max-width:94vw;');
        const h2 = mk('h2', '', 'margin-bottom:4px;', 'Заметки и чит-коды');
        const sub = mk('div', '', 'font-size:12px;color:#FFD700;font-weight:700;text-align:center;margin-bottom:10px;', gObj.name);

        const area = mk('textarea', 'args-input', 'width:100%;height:190px;resize:vertical;padding:10px;font-size:12px;line-height:1.45;user-select:text !important;font-family:inherit;');
        area.placeholder = 'Запишите сюда комбинации клавиш, чит-коды, пароли сохранений или список любимых модов...';
        area.value = gObj.note || '';

        const topTools = mk('div', '', 'display:flex;justify-content:flex-end;margin-bottom:6px;');
        if (getCheatText(gid)) {
            const btnCheat = mk('button', 'btn-small btn-accent', 'font-size:11px;', '+ Вставить справочник кодов игры');
            btnCheat.type = 'button';
            btnCheat.onclick = () => {
                const cur = area.value.trim();
                area.value = (cur ? cur + NL + NL : '') + getCheatText(gid);
                if (typeof playSfx === 'function') playSfx('switch');
            };
            topTools.appendChild(btnCheat);
        }

        const acts = mk('div', 'modal-actions', 'margin-top:12px;display:flex;gap:8px;');
        const btnCancel = mk('button', 'sgl-modal-btn-sec', 'flex:0.8;', 'Закрыть');
        btnCancel.type = 'button';
        btnCancel.onclick = () => bg.remove();

        const btnSave = mk('button', 'sgl-modal-btn-pri', 'flex:1.2;', 'Сохранить заметку');
        btnSave.type = 'button';
        btnSave.onclick = async () => {
            const val = area.value;
            await fetch('/api/games/save_note', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: gid, note: val })
            });
            gamesData.forEach(g => { if (g.id === gid) g.note = val; });
            availableGames.forEach(g => { if (g.id === gid) g.note = val; });
            if (typeof playSfx === 'function') playSfx('launch');
            bg.remove();
            if (typeof showToast === 'function') showToast('Заметка сохранена!');
        };

        acts.append(btnCancel, btnSave);
        box.append(h2, sub, topTools, area, acts);
        bg.appendChild(box);
        document.body.appendChild(bg);
        if (typeof playSfx === 'function') playSfx('open_menu');
        setTimeout(() => area.focus(), 50);
    };

function ensureFinderModal() {
        injectLibraryStyles();
        let bg = document.getElementById('sgl-finder-bg');
        if (bg) return bg;

        bg = mk('div', '', '');
        bg.id = 'sgl-finder-bg';
        bg.onclick = (e) => { if (e.target === bg) closeQuickFinder(); };

        const box = mk('div', 'sgl-finder-box', '');
        const inp = mk('input', 'args-input', 'margin-top:0;margin-bottom:8px;width:100%;padding:9px 12px;font-size:13px;user-select:text !important;');
        inp.type = 'text';
        inp.id = 'sgl-finder-inp';
        inp.placeholder = 'Быстрый поиск игры (стрелки ↑↓ и Enter)...';

        const list = mk('div', '', 'max-height:260px;overflow-y:auto;display:flex;flex-direction:column;gap:3px;');
        list.id = 'sgl-finder-list';

        inp.oninput = () => { finderIdx = 0; renderFinderResults(); };
        box.append(inp, list);
        bg.appendChild(box);
        document.body.appendChild(bg);
        return bg;
    }

    function renderFinderResults() {
        const inp = document.getElementById('sgl-finder-inp');
        const list = document.getElementById('sgl-finder-list');
        if (!inp || !list) return;
        const q = inp.value.trim().toLowerCase();

        const pool = gamesData.filter(g => g.exists);
        finderMatches = pool.filter(g => {
            if (!q) return true;
            return (g.name + ' ' + (g.tag || '')).toLowerCase().includes(q);
        });

        list.innerHTML = '';
        if (finderMatches.length === 0) {
            list.appendChild(mk('div', '', 'font-size:12px;opacity:0.55;text-align:center;padding:14px;', 'Игры не найдены'));
            return;
        }
        if (finderIdx >= finderMatches.length) finderIdx = 0;

        finderMatches.forEach((g, idx) => {
            const row = mk('div', 'sgl-finder-row' + (idx === finderIdx ? ' active' : ''), '');
            const left = mk('span', '', '', (g.favorite ? '★ ' : '') + g.name);
            const right = mk('span', '', 'font-size:10px;opacity:0.65;', g.tag || '');
            row.append(left, right);
            row.onclick = () => jumpToFoundGame(g.id);
            list.appendChild(row);
        });
    }

    function jumpToFoundGame(gameId) {
        closeQuickFinder();
        let targetPos = availableGames.findIndex(g => g.id === gameId);
        if (targetPos === -1 && typeof window.switchCarouselCategory === 'function') {
            window.switchCarouselCategory('all');
            targetPos = availableGames.findIndex(g => g.id === gameId);
        }
        if (targetPos === -1) {
            availableGames = gamesData.filter(g => g.exists);
            renderMainScreen();
            targetPos = availableGames.findIndex(g => g.id === gameId);
        }
        if (targetPos !== -1) {
            selectGame(targetPos, true);
        }
    }

    window.openQuickFinder = function() {
        const bg = ensureFinderModal();
        finderOpen = true;
        finderIdx = 0;
        bg.classList.add('open');
        const inp = document.getElementById('sgl-finder-inp');
        if (inp) {
            inp.value = '';
            renderFinderResults();
            setTimeout(() => inp.focus(), 30);
        }
        if (typeof playSfx === 'function') playSfx('open_menu');
    };

    function closeQuickFinder() {
        finderOpen = false;
        document.getElementById('sgl-finder-bg')?.classList.remove('open');
    }

    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyF' || e.keyCode === 70)) {
            e.preventDefault();
            e.stopPropagation();
            if (finderOpen) closeQuickFinder();
            else window.openQuickFinder();
            return;
        }
        if (!finderOpen) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            closeQuickFinder();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (finderMatches.length > 0) {
                finderIdx = (finderIdx + 1) % finderMatches.length;
                renderFinderResults();
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (finderMatches.length > 0) {
                finderIdx = (finderIdx - 1 + finderMatches.length) % finderMatches.length;
                renderFinderResults();
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            const picked = finderMatches.at(finderIdx);
            if (picked) jumpToFoundGame(picked.id);
        }
    }, true);

window.syncFavoritesFilterPill = function() {
        const hasFav = gamesData.some(g => g.exists && favSet.has(g.id));
        let bar = document.getElementById('sgl-cat-bar');
        if (!bar && hasFav) {
            const st = document.createElement('style');
            st.textContent = '#sgl-cat-bar{position:fixed;left:50%;transform:translateX(-50%);z-index:45;display:flex;gap:6px;background:rgba(12,18,32,0.72);backdrop-filter:blur(8px);padding:4px 6px;border-radius:20px;border:1px solid rgba(255,255,255,0.12);}'
                + '.sgl-cat-pill{background:transparent;border:none;color:rgba(255,255,255,0.7);font-size:11px;font-weight:700;padding:4px 12px;border-radius:14px;cursor:pointer;transition:0.18s;}'
                + '.sgl-cat-pill.active{background:rgba(255,215,0,0.2);color:#FFD700;}';
            document.head.appendChild(st);
            bar = mk('div', '', '');
            bar.id = 'sgl-cat-bar';
            const hdr = document.querySelector('header'); if (hdr) hdr.after(bar); else document.body.appendChild(bar);
        }
        if (!bar) return;

        let favBtn = document.getElementById('sgl-fav-cat-pill');
        if (!hasFav) {
            favBtn?.remove();
            if (bar.children.length <= 1) bar.style.display = 'none';
            return;
        }
        if (bar.children.length === 0) {
            const allB = mk('button', 'sgl-cat-pill active', '', 'Все игры');
            allB.type = 'button';
            allB.onclick = () => {
                availableGames = gamesData.filter(g => g.exists);
                selectedIndex = 0;
                renderMainScreen();
                bar.querySelectorAll('.sgl-cat-pill').forEach(x => x.classList.remove('active'));
                allB.classList.add('active');
            };
            bar.appendChild(allB);
        }
        if (!favBtn) {
            favBtn = mk('button', 'sgl-cat-pill', '', '★ Избранное');
            favBtn.type = 'button';
            favBtn.id = 'sgl-fav-cat-pill';
            favBtn.onclick = () => {
                const favList = gamesData.filter(g => g.exists && favSet.has(g.id));
                if (favList.length === 0) return;
                selectedIndex = 0;
                if (typeof playSfx === 'function') playSfx('switch');
                const savedAll = gamesData.slice();
                gamesData = favList;
                renderMainScreen();
                gamesData = savedAll;
                window.decorateFavoriteCards();
                bar.querySelectorAll('.sgl-cat-pill').forEach(x => x.classList.remove('active'));
                favBtn.classList.add('active');
            };
            bar.appendChild(favBtn);
            bar.style.display = 'flex';
        }
    };

    function injectTopSearchBtn() {
        if (document.getElementById('sgl-search-top-btn')) return;
        const all = Array.from(document.getElementsByTagName('*'));
        const topBar = all.find(el => el.dataset && el.dataset.hudId === 'm5bar') || document.getElementById('m5-quick-bar');
        if (!topBar) return;
        const b = mk('button', 'settings-btn', 'padding:6px 10px;font-size:12px;', '');
        b.type = 'button';
        b.id = 'sgl-search-top-btn';
        b.title = 'Быстрый поиск игры (Ctrl+F)';
        b.innerHTML = '<span class="btn-inner-wrap">' + SVG_SEARCH + '</span>';
        b.onclick = window.openQuickFinder;
        topBar.prepend(b);
    }

    const _bootLib = () => {
        injectLibraryStyles();
        setTimeout(injectTopSearchBtn, 300);

        const origRender = window.renderMainScreen;
        if (typeof origRender === 'function') {
            window.renderMainScreen = function() {
                const r = origRender.apply(this, arguments);
                window.decorateFavoriteCards();
                window.syncFavoritesFilterPill();
                return r;
            };
        }
        setTimeout(() => {
            window.decorateFavoriteCards();
            window.syncFavoritesFilterPill();
        }, 500);
    };

    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', _bootLib);
    else _bootLib();
})();
