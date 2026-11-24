/* === LIBRARY MODES: SHOWCASE HERO PANEL & FULL GRID VIEW (TAB) === */
(function() {
    let quickGridOverlay = false;
    let prevModeBeforeTab = 'coverflow';

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function injectSgStyles() {
        if (document.getElementById('sgl-sg-css')) return;
        const st = mk('style', '', '');
        st.id = 'sgl-sg-css';
        st.textContent = [
            '#sgl-showcase-panel{position:absolute;left:calc(50% - 30px);top:43%;transform:translateY(-50%);width:min(430px,44vw);z-index:18;background:rgba(12,18,32,0.82);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,0.16);border-left:4px solid var(--sc-accent,#FFD700);border-radius:16px;padding:18px 20px;display:none;flex-direction:column;gap:10px;box-shadow:0 18px 45px rgba(0,0,0,0.65);}',
            'body.mode-showcase-active #sgl-showcase-panel{display:flex;}',
            'body.mode-showcase-active #active-logo-stage{opacity:0;pointer-events:none;height:16px;}',
            '.sc-title{font-size:clamp(20px,2.8vh,26px);font-weight:900;color:#fff;line-height:1.15;}',
            '.sc-badges{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}',
            '.sc-pill{font-size:10.5px;font-weight:800;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,0.09);color:#E2E8F0;border:1px solid rgba(255,255,255,0.12);}',
            '.sc-note{font-size:11.5px;line-height:1.45;color:rgba(255,255,255,0.78);background:rgba(0,0,0,0.28);padding:8px 10px;border-radius:9px;max-height:66px;overflow:hidden;}',
            '.sc-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;}',
            '.sc-play-btn{padding:10px 22px;border-radius:12px;border:none;background:var(--sc-accent,#FFD700);color:#090d16;font-size:13px;font-weight:900;cursor:pointer;letter-spacing:0.6px;box-shadow:0 6px 20px rgba(0,0,0,0.45);transition:transform 0.15s,filter 0.15s;}',
            '.sc-play-btn:hover{transform:translateY(-2px) scale(1.03);filter:brightness(1.1);}',
            'body.mode-grid-active #games-container{display:grid !important;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:18px;align-content:start;justify-items:center;padding:56px 44px 28px;overflow-y:auto;max-height:68vh;transform:none !important;}',
            'body.mode-grid-active #games-container::-webkit-scrollbar{width:6px;}',
            'body.mode-grid-active #games-container::-webkit-scrollbar-thumb{background:rgba(255,215,0,0.38);border-radius:6px;}',
            'body.mode-grid-active .game-card{position:relative !important;left:auto !important;top:auto !important;transform:none !important;opacity:1 !important;width:155px !important;filter:none !important;pointer-events:auto !important;}',
            'body.mode-grid-active .game-card .cover-box{width:155px !important;}',
            'body.mode-grid-active .game-card.selected{transform:translateY(-4px) scale(1.04) !important;}',
            'body.mode-grid-active #nav-prev, body.mode-grid-active #nav-next{display:none !important;}',
            'body.sgl-light-ui #sgl-showcase-panel{background:rgba(255,255,255,0.92);color:#0F172A;border:2px solid #0F172A;}',
            'body.sgl-light-ui .sc-title{color:#0F172A;}',
            'body.sgl-light-ui .sc-pill, body.sgl-light-ui .sc-note{color:#1E293B;background:rgba(15,23,42,0.07);}'
        ].join('\n');
        document.head.appendChild(st);
    }

    function ensureShowcasePanel() {
        injectSgStyles();
        let panel = document.getElementById('sgl-showcase-panel');
        if (!panel) {
            const wrap = document.querySelector('.carousel-wrapper') || document.body;
            panel = mk('div', '', '');
            panel.id = 'sgl-showcase-panel';
            wrap.appendChild(panel);
        }
        return panel;
    }

    function renderShowcaseInfo() {
        const panel = ensureShowcasePanel();
        const g = (typeof availableGames !== 'undefined' && availableGames.length > 0) ? availableGames.at(selectedIndex) : null;
        if (!g) {
            panel.innerHTML = '';
            return;
        }
        const col = g.color || '#FFD700';
        panel.style.setProperty('--sc-accent', col);
        panel.innerHTML = '';

        panel.appendChild(mk('div', 'sc-title', '', g.name));

        const badges = mk('div', 'sc-badges', '');
        if (g.tag) badges.appendChild(mk('span', 'sc-pill', 'color:' + col + ';border-color:' + col + ';', g.tag));
        const ptStr = g.running ? '● В игре' : (typeof formatPlaytime === 'function' ? formatPlaytime(g.playtime) : '');
        if (ptStr) badges.appendChild(mk('span', 'sc-pill', '', ptStr));
        const vCount = (g.path ? 1 : 0) + ((g.variants || []).filter(v => v && v.path).length);
        if (vCount >= 2) badges.appendChild(mk('span', 'sc-pill', 'color:#93C5FD;', vCount + ' VER'));
        if (g.favorite) badges.appendChild(mk('span', 'sc-pill', 'color:#FFD700;', '★ Избранное'));
        panel.appendChild(badges);

        if (g.note && g.note.trim()) {
            panel.appendChild(mk('div', 'sc-note', '', g.note.trim().slice(0, 160)));
        }

        const acts = mk('div', 'sc-actions', '');
        const playBtn = mk('button', 'sc-play-btn', '', '▶ ИГРАТЬ');
        playBtn.type = 'button';
        playBtn.onclick = () => { if (typeof triggerGameLaunch === 'function') triggerGameLaunch(g); };
        acts.appendChild(playBtn);

        if (!g.emuId) {
            const mBtn = mk('button', 'settings-btn', 'padding:8px 14px;', 'Моды');
            mBtn.type = 'button';
            mBtn.onclick = () => { if (typeof openModsModal === 'function') openModsModal(); };
            acts.appendChild(mBtn);
        }
        const pBtn = mk('button', 'settings-btn', 'padding:8px 14px;', 'Прогресс');
        pBtn.type = 'button';
        pBtn.onclick = () => { if (typeof openProgressModal === 'function') openProgressModal(); };
        const gBtn = mk('button', 'settings-btn', 'padding:8px 14px;', 'Гайд');
        gBtn.type = 'button';
        gBtn.onclick = () => { if (typeof openGuidesHubModal === 'function') openGuidesHubModal(g.id); };
        acts.append(pBtn, gBtn);
        panel.appendChild(acts);
        if (typeof window.syncAllUiModelSlots === 'function') window.syncAllUiModelSlots();
    }

    function applyShowcasePositions(cards) {
        const total = cards.length;
        const heroX = -Math.min(window.innerWidth * 0.21, 215);
        cards.forEach((card, i) => {
            card.style.filter = 'none';
            let diff = i - selectedIndex;
            if (total >= 3) {
                if (diff > total / 2) diff -= total;
                if (diff < -total / 2) diff += total;
            }
            if (diff === 0) {
                card.classList.add('selected');
                card.style.transform = 'translate(calc(-50% + ' + heroX.toFixed(0) + 'px), -58%) scale(1.12)';
                card.style.opacity = '1';
                card.style.zIndex = '20';
                card.style.pointerEvents = 'auto';
            } else {
                card.classList.remove('selected');
                const slot = diff > 0 ? (diff - 1) : diff;
                const stripX = (slot + 0.5) * 112;
                const vis = Math.abs(diff) <= 4;
                card.style.transform = 'translate(calc(-50% + ' + stripX.toFixed(0) + 'px), calc(-50% + 168px)) scale(0.46)';
                card.style.opacity = vis ? '0.78' : '0';
                card.style.zIndex = String(15 - Math.abs(diff));
                card.style.pointerEvents = vis ? 'auto' : 'none';
            }
        });
        renderShowcaseInfo();
    }

    function ensureModeOptions() {
        const sel = document.getElementById('inp-carouselMode');
        if (!sel) return;
        const vals = Array.from(sel.options).map(o => o.value);
        const extras = [
            { v: 'showcase', t: 'Крупная витрина (Showcase)' },
            { v: 'grid', t: 'Плитка всей библиотеки (Grid • Tab)' }
        ];
        extras.forEach(it => {
            if (!vals.includes(it.v)) {
                const o = mk('option', '', '', it.t);
                o.value = it.v;
                sel.appendChild(o);
            }
        });
        if (typeof currentDesign !== 'undefined' && currentDesign?.carouselMode) {
            sel.value = currentDesign.carouselMode;
        }
    }

    function hookCarouselLayout() {
        injectSgStyles();
        ensureShowcasePanel();

        const origUpdate = window.updateCarouselPositions;
        if (typeof origUpdate === 'function' && !window._sgCarouselHooked) {
            window._sgCarouselHooked = true;
            window.updateCarouselPositions = function() {
                const effMode = quickGridOverlay ? 'grid' : (currentDesign?.carouselMode || 'coverflow');
                document.body.classList.toggle('mode-showcase-active', effMode === 'showcase' && availableGames.length > 0);
                document.body.classList.toggle('mode-grid-active', effMode === 'grid' && availableGames.length > 0);

                const cards = Array.from(document.querySelectorAll('.game-card'));
                if (cards.length === 0) return;

                if (effMode === 'showcase') {
                    applyShowcasePositions(cards);
                    return;
                }
                if (effMode === 'grid') {
                    cards.forEach((c, idx) => {
                        c.classList.toggle('selected', idx === selectedIndex);
                        if (idx === selectedIndex) c.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    });
                    return;
                }
                return origUpdate.apply(this, arguments);
            };
        }

        const origSelect = window.selectGame;
        if (typeof origSelect === 'function' && !window._sgSelectHooked) {
            window._sgSelectHooked = true;
            window.selectGame = function() {
                const r = origSelect.apply(this, arguments);
                if (document.body.classList.contains('mode-showcase-active')) renderShowcaseInfo();
                return r;
            };
        }

        const origOpenCustom = window.openCustomModal;
        if (typeof origOpenCustom === 'function' && !window._sgCustomHooked) {
            window._sgCustomHooked = true;
            window.openCustomModal = function() {
                ensureModeOptions();
                const r = origOpenCustom.apply(this, arguments);
                ensureModeOptions();
                return r;
            };
        }

        // Быстрое переключение в Плитку (Grid) и обратно по клавише Tab
        window.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;
            const tag = document.activeElement ? document.activeElement.tagName : '';
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            const modalOpen = document.querySelector('.modal-backdrop.active') !== null
                || document.body.classList.contains('hud-editing')
                || document.body.classList.contains('minidock-mode');
            if (modalOpen || !availableGames || availableGames.length === 0) return;

            e.preventDefault();
            if ((currentDesign?.carouselMode || 'coverflow') === 'grid') {
                currentDesign.carouselMode = prevModeBeforeTab || 'coverflow';
                quickGridOverlay = false;
            } else {
                if (!quickGridOverlay) prevModeBeforeTab = currentDesign?.carouselMode || 'coverflow';
                quickGridOverlay = !quickGridOverlay;
            }
            if (typeof playSfx === 'function') playSfx('switch');
            window.updateCarouselPositions();
        });

        window.setLibraryViewMode = async function(mode) {
            if (typeof currentDesign === 'undefined' || !currentDesign) return;
            quickGridOverlay = false;
            currentDesign.carouselMode = mode;
            const sel = document.getElementById('inp-carouselMode');
            if (sel) sel.value = mode;
            if (typeof playSfx === 'function') playSfx('switch');
            window.updateCarouselPositions();
            if (typeof window.applyBox3dToCarousel === 'function') window.applyBox3dToCarousel();
            if (typeof window.restoreGlobalDesignFields === 'function') window.restoreGlobalDesignFields();
            try {
                await fetch('/api/design', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(currentDesign)
                });
            } catch (_) {}
            const activeG = (typeof availableGames !== 'undefined' && availableGames.length > 0) ? availableGames.at(selectedIndex) : null;
            if (activeG && typeof window.applyPerGameVisuals === 'function') window.applyPerGameVisuals(activeG.id);
        };

        ensureModeOptions();
        setTimeout(() => { if (typeof window.updateCarouselPositions === 'function') window.updateCarouselPositions(); }, 250);
    }

    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', hookCarouselLayout);
    else hookCarouselLayout();
})();
