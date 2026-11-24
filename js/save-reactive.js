/* === SAVE-REACTIVE UI (SUPER MODE) & COMPLETION REWARD TOASTS === */
(function() {
    const REWARDED_KEY = 'sgl_unlocked_game_rewards_v1';
    const REWARD_GAME_IDS = Array.of('sonic1', 'sonic2', 'soniccd', 'sonic3', 'mania', 'srb2', 'origins');

    window._sglSaveSummary = { anyAllEmeralds: false, completedIds: new Array(), games: {} };
    let lastFetchTs = 0;
    let wasRunningGame = false;

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function readNotifiedSet() {
        try {
            const raw = JSON.parse(localStorage.getItem(REWARDED_KEY) || '[]');
            return new Set(Array.isArray(raw) ? raw : new Array());
        } catch (_) { return new Set(); }
    }

    function saveNotifiedSet(setObj) {
        try { localStorage.setItem(REWARDED_KEY, JSON.stringify(Array.from(setObj))); } catch (_) {}
    }

    function isSuperFxEnabled() {
        if (typeof currentDesign === 'undefined' || !currentDesign) return true;
        if (currentDesign.liteMode) return false;
        return currentDesign.superSaveFx !== false;
    }

    window.applySuperModeToActiveCard = function() {
        const cards = document.querySelectorAll('.game-card');
        cards.forEach(c => {
            c.classList.remove('sgl-card-super');
            c.querySelector('.sgl-super-badge')?.remove();
        });
        document.getElementById('sgl-showcase-super-pill')?.remove();

        const g = (typeof availableGames !== 'undefined' && availableGames.length > 0) ? availableGames.at(selectedIndex) : null;
        const summary = window._sglSaveSummary || { games: {} };
        const info = (g && summary.games) ? summary.games[g.id] : null;
        const shouldSuper = Boolean(info && info.allEmeralds && isSuperFxEnabled());
        const aura = (typeof currentDesign !== 'undefined' && currentDesign && currentDesign.superAuraStyle) || 'gold';

        document.body.classList.remove('sgl-super-aura-gold', 'sgl-super-aura-hyper', 'sgl-super-aura-dark', 'sgl-super-aura-shield');
        document.body.classList.toggle('sgl-super-active', shouldSuper);
        if (shouldSuper) document.body.classList.add('sgl-super-aura-' + aura);
        if (!shouldSuper || !g) return;

        const selCard = cards.item(selectedIndex);
        if (selCard) {
            selCard.classList.add('sgl-card-super');
            const tagEl = selCard.querySelector('.game-tag') || selCard.querySelector('.game-title');
            if (tagEl && !selCard.querySelector('.sgl-super-badge')) {
                tagEl.after(mk('span', 'sgl-super-badge', '', '★ SUPER'));
            }
        }
        const scBadges = document.querySelector('#sgl-showcase-panel .sc-badges');
        if (scBadges && !document.getElementById('sgl-showcase-super-pill')) {
            const pill = mk('span', 'sc-pill sgl-super-badge-sc', '', '★ SUPER');
            pill.id = 'sgl-showcase-super-pill';
            scBadges.prepend(pill);
        }
    };

    async function notifyNewCompletionRewards(summary) {
        if (!summary || !summary.games) return;
        const notified = readNotifiedSet();
        let diskState = {};
        try {
            diskState = await (await fetch('/api/arcade/state')).json();
            (diskState.notifiedRewards || new Array()).forEach(id => notified.add(id));
        } catch (_) {}
        const fresh = new Array();
        REWARD_GAME_IDS.forEach(gid => {
            const st = summary.games[gid];
            if (st && st.completed && !notified.has(gid)) { notified.add(gid); fresh.push(st.name || gid); }
        });
        if (fresh.length === 0) return;
        saveNotifiedSet(notified);
        try {
            diskState.notifiedRewards = Array.from(notified);
            fetch('/api/arcade/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(diskState) }).catch(() => {});
        } catch (_) {}
        fresh.forEach((gName, idx) => {
            setTimeout(() => {
                if (typeof playSfx === 'function') playSfx('launch');
                if (typeof showToast === 'function') showToast('Открыта награда в 3D-Музее за прохождение ' + gName + '!');
            }, 900 + idx * 1700);
        });
    }

    window.refreshSaveSummaryCache = async function(force) {
        const now = Date.now();
        if (!force && now - lastFetchTs < 6000) return window._sglSaveSummary;
        lastFetchTs = now;
        try {
            const data = await (await fetch('/api/saves/summary')).json();
            if (data && data.ok) {
                window._sglSaveSummary = data;
                window.applySuperModeToActiveCard();
                notifyNewCompletionRewards(data);
                if (typeof window.syncBonusCardStyles === 'function') window.syncBonusCardStyles();
            }
        } catch (_) {}
        return window._sglSaveSummary;
    };

    window.toggleSuperSaveFx = async function(forceVal) {
        if (typeof currentDesign === 'undefined' || !currentDesign) return;
        const nextVal = (typeof forceVal === 'boolean') ? forceVal : !(currentDesign.superSaveFx !== false);
        currentDesign.superSaveFx = nextVal;
        const m4Chk = document.getElementById('m4-c-sup'); if (m4Chk) m4Chk.checked = nextVal;
        const ddBtn = document.getElementById('sgl-dd-super-fx'); if (ddBtn) ddBtn.classList.toggle('is-active', nextVal);
        window.applySuperModeToActiveCard();
        if (typeof playSfx === 'function') playSfx('switch');
        if (typeof window.restoreGlobalDesignFields === 'function') window.restoreGlobalDesignFields();
        try { await fetch('/api/design', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(currentDesign) }); } catch (_) {}
        const activeG = (typeof availableGames !== 'undefined' && availableGames.length > 0) ? availableGames.at(selectedIndex) : null;
        if (activeG && typeof window.applyPerGameVisuals === 'function') window.applyPerGameVisuals(activeG.id);
        if (typeof showToast === 'function') showToast(nextVal ? 'Реакция UI на сейвы включена (Super-режим)' : 'Реакция UI на сейвы отключена');
    };

    function bootSaveReactive() {
        const origSelect = window.selectGame;
        if (typeof origSelect === 'function' && !window._sglSuperSelHooked) {
            window._sglSuperSelHooked = true;
            window.selectGame = function() { const r = origSelect.apply(this, arguments); window.applySuperModeToActiveCard(); return r; };
        }
        const origRender = window.renderMainScreen;
        if (typeof origRender === 'function' && !window._sglSuperRenderHooked) {
            window._sglSuperRenderHooked = true;
            window.renderMainScreen = function() { const r = origRender.apply(this, arguments); window.applySuperModeToActiveCard(); return r; };
        }
        const origApply = window.applyDesign;
        if (typeof origApply === 'function' && !window._sglSuperApplyHooked) {
            window._sglSuperApplyHooked = true;
            window.applyDesign = function() { const r = origApply.apply(this, arguments); window.applySuperModeToActiveCard(); return r; };
        }
        const origPing = window.refreshPlaytimeOnly;
        if (typeof origPing === 'function' && !window._sglSuperPingHooked) {
            window._sglSuperPingHooked = true;
            window.refreshPlaytimeOnly = async function() {
                const r = await origPing.apply(this, arguments);
                const anyRun = Array.isArray(availableGames) && availableGames.some(g => g.running);
                if (wasRunningGame && !anyRun) window.refreshSaveSummaryCache(true);
                wasRunningGame = anyRun;
                return r;
            };
        }
        window.addEventListener('focus', () => { if (Date.now() - lastFetchTs > 15000) window.refreshSaveSummaryCache(false); });
        setTimeout(() => window.refreshSaveSummaryCache(true), 650);
    }

    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', bootSaveReactive);
    else bootSaveReactive();
})();
