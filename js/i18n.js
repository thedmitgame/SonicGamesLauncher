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


/* === REALTIME I18N ENGINE ENHANCER (v1.4.2) === */
(function() {
    if (window._sglI18nV142) return;
    window._sglI18nV142 = true;

    const origTextMap = new WeakMap();
    const origAttrMap = new WeakMap();
    const ATTRS = Array.of('placeholder', 'title', 'aria-label', 'alt');
    let dictCache = { exact: {}, partialKeys: new Array(), partial: {} };
    let obsTimer = 0;

    function getLang() {
        const sel = document.getElementById('m6-lang-select');
        if (sel && sel.value) return sel.value.toLowerCase();
        try { return (localStorage.getItem('sgl_lang') || 'ru').toLowerCase(); } catch (_) { return 'ru'; }
    }

    async function loadEnDict() {
        try {
            const res = await fetch('/locales/en.json?v=1.4.3');
            const data = await res.json();
            const partial = data.partial || {};
            const pKeys = Object.keys(partial).sort((a, b) => b.length - a.length);
            dictCache = { exact: data.exact || {}, partialKeys: pKeys, partial };
        } catch (_) {}
    }

    function translateText(raw) {
        if (!raw || !/[А-Яа-яЁё]/.test(raw)) return raw;
        const trimmed = raw.trim();
        if (!trimmed) return raw;
        if (dictCache.exact[trimmed] !== undefined) {
            return raw.replace(trimmed, dictCache.exact[trimmed]);
        }
        let out = raw;
        const keys = dictCache.partialKeys;
        for (let i = 0; i < keys.length; i++) {
            const k = keys.at(i);
            if (out.includes(k)) out = out.split(k).join(dictCache.partial[k]);
        }
        return out;
    }

    function processElementAttrs(el, isEn) {
        if (!el || el.nodeType !== 1) return;
        let saved = origAttrMap.get(el);
        if (!saved) { saved = {}; origAttrMap.set(el, saved); }

        ATTRS.forEach(attr => {
            const cur = el.getAttribute(attr);
            if (cur === null) return;
            if (isEn) {
                if (saved[attr] === undefined && /[А-Яа-яЁё]/.test(cur)) saved[attr] = cur;
                const base = saved[attr] !== undefined ? saved[attr] : cur;
                const tr = translateText(base);
                if (tr !== cur) el.setAttribute(attr, tr);
            } else if (saved[attr] !== undefined && cur !== saved[attr]) {
                el.setAttribute(attr, saved[attr]);
            }
        });

        if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit' || (el.type === 'text' && el.closest('#buttons-custom-list')))) {
            const curV = el.value || '';
            if (isEn) {
                if (saved._val === undefined && /[А-Яа-яЁё]/.test(curV)) saved._val = curV;
                const trV = translateText(saved._val !== undefined ? saved._val : curV);
                if (trV !== curV) el.value = trV;
            } else if (saved._val !== undefined && curV !== saved._val) {
                el.value = saved._val;
            }
        }
    }

    function translateSubtree(root) {
        if (!root) return;
        const isEn = getLang() === 'en';
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
        let node = root;
        while (node) {
            if (node.nodeType === 3) {
                const pTag = node.parentElement ? node.parentElement.tagName : '';
                if (pTag !== 'SCRIPT' && pTag !== 'STYLE') {
                    const cur = node.nodeValue || '';
                    if (isEn) {
                        if (!origTextMap.has(node) && /[А-Яа-яЁё]/.test(cur)) origTextMap.set(node, cur);
                        const base = origTextMap.has(node) ? origTextMap.get(node) : cur;
                        const tr = translateText(base);
                        if (tr !== cur) node.nodeValue = tr;
                    } else if (origTextMap.has(node)) {
                        const orig = origTextMap.get(node);
                        if (cur !== orig) node.nodeValue = orig;
                    }
                }
            } else if (node.nodeType === 1) {
                processElementAttrs(node, isEn);
            }
            node = walker.nextNode();
        }
    }

    window.sglTranslateString = function(s) {
        return getLang() === 'en' ? translateText(String(s || '')) : String(s || '');
    };
    window.sglApplyRealtimeI18n = function() {
        translateSubtree(document.body);
    };

    function hookGlobals() {
        if (typeof window.showToast === 'function' && !window._i18nToastHooked) {
            window._i18nToastHooked = true;
            const origToast = window.showToast;
            window.showToast = function(msg, isErr) {
                return origToast.call(this, window.sglTranslateString(msg), isErr);
            };
        }
        if (typeof window.askDialog === 'function' && !window._i18nAskHooked) {
            window._i18nAskHooked = true;
            const origAsk = window.askDialog;
            window.askDialog = function(msg, defVal) {
                return origAsk.call(this, window.sglTranslateString(msg), defVal);
            };
        }
        const langSel = document.getElementById('m6-lang-select');
        if (langSel && !langSel.dataset.i18nV142) {
            langSel.dataset.i18nV142 = '1';
            langSel.addEventListener('change', () => { setTimeout(() => translateSubtree(document.body), 40); });
        }
    }

    async function bootRealtimeI18n() {
        await loadEnDict();
        hookGlobals();
        if (getLang() === 'en') translateSubtree(document.body);
        const obs = new MutationObserver(() => {
            if (getLang() !== 'en') return;
            if (obsTimer) return;
            obsTimer = setTimeout(() => { obsTimer = 0; translateSubtree(document.body); }, 110);
        });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(hookGlobals, 600);
    }

    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', bootRealtimeI18n);
    else bootRealtimeI18n();
})();
