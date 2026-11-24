/* === FULL MANUAL UI ELEMENT BUILDER (BUTTONS, FRAMES, MODALS, TYPOGRAPHY 2.0, CURSORS) === */
(function() {
    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    const DEF_UIB = {
        enabled: false,
        // 1. Кнопки
        btnBg: '#0f172a', btnBgAlpha: 68, btnHoverBg: '#2563eb',
        btnBorderCol: '#60a5fa', btnBorderW: 1, btnRadius: 22, btnSkew: 0, btnGlow: 10,
        // 2. Рамки карточек
        cardBorderW: 2, cardBorderStyle: 'solid', cardBorderCol: '#334155',
        cardSelCol: '#FFD700', cardGlow: 24,
        // 3. Модальные окна
        modalBg: '#0c1322', modalAlpha: 94, modalBlur: 14,
        modalRadius: 16, modalBorderCol: '#3b82f6',
        // 4. Типографика 2.0
        letterSpacing: 1.5, textStrokeW: 0, textStrokeCol: '#000000', textShadowMode: 'soft',
        // 5. Курсоры
        cursorNormal: '', cursorPointer: ''
    };

    function hexToRgba(hex, alphaPct) {
        const h = String(hex || '#0f172a').replace('#', '');
        const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16) || 0;
        const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        return 'rgba(' + r + ',' + g + ',' + b + ',' + (Math.max(0, Math.min(100, Number(alphaPct ?? 80))) / 100).toFixed(2) + ')';
    }

    function getUib() {
        if (typeof currentDesign === 'undefined' || !currentDesign) return Object.assign({}, DEF_UIB);
        if (!currentDesign.uiThemeBuilder) currentDesign.uiThemeBuilder = {};
        return Object.assign({}, DEF_UIB, currentDesign.uiThemeBuilder);
    }

    window.applyUiBuilderStyles = function() {
        let st = document.getElementById('sgl-uibuilder-live-css');
        if (!st) {
            st = mk('style', '', '');
            st.id = 'sgl-uibuilder-live-css';
            document.head.appendChild(st);
        }
        const c = getUib();
        const rules = new Array();

        // Курсоры применяются всегда, если заданы (даже без включённого кастом-стиля кнопок)
        if (c.cursorNormal) {
            rules.push('html, body { cursor: url("' + c.cursorNormal + '"), auto !important; }');
        }
        if (c.cursorPointer) {
            rules.push('button, select, a, .game-card, .sgl-cat-pill, input[type="checkbox"], input[type="range"] { cursor: url("' + c.cursorPointer + '"), pointer !important; }');
        }

        if (c.enabled) {
            const bBg = hexToRgba(c.btnBg, c.btnBgAlpha);
            const mBg = hexToRgba(c.modalBg, c.modalAlpha);
            const sk = Number(c.btnSkew || 0);
            const unSk = -sk;

            // Кнопки главного экрана и интерфейса
            rules.push(
                '.settings-btn, .corner-btn, #m6-lang-select {' +
                ' background:' + bBg + ' !important;' +
                ' border:' + c.btnBorderW + 'px solid ' + c.btnBorderCol + ' !important;' +
                ' border-radius:' + c.btnRadius + 'px !important;' +
                (sk !== 0 ? (' transform:skewX(' + sk + 'deg);') : '') +
                (c.btnGlow > 0 ? (' box-shadow:0 4px ' + c.btnGlow + 'px rgba(0,0,0,0.45), 0 0 ' + Math.round(c.btnGlow * 0.7) + 'px ' + hexToRgba(c.btnBorderCol, 38) + ' !important;') : '') +
                '}'
            );
            if (sk !== 0) {
                rules.push('.settings-btn .btn-inner-wrap { display:inline-flex; transform:skewX(' + unSk + 'deg); }');
            }
            rules.push(
                '.settings-btn:hover, .corner-btn:hover {' +
                ' background:' + c.btnHoverBg + ' !important;' +
                ' border-color:#FFD700 !important;' +
                '}'
            );

            // Рамки карточек карусели
            rules.push(
                '.game-card:not(.has-box3d) .cover-box {' +
                ' border:' + c.cardBorderW + 'px ' + c.cardBorderStyle + ' ' + c.cardBorderCol + ' !important;' +
                '}'
            );
            rules.push(
                '.game-card.selected:not(.has-box3d) .cover-box {' +
                ' border-color:' + c.cardSelCol + ' !important;' +
                ' box-shadow:0 14px 34px rgba(0,0,0,0.7), 0 0 ' + c.cardGlow + 'px ' + hexToRgba(c.cardSelCol, 65) + ' !important;' +
                '}'
            );

            // Модальные окна
            rules.push(
                '.modal-box {' +
                ' background:' + mBg + ' !important;' +
                ' backdrop-filter:blur(' + c.modalBlur + 'px) !important;' +
                ' border-radius:' + c.modalRadius + 'px !important;' +
                ' border:1.5px solid ' + hexToRgba(c.modalBorderCol, 55) + ' !important;' +
                '}'
            );

            // Типографика 2.0
            let tShad = '0 3px 10px rgba(0,0,0,0.65)';
            if (c.textShadowMode === 'retro') tShad = '3px 3px 0px #000000';
            else if (c.textShadowMode === 'neon') tShad = '0 0 12px var(--title-color,#FFD700), 0 0 24px rgba(59,130,246,0.7)';
            else if (c.textShadowMode === 'none') tShad = 'none';

            rules.push(
                '#main-title-text, .modal-title, .game-title {' +
                ' letter-spacing:' + c.letterSpacing + 'px !important;' +
                ' text-shadow:' + tShad + ' !important;' +
                (c.textStrokeW > 0 ? (' -webkit-text-stroke:' + c.textStrokeW + 'px ' + c.textStrokeCol + ' !important;') : '') +
                '}'
            );
        }

        st.textContent = rules.join('\n');
    };

    window.openUiThemeBuilderModal = function() {
        if (typeof currentDesign === 'undefined' || !currentDesign) return;
        if (!currentDesign.uiThemeBuilder) currentDesign.uiThemeBuilder = Object.assign({}, DEF_UIB);
        const cfg = currentDesign.uiThemeBuilder;
        Object.keys(DEF_UIB).forEach(k => { if (cfg[k] === undefined) cfg[k] = DEF_UIB[k]; });

        document.getElementById('sgl-uib-modal')?.remove();
        const bg = mk('div', 'modal-backdrop active', 'z-index:9892;');
        bg.id = 'sgl-uib-modal';
        bg.onclick = (e) => { if (e.target === bg) bg.remove(); };

        const box = mk('div', 'modal-box', 'width:880px;max-width:96vw;max-height:91vh;display:flex;flex-direction:column;padding:20px 24px;');
        box.appendChild(mk('div', 'modal-title', 'margin-bottom:10px;', 'Конструктор элементов UI (Кнопки, Рамки, Окна, Текст, Курсоры)'));

        const topToggle = mk('div', '', 'display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 14px;background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.35);border-radius:10px;margin-bottom:12px;flex-wrap:wrap;');
        const chkLbl = mk('label', '', 'display:flex;align-items:center;gap:8px;font-size:13px;font-weight:800;cursor:pointer;', '');
        const enChk = document.createElement('input');
        enChk.type = 'checkbox'; enChk.style.accentColor = '#FFD700'; enChk.checked = Boolean(cfg.enabled);
        chkLbl.append(enChk, mk('span', '', '', 'Активировать ручной стиль кнопок, рамок, окон и текста поверх базового пресета'));

        const resetUibBtn = mk('button', 'btn-small btn-clear', '', 'Сбросить конструктор');
        resetUibBtn.type = 'button';
        topToggle.append(chkLbl, resetUibBtn);

        const scrollBody = mk('div', 'mods-list', 'max-height:430px;display:grid;grid-template-columns:1fr 1fr;gap:12px;padding-right:6px;overflow-y:auto;');

        const mkColor = (lbl, key) => {
            const w = mk('div', '', 'display:flex;justify-content:space-between;align-items:center;font-size:11.5px;background:rgba(0,0,0,0.24);padding:5px 9px;border-radius:7px;');
            w.appendChild(mk('span', '', '', lbl));
            const inp = document.createElement('input');
            inp.type = 'color'; inp.value = cfg[key] || '#ffffff';
            inp.style.cssText = 'width:34px;height:26px;border:none;background:none;cursor:pointer;';
            inp.oninput = () => { cfg.enabled = true; enChk.checked = true; cfg[key] = inp.value; window.applyUiBuilderStyles(); };
            w.appendChild(inp);
            return w;
        };

        const mkRange = (lbl, key, min, max, step, unit) => {
            const w = mk('div', '', 'display:flex;flex-direction:column;gap:3px;font-size:11px;');
            const sp = mk('span', '', 'opacity:0.85;', lbl + ': ' + cfg[key] + (unit || ''));
            const inp = document.createElement('input');
            inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = String(cfg[key]);
            inp.style.width = '100%';
            inp.oninput = () => { cfg.enabled = true; enChk.checked = true; cfg[key] = Number(inp.value); sp.textContent = lbl + ': ' + cfg[key] + (unit || ''); window.applyUiBuilderStyles(); };
            w.append(sp, inp);
            return w;
        };

        function buildSections() {
            scrollBody.innerHTML = '';

            // 1. Кнопки
            const sBtn = mk('div', 'char-card-cfg', 'margin-bottom:0;gap:8px;');
            sBtn.appendChild(mk('div', 'char-cfg-header', 'color:#60A5FA;', '1. Геометрия и цвета кнопок'));
            sBtn.append(
                mkColor('Фон кнопки', 'btnBg'),
                mkColor('Фон при наведении (Hover)', 'btnHoverBg'),
                mkColor('Цвет контура кнопки', 'btnBorderCol'),
                mkRange('Прозрачность фона', 'btnBgAlpha', 10, 100, 5, '%'),
                mkRange('Скругление углов', 'btnRadius', 0, 32, 1, 'px'),
                mkRange('Наклон плашки (Skew)', 'btnSkew', -22, 22, 1, '°'),
                mkRange('Толщина обводки', 'btnBorderW', 0, 5, 1, 'px'),
                mkRange('Свечение кнопок', 'btnGlow', 0, 30, 2, 'px')
            );

            // 2. Рамки карточек и Модальные окна
            const sFrame = mk('div', 'char-card-cfg', 'margin-bottom:0;gap:8px;');
            sFrame.appendChild(mk('div', 'char-cfg-header', 'color:#FFD700;', '2. Рамки обложек и Модальные окна'));
            const bStyleRow = mk('div', '', 'display:flex;justify-content:space-between;align-items:center;font-size:11.5px;');
            bStyleRow.appendChild(mk('span', '', '', 'Тип линии рамки:'));
            const bsSel = mk('select', 'custom-select', 'width:150px;padding:4px 8px;font-size:11px;');
            Array.of({ v: 'solid', t: 'Сплошная (Solid)' }, { v: 'double', t: 'Двойная (Double)' }, { v: 'dashed', t: 'Пунктир (Dashed)' }).forEach(o => {
                const op = mk('option', '', '', o.t); op.value = o.v; bsSel.appendChild(op);
            });
            bsSel.value = cfg.cardBorderStyle || 'solid';
            bsSel.onchange = () => { cfg.enabled = true; enChk.checked = true; cfg.cardBorderStyle = bsSel.value; window.applyUiBuilderStyles(); };
            bStyleRow.appendChild(bsSel);

            sFrame.append(
                bStyleRow,
                mkRange('Толщина рамки обложки', 'cardBorderW', 0, 8, 1, 'px'),
                mkColor('Рамка обычной карточки', 'cardBorderCol'),
                mkColor('Рамка и ореол выбранной', 'cardSelCol'),
                mkRange('Сила свечения выбранной игры', 'cardGlow', 0, 55, 3, 'px'),
                mkColor('Фон модальных окон', 'modalBg'),
                mkColor('Контур модальных окон', 'modalBorderCol'),
                mkRange('Размытие стекла окон (Blur)', 'modalBlur', 0, 28, 2, 'px'),
                mkRange('Скругление модальных окон', 'modalRadius', 0, 32, 2, 'px')
            );

            // 3. Типографика 2.0
            const sTypo = mk('div', 'char-card-cfg', 'margin-bottom:0;gap:8px;');
            sTypo.appendChild(mk('div', 'char-cfg-header', 'color:#F472B6;', '3. Типографика 2.0 (Заголовки и Текст)'));
            const shRow = mk('div', '', 'display:flex;justify-content:space-between;align-items:center;font-size:11.5px;');
            shRow.appendChild(mk('span', '', '', 'Стиль тени букв:'));
            const shSel = mk('select', 'custom-select', 'width:170px;padding:4px 8px;font-size:11px;');
            Array.of(
                { v: 'soft', t: 'Мягкая объёмная' },
                { v: 'retro', t: 'Ретро 16-bit (Жёсткая)' },
                { v: 'neon', t: 'Неоновый ореол' },
                { v: 'none', t: 'Без тени' }
            ).forEach(o => { const op = mk('option', '', '', o.t); op.value = o.v; shSel.appendChild(op); });
            shSel.value = cfg.textShadowMode || 'soft';
            shSel.onchange = () => { cfg.enabled = true; enChk.checked = true; cfg.textShadowMode = shSel.value; window.applyUiBuilderStyles(); };
            shRow.appendChild(shSel);

            sTypo.append(
                shRow,
                mkRange('Разрядка букв (Spacing)', 'letterSpacing', -1, 8, 0.5, 'px'),
                mkRange('Контур букв (Stroke)', 'textStrokeW', 0, 3, 0.5, 'px'),
                mkColor('Цвет контура букв', 'textStrokeCol')
            );

            // 4. Кастомные курсоры мыши
            const sCur = mk('div', 'char-card-cfg', 'margin-bottom:0;gap:8px;');
            sCur.appendChild(mk('div', 'char-cfg-header', 'color:#4ADE80;', '4. Свои курсоры мыши (.PNG / .CUR / .ICO)'));
            const makeCursorSlot = (title, field, slotName) => {
                const r = mk('div', '', 'display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.26);padding:7px 10px;border-radius:8px;font-size:11.5px;gap:6px;');
                r.appendChild(mk('span', '', '', title + ': ' + (cfg[field] ? 'Загружен ✓' : 'Системный')));
                const bWrap = mk('div', '', 'display:flex;gap:5px;');
                const bPick = mk('button', 'btn-small', '', 'Обзор...');
                bPick.type = 'button';
                bPick.onclick = async () => {
                    const res = await (await fetch('/api/assets/pick_cursor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slot: slotName }) })).json();
                    if (res.ok && res.url) { cfg[field] = res.url; buildSections(); window.applyUiBuilderStyles(); }
                };
                const bClr = mk('button', 'btn-small btn-clear', '', '×');
                bClr.type = 'button';
                bClr.onclick = () => { cfg[field] = ''; buildSections(); window.applyUiBuilderStyles(); };
                bWrap.append(bPick, bClr);
                r.appendChild(bWrap);
                return r;
            };
            sCur.append(
                makeCursorSlot('Обычный курсор', 'cursorNormal', 'normal'),
                makeCursorSlot('Курсор наведения (Кнопки)', 'cursorPointer', 'pointer'),
                mk('div', '', 'font-size:10.5px;opacity:0.65;line-height:1.4;', 'Рекомендуемый размер .PNG для курсора: 32×32 px (автоматически сохраняется при упаковке .sonicpack).')
            );

            scrollBody.append(sBtn, sFrame, sTypo, sCur);
        }

        enChk.onchange = () => { cfg.enabled = enChk.checked; window.applyUiBuilderStyles(); };
        resetUibBtn.onclick = () => {
            Object.assign(cfg, JSON.parse(JSON.stringify(DEF_UIB)));
            enChk.checked = false;
            buildSections();
            window.applyUiBuilderStyles();
        };

        const saveBtn = mk('button', 'close-modal-btn', 'margin-top:12px;', 'Сохранить стиль интерфейса');
        saveBtn.type = 'button';
        saveBtn.onclick = async () => {
            if (typeof window.restoreGlobalDesignFields === 'function') window.restoreGlobalDesignFields();
            await fetch('/api/design', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(currentDesign) });
            window.applyUiBuilderStyles();
            if (typeof playSfx === 'function') playSfx('launch');
            bg.remove();
            if (typeof showToast === 'function') showToast('Настройки конструктора UI сохранены!');
        };

        box.append(topToggle, scrollBody, saveBtn);
        bg.appendChild(box);
        document.body.appendChild(bg);
        buildSections();
        if (typeof playSfx === 'function') playSfx('open_menu');
    };

    function injectBuilderBanner() {
        const pane = document.getElementById('tab-buttons');
        if (!pane || pane.querySelector('.sgl-uib-open-card')) return;
        const card = mk('div', 'char-card-cfg sgl-uib-open-card', 'flex-direction:row;justify-content:space-between;align-items:center;padding:10px 12px;margin-bottom:10px;');
        const btn = mk('button', 'btn-small', 'padding:6px 12px;font-weight:600;', 'Открыть Конструктор UI...');
        btn.type = 'button';
        btn.onclick = () => window.openUiThemeBuilderModal();
        card.append(
            mk('span', '', 'font-size:12px;font-weight:700;color:rgba(255,255,255,0.9);', 'Конструктор кнопок, рамок, окон, шрифта и курсоров'),
            btn
        );
        pane.prepend(card);
    }

    const _bootUib = () => {
        injectBuilderBanner();
        const origApp = window.applyDesign;
        if (typeof origApp === 'function' && !window._uibApplyHooked) {
            window._uibApplyHooked = true;
            window.applyDesign = function() {
                const r = origApp.apply(this, arguments);
                window.applyUiBuilderStyles();
                return r;
            };
        }
        const origCustom = window.openCustomModal;
        if (typeof origCustom === 'function' && !window._uibCustomHooked) {
            window._uibCustomHooked = true;
            window.openCustomModal = function() {
                const r = origCustom.apply(this, arguments);
                injectBuilderBanner();
                return r;
            };
        }
        setTimeout(window.applyUiBuilderStyles, 320);
        let _lastStudioRev = 0;
        setInterval(async () => {
            if (document.hidden) return;
            try {
                const r = await (await fetch('/api/studio/ping')).json();
                if (r.rev && r.rev !== _lastStudioRev) {
                    const wasZero = (_lastStudioRev === 0);
                    _lastStudioRev = r.rev;
                    if (!wasZero && typeof loadGames === 'function') {
                        await loadGames(false);
                        if (typeof showToast === 'function') showToast('Тема обновлена из Theme Studio!');
                    }
                }
            } catch (_) {}
        }, 1600);

    };

    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', _bootUib);
    else _bootUib();
})();
