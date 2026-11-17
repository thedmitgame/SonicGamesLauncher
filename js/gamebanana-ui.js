/* === GAMEBANANA ONLINE HUB & VERSION CHECKER === */
let localGameVer = "";
let gbCurrentPage = 1;
let gbLastHubUrl = "";

function compareVerStr(localV, reqV) {
    if (!reqV) return "ok";
    if (!localV) return "unknown";
    const parse = (s) => (String(s).match(/\d+/g) || []).slice(0, 4).map(Number);
    const a = parse(localV), b = parse(reqV);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const va = a.at(i) || 0, vb = b.at(i) || 0;
        if (va > vb) return "ok";
        if (va < vb) return "outdated";
    }
    return "ok";
}

(function() {
    const origRefresh = window.refreshModsList;
    if (typeof origRefresh === 'function') {
        window.refreshModsList = async function() {
            await origRefresh.apply(this, arguments);
            localGameVer = window._lastLocalGameVer || "";
            decorateInstalledVerBadges();
            ensureGbTabsInModsModal();
        };
    }
})();

function decorateInstalledVerBadges() {
    const g = availableGames.at(selectedIndex);
    if (!g || !Array.isArray(currentModsCache)) return;
    const rows = document.querySelectorAll('#mods-list-container .mod-item');
    rows.forEach((row, i) => {
        const mod = currentModsCache.at(i);
        if (!mod || !mod.gameVersion || row.querySelector('.ver-compat-tag')) return;
        const st = compareVerStr(localGameVer, mod.gameVersion);
        const tag = document.createElement('span');
        tag.className = 'ver-compat-tag';
        if (st === 'outdated') {
            tag.style.cssText = 'font-size:10px;background:rgba(239,68,68,0.22);color:#fca5a5;border:1px solid rgba(239,68,68,0.45);padding:1px 6px;border-radius:6px;margin-left:6px;';
            tag.textContent = `Требует игру v${mod.gameVersion}`;
        } else {
            tag.style.cssText = 'font-size:10px;background:rgba(34,197,94,0.18);color:#86efac;padding:1px 6px;border-radius:6px;margin-left:6px;';
            tag.textContent = `Совместим (${mod.gameVersion}+)`;
        }
        row.querySelector('.mod-title')?.appendChild(tag);
    });
}

function ensureGbTabsInModsModal() {
    const modalBox = document.querySelector('#mods-modal .modal-box');
    const listContainer = document.getElementById('mods-list-container');
    if (!modalBox || !listContainer) return;

    if (!document.getElementById('sgl-gb-tabs')) {
        const tabs = document.createElement('div');
        tabs.id = 'sgl-gb-tabs';
        tabs.className = 'tabs-bar';
        tabs.style.marginBottom = '10px';
        tabs.innerHTML = `
            <button type="button" class="tab-btn active" id="tab-btn-local-mods" onclick="switchModsSourceTab('local')">Установленные</button>
            <button type="button" class="tab-btn" id="tab-btn-gb-mods" onclick="switchModsSourceTab('gb')">Каталог GameBanana</button>
        `;
        const titleEl = document.getElementById('mods-modal-title');
        if (titleEl) titleEl.after(tabs);

        const gbPane = document.createElement('div');
        gbPane.id = 'sgl-gb-pane';
        gbPane.style.display = 'none';
        gbPane.innerHTML = `
            <div style="display:flex;gap:6px;margin-bottom:10px;align-items:center;flex-wrap:wrap;">
                <input type="text" id="gb-search-inp" class="args-input" style="flex:1;min-width:160px;user-select:text !important;" placeholder="Поиск модов на GameBanana..." onkeydown="if(event.key==='Enter') loadGbCatalog(1)">
                <button type="button" class="btn-small btn-accent" onclick="loadGbCatalog(1)">Найти</button>
                <button type="button" class="btn-small" onclick="openGbHubInBrowser()" title="Открыть раздел игры в браузере">На сайте</button>
                <button type="button" class="btn-small" onclick="promptCustomGbId()" title="Задать ID игры на GameBanana">ID</button>
            </div>
            <div id="gb-ver-banner" style="font-size:11px;opacity:0.75;margin-bottom:8px;"></div>
            <div id="gb-results-list" class="mods-list" style="max-height:310px;"></div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
                <button type="button" class="btn-small" id="gb-prev-btn" onclick="loadGbCatalog(gbCurrentPage - 1)">← Назад</button>
                <span id="gb-page-lbl" style="font-size:11.5px;opacity:0.75;">Стр. 1</span>
                <button type="button" class="btn-small" id="gb-next-btn" onclick="loadGbCatalog(gbCurrentPage + 1)">Далее →</button>
            </div>
        `;
        listContainer.after(gbPane);
    }
    switchModsSourceTab('local', true);
}

window.switchModsSourceTab = function(mode, silent = false) {
    if (!silent && typeof playSfx === 'function') playSfx('switch');
    const isGb = (mode === 'gb');
    document.getElementById('tab-btn-local-mods')?.classList.toggle('active', !isGb);
    document.getElementById('tab-btn-gb-mods')?.classList.toggle('active', isGb);

    const localEls = [
        document.querySelector('#mods-modal .mods-toolbar'),
        document.querySelector('#mods-modal .presets-bar'),
        document.getElementById('mods-list-container')
    ];
    localEls.forEach(el => { if (el) el.style.display = isGb ? 'none' : ''; });

    const gbPane = document.getElementById('sgl-gb-pane');
    if (gbPane) gbPane.style.display = isGb ? 'block' : 'none';
    if (isGb) loadGbCatalog(1);
};

window.loadGbCatalog = async function(page = 1) {
    const g = availableGames.at(selectedIndex);
    if (!g) return;
    gbCurrentPage = Math.max(1, page);
    const q = (document.getElementById('gb-search-inp')?.value || '').trim();
    const box = document.getElementById('gb-results-list');
    const verBanner = document.getElementById('gb-ver-banner');
    if (!box) return;

    box.textContent = 'Загрузка каталога GameBanana...';
    box.style.textAlign = 'center';
    document.getElementById('gb-page-lbl').innerText = `Стр. ${gbCurrentPage}`;
    document.getElementById('gb-prev-btn').disabled = (gbCurrentPage <= 1);

    const res = await fetch(`/api/gb/browse?id=${g.id}&q=${encodeURIComponent(q)}&page=${gbCurrentPage}`);
    const data = await res.json();

    if (!data.ok) {
        box.textContent = data.error || 'Ошибка загрузки';
        return;
    }

    gbLastHubUrl = data.hubUrl || '';
    localGameVer = data.localVer || '';
    if (verBanner) {
        verBanner.innerText = localGameVer
            ? `Установленная версия игры: v${localGameVer} (проверка совместимости активна)`
            : `Выберите мод, чтобы посмотреть скриншоты, описание и скачать архив`;
    }

    box.style.textAlign = 'left';
    if (!data.items || data.items.length === 0) {
        box.innerHTML = '<div style="text-align:center;opacity:0.65;padding:20px;">Ничего не найдено</div>';
        return;
    }

    box.innerHTML = '';
    data.items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'mod-item';
        row.style.cursor = 'pointer';
        const thumb = item.thumb ? `<img src="${item.thumb}" style="width:64px;height:44px;border-radius:6px;object-fit:cover;flex-shrink:0;border:1px solid rgba(255,255,255,0.15);" alt="">` : '';
        const verTag = item.version ? `<span style="font-size:10px;background:rgba(255,255,255,0.12);padding:1px 6px;border-radius:6px;margin-left:6px;color:#FFD700;">${item.version}</span>` : '';
        row.innerHTML = `
            ${thumb}
            <div class="mod-info" style="flex-grow:1;" onclick="openGbModDetails(${item.id})">
                <div class="mod-title" style="display:flex;align-items:center;flex-wrap:wrap;"><span>${item.name}</span>${verTag}</div>
                <div class="mod-author">${item.author} • +${item.likes} ${item.category ? '• ' + item.category : ''}</div>
            </div>
            <div style="display:flex;gap:5px;flex-shrink:0;">
                <button type="button" class="btn-small" onclick="openGbModDetails(${item.id})">Подробнее</button>
                <button type="button" class="btn-small btn-accent" onclick="startBrowserModDownload(${item.id}, '', '')">Скачать</button>
            </div>
        `;
        box.appendChild(row);
    });
};


(function() {
    if (document.getElementById('gb-side-style')) return;
    const st = document.createElement('style');
    st.id = 'gb-side-style';
    st.textContent = [
        "#mods-modal.gb-split-view { gap: 14px; padding: 0 16px; }",
        "#mods-modal.gb-split-view > .modal-box { width: 480px; max-width: 47vw; flex-shrink: 0; }",
        "#gb-side-panel { display: none; width: 430px; max-width: 45vw; max-height: 84vh; background: rgba(16,22,36,0.96); border: 1px solid rgba(255,215,0,0.35); border-radius: 18px; padding: 18px; color: #fff; box-shadow: 0 20px 50px rgba(0,0,0,0.85); flex-direction: column; overflow: hidden; }",
        "#mods-modal.gb-split-view #gb-side-panel.open { display: flex; }",
        "#gb-side-body { overflow-y: auto; padding-right: 4px; display: flex; flex-direction: column; gap: 10px; }",
        "#gb-side-body::-webkit-scrollbar, .gb-shots-strip::-webkit-scrollbar, .gb-desc-box::-webkit-scrollbar { width: 6px; height: 6px; }",
        "#gb-side-body::-webkit-scrollbar-track, .gb-shots-strip::-webkit-scrollbar-track, .gb-desc-box::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 6px; }",
        "#gb-side-body::-webkit-scrollbar-thumb, .gb-shots-strip::-webkit-scrollbar-thumb, .gb-desc-box::-webkit-scrollbar-thumb { background: rgba(255,215,0,0.45); border-radius: 6px; }",
        ".gb-shots-strip { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; min-height: 136px; align-items: center; }",
        ".gb-shots-strip img { height: 126px; width: auto; border-radius: 8px; border: 1px solid rgba(255,255,255,0.18); cursor: pointer; flex-shrink: 0; object-fit: cover; }",
        ".gb-shots-strip img:hover { border-color: #FFD700; }",
        ".gb-desc-box { font-size: 12px; line-height: 1.55; white-space: pre-wrap; background: rgba(0,0,0,0.32); border: 1px solid rgba(255,255,255,0.08); padding: 10px 12px; border-radius: 10px; max-height: 185px; overflow-y: auto; user-select: text !important; }",
        ".mod-item.gb-active-item { border-color: #FFD700 !important; background: rgba(255,215,0,0.1) !important; }"
    ].join("\n");
    document.head.appendChild(st);
})();

function ensureGbSidePanel() {
    const modal = document.getElementById('mods-modal');
    if (!modal) return null;
    let panel = document.getElementById('gb-side-panel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'gb-side-panel';
        panel.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px;">'
            + '<span style="font-size:12px;font-weight:700;color:#FFD700;opacity:0.9;">СТРАНИЦА МОДА</span>'
            + '<div style="display:flex;gap:6px;">'
            + '<button type="button" class="btn-small" id="gb-side-web-btn">На сайте</button>'
            + '<button type="button" class="btn-small" onclick="closeGbSidePanel()">×</button>'
            + '</div></div><div id="gb-side-body"></div>';
        modal.appendChild(panel);
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('close-modal-btn')) closeGbSidePanel();
        });
    }
    return panel;
}

window.closeGbSidePanel = function() {
    document.getElementById('gb-side-panel')?.classList.remove('open');
    document.getElementById('mods-modal')?.classList.remove('gb-split-view');
    document.querySelectorAll('#gb-results-list .gb-active-item').forEach(el => el.classList.remove('gb-active-item'));
};

if (!window._gbSwitchWrapped) {
    window._gbSwitchWrapped = true;
    const _origSw = window.switchModsSourceTab;
    window.switchModsSourceTab = function(mode, silent = false) {
        if (mode !== 'gb') closeGbSidePanel();
        return _origSw.apply(this, arguments);
    };
}

window.openGbModDetails = async function(modId) {
    const modal = document.getElementById('mods-modal');
    const panel = ensureGbSidePanel();
    const body = document.getElementById('gb-side-body');
    if (!modal || !panel || !body) return;

    if (typeof playSfx === 'function') playSfx('open_menu');
    modal.classList.add('gb-split-view');
    panel.classList.add('open');

    document.querySelectorAll('#gb-results-list .mod-item').forEach(el => {
        el.classList.toggle('gb-active-item', el.innerHTML.includes('openGbModDetails(' + modId + ')'));
    });

    body.innerHTML = '<div style="text-align:center;padding:30px 10px;opacity:0.7;">Загрузка описания и скриншотов...</div>';

    const res = await fetch('/api/gb/details?mod=' + modId);
    const d = await res.json();
    if (!d.ok) {
        body.innerHTML = '<div style="text-align:center;padding:20px;">Ошибка: ' + (d.error || 'не удалось загрузить') + '</div>';
        return;
    }

    const webBtn = document.getElementById('gb-side-web-btn');
    if (webBtn) webBtn.onclick = () => openGbUrl(d.profileUrl);

    const shotsHtml = (d.images && d.images.length)
        ? '<div class="gb-shots-strip">' + d.images.map(u => '<img src="' + u + '" onclick="openGbUrl(\'' + u + '\')" title="Открыть полный скриншот">').join('') + '</div>'
        : '';

    const filesHtml = (d.files && d.files.length)
        ? d.files.map(f => {
            const sn = String(f.name || '').replace(/'/g, '');
            const su = String(f.url || '').replace(/'/g, '');
            return '<div class="mod-item" style="margin-top:4px;">'
                + '<div class="mod-info" style="flex-grow:1;">'
                + '<div class="mod-title" style="word-break:break-all;">' + f.name + ' <span style="font-size:10px;opacity:0.65;">(' + f.sizeMb + ' МБ)</span></div>'
                + (f.desc ? '<div class="mod-author">' + f.desc + '</div>' : '')
                + '</div>'
                + '<button type="button" class="btn-small btn-accent" onclick="startBrowserModDownload(' + modId + ', \'' + su + '\', \'' + sn + '\')">Скачать</button>'
                + '</div>';
        }).join('')
        : '<div style="opacity:0.6;font-size:12px;">Файлы не найдены</div>';

    body.innerHTML = '<div><div style="font-size:16px;font-weight:800;color:#FFD700;line-height:1.3;">' + d.name + '</div>'
        + '<div style="font-size:11.5px;opacity:0.72;margin-top:3px;">Автор: ' + d.author + (d.version ? ' • Версия: ' + d.version : '') + '</div></div>'
        + shotsHtml
        + '<div class="gb-desc-box"></div>'
        + '<div style="font-size:11.5px;font-weight:700;color:#FFD700;margin-top:2px;">Файлы для скачивания:</div>'
        + '<div>' + filesHtml + '</div>';
    body.querySelector('.gb-desc-box').textContent = d.text;
};

window.startBrowserModDownload = async function(modRowId, directUrl, fileName) {
    let targetUrl = directUrl;
    if (!targetUrl) {
        try {
            const r = await fetch('/api/gb/details?mod=' + modRowId);
            const d = await r.json();
            if (d.ok && d.files && d.files.length > 0) {
                targetUrl = d.files[0].url;
            }
        } catch (_) {}
    }
    if (!targetUrl) {
        const sep = String.fromCharCode(47);
        targetUrl = ['https:', '', 'gamebanana.com', 'mods', String(modRowId)].join(sep);
    }
    openGbUrl(targetUrl);
    if (typeof playSfx === 'function') playSfx('launch');
    showToast('Скачивание открыто в браузере! Перетащите скачанный .ZIP архив в окно лаунчера.');
};

window.openGbUrl = function(url) {
    fetch('/api/gb/open_url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
    });
};

window.openGbHubInBrowser = function() {
    if (gbLastHubUrl) openGbUrl(gbLastHubUrl);
};

window.promptCustomGbId = async function() {
    const g = availableGames.at(selectedIndex);
    if (!g) return;
    const val = await askDialog('Укажите числовой Game ID с GameBanana для «' + g.name + '»:', '');
    if (!val || !val.trim()) return;
    await fetch('/api/gb/set_game_id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: g.id, gbId: parseInt(val.trim()) || 0 })
    });
    showToast('GameBanana ID сохранён!');
    loadGbCatalog(1);
};
