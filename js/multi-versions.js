/* === MULTI-VERSION BUILDS & LOCAL PORTABLE INSTALLERS === */
(function() {
    let bypassVariantHook = false;

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function injectMvStyles() {
        if (document.getElementById('sgl-mv-css')) return;
        const st = mk('style', '', '');
        st.id = 'sgl-mv-css';
        st.textContent = [
            '.sgl-ver-badge{position:absolute;top:8px;left:8px;z-index:6;padding:2px 7px;border-radius:8px;background:rgba(12,18,32,0.88);border:1px solid rgba(96,165,250,0.65);color:#93C5FD;font-size:9.5px;font-weight:900;letter-spacing:0.5px;box-shadow:0 4px 10px rgba(0,0,0,0.6);pointer-events:none;}',
            '.sgl-inst-badge{border-color:rgba(74,222,128,0.65);color:#4ADE80;}',
            '.mv-pick-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);cursor:pointer;transition:0.15s;}',
            '.mv-pick-row:hover{background:rgba(255,215,0,0.14);border-color:#FFD700;}'
        ].join('\n');
        document.head.appendChild(st);
    }

    function collectRunnableBuilds(game) {
        const builds = new Array();
        if (game.path) {
            builds.push({
                id: 'primary',
                label: 'Основная версия',
                path: game.path,
                args: game.args || '',
                isDefault: !((game.variants || []).some(v => v.isDefault))
            });
        }
        (game.variants || []).forEach(v => {
            if (v && v.path) {
                builds.push({
                    id: v.id,
                    label: v.name || 'Доп. сборка',
                    path: v.path,
                    args: v.args || '',
                    isDefault: Boolean(v.isDefault)
                });
            }
        });
        return builds;
    }

    window.decorateVersionBadges = function() {
        injectMvStyles();
        const cards = document.querySelectorAll('.game-card');
        cards.forEach((card, idx) => {
            card.querySelector('.sgl-ver-badge')?.remove();
            const g = (typeof availableGames !== 'undefined') ? availableGames.at(idx) : null;
            if (!g) return;
            const box = card.querySelector('.cover-box');
            if (!box) return;
            const builds = collectRunnableBuilds(g);
            if (builds.length >= 2) {
                box.appendChild(mk('div', 'sgl-ver-badge', '', builds.length + ' VER'));
            } else if (builds.length === 0 && g.installer) {
                box.appendChild(mk('div', 'sgl-ver-badge sgl-inst-badge', '', 'SETUP'));
            }
        });
    };

    function launchSpecificVariant(game, variantId) {
        bypassVariantHook = true;
        const origFetch = window.fetch;
        window.fetch = function(input, init) {
            if (typeof input === 'string' && input.startsWith('/api/launch?id=')) {
                input = input + '&var=' + encodeURIComponent(variantId);
            }
            return origFetch.call(this, input, init);
        };
        try {
            window.triggerGameLaunch(game);
        } finally {
            setTimeout(() => {
                window.fetch = origFetch;
                bypassVariantHook = false;
            }, 1200);
        }
    }

    function openBuildSelectorDialog(game, builds) {
        document.getElementById('sgl-mv-picker')?.remove();
        const bg = mk('div', 'modal-backdrop active', 'z-index:9890;');
        bg.id = 'sgl-mv-picker';
        bg.onclick = (e) => { if (e.target === bg) bg.remove(); };

        const box = mk('div', 'modal-box', 'width:460px;max-width:94vw;');
        box.append(
            mk('div', 'modal-title', 'margin-bottom:4px;', 'Выберите версию для запуска'),
            mk('div', '', 'font-size:12px;color:#FFD700;font-weight:700;text-align:center;margin-bottom:12px;', game.name)
        );

        const list = mk('div', 'mods-list', 'display:flex;flex-direction:column;gap:7px;max-height:310px;');
        builds.forEach(b => {
            const row = mk('div', 'mv-pick-row', '');
            const info = mk('div', '', 'flex:1;min-width:0;');
            const fname = String(b.path || '').split(/[\\/]/).pop();
            info.append(
                mk('div', '', 'font-size:13px;font-weight:800;color:#fff;', b.label),
                mk('div', '', 'font-size:11px;opacity:0.62;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;', fname + (b.args ? ' • ' + b.args : ''))
            );
            const runTag = mk('span', 'btn-small btn-accent', '', '▶ Играть');
            row.append(info, runTag);
            row.onclick = () => {
                bg.remove();
                launchSpecificVariant(game, b.id);
            };
            list.appendChild(row);
        });

        const acts = mk('div', 'modal-actions', 'margin-top:12px;display:flex;gap:8px;');
        const cfgBtn = mk('button', 'btn-reset', 'flex:1;', 'Настроить сборки...');
        cfgBtn.type = 'button';
        cfgBtn.onclick = () => { bg.remove(); window.openGameVariantsModal(game.id); };
        const closeBtn = mk('button', 'close-modal-btn', 'margin-top:0;flex:1;', 'Отмена');
        closeBtn.type = 'button';
        closeBtn.onclick = () => bg.remove();
        acts.append(cfgBtn, closeBtn);

        box.append(list, acts);
        bg.appendChild(box);
        document.body.appendChild(bg);
        if (typeof playSfx === 'function') playSfx('open_menu');
    }

    async function triggerLocalInstaller(gameId, onDone) {
        if (typeof showToast === 'function') showToast('Запуск установщика / распаковка архива...');
        const r = await fetch('/api/variants/run_installer', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId })
        });
        const d = await r.json();
        if (d.ok) {
            if (typeof playSfx === 'function') playSfx('launch');
            if (d.mode === 'extracted') {
                await loadGames(false);
                if (typeof showToast === 'function') showToast(d.exe ? 'Архив распакован и .exe подключён!' : 'Архив распакован в выбранную папку!');
            } else {
                if (typeof showToast === 'function') showToast('Установщик запущен!');
            }
            if (onDone) onDone();
        } else if (!d.cancelled && typeof showToast === 'function') {
            showToast(d.error || 'Не удалось запустить установщик', true);
        }
    }

    window.openGameVariantsModal = function(targetGameId) {
        const activeG = (typeof availableGames !== 'undefined') ? availableGames.at(selectedIndex) : null;
        const gid = targetGameId || (activeG ? activeG.id : '');
        const gObj = (typeof gamesData !== 'undefined' ? gamesData.find(x => x.id === gid) : null) || activeG;
        if (!gid || !gObj) return;

        document.getElementById('sgl-mv-modal')?.remove();
        let localVars = JSON.parse(JSON.stringify(gObj.variants || []));
        let localInst = gObj.installer || '';

        const bg = mk('div', 'modal-backdrop active', 'z-index:9885;');
        bg.id = 'sgl-mv-modal';
        bg.onclick = (e) => { if (e.target === bg) bg.remove(); };

        const box = mk('div', 'modal-box wide-box', 'max-width:580px;');
        box.append(
            mk('div', 'modal-title', 'margin-bottom:4px;', 'Версии игры и локальный инсталлятор'),
            mk('div', '', 'font-size:12px;color:#FFD700;font-weight:700;text-align:center;margin-bottom:12px;', gObj.name)
        );

        // Секция 1: Дополнительные сборки / версии
        const sec1 = mk('div', 'char-card-cfg', '');
        const s1Hdr = mk('div', 'char-cfg-header', '');
        s1Hdr.appendChild(mk('span', '', 'color:#93C5FD;', 'Дополнительные сборки (.exe) на этой карточке'));
        const addVarBtn = mk('button', 'btn-small btn-accent', '', '+ Добавить сборку');
        addVarBtn.type = 'button';
        s1Hdr.appendChild(addVarBtn);

        const varsListEl = mk('div', '', 'display:flex;flex-direction:column;gap:7px;max-height:220px;overflow-y:auto;');

        async function saveAll() {
            gObj.variants = localVars;
            gObj.installer = localInst;
            await fetch('/api/variants/save', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: gid, variants: localVars, installer: localInst })
            });
            await loadGames(false);
        }

        function renderVarsList() {
            varsListEl.innerHTML = '';
            const mainName = gObj.path ? gObj.path.split(/[\\/]/).pop() : 'Не выбран в «Игры и пути»';
            varsListEl.appendChild(mk('div', '', 'font-size:11px;padding:6px 8px;border-radius:7px;background:rgba(0,0,0,0.28);opacity:0.82;', 'Основной .exe: ' + mainName));

            if (localVars.length === 0) {
                varsListEl.appendChild(mk('div', '', 'font-size:11.5px;opacity:0.55;text-align:center;padding:8px;', 'Дополнительных версий пока нет (при запуске стартует основной .exe)'));
                return;
            }

            localVars.forEach((v, idx) => {
                const card = mk('div', '', 'background:rgba(0,0,0,0.28);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px;display:flex;flex-direction:column;gap:5px;');
                const r1 = mk('div', '', 'display:flex;gap:6px;align-items:center;');
                const nInp = mk('input', 'args-input', 'flex:1;margin-top:0;user-select:text !important;', '');
                nInp.type = 'text'; nInp.placeholder = 'Название (напр. Decomp / Modded)'; nInp.value = v.name || '';
                nInp.onchange = () => { v.name = nInp.value.trim(); saveAll(); };

                const defLbl = mk('label', '', 'display:flex;align-items:center;gap:4px;font-size:10.5px;white-space:nowrap;cursor:pointer;', '');
                const defChk = document.createElement('input');
                defChk.type = 'checkbox'; defChk.checked = Boolean(v.isDefault);
                defChk.onchange = () => {
                    localVars.forEach((o, j) => { o.isDefault = (j === idx ? defChk.checked : false); });
                    saveAll();
                    renderVarsList();
                };
                defLbl.append(defChk, mk('span', '', '', 'Автостарт'));

                const delB = mk('button', 'btn-small btn-clear', 'padding:4px 8px;', '×');
                delB.type = 'button';
                delB.onclick = () => { localVars.splice(idx, 1); saveAll(); renderVarsList(); };
                r1.append(nInp, defLbl, delB);

                const r2 = mk('div', '', 'display:grid;grid-template-columns:1.2fr 1fr auto;gap:6px;align-items:center;');
                const pLbl = mk('div', '', 'font-size:11px;color:#4ADE80;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;', v.path ? v.path.split('/').pop() : '');
                pLbl.title = v.path || '';
                const aInp = mk('input', 'args-input', 'margin-top:0;user-select:text !important;', '');
                aInp.type = 'text'; aInp.placeholder = 'Аргументы (-windowed)'; aInp.value = v.args || '';
                aInp.onchange = () => { v.args = aInp.value; saveAll(); };
                const pickB = mk('button', 'btn-small', '', 'Обзор');
                pickB.type = 'button';
                pickB.onclick = async () => {
                    const res = await (await fetch('/api/variants/browse_file', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'exe' }) })).json();
                    if (res.ok && res.path) { v.path = res.path; saveAll(); renderVarsList(); }
                };
                r2.append(pLbl, aInp, pickB);
                card.append(r1, r2);
                varsListEl.appendChild(card);
            });
        }

        addVarBtn.onclick = async () => {
            const res = await (await fetch('/api/variants/browse_file', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'exe' }) })).json();
            if (!res.ok || !res.path) return;
            const defTitle = res.path.split('/').pop().replace(/\.exe$/i, '');
            localVars.push({ id: 'var_' + Date.now(), name: defTitle, path: res.path, args: '', isDefault: false });
            await saveAll();
            renderVarsList();
        };

        sec1.append(s1Hdr, varsListEl);

        // Секция 2: Локальный установщик или архив сборки
        const sec2 = mk('div', 'char-card-cfg', 'margin-bottom:0;');
        sec2.appendChild(mk('div', 'char-cfg-header', 'color:#4ADE80;', 'Локальный инсталлятор / Портативный архив (.exe, .msi, .zip, .7z)'));
        const instLbl = mk('div', '', 'font-size:11px;opacity:0.8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;', '');
        const updateInstLabel = () => {
            instLbl.textContent = localInst ? ('Файл: ' + localInst.split('/').pop()) : 'Инсталлятор не привязан';
            instLbl.style.color = localInst ? '#4ADE80' : 'rgba(255,255,255,0.5)';
        };
        updateInstLabel();

        const instBtns = mk('div', '', 'display:flex;gap:6px;flex-wrap:wrap;');
        const bPickInst = mk('button', 'btn-small', '', 'Выбрать дистрибутив / архив...');
        bPickInst.type = 'button';
        bPickInst.onclick = async () => {
            const res = await (await fetch('/api/variants/browse_file', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'installer' }) })).json();
            if (res.ok && res.path) { localInst = res.path; updateInstLabel(); await saveAll(); }
        };
        const bRunInst = mk('button', 'btn-small btn-accent', '', 'Установить / Распаковать сборку');
        bRunInst.type = 'button';
        bRunInst.onclick = () => {
            if (!localInst) { if (typeof showToast === 'function') showToast('Сначала выберите файл установщика или архива!', true); return; }
            triggerLocalInstaller(gid, () => bg.remove());
        };
        const bClrInst = mk('button', 'btn-small btn-clear', '', 'Отвязать');
        bClrInst.type = 'button';
        bClrInst.onclick = async () => { localInst = ''; updateInstLabel(); await saveAll(); };
        instBtns.append(bPickInst, bRunInst, bClrInst);
        sec2.append(instLbl, instBtns);

        const closeBtn = mk('button', 'close-modal-btn', '', 'Готово');
        closeBtn.type = 'button';
        closeBtn.onclick = () => bg.remove();

        box.append(sec1, sec2, closeBtn);
        bg.appendChild(box);
        document.body.appendChild(bg);
        renderVarsList();
        if (typeof playSfx === 'function') playSfx('open_menu');
    };

    const _bootMv = () => {
        injectMvStyles();

        // Перехватываем запуск игры: если есть несколько сборок (и не задан автостарт) — спрашиваем, какую запустить; если нет .exe, но есть инсталлятор — запускаем установку!
        const prevLaunch = window.triggerGameLaunch;
        if (typeof prevLaunch === 'function' && !window._mvLaunchHooked) {
            window._mvLaunchHooked = true;
            window.triggerGameLaunch = function(game) {
                if (!game || bypassVariantHook) return prevLaunch.apply(this, arguments);
                const builds = collectRunnableBuilds(game);
                if (builds.length === 0 && game.installer) {
                    triggerLocalInstaller(game.id);
                    return;
                }
                if (builds.length === 1 && builds[0].id !== 'primary') {
                    return launchSpecificVariant(game, builds[0].id);
                }
                if (builds.length >= 2) {
                    const explicitDef = (game.variants || []).find(v => v.isDefault && v.path);
                    if (explicitDef) return launchSpecificVariant(game, explicitDef.id);
                    return openBuildSelectorDialog(game, builds);
                }
                return prevLaunch.apply(this, arguments);
            };
        }

        // Добавляем кнопку "Версии" в каждую строку окна "Игры и пути"
        const origSettings = window.openSettings;
        if (typeof origSettings === 'function' && !window._mvSettingsHooked) {
            window._mvSettingsHooked = true;
            window.openSettings = async function() {
                const r = await origSettings.apply(this, arguments);
                document.querySelectorAll('#settings-list .setting-row').forEach(row => {
                    const fileDiv = row.querySelector('.setting-file[id^="file-"]');
                    if (!fileDiv || row.querySelector('.sgl-mv-btn')) return;
                    const gid = fileDiv.id.slice(5);
                    const b = mk('button', 'btn-small sgl-mv-btn', 'background:rgba(59,130,246,0.28);color:#93C5FD;', 'Версии');
                    b.type = 'button';
                    b.title = 'Дополнительные сборки (.exe) и инсталлятор';
                    b.onclick = () => window.openGameVariantsModal(gid);
                    fileDiv.after(b);
                });
                return r;
            };
        }

        const origRender = window.renderMainScreen;
        if (typeof origRender === 'function' && !window._mvRenderHooked) {
            window._mvRenderHooked = true;
            window.renderMainScreen = function() {
                const r = origRender.apply(this, arguments);
                window.decorateVersionBadges();
                return r;
            };
        }
        setTimeout(window.decorateVersionBadges, 450);
    };

    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', _bootMv);
    else _bootMv();
})();
