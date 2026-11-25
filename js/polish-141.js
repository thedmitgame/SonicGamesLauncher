/* === STAGE 1 POLISH (v1.4.1): TYPOGRAPHY, ONBOARDING SPOTLIGHT & ABOUT MODAL === */
(function() {
    const APP_VER = '1.4.1';
    const GH_URL = 'https://github.com/thedmitgame/SonicGamesLauncher';
    const SVG_INFO = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function injectPolishCss() {
        if (document.getElementById('sgl-p141-css')) return;
        const st = mk('style', '', '');
        st.id = 'sgl-p141-css';
        st.textContent = Array.of(
            "html, body, button, input, select, textarea { font-family: 'Segoe UI Variable', 'Segoe UI', system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }",
            "@keyframes sglSpotPulse { 0% { box-shadow: 0 0 0 3px #facc15, 0 0 18px rgba(250,204,21,0.85); } 50% { box-shadow: 0 0 0 6px #fde047, 0 0 30px rgba(250,204,21,1); } 100% { box-shadow: 0 0 0 3px #facc15, 0 0 18px rgba(250,204,21,0.85); } }",
            ".sgl-spot-target { position: relative !important; z-index: 9998 !important; border-radius: 12px !important; animation: sglSpotPulse 1.6s ease-in-out infinite !important; pointer-events: auto !important; }",
            "#sgl-tour-backdrop { position: fixed; inset: 0; background: rgba(4,7,14,0.72); z-index: 9990; backdrop-filter: blur(2px); }",
            "#sgl-tour-card { position: fixed; z-index: 9999; width: 390px; max-width: 92vw; padding: 16px 18px; border-radius: 16px; background: rgba(13,19,33,0.96); border: 1.5px solid rgba(250,204,21,0.65); box-shadow: 0 18px 46px rgba(0,0,0,0.82); color: #f8fafc; }",
            ".p141-about-box { width: 470px; max-width: 94vw; text-align: center; display: flex; flex-direction: column; gap: 10px; align-items: center; }",
            ".p141-ver-pill { padding: 3px 11px; border-radius: 999px; background: rgba(56,189,248,0.16); border: 1px solid rgba(56,189,248,0.45); color: #7dd3fc; font-size: 11px; font-weight: 800; }"
        ).join('\n');
        document.head.appendChild(st);
    }

    function findTopButton(words) {
        const btns = Array.from(document.querySelectorAll('header button, .top-bar button, #top-controls button, .top-controls button'));
        return btns.find(b => words.some(w => (b.textContent || '').trim().toLowerCase().includes(w))) || null;
    }

    window.startLauncherTour = function() {
        document.getElementById('sgl-tour-backdrop')?.remove();
        document.getElementById('sgl-tour-card')?.remove();
        document.querySelectorAll('.sgl-spot-target').forEach(el => el.classList.remove('sgl-spot-target'));

        const STEPS = Array.of(
            { title: 'Библиотека игр', text: 'Листай коллекцию колёсиком мыши или стрелками. Нажми Enter или кликни по обложке, чтобы запустить игру.', getEl: () => document.querySelector('.game-card.selected') || document.getElementById('games-carousel') },
            { title: 'Моды и сейвы', text: 'Правый клик по карточке открывает быстрое меню: моды, читы, бэкапы сохранений и экспорт сборки.', getEl: () => document.querySelector('.game-card.selected .cover-box') || document.querySelector('.game-card.selected') },
            { title: 'Инструменты и Аркада', text: 'Здесь живут Кристальный Чао, Челленджи Хаоса, патчер ромхаков и менеджеры модов.', getEl: () => findTopButton(Array.of('инструменты', 'tools')) },
            { title: 'Внешний вид и темы', text: 'Открой меню «Вид», чтобы настроить шейдеры, Screen FX, 3D-полку и миксер слоёв тем.', getEl: () => findTopButton(Array.of('вид', 'view')) }
        );

        let stepIdx = 0, lastTarget = null;
        const bd = mk('div', '', ''); bd.id = 'sgl-tour-backdrop';
        const card = mk('div', '', ''); card.id = 'sgl-tour-card';
        document.body.append(bd, card);

        function cleanup() {
            if (lastTarget) lastTarget.classList.remove('sgl-spot-target');
            bd.remove(); card.remove();
            try { localStorage.setItem('sgl_tour_done_v141', '1'); } catch (_) {}
        }

        function renderStep() {
            if (lastTarget) lastTarget.classList.remove('sgl-spot-target');
            const st = STEPS.at(stepIdx);
            const target = st.getEl();
            lastTarget = target;
            if (target) target.classList.add('sgl-spot-target');

            card.innerHTML = '';
            const hdr = mk('div', '', 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;');
            hdr.append(
                mk('span', '', 'font-size:15px;font-weight:900;color:#fde047;', st.title),
                mk('span', '', 'font-size:11px;opacity:0.7;font-weight:700;', (stepIdx + 1) + ' / ' + STEPS.length)
            );
            const body = mk('div', '', 'font-size:12.5px;line-height:1.5;opacity:0.92;margin-bottom:14px;', st.text);
            const foot = mk('div', '', 'display:flex;justify-content:space-between;gap:8px;');
            const bSkip = mk('button', 'btn-small', '', 'Закрыть'); bSkip.type = 'button'; bSkip.onclick = cleanup;
            const bNext = mk('button', 'btn-small btn-accent', 'font-weight:800;padding:6px 14px;', stepIdx === STEPS.length - 1 ? 'Готово' : 'Далее');
            bNext.type = 'button';
            bNext.onclick = () => {
                if (stepIdx < STEPS.length - 1) { stepIdx++; renderStep(); } else cleanup();
            };
            foot.append(bSkip, bNext);
            card.append(hdr, body, foot);

            if (target) {
                const r = target.getBoundingClientRect();
                const topPos = r.bottom + 18 + 160 < window.innerHeight ? (r.bottom + 18) : Math.max(20, r.top - 175);
                const leftPos = Math.max(16, Math.min(window.innerWidth - 406, r.left + r.width * 0.5 - 195));
                card.style.top = topPos + 'px';
                card.style.left = leftPos + 'px';
            } else {
                card.style.top = '50%'; card.style.left = '50%'; card.style.transform = 'translate(-50%,-50%)';
            }
        }
        renderStep();
    };

    window.openAboutModal = function() {
        document.getElementById('sgl-about-modal')?.remove();
        const bg = mk('div', 'modal-backdrop active', 'z-index:9928;');
        bg.id = 'sgl-about-modal';
        bg.onclick = e => { if (e.target === bg) bg.remove(); };

        const box = mk('div', 'modal-box p141-about-box', '');
        const logo = mk('div', '', 'font-size:22px;font-weight:900;color:#fde047;letter-spacing:0.6px;', 'Sonic Games Launcher');
        const ver = mk('span', 'p141-ver-pill', '', 'v' + APP_VER);
        const desc = mk('div', '', 'font-size:12.5px;line-height:1.55;opacity:0.88;max-width:390px;', 'Единый центр для игр серии Sonic, модов, сохранений, саундтреков и аркадных фишек.');
        const auth = mk('div', '', 'font-size:12px;color:#93c5fd;font-weight:700;', 'Автор: thedmitgame');

        const ghBtn = mk('button', 'btn-small', 'padding:7px 14px;font-weight:700;', 'GitHub: thedmitgame/SonicGamesLauncher');
        ghBtn.type = 'button';
        ghBtn.onclick = () => fetch('/api/gb/open_url', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: GH_URL })
        }).catch(() => window.open(GH_URL, '_blank'));

        const acts = mk('div', '', 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:4px;');
        const bUpd = mk('button', 'btn-small btn-accent', 'padding:8px 14px;font-weight:800;', 'Проверить обновления');
        bUpd.type = 'button';
        bUpd.onclick = async () => {
            if (typeof showToast === 'function') showToast('Проверка обновлений...');
            try {
                const d = await (await fetch('/api/updater/check')).json();
                if (typeof showToast === 'function') {
                    showToast(d.hasUpdate ? ('Доступна новая версия: v' + d.latest) : ('Установлена актуальная версия v' + d.current));
                }
            } catch (_) {
                if (typeof showToast === 'function') showToast('Нет подключения к сети', true);
            }
        };
        const bTour = mk('button', 'btn-small', 'padding:8px 12px;', 'Пройти туториал');
        bTour.type = 'button';
        bTour.onclick = () => { bg.remove(); window.startLauncherTour(); };

        const bClose = mk('button', 'close-modal-btn', 'margin-top:6px;', 'Закрыть');
        bClose.type = 'button'; bClose.onclick = () => bg.remove();

        acts.append(bUpd, bTour);
        box.append(logo, ver, desc, auth, ghBtn, acts, bClose);
        bg.appendChild(box); document.body.appendChild(bg);
        if (typeof playSfx === 'function') playSfx('open_menu');
    };

    function bindAboutAndCleanText() {
        const qBtn = document.getElementById('help-btn') || document.getElementById('btn-help') || Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').trim() === '?');
        if (qBtn && !qBtn.dataset.p141About) {
            qBtn.dataset.p141About = '1';
            qBtn.title = 'О программе';
            qBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); window.openAboutModal(); };
        }

        document.querySelectorAll('button').forEach(b => {
            const txt = (b.textContent || '').trim();
            if (b.id === 'sgl-dd-rompatch' && b.parentElement && !b.parentElement.querySelector('#sgl-dd-about')) {
                const nb = mk('button', b.className, 'display:inline-flex;align-items:center;justify-content:flex-start;gap:8px;text-align:left;', '');
                nb.type = 'button'; nb.id = 'sgl-dd-about'; nb.innerHTML = SVG_INFO + '<span>О программе</span>';
                nb.onclick = () => window.openAboutModal();
                b.after(nb);
            }
            if (txt.includes('(в 1 клик)')) b.textContent = txt.replace(/\s*\(в 1 клик\)/gi, '');
        });
    }

    const _boot141 = () => {
        injectPolishCss();
        setTimeout(bindAboutAndCleanText, 350);
        let p141T = 0;
        const obs = new MutationObserver(() => { if (p141T) return; p141T = setTimeout(() => { p141T = 0; bindAboutAndCleanText(); }, 180); });
        obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: Array.of('class') });
    };
    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', _boot141); else _boot141();
})();
