/* === PLAYER PROFILE & GLOBAL STATS CARD === */
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
        let m = document.getElementById('profile-stats-modal');
        if (m) return m;
        m = mk('div', 'modal-backdrop', 'z-index:9400;');
        m.id = 'profile-stats-modal';

        const box = mk('div', 'modal-box', 'width:640px;max-width:95vw;');
        const h2 = mk('h2', '', '', 'Сводный профиль игрока');
        const body = mk('div', 'mods-list', 'max-height:470px;padding-right:6px;');
        body.id = 'profile-stats-body';

        const acts = mk('div', 'modal-actions', '');
        const closeBtn = mk('button', 'btn-cancel', 'flex:1;', 'Закрыть');
        closeBtn.type = 'button';
        closeBtn.onclick = () => {
            if (typeof playSfx === 'function') playSfx('close_menu');
            m.classList.remove('active');
        };
        acts.appendChild(closeBtn);

        box.append(h2, body, acts);
        m.appendChild(box);
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
            body.innerHTML = '';

            const grid = mk('div', '', 'display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px;');
            const cards = new Array(
                { label: 'Общее время в играх', val: fmtHours(d.totalSeconds), col: '#60A5FA' },
                { label: 'Собрано Изумрудов и Камней', val: d.emeraldsCur + ' / ' + (d.emeraldsMax || 0), col: '#4ADE80' },
                { label: 'Открыто достижений', val: d.achDone + ' / ' + (d.achMax || 0), col: '#FFD700' },
                { label: 'Любимая игра', val: d.topGame, col: '#F472B6' }
            );
            cards.forEach(c => {
                const tile = mk('div', '', 'background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 12px;');
                tile.append(
                    mk('div', '', 'font-size:11px;opacity:0.68;margin-bottom:4px;', c.label),
                    mk('div', '', 'font-size:17px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:' + c.col + ';', c.val)
                );
                grid.appendChild(tile);
            });
            body.appendChild(grid);

            const subTitle = mk('div', '', 'font-size:12px;font-weight:700;color:#FFD700;margin:6px 0 8px;', 'Детализация по установленным играм');
            body.appendChild(subTitle);

            const list = d.games || new Array();
            if (list.length === 0) {
                body.appendChild(mk('div', '', 'text-align:center;opacity:0.6;padding:14px;', 'Установленных игр пока нет'));
                return;
            }

            list.forEach(g => {
                const row = mk('div', 'mod-item', 'padding:9px 12px;border-left:3px solid ' + (g.color || '#3B82F6') + ';');
                const info = mk('div', 'mod-info', 'flex:1;');
                const badges = new Array('Время: ' + fmtHours(g.seconds));
                if (g.emMax > 0) badges.push('Изумруды: ' + g.emCur + '/' + g.emMax);
                if (g.achMax > 0) badges.push('Достижения: ' + g.achDone + '/' + g.achMax);
                info.append(
                    mk('div', 'mod-title', '', g.name),
                    mk('div', 'mod-author', '', badges.join(' • '))
                );
                row.appendChild(info);
                body.appendChild(row);
            });
        } catch (_) {
            body.innerHTML = '';
            body.appendChild(mk('div', '', 'text-align:center;opacity:0.6;padding:20px;', 'Не удалось загрузить статистику профиля'));
        }
    };

    function injectProfileButton() {
        if (document.getElementById('sgl-profile-btn')) return;
        const bar = document.querySelector('[data-hud-id="m5bar"]') || document.getElementById('m5-quick-bar');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'sgl-profile-btn';
        btn.className = 'settings-btn';
        btn.style.cssText = 'padding:6px 12px;font-size:12px;';
        btn.innerHTML = '<span class="btn-inner-wrap">' + SVG_TROPHY + '<span>Профиль</span></span>';
        btn.onclick = window.openProfileSummaryModal;

        if (bar) {
            bar.appendChild(btn);
        } else {
            btn.style.cssText = 'position:fixed;top:16px;left:18px;z-index:55;padding:6px 12px;font-size:12px;';
            document.body.appendChild(btn);
        }
    }

    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(injectProfileButton, 250);
    });
})();
