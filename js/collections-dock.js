/* === CUSTOM COLLECTIONS (SHELVES) & SLEEK FRAMELESS MINI-DOCK === */
(function() {
    let collectionsList = new Array();
    let activeShelfId = '';
    let miniDockActive = false;

    const SVG_DOCK = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="15" y1="3" x2="15" y2="21"/></svg>';
    const SVG_EXPAND = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function injectStyles() {
        let st = document.getElementById('sgl-coldock-css');
        if (!st) {
            st = mk('style', '', '');
            st.id = 'sgl-coldock-css';
            document.head.appendChild(st);
        }
        st.textContent = [
            '@media (max-height: 750px){ body.layout-classic header:not([style*="top:"]){margin-top:30px !important;padding-top:0 !important;} #main-title-text{font-size:21px !important;} #sub-hint{margin-top:2px !important;font-size:9.5px !important;} #sgl-cat-bar:not([style*="left:"]){margin:3px auto 2px auto !important;padding:3px 6px !important;} #active-logo-stage:not([style*="top:"]){height:54px !important;margin:0 auto 2px auto !important;} #active-logo-img{max-height:50px !important;} .carousel-wrapper:not([style*="top:"]){margin-top:-6px !important;transform:scale(0.88);transform-origin:center 42%;} }',
            'body.layout-classic header:not([style*="top:"]){margin-top:36px !important;padding-top:4px !important;}',
'body.layout-classic #active-logo-stage:not([style*="top:"]){margin-top:4px !important;margin-bottom:6px !important;}',
'@media (min-width: 1360px){ body.layout-classic header:not([style*="top:"]){margin-top:10px !important;} }',
'[data-hud-id="m5bar"]{gap:5px !important;}',
'[data-hud-id="m5bar"] .settings-btn{padding:5px 9px !important;font-size:11.5px !important;}',
'@media (max-width: 1220px){ [data-hud-id="m5bar"]:not([style*="left:"]){right:16px !important;top:12px !important;gap:6px !important;} [data-hud-id="m5bar"] .settings-btn{padding:0 10px !important;font-size:11.5px !important;} #m6-lang-select:not([style*="left:"]){padding:5px 8px !important;font-size:11px !important;} #sgl-jukebox:not([style*="top:"]){top:56px !important;right:16px !important;transform:scale(0.92);transform-origin:top right;} }',
            '#sgl-cat-bar:not([style*="left:"]){position:relative !important;top:auto !important;left:auto !important;transform:none !important;margin:6px auto 4px auto !important;width:fit-content;} #sgl-cat-bar{z-index:68;display:flex;align-items:center;gap:5px;background:rgba(10,15,28,0.82);backdrop-filter:blur(12px);padding:5px 7px;border-radius:999px;border:1px solid rgba(255,255,255,0.16);box-shadow:0 8px 24px rgba(0,0,0,0.45);max-width:90vw;overflow-x:auto;flex-wrap:nowrap;}',
            '#sgl-cat-bar::-webkit-scrollbar{height:0;}',
            '#sgl-cat-bar .sgl-cat-pill{appearance:none;-webkit-appearance:none;background:transparent;border:1px solid transparent;color:rgba(255,255,255,0.75);font-size:11.5px;font-weight:700;padding:5px 13px;border-radius:999px;cursor:pointer;transition:all 0.18s ease;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;line-height:1.1;}',
            '#sgl-cat-bar .sgl-cat-pill:hover{color:#fff;background:rgba(255,255,255,0.1);}',
            '#sgl-cat-bar .sgl-cat-pill.active{background:linear-gradient(135deg,rgba(255,215,0,0.24),rgba(245,158,11,0.18));color:#FFD700;border-color:rgba(255,215,0,0.42);box-shadow:0 2px 10px rgba(255,215,0,0.15);}',
            '#sgl-cat-bar #sgl-add-shelf-btn{border:1px dashed rgba(255,255,255,0.28);color:#93C5FD;padding:4px 11px;}',
            '#sgl-cat-bar #sgl-add-shelf-btn:hover{border-color:#FFD700;color:#FFD700;background:rgba(255,215,0,0.1);}',
            '.sgl-shelf-dot{display:inline-block;width:7px;height:7px;border-radius:50%;flex-shrink:0;box-shadow:0 0 6px currentColor;}',
            '#sgl-minidock-view{position:fixed;inset:0;z-index:9450;background:linear-gradient(180deg,#0c1222 0%,#080c17 100%);display:none;flex-direction:column;padding:10px;gap:8px;border:1.5px solid rgba(255,215,0,0.32);border-radius:0;box-shadow:inset 0 0 25px rgba(0,0,0,0.7);}',
            'body.minidock-mode{padding:0 !important;}',
            'body.minidock-mode #sgl-minidock-view{display:flex;}',
            'body.minidock-mode header, body.minidock-mode footer, body.minidock-mode .carousel-wrapper, body.minidock-mode #active-logo-stage, body.minidock-mode #m5-top-bar, body.minidock-mode #m4-btn, body.minidock-mode #m6-lang-select, body.minidock-mode #sgl-jukebox, body.minidock-mode #sgl-jb-drawer, body.minidock-mode #sgl-cat-bar, body.minidock-mode .corner-btn{display:none !important;}',
            '.mdock-hdr{display:flex;align-items:center;justify-content:space-between;padding:4px 6px 8px;border-bottom:1px solid rgba(255,255,255,0.1);cursor:grab;}',
            '.mdock-hdr:active{cursor:grabbing;}',
            '.mdock-brand{font-size:11px;font-weight:900;letter-spacing:1.2px;color:#FFD700;}',
            '.mdock-hdr-btns{display:flex;gap:4px;}',
            '.mdock-icon-btn{width:26px;height:26px;border-radius:7px;border:1px solid rgba(255,255,255,0.16);background:rgba(255,255,255,0.07);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;transition:0.15s;}',
            '.mdock-icon-btn:hover{background:rgba(255,215,0,0.22);border-color:#FFD700;color:#FFD700;}',
            '.mdock-list{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding-right:2px;}',
            '.mdock-list::-webkit-scrollbar{width:4px;}',
            '.mdock-list::-webkit-scrollbar-thumb{background:rgba(255,215,0,0.3);border-radius:4px;}',
            '.mdock-row{display:flex;align-items:center;gap:9px;padding:6px 8px;border-radius:10px;background:rgba(255,255,255,0.045);border:1px solid rgba(255,255,255,0.08);cursor:pointer;transition:all 0.16s ease;}',
            '.mdock-row:hover{background:rgba(255,255,255,0.11);border-color:var(--md-col,#FFD700);transform:translateX(2px);}',
            '.mdock-ava{width:36px;height:36px;border-radius:8px;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#fff;border:1.5px solid rgba(255,255,255,0.22);text-shadow:0 1px 4px rgba(0,0,0,0.6);}',
            '.mdock-ava img{width:100%;height:100%;object-fit:cover;}',
            '.mdock-meta{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;}',
            '.mdock-name{font-size:11.5px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.mdock-sub{font-size:9.5px;color:rgba(255,255,255,0.52);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.mdock-play{width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.08);color:#FFD700;display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0;transition:0.15s;}',
            '.mdock-row:hover .mdock-play{background:var(--md-col,#FFD700);color:#090d16;}',
            '.mdock-player{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:7px 8px;border-radius:10px;background:rgba(0,0,0,0.38);border:1px solid rgba(255,255,255,0.1);}',
            '.mdock-track{flex:1;min-width:0;font-size:10.5px;font-weight:700;color:#E2E8F0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
        ].join('\n');
    }

    async function persistCollections() {
        await fetch('/api/collections/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ collections: collectionsList })
        });
    }

    function ensureCatBar() {
        injectStyles();
        let bar = document.getElementById('sgl-cat-bar');
        if (!bar) {
            bar = mk('div', '', '');
            bar.id = 'sgl-cat-bar';
            bar.setAttribute('data-hud-id', 'catbar');
            const hdr = document.querySelector('header'); if (hdr) hdr.after(bar); else document.body.appendChild(bar);
        }
        bar.setAttribute('data-hud-id', 'catbar');
        return bar;
    }

    window.applyShelfFilter = function(shelfId) {
        activeShelfId = shelfId || '';
        const installed = (typeof gamesData !== 'undefined') ? gamesData.filter(g => g.exists) : [];
        if (!activeShelfId) {
            availableGames = installed;
        } else {
            const col = collectionsList.find(c => c.id === activeShelfId);
            const setIds = new Set(col ? (col.games || []) : []);
            const filtered = installed.filter(g => setIds.has(g.id));
            if (filtered.length === 0) {
                if (typeof showToast === 'function') showToast('На этой полке пока нет установленных игр', true);
                activeShelfId = '';
                availableGames = installed;
            } else {
                availableGames = filtered;
            }
        }
        selectedIndex = 0;
        if (typeof playSfx === 'function') playSfx('switch');
        const bak = gamesData.slice();
        gamesData = availableGames;
        if (typeof renderMainScreen === 'function') renderMainScreen();
        gamesData = bak;
        syncCollectionPills();
    };

    function syncCollectionPills() {
        injectStyles();
        const hasInstalled = (typeof gamesData !== 'undefined') && gamesData.some(g => g.exists);
        if (!hasInstalled) return;

        // Прячем полосу полок, если у пользователя нет ни своих полок, ни избранного, ни эмуляторов — либо оставляем аккуратную капсулу
        const bar = ensureCatBar();
        bar.style.display = (typeof currentDesign !== 'undefined' && currentDesign?.customLayout?.catbar?.hidden) ? 'none' : 'flex';
        if (typeof applyButtonsAndHud === 'function' && currentDesign?.customLayout?.catbar) applyButtonsAndHud(currentDesign);
        bar.querySelectorAll('.sgl-custom-shelf-pill, #sgl-add-shelf-btn').forEach(el => el.remove());

        if (bar.children.length === 0) {
            const allB = mk('button', 'sgl-cat-pill' + (!activeShelfId ? ' active' : ''), '', 'Все игры');
            allB.type = 'button';
            allB.onclick = () => window.applyShelfFilter('');
            bar.appendChild(allB);
        }

        bar.querySelectorAll('.sgl-cat-pill:not(.sgl-custom-shelf-pill)').forEach(b => {
            const origClick = b.onclick;
            if (!b._shelfHooked && origClick) {
                b._shelfHooked = true;
                b.onclick = function(ev) {
                    activeShelfId = '';
                    bar.querySelectorAll('.sgl-custom-shelf-pill').forEach(p => p.classList.remove('active'));
                    origClick.call(this, ev);
                };
            }
            if (activeShelfId) b.classList.remove('active');
        });

        collectionsList.forEach(col => {
            const btn = mk('button', 'sgl-cat-pill sgl-custom-shelf-pill' + (activeShelfId === col.id ? ' active' : ''), '', '');
            btn.type = 'button';
            const dot = mk('span', 'sgl-shelf-dot', 'background:' + (col.color || '#FFD700') + ';color:' + (col.color || '#FFD700') + ';', '');
            btn.append(dot, mk('span', '', '', col.name));
            btn.onclick = () => window.applyShelfFilter(col.id);
            btn.oncontextmenu = (e) => { e.preventDefault(); window.openCollectionsModal(col.id); };
            bar.appendChild(btn);
        });

        const addBtn = mk('button', 'sgl-cat-pill', '', '+ Полка');
        addBtn.type = 'button';
        addBtn.id = 'sgl-add-shelf-btn';
        addBtn.title = 'Создать или настроить пользовательские полки (коллекции)';
        addBtn.onclick = () => window.openCollectionsModal();
        bar.appendChild(addBtn);
    }

    function makeInitials(title) {
        const words = String(title || '').replace(/[^a-zA-Zа-яА-Я0-9 ]/g, ' ').trim().split(/\s+/).filter(Boolean);
        if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
        return String(title || 'SG').slice(0, 2).toUpperCase();
    }

    function bindDockDrag(hdrEl) {
        let dragging = false, lx = 0, ly = 0;
        hdrEl.onpointerdown = (e) => {
            if (e.target.closest('button')) return;
            dragging = true;
            lx = e.screenX;
            ly = e.screenY;
            hdrEl.setPointerCapture(e.pointerId);
        };
        hdrEl.onpointermove = (e) => {
            if (!dragging) return;
            const dx = e.screenX - lx;
            const dy = e.screenY - ly;
            if (Math.abs(dx) >= 2 || Math.abs(dy) >= 2) {
                lx = e.screenX;
                ly = e.screenY;
                fetch('/api/window/drag_by', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dx, dy })
                });
            }
        };
        hdrEl.onpointerup = () => { dragging = false; };
    }

    function renderMiniDockItems() {
        let dock = document.getElementById('sgl-minidock-view');
        if (!dock) {
            dock = mk('div', '', '');
            dock.id = 'sgl-minidock-view';
            document.body.appendChild(dock);
        }
        dock.innerHTML = '';

        // 1. Безрамочная шапка с перетаскиванием окна
        const hdr = mk('div', 'mdock-hdr', '');
        hdr.appendChild(mk('span', 'mdock-brand', '', 'SONIC DOCK'));
        const hBtns = mk('div', 'mdock-hdr-btns', '');
        const expBtn = mk('button', 'mdock-icon-btn', 'border-color:rgba(255,215,0,0.45);color:#FFD700;', '');
        expBtn.type = 'button'; expBtn.title = 'Развернуть полный лаунчер (F9)'; expBtn.innerHTML = SVG_EXPAND;
        expBtn.onclick = () => window.toggleMiniDockMode(false);
        const trayB = mk('button', 'mdock-icon-btn', '', '—');
        trayB.type = 'button'; trayB.title = 'Свернуть в трей';
        trayB.onclick = () => { if (typeof hideToTray === 'function') hideToTray(); };
        hBtns.append(expBtn, trayB);
        hdr.appendChild(hBtns);
        bindDockDrag(hdr);
        dock.appendChild(hdr);

        // 2. Аккуратный список карточек игр с иконками/обложками и полным названием
        const list = mk('div', 'mdock-list', '');
        const installed = (typeof gamesData !== 'undefined') ? gamesData.filter(g => g.exists) : [];
        installed.forEach(g => {
            const col = g.color || '#3B82F6';
            const row = mk('div', 'mdock-row', '', '');
            row.style.setProperty('--md-col', col);

            const ava = mk('div', 'mdock-ava', 'background:linear-gradient(135deg,' + col + ',#0f172a);border-color:' + col + ';', '');
            if (g.cover) {
                const img = document.createElement('img');
                img.src = g.cover;
                img.alt = '';
                ava.appendChild(img);
            } else {
                ava.textContent = makeInitials(g.name);
            }

            const meta = mk('div', 'mdock-meta', '');
            meta.append(
                mk('div', 'mdock-name', '', g.name),
                mk('div', 'mdock-sub', '', g.running ? '● В игре' : (typeof formatPlaytime === 'function' ? formatPlaytime(g.playtime) : (g.tag || '')))
            );

            const playBadge = mk('div', 'mdock-play', '', '▶');
            row.append(ava, meta, playBadge);
            row.onclick = () => { if (typeof triggerGameLaunch === 'function') triggerGameLaunch(g); };
            list.appendChild(row);
        });
        dock.appendChild(list);

        // 3. Компактный музыкальный плеер снизу дока
        const pl = mk('div', 'mdock-player', '');
        const curTitle = document.getElementById('jb-title')?.textContent || 'OST Jukebox';
        const trLbl = mk('div', 'mdock-track', '', '♪ ' + curTitle);
        trLbl.id = 'mdock-track-lbl';
        const pBtns = mk('div', '', 'display:flex;gap:4px;flex-shrink:0;');
        const bPlay = mk('button', 'mdock-icon-btn', '', '⏯');
        bPlay.type = 'button';
        bPlay.onclick = () => {
            document.getElementById('jb-play-btn')?.click();
            setTimeout(() => { trLbl.textContent = '♪ ' + (document.getElementById('jb-title')?.textContent || 'OST Jukebox'); }, 80);
        };
        const bNext = mk('button', 'mdock-icon-btn', '', '⏭');
        bNext.type = 'button';
        bNext.onclick = () => {
            const nb = document.querySelector('#sgl-jukebox button[title*="Следующ"], #sgl-jukebox button[title*="Next"]');
            nb?.click();
            setTimeout(() => { trLbl.textContent = '♪ ' + (document.getElementById('jb-title')?.textContent || 'OST Jukebox'); }, 120);
        };
        pBtns.append(bPlay, bNext);
        pl.append(trLbl, pBtns);
        dock.appendChild(pl);
    }

    window.openCollectionsModal = function(focusColId, preselectGameId) {
        document.getElementById('sgl-cols-modal')?.remove();
        const bg = mk('div', 'modal-backdrop active', 'z-index:9865;');
        bg.id = 'sgl-cols-modal';
        bg.onclick = (e) => { if (e.target === bg) bg.remove(); };

        const box = mk('div', 'modal-box', 'width:520px;max-width:94vw;');
        const h2 = mk('div', 'modal-title', '', 'Пользовательские полки (Коллекции)');

        const createRow = mk('div', '', 'display:flex;gap:6px;margin-bottom:10px;align-items:center;');
        const nameInp = mk('input', 'args-input', 'flex:1;margin-top:0;user-select:text !important;', '');
        nameInp.type = 'text';
        nameInp.placeholder = 'Название новой полки (напр. 2D Классика)...';
        const colInp = document.createElement('input');
        colInp.type = 'color';
        colInp.value = '#38BDF8';
        colInp.style.cssText = 'width:36px;height:30px;border:none;background:none;cursor:pointer;';
        const createBtn = mk('button', 'btn-small btn-accent', 'padding:7px 12px;', '+ Создать');
        createBtn.type = 'button';

        const listWrap = mk('div', 'mods-list', 'max-height:350px;display:flex;flex-direction:column;gap:8px;padding-right:4px;');

        function renderShelvesEditor() {
            listWrap.innerHTML = '';
            if (collectionsList.length === 0) {
                listWrap.appendChild(mk('div', '', 'text-align:center;opacity:0.6;padding:18px;font-size:12px;', 'Полок пока нет. Введите название выше и нажмите «+ Создать»!'));
                return;
            }
            const allGames = (typeof gamesData !== 'undefined') ? gamesData : [];
            collectionsList.forEach((col, cIdx) => {
                const card = mk('div', 'char-card-cfg', 'margin-bottom:0;border-color:' + (focusColId === col.id ? '#FFD700' : 'rgba(255,255,255,0.12)') + ';');
                const hdr = mk('div', 'char-cfg-header', '');
                const leftTitle = mk('div', '', 'display:flex;align-items:center;gap:6px;');
                leftTitle.append(
                    mk('span', 'sgl-shelf-dot', 'width:10px;height:10px;background:' + (col.color || '#38BDF8') + ';', ''),
                    mk('span', '', '', col.name + ' (' + (col.games || []).length + ')')
                );
                const delB = mk('button', 'btn-small btn-clear', 'padding:3px 8px;', 'Удалить полку');
                delB.type = 'button';
                delB.onclick = async () => {
                    if (activeShelfId === col.id) activeShelfId = '';
                    collectionsList.splice(cIdx, 1);
                    await persistCollections();
                    renderShelvesEditor();
                    syncCollectionPills();
                };
                hdr.append(leftTitle, delB);

                const checksGrid = mk('div', '', 'display:grid;grid-template-columns:1fr 1fr;gap:5px;max-height:145px;overflow-y:auto;padding-top:4px;');
                const gSet = new Set(col.games || []);
                allGames.forEach(g => {
                    const lbl = mk('label', '', 'display:flex;align-items:center;gap:6px;font-size:11.5px;padding:4px 6px;border-radius:6px;background:rgba(0,0,0,0.24);cursor:pointer;' + (preselectGameId === g.id ? 'border:1px solid #FFD700;' : ''));
                    const chk = document.createElement('input');
                    chk.type = 'checkbox';
                    chk.style.accentColor = col.color || '#4ADE80';
                    chk.checked = gSet.has(g.id);
                    chk.onchange = async () => {
                        if (!Array.isArray(col.games)) col.games = [];
                        if (chk.checked && !col.games.includes(g.id)) col.games.push(g.id);
                        else if (!chk.checked) col.games = col.games.filter(x => x !== g.id);
                        await persistCollections();
                        hdr.firstChild.lastChild.textContent = col.name + ' (' + col.games.length + ')';
                        syncCollectionPills();
                    };
                    const span = mk('span', '', 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;', g.name);
                    lbl.append(chk, span);
                    checksGrid.appendChild(lbl);
                });

                card.append(hdr, checksGrid);
                listWrap.appendChild(card);
            });
        }

        createBtn.onclick = async () => {
            const nm = nameInp.value.trim();
            if (!nm) return;
            const newId = 'col_' + Date.now();
            const initGames = preselectGameId ? [preselectGameId] : [];
            collectionsList.push({ id: newId, name: nm, color: colInp.value, games: initGames });
            nameInp.value = '';
            focusColId = newId;
            await persistCollections();
            if (typeof playSfx === 'function') playSfx('launch');
            renderShelvesEditor();
            syncCollectionPills();
        };

        createRow.append(nameInp, colInp, createBtn);
        const closeBtn = mk('button', 'close-modal-btn', '', 'Готово');
        closeBtn.type = 'button';
        closeBtn.onclick = () => {
            bg.remove();
            if (activeShelfId) window.applyShelfFilter(activeShelfId);
        };

        box.append(h2, createRow, listWrap, closeBtn);
        bg.appendChild(box);
        document.body.appendChild(bg);
        renderShelvesEditor();
        if (typeof playSfx === 'function') playSfx('open_menu');
    };


    window.toggleMiniDockMode = async function(forceState) {
        const next = (typeof forceState === 'boolean') ? forceState : !miniDockActive;
        miniDockActive = next;
        injectStyles();
        if (miniDockActive) {
            document.querySelectorAll('.modal-backdrop.active').forEach(m => m.classList.remove('active'));
            renderMiniDockItems();
            document.body.classList.add('minidock-mode');
        } else {
            document.body.classList.remove('minidock-mode');
            if (typeof updateCarouselPositions === 'function') setTimeout(updateCarouselPositions, 80);
        }
        if (typeof playSfx === 'function') playSfx('switch');
        await fetch('/api/window/minidock', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enable: miniDockActive })
        });
    };

    function injectTopDockBtn() {
        document.getElementById('sgl-minidock-top-btn')?.remove();
        if (document.getElementById('btn-ui-minidock')) return;
        const b = mk('button', 'corner-btn dock-corner', '', '');
        b.type = 'button';
        b.id = 'btn-ui-minidock';
        b.setAttribute('data-hud-id', 'btn-minidock');
        b.title = 'Свернуть в компактный Мини-док сбоку экрана (F9)';
        b.innerHTML = '<span class="btn-inner-wrap">' + SVG_DOCK + '</span>';
        b.onclick = () => window.toggleMiniDockMode(true);
        document.body.appendChild(b);
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === 'F9') {
            const anyModal = document.querySelector('.modal-backdrop.active');
            if (!anyModal || miniDockActive) { e.preventDefault(); window.toggleMiniDockMode(); }
        }
    });

    async function pullCollectionsInitial() {
        try {
            const r = await fetch('/api/games');
            const d = await r.json();
            collectionsList = d.collections || new Array();
            syncCollectionPills();
        } catch (_) {}
    }

    const _bootColDock = () => {
        injectStyles();
        setTimeout(injectTopDockBtn, 320);
        setTimeout(pullCollectionsInitial, 420);
        const origLoad = window.loadGames;
        if (typeof origLoad === 'function' && !window._colDockWrapped) {
            window._colDockWrapped = true;
            window.loadGames = async function() {
                const res = await origLoad.apply(this, arguments);
                await pullCollectionsInitial();
                if (miniDockActive) renderMiniDockItems();
                return res;
            };
        }
    };

    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', _bootColDock);
    else _bootColDock();
})();
