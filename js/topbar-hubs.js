/* === CLEAN 4-HUB TOP BAR (SEARCH, PROFILE, TOOLS, VIEW) === */
(function() {
    const SVG_SEARCH = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    const SVG_TROPHY = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>';
    const SVG_TOOLS = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>';
    const SVG_VIEW = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>';
    const SVG_DICE = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.4"/><circle cx="15.5" cy="15.5" r="1.4"/><circle cx="12" cy="12" r="1.4"/></svg>';
    const SVG_SAVE = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>';
    const SVG_FOLDER = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
    const SVG_BOOK = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';
    const SVG_NOTE = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';
    const SVG_FILM = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2.5"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>';
    const SVG_EYE = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    const SVG_CHEV = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.75;"><polyline points="6 9 12 15 18 9"/></svg>';

    let openHubWrap = null;
    let closeTimer = null;

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function injectTopbarStyles() {
        if (document.getElementById('sgl-topbar-hubs-css')) return;
        const st = mk('style', '', '');
        st.id = 'sgl-topbar-hubs-css';
        st.textContent = Array.of(
            '#m5-top-bar{position:fixed;top:14px;right:20px;z-index:905;display:flex;align-items:center;gap:8px;}',
            '#m4-btn{display:none !important;}',
            '.sgl-hub-wrap{position:relative;display:inline-flex;align-items:center;}',
            '.sgl-hub-btn{height:36px;padding:0 13px !important;font-size:12px !important;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;}',
            '.sgl-hub-icon-only{width:36px;padding:0 !important;justify-content:center;}',
            '.sgl-hub-dd{position:absolute;top:calc(100% + 8px);right:0;min-width:225px;background:rgba(13,19,33,0.96);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,0.16);border-radius:12px;padding:6px;box-shadow:0 16px 38px rgba(0,0,0,0.78);display:none;flex-direction:column;gap:2px;z-index:980;}',
            '.sgl-hub-wrap.open .sgl-hub-dd{display:flex;}',
            'body.hud-editing .sgl-hub-dd{display:none !important;}',
            '.sgl-dd-sec{font-size:10px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.48);padding:5px 10px 3px;}',
            '.sgl-dd-sep{height:1px;background:rgba(255,255,255,0.09);margin:4px 6px;}',
            '.sgl-dd-item{background:transparent;border:none;color:#f1f5f9;padding:8px 10px;border-radius:8px;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;text-align:left;width:100%;transition:background 0.15s,color 0.15s;}',
            '.sgl-dd-item:hover{background:rgba(255,255,255,0.11);color:#FFD700;}',
            '.sgl-dd-item-left{display:inline-flex;align-items:center;gap:8px;}',
            '.sgl-dd-dot{width:7px;height:7px;border-radius:50%;background:transparent;flex-shrink:0;}',
            '.sgl-dd-item.is-active .sgl-dd-dot{background:#2563eb;box-shadow:0 0 8px #3b82f6;}',
            '.sgl-dd-item.is-active{color:#93C5FD;background:rgba(37,99,235,0.14);}',
            'body.sgl-light-ui .sgl-hub-dd{background:rgba(255,255,255,0.96);border:2px solid #0F172A;box-shadow:6px 6px 0 rgba(15,23,42,0.85);}',
            'body.sgl-light-ui .sgl-dd-item{color:#0F172A;}',
            'body.sgl-light-ui .sgl-dd-item:hover{background:rgba(37,99,235,0.12);color:#1D4ED8;}',
            'body.sgl-light-ui .sgl-dd-sec{color:#64748B;}',
            'body.sgl-light-ui .sgl-dd-sep{background:rgba(15,23,42,0.12);}'
        ).join('\n');
        document.head.appendChild(st);
    }

    function closeAllDropdowns() {
        document.querySelectorAll('.sgl-hub-wrap.open').forEach(w => w.classList.remove('open'));
        openHubWrap = null;
    }

    function syncActiveViewDots() {
        const curMode = document.body.classList.contains('mode-grid-active')
            ? 'grid'
            : ((typeof currentDesign !== 'undefined' && currentDesign && currentDesign.carouselMode) ? currentDesign.carouselMode : 'coverflow');
        document.querySelectorAll('.sgl-dd-view-mode').forEach(btn => {
            btn.classList.toggle('is-active', btn.dataset.vmode === curMode);
        });
        const supItem = document.getElementById('sgl-dd-super-fx');
        if (supItem) {
            const on = (typeof currentDesign === 'undefined' || !currentDesign) ? true : (currentDesign.superSaveFx !== false);
            supItem.classList.toggle('is-active', on);
        }
    }

    function bindDropdownEvents(wrap, triggerBtn, directClickFn) {
        wrap.addEventListener('pointerenter', () => {
            if (document.body.classList.contains('hud-editing')) return;
            if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
            if (openHubWrap && openHubWrap !== wrap) openHubWrap.classList.remove('open');
            wrap.classList.add('open');
            openHubWrap = wrap;
            syncActiveViewDots();
        });
        wrap.addEventListener('pointerleave', () => {
            closeTimer = setTimeout(() => {
                wrap.classList.remove('open');
                if (openHubWrap === wrap) openHubWrap = null;
            }, 180);
        });
        triggerBtn.addEventListener('click', (e) => {
            if (document.body.classList.contains('hud-editing')) return;
            e.stopPropagation();
            if (typeof directClickFn === 'function') {
                closeAllDropdowns();
                directClickFn();
                return;
            }
            const wasOpen = wrap.classList.contains('open');
            closeAllDropdowns();
            if (!wasOpen) {
                wrap.classList.add('open');
                openHubWrap = wrap;
                syncActiveViewDots();
            }
        });
    }

    function makeDdItem(iconSvg, label, onClickFn, extraId, viewModeKey) {
        const b = mk('button', 'sgl-dd-item' + (viewModeKey ? ' sgl-dd-view-mode' : ''), '');
        b.type = 'button';
        if (extraId) b.id = extraId;
        if (viewModeKey) b.dataset.vmode = viewModeKey;
        const left = mk('span', 'sgl-dd-item-left', '');
        if (iconSvg) left.innerHTML = iconSvg;
        left.appendChild(mk('span', '', '', label));
        b.appendChild(left);
        if (viewModeKey) b.appendChild(mk('span', 'sgl-dd-dot', ''));
        b.onclick = (e) => {
            e.stopPropagation();
            closeAllDropdowns();
            onClickFn();
        };
        return b;
    }

    function buildTopbarHubs() {
        injectTopbarStyles();
        let bar = document.getElementById('m5-top-bar');
        if (!bar) {
            bar = mk('div', '', '');
            bar.id = 'm5-top-bar';
            bar.setAttribute('data-hud-id', 'm5bar');
            document.body.appendChild(bar);
        }
        bar.innerHTML = '';

        // 1. ХАБ «ПОИСК» (быстрый фильтр + рулетка внутри окна поиска)
        const searchBtn = mk('button', 'settings-btn sgl-hub-btn sgl-hub-icon-only', '');
        searchBtn.type = 'button';
        searchBtn.id = 'sgl-search-top-btn';
        searchBtn.title = 'Быстрый поиск игры (Ctrl+F)';
        searchBtn.innerHTML = '<span class="btn-inner-wrap">' + SVG_SEARCH + '</span>';
        searchBtn.onclick = () => {
            if (typeof window.openQuickFinder === 'function') window.openQuickFinder();
        };
        bar.appendChild(searchBtn);

        // 2. ХАБ «ПРОФИЛЬ» (клик -> Профиль; при наведении -> Профиль / 3D-Музей)
        const profWrap = mk('div', 'sgl-hub-wrap', '');
        const profBtn = mk('button', 'settings-btn sgl-hub-btn', '');
        profBtn.type = 'button';
        profBtn.id = 'sgl-profile-btn';
        profBtn.innerHTML = '<span class="btn-inner-wrap">' + SVG_TROPHY + '<span>Профиль</span></span>';
        const profDd = mk('div', 'sgl-hub-dd', 'min-width:205px;');
        profDd.append(
            makeDdItem(SVG_TROPHY, 'Сводный профиль', () => {
                if (typeof window.openProfileSummaryModal === 'function') window.openProfileSummaryModal();
            }),
            makeDdItem(SVG_VIEW, '3D-Музей трофеев', () => {
                if (typeof window.openTrophyMuseumModal === 'function') window.openTrophyMuseumModal();
            })
        );
        profWrap.append(profBtn, profDd);
        bindDropdownEvents(profWrap, profBtn, () => {
            if (typeof window.openProfileSummaryModal === 'function') window.openProfileSummaryModal();
        });
        bar.appendChild(profWrap);

        // 3. ХАБ «ИНСТРУМЕНТЫ» (Рулетка, Сейвы и бэкапы, Гайды и читы, Папки)
        const toolsWrap = mk('div', 'sgl-hub-wrap', '');
        const toolsBtn = mk('button', 'settings-btn sgl-hub-btn', '');
        toolsBtn.type = 'button';
        toolsBtn.id = 'sgl-tools-hub-btn';
        toolsBtn.innerHTML = '<span class="btn-inner-wrap">' + SVG_TOOLS + '<span>Инструменты</span>' + SVG_CHEV + '</span>';
        const toolsDd = mk('div', 'sgl-hub-dd', '');
        toolsDd.append(
            makeDdItem(SVG_DICE, 'Случайная игра (Рулетка)', () => {
                if (typeof window.runLauncherRoulette === 'function') window.runLauncherRoulette();
            }, 'm5-roulette-btn'),
            mk('div', 'sgl-dd-sep', ''),
            makeDdItem(SVG_SAVE, 'Сейвы и бэкапы', () => {
                if (typeof openProgressModal === 'function' && Array.isArray(availableGames) && availableGames.length > 0) openProgressModal();
                else if (typeof showToast === 'function') showToast('Сначала добавьте хотя бы одну игру в карусель', true);
            }),
            makeDdItem(SVG_FOLDER, 'Папка сохранений', () => {
                if (typeof window.openCurrentGameFolder === 'function') window.openCurrentGameFolder('saves');
            }, 'm5-dir-save-btn'),
            makeDdItem(SVG_FOLDER, 'Папка игры', () => {
                if (typeof window.openCurrentGameFolder === 'function') window.openCurrentGameFolder('game');
            }, 'm5-dir-game-btn'),
            mk('div', 'sgl-dd-sep', ''),
            makeDdItem(SVG_BOOK, 'Гайды и читы', () => {
                if (typeof window.openGuidesHubModal === 'function') window.openGuidesHubModal();
            }, 'sgl-guides-top-btn'),
            makeDdItem(SVG_NOTE, 'Заметки и чит-коды', () => {
                if (typeof window.openGameNotesModal === 'function') window.openGameNotesModal();
            })
        );
        toolsWrap.append(toolsBtn, toolsDd);
        bindDropdownEvents(toolsWrap, toolsBtn, null);
        bar.appendChild(toolsWrap);

        // 4. ХАБ «ВИД» (Режимы карусели + Атмосфера + Zen-экран)
        const viewWrap = mk('div', 'sgl-hub-wrap', '');
        const viewBtn = mk('button', 'settings-btn sgl-hub-btn', '');
        viewBtn.type = 'button';
        viewBtn.id = 'sgl-view-hub-btn';
        viewBtn.innerHTML = '<span class="btn-inner-wrap">' + SVG_VIEW + '<span>Вид</span>' + SVG_CHEV + '</span>';
        const viewDd = mk('div', 'sgl-hub-dd', '');
        const switchMode = (m) => {
            if (typeof window.setLibraryViewMode === 'function') window.setLibraryViewMode(m);
            syncActiveViewDots();
        };
        viewDd.append(
            mk('div', 'sgl-dd-sec', '', 'Режим отображения'),
            makeDdItem('', '3D-круг (Cover Flow)', () => switchMode('coverflow'), '', 'coverflow'),
            makeDdItem('', 'Дуга (Arc Wheel)', () => switchMode('arc'), '', 'arc'),
            makeDdItem('', 'Горизонтальный ряд (Row)', () => switchMode('row'), '', 'row'),
            makeDdItem('', 'Крупная витрина (Showcase)', () => switchMode('showcase'), '', 'showcase'),
            makeDdItem('', 'Плитка библиотеки (Grid • Tab)', () => switchMode('grid'), '', 'grid'),
            mk('div', 'sgl-dd-sep', ''),
            makeDdItem(SVG_FILM, 'Атмосфера и заставка', () => {
                document.getElementById('m4-btn')?.click();
            }),
            makeDdItem(SVG_EYE, 'Чистый экран (Zen • H)', () => {
                if (typeof window.toggleZenCleanMode === 'function') window.toggleZenCleanMode(true);
            }),
            (() => {
                const it = makeDdItem('', 'Реакция UI на сейвы (Super-режим)', () => {
                    if (typeof window.toggleSuperSaveFx === 'function') window.toggleSuperSaveFx();
                }, 'sgl-dd-super-fx');
                it.appendChild(mk('span', 'sgl-dd-dot', ''));
                return it;
            })()
        );
        viewWrap.append(viewBtn, viewDd);
        bindDropdownEvents(viewWrap, viewBtn, null);
        bar.appendChild(viewWrap);

        syncActiveViewDots();
    }

    window.addEventListener('pointerdown', (e) => {
        if (!e.target.closest('.sgl-hub-wrap')) closeAllDropdowns();
    });
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllDropdowns();
    });

    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', () => setTimeout(buildTopbarHubs, 60));
    else setTimeout(buildTopbarHubs, 60);
})();
