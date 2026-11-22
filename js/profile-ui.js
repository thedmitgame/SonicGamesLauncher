/* === PLAYER PROFILE WITH EXTERNAL SIDE 3D COMPANION STAGE === */
(function() {
    const SVG_TROPHY = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>';

    function mk(tag, cls, css, text) {
        const el = document.createElement(tag);
        if (cls) el.className = cls;
        if (css) el.style.cssText = css;
        if (text !== undefined && text !== null) el.textContent = text;
        return el;
    }

    function fmtHours(sec) {
        if (!sec || sec <= 0) return '0 мин.';
        if (sec < 60) return sec + ' сек.';
        const mins = Math.floor(sec / 60);
        if (mins < 60) return mins + ' мин.';
        return (sec / 3600).toFixed(1) + ' ч.';
    }

    function ensureProfileModal() {
        document.getElementById('sgl-profile-modal')?.remove();
        let m = document.getElementById('profile-stats-modal');
        if (m) return m;

        m = mk('div', 'modal-backdrop', 'z-index:9400;');
        m.id = 'profile-stats-modal';
        m.onclick = (e) => { if (e.target === m || e.target.id === 'sgl-prof-flex-row') m.classList.remove('active'); };

        // Общая обёртка: [Внешняя 3D-фигурка сбоку] + [Чистая карточка профиля]
        const flexRow = mk('div', '', 'display:flex;align-items:center;justify-content:center;gap:18px;max-width:97vw;');
        flexRow.id = 'sgl-prof-flex-row';

        const sideLeft = mk('div', '', '');
        sideLeft.id = 'sgl-prof-side-left';

        const box = mk('div', 'modal-box', 'width:630px;max-width:92vw;margin:0;');
        const h2 = mk('div', 'modal-title', '', 'Сводный профиль игрока');
        const body = mk('div', 'mods-list', 'max-height:480px;padding-right:6px;');
        body.id = 'profile-stats-body';

        const closeBtn = mk('button', 'close-modal-btn', '', 'Закрыть');
        closeBtn.type = 'button';
        closeBtn.onclick = () => {
            if (typeof playSfx === 'function') playSfx('close_menu');
            m.classList.remove('active');
        };
        box.append(h2, body, closeBtn);

        const sideRight = mk('div', '', '');
        sideRight.id = 'sgl-prof-side-right';

        flexRow.append(sideLeft, box, sideRight);
        m.appendChild(flexRow);
        document.body.appendChild(m);
        return m;
    }

    window.openProfileSummaryModal = async function() {
        const m = ensureProfileModal();
        const body = document.getElementById('profile-stats-body');
        if (typeof playSfx === 'function') playSfx('open_menu');
        body.innerHTML = '';
        body.appendChild(mk('div', '', 'text-align:center;opacity:0.6;padding:24px;', 'Подсчёт общего прогресса и сохранений...'));
        m.classList.add('active');

        try {
            const res = await fetch('/api/profile_summary');
            const d = await res.json();
            window._lastProfileStats = d;
            body.innerHTML = '';

            const emPct = d.emeraldsMax > 0 ? (d.emeraldsCur / d.emeraldsMax) : 0;
            const acPct = d.achMax > 0 ? (d.achDone / d.achMax) : 0;
            const divCnt = (d.emeraldsMax > 0 ? 1 : 0) + (d.achMax > 0 ? 1 : 0);
            const totalPct = divCnt > 0 ? Math.round(((emPct + acPct) / divCnt) * 100) : 0;
            window._lastProfilePct = totalPct;

            // Полоска ранга прогресса сверху профиля
            const rankTitle = totalPct >= 100 ? '★ РАНГ S: ГИПЕР-ЛЕГЕНДА (100%)' : (totalPct >= 70 ? '◆ РАНГ A: СУПЕР-ФОРМА (' + totalPct + '%)' : (totalPct >= 30 ? '● РАНГ B: ИСКАТЕЛЬ ИЗУМРУДОВ (' + totalPct + '%)' : '○ РАНГ C: НОВИЧОК (' + totalPct + '%)'));
            const rankBarWrap = mk('div', '', 'background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:8px 12px;margin-bottom:10px;');
            const rankTop = mk('div', '', 'display:flex;justify-content:space-between;align-items:center;font-size:11px;font-weight:800;color:#FFD700;margin-bottom:5px;');
            rankTop.append(mk('span', '', '', rankTitle), mk('span', '', 'opacity:0.8;', totalPct + '%'));
            const progTrack = mk('div', '', 'height:6px;border-radius:999px;background:rgba(0,0,0,0.45);overflow:hidden;');
            progTrack.appendChild(mk('div', '', 'height:100%;width:' + Math.min(100, totalPct) + '%;background:linear-gradient(90deg,#38BDF8,#4ADE80,#FFD700);border-radius:999px;'));
            rankBarWrap.append(rankTop, progTrack);
            body.appendChild(rankBarWrap);

            const grid = mk('div', '', 'display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px;');
            Array.of(
                { label: 'Общее время в играх', val: fmtHours(d.totalSeconds), col: '#60A5FA' },
                { label: 'Собрано Изумрудов и Камней', val: d.emeraldsCur + ' / ' + (d.emeraldsMax || 0), col: '#4ADE80' },
                { label: 'Открыто достижений', val: d.achDone + ' / ' + (d.achMax || 0), col: '#FFD700' },
                { label: 'Любимая игра', val: d.topGame, col: '#F472B6' }
            ).forEach(c => {
                const tile = mk('div', '', 'background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 12px;');
                tile.append(mk('div', '', 'font-size:11px;opacity:0.68;margin-bottom:4px;', c.label), mk('div', '', 'font-size:17px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:' + c.col + ';', c.val));
                grid.appendChild(tile);
            });
            body.appendChild(grid);

            // Вызываем отрисовку ВНЕШНЕЙ боковой 3D-сцены с учётом актуального процента totalPct!
            if (typeof window.mountExternalProfile3D === 'function') window.mountExternalProfile3D(totalPct);

            body.appendChild(mk('div', '', 'font-size:12px;font-weight:700;color:#FFD700;margin:6px 0 8px;', 'Детализация по установленным играм'));
            const list = d.games || new Array();
            if (list.length === 0) {
                body.appendChild(mk('div', '', 'text-align:center;opacity:0.6;padding:14px;', 'Установленных игр пока нет'));
                return;
            }
            list.forEach(g => {
                const row = mk('div', 'mod-item', 'padding:9px 12px;border-left:3px solid ' + (g.color || '#3B82F6') + ';');
                const info = mk('div', 'mod-info', 'flex:1;');
                const badges = Array.of('Время: ' + fmtHours(g.seconds));
                if (g.emMax > 0) badges.push('Изумруды: ' + g.emCur + '/' + g.emMax);
                if (g.achMax > 0) badges.push('Достижения: ' + g.achDone + '/' + g.achMax);
                info.append(mk('div', 'mod-title', '', g.name), mk('div', 'mod-author', '', badges.join(' • ')));
                row.appendChild(info);
                body.appendChild(row);
            });
        } catch (_) {
            body.innerHTML = '';
            body.appendChild(mk('div', '', 'text-align:center;opacity:0.6;padding:20px;', 'Не удалось загрузить статистику профиля'));
        }
    };

    function bindProfileBtn() {
        let btn = document.getElementById('sgl-profile-btn');
        if (!btn) {
            const bar = document.querySelector('[data-hud-id="m5bar"]') || document.getElementById('m5-quick-bar');
            btn = mk('button', 'settings-btn', 'padding:6px 12px;font-size:12px;', '');
            btn.type = 'button'; btn.id = 'sgl-profile-btn';
            btn.innerHTML = '<span class="btn-inner-wrap">' + SVG_TROPHY + '<span>Профиль</span></span>';
            if (bar) bar.appendChild(btn);
        }
        btn.onclick = (e) => { e.stopImmediatePropagation(); window.openProfileSummaryModal(); };
    }

    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(bindProfileBtn, 350);
        setTimeout(bindProfileBtn, 900);
    });
})();
