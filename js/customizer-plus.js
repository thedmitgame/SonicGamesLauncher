/* === STUDIO THEME PRESETS & PER-GAME SHADERS === */
(function() {
    const PRESETS = {
        sega_blue: {
            label: "Спорт-Динамика",
            bg: ["#041436", "#0066ff"],
            patch: {
                screenLayout: "classic", cardStyle: "sega", shaderType: "speedlines",
                carouselMode: "coverflow", titleColor: "#FFD700", textColor: "#ffffff",
                cardRadius: 6, panelAlpha: 58, carouselRadiusY: 36
            }
        },
        mania_encore: {
            label: "Аркадное Ретро",
            bg: ["#2e1005", "#f59e0b"],
            patch: {
                screenLayout: "arcade_bottom", cardStyle: "retro", shaderType: "checker",
                carouselMode: "arc", titleColor: "#FDE047", textColor: "#FFFBEB",
                cardRadius: 0, panelAlpha: 72
            }
        },
        cyber_neon: {
            label: "Cyber Synthwave",
            bg: ["#16072e", "#db2777"],
            patch: {
                screenLayout: "top_bar", cardStyle: "neon", shaderType: "synthwave",
                carouselMode: "coverflow", titleColor: "#F472B6", textColor: "#F8FAFC",
                cardRadius: 18, panelAlpha: 45, carouselRadiusY: 55
            }
        },
        angel_island: { label: 'Angel Island', bg: Array.of('#042f24', '#10b981'), patch: { screenLayout: 'classic', cardStyle: 'glass', shaderType: 'sparks', screenFx: 'vignette', screenFxOpacity: 42, titleColor: '#FDE047', textColor: '#ECFDF5' } },
        colony_ark: { label: 'Space Colony ARK', bg: Array.of('#09090b', '#e11d48'), patch: { screenLayout: 'console_left', cardStyle: 'neon', shaderType: 'starfield', screenFx: 'crt', screenFxOpacity: 35, titleColor: '#FDA4AF', textColor: '#F8FAFC' } },
        emerald_coast: { label: 'Emerald Coast 98', bg: Array.of('#0369a1', '#38bdf8'), patch: { screenLayout: 'arcade_bottom', cardStyle: 'console', shaderType: 'synthwave', screenFx: 'none', titleColor: '#FEF08A', textColor: '#FFFFFF' } },
        chemical_plant: { label: 'Chemical Plant', bg: Array.of('#172554', '#ec4899'), patch: { screenLayout: 'top_bar', cardStyle: 'sega', shaderType: 'mania_geo', screenFx: 'crt', screenFxOpacity: 38, titleColor: '#67E8F9', textColor: '#FFFFFF' } },
        super_gold_plus: { label: 'Super Gold+', bg: Array.of('#451a03', '#facc15'), patch: { cardStyle: 'super_gold', shaderType: 'sparks', screenFx: 'vignette', screenFxOpacity: 32, titleColor: '#FEF08A', textColor: '#FFFBEB' } },
        chaos_emerald_plus: { label: 'Chaos Emerald+', bg: Array.of('#022c22', '#34d399'), patch: { cardStyle: 'chaos_emerald', shaderType: 'starfield', screenFx: 'vignette', screenFxOpacity: 35, titleColor: '#6EE7B7', textColor: '#ECFDF5' } },
        dreamcast_clean: {
            label: "Console Clean",
            bg: ["#081b2e", "#0284c7"],
            patch: {
                screenLayout: "console_left", cardStyle: "console", shaderType: "sparks",
                carouselMode: "row", titleColor: "#38BDF8", textColor: "#F1F5F9",
                cardRadius: 10, panelAlpha: 75
            }
        }
    };

    window.applyQuickStudioPreset = function(key) {
        const pr = PRESETS[key];
        if (!pr || typeof currentDesign === 'undefined' || !currentDesign) return;

        Object.assign(currentDesign, pr.patch);
        currentDesign._baseShader = pr.patch.shaderType;

        if (typeof onSelectPresetLayout === 'function') {
            onSelectPresetLayout(pr.patch.screenLayout);
        }
        if (!currentDesign.gradients) currentDesign.gradients = {};
        currentDesign.gradients.default = pr.bg.slice();
        const activeG = (typeof availableGames !== 'undefined' && availableGames.length > 0) ? availableGames.at(selectedIndex) : null;
        if (activeG) currentDesign.gradients[activeG.id] = pr.bg.slice();

        applyDesign(currentDesign);
        setBackgroundTheme(activeG ? activeG.id : 'default', null, null);
        openCustomModal();
        playSfx('launch');
        if (typeof showToast === 'function') showToast(`Применён стиль: ${pr.label}`);
    };

    window.openExternalThemeStudio = async function() {
        const r = await fetch('/api/open_studio');
        const d = await r.json();
        if (!d.ok && typeof showToast === 'function') showToast(d.error || 'ThemeStudio.html не найден', true);
    };

    window.setPerGameShader = function(gameId, val) {
        if (typeof currentDesign === 'undefined' || !currentDesign) return;
        if (!currentDesign.gameShaders) currentDesign.gameShaders = {};
        if (!val || val === 'default') delete currentDesign.gameShaders[gameId];
        else currentDesign.gameShaders[gameId] = val;
        syncActiveGameShader();
    };

    function syncActiveGameShader() {
        if (typeof currentDesign === 'undefined' || !currentDesign) return;
        if (currentDesign._baseShader === undefined || (currentDesign.shaderType && currentDesign.shaderType !== 'none' && currentDesign._baseShader === 'none')) {
            currentDesign._baseShader = currentDesign.shaderType || 'none';
        }
        const g = (typeof availableGames !== 'undefined') ? availableGames.at(selectedIndex) : null;
        const map = currentDesign.gameShaders || {};
        currentDesign.shaderType = (g && map[g.id]) ? map[g.id] : (currentDesign._baseShader || 'none');
    }

    const origSelect = window.selectGame;
    if (typeof origSelect === 'function') {
        window.selectGame = function() {
            origSelect.apply(this, arguments);
            syncActiveGameShader();
        };
    }

    const origPreview = window.previewDesign;
    if (typeof origPreview === 'function') {
        window.previewDesign = function() {
            origPreview.apply(this, arguments);
            if (currentDesign) {
                currentDesign._baseShader = document.getElementById('inp-shaderType')?.value || 'none';
                syncActiveGameShader();
            }
        };
    }

    function injectStudioControls() {
        const modal = document.getElementById('custom-modal');
        if (!modal) return;

        /* Инструменты HUD и Theme Studio перенесены во вкладку «Студия и HUD» */

        const mediaList = document.getElementById('media-settings-list');
        if (mediaList && gamesData) {
            let shBox = document.getElementById('sgl-pergame-shaders');
            if (shBox) shBox.remove();
            shBox = document.createElement('div');
            shBox.id = 'sgl-pergame-shaders';
            shBox.className = 'char-card-cfg';
            const map = currentDesign?.gameShaders || {};
            const rows = gamesData.map(g => {
                const cur = map[g.id] || 'default';
                return `<div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px;padding:3px 0;">
                    <span>${g.name}</span>
                    <select class="custom-select" style="padding:4px 8px;width:165px;" onchange="setPerGameShader('${g.id}', this.value)">
                        <option value="default" ${cur === 'default' ? 'selected' : ''}>Общий (по теме)</option>
                        <option value="none" ${cur === 'none' ? 'selected' : ''}>Без шейдера</option>
                        <option value="synthwave" ${cur === 'synthwave' ? 'selected' : ''}>Synthwave Grid</option>
                        <option value="speedlines" ${cur === 'speedlines' ? 'selected' : ''}>Speed Lines</option>
                        <option value="checker" ${cur === 'checker' ? 'selected' : ''}>Retro Checker</option>
                        <option value="sparks" ${cur === 'sparks' ? 'selected' : ''}>Golden Sparks</option>
                    </select>
                </div>`;
            }).join('');
            shBox.innerHTML = `<div class="char-cfg-header"><span style="color:#FFD700;">Индивидуальный шейдер для каждой игры</span></div>${rows}`;
            mediaList.prepend(shBox);
        if (mediaList && gamesData) {
            const gameCards = Array.from(mediaList.querySelectorAll('.char-card-cfg')).filter(c => c.id !== 'sgl-pergame-shaders');
            gameCards.forEach((card, idx) => {
                const g = gamesData.at(idx);
                const hdr = card.querySelector('.char-cfg-header');
                if (g && hdr && !hdr.querySelector('.sgl-art-btn')) {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'btn-small btn-accent sgl-art-btn';
                    btn.textContent = 'SteamGridDB';
                    btn.onclick = () => openArtFinderModal(g.id, g.id === 'sonic1' ? 'Sonic the Hedgehog Forever' : g.name);
                    hdr.appendChild(btn);
                }
            });
        }

        }
    }

    
    window.openArtFinderModal = function(gameId, gameName) {
        if (typeof playSfx === 'function') playSfx('open_menu');
        showToast('Открываем каталог SteamGridDB для «' + gameName + '»...');
        fetch('/api/sgdb/open?q=' + encodeURIComponent(gameName || 'Sonic'));
    };

    const origOpen = window.openCustomModal;
    if (typeof origOpen === 'function') {
        window.openCustomModal = function() {
            if (currentDesign && currentDesign._baseShader !== undefined) {
                currentDesign.shaderType = currentDesign._baseShader;
            }
            origOpen.apply(this, arguments);
            injectStudioControls();
            syncActiveGameShader();
        };
    }
})();
