/* === PRO GAMEPAD NAVIGATION, VIRTUAL CURSOR & RUMBLE === */
(function() {
    const st = document.createElement('style');
    st.textContent = `
        .gp-focus {
            outline: 2.5px solid #FFD700 !important;
            outline-offset: 3px !important;
            box-shadow: 0 0 18px rgba(255, 215, 0, 0.65) !important;
        }
        #gp-vcursor {
            position: fixed; left: 50%; top: 50%; width: 22px; height: 22px;
            border: 3px solid #FFD700; border-radius: 50%;
            background: rgba(255, 215, 0, 0.22);
            box-shadow: 0 0 12px rgba(255, 215, 0, 0.9), inset 0 0 4px #fff;
            pointer-events: none; z-index: 999999; display: none;
            transform: translate(-50%, -50%); transition: transform 0.08s ease;
        }
        #gp-vcursor.down { transform: translate(-50%, -50%) scale(0.75); background: rgba(255, 215, 0, 0.65); }
    `;
    document.head.appendChild(st);

    let vCursor = null;
    function ensureCursor() {
        if (!vCursor && document.body) {
            vCursor = document.createElement('div');
            vCursor.id = 'gp-vcursor';
            document.body.appendChild(vCursor);
        }
        return vCursor;
    }

    let gpMode = false, cursorMode = false;
    let curX = window.innerWidth / 2, curY = window.innerHeight / 2;
    let lastAct = 0, prevR3 = false, prevClick = false, focusIdx = 0;

    function pulseRumble(gp, weak = 0.25, strong = 0.0, ms = 50) {
        if ((typeof currentDesign !== 'undefined' ? currentDesign : null) && (typeof currentDesign !== 'undefined' ? currentDesign : null).liteMode) return;
        const act = gp && gp.vibrationActuator;
        if (act && typeof act.playEffect === 'function') {
            act.playEffect('dual-rumble', { duration: ms, weakMagnitude: weak, strongMagnitude: strong }).catch(() => {});
        }
    }

    function updateHintText() {
        const hint = document.getElementById('sub-hint');
        if (!hint) return;
        if (!gpMode) {
            const k = ((typeof currentDesign !== 'undefined' ? currentDesign : null)?.screenshotKey || 'F6').toUpperCase();
            hint.innerText = `← → ВЫБОР • ENTER ЗАПУСК • ${k} СКРИНШОТ • F11 ПОЛНЫЙ ЭКРАН`;
        } else if (cursorMode) {
            hint.innerText = 'КУРСОР АКТИВЕН • СТИК ДВИЖЕНИЕ • (A) КЛИК • R3 ОБЫЧНЫЙ РЕЖИМ';
        } else {
            hint.innerText = 'СТИК ВЫБОР • (A) ЗАПУСК • (X) МОДЫ • (Y) ПРОГРЕСС • R3 КУРСОР';
        }
    }

    function setGamepadActive(active) {
        if (gpMode === active) return;
        gpMode = active;
        if (!gpMode) {
            cursorMode = false;
            const c = ensureCursor();
            if (c) c.style.display = 'none';
            document.querySelectorAll('.gp-focus').forEach(el => el.classList.remove('gp-focus'));
        }
        updateHintText();
    }

    function toggleCursorMode(gp) {
        cursorMode = !cursorMode;
        const c = ensureCursor();
        if (c) {
            c.style.display = cursorMode ? 'block' : 'none';
            c.style.left = curX + 'px';
            c.style.top = curY + 'px';
        }
        if (cursorMode) document.querySelectorAll('.gp-focus').forEach(el => el.classList.remove('gp-focus'));
        if (typeof playSfx === 'function') playSfx('switch');
        pulseRumble(gp, 0.35, 0.15, 70);
        updateHintText();
        if (typeof showToast === 'function') {
            showToast(cursorMode ? 'Режим курсора геймпада включён (R3 — выкл.)' : 'Режим курсора выключен');
        }
    }

    window.addEventListener('mousemove', () => { if (gpMode) setGamepadActive(false); }, { passive: true });
    window.addEventListener('keydown', () => { if (gpMode) setGamepadActive(false); }, { passive: true });

    function getOpenModal() {
        return document.getElementById('sgl-dlg-bg')?.classList.contains('open') ? document.getElementById('sgl-dlg-bg')
             : document.getElementById('sgl-tour-bg')?.classList.contains('open') ? document.getElementById('sgl-tour-bg')
             : document.getElementById('m4-modal')?.classList.contains('open') ? document.getElementById('m4-modal')
             : document.querySelector('.modal-backdrop.active');
    }

    function getModalItems(modal) {
        if (!modal) return [];
        return Array.from(modal.querySelectorAll('button:not([disabled]), input[type="checkbox"], select, input[type="range"]'))
            .filter(el => el.offsetParent !== null);
    }

    function highlightItem(items, idx) {
        document.querySelectorAll('.gp-focus').forEach(el => el.classList.remove('gp-focus'));
        if (!items.length) return;
        focusIdx = (idx + items.length) % items.length;
        const target = items.at(focusIdx);
        target.classList.add('gp-focus');
        target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function fireVirtualClick(x, y) {
        const el = document.elementFromPoint(x, y);
        if (!el) return;
        const target = el.closest('button, select, input, .game-card, .shot-thumb, [onclick]') || el;
        if (target.tagName === 'SELECT') {
            target.selectedIndex = (target.selectedIndex + 1) % target.options.length;
            target.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }
        if (target.tagName === 'INPUT' && target.type === 'range') {
            const rect = target.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
            const min = Number(target.min || 0), max = Number(target.max || 100);
            target.value = Math.round(min + ratio * (max - min));
            target.dispatchEvent(new Event('input', { bubbles: true }));
            target.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }
        target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y }));
        target.click();
    }

    window.pollGamepad = function() {};

    function proGamepadLoop(ts) {
        if (!document.hidden && navigator.getGamepads) {
            const gp = Array.from(navigator.getGamepads()).find(g => g && g.connected);
            if (gp) {
                const ax = (i) => (gp.axes && gp.axes.length > i) ? (gp.axes.at(i) || 0) : 0;
                const b = (i) => Boolean(gp.buttons && gp.buttons.at(i)?.pressed);

                const r3Now = b(11);
                if (r3Now && !prevR3) {
                    setGamepadActive(true);
                    toggleCursorMode(gp);
                }
                prevR3 = r3Now;

                if (cursorMode) {
                    const c = ensureCursor();
                    const dx = Math.abs(ax(0)) > 0.14 ? ax(0) : (Math.abs(ax(2)) > 0.14 ? ax(2) : 0);
                    const dy = Math.abs(ax(1)) > 0.14 ? ax(1) : (Math.abs(ax(3)) > 0.14 ? ax(3) : 0);
                    if (dx !== 0 || dy !== 0) {
                        const spd = b(5) ? 16 : 9.5;
                        curX = Math.max(4, Math.min(window.innerWidth - 4, curX + dx * spd));
                        curY = Math.max(4, Math.min(window.innerHeight - 4, curY + dy * spd));
                        if (c) { c.style.left = curX + 'px'; c.style.top = curY + 'px'; }
                    }
                    if ((b(12) || b(13)) && ts - lastAct > 90) {
                        const m = getOpenModal();
                        const sc = m ? (m.querySelector('.tab-pane.active, .mods-list, .shots-grid, .modal-box') || m) : null;
                        if (sc) sc.scrollTop += b(13) ? 45 : -45;
                        lastAct = ts;
                    }
                    const clickNow = b(0) || b(7);
                    if (c) c.classList.toggle('down', clickNow);
                    if (clickNow && !prevClick) {
                        pulseRumble(gp, 0.22, 0.08, 40);
                        fireVirtualClick(curX, curY);
                    }
                    prevClick = clickNow;
                    if (b(1) && ts - lastAct > 240) {
                        const m = getOpenModal();
                        if (m) {
                            const cb = m.querySelector('#sgl-dlg-cancel, #sgl-t-skip, #m4-b-ok, .close-modal-btn');
                            if (cb) cb.click(); else m.classList.remove('active', 'open');
                            lastAct = ts;
                        }
                    }
                    requestAnimationFrame(proGamepadLoop);
                    return;
                }

                if (ts - lastAct > 195) {
                    const left = ax(0) < -0.55 || b(14), right = ax(0) > 0.55 || b(15);
                    const up = ax(1) < -0.55 || b(12), down = ax(1) > 0.55 || b(13);
                    const btnA = b(0), btnB = b(1), btnX = b(2), btnY = b(3);
                    const btnLB = b(4), btnRB = b(5), btnBack = b(8), btnStart = b(9);

                    if (left || right || up || down || btnA || btnB || btnX || btnY || btnLB || btnRB || btnBack || btnStart) {
                        setGamepadActive(true);
                        const modal = getOpenModal();
                        if (modal) {
                            const items = getModalItems(modal);
                            const curEl = items.at(focusIdx);
                            if (btnB) {
                                const cb = modal.querySelector('#sgl-dlg-cancel, #sgl-t-skip, #m4-b-ok, .close-modal-btn');
                                if (cb) cb.click(); else modal.classList.remove('active', 'open');
                                playSfx('close_menu'); lastAct = ts + 80;
                            } else if (btnLB || btnRB) {
                                const tabs = Array.from(modal.querySelectorAll('.tab-btn'));
                                if (tabs.length > 1) {
                                    const ct = Math.max(0, tabs.findIndex(t => t.classList.contains('active')));
                                    tabs.at((ct + (btnRB ? 1 : -1) + tabs.length) % tabs.length).click();
                                    focusIdx = 0;
                                    setTimeout(() => highlightItem(getModalItems(modal), 0), 40);
                                    lastAct = ts + 60;
                                }
                            } else if (down || up) {
                                highlightItem(items, focusIdx + (down ? 1 : -1));
                                playSfx('switch'); pulseRumble(gp, 0.12, 0, 30); lastAct = ts;
                            } else if ((left || right) && curEl?.type === 'range') {
                                const step = Math.max(1, Math.round((Number(curEl.max) - Number(curEl.min)) / 20));
                                curEl.value = Number(curEl.value) + (right ? step : -step);
                                curEl.dispatchEvent(new Event('input', { bubbles: true })); lastAct = ts;
                            } else if (btnA && curEl) {
                                if (curEl.tagName === 'SELECT') {
                                    curEl.selectedIndex = (curEl.selectedIndex + 1) % curEl.options.length;
                                    curEl.dispatchEvent(new Event('change', { bubbles: true }));
                                } else curEl.click();
                                pulseRumble(gp, 0.25, 0.1, 45); lastAct = ts + 70;
                            }
                        } else {
                            if (left || right) { moveSelection(right ? 1 : -1); pulseRumble(gp, 0.18, 0, 35); lastAct = ts; }
                            else if (btnLB || btnRB) { moveSelection(btnRB ? 2 : -2); pulseRumble(gp, 0.25, 0, 45); lastAct = ts; }
                            else if (btnA && availableGames.length > 0) { pulseRumble(gp, 0.6, 0.75, 180); triggerGameLaunch(availableGames.at(selectedIndex)); lastAct = ts + 300; }
                            else if (btnX && !document.getElementById('mods-btn')?.classList.contains('hidden')) { focusIdx = 0; openModsModal(); lastAct = ts + 120; }
                            else if (btnY && !document.getElementById('progress-btn')?.classList.contains('hidden')) { focusIdx = 0; openProgressModal(); lastAct = ts + 120; }
                            else if (btnStart) { focusIdx = 0; openSettings(); lastAct = ts + 120; }
                            else if (btnBack) { document.getElementById('m5-roulette-btn')?.click(); pulseRumble(gp, 0.3, 0.2, 90); lastAct = ts + 250; }
                        }
                    }
                }
            }
        }
        requestAnimationFrame(proGamepadLoop);
    }
    requestAnimationFrame(proGamepadLoop);
})();
