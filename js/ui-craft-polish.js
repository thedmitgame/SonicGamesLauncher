/* === UI CRAFT POLISH: UNIFIED DESIGN SYSTEM, ESC STACK & NARROW RESPONSIVE === */
(function() {
    if (window._sglUiCraftLoaded) return;
    window._sglUiCraftLoaded = true;

    function injectCraftCss() {
        if (document.getElementById('sgl-ui-craft-css')) return;
        const st = document.createElement('style');
        st.id = 'sgl-ui-craft-css';
        st.textContent = Array.of(
            ':root { --ui-surface: #0f1522; --ui-surface-2: #161e2e; --ui-border: rgba(255,255,255,0.08); --ui-border-strong: rgba(255,255,255,0.16); --ui-accent: #3b82f6; --ui-accent-hover: #2563eb; --ui-text: #f1f5f9; --ui-muted: #94a3b8; }',
            /* Единый стиль модальных окон без вложенных "коробок в коробках" */
            '.modal-backdrop { background: rgba(6, 9, 16, 0.82) !important; }',
            '.modal-box { background: var(--ui-surface) !important; border: 1px solid var(--ui-border-strong) !important; box-shadow: 0 24px 64px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.06) !important; border-radius: 16px !important; color: var(--ui-text) !important; }',
            '.modal-title { color: var(--ui-text) !important; font-weight: 800 !important; letter-spacing: 0.2px !important; font-size: 17px !important; }',
            /* Убираем кислотно-жёлтые заголовки и лишние рамки внутри вкладок */
            '.c141-card { background: rgba(255,255,255,0.02) !important; border: 1px solid var(--ui-border) !important; border-radius: 12px !important; padding: 14px 16px !important; }',
            '.c141-card-hdr { color: var(--ui-text) !important; font-size: 12px !important; font-weight: 700 !important; letter-spacing: 0.5px !important; border-bottom: 1px solid var(--ui-border) !important; }',
            '.c141-card .custom-group[style*="border"] { border: none !important; background: rgba(255,255,255,0.025) !important; padding: 10px 12px !important; border-radius: 8px !important; }',
            '#c141-tabs-bar { background: rgba(0,0,0,0.28) !important; border: 1px solid var(--ui-border) !important; padding: 4px !important; border-radius: 10px !important; }',
            '#c141-tabs-bar .c141-tab { color: var(--ui-muted) !important; font-weight: 600 !important; border-radius: 7px !important; }',
            '#c141-tabs-bar .c141-tab:hover { color: var(--ui-text) !important; background: rgba(255,255,255,0.05) !important; }',
            '#c141-tabs-bar .c141-tab.active { background: var(--ui-accent) !important; color: #fff !important; box-shadow: 0 2px 10px rgba(59,130,246,0.35) !important; }',
            /* Унификация всех слайдеров, чекбоксов и селектов (убираем разнобой жёлтых/синих) */
            '.modal-box input[type="range"] { -webkit-appearance: none; appearance: none; height: 5px; background: rgba(255,255,255,0.12); border-radius: 999px; outline: none; accent-color: var(--ui-accent) !important; }',
            '.modal-box input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #fff; border: 2px solid var(--ui-accent); box-shadow: 0 2px 6px rgba(0,0,0,0.5); cursor: pointer; transition: transform 0.12s; }',
            '.modal-box input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.18); }',
            '.modal-box input[type="checkbox"] { accent-color: var(--ui-accent) !important; width: 15px; height: 15px; cursor: pointer; }',
            '.modal-box .custom-select, .modal-box .args-input { background: var(--ui-surface-2) !important; border: 1px solid var(--ui-border-strong) !important; color: var(--ui-text) !important; border-radius: 8px !important; font-size: 12px !important; }',
            '.modal-box .custom-select:focus, .modal-box .args-input:focus { border-color: var(--ui-accent) !important; }',
            '.modal-box b[id^="val-"] { color: #93c5fd !important; font-weight: 700 !important; }',
            /* Тонкие аккуратные скроллбары в модалках */
            '.modal-box *::-webkit-scrollbar { width: 6px; height: 6px; }',
            '.modal-box *::-webkit-scrollbar-track { background: transparent; }',
            '.modal-box *::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.16); border-radius: 999px; }',
            '.modal-box *::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.28); }',
            /* Адаптив верхней панели при узком окне (< 1040px), чтобы кнопки не наезжали */
            '@media (max-width: 1040px) { #m5-top-bar { gap: 5px !important; right: 12px !important; top: 12px !important; } #m5-top-bar .settings-btn { padding: 6px 10px !important; font-size: 11px !important; } #m6-lang-select { left: 12px !important; top: 12px !important; padding: 5px 8px !important; font-size: 11px !important; min-width: 96px !important; } }',
            '@media (max-width: 860px) { #m5-top-bar .settings-btn span:not(.btn-inner-wrap) { display: none; } }'
        ).join('\n');
        document.head.appendChild(st);
    }

    function closeTopmostOverlay() {
        // 1. Полноэкранный просмотр скриншота
        const lb = document.getElementById('shot-lightbox');
        if (lb && lb.classList.contains('active')) {
            lb.classList.remove('active');
            return true;
        }

        // 2. Выпадающие меню шапки (Профиль / Инструменты / Вид)
        const openDrops = Array.from(document.querySelectorAll('.m5-dd.open, .sgl-dd-menu.open, [data-dd-open="1"]'));
        if (openDrops.length > 0) {
            openDrops.forEach(d => { d.classList.remove('open'); d.removeAttribute('data-dd-open'); });
            return true;
        }

        // 3. Динамические модалки (Музей, Аркада, Свой диалог, О программе, 3D-слоты, Theme Studio)
        const dynamicIds = Array.of(
            'sgl-dlg-bg', 'sgl-tour-bg', 'sgl-about-modal', 'sgl-uislots-modal',
            'sgl-museum-modal', 'sgl-arcade-modal', 'sgl-theme-studio-modal',
            'sgl-mix-modal', 'sgl-ui-builder-modal', 'sgl-widgets-modal'
        );
        for (let i = 0; i < dynamicIds.length; i++) {
            const el = document.getElementById(dynamicIds.at(i));
            if (el && (el.classList.contains('active') || el.classList.contains('open') || el.offsetParent !== null)) {
                const closeBtn = el.querySelector('.close-modal-btn, [data-close]');
                if (closeBtn) closeBtn.click();
                else el.remove();
                if (typeof playSfx === 'function') playSfx('close_menu');
                return true;
            }
        }

        // 4. Любой активный .modal-backdrop (Настройки, Моды, Твики, Скриншоты, Кастомизация, Профиль)
        const activeModals = Array.from(document.querySelectorAll('.modal-backdrop.active, .m4-backdrop.open'));
        if (activeModals.length > 0) {
            const topModal = activeModals.at(activeModals.length - 1);
            if (topModal.id === 'settings-modal' && typeof closeSettings === 'function') closeSettings();
            else if (topModal.id === 'mods-modal' && typeof closeModsModal === 'function') closeModsModal();
            else if (topModal.id === 'tweaks-modal' && typeof closeTweaksModal === 'function') closeTweaksModal();
            else if (topModal.id === 'shots-modal' && typeof closeShotsModal === 'function') closeShotsModal();
            else if (topModal.id === 'custom-modal') {
                topModal.classList.remove('active');
                if (typeof playSfx === 'function') playSfx('close_menu');
            } else {
                topModal.classList.remove('active', 'open');
                if (typeof playSfx === 'function') playSfx('close_menu');
            }
            return true;
        }
        return false;
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.keyCode === 27) {
            if (document.body.classList.contains('hud-editing')) return;
            if (closeTopmostOverlay()) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        }
    }, true);


    function upgradeTourSteps() {
        const tourBg = document.getElementById('sgl-tour-bg');
        if (!tourBg) return;
        const card = tourBg.querySelector('[class*="card"], [class*="box"], div > div');
        if (!card) return;
        const txt = card.textContent || '';

        const pickTarget = (selectors) => {
            for (let i = 0; i < selectors.length; i++) {
                const el = document.querySelector(selectors.at(i));
                if (el && el.offsetParent !== null) return el;
            }
            return null;
        };

        const highlightEl = (el) => {
            document.querySelectorAll('.sgl-tour-v14-hi').forEach(x => x.classList.remove('sgl-tour-v14-hi'));
            if (!el) return;
            el.classList.add('sgl-tour-v14-hi');
        };

        if (txt.includes('ШАГ 1') || txt.includes('STEP 1')) {
            const p = card.querySelector('p, div:nth-child(3)');
            if (p && p.textContent.includes('Игры и пути')) {
                p.textContent = 'Нажмите «Найти игры автоматически» по центру экрана или «Игры и пути» снизу, чтобы подключить установленные игры и эмуляторы.';
            }
            highlightEl(pickTarget(Array.of('.empty-btn-primary', '#btn-ui-settings')));
        } else if (txt.includes('ШАГ 3') || txt.includes('STEP 3')) {
            const h = card.querySelector('h3, h2, div:nth-child(2)');
            const p = card.querySelector('p, div:nth-child(3)');
            if (h && h.textContent.includes('Моды, твики')) h.textContent = 'Профиль, 3D-Музей и Аркада';
            if (p && p.textContent.includes('.ZIP')) {
                p.textContent = 'Откройте «Профиль» в верхней панели, чтобы следить за Изумрудами Хаоса, осматривать 3D-трофеи и растить Кристального Чао!';
            }
            highlightEl(pickTarget(Array.of('#m5-top-bar button', '#m5-top-bar')));
        } else if (txt.includes('ШАГ 4') || txt.includes('STEP 4')) {
            const p = card.querySelector('p, div:nth-child(3)');
            if (p && p.textContent.includes('.sonicpack')) {
                p.textContent = 'В меню «Вид» сверху доступна Кастомизация в 4 вкладках: темы, шейдеры, 3D-коробки, музыка Jukebox и сборка своих .sonicpack!';
            }
            highlightEl(pickTarget(Array.of('#m5-top-bar', '#btn-ui-custom')));
        } else {
            highlightEl(null);
        }
    }

    const tourCss = document.createElement('style');
    tourCss.textContent = '.sgl-tour-v14-hi { position: relative !important; z-index: 10002 !important; box-shadow: 0 0 0 3px #facc15, 0 0 24px rgba(250,204,21,0.65) !important; border-radius: 12px !important; }';
    document.head.appendChild(tourCss);

    let tourTimer = 0;
    const tourObs = new MutationObserver(() => {
        if (!document.getElementById('sgl-tour-bg')) {
            document.querySelectorAll('.sgl-tour-v14-hi').forEach(x => x.classList.remove('sgl-tour-v14-hi'));
            return;
        }
        clearTimeout(tourTimer);
        tourTimer = setTimeout(upgradeTourSteps, 30);
    });
    tourObs.observe(document.body, { childList: true, subtree: true });

    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', injectCraftCss);
    else injectCraftCss();
})();
