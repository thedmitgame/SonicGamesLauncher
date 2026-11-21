/* === QUICK RIGHT-CLICK CONTEXT MENU FOR GAME CARDS === */
(function() {
    const st = document.createElement('style');
    st.textContent = `
        #sgl-ctx-menu {
            position: fixed; z-index: 9900; min-width: 195px;
            background: rgba(15, 21, 35, 0.96); backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 215, 0, 0.38); border-radius: 12px;
            padding: 6px; box-shadow: 0 14px 35px rgba(0, 0, 0, 0.8);
            display: none; flex-direction: column; gap: 2px;
        }
        #sgl-ctx-menu.open { display: flex; }
        .sgl-ctx-head {
            font-size: 11px; font-weight: 800; color: #FFD700;
            padding: 5px 10px 6px; border-bottom: 1px solid rgba(255,255,255,0.1);
            margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            max-width: 220px;
        }
        .sgl-ctx-btn {
            background: transparent; border: none; color: #fff;
            padding: 7px 10px; border-radius: 8px; font-size: 12px; font-weight: 600;
            display: flex; align-items: center; gap: 8px; cursor: pointer; text-align: left;
            transition: background 0.15s;
        }
        .sgl-ctx-btn:hover { background: rgba(255, 255, 255, 0.12); color: #FFD700; }
        .sgl-ctx-sep { height: 1px; background: rgba(255,255,255,0.08); margin: 3px 4px; }
    `;
    document.head.appendChild(st);

    const menu = document.createElement('div');
    menu.id = 'sgl-ctx-menu';
    document.body.appendChild(menu);

    const ICONS = {
        play:   '<svg class="btn-svg-icon" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
        mods:   '<svg class="btn-svg-icon" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
        tweaks: '<svg class="btn-svg-icon" viewBox="0 0 24 24"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/></svg>',
        prog:   '<svg class="btn-svg-icon" viewBox="0 0 24 24"><polygon points="12 2 19 8 16 21 8 21 5 8 12 2"/></svg>',
        shots:  '<svg class="btn-svg-icon" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
        folder: '<svg class="btn-svg-icon" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
        saves:  '<svg class="btn-svg-icon" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>'
    };

    function closeCtxMenu() {
        menu.classList.remove('open');
    }

    window.addEventListener('pointerdown', (e) => {
        if (!menu.contains(e.target)) closeCtxMenu();
    });
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeCtxMenu();
    });

    document.addEventListener('contextmenu', (e) => {
        const card = e.target.closest('.game-card');
        if (!card) {
            closeCtxMenu();
            return;
        }
        e.preventDefault();

        const cards = Array.from(document.querySelectorAll('.game-card'));
        const idx = cards.indexOf(card);
        if (idx === -1 || !availableGames[idx]) return;

        if (selectedIndex !== idx) {
            selectGame(idx, true);
        }
        const game = availableGames[idx];
        const hasModsAndTweaks = (!game.emuId);

        menu.innerHTML = '';
        const head = document.createElement('div');
        head.className = 'sgl-ctx-head';
        head.textContent = game.name;
        menu.appendChild(head);

        const addBtn = (iconSvg, label, fn) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'sgl-ctx-btn';
            b.innerHTML = iconSvg + '<span>' + label + '</span>';
            b.onclick = () => { closeCtxMenu(); fn(); };
            menu.appendChild(b);
        };
        const addSep = () => {
            const s = document.createElement('div');
            s.className = 'sgl-ctx-sep';
            menu.appendChild(s);
        };

        addBtn(ICONS.play, 'Запустить игру', () => triggerGameLaunch(game));
        addBtn('<svg class="btn-svg-icon" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>', (typeof isGameFavorite === 'function' ? isGameFavorite(game.id) : game.favorite) ? 'Убрать из избранного' : 'В избранное ★', () => { if (typeof toggleGameFavorite === 'function') toggleGameFavorite(game.id); });
        addBtn('<svg class="btn-svg-icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>', 'Заметки и чит-коды', () => { if (typeof openGameNotesModal === 'function') openGameNotesModal(game.id); });
        addSep();
        if (hasModsAndTweaks) {
            addBtn(ICONS.mods, 'Моды', () => openModsModal());
            addBtn(ICONS.tweaks, 'Настройки игры', () => openTweaksModal());
        }
        addBtn(ICONS.prog, 'Прогресс', () => openProgressModal());
        addBtn(ICONS.shots, 'Скриншоты', () => openShotsModal());
        addBtn('<svg class="btn-svg-icon" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>', 'Стиль этой игры', () => { if (typeof openPerGameStyleModal === 'function') openPerGameStyleModal(game.id); });
        addSep();
        addBtn(ICONS.folder, 'Открыть папку игры', async () => {
            const r = await (await fetch('/api/open_folder?id=' + game.id + '&type=game')).json();
            if (!r.ok && typeof showToast === 'function') showToast(r.error || 'Папка не найдена', true);
        });
        addBtn(ICONS.saves, 'Открыть папку сохранений', async () => {
            const r = await (await fetch('/api/open_folder?id=' + game.id + '&type=saves')).json();
            if (!r.ok && typeof showToast === 'function') showToast(r.error || 'Папка не найдена', true);
        });

        menu.classList.add('open');
        const mw = menu.offsetWidth || 205;
        const mh = menu.offsetHeight || 240;
        const x = Math.min(e.clientX, window.innerWidth - mw - 10);
        const y = Math.min(e.clientY, window.innerHeight - mh - 10);
        menu.style.left = Math.max(10, x) + 'px';
        menu.style.top = Math.max(10, y) + 'px';
    });
})();
