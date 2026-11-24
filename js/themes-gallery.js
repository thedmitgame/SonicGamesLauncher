(function() {
    function buildGradients(c1, c2) {
        return {
            default: Array.of(c1, c2), sonic1: Array.of(c1, c2), sonic2: Array.of(c1, c2),
            soniccd: Array.of(c1, c2), sonic3: Array.of(c1, c2), origins: Array.of(c1, c2),
            mania: Array.of(c1, c2), srb2: Array.of(c1, c2)
        };
    }
    const BUILTIN_THEMES = Array.of(
        { id: 'mania_pop', name: 'Поп-Арт Комикс', sub: 'Светлый • Растр', previewBg: 'linear-gradient(135deg,#fde047,#fb7185,#38bdf8)', previewText: '#111827',
          patch: { lightUi: true, cardStyle: 'retro', carouselMode: 'arc', bgShader: 'mania_geo', shaderType: 'mania_geo', screenFx: 'halftone', screenFxOpacity: 52, clickFx: 'stars', cardRadius: 8, textColor: '#111827', titleColor: '#dc2626', gradients: buildGradients('#fef08a', '#fb7185') } },
        { id: 'dreamcast_y2k', name: 'Светлый Лёд Y2K', sub: 'Глянец • Виньетка', previewBg: 'linear-gradient(135deg,#e0f2fe,#ffffff,#ffedd5)', previewText: '#0f172a',
          patch: { lightUi: true, cardStyle: 'glass', carouselMode: 'coverflow', bgShader: 'speedlines', shaderType: 'speedlines', screenFx: 'vignette', screenFxOpacity: 35, cardRadius: 18, textColor: '#0f172a', titleColor: '#ea580c', gradients: buildGradients('#e2e8f0', '#bae6fd') } },
        { id: 'megadrive_crt', name: 'Ретро ЭЛТ 90-х', sub: 'Шахматка • CRT', previewBg: 'linear-gradient(135deg,#09090b,#1e1b4b,#7f1d1d)', previewText: '#facc15',
          patch: { lightUi: false, cardStyle: 'retro', carouselMode: 'row', bgShader: 'checker', shaderType: 'checker', screenFx: 'crt', screenFxOpacity: 60, clickFx: 'rings', cardRadius: 4, textColor: '#f8fafc', titleColor: '#facc15', gradients: buildGradients('#09090b', '#172554') } },
        { id: 'frontiers_cyber', name: 'Кибер-Матрица', sub: 'Глитч • Сетка', previewBg: 'linear-gradient(135deg,#020617,#0f3443,#06b6d4)', previewText: '#67e8f9',
          patch: { lightUi: false, cardStyle: 'neon', carouselMode: 'coverflow', bgShader: 'cyber_glitch', shaderType: 'cyber_glitch', screenFx: 'cybergrid', screenFxOpacity: 55, clickFx: 'cyber', cardRadius: 12, textColor: '#ecfeff', titleColor: '#22d3ee', gradients: buildGradients('#020617', '#083344') } },
        { id: 'angel_island', name: 'Изумрудный Алтарь', sub: 'Искры • Виньетка', previewBg: 'linear-gradient(135deg,#064e3b,#10b981,#facc15)', previewText: '#fef08a',
          patch: { lightUi: false, cardStyle: 'glass', bgShader: 'sparks', shaderType: 'sparks', screenFx: 'vignette', screenFxOpacity: 42, clickFx: 'emeralds', textColor: '#ecfdf5', titleColor: '#fde047', gradients: buildGradients('#022c22', '#059669') } },
        { id: 'colony_ark', name: 'Станция Арк', sub: 'Варп • CRT', previewBg: 'linear-gradient(135deg,#09090b,#1e293b,#e11d48)', previewText: '#fda4af',
          patch: { lightUi: false, cardStyle: 'neon', bgShader: 'starfield', shaderType: 'starfield', screenFx: 'crt', screenFxOpacity: 38, textColor: '#f8fafc', titleColor: '#fb7185', gradients: buildGradients('#09090b', '#31102f') } },
        { id: 'emerald_coast_98', name: 'Пляж Изумрудного Берега', sub: 'Линии • Виньетка', previewBg: 'linear-gradient(135deg,#0284c7,#38bdf8,#e0f2fe)', previewText: '#0f172a',
          patch: { lightUi: true, cardStyle: 'console', bgShader: 'speedlines', shaderType: 'speedlines', screenFx: 'vignette', screenFxOpacity: 35, textColor: '#0f172a', titleColor: '#0369a1', gradients: buildGradients('#bae6fd', '#38bdf8') } },
        { id: 'chemical_plant', name: 'Химический Завод', sub: 'Геометрия • Сетка', previewBg: 'linear-gradient(135deg,#172554,#2563eb,#ec4899)', previewText: '#67e8f9',
          patch: { lightUi: false, cardStyle: 'sega', bgShader: 'mania_geo', shaderType: 'mania_geo', screenFx: 'cybergrid', screenFxOpacity: 45, textColor: '#f8fafc', titleColor: '#67e8f9', gradients: buildGradients('#172554', '#701a75') } },
        { id: 'casino_night', name: 'Казино Ночи', sub: 'Искры • Растр', previewBg: 'linear-gradient(135deg,#1e1b4b,#9d174d,#facc15)', previewText: '#fde047',
          patch: { lightUi: false, cardStyle: 'neon', bgShader: 'sparks', shaderType: 'sparks', screenFx: 'halftone', screenFxOpacity: 48, clickFx: 'stars', textColor: '#fdf2f8', titleColor: '#facc15', gradients: buildGradients('#1e1b4b', '#831843') } },
        { id: 'lava_reef', name: 'Зона Лавового Рифа', sub: 'Линии • Виньетка', previewBg: 'linear-gradient(135deg,#180905,#b91c1c,#f97316)', previewText: '#fed7aa',
          patch: { lightUi: false, cardStyle: 'sega', bgShader: 'speedlines', shaderType: 'speedlines', screenFx: 'vignette', screenFxOpacity: 62, clickFx: 'emeralds', textColor: '#fff7ed', titleColor: '#fb923c', gradients: buildGradients('#180905', '#7c2d12') } },
        { id: 'shadow_chaos', name: 'Тёмный Рубин', sub: 'Искры • Виньетка', previewBg: 'linear-gradient(135deg,#090507,#450a0a,#dc2626)', previewText: '#fca5a5',
          patch: { lightUi: false, cardStyle: 'sega', bgShader: 'sparks', shaderType: 'sparks', screenFx: 'vignette', screenFxOpacity: 58, clickFx: 'emeralds', textColor: '#fef2f2', titleColor: '#ef4444', gradients: buildGradients('#070406', '#450a0a') } },
        { id: 'casino_synth', name: 'Неоновый Синтвейв', sub: 'Сетка • CRT', previewBg: 'linear-gradient(135deg,#1e1b4b,#701a75,#f59e0b)', previewText: '#fde047',
          patch: { lightUi: false, cardStyle: 'neon', bgShader: 'synthwave', shaderType: 'synthwave', screenFx: 'crt', screenFxOpacity: 42, textColor: '#faf5ff', titleColor: '#fde047', gradients: buildGradients('#1e1b4b', '#581c87') } }
    );
    const BONUS_THEMES = Array.of(
        { id: 'bonus_super_gold', name: '★ Super Gold', sub: 'Золото • Искры', previewBg: 'linear-gradient(135deg,#451a03,#d97706,#facc15)', previewText: '#fffbeb',
          patch: { lightUi: false, cardStyle: 'super_gold', bgShader: 'sparks', shaderType: 'sparks', screenFx: 'vignette', screenFxOpacity: 44, clickFx: 'rings', textColor: '#fffbeb', titleColor: '#ffd700', gradients: buildGradients('#451a03', '#f59e0b') } },
        { id: 'bonus_chaos_emerald', name: '◆ Chaos Emerald', sub: 'Изумруд • Варп', previewBg: 'linear-gradient(135deg,#022c22,#059669,#34d399)', previewText: '#ecfdf5',
          patch: { lightUi: false, cardStyle: 'chaos_emerald', bgShader: 'starfield', shaderType: 'starfield', screenFx: 'cybergrid', screenFxOpacity: 46, clickFx: 'emeralds', textColor: '#ecfdf5', titleColor: '#4ade80', gradients: buildGradients('#022c22', '#10b981') } }
    );
    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag); if (cls) e.className = cls; if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt; return e;
    }
    window.syncLightUiClass = function() {
        document.body.classList.toggle('sgl-light-ui', Boolean(typeof currentDesign !== 'undefined' && currentDesign && currentDesign.lightUi));
    };
    window.syncBonusCardStyles = function() {
        const unlocked = Boolean(window._sglSaveSummary && window._sglSaveSummary.anyAllEmeralds);
        const bWrap = document.getElementById('sgl-bonus-styles-box');
        if (!bWrap) return;
        bWrap.innerHTML = ''; bWrap.style.display = unlocked ? 'block' : 'none';
        if (!unlocked) return;
        bWrap.appendChild(mk('div', '', 'font-size:11.5px;font-weight:800;color:#ffd700;margin-bottom:6px;', '★ Секретные стили (7 Изумрудов)'));
        const g = mk('div', '', 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;');
        BONUS_THEMES.forEach(t => {
            const b = mk('button', 'sgl-theme-tile', 'background:' + t.previewBg + ';color:' + t.previewText + ';');
            b.type = 'button'; b.append(mk('div', '', 'font-size:12px;font-weight:900;', t.name), mk('div', '', 'font-size:10px;', t.sub));
            b.onclick = () => applyBuiltinTheme(t); g.appendChild(b);
        }); bWrap.appendChild(g);
    };
    function applyBuiltinTheme(preset) {
        if (!currentDesign) return;
        const nextGrad = JSON.parse(JSON.stringify(preset.patch.gradients || {}));
        const sh = preset.patch.bgShader || preset.patch.shaderType || 'none';
        const fx = preset.patch.screenFx || 'none'; const op = preset.patch.screenFxOpacity ?? 45;
        Object.assign(currentDesign, JSON.parse(JSON.stringify(preset.patch)));
        currentDesign.gradients = nextGrad; currentDesign.shaderType = sh; currentDesign._baseShader = sh;
        currentDesign.screenFx = fx; currentDesign._baseScreenFx = fx; currentDesign.screenFxOpacity = op;
        if (typeof playSfx === 'function') playSfx('launch');
        if (typeof window.updateGlobalDesignSnap === 'function') window.updateGlobalDesignSnap();
        applyDesign(currentDesign); window.syncLightUiClass();
        if (typeof window.applyVisualFxPack === 'function') window.applyVisualFxPack();
        const shSel = document.getElementById('inp-shaderType'); if (shSel) shSel.value = sh;
        const fxSel = document.getElementById('inp-screenFx'); if (fxSel) fxSel.value = fx;
        const fxRng = document.getElementById('inp-screenFxOpacity'); if (fxRng) fxRng.value = String(op);
        const fxVal = document.getElementById('val-screenFxOpacity'); if (fxVal) fxVal.textContent = String(op);
        if (typeof showToast === 'function') showToast('Применена тема: ' + preset.name);
    }
    function injectGalleryPane() {
        const firstPane = document.querySelector('#custom-modal .tab-pane');
        if (!firstPane || document.getElementById('sgl-builtin-gallery-box')) return;
        const st = mk('style', '', '');
        st.textContent = '.sgl-theme-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:6px 0 10px;}.sgl-theme-tile{border-radius:10px;padding:9px;cursor:pointer;border:1px solid rgba(255,255,255,0.18);text-align:left;}';
        document.head.appendChild(st);
        const wrap = mk('div', '', 'margin-bottom:12px;padding:12px;background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.1);border-radius:12px;');
        wrap.id = 'sgl-builtin-gallery-box';
        wrap.appendChild(mk('div', '', 'font-size:12px;font-weight:800;color:#ffd700;margin-bottom:6px;', 'Готовые стили оформления (в 1 клик)'));
        const grid = mk('div', 'sgl-theme-grid', '');
        BUILTIN_THEMES.forEach(t => {
            const tile = mk('button', 'sgl-theme-tile', 'background:' + t.previewBg + ';color:' + t.previewText + ';');
            tile.type = 'button'; tile.append(mk('div', '', 'font-size:12px;font-weight:900;', t.name), mk('div', '', 'font-size:10px;opacity:0.88;', t.sub));
            tile.onclick = () => applyBuiltinTheme(t); grid.appendChild(tile);
        });
        const bBox = mk('div', '', 'display:none;'); bBox.id = 'sgl-bonus-styles-box';
        wrap.append(grid, bBox); firstPane.prepend(wrap); window.syncBonusCardStyles();
    }
    const origOpen = window.openCustomModal;
    if (typeof origOpen === 'function') { window.openCustomModal = function() { const r = origOpen.apply(this, arguments); injectGalleryPane(); return r; }; }
    const origReset = window.resetDesign;
    if (typeof origReset === 'function') { window.resetDesign = function() { if (currentDesign) { currentDesign.lightUi = false; currentDesign.screenFx = 'none'; currentDesign.shaderType = 'none'; currentDesign._baseShader = 'none'; currentDesign.cardStyle = 'glass'; } const r = origReset.apply(this, arguments); window.syncLightUiClass(); if (typeof window.applyVisualFxPack === 'function') window.applyVisualFxPack(); return r; }; }
})();
