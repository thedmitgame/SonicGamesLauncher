/* === MODULE 6: I18N (EXTERNAL LOCALES FOLDER) === */
(function() {
    let localesMap = {};
    let curLang = 'ru';
    const origTextMap = new WeakMap();

    let langSel = document.getElementById('m6-lang-select');
    const oldBtn = document.getElementById('m6-lang-btn');
    if (oldBtn) oldBtn.remove();

    if (!langSel) {
        langSel = document.createElement('select');
        langSel.id = 'm6-lang-select';
        langSel.setAttribute('data-hud-id', 'lang');
        // style via class
        langSel.className = 'settings-btn lang-pill-select';
        const _unusedCss = 'position:fixed;top:16px;left:18px;width:auto;min-width:110px;max-width:170px;height:34px;z-index:900;background:rgba(16,22,38,0.88);border:1px solid rgba(255,255,255,0.28);color:#fff;padding:5px 10px;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;outline:none;backdrop-filter:blur(6px);';
        document.body.appendChild(langSel);
    }

    function translateValue(baseRuStr, targetCode) {
        if (!baseRuStr || !baseRuStr.trim() || targetCode === 'ru') return baseRuStr;
        const dict = localesMap[targetCode];
        if (!dict) return baseRuStr;

        const trimmed = baseRuStr.trim();
        if (dict.exact && dict.exact[trimmed]) {
            return baseRuStr.replace(trimmed, dict.exact[trimmed]);
        }
        let out = baseRuStr;
        if (dict.partial) {
            for (const [ruPart, trPart] of Object.entries(dict.partial)) {
                if (out.includes(ruPart)) out = out.replaceAll(ruPart, trPart);
            }
        }
        return out;
    }

    function translateAttrs(root) {
        if (!root || root.nodeType !== 1) return;
        const els = [root, ...root.querySelectorAll('[title], [placeholder]')];
        els.forEach(el => {
            if (!el.hasAttribute) return;
            if (!el.hasAttribute('title') && !el.hasAttribute('placeholder')) return;
            if (!origTitleMap.has(el)) {
                origTitleMap.set(el, { t: el.getAttribute('title'), p: el.getAttribute('placeholder') });
            }
            const saved = origTitleMap.get(el);
            if (saved.t) el.setAttribute('title', translateValue(saved.t, curLang));
            if (saved.p) el.setAttribute('placeholder', translateValue(saved.p, curLang));
        });
    }

    function translateTree(root) {
        translateAttrs(root);
        if (!root) return;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        let node;
        while ((node = walker.nextNode())) {
            const pTag = node.parentElement?.tagName;
            if (pTag === 'SCRIPT' || pTag === 'STYLE' || (pTag === 'OPTION' && node.parentElement?.parentElement?.id === 'm6-lang-select')) continue;
            if (!origTextMap.has(node)) {
                origTextMap.set(node, node.nodeValue);
            }
            const baseRu = origTextMap.get(node);
            const nextVal = translateValue(baseRu, curLang);
            if (nextVal !== node.nodeValue) {
                node.nodeValue = nextVal;
            }
        }
    }

    const origTitleMap = new WeakMap();
    function translateTitles() {
        document.querySelectorAll('[title], [placeholder]').forEach(el => {
            if (!origTitleMap.has(el)) {
                origTitleMap.set(el, { t: el.getAttribute('title'), p: el.getAttribute('placeholder') });
            }
            const saved = origTitleMap.get(el);
            if (saved.t) el.setAttribute('title', translateValue(saved.t, curLang));
            if (saved.p) el.setAttribute('placeholder', translateValue(saved.p, curLang));
        });
    }

    function applyLanguage(code) {
        curLang = localesMap[code] ? code : 'ru';
        if (langSel.value !== curLang) langSel.value = curLang;
        translateTree(document.body);
        translateTitles();
    if (!window._sglToastI18n && typeof window.showToast === 'function') {
        window._sglToastI18n = true;
        const _origToast = window.showToast;
        window.showToast = function(msg, isErr = false) {
            return _origToast(translateValue(String(msg || ''), curLang), isErr);
        };
        const _origAsk = window.askDialog;
        if (typeof _origAsk === 'function') {
            window.askDialog = function(title, defVal = null) {
                return _origAsk(translateValue(String(title || ''), curLang), defVal);
            };
        }
    }

    }

    langSel.onchange = async () => {
        const nextCode = langSel.value;
        applyLanguage(nextCode);
        try {
            await fetch('/api/intro/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lang: nextCode })
            });
        } catch (_) {}
    };

    let obsLock = false;
    const observer = new MutationObserver((mutations) => {
        if (obsLock) return;
        obsLock = true;
        for (const m of mutations) {
            if (m.type === 'characterData' && m.target) {
                const curText = m.target.nodeValue;
                if (curLang === 'ru') {
                    origTextMap.set(m.target, curText);
                } else {
                    const tr = translateValue(curText, curLang);
                    if (tr !== curText) {
                        origTextMap.set(m.target, curText);
                        m.target.nodeValue = tr;
                    }
                }
            }
        }
        translateTree(document.body);
        obsLock = false;
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    Promise.all([
        fetch('/api/locales').then(r => r.json()).catch(() => ({ locales: {} })),
        fetch('/api/games').then(r => r.json()).catch(() => ({ lang: 'ru' }))
    ]).then(([locRes, cfgRes]) => {
        localesMap = locRes.locales || {};
        langSel.innerHTML = '';
        const codes = Object.keys(localesMap);
        if (codes.length === 0) {
            langSel.innerHTML = '<option value="ru">RU • Русский</option>';
        } else {
            codes.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c;
                const label = localesMap[c]?.meta?.name || c.toUpperCase();
                opt.textContent = `${c.toUpperCase()} • ${label}`;
                langSel.appendChild(opt);
            });
        }
        applyLanguage(cfgRes.lang || 'ru');
        if (typeof applyButtonsAndHud === 'function') applyButtonsAndHud();
    });
})();
