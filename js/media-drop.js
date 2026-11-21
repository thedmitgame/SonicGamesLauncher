/* === QUICK DRAG & DROP MEDIA INSTALLER FOR ACTIVE GAME === */
(function() {
    const IMG_EXTS = new Array('.png', '.jpg', '.jpeg', '.webp', '.gif');
    const VID_EXTS = new Array('.mp4', '.webm', '.mkv');

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function hasExt(fname, list) {
        const low = fname.toLowerCase();
        return list.some(ext => low.endsWith(ext));
    }

    async function uploadDroppedMedia(game, slot, fileName, dataUrl) {
        if (typeof showToast === 'function') showToast('Сохранение медиафайла...');
        const res = await fetch('/api/media/drop_install', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                gameId: game ? game.id : 'default',
                slot: slot,
                fileName: fileName,
                dataBase64: dataUrl
            })
        });
        const data = await res.json();
        if (data.ok) {
            if (typeof playSfx === 'function') playSfx('launch');
            await loadGames(false);
            if (typeof showToast === 'function') showToast('Медиафайл успешно установлен!');
        } else {
            if (typeof showToast === 'function') showToast(data.error || 'Ошибка сохранения файла', true);
        }
    }

    function openImageSlotPicker(game, fileName, dataUrl) {
        document.getElementById('sgl-media-drop-modal')?.remove();

        const bg = mk('div', 'modal-backdrop active', 'z-index:9850;');
        bg.id = 'sgl-media-drop-modal';

        const box = mk('div', 'modal-box', 'width:480px;max-width:94vw;text-align:center;');
        const h2 = mk('h2', '', 'margin-bottom:6px;', 'Куда установить изображение?');
        const sub = mk('div', '', 'font-size:12px;opacity:0.75;margin-bottom:12px;', 'Выбрана игра: ' + game.name);

        const prevWrap = mk('div', '', 'background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:8px;margin-bottom:12px;display:flex;justify-content:center;align-items:center;max-height:160px;overflow:hidden;');
        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.cssText = 'max-height:140px;max-width:100%;object-fit:contain;border-radius:6px;';
        prevWrap.appendChild(img);

        const grid = mk('div', '', 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;');
        const slots = new Array(
            { id: 'cover', label: 'Обложка карточки' },
            { id: 'logo', label: 'Логотип игры' },
            { id: 'bg', label: 'Фоновый арт' },
            { id: 'char_left', label: 'Левый персонаж' },
            { id: 'char_right', label: 'Правый персонаж' },
            { id: 'mainlogo', label: 'Главный логотип лаунчера' }
        );

        slots.forEach(s => {
            const b = mk('button', 'btn-small btn-accent', 'padding:9px 10px;font-size:12px;justify-content:center;', s.label);
            b.type = 'button';
            b.onclick = async () => {
                bg.remove();
                await uploadDroppedMedia(game, s.id, fileName, dataUrl);
            };
            grid.appendChild(b);
        });

        const acts = mk('div', 'modal-actions', '');
        const cancelBtn = mk('button', 'btn-cancel', 'flex:1;', 'Отмена');
        cancelBtn.type = 'button';
        cancelBtn.onclick = () => bg.remove();
        acts.appendChild(cancelBtn);

        box.append(h2, sub, prevWrap, grid, acts);
        bg.appendChild(box);
        document.body.appendChild(bg);
        if (typeof playSfx === 'function') playSfx('open_menu');
    }

    window.addEventListener('drop', (e) => {
        const file = e.dataTransfer?.files?.item(0);
        if (!file) return;
        const fname = file.name || '';
        const isImg = hasExt(fname, IMG_EXTS);
        const isVid = hasExt(fname, VID_EXTS);
        if (!isImg && !isVid) return;

        e.preventDefault();
        e.stopPropagation();
        const dz = document.getElementById('global-drop-zone');
        if (dz) dz.style.display = 'none';

        const activeGame = (typeof availableGames !== 'undefined') ? availableGames.at(selectedIndex) : null;
        if (!activeGame) {
            if (typeof showToast === 'function') showToast('Сначала добавьте хотя бы одну игру в карусель', true);
            return;
        }

        const reader = new FileReader();
        reader.onload = async (ev) => {
            const dataUrl = ev.target.result;
            if (isVid) {
                await uploadDroppedMedia(activeGame, 'video', fname, dataUrl);
            } else {
                openImageSlotPicker(activeGame, fname, dataUrl);
            }
        };
        reader.readAsDataURL(file);
    }, true);
})();
