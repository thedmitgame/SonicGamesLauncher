/* === AUTONOMOUS MODULE: SONIC ID CARD, SCREENSHOT TAGS/REPLAY, ANTI-SPOILER, CLEANER & UPDATER === */
(function() {
    let spoilerOn = false;

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function injectPmpCss() {
        if (document.getElementById('sgl-pmp-css')) return;
        const st = mk('style', '', ''); st.id = 'sgl-pmp-css';
        st.textContent = Array.of(
            '.sgl-spoiler-blur{filter:blur(6px);cursor:pointer;transition:filter 0.2s;user-select:none;}',
            '.sgl-spoiler-blur.revealed{filter:none;}',
            '.pmp-id-cvs{width:100%;border-radius:14px;border:1px solid rgba(250,204,21,0.45);box-shadow:0 12px 32px rgba(0,0,0,0.65);}',
            '.pmp-md-box{background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:10px;font-size:12px;line-height:1.45;max-height:220px;overflow-y:auto;white-space:pre-wrap;}'
        ).join('\n');
        document.head.appendChild(st);
    }

    function computeArchetype(stats) {
        const em = Number(stats.emeraldsCur || 0), mods = Number(stats.modsCount || 0);
        const hrs = (Number(stats.totalSeconds || 0)) / 3600, inst = Number(stats.installedCount || 0);
        if (em >= 7) return 'Охотник за Изумрудами';
        if (mods >= 5) return 'Мастер Модов';
        if (inst >= 5 && hrs < 5) return 'Ретро-Коллекционер';
        return 'Сверхзвуковой Бегун';
    }

    window.openSonicIdModal = async function() {
        document.getElementById('sgl-sonic-id-modal')?.remove();
        let prof = {}, chStats = {}, arc = {};
        try {
            prof = await (await fetch('/api/profile_summary')).json();
            chStats = await (await fetch('/api/challenges/stats')).json();
            arc = await (await fetch('/api/arcade/state')).json();
        } catch (_) {}
        const stats = Object.assign({}, prof, chStats);
        const arch = computeArchetype(stats);
        const nick = (typeof currentDesign !== 'undefined' && currentDesign?.mainTitleStr) ? currentDesign.mainTitleStr : 'SONIC PLAYER';
        const hrs = ((Number(stats.totalSeconds || 0)) / 3600).toFixed(1);
        const ems = Number(stats.emeraldsCur || 0);
        const trophies = Number(stats.achDone || 0);
        const emblems = (arc.emblems || new Array()).length;
        const topGames = (stats.topGames || new Array()).slice(0, 3).map(g => g.name || g).join(' • ') || 'Sonic Series';

        const cvs = mk('canvas', 'pmp-id-cvs', ''); cvs.width = 760; cvs.height = 400;
        const ctx = cvs.getContext('2d');
        const bg = ctx.createLinearGradient(0, 0, 760, 400);
        bg.addColorStop(0, '#090d16'); bg.addColorStop(0.55, '#172554'); bg.addColorStop(1, '#0284c7');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, 760, 400);

        ctx.strokeStyle = 'rgba(250,204,21,0.55)'; ctx.lineWidth = 4; ctx.strokeRect(14, 14, 732, 372);
        ctx.fillStyle = '#fde047'; ctx.font = '900 16px sans-serif'; ctx.fillText('SONIC ID CARD • OFFICIAL LAUNCHER PASS', 36, 52);
        ctx.fillStyle = '#ffffff'; ctx.font = '900 34px sans-serif'; ctx.fillText(String(nick).slice(0, 24), 36, 104);
        ctx.fillStyle = '#67e8f9'; ctx.font = '700 18px sans-serif'; ctx.fillText(arch + (arc.activeTitle ? ('  •  ' + arc.activeTitle) : ''), 36, 136);

        const boxes = Array.of(
            { k: 'ЧАСЫ В ИГРАХ', v: hrs + ' ч' }, { k: 'ИЗУМРУДЫ', v: String(ems) },
            { k: 'ТРОФЕИ', v: String(trophies) }, { k: 'ЭМБЛЕМЫ SA2', v: emblems + ' / 24' }
        );
        boxes.forEach((b, idx) => {
            const x = 36 + idx * 174;
            ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.fillRect(x, 168, 160, 88);
            ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5; ctx.strokeRect(x, 168, 160, 88);
            ctx.fillStyle = '#94a3b8'; ctx.font = '700 11px sans-serif'; ctx.fillText(b.k, x + 14, 196);
            ctx.fillStyle = '#fde047'; ctx.font = '900 26px sans-serif'; ctx.fillText(b.v, x + 14, 236);
        });

        ctx.fillStyle = '#cbd5e1'; ctx.font = '700 13px sans-serif'; ctx.fillText('ТОП ИГРЫ: ' + topGames, 36, 304);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '12px sans-serif'; ctx.fillText('Sonic Games Launcher • ' + new Date().toLocaleDateString(), 36, 356);

        const modal = mk('div', 'modal-backdrop active', 'z-index:9925;'); modal.id = 'sgl-sonic-id-modal';
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        const box = mk('div', 'modal-box', 'width:680px;max-width:95vw;display:flex;flex-direction:column;gap:10px;');
        box.append(mk('div', 'modal-title', 'margin:0;', 'Паспорт игрока (Sonic ID)'), cvs);

        const row = mk('div', '', 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center;');
        const bCopy = mk('button', 'btn-small btn-accent', 'padding:8px 14px;font-weight:800;', 'Скопировать картинку в буфер');
        bCopy.type = 'button';
        bCopy.onclick = () => {
            cvs.toBlob(async blob => {
                try {
                    await navigator.clipboard.write(Array.of(new ClipboardItem({ 'image/png': blob })));
                    if (typeof showToast === 'function') showToast('Карточка Sonic ID скопирована в буфер!');
                } catch (_) { if (typeof showToast === 'function') showToast('Копирование недоступно — используйте Скачать PNG', true); }
            }, 'image/png');
        };
        const bDl = mk('button', 'btn-small', 'padding:8px 14px;', 'Скачать PNG');
        bDl.type = 'button';
        bDl.onclick = () => { const a = mk('a', '', ''); a.download = 'sonic_id_card.png'; a.href = cvs.toDataURL('image/png'); a.click(); };
        const bCl = mk('button', 'close-modal-btn', 'margin:0;', 'Закрыть');
        bCl.type = 'button'; bCl.onclick = () => modal.remove();
        row.append(bCopy, bDl); box.append(row, bCl); modal.appendChild(box); document.body.appendChild(modal);
    };

    function applyAntiSpoilerDom() {
        document.querySelectorAll('.ach-item.locked, .progress-ach.locked, .slot-item').forEach(el => {
            const isFinal = /(final|doomsday|death egg|titanic|metallic|black core)/i.test(el.textContent || '');
            if (spoilerOn && (el.classList.contains('locked') || isFinal)) {
                el.classList.add('sgl-spoiler-blur');
                el.onclick = () => el.classList.toggle('revealed');
            } else {
                el.classList.remove('sgl-spoiler-blur', 'revealed');
            }
        });
    }

    async function openUpdaterModal() {
        document.getElementById('sgl-updater-modal')?.remove();
        const modal = mk('div', 'modal-backdrop active', 'z-index:9930;'); modal.id = 'sgl-updater-modal';
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        const box = mk('div', 'modal-box', 'width:500px;max-width:94vw;display:flex;flex-direction:column;gap:10px;');
        box.appendChild(mk('div', 'modal-title', 'margin:0;', 'Проверка обновлений GitHub'));
        const st = mk('div', '', 'font-size:13px;font-weight:700;color:#93c5fd;', 'Запрос к GitHub...');
        const md = mk('div', 'pmp-md-box', '', '');
        const bOpen = mk('button', 'btn-small btn-accent', 'display:none;padding:8px 14px;font-weight:800;', 'Открыть страницу скачивания');
        bOpen.type = 'button';
        const bCl = mk('button', 'close-modal-btn', 'margin:0;', 'Закрыть'); bCl.type = 'button'; bCl.onclick = () => modal.remove();
        box.append(st, md, bOpen, bCl); modal.appendChild(box); document.body.appendChild(modal);

        try {
            const d = await (await fetch('/api/updater/check')).json();
            st.textContent = d.hasUpdate ? ('Доступна новая версия: v' + d.latest + ' (текущая v' + d.current + ')') : ('У вас актуальная версия: v' + d.current);
            md.textContent = d.notes || '';
            if (d.htmlUrl) { bOpen.style.display = 'inline-flex'; bOpen.onclick = () => window.open(d.htmlUrl, '_blank'); }
        } catch (_) { st.textContent = 'Нет подключения к сети.'; }
    }

    function injectSystemTools() {
        const tabAudio = document.getElementById('tab-audio');
        if (tabAudio && !document.getElementById('sgl-sys-extras-sec')) {
            const sec = mk('div', 'char-card-cfg', 'margin-top:8px;display:flex;flex-direction:column;gap:8px;');
            sec.id = 'sgl-sys-extras-sec';
            sec.appendChild(mk('div', 'char-cfg-header', 'color:#fde047;', 'Система: Instant Replay, Cleaner и Обновления'));

            const repRow = mk('div', '', 'display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;');
            const repLbl = mk('label', '', 'display:flex;align-items:center;gap:7px;font-size:12px;cursor:pointer;');
            const repChk = document.createElement('input'); repChk.type = 'checkbox';
            repLbl.append(repChk, mk('span', '', '', 'Instant Replay GIF 15 сек. (хоткей F8, опционально)'));
            const bGif = mk('button', 'btn-small', '', 'Сохранить реплей (.gif)'); bGif.type = 'button';
            fetch('/api/replay/status').then(r => r.json()).then(d => { repChk.checked = Boolean(d.enabled); }).catch(() => {});
            repChk.onchange = () => fetch('/api/replay/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: repChk.checked }) });
            bGif.onclick = async () => {
                const d = await (await fetch('/api/replay/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json();
                if (typeof showToast === 'function') showToast(d.ok ? ('GIF-реплей сохранён: ' + d.path) : 'Буфер реплея пуст (включите Replay во время игры)', !d.ok);
            };
            repRow.append(repLbl, bGif);

            const clRow = mk('div', '', 'display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;');
            const clInfo = mk('span', '', 'opacity:0.85;', 'Анализ кэша...');
            const refreshCleaner = () => fetch('/api/cleaner/stats').then(r => r.json()).then(d => {
                if (d.ok && d.stats) clInfo.textContent = 'Backups: ' + d.stats.backupsMb + ' МБ • Shots: ' + d.stats.screenshotsMb + ' МБ • Cache: ' + d.stats.cacheMb + ' МБ';
            }).catch(() => {});
            refreshCleaner();
            const bClean = mk('button', 'btn-small', '', 'Очистить старые копии и кэш'); bClean.type = 'button';
            bClean.onclick = async () => {
                const d = await (await fetch('/api/cleaner/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ backups: true, cache: true }) })).json();
                if (typeof showToast === 'function') showToast('Освобождено: ' + (d.freedMb || 0) + ' МБ');
                refreshCleaner();
            };
            clRow.append(clInfo, bClean);

            const bUpd = mk('button', 'btn-small btn-accent', 'align-self:flex-start;padding:7px 14px;font-weight:800;', 'Проверить обновления лаунчера');
            bUpd.type = 'button'; bUpd.onclick = openUpdaterModal;

            sec.append(repRow, clRow, bUpd);
            tabAudio.appendChild(sec);
        }
    }

    function observeProfileAndShots() {
        const obs = new MutationObserver(() => {
            const pModal = document.getElementById('profile-stats-modal');
            const pBody = document.getElementById('profile-stats-body');
            if (pModal && pModal.classList.contains('active') && pBody && !document.getElementById('sgl-pmp-profile-bar')) {
                const bar = mk('div', '', 'display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);');
                bar.id = 'sgl-pmp-profile-bar';
                const bId = mk('button', 'btn-small btn-accent', 'font-weight:800;padding:6px 12px;', 'Сгенерировать Sonic ID');
                bId.type = 'button'; bId.onclick = () => window.openSonicIdModal();
                const spLbl = mk('label', '', 'display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;');
                const spChk = document.createElement('input'); spChk.type = 'checkbox'; spChk.checked = spoilerOn;
                spChk.onchange = () => { spoilerOn = spChk.checked; applyAntiSpoilerDom(); };
                spLbl.append(spChk, mk('span', '', '', 'Анти-спойлер зон и достижений'));
                bar.append(bId, spLbl);
                pBody.prepend(bar);
            }
            const sModal = document.getElementById('screenshots-modal');
            if (sModal && sModal.classList.contains('active') && !document.getElementById('sgl-shots-tag-bar')) {
                const box = sModal.querySelector('.modal-box');
                if (box) {
                    const fbar = mk('div', '', 'display:flex;gap:6px;align-items:center;margin-bottom:8px;'); fbar.id = 'sgl-shots-tag-bar';
                    const inp = mk('input', 'custom-input', 'flex:1;padding:5px 8px;font-size:12px;'); inp.placeholder = 'Фильтр скриншотов по игре или тегу...';
                    inp.oninput = () => {
                        const q = inp.value.trim().toLowerCase();
                        sModal.querySelectorAll('.shot-card, .screenshot-item').forEach(c => { c.style.display = (!q || (c.textContent || '').toLowerCase().includes(q)) ? '' : 'none'; });
                    };
                    fbar.appendChild(inp);
                    const grid = sModal.querySelector('#screenshots-grid') || box.firstElementChild;
                    if (grid) grid.before(fbar); else box.prepend(fbar);
                }
            }
            applyAntiSpoilerDom();
        });
        obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: Array.of('class') });
    }

    const _bootPmp = () => {
        injectPmpCss(); observeProfileAndShots();
        const origOpen = window.openCustomModal;
        if (typeof origOpen === 'function') {
            window.openCustomModal = function() { const r = origOpen.apply(this, arguments); setTimeout(injectSystemTools, 60); return r; };
        }
    };
    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', _bootPmp); else _bootPmp();
})();
