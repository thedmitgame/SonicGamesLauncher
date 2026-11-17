/* === MODULE 4 PART A: UI === */
window.__m4InitUI = function() {
    const st = document.createElement('style');
    st.textContent = `
        #m4-day-layer { position:fixed; inset:0; pointer-events:none; z-index:1; mix-blend-mode:soft-light; opacity:0; transition:opacity 1s, background 1s; }
        #m4-intro { position:fixed; inset:0; z-index:99999; background:#05070d; display:none; align-items:center; justify-content:center; cursor:pointer; }
        #m4-intro.show { display:flex; }
        #m4-intro video, #m4-intro img { width:100%; height:100%; object-fit:cover; pointer-events:none; }
        .m4-hint { position:absolute; bottom:26px; right:32px; background:rgba(10,14,26,0.8); border:1px solid rgba(255,255,255,0.2); color:#fff; padding:7px 15px; border-radius:18px; font-size:12px; font-weight:600; }
        .m4-ring { width:82px; height:82px; border-radius:50%; border:7px solid #FFD700; box-shadow:0 0 25px rgba(255,215,0,0.7); animation:m4Spin 0.9s linear infinite; margin-bottom:16px; }
        @keyframes m4Spin { 0%{transform:rotateY(0deg)} 100%{transform:rotateY(360deg)} }
        #m4-btn { position:fixed; top:16px; right:20px; z-index:900; }
        #m4-modal { position:fixed; inset:0; z-index:9500; background:rgba(0,0,0,0.7); display:none; align-items:center; justify-content:center; backdrop-filter:blur(4px); }
        #m4-modal.open { display:flex; }
        .m4-card { width:430px; max-width:92vw; background:#121726; border:1px solid rgba(255,255,255,0.15); border-radius:16px; padding:20px; color:#fff; }
        .m4-row { display:flex; align-items:center; justify-content:space-between; margin:10px 0; gap:10px; }
        .m4-act { background:#2563eb; color:#fff; border:none; padding:8px 12px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; }
        .m4-act.sec { background:rgba(255,255,255,0.12); }
    `;
    document.head.appendChild(st);

    const dayLayer = document.createElement('div'); dayLayer.id = 'm4-day-layer'; document.body.appendChild(dayLayer);
    const introBox = document.createElement('div'); introBox.id = 'm4-intro'; document.body.appendChild(introBox);
    const openBtn = document.createElement('button'); openBtn.id = 'm4-btn'; openBtn.className = 'settings-btn'; openBtn.className = 'settings-btn';
    openBtn.setAttribute('data-hud-id', 'm4btn'); openBtn.innerHTML = '<span class="btn-inner-wrap"><span class="btn-inner-wrap"><svg class="btn-svg-icon" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2.5"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg><span>Атмосфера</span></span></span>'; document.body.appendChild(openBtn);

    const modal = document.createElement('div'); modal.id = 'm4-modal';
    modal.innerHTML = `
        <div class="m4-card">
            <div style="font-size:16px;font-weight:800;color:#FFD700;margin-bottom:12px;">Заставка и Атмосфера</div>
            <div style="background:rgba(255,255,255,0.05);padding:12px;border-radius:10px;margin-bottom:12px;">
                <div class="m4-row"><span style="font-size:13px;font-weight:700;">Заставка перед стартом игры</span><input type="checkbox" id="m4-c-in"></div>
                <div id="m4-f-lbl" style="font-size:11px;opacity:0.75;margin-bottom:10px;word-break:break-all;">Файл: Кольцо Соника</div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    <button class="m4-act" id="m4-b-br">Выбрать файл</button>
                    <button class="m4-act sec" id="m4-b-cl">Сбросить</button>
                    <button class="m4-act sec" id="m4-b-pr">Тест</button>
                </div>
            </div>
            <div style="background:rgba(255,255,255,0.05);padding:12px;border-radius:10px;margin-bottom:14px;">
                <div class="m4-row"><span style="font-size:13px;font-weight:700;">Освещение по времени суток</span><input type="checkbox" id="m4-c-dt"></div>
                <div class="m4-row">
                    <span style="font-size:12px;opacity:0.8;" id="m4-p-lbl">Режим:</span>
                    <select id="m4-s-dt" style="background:#1b2236;color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:5px 8px;font-size:12px;">
                        <option value="auto">Авто (часы ПК)</option>
                        <option value="morning">Утро</option>
                        <option value="day">День</option>
                        <option value="evening">Вечер</option>
                        <option value="night">Ночь</option>
                    </select>
                </div>
            </div>
            <button class="m4-act" id="m4-b-ok" style="width:100%;padding:9px;">Закрыть</button>
        </div>`;
    document.body.appendChild(modal);
    return { dayLayer, introBox, openBtn, modal };
};


/* === MODULE 4 PART B: LOGIC === */
(function() {
    if (!window.__m4InitUI) return;
    const { dayLayer, introBox, openBtn, modal } = window.__m4InitUI();
    let m4 = { intro_enabled: false, intro_media_path: '', daytime_fx: true, daytime_override: 'auto' };
    let playing = false;

    function applyDaytime() {
        if (!m4.daytime_fx) { dayLayer.style.opacity = '0'; return; }
        let mode = m4.daytime_override || 'auto';
        if (mode === 'auto') {
            const h = new Date().getHours();
            mode = (h >= 6 && h < 12) ? 'morning' : (h >= 12 && h < 17) ? 'day' : (h >= 17 && h < 22) ? 'evening' : 'night';
        }
        const map = {
            morning: { bg: 'linear-gradient(135deg, rgba(255,190,110,0.32), rgba(90,185,255,0.22))', op: '0.85', lbl: 'Утро' },
            day:     { bg: 'transparent', op: '0', lbl: 'День' },
            evening: { bg: 'linear-gradient(160deg, rgba(255,95,55,0.38), rgba(130,45,165,0.38))', op: '0.9', lbl: 'Вечер' },
            night:   { bg: 'linear-gradient(180deg, rgba(8,14,44,0.65), rgba(38,16,82,0.52))', op: '0.95', lbl: 'Ночь' }
        };
        const cur = map[mode] || map.day;
        dayLayer.style.background = cur.bg;
        dayLayer.style.opacity = cur.op;
        document.getElementById('m4-p-lbl').textContent = 'Активно: ' + cur.lbl;
    }

    const origFetch = window.fetch.bind(window);
    async function sync() {
        try {
            const cfg = await (await origFetch('/api/games')).json();
            m4.intro_enabled = !!cfg.intro_enabled;
            m4.intro_media_path = cfg.intro_media_path || '';
            m4.daytime_fx = cfg.daytime_fx !== undefined ? !!cfg.daytime_fx : true;
            m4.daytime_override = cfg.daytime_override || 'auto';
            document.getElementById('m4-c-in').checked = m4.intro_enabled;
            document.getElementById('m4-c-dt').checked = m4.daytime_fx;
            document.getElementById('m4-s-dt').value = m4.daytime_override;
            const fn = m4.intro_media_path ? m4.intro_media_path.split(/[\\/]/).pop() : 'Стандартная анимация кольца';
            document.getElementById('m4-f-lbl').textContent = 'Файл: ' + fn;
            applyDaytime();
        } catch (_) {}
    }

    async function save(patch) {
        await origFetch('/api/intro/settings', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(patch) });
        await sync();
    }

    function runIntro(label) {
        return new Promise((resolve) => {
            if (playing) { resolve(); return; }
            playing = true;
            introBox.innerHTML = '';
            const paused = [];
            document.querySelectorAll('audio').forEach(a => { if (!a.paused) { a.pause(); paused.push(a); } });
            let done = false, tid = null;
            const finish = () => {
                if (done) return;
                done = true;
                if (tid) clearTimeout(tid);
                window.removeEventListener('keydown', onKey);
                introBox.classList.remove('show');
                introBox.innerHTML = '';
                paused.forEach(a => { try { a.play(); } catch (_) {} });
                playing = false;
                resolve();
            };
            const onKey = (e) => { if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') finish(); };
            const p = (m4.intro_media_path || '').toLowerCase();
            if (p.endsWith('.mp4') || p.endsWith('.webm') || p.endsWith('.ogg')) {
                const v = document.createElement('video');
                v.src = '/api/intro/media?t=' + Date.now();
                v.autoplay = true; v.onended = finish; v.onerror = finish;
                introBox.appendChild(v);
            } else if (p.endsWith('.png') || p.endsWith('.jpg') || p.endsWith('.jpeg') || p.endsWith('.gif') || p.endsWith('.webp')) {
                const img = document.createElement('img');
                img.src = '/api/intro/media?t=' + Date.now();
                img.onerror = finish;
                introBox.appendChild(img);
                tid = setTimeout(finish, 3000);
            } else {
                introBox.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;"><div class="m4-ring"></div><div style="font-size:20px;font-weight:800;color:#FFD700;">${label}</div></div>`;
                tid = setTimeout(finish, 1800);
            }
            const h = document.createElement('div'); h.className = 'm4-hint'; h.textContent = 'Клик или ESC — пропустить';
            introBox.appendChild(h);
            introBox.classList.add('show');
            introBox.onclick = finish;
            window.addEventListener('keydown', onKey);
        });
    }

    window.fetch = async function(input, init) {
        const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
        if (url.includes('/api/launch') && m4.intro_enabled && !playing) {
            await runIntro('ЗАПУСК ИГРЫ...');
        }
        return origFetch(input, init);
    };

    openBtn.onclick = () => { sync(); modal.classList.add('open'); };
    document.getElementById('m4-b-ok').onclick = () => modal.classList.remove('open');
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('open'); };
    document.getElementById('m4-c-in').onchange = (e) => save({ intro_enabled: e.target.checked });
    document.getElementById('m4-c-dt').onchange = (e) => save({ daytime_fx: e.target.checked });
    document.getElementById('m4-s-dt').onchange = (e) => save({ daytime_override: e.target.value });
    document.getElementById('m4-b-cl').onclick = () => save({ clear_media: true });
    document.getElementById('m4-b-pr').onclick = () => runIntro('ПРЕДПРОСМОТР ЗАСТАВКИ');
    document.getElementById('m4-b-br').onclick = async () => {
        const r = await (await origFetch('/api/intro/browse', { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' })).json();
        if (r.ok) await sync();
    };

    sync();
    setInterval(applyDaytime, 60000);
})();


/* === MODULE 5: ROULETTE, FOLDERS & RING CURSOR === */
(function() {
    // 1. Стили для кнопок Рулетки, Папок и частиц-колец при клике
    const st = document.createElement('style');
    st.textContent = `
        #m5-top-bar {
            position: fixed; top: 16px; right: 158px; z-index: 900;
            display: flex; align-items: center; gap: 10px;
        }
        #m5-top-bar .settings-btn:disabled { opacity: 0.45; cursor: default; transform: none; }
        .m5-click-ring {
            position: fixed; width: 12px; height: 12px; border-radius: 50%;
            border: 2.5px solid #FFD700; box-shadow: 0 0 8px rgba(255, 215, 0, 0.85);
            pointer-events: none; z-index: 99998; will-change: transform, opacity;
        }
    `;
    document.head.appendChild(st);

    // 2. Панель быстрых действий: Рулетка, Папка игры, Папка сохранений
    const bar = document.createElement('div');
    bar.id = 'm5-top-bar';
    bar.setAttribute('data-hud-id', 'm5bar');
    bar.innerHTML = `
        <button class="settings-btn" id="m5-roulette-btn" title="Выбрать случайную игру"><span class="btn-inner-wrap"><svg class="btn-svg-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><circle cx="15.5" cy="15.5" r="1.5"/><circle cx="12" cy="12" r="1.5"/></svg><span>Рулетка</span></span></button>
        <button class="settings-btn" id="m5-dir-game-btn" title="Открыть папку выбранной игры"><span class="btn-inner-wrap"><svg class="btn-svg-icon" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><span>Игра</span></span></button>
        <button class="settings-btn" id="m5-dir-save-btn" title="Открыть папку сохранений и конфигов"><span class="btn-inner-wrap"><svg class="btn-svg-icon" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg><span>Сейвы</span></span></button>
    `;
    document.body.appendChild(bar);

    // 3. Логика Рулетки (анимированная прокрутка карусели)
    let isSpinning = false;
    document.getElementById('m5-roulette-btn').onclick = () => {
        if (isSpinning || !Array.isArray(availableGames) || availableGames.length <= 1) return;
        isSpinning = true;
        const btn = document.getElementById('m5-roulette-btn');
        btn.disabled = true;

        const total = availableGames.length;
        const steps = total * 3 + Math.floor(Math.random() * total) + 1;
        let currentStep = 0;

        function spinTick() {
            moveSelection(1);
            currentStep++;
            if (currentStep < steps) {
                // Плавное замедление под конец прокрутки
                const progress = currentStep / steps;
                const delay = Math.floor(45 + Math.pow(progress, 2.4) * 260);
                setTimeout(spinTick, delay);
            } else {
                isSpinning = false;
                btn.disabled = false;
                playSfx('launch');
            }
        }
        spinTick();
    };

    // 4. Быстрое открытие папок игры и сохранений
    async function openCurrentGameFolder(type) {
        const activeGame = availableGames && availableGames.at(selectedIndex);
        if (!activeGame) return;
        playSfx('switch');
        const res = await fetch(`/api/open_folder?id=${activeGame.id}&type=${type}`);
        const data = await res.json();
        if (!data.ok) {
            showToast(data.error || 'Не удалось открыть папку', true);
        }
    }

    document.getElementById('m5-dir-game-btn').onclick = () => openCurrentGameFolder('game');
    document.getElementById('m5-dir-save-btn').onclick = () => openCurrentGameFolder('saves');

    // 5. Интерактивный курсор: разлёт золотых колец при клике (отключается в liteMode)
    document.addEventListener('pointerdown', (e) => {
        if (currentDesign && currentDesign.liteMode) return;
        const count = 5;
        for (let i = 0; i < count; i++) {
            const ring = document.createElement('div');
            ring.className = 'm5-click-ring';
            ring.style.left = (e.clientX - 6) + 'px';
            ring.style.top = (e.clientY - 6) + 'px';
            document.body.appendChild(ring);

            const angle = (-Math.PI / 2) + ((i - (count - 1) / 2) * 0.55) + (Math.random() - 0.5) * 0.25;
            const speed = 2.4 + Math.random() * 2.2;
            let vx = Math.cos(angle) * speed;
            let vy = Math.sin(angle) * speed - 1.5;
            let x = 0, y = 0, life = 1.0;

            function animRing() {
        if (document.hidden) { requestAnimationFrame(animRing); return; }
                vy += 0.22; // гравитация как в Sonic
                x += vx;
                y += vy;
                life -= 0.032;
                if (life <= 0) {
                    ring.remove();
                    return;
                }
                ring.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${(0.6 + life * 0.5).toFixed(2)})`;
                ring.style.opacity = life.toFixed(2);
                requestAnimationFrame(animRing);
            }
            requestAnimationFrame(animRing);
        }
    }, { passive: true });
})();


/* === CHARACTER ENTRANCE ANIMATIONS === */
(function() {
    const st = document.createElement('style');
    st.textContent = `
        @keyframes charSlideUp {
            0%   { opacity: 0; transform: translate3d(0, 110px, 0) scaleX(var(--char-flip, 1)); }
            100% { opacity: 1; transform: translate3d(0, 0, 0) scaleX(var(--char-flip, 1)); }
        }
        @keyframes charSlideLeft {
            0%   { opacity: 0; transform: translate3d(-120px, 0, 0) scaleX(var(--char-flip, 1)); }
            100% { opacity: 1; transform: translate3d(0, 0, 0) scaleX(var(--char-flip, 1)); }
        }
        @keyframes charSlideRight {
            0%   { opacity: 0; transform: translate3d(120px, 0, 0) scaleX(var(--char-flip, 1)); }
            100% { opacity: 1; transform: translate3d(0, 0, 0) scaleX(var(--char-flip, 1)); }
        }
        @keyframes charFade {
            0%   { opacity: 0; transform: scaleX(var(--char-flip, 1)); }
            100% { opacity: 1; transform: scaleX(var(--char-flip, 1)); }
        }
        @keyframes charPop {
            0%   { opacity: 0; transform: scale(0.75) scaleX(var(--char-flip, 1)); }
            70%  { opacity: 1; transform: scale(1.04) scaleX(var(--char-flip, 1)); }
            100% { opacity: 1; transform: scale(1) scaleX(var(--char-flip, 1)); }
        }
        @keyframes charDashLeft {
            0%   { opacity: 0; transform: translate3d(-180px, 20px, 0) skewX(-12deg) scaleX(var(--char-flip, 1)); }
            100% { opacity: 1; transform: translate3d(0, 0, 0) skewX(0deg) scaleX(var(--char-flip, 1)); }
        }
        @keyframes charDashRight {
            0%   { opacity: 0; transform: translate3d(180px, 20px, 0) skewX(12deg) scaleX(var(--char-flip, 1)); }
            100% { opacity: 1; transform: translate3d(0, 0, 0) skewX(0deg) scaleX(var(--char-flip, 1)); }
        }

        .char-anim-slide_up { animation: charSlideUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
        #character-left-img.char-anim-slide_side  { animation: charSlideLeft 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        #character-right-img.char-anim-slide_side { animation: charSlideRight 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .char-anim-fade { animation: charFade 0.45s ease-out both; }
        .char-anim-pop  { animation: charPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        #character-left-img.char-anim-dash  { animation: charDashLeft 0.42s cubic-bezier(0.16, 1, 0.3, 1) both; }
        #character-right-img.char-anim-dash { animation: charDashRight 0.42s cubic-bezier(0.16, 1, 0.3, 1) both; }
    `;
    document.head.appendChild(st);
})();


/* === CAROUSEL CIRCLE SLIDERS === */
(function() {
    function injectCircleControls() {
        if (document.getElementById('m-circle-controls')) return;
        const anchorInput = document.getElementById('inp-carouselY') || document.getElementById('inp-cardWidth');
        if (!anchorInput) return;
        const targetContainer = anchorInput.closest('.tab-pane') || anchorInput.parentElement?.parentElement;
        if (!targetContainer) return;

        const rxVal = currentDesign?.carouselRadiusX ?? 100;
        const ryVal = currentDesign?.carouselRadiusY ?? 34;

        const box = document.createElement('div');
        box.id = 'm-circle-controls';
        box.className = 'char-card-cfg';
        box.style.marginTop = '8px';
        box.innerHTML = `
            <div class="char-cfg-header"><span>Настройка 3D-круга карусели</span></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:11px;margin-top:4px;">
                <div>
                    Ширина / расстояние (<span id="val-circleRX">${rxVal}</span>%):
                    <input type="range" id="inp-circleRX" min="45" max="160" value="${rxVal}" style="width:100%;margin-top:4px;">
                </div>
                <div>
                    Угол наклона / глубина (<span id="val-circleRY">${ryVal}</span>):
                    <input type="range" id="inp-circleRY" min="-60" max="120" value="${ryVal}" style="width:100%;margin-top:4px;">
                </div>
            </div>
        `;
        targetContainer.appendChild(box);

        document.getElementById('inp-circleRX').oninput = function() {
            const v = parseInt(this.value);
            document.getElementById('val-circleRX').innerText = v;
            if (currentDesign) {
                currentDesign.carouselRadiusX = v;
                updateCarouselPositions();
            }
        };
        document.getElementById('inp-circleRY').oninput = function() {
            const v = parseInt(this.value);
            document.getElementById('val-circleRY').innerText = v;
            if (currentDesign) {
                currentDesign.carouselRadiusY = v;
                updateCarouselPositions();
            }
        };
    }

    const origOpenCustom = window.openCustomModal;
    if (typeof origOpenCustom === 'function') {
        window.openCustomModal = function() {
            origOpenCustom.apply(this, arguments);
            injectCircleControls();
            const rxEl = document.getElementById('inp-circleRX');
            const ryEl = document.getElementById('inp-circleRY');
            if (rxEl && currentDesign) {
                rxEl.value = currentDesign.carouselRadiusX ?? 100;
                document.getElementById('val-circleRX').innerText = rxEl.value;
            }
            if (ryEl && currentDesign) {
                ryEl.value = currentDesign.carouselRadiusY ?? 34;
                document.getElementById('val-circleRY').innerText = ryEl.value;
            }
        };
    }
})();

