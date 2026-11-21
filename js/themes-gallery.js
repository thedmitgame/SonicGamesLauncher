/* === VISUAL PACK B: BUILT-IN THEME GALLERY & LOCAL THEMES MANAGER === */
(function() {
    function buildGradients(c1, c2) {
        return {
            default: new Array(c1, c2),
            sonic1: new Array(c1, c2),
            sonic2: new Array(c1, c2),
            soniccd: new Array(c1, c2),
            sonic3: new Array(c1, c2),
            origins: new Array(c1, c2),
            mania: new Array(c1, c2),
            srb2: new Array(c1, c2)
        };
    }

    const BUILTIN_THEMES = new Array(
        {
            id: 'mania_pop',
            name: 'Поп-Арт Комикс',
            sub: 'Светлый Поп-Арт • Комикс',
            previewBg: 'linear-gradient(135deg, #FDE047 0%, #FB7185 55%, #38BDF8 100%)',
            previewText: '#111827',
            patch: {
                lightUi: true,
                cardStyle: 'retro',
                carouselMode: 'arc',
                shaderType: 'mania_geo', launchAnim: 'titlecard', clickFx: 'stars',
                screenFx: 'halftone',
                screenFxOpacity: 60,
                cardRadius: 8,
                textColor: '#111827',
                titleColor: '#DC2626',
                panelAlpha: 82,
                gradients: {
                    default: new Array('#FEF08A', '#FDBA74'),
                    sonic1: new Array('#BAE6FD', '#FDE047'),
                    sonic2: new Array('#FDE047', '#FB923C'),
                    soniccd: new Array('#FBCFE8', '#C4B5FD'),
                    sonic3: new Array('#FED7AA', '#FCA5A5'),
                    origins: new Array('#FEF08A', '#A7F3D0'),
                    mania: new Array('#FDE047', '#FB7185'),
                    srb2: new Array('#DDD6FE', '#93C5FD')
                }
            }
        },
        {
            id: 'dreamcast_y2k',
            name: 'Светлый Лёд Y2K',
            sub: 'Матовое стекло • Глянец',
            previewBg: 'linear-gradient(135deg, #E0F2FE 0%, #FFFFFF 50%, #FFEDD5 100%)',
            previewText: '#0F172A',
            patch: {
                lightUi: true,
                cardStyle: 'glass',
                carouselMode: 'coverflow',
                shaderType: 'speedlines',
                screenFx: 'none',
                screenFxOpacity: 25,
                cardRadius: 18,
                textColor: '#0F172A',
                titleColor: '#EA580C',
                panelAlpha: 75,
                gradients: buildGradients('#E2E8F0', '#BAE6FD')
            }
        },
        {
            id: 'megadrive_crt',
            name: 'Ретро ЭЛТ 90-х',
            sub: 'Ретро Сетка • Сканлайны',
            previewBg: 'linear-gradient(135deg, #09090B 0%, #1E1B4B 60%, #7F1D1D 100%)',
            previewText: '#FACC15',
            patch: {
                lightUi: false,
                cardStyle: 'retro',
                carouselMode: 'row',
                shaderType: 'checker', launchAnim: 'crtoff', clickFx: 'rings',
                screenFx: 'crt',
                screenFxOpacity: 65,
                cardRadius: 4,
                textColor: '#F8FAFC',
                titleColor: '#FACC15',
                panelAlpha: 72,
                gradients: buildGradients('#09090B', '#172554')
            }
        },
        {
            id: 'frontiers_cyber',
            name: 'Кибер-Матрица',
            sub: 'Киберпространство • Глитч',
            previewBg: 'linear-gradient(135deg, #020617 0%, #0F3443 60%, #06B6D4 100%)',
            previewText: '#67E8F9',
            patch: {
                lightUi: false,
                cardStyle: 'neon',
                carouselMode: 'coverflow',
                shaderType: 'cyber_glitch', launchAnim: 'warpring', clickFx: 'cyber',
                screenFx: 'cybergrid',
                screenFxOpacity: 55,
                cardRadius: 12,
                textColor: '#ECFEFF',
                titleColor: '#22D3EE',
                panelAlpha: 55,
                gradients: buildGradients('#020617', '#083344')
            }
        },
        {
            id: 'shadow_chaos',
            name: 'Тёмный Рубин',
            sub: 'Чёрно-Алый • Тёмные искры',
            previewBg: 'linear-gradient(135deg, #090507 0%, #450A0A 65%, #DC2626 100%)',
            previewText: '#FCA5A5',
            patch: {
                lightUi: false,
                cardStyle: 'sega',
                carouselMode: 'coverflow',
                shaderType: 'sparks', launchAnim: 'warpring', clickFx: 'emeralds',
                screenFx: 'vignette',
                screenFxOpacity: 65,
                cardRadius: 10,
                textColor: '#FEF2F2',
                titleColor: '#EF4444',
                panelAlpha: 68,
                gradients: buildGradients('#070406', '#450A0A')
            }
        },
        {
            id: 'casino_synth',
            name: 'Неоновый Синтвейв',
            sub: 'Неоновый Аркадный Зал',
            previewBg: 'linear-gradient(135deg, #1E1B4B 0%, #701A75 55%, #F59E0B 100%)',
            previewText: '#FDE047',
            patch: {
                lightUi: false,
                cardStyle: 'neon',
                carouselMode: 'arc',
                shaderType: 'synthwave',
                screenFx: 'crt',
                screenFxOpacity: 35,
                cardRadius: 16,
                textColor: '#FAF5FF',
                titleColor: '#FDE047',
                panelAlpha: 50,
                gradients: buildGradients('#1E1B4B', '#581C87')
            }
        }
    );

    function injectGalleryStyles() {
        if (document.getElementById('sgl-themes-gallery-css')) return;
        const st = document.createElement('style');
        st.id = 'sgl-themes-gallery-css';
        const cssRules = new Array(
            'body.sgl-light-ui .settings-btn, body.sgl-light-ui #sgl-jukebox, body.sgl-light-ui #sgl-cat-bar{background:rgba(255,255,255,0.86) !important;color:#0F172A !important;border:2px solid rgba(15,23,42,0.82) !important;box-shadow:4px 4px 0 rgba(15,23,42,0.85) !important;}',
            'body.sgl-light-ui .settings-btn:hover{background:#FFD700 !important;color:#0F172A !important;}',
            'body.sgl-light-ui .jb-btn, body.sgl-light-ui #jb-title, body.sgl-light-ui .sgl-cat-pill{color:#0F172A !important;}',
            'body.sgl-light-ui .game-card{background:rgba(255,255,255,0.9) !important;border:2px solid #0F172A !important;box-shadow:7px 7px 0 rgba(15,23,42,0.88) !important;}',
            'body.sgl-light-ui .game-title, body.sgl-light-ui #sub-hint{color:#0F172A !important;text-shadow:none !important;}',
            'body.sgl-light-ui .game-tag, body.sgl-light-ui .playtime-badge{color:#334155 !important;background:rgba(15,23,42,0.08) !important;}',
            '.sgl-theme-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:6px;margin-bottom:12px;}',
            '.sgl-theme-tile{border-radius:10px;padding:10px;cursor:pointer;border:1px solid rgba(255,255,255,0.18);transition:transform 0.15s,box-shadow 0.15s;text-align:left;position:relative;overflow:hidden;}',
            '.sgl-theme-tile:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,0.45);border-color:#FFD700;}'
        );
        st.textContent = cssRules.join('\n');
        document.head.appendChild(st);
    }

function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    window.syncLightUiClass = function() {
        injectGalleryStyles();
        const isLight = Boolean(typeof currentDesign !== 'undefined' && currentDesign && currentDesign.lightUi);
        document.body.classList.toggle('sgl-light-ui', isLight);
    };

    function applyBuiltinTheme(preset) {
        if (!currentDesign) return;
        const nextGrad = JSON.parse(JSON.stringify(preset.patch.gradients));
        Object.assign(currentDesign, JSON.parse(JSON.stringify(preset.patch)));
        currentDesign.gradients = nextGrad;

        if (typeof playSfx === 'function') playSfx('launch');
        applyDesign(currentDesign);
        window.syncLightUiClass();
        if (typeof window.applyVisualFxPack === 'function') window.applyVisualFxPack();
        renderFloatingObjects();
        const activeG = availableGames.at(selectedIndex);
        setBackgroundTheme(activeG ? activeG.id : 'default', activeG ? activeG.bg : null, activeG ? activeG.video : null);
        openCustomModal();
        if (typeof showToast === 'function') showToast('Применена тема: ' + preset.name);
    }

    async function refreshSavedThemesList() {
        const box = document.getElementById('sgl-saved-themes-list');
        if (!box) return;
        try {
            const res = await fetch('/api/themes/list');
            const data = await res.json();
            const items = data.items || new Array();
            box.innerHTML = '';
            if (items.length === 0) {
                box.appendChild(mk('div', '', 'font-size:11px;opacity:0.55;padding:6px;text-align:center;', 'В папке themes/ пока нет сохранённых файлов (.json / .sonicpack)'));
                return;
            }
            items.forEach(it => {
                const row = mk('div', '', 'display:flex;align-items:center;gap:8px;padding:6px 10px;background:rgba(0,0,0,0.28);border-radius:8px;border:1px solid rgba(255,255,255,0.08);');
                const badge = mk('span', '', 'font-size:9px;font-weight:800;padding:2px 6px;border-radius:4px;background:rgba(255,215,0,0.18);color:#FFD700;', it.kind);
                const nameEl = mk('span', '', 'flex:1;font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;', it.file + ' (' + it.sizeKb + ' KB)');

                const btnApply = mk('button', 'btn-small btn-accent', '', 'Применить');
                btnApply.type = 'button';
                btnApply.onclick = async () => {
                    const r = await fetch('/api/themes/apply_local', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ file: it.file })
                    });
                    const d = await r.json();
                    if (d.ok) {
                        if (typeof playSfx === 'function') playSfx('launch');
                        if (d.isPack) await loadGames(false);
                        else if (d.design) {
                            currentDesign = d.design;
                            applyDesign(currentDesign);
                            renderFloatingObjects();
                        }
                        window.syncLightUiClass();
                        openCustomModal();
                        showToast('Загружена тема: ' + it.file);
                    } else {
                        showToast(d.error || 'Ошибка чтения темы', true);
                    }
                };

                const btnDel = mk('button', 'btn-small btn-clear', 'padding:3px 8px;', '×');
                btnDel.type = 'button';
                btnDel.title = 'Удалить файл темы';
                btnDel.onclick = async () => {
                    if (!(await askDialog('Удалить файл темы «' + it.file + '» из папки themes/?', null))) return;
                    await fetch('/api/themes/delete_local', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ file: it.file })
                    });
                    await refreshSavedThemesList();
                };

                row.append(badge, nameEl, btnApply, btnDel);
                box.appendChild(row);
            });
        } catch (_) {}
    }

    function injectGalleryPane() {
        injectGalleryStyles();
        if (document.getElementById('sgl-builtin-gallery-box')) {
            refreshSavedThemesList();
            return;
        }
        const firstPane = document.querySelector('#custom-modal .tab-pane');
        if (!firstPane) return;

        const wrap = mk('div', '', 'margin-bottom:12px;padding:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,215,0,0.22);border-radius:12px;');
        wrap.id = 'sgl-builtin-gallery-box';

        const hdr = mk('div', '', 'font-size:12px;font-weight:800;color:#FFD700;margin-bottom:4px;', 'Готовые стили оформления (в 1 клик)');
        const grid = mk('div', 'sgl-theme-grid', '');

        BUILTIN_THEMES.forEach(t => {
            const tile = mk('button', 'sgl-theme-tile', 'background:' + t.previewBg + ';color:' + t.previewText + ';');
            tile.type = 'button';
            tile.append(
                mk('div', '', 'font-size:12px;font-weight:900;margin-bottom:2px;', t.name),
                mk('div', '', 'font-size:10px;font-weight:700;opacity:0.85;', t.sub)
            );
            tile.onclick = () => applyBuiltinTheme(t);
            grid.appendChild(tile);
        });

        const savedHdr = mk('div', '', 'display:flex;justify-content:space-between;align-items:center;margin-top:6px;margin-bottom:6px;');
        savedHdr.append(
            mk('span', '', 'font-size:12px;font-weight:700;color:#93C5FD;', 'Ваши сохранённые темы (папка themes/)'),
            (() => {
                const b = mk('button', 'btn-small', '', 'Открыть папку тем');
                b.type = 'button';
                b.onclick = () => fetch('/api/themes/open_dir');
                return b;
            })()
        );

        const savedList = mk('div', '', 'display:flex;flex-direction:column;gap:5px;max-height:130px;overflow-y:auto;');
        savedList.id = 'sgl-saved-themes-list';

        wrap.append(hdr, grid, savedHdr, savedList);
        firstPane.prepend(wrap);
        refreshSavedThemesList();
    }

    const _boot = () => {
        injectGalleryStyles();
        const origApply = window.applyDesign;
        if (typeof origApply === 'function') {
            window.applyDesign = function() {
                const r = origApply.apply(this, arguments);
                window.syncLightUiClass();
                return r;
            };
        }
        const origOpen = window.openCustomModal;
        if (typeof origOpen === 'function') {
            window.openCustomModal = function() {
                const r = origOpen.apply(this, arguments);
                injectGalleryPane();
                return r;
            };
        }
        const origReset = window.resetDesign;
        if (typeof origReset === 'function') {
            window.resetDesign = function() {
                if (currentDesign) currentDesign.lightUi = false;
                const r = origReset.apply(this, arguments);
                window.syncLightUiClass();
                return r;
            };
        }
        setTimeout(window.syncLightUiClass, 350);
    };

    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', _boot);
    else _boot();
})();
