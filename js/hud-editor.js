/* === LIVE IN-APP HUD EDITOR (F2) === */
(function() {
    let hudActive = false;
    let selectedId = 'header';
    let backupLayout = null;

    function getAllHudElements() {
        return Array.from(document.getElementsByTagName('*')).filter(e => e.dataset && e.dataset.hudId);
    }

    function findHudElement(id) {
        return getAllHudElements().find(e => e.dataset.hudId === id) || null;
    }

    function ensureSelectOptions() {
        const sel = document.getElementById('hud-target-select');
        if (!sel) return;
        const extras = [
            { v: 'btn-progress', t: 'Кнопка: Прогресс' },
            { v: 'btn-help', t: 'Кнопка: Обучение (?)' },
            { v: 'm5bar', t: 'Панель: Рулетка и папки' },
            { v: 'm4btn', t: 'Кнопка: Атмосфера' },
            { v: 'lang', t: 'Переключатель языка' }
        ];
        const existing = Array.from(sel.options).map(o => o.value);
        extras.forEach(item => {
            if (!existing.includes(item.v)) {
                const o = document.createElement('option');
                o.value = item.v;
                o.textContent = item.t;
                sel.appendChild(o);
            }
        });
    }

    function ensureElementCoords(id) {
        if (!currentDesign.customLayout) currentDesign.customLayout = {};
        const cur = currentDesign.customLayout[id];
        if (cur && typeof cur.x === 'number' && typeof cur.y === 'number') return cur;
        const el = findHudElement(id);
        let x = 50, y = 50;
        if (el && el.offsetParent !== null) {
            const r = el.getBoundingClientRect();
            x = +(((r.left + r.width / 2) / window.innerWidth) * 100).toFixed(1);
            y = +(((r.top + r.height / 2) / window.innerHeight) * 100).toFixed(1);
        }
        const obj = {
            x: x, y: y,
            scale: (cur && cur.scale) ? cur.scale : 1,
            hidden: Boolean(cur && cur.hidden),
            anchor: 'center'
        };
        currentDesign.customLayout[id] = obj;
        return obj;
    }

    function highlightSelected() {
        getAllHudElements().forEach(el => {
            const isSel = (el.dataset.hudId === selectedId);
            el.style.outlineColor = isSel ? '#FFD700' : '';
            el.style.outlineStyle = (hudActive && isSel) ? 'solid' : '';
        });
        const sel = document.getElementById('hud-target-select');
        if (sel && sel.value !== selectedId) sel.value = selectedId;
        const chk = document.getElementById('hud-hide-chk');
        if (chk && currentDesign && currentDesign.customLayout) {
            const p = currentDesign.customLayout[selectedId];
            chk.checked = Boolean(p && p.hidden);
        }
    }

    window.enterHudEditor = function() {
        if (!currentDesign || hudActive) return;
        document.querySelectorAll('.modal-backdrop.active').forEach(m => m.classList.remove('active'));
        document.getElementById('m4-modal')?.classList.remove('open');
        ensureSelectOptions();
        backupLayout = JSON.parse(JSON.stringify(currentDesign.customLayout || {}));
        hudActive = true;
        document.body.classList.add('hud-editing');
        if (typeof playSfx === 'function') playSfx('open_menu');
        window.selectHudById(selectedId || 'header');
        if (typeof showToast === 'function') {
            showToast('Редактор HUD: перетаскивайте кнопки мышью, колесо — масштаб, ESC — отмена');
        }
    };

    window.selectHudById = function(id) {
        selectedId = id;
        if (currentDesign) ensureElementCoords(id);
        highlightSelected();
    };

    window.hudAlign = function(dir) {
        if (!hudActive || !currentDesign) return;
        const p = ensureElementCoords(selectedId);
        if (dir === 'centerX') p.x = 50;
        if (dir === 'centerY') p.y = 50;
        applyButtonsAndHud();
        highlightSelected();
        if (typeof playSfx === 'function') playSfx('switch');
    };

    window.hudPresetRow = function(kind) {
        if (!hudActive || !currentDesign) return;
        const baseIds = new Array('btn-settings', 'btn-mods', 'btn-tweaks', 'btn-shots', 'btn-progress');
        const ids = baseIds.filter(id => {
            const el = findHudElement(id);
            return el && !el.classList.contains('hidden');
        });
        if (kind === 'bottom') {
            const step = 13;
            const startX = 50 - ((ids.length - 1) * step) / 2;
            ids.forEach((id, i) => {
                const p = ensureElementCoords(id);
                p.x = +(startX + i * step).toFixed(1);
                p.y = 92;
                p.hidden = false;
            });
        } else if (kind === 'left') {
            ids.forEach((id, i) => {
                const p = ensureElementCoords(id);
                p.x = 11;
                p.y = +(34 + i * 8.5).toFixed(1);
                p.hidden = false;
            });
        }
        applyButtonsAndHud();
        highlightSelected();
        if (typeof playSfx === 'function') playSfx('switch');
    };

    window.toggleHudHide = function(hideVal) {
        if (!hudActive || !currentDesign) return;
        const p = ensureElementCoords(selectedId);
        p.hidden = Boolean(hideVal);
        applyButtonsAndHud();
        highlightSelected();
    };

    window.resetHudLayout = function() {
        if (!hudActive || !currentDesign) return;
        currentDesign.customLayout = {};
        applyDesign(currentDesign);
        highlightSelected();
        if (typeof playSfx === 'function') playSfx('switch');
        if (typeof showToast === 'function') showToast('Расположение элементов сброшено');
    };

    window.exitHudEditor = async function(saveChanges) {
        if (!hudActive) return;
        hudActive = false;
        document.body.classList.remove('hud-editing');
        getAllHudElements().forEach(el => {
            el.style.outlineColor = '';
            el.style.outlineStyle = '';
        });
        if (saveChanges) {
            if (typeof playSfx === 'function') playSfx('launch');
            await fetch('/api/design', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentDesign)
            });
            if (typeof showToast === 'function') showToast('Макет HUD сохранён!');
        } else {
            currentDesign.customLayout = backupLayout || {};
            applyDesign(currentDesign);
            if (typeof playSfx === 'function') playSfx('close_menu');
        }
    };

    function findHudTarget(node) {
        let cur = node;
        while (cur && cur !== document.body) {
            if (cur.dataset && cur.dataset.hudId) return cur;
            cur = cur.parentElement;
        }
        return null;
    }

    document.addEventListener('pointerdown', (e) => {
        if (!hudActive) return;
        if (e.target.closest('#hud-editor-bar')) return;
        const target = findHudTarget(e.target);
        if (!target) return;
        e.preventDefault();
        e.stopPropagation();
        const id = target.dataset.hudId;
        const p = ensureElementCoords(id);
        window.selectHudById(id);
        const startX = e.clientX, startY = e.clientY;
        const origX = p.x, origY = p.y;
        const onMove = (ev) => {
            let nx = origX + ((ev.clientX - startX) / window.innerWidth) * 100;
            let ny = origY + ((ev.clientY - startY) / window.innerHeight) * 100;
            if (Math.abs(nx - 50) < 1.2) nx = 50;
            if (Math.abs(ny - 50) < 1.2) ny = 50;
            p.x = Math.max(2, Math.min(98, +nx.toFixed(1)));
            p.y = Math.max(2, Math.min(98, +ny.toFixed(1)));
            p.anchor = 'center';
            applyButtonsAndHud();
            highlightSelected();
        };
        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    }, true);

    document.addEventListener('click', (e) => {
        if (!hudActive || e.target.closest('#hud-editor-bar')) return;
        if (findHudTarget(e.target)) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    window.addEventListener('wheel', (e) => {
        if (!hudActive || !currentDesign || e.target.closest('#hud-editor-bar')) return;
        const p = ensureElementCoords(selectedId);
        const delta = e.deltaY < 0 ? 0.05 : -0.05;
        p.scale = Math.max(0.5, Math.min(2.0, +((p.scale || 1) + delta).toFixed(2)));
        applyButtonsAndHud();
        highlightSelected();
    }, { passive: true });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'F2') {
            e.preventDefault();
            if (hudActive) window.exitHudEditor(true);
            else window.enterHudEditor();
        } else if (e.key === 'Escape' && hudActive) {
            e.preventDefault();
            e.stopPropagation();
            window.exitHudEditor(false);
        }
    }, true);
})();
