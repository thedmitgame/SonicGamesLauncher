/* === MODULAR DESKTOP / HUD INFO WIDGETS === */
(function() {
    let profileSnap = { totalSeconds: 0, emeraldsCur: 0, emeraldsMax: 0, achDone: 0, achMax: 0, topGame: '—' };

    const WIDGET_DEFS = [
        { id: 'w-clock', key: 'clock', title: 'Аркадные часы (TIME)', defX: 11, defY: 16 },
        { id: 'w-emeralds', key: 'emeralds', title: 'Сводка Изумрудов и трофеев', defX: 88, defY: 22 },
        { id: 'w-playtime', key: 'playtime', title: 'Общее время и топ-игра', defX: 12, defY: 27 },
        { id: 'w-notes', key: 'notes', title: 'Заметка выбранной игры', defX: 87, defY: 35 }
    ];

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function injectWidgetStyles() {
        if (document.getElementById('sgl-hudw-css')) return;
        const st = mk('style', '', '');
        st.id = 'sgl-hudw-css';
        st.textContent = [
            '.sgl-hud-widget{position:fixed;z-index:22;background:rgba(12,18,32,0.78);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.16);border-left:3px solid var(--title-color,#FFD700);border-radius:12px;padding:8px 13px;color:var(--text-color,#fff);min-width:155px;max-width:250px;box-shadow:0 10px 26px rgba(0,0,0,0.45);display:none;flex-direction:column;gap:3px;transform:translate(-50%,-50%);}',
            '.sgl-hud-widget.w-visible{display:flex;}',
            'body.minidock-mode .sgl-hud-widget{display:none !important;}',
            '.hw-tag{font-size:9.5px;font-weight:900;letter-spacing:1.2px;color:var(--title-color,#FFD700);text-transform:uppercase;opacity:0.92;}',
            '.hw-main{font-size:16px;font-weight:900;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.hw-sub{font-size:10.5px;opacity:0.72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.hw-note-body{font-size:11px;line-height:1.38;opacity:0.86;max-height:58px;overflow:hidden;white-space:pre-line;}',
            'body.sgl-light-ui .sgl-hud-widget{background:rgba(255,255,255,0.9);color:#0F172A;border:2px solid #0F172A;box-shadow:4px 4px 0 rgba(15,23,42,0.85);}',
            'body.sgl-light-ui .hw-tag{color:#DC2626;}'
        ].join('\n');
        document.head.appendChild(st);
    }

    function getWidgetsCfg() {
        if (typeof currentDesign === 'undefined' || !currentDesign) return {};
        if (!currentDesign.hudWidgets) {
            currentDesign.hudWidgets = { clock: false, emeralds: false, playtime: false, notes: false };
        }
        return currentDesign.hudWidgets;
    }

    function ensureWidgetNodes() {
        injectWidgetStyles();
        WIDGET_DEFS.forEach(w => {
            if (document.getElementById('sgl-' + w.id)) return;
            const node = mk('div', 'sgl-hud-widget', 'left:' + w.defX + '%;top:' + w.defY + '%;');
            node.id = 'sgl-' + w.id;
            node.setAttribute('data-hud-id', w.id);
            if (w.key === 'emeralds' || w.key === 'playtime') {
                node.style.cursor = 'pointer';
                node.onclick = () => {
                    if (!document.body.classList.contains('hud-editing') && typeof openProfileSummaryModal === 'function') {
                        openProfileSummaryModal();
                    }
                };
            } else if (w.key === 'notes') {
                node.style.cursor = 'pointer';
                node.onclick = () => {
                    const g = (typeof availableGames !== 'undefined') ? availableGames.at(selectedIndex) : null;
                    if (!document.body.classList.contains('hud-editing') && g && typeof openGameNotesModal === 'function') {
                        openGameNotesModal(g.id);
                    }
                };
            }
            document.body.appendChild(node);
        });

        const hudSel = document.getElementById('hud-target-select');
        if (hudSel) {
            const curVals = Array.from(hudSel.options).map(o => o.value);
            WIDGET_DEFS.forEach(w => {
                if (!curVals.includes(w.id)) {
                    const o = mk('option', '', '', 'Виджет: ' + w.title);
                    o.value = w.id;
                    hudSel.appendChild(o);
                }
            });
        }
    }

    function fmtShortHours(sec) {
        if (!sec || sec <= 0) return '0 мин.';
        const m = Math.floor(sec / 60);
        if (m < 60) return m + ' мин.';
        return (sec / 3600).toFixed(1) + ' ч.';
    }

    function updateClockWidget() {
        const el = document.getElementById('sgl-w-clock');
        if (!el || !el.classList.contains('w-visible')) return;
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        const dd = now.toLocaleDateString(document.getElementById('m6-lang-select')?.value === 'en' ? 'en-US' : 'ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
        el.innerHTML = '';
        el.append(
            mk('div', 'hw-tag', '', 'TIME ZONE'),
            mk('div', 'hw-main', 'font-variant-numeric:tabular-nums;', hh + ':' + mm + ':' + ss),
            mk('div', 'hw-sub', '', dd)
        );
    }

    function updateStatsWidgets() {
        const emEl = document.getElementById('sgl-w-emeralds');
        if (emEl && emEl.classList.contains('w-visible')) {
            emEl.innerHTML = '';
            emEl.append(
                mk('div', 'hw-tag', '', 'ПРОГРЕСС ПРОФИЛЯ'),
                mk('div', 'hw-main', 'color:#4ADE80;', '◆ ' + profileSnap.emeraldsCur + ' / ' + (profileSnap.emeraldsMax || 0)),
                mk('div', 'hw-sub', '', 'Достижения: ' + profileSnap.achDone + ' / ' + (profileSnap.achMax || 0))
            );
        }

        const ptEl = document.getElementById('sgl-w-playtime');
        if (ptEl && ptEl.classList.contains('w-visible')) {
            ptEl.innerHTML = '';
            ptEl.append(
                mk('div', 'hw-tag', '', 'АКТИВНОСТЬ ИГРОКА'),
                mk('div', 'hw-main', 'color:#60A5FA;', fmtShortHours(profileSnap.totalSeconds)),
                mk('div', 'hw-sub', '', 'Топ: ' + (profileSnap.topGame || '—'))
            );
        }

        const ntEl = document.getElementById('sgl-w-notes');
        if (ntEl && ntEl.classList.contains('w-visible')) {
            const g = (typeof availableGames !== 'undefined' && availableGames.length > 0) ? availableGames.at(selectedIndex) : null;
            ntEl.innerHTML = '';
            ntEl.appendChild(mk('div', 'hw-tag', '', g ? ('ЗАМЕТКА • ' + g.name) : 'ЗАМЕТКА ИГРЫ'));
            const txt = (g && g.note && g.note.trim()) ? g.note.trim() : 'Нажмите, чтобы добавить заметку или чит-коды...';
            ntEl.appendChild(mk('div', 'hw-note-body', '', txt));
        }
    }

    async function fetchProfileSnapshot() {
        const cfg = getWidgetsCfg();
        if (!cfg.emeralds && !cfg.playtime) return;
        try {
            const r = await fetch('/api/profile_summary');
            profileSnap = await r.json();
            updateStatsWidgets();
        } catch (_) {}
    }

    window.syncHudWidgets = function() {
        ensureWidgetNodes();
        const cfg = getWidgetsCfg();
        const cLayout = currentDesign?.customLayout || {};
        WIDGET_DEFS.forEach(w => {
            const el = document.getElementById('sgl-' + w.id);
            if (!el) return;
            const enabled = Boolean(cfg[w.key]) && !(cLayout[w.id]?.hidden);
            el.classList.toggle('w-visible', enabled);
            const pos = cLayout[w.id];
            if (!pos || typeof pos.x !== 'number') {
                el.style.left = w.defX + '%';
                el.style.top = w.defY + '%';
                el.style.transform = 'translate(-50%, -50%)';
            }
        });
        updateClockWidget();
        updateStatsWidgets();
    };

    function injectWidgetsCustomizerBox() {
        const slot = document.getElementById('sgl-studio-widgets-slot');
        const pane = slot || document.getElementById('tab-studio') || document.getElementById('tab-appearance');
        if (!pane || document.getElementById('sgl-hudw-cfg-box')) return;

        const box = mk('div', 'char-card-cfg', 'margin-top:8px;margin-bottom:10px;');
        box.id = 'sgl-hudw-cfg-box';
        box.appendChild(mk('div', 'char-cfg-header', 'color:#FFD700;', 'Инфо-виджеты главного экрана (двигаются по F2)'));

        const grid = mk('div', '', 'display:grid;grid-template-columns:1fr 1fr;gap:6px;');
        const cfg = getWidgetsCfg();

        WIDGET_DEFS.forEach(w => {
            const lbl = mk('label', '', 'display:flex;align-items:center;gap:6px;font-size:11.5px;padding:5px 8px;background:rgba(0,0,0,0.25);border-radius:7px;cursor:pointer;');
            const chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.className = 'sgl-hw-chk';
            chk.dataset.wkey = w.key;
            chk.style.accentColor = '#FFD700';
            chk.checked = Boolean(cfg[w.key]);
            chk.onchange = () => {
                const cur = getWidgetsCfg();
                cur[w.key] = chk.checked;
                if (chk.checked && currentDesign?.customLayout?.[w.id]) {
                    currentDesign.customLayout[w.id].hidden = false;
                }
                window.syncHudWidgets();
                if (chk.checked && (w.key === 'emeralds' || w.key === 'playtime')) fetchProfileSnapshot();
            };
            lbl.append(chk, mk('span', '', '', w.title));
            grid.appendChild(lbl);
        });
        box.appendChild(grid);

        pane.appendChild(box);
    }

    const _bootHw = () => {
        ensureWidgetNodes();

        const origApply = window.applyButtonsAndHud;
        if (typeof origApply === 'function' && !window._hwApplyHooked) {
            window._hwApplyHooked = true;
            window.applyButtonsAndHud = function() {
                const r = origApply.apply(this, arguments);
                window.syncHudWidgets();
                return r;
            };
        }

        const origSelect = window.selectGame;
        if (typeof origSelect === 'function' && !window._hwSelectHooked) {
            window._hwSelectHooked = true;
            window.selectGame = function() {
                const r = origSelect.apply(this, arguments);
                updateStatsWidgets();
                return r;
            };
        }

        const origOpenCustom = window.openCustomModal;
        if (typeof origOpenCustom === 'function' && !window._hwCustomHooked) {
            window._hwCustomHooked = true;
            window.openCustomModal = function() {
                const r = origOpenCustom.apply(this, arguments);
                injectWidgetsCustomizerBox();
                const cfg = getWidgetsCfg();
                document.querySelectorAll('.sgl-hw-chk').forEach(c => {
                    c.checked = Boolean(cfg[c.dataset.wkey]);
                });
                return r;
            };
        }

        setInterval(updateClockWidget, 1000);
        setTimeout(() => {
            window.syncHudWidgets();
            fetchProfileSnapshot();
        }, 550);
    };

    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', _bootHw);
    else _bootHw();
})();
