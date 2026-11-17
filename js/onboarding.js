/* === ONBOARDING INTERACTIVE TOUR === */
(function() {
    const st = document.createElement('style');
    st.textContent = `
        #sgl-help-btn { left: 66px; font-weight: 800; font-size: 14px; }
        #sgl-help-btn:hover { background: rgba(255, 215, 0, 0.35); border-color: #FFD700; transform: scale(1.1); }
        .sgl-tour-focus { position: relative; z-index: 99985 !important; box-shadow: 0 0 0 3px #FFD700, 0 0 24px rgba(255,215,0,0.75) !important; }
        #sgl-tour-bg { position: fixed; inset: 0; background: rgba(5, 8, 16, 0.72); z-index: 99980; display: none; align-items: center; justify-content: center; backdrop-filter: blur(3px); }
        #sgl-tour-bg.open { display: flex; }
        .sgl-tour-card { background: #141b2d; border: 1px solid rgba(255, 215, 0, 0.45); border-radius: 16px; padding: 20px; width: 390px; max-width: 90vw; color: #fff; box-shadow: 0 18px 45px rgba(0,0,0,0.85); z-index: 99990; }
        .sgl-tour-step { font-size: 11px; color: #FFD700; font-weight: 800; letter-spacing: 1px; margin-bottom: 6px; text-transform: uppercase; }
        .sgl-tour-head { font-size: 16px; font-weight: 800; margin-bottom: 8px; }
        .sgl-tour-body { font-size: 12.5px; line-height: 1.55; opacity: 0.88; margin-bottom: 16px; }
        .sgl-tour-nav { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    `;
    document.head.appendChild(st);

    const STEPS = [
        {
            sel: '#btn-ui-settings',
            step: 'Шаг 1 из 4',
            head: 'Подключение игр за секунду',
            body: 'Нажмите «Игры и пути», чтобы запустить Автопоиск игр на ПК, указать .exe файлы вручную или добавить любую свою игру.'
        },
        {
            sel: '#games-container',
            step: 'Шаг 2 из 4',
            head: 'Карусель и управление',
            body: 'Листайте игры стрелками клавиатуры, колесом/кликом мыши или геймпадом. Повторный клик или Enter запускает выбранную игру.'
        },
        {
            sel: '.footer-controls',
            step: 'Шаг 3 из 4',
            head: 'Моды, твики и сохранения',
            body: 'Перетаскивайте .ZIP архивы модов прямо в окно лаунчера, меняйте настройки экрана без правки конфигов и отслеживайте Изумруды Хаоса.'
        },
        {
            sel: '#btn-ui-custom',
            step: 'Шаг 4 из 4',
            head: 'Полная кастомизация',
            body: 'Настраивайте 3D-круг карусели, живых персонажей по бокам, шейдеры, музыку и делитесь готовыми темами в формате .sonicpack!'
        }
    ];

    function initTour() {
        if (document.getElementById('sgl-help-btn')) return;

        const helpBtn = document.createElement('button');
        helpBtn.id = 'sgl-help-btn';
        helpBtn.setAttribute('data-hud-id', 'btn-help');
        helpBtn.className = 'corner-btn';
        helpBtn.title = 'Обучение и подсказки';
        helpBtn.textContent = '?';
        helpBtn.onclick = () => startTour(0);
        document.body.appendChild(helpBtn);

        const bg = document.createElement('div');
        bg.id = 'sgl-tour-bg';
        bg.innerHTML = `
            <div class="sgl-tour-card">
                <div class="sgl-tour-step" id="sgl-t-step"></div>
                <div class="sgl-tour-head" id="sgl-t-head"></div>
                <div class="sgl-tour-body" id="sgl-t-body"></div>
                <div class="sgl-tour-nav">
                    <button type="button" class="btn-small" id="sgl-t-skip">Пропустить</button>
                    <div style="display:flex;gap:6px;">
                        <button type="button" class="btn-small" id="sgl-t-prev">Назад</button>
                        <button type="button" class="btn-small btn-accent" id="sgl-t-next">Далее</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(bg);

        setTimeout(() => {
            if (!localStorage.getItem('sgl_tour_seen_v1') && typeof availableGames !== 'undefined' && Array.isArray(availableGames) && availableGames.length === 0) {
                startTour(0);
            }
        }, 1100);
    }

    let idx = 0;
    function clearFocus() {
        document.querySelectorAll('.sgl-tour-focus').forEach(el => el.classList.remove('sgl-tour-focus'));
    }

    function endTour() {
        clearFocus();
        localStorage.setItem('sgl_tour_seen_v1', '1');
        document.getElementById('sgl-tour-bg').classList.remove('open');
        if (typeof playSfx === 'function') playSfx('close_menu');
    }

    function startTour(stepIdx) {
        idx = stepIdx;
        clearFocus();
        const item = STEPS[idx];
        const target = document.querySelector(item.sel);
        if (target) target.classList.add('sgl-tour-focus');

        document.getElementById('sgl-t-step').textContent = item.step;
        document.getElementById('sgl-t-head').textContent = item.head;
        document.getElementById('sgl-t-body').textContent = item.body;

        document.getElementById('sgl-t-prev').style.display = idx === 0 ? 'none' : 'inline-block';
        document.getElementById('sgl-t-next').textContent = idx === STEPS.length - 1 ? 'Начать!' : 'Далее';

        document.getElementById('sgl-tour-bg').classList.add('open');
        document.getElementById('sgl-t-skip').onclick = endTour;
        document.getElementById('sgl-t-prev').onclick = () => startTour(idx - 1);
        document.getElementById('sgl-t-next').onclick = () => {
            if (idx < STEPS.length - 1) {
                if (typeof playSfx === 'function') playSfx('switch');
                startTour(idx + 1);
            } else {
                endTour();
            }
        };
    }

    if (document.body) initTour();
    else window.addEventListener('DOMContentLoaded', initTour);
})();
