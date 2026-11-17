/* === UI TOASTS & CUSTOM DIALOGS === */
(function() {
    function initDialogs() {
        if (document.getElementById('sgl-dlg-bg')) return;
        const st = document.createElement('style');
        st.textContent = `
            #sgl-toast-box { position:fixed; bottom:24px; right:24px; z-index:999999; display:flex; flex-direction:column; gap:8px; pointer-events:none; }
            .sgl-toast { background:rgba(15,21,36,0.96); border:1px solid rgba(255,215,0,0.45); border-left:4px solid #FFD700; color:#fff; padding:10px 16px; border-radius:10px; font-size:12px; font-weight:600; box-shadow:0 8px 24px rgba(0,0,0,0.65); transform:translateX(30px); opacity:0; transition:all 0.25s ease; max-width:340px; word-break:break-word; }
            .sgl-toast.show { transform:translateX(0); opacity:1; }
            .sgl-toast.err { border-color:rgba(239,68,68,0.5); border-left-color:#ef4444; }
            #sgl-dlg-bg { position:fixed; inset:0; z-index:999990; background:rgba(5,8,15,0.82); backdrop-filter:blur(10px); display:none; align-items:center; justify-content:center; }
            #sgl-dlg-bg.open { display:flex; }
            .sgl-dlg-box { background:#151c2c; border:1px solid rgba(255,255,255,0.18); border-radius:16px; padding:20px; width:380px; max-width:90vw; color:#fff; box-shadow:0 16px 40px rgba(0,0,0,0.85); }
            .sgl-dlg-title { font-size:14px; font-weight:700; color:#FFD700; margin-bottom:12px; line-height:1.4; }
            .sgl-dlg-inp { width:100%; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.22); border-radius:8px; padding:8px 12px; color:#fff; font-size:13px; outline:none; margin-bottom:14px; user-select:text !important; }
            .sgl-dlg-inp:focus { border-color:#FFD700; }
            .sgl-dlg-btns { display:flex; justify-content:flex-end; gap:8px; }
        `;
        document.head.appendChild(st);

        const tBox = document.createElement('div');
        tBox.id = 'sgl-toast-box';
        document.body.appendChild(tBox);

        const dBg = document.createElement('div');
        dBg.id = 'sgl-dlg-bg';
        dBg.innerHTML = `
            <div class="sgl-dlg-box">
                <div class="sgl-dlg-title" id="sgl-dlg-msg"></div>
                <input type="text" class="sgl-dlg-inp" id="sgl-dlg-input">
                <div class="sgl-dlg-btns">
                    <button type="button" class="btn-small" id="sgl-dlg-cancel">Отмена</button>
                    <button type="button" class="btn-small btn-accent" id="sgl-dlg-ok">ОК</button>
                </div>
            </div>`;
        document.body.appendChild(dBg);
    }

    if (document.body) initDialogs();
    else window.addEventListener('DOMContentLoaded', initDialogs);

    window.showToast = function(msg, isErr = false) {
        initDialogs();
        const tBox = document.getElementById('sgl-toast-box');
        const el = document.createElement('div');
        el.className = 'sgl-toast' + (isErr ? ' err' : '');
        el.textContent = msg;
        tBox.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        setTimeout(() => {
            el.classList.remove('show');
            setTimeout(() => el.remove(), 280);
        }, 3400);
    };

    window.askDialog = function(title, defVal = null) {
        initDialogs();
        return new Promise((resolve) => {
            const dBg = document.getElementById('sgl-dlg-bg');
            const inp = document.getElementById('sgl-dlg-input');
            document.getElementById('sgl-dlg-msg').textContent = title;
            if (defVal === null) {
                inp.style.display = 'none';
            } else {
                inp.style.display = 'block';
                inp.value = defVal;
            }
            dBg.classList.add('open');
            if (defVal !== null) setTimeout(() => { inp.focus(); inp.select(); }, 50);

            const close = (res) => {
                dBg.classList.remove('open');
                window.removeEventListener('keydown', onKey, true);
                resolve(res);
            };
            const onKey = (e) => {
                if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); close(defVal === null ? true : inp.value); }
                if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(defVal === null ? false : null); }
            };
            window.addEventListener('keydown', onKey, true);
            document.getElementById('sgl-dlg-ok').onclick = () => close(defVal === null ? true : inp.value);
            document.getElementById('sgl-dlg-cancel').onclick = () => close(defVal === null ? false : null);
        });
    };
})();
