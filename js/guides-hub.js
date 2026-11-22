/* === GUIDES, DECOMPILATION DOCTOR & UPDATES HUB === */
(function() {
    let activeTab = 'tutorial';
    let currentGuideGame = 'sonic1';

    const SVG_BOOK = '<svg class="btn-svg-icon" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function isEn() {
        const sel = document.getElementById('m6-lang-select');
        return Boolean(sel && String(sel.value).toLowerCase() === 'en');
    }

    const GUIDE_DB = {
        sonic1: {
            title: 'Sonic 1 Forever',
            site: 'https://teamforeverdev.github.io/',
            steps_ru: [
                '1. Где взять Data.rsdk: извлеките файл Data.rsdk (или Data.rsdk.xmf) из архива assets официального APK Sonic the Hedgehog Classic (так как мобильная версия снята с публикации в магазинах).',
                '2. Установка: положите файл Data.rsdk строго в одну папку рядом с Sonic 1 Forever.exe.',
                '3. Моды: создайте или откройте папку mods/ рядом с игрой — лаунчер сам управляет порядком загрузки в modconfig.ini.',
                '4. Полезные клавиши: F12 — пауза кадра в режиме отладки, F10 — смена палитры, Alt+Enter — полный экран.'
            ],
            steps_en: [
                '1. Getting Data.rsdk: extract Data.rsdk (or Data.rsdk.xmf) from a backup APK of Sonic the Hedgehog Classic (delisted from mobile stores).',
                '2. Setup: place Data.rsdk directly into the same folder as Sonic 1 Forever.exe.',
                '3. Mods: drop mod folders or .ZIP archives into the launcher — modconfig.ini is managed automatically.',
                '4. Hotkeys: F12 — step frame in debug mode, Alt+Enter — toggle fullscreen.'
            ],
            news_ru: 'Актуальное обновление Sonic 1 Forever v1.5.2 (выпущено на новом сайте Team Forever): обновлённые арты, переработанный дизайн кнопок и иконок, новые параметры геймплея (включая перевёрнутый Mirror Mode Rotated), широкоэкранный режим и мод-лоадер RSDKv4.',
            news_en: 'Latest Release — Sonic 1 Forever v1.5.2 (via the new Team Forever website): refreshed artwork & UI icons, new gameplay options (including Mirror Mode Rotated), native widescreen, achievements, and RSDKv4 mod loader support.'
        },
        sonic2: {
            title: 'Sonic 2 Absolute',
            site: 'https://teamforeverdev.github.io/',
            steps_ru: [
                '1. Ресурсы игры: требуется файл Data.rsdk из официального мобильного релиза Sonic The Hedgehog 2 Classic (com.sega.sonic2.runner).',
                '2. Установка: переименуйте исходный архив при необходимости в Data.rsdk и поместите рядом с Sonic 2 Absolute.exe.',
                '3. Сохранения и достижения: прогресс хранится в SData.bin прямо в папке игры — лаунчер читает все 14 достижений и слоты автоматически.',
                '4. Открытие секретов: в режиме Без сохранения наберите в Sound Test 19, 65, 09, 17 для доступа к выбору уровня и Hidden Palace.'
            ],
            steps_en: [
                '1. Game assets: requires Data.rsdk from the official Sonic The Hedgehog 2 Classic mobile release.',
                '2. Setup: place Data.rsdk directly next to Sonic 2 Absolute.exe.',
                '3. Saves & Achievements: stored in SData.bin inside the game folder and tracked live by the launcher.',
                '4. Level Select: in No Save Sound Test play 19, 65, 09, 17.'
            ],
            news_ru: 'Актуальное обновление Sonic 2 Absolute v1.2.2 (доступно на новом сайте Team Forever): свежие арты, обновлённые элементы меню и иконки, новые геймплейные опции и фиксы, Hidden Palace Zone, настройка способностей (Drop Dash, Peel-Out) и поддержка модов.',
            news_en: 'Latest Release — Sonic 2 Absolute v1.2.2 (on the new Team Forever website): brand-new art & updated UI elements, expanded gameplay options & polish, restored Hidden Palace Zone, ability toggles, and mod loader.'
        },
        soniccd: {
            title: 'Sonic CD Restored',
            site: 'https://gamebanana.com/mods/50089',
            steps_ru: [
                '1. Где взять Data.rsdk: подходит файл Data.rsdk прямо из лицензионной ПК-версии Sonic CD (2011) в Steam или мобильного релиза!',
                '2. Саундтрек JP / US: положите папку Videos и аудиодорожки из оригинальной игры рядом с Data.rsdk, чтобы работали заставки и оба саундтрека.',
                '3. Моды: поддерживаются любые моды для декомпиляции RSDKv3 через папку mods/ и modconfig.ini.',
                '4. Твики движка: включить Dev Menu и убрать рамки окна можно прямо через кнопку «Настройки игры» внизу лаунчера.'
            ],
            steps_en: [
                '1. Getting Data.rsdk: copy Data.rsdk directly from your Steam PC copy of Sonic CD (2011) or the mobile version!',
                '2. Videos & JP/US OST: copy the Videos folder next to Data.rsdk so animated FMVs play properly.',
                '3. Mods: RSDKv3 decompilation mods work out of the box via mods/ and modconfig.ini.',
                '4. Engine Tweaks: toggle Dev Menu and Borderless mode right from the Game Tweaks button.'
            ],
            news_ru: 'Декомпиляция RSDKv3 / Sonic CD Restored добавляет одновременный выбор Spin Dash из S2 и Peel-Out, плавные 60+ FPS и фиксы коллизий.',
            news_en: 'Sonic CD Restored / RSDKv3 brings hybrid S2 Spin Dash + Peel-Out controls, unlocked widescreen, and collision fixes.'
        },
        sonic3: {
            title: 'Sonic 3 A.I.R.',
            site: 'https://sonic3air.org',
            steps_ru: [
                '1. Базовый ROM: для первого запуска нужен чистый образ Sonic_Knuckles_wSonic3.bin (из SEGA Mega Drive Classics в Steam).',
                '2. Куда класть моды и сейвы: Sonic 3 A.I.R. хранит всё в %APPDATA%/Sonic3AIR/ (кнопка «Сейвы» на верхней панели откроет её мгновенно!).',
                '3. Порядок модов: в A.I.R. моды ниже по списку или выше перезаписывают ресурсы согласно active-mods.json — стрелки ▲▼ в лаунчере синхронизированы.',
                '4. Горячие клавиши в игре: Alt+Enter — полный экран, F2 — перезапуск уровня (в Dev Mode), F10 — скриншот движка.'
            ],
            steps_en: [
                '1. Required ROM: provide a clean Sonic_Knuckles_wSonic3.bin ROM (from Steam SEGA Mega Drive Classics) on first launch.',
                '2. Mods & Saves location: stored in %APPDATA%/Sonic3AIR/ (click the Saves button on the top bar to open it instantly).',
                '3. Mod Priority: managed via active-mods.json — reorder mods safely inside the launcher.',
                '4. In-Game Keys: Alt+Enter — fullscreen, F2 — quick restart in Dev Mode.'
            ],
            news_ru: 'Актуальные релизы Sonic 3 A.I.R. поддерживают кастомные Lemon-скрипты персонажей, широкоформатный рендер спецэтапов и контейнер сохранений OXY.PDATA.',
            news_en: 'Modern Sonic 3 A.I.R. builds feature deep Lemon scripting, widescreen Special Stages, and OXY.PDATA save containers.'
        },
        mania: {
            title: 'Sonic Mania',
            site: 'https://gamebanana.com/mods/50089',
            steps_ru: [
                '1. Моддинг Mania: установите Mania Mod Loader (SonicManiaModManager.exe) в папку игры и подключите его во вкладке «Игры и пути».',
                '2. Чит-коды и патчи: положите Codes.lst в папку mods/ — тогда во вкладке «Моды -> Коды (Патчи)» появится полный список читов!',
                '3. Режим отладки (Dev Menu): включается в 1 клик через «Настройки игры» лаунчера (клавиша Backspace / Esc в игре).'
            ],
            steps_en: [
                '1. Modding Mania: place Mania Mod Loader in your game folder and link it in Games & Paths.',
                '2. Cheat Codes: with Codes.lst in mods/, toggle patches directly in Mods -> Codes (Patches).',
                '3. Dev Menu: enable in 1 click via Game Tweaks in the launcher.'
            ],
            news_ru: 'Поддерживаются как официальная Steam-сборка с ManiaModLoader.ini, так и нативная декомпиляция RSDKv5.',
            news_en: 'Supports both official Steam release with ManiaModLoader.ini and native RSDKv5 decompilation.'
        },
        srb2: {
            title: 'Sonic Robo Blast 2',
            site: 'https://srb2.org',
            steps_ru: [
                '1. Установка аддонов: кидайте файлы .pk3, .wad, .lua и .soc в папку addons/ (или прямо перетаскивайте архивы в окно лаунчера).',
                '2. Автозагрузка модов: включённые галочкой аддоны автоматически передаются игре через параметр -file при нажатии на карточку!',
                '3. 3D-рендерер: переключиться между классическим Software и аппаратным OpenGL можно в окне «Настройки игры».'
            ],
            steps_en: [
                '1. Installing Addons: place .pk3, .wad, .lua, or .soc files in addons/ (or drag & drop archives into the launcher).',
                '2. Auto-load: enabled addons are automatically passed via -file command line on launch!',
                '3. OpenGL Renderer: toggle Software vs OpenGL directly in Game Tweaks.'
            ],
            news_ru: 'Ветка SRB2 2.2.x активно развивается сообществом: тысячи кастомных персонажей, карт и глобальных конверсий.',
            news_en: 'SRB2 2.2.x features massive community support with custom characters, map packs, and Lua scripts.'
        }
    };

    const LAUNCHER_CHANGELOG_RU = [
        'Релиз v1.3.0:',
        '• Центр гайдов по декомпиляциям, автодиагностика файлов и чтение локальных чейнжлогов.',
        '• Пользовательские полки (коллекции), мульти-версии сборок на карточке и режим «Мини-док» (F9).',
        '• Новые режимы Крупная Витрина (Showcase), Сетка библиотеки (Tab) и модульные HUD-виджеты.',
        '• 3D-коробки игр с разворотом на 180°, живой декор обложек и WebGL 3D-модели (.GLB/.OBJ/.STL) с эволюцией от прогресса.',
        '• Конструктор UI (кнопки, рамки, окна, шрифт, курсоры), Jukebox 2.0, авто-бэкап сейвов и Theme Studio v3.0 с Live-связью!'
    ];

    const LAUNCHER_CHANGELOG_EN = [
        'Release v1.3.0:',
        '• Decompilation Guides Hub, File Doctor diagnostics & local changelog reader.',
        '• Custom Shelves (Collections), Multi-Version builds per card & frameless Mini-Dock (F9).',
        '• Hero Showcase mode, Full Library Grid (Tab) & movable HUD Info Widgets.',
        '• 3D Physical Game Boxes (180° flip), animated Cover Decor & WebGL 3D Models (.GLB/.OBJ/.STL) with progress evolution.',
        '• Full UI Element Builder, Jukebox 2.0, Smart Save Auto-Backups & Theme Studio v3.0 with Live Sync!'
    ];

    function ensureGuidesModal() {
        let m = document.getElementById('sgl-guides-modal');
        if (m) return m;

        m = mk('div', 'modal-backdrop', 'z-index:9650;');
        m.id = 'sgl-guides-modal';
        m.onclick = (e) => { if (e.target === m) m.classList.remove('active'); };

        const box = mk('div', 'modal-box wide-box', 'max-width:650px;');
        const title = mk('div', 'modal-title', '', 'Гайды, диагностика и обновления');

        const topRow = mk('div', '', 'display:flex;gap:8px;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;');
        const gameSel = mk('select', 'custom-select', 'flex:1;min-width:190px;font-weight:700;');
        gameSel.id = 'sgl-guide-game-sel';
        gameSel.onchange = () => { currentGuideGame = gameSel.value; renderGuideBody(); };

        const tabs = mk('div', 'tabs-bar', 'margin-bottom:0;padding:4px;flex:1;min-width:240px;');
        const bTut = mk('button', 'tab-btn active', 'padding:6px 10px;', 'Туториал и проверка');
        bTut.type = 'button'; bTut.id = 'sgl-gtab-tut';
        const bNews = mk('button', 'tab-btn', 'padding:6px 10px;', 'Обновления и новости');
        bNews.type = 'button'; bNews.id = 'sgl-gtab-news';

        bTut.onclick = () => { activeTab = 'tutorial'; bTut.classList.add('active'); bNews.classList.remove('active'); renderGuideBody(); };
        bNews.onclick = () => { activeTab = 'news'; bNews.classList.add('active'); bTut.classList.remove('active'); renderGuideBody(); };
        tabs.append(bTut, bNews);
        topRow.append(gameSel, tabs);

        const body = mk('div', 'mods-list', 'max-height:430px;padding-right:6px;display:flex;flex-direction:column;gap:10px;');
        body.id = 'sgl-guides-body';

        const closeBtn = mk('button', 'close-modal-btn', '', 'Закрыть');
        closeBtn.type = 'button';
        closeBtn.onclick = () => { if (typeof playSfx === 'function') playSfx('close_menu'); m.classList.remove('active'); };

        box.append(title, topRow, body, closeBtn);
        m.appendChild(box);
        document.body.appendChild(m);
        return m;
    }

    function populateGameSelector(preferredId) {
        const sel = document.getElementById('sgl-guide-game-sel');
        if (!sel) return;
        sel.innerHTML = '';
        const seen = new Set();
        const list = (typeof gamesData !== 'undefined' && gamesData.length) ? gamesData : [];
        list.forEach(g => {
            seen.add(g.id);
            const o = mk('option', '', '', g.name);
            o.value = g.id;
            sel.appendChild(o);
        });
        Object.keys(GUIDE_DB).forEach(k => {
            if (!seen.has(k)) {
                const o = mk('option', '', '', GUIDE_DB[k].title);
                o.value = k;
                sel.appendChild(o);
            }
        });
        if (preferredId && Array.from(sel.options).some(o => o.value === preferredId)) {
            currentGuideGame = preferredId;
        }
        sel.value = currentGuideGame;
    }

    async function renderGuideBody() {
        const body = document.getElementById('sgl-guides-body');
        if (!body) return;
        body.innerHTML = '';
        body.appendChild(mk('div', '', 'text-align:center;opacity:0.6;padding:18px;', 'Проверка файлов игры...'));

        let health = { checks: [], localVer: '', exeDate: '', localChangelog: '' };
        try {
            const r = await fetch('/api/guides/check?id=' + encodeURIComponent(currentGuideGame));
            health = await r.json();
        } catch (_) {}

        body.innerHTML = '';
        const en = isEn();
        const info = GUIDE_DB[currentGuideGame];
        const gObj = (typeof gamesData !== 'undefined') ? gamesData.find(x => x.id === currentGuideGame) : null;
        const gTitle = gObj ? gObj.name : (info ? info.title : currentGuideGame);

        if (activeTab === 'tutorial') {
            const docCard = mk('div', '', 'background:rgba(0,0,0,0.3);border:1px solid rgba(255,215,0,0.25);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:6px;');
            docCard.appendChild(mk('div', '', 'font-size:12px;font-weight:800;color:#FFD700;', 'Автодиагностика файлов: ' + gTitle));
            (health.checks || []).forEach(ch => {
                const row = mk('div', '', 'display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px;padding:4px 8px;border-radius:6px;background:rgba(255,255,255,0.04);');
                const badge = mk('span', '', 'font-weight:700;color:' + (ch.ok ? '#4ADE80' : '#FBBF24') + ';', (ch.ok ? '✓ ' : '⚠ ') + (en ? ch.label_en : ch.label_ru));
                const det = mk('span', '', 'font-size:11px;opacity:0.6;max-width:210px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;', ch.detail || '');
                row.append(badge, det);
                docCard.appendChild(row);
            });
            body.appendChild(docCard);

            const tutBox = mk('div', '', 'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px;');
            tutBox.appendChild(mk('div', '', 'font-size:13px;font-weight:800;color:#60A5FA;', 'Инструкция по установке и настройке'));
            const fallbackSteps = en
                ? ['1. Link the game .exe or ROM via Games & Paths.', '2. Drag & drop .ZIP mod archives right into the launcher.', '3. Right-click the card for notes, cheats & folders.']
                : ['1. Укажите путь к .exe или образу игры через «Игры и пути».', '2. Перетаскивайте .ZIP архивы с модами прямо в окно лаунчера.', '3. Нажмите ПКМ по карточке игры для заметок и папок.'];
            const steps = info ? (en ? info.steps_en : info.steps_ru) : fallbackSteps;
            steps.forEach(line => {
                tutBox.appendChild(mk('div', '', 'font-size:12px;line-height:1.5;color:rgba(255,255,255,0.9);padding:6px 8px;background:rgba(0,0,0,0.22);border-radius:7px;user-select:text !important;', line));
            });

            if (info && info.site) {
                const linkRow = mk('div', '', 'display:flex;justify-content:flex-end;margin-top:4px;');
                const webBtn = mk('button', 'btn-small btn-accent', '', 'Официальный сайт / Репозиторий проекта ↗');
                webBtn.type = 'button';
                webBtn.onclick = () => fetch('/api/gb/open_url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: info.site }) });
                linkRow.appendChild(webBtn);
                tutBox.appendChild(linkRow);
            }
            body.appendChild(tutBox);
        } else {
            const gameNews = mk('div', '', 'background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.28);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:6px;');
            const verStr = health.localVer ? ('v' + health.localVer) : (en ? 'Not detected' : 'Не определена');
            const dateStr = health.exeDate ? (' • ' + health.exeDate) : '';
            const summaryTxt = info ? (en ? info.news_en : info.news_ru) : (en ? 'Local build connected to launcher.' : 'Локальная сборка игры подключена к лаунчеру.');
            gameNews.append(
                mk('div', '', 'font-size:13px;font-weight:800;color:#FFD700;', gTitle + ' — ' + verStr + dateStr),
                mk('div', '', 'font-size:12px;line-height:1.5;opacity:0.9;', summaryTxt)
            );
            if (health.localChangelog) {
                gameNews.appendChild(mk('div', '', 'margin-top:4px;padding:8px 10px;background:rgba(0,0,0,0.35);border-radius:8px;font-size:11px;line-height:1.45;white-space:pre-wrap;max-height:150px;overflow-y:auto;user-select:text !important;color:#E2E8F0;', health.localChangelog));
            }
            body.appendChild(gameNews);

            const sglNews = mk('div', '', 'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:5px;');
            sglNews.appendChild(mk('div', '', 'font-size:12.5px;font-weight:800;color:#4ADE80;', 'Что нового в Sonic Games Launcher'));
            (en ? LAUNCHER_CHANGELOG_EN : LAUNCHER_CHANGELOG_RU).forEach(ln => {
                sglNews.appendChild(mk('div', '', 'font-size:11.5px;line-height:1.45;opacity:0.88;', ln));
            });
            const ghBtn = mk('button', 'btn-small', 'align-self:flex-end;margin-top:4px;', 'Релизы на GitHub ↗');
            ghBtn.type = 'button';
            ghBtn.onclick = () => fetch('/api/gb/open_url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'https://github.com' }) });
            sglNews.appendChild(ghBtn);
            body.appendChild(sglNews);
        }
    }

    window.openGuidesHubModal = function(gameId, tabMode) {
        const m = ensureGuidesModal();
        const activeG = (typeof availableGames !== 'undefined' && availableGames.length > 0) ? availableGames.at(selectedIndex) : null;
        const targetId = gameId || (activeG ? activeG.id : 'sonic1');
        if (tabMode) {
            activeTab = tabMode;
            document.getElementById('sgl-gtab-tut')?.classList.toggle('active', activeTab === 'tutorial');
            document.getElementById('sgl-gtab-news')?.classList.toggle('active', activeTab === 'news');
        }
        populateGameSelector(targetId);
        m.classList.add('active');
        if (typeof playSfx === 'function') playSfx('open_menu');
        renderGuideBody();
    };

    function injectTopGuidesBtn() {
        if (document.getElementById('sgl-guides-top-btn')) return;
        const bar = document.querySelector('[data-hud-id="m5bar"]');
        if (!bar) return;
        const b = mk('button', 'settings-btn', 'padding:6px 12px;font-size:12px;', '');
        b.type = 'button'; b.id = 'sgl-guides-top-btn';
        b.title = 'Туториалы по установке игр, проверка файлов и обновления';
        b.innerHTML = '<span class="btn-inner-wrap">' + SVG_BOOK + '<span>Гайды</span></span>';
        b.onclick = () => window.openGuidesHubModal();
        bar.appendChild(b);
    }

    window.addEventListener('DOMContentLoaded', () => setTimeout(injectTopGuidesBtn, 280));
})();
