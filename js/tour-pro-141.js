/* === PRO ONBOARDING TOUR v1.4.1 (SPOTLIGHT + ANIMATIONS) === */
(function() {
    if (window._sglProTourLoaded) return;
    window._sglProTourLoaded = true;
    const DONE_KEY = 'sgl_pro_tour_v141_done';
    let curIdx = 0, active = false, rootEl = null, spotEl = null, cardEl = null;

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function injectTourCss() {
        if (document.getElementById('sgl-protour-css')) return;
        const st = mk('style', '', '');
        st.id = 'sgl-protour-css';
        st.textContent = Array.of(
            '#sgl-tour-bg { display: none !important; pointer-events: none !important; }',
            '#sgl-pt-root { position: fixed; inset: 0; z-index: 10050; pointer-events: auto; opacity: 0; transition: opacity 0.28s ease; }',
            '#sgl-pt-root.open { opacity: 1; }',
            '#sgl-pt-spot { position: fixed; border-radius: 14px; box-shadow: 0 0 0 9999px rgba(5, 8, 16, 0.80), 0 0 0 2px rgba(59, 130, 246, 0.9), 0 0 28px rgba(59, 130, 246, 0.55); pointer-events: none; transition: top 0.42s cubic-bezier(0.22,1,0.36,1), left 0.42s cubic-bezier(0.22,1,0.36,1), width 0.42s cubic-bezier(0.22,1,0.36,1), height 0.42s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease; }',
            '#sgl-pt-spot.center-mode { top: 50% !important; left: 50% !important; width: 0 !important; height: 0 !important; box-shadow: 0 0 0 9999px rgba(5, 8, 16, 0.82); }',
            '#sgl-pt-card { position: fixed; width: 420px; max-width: 92vw; background: linear-gradient(165deg, #131b2e 0%, #0b101c 100%); border: 1px solid rgba(255,255,255,0.14); border-radius: 16px; padding: 20px 22px 18px; color: #f1f5f9; box-shadow: 0 24px 64px rgba(0,0,0,0.82), inset 0 1px 0 rgba(255,255,255,0.08); transition: top 0.42s cubic-bezier(0.22,1,0.36,1), left 0.42s cubic-bezier(0.22,1,0.36,1), transform 0.3s ease, opacity 0.25s ease; overflow: hidden; }',
            '.pt-prog-track { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: rgba(255,255,255,0.08); }',
            '.pt-prog-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #38bdf8, #facc15); transition: width 0.38s cubic-bezier(0.22,1,0.36,1); }',
            '.pt-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }',
            '.pt-badge { font-size: 10.5px; font-weight: 800; letter-spacing: 0.9px; text-transform: uppercase; color: #38bdf8; background: rgba(56,189,248,0.12); border: 1px solid rgba(56,189,248,0.28); padding: 3px 9px; border-radius: 999px; }',
            '.pt-dots { display: flex; gap: 5px; }',
            '.pt-dot { width: 6px; height: 6px; border-radius: 999px; background: rgba(255,255,255,0.2); transition: width 0.25s, background 0.25s; }',
            '.pt-dot.on { width: 18px; background: #3b82f6; }',
            '.pt-title { font-size: 17px; font-weight: 800; color: #fff; margin-bottom: 7px; letter-spacing: 0.2px; }',
            '.pt-desc { font-size: 12.8px; line-height: 1.55; color: #cbd5e1; margin-bottom: 12px; }',
            '.pt-tip { font-size: 11.5px; color: #93c5fd; background: rgba(59,130,246,0.1); border-left: 3px solid #3b82f6; padding: 7px 10px; border-radius: 0 8px 8px 0; margin-bottom: 16px; line-height: 1.4; }',
            '.pt-foot { display: flex; justify-content: space-between; align-items: center; gap: 8px; }',
            '.pt-btn { padding: 8px 14px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); color: #e2e8f0; font-size: 12px; font-weight: 700; cursor: pointer; transition: background 0.16s, transform 0.12s; }',
            '.pt-btn:hover { background: rgba(255,255,255,0.14); }',
            '.pt-btn-prim { background: #2563eb; border-color: #3b82f6; color: #fff; box-shadow: 0 4px 16px rgba(37,99,235,0.42); }',
            '.pt-btn-prim:hover { background: #1d4ed8; transform: translateY(-1px); }',
            '.pt-fade-in { animation: ptStepIn 0.28s cubic-bezier(0.22,1,0.36,1); }',
            '@keyframes ptStepIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }'
        ).join('\n');
        document.head.appendChild(st);
    }

    const STEPS = Array.of(
        {
            badge: 'Шаг 1 из 5',
            title: 'Быстрое подключение игр',
            desc: 'Нажмите «Найти игры автоматически» по центру или «Игры и пути» снизу, чтобы мгновенно подключить установленные игры Sonic, эмуляторы и свои .exe файлы.',
            tip: 'Совет: порядок игр, подписи и аргументы запуска легко меняются прямо в окне «Игры и пути».',
            targets: Array.of('.empty-btn-primary', '#btn-ui-settings')
        },
        {
            badge: 'Шаг 2 из 5',
            title: 'Навигация и горячие клавиши',
            desc: 'Листайте библиотеку стрелками, колесом мыши или геймпадом. Нажмите Enter для запуска, F6 для скриншота во время игры и F11 для полного экрана.',
            tip: 'Совет: клавиша Esc теперь мгновенно закрывает любое открытое окно, меню или просмотр скриншота.',
            targets: Array.of('#games-container .game-card.selected', '.empty-state', 'header')
        },
        {
            badge: 'Шаг 3 из 5',
            title: 'Профиль, 3D-Музей и Аркада',
            desc: 'В верхнем меню «Профиль» вас ждут статистика, отслеживание Изумрудов Хаоса, 3D-Музей трофеев с коллекционными фигурками, Кристальный Чао и Casino Night.',
            tip: 'Совет: открывайте достижения и собирайте 7 Изумрудов, чтобы активировать SUPER-режим карточек!',
            targets: Array.of('#m5-top-bar')
        },
        {
            badge: 'Шаг 4 из 5',
            title: 'Кастомизация в 4 вкладках',
            desc: 'Откройте «Вид» сверху или значок палитры в углу. Настраивайте готовые темы, фоновые шейдеры, скорость эффектов, лимит 30/60 FPS, музыку Jukebox и свои .sonicpack.',
            tip: 'Совет: нажмите F2 на главном экране, чтобы свободно перетаскивать элементы интерфейса в редакторе HUD.',
            targets: Array.of('#btn-ui-custom', '#m5-top-bar')
        },
        {
            badge: 'Шаг 5 из 5',
            title: 'Всё готово к запуску!',
            desc: 'Вы также можете перетаскивать .ZIP-архивы модов прямо в окно лаунчера для быстрой установки. Этот гид всегда можно открыть заново кнопкой «?» в левом нижнем углу.',
            tip: 'Приятной игры в Sonic Games Launcher!',
            targets: Array.of()
        }
    );

    function findTarget(selectors) {
        for (let i = 0; i < selectors.length; i++) {
            const el = document.querySelector(selectors.at(i));
            if (el && el.offsetParent !== null) {
                const r = el.getBoundingClientRect();
                if (r.width > 8 && r.height > 8) return el;
            }
        }
        return null;
    }

    function positionUI(target) {
        const vw = window.innerWidth, vh = window.innerHeight;
        const cw = Math.min(420, vw - 28), ch = cardEl.offsetHeight || 230;
        if (!target) {
            spotEl.classList.add('center-mode');
            cardEl.style.left = Math.round((vw - cw) * 0.5) + 'px';
            cardEl.style.top = Math.round((vh - ch) * 0.5) + 'px';
            return;
        }
        spotEl.classList.remove('center-mode');
        const r = target.getBoundingClientRect();
        const pad = 8;
        const sx = Math.max(4, r.left - pad), sy = Math.max(4, r.top - pad);
        const sw = Math.min(vw - sx - 4, r.width + pad * 2), sh = Math.min(vh - sy - 4, r.height + pad * 2);
        spotEl.style.left = sx + 'px'; spotEl.style.top = sy + 'px';
        spotEl.style.width = sw + 'px'; spotEl.style.height = sh + 'px';

        let cx = r.left + r.width * 0.5 - cw * 0.5;
        cx = Math.max(16, Math.min(vw - cw - 16, cx));
        let cy = (sy + sh + 18 + ch < vh) ? (sy + sh + 18) : (sy - ch - 18);
        if (cy < 16) cy = Math.max(16, Math.min(vh - ch - 16, (vh - ch) * 0.5));
        cardEl.style.left = Math.round(cx) + 'px';
        cardEl.style.top = Math.round(cy) + 'px';
    }

    function burstFinishSparks() {
        const cvs = mk('canvas', '', 'position:fixed;inset:0;pointer-events:none;z-index:10060;');
        cvs.width = window.innerWidth; cvs.height = window.innerHeight;
        document.body.appendChild(cvs);
        const ctx = cvs.getContext('2d'), pts = new Array();
        for (let i = 0; i < 42; i++) {
            const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 6;
            pts.push({ x: cvs.width * 0.5, y: cvs.height * 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, life: 1, r: 2 + Math.random() * 3 });
        }
        function tick() {
            ctx.clearRect(0, 0, cvs.width, cvs.height);
            let alive = 0;
            pts.forEach(p => {
                if (p.life <= 0) return;
                alive++; p.x += p.vx; p.y += p.vy; p.vy += 0.16; p.life -= 0.024;
                ctx.fillStyle = 'rgba(250,204,21,' + Math.max(0, p.life).toFixed(2) + ')';
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
            });
            if (alive > 0) requestAnimationFrame(tick); else cvs.remove();
        }
        requestAnimationFrame(tick);
    }

    function closeTour(withBurst) {
        if (!active) return;
        active = false;
        try { localStorage.setItem(DONE_KEY, '1'); } catch (_) {}
        if (withBurst) burstFinishSparks();
        if (rootEl) {
            rootEl.classList.remove('open');
            setTimeout(() => { if (rootEl) { rootEl.remove(); rootEl = null; } }, 280);
        }
        if (typeof playSfx === 'function') playSfx(withBurst ? 'launch' : 'close_menu');
    }

    function renderStep() {
        const st = STEPS.at(curIdx);
        const pct = Math.round(((curIdx + 1) / STEPS.length) * 100);
        cardEl.innerHTML = '';
        const track = mk('div', 'pt-prog-track', '');
        track.appendChild(mk('div', 'pt-prog-fill', 'width:' + pct + '%;'));

        const body = mk('div', 'pt-fade-in', '');
        const head = mk('div', 'pt-head', '');
        head.appendChild(mk('span', 'pt-badge', '', st.badge));
        const dots = mk('div', 'pt-dots', '');
        for (let i = 0; i < STEPS.length; i++) dots.appendChild(mk('span', 'pt-dot' + (i === curIdx ? ' on' : ''), ''));
        head.appendChild(dots);

        const foot = mk('div', 'pt-foot', '');
        const skipB = mk('button', 'pt-btn', '', 'Пропустить');
        skipB.type = 'button'; skipB.onclick = () => closeTour(false);

        const navR = mk('div', '', 'display:flex;gap:8px;');
        if (curIdx > 0) {
            const backB = mk('button', 'pt-btn', '', 'Назад');
            backB.type = 'button';
            backB.onclick = () => { curIdx--; if (typeof playSfx === 'function') playSfx('switch'); renderStep(); };
            navR.appendChild(backB);
        }
        const isLast = curIdx === STEPS.length - 1;
        const nextB = mk('button', 'pt-btn pt-btn-prim', '', isLast ? 'Начать!' : 'Далее →');
        nextB.type = 'button';
        nextB.onclick = () => {
            if (isLast) closeTour(true);
            else { curIdx++; if (typeof playSfx === 'function') playSfx('switch'); renderStep(); }
        };
        navR.appendChild(nextB);
        foot.append(skipB, navR);

        body.append(head, mk('div', 'pt-title', '', st.title), mk('div', 'pt-desc', '', st.desc), mk('div', 'pt-tip', '', st.tip), foot);
        cardEl.append(track, body);
        requestAnimationFrame(() => positionUI(findTarget(st.targets)));
    }

    window.startSglProTour = function() {
        injectTourCss();
        document.getElementById('sgl-tour-bg')?.remove();
        if (rootEl) rootEl.remove();
        active = true; curIdx = 0;

        rootEl = mk('div', '', ''); rootEl.id = 'sgl-pt-root';
        spotEl = mk('div', '', ''); spotEl.id = 'sgl-pt-spot';
        cardEl = mk('div', '', ''); cardEl.id = 'sgl-pt-card';
        rootEl.append(spotEl, cardEl);
        document.body.appendChild(rootEl);

        renderStep();
        requestAnimationFrame(() => { if (rootEl) rootEl.classList.add('open'); });
        if (typeof playSfx === 'function') playSfx('open_menu');
    };

    window.addEventListener('keydown', (e) => {
        if (!active) return;
        if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closeTour(false); }
        else if (e.key === 'ArrowRight' || e.key === 'Enter') {
            e.preventDefault(); e.stopImmediatePropagation();
            if (curIdx >= STEPS.length - 1) closeTour(true);
            else { curIdx++; if (typeof playSfx === 'function') playSfx('switch'); renderStep(); }
        } else if (e.key === 'ArrowLeft' && curIdx > 0) {
            e.preventDefault(); e.stopImmediatePropagation();
            curIdx--; if (typeof playSfx === 'function') playSfx('switch'); renderStep();
        }
    }, true);

    window.addEventListener('resize', () => { if (active) positionUI(findTarget(STEPS.at(curIdx).targets)); }, { passive: true });

    function bindHelpBtn() {
        injectTourCss();
        const hb = document.getElementById('sgl-help-btn');
        if (hb && !hb.dataset.ptBound) {
            hb.dataset.ptBound = '1';
            hb.addEventListener('click', (e) => { e.preventDefault(); e.stopImmediatePropagation(); window.startSglProTour(); }, true);
        }
    }

    const _bootTour = () => {
        bindHelpBtn();
        setTimeout(bindHelpBtn, 700);
        try {
            if (!localStorage.getItem(DONE_KEY)) setTimeout(() => { if (!active) window.startSglProTour(); }, 1100);
        } catch (_) {}
    };
    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', _bootTour);
    else _bootTour();
})();
