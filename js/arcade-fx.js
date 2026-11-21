/* === VISUAL PACK C: SONIC TITLE CARD, CARD ASPECTS & CLICK PARTICLES === */
(function() {
    let launchBusy = false;

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function injectArcadeStyles() {
        if (document.getElementById('sgl-arcade-fx-css')) return;
        const st = document.createElement('style');
        st.id = 'sgl-arcade-fx-css';
        const rules = new Array(
            'body.aspect-square .game-card .cover-box{aspect-ratio:1 / 1 !important;height:auto !important;}',
            'body.aspect-wide .game-card{width:calc(var(--card-w, 210px) * 1.32) !important;}',
            'body.aspect-wide .game-card .cover-box{aspect-ratio:16 / 9 !important;height:auto !important;}',
            '#sgl-launch-stage{position:fixed;inset:0;z-index:9950;pointer-events:none;overflow:hidden;display:none;}',
            '#sgl-launch-stage.active{display:block;}',
            '.tc-backdrop{position:absolute;inset:0;background:rgba(6,10,22,0.78);backdrop-filter:blur(6px);opacity:0;transition:opacity 0.18s;}',
            '#sgl-launch-stage.tc-in .tc-backdrop{opacity:1;}',
            '.tc-blue-ribbon{position:absolute;top:-10%;bottom:-10%;left:8%;width:230px;background:#1D4ED8;transform:skewX(-16deg) translateY(-120%);transition:transform 0.34s cubic-bezier(0.16,1,0.3,1);box-shadow:10px 0 0 #0F172A;}',
            '#sgl-launch-stage.tc-in .tc-blue-ribbon{transform:skewX(-16deg) translateY(0);}',
            '.tc-yellow-bar{position:absolute;left:-5%;right:-5%;bottom:22%;height:66px;background:#FACC15;transform:translateX(115%);transition:transform 0.36s cubic-bezier(0.16,1,0.3,1) 0.06s;box-shadow:0 8px 0 #0F172A;display:flex;align-items:center;justify-content:flex-end;padding-right:12%;}',
            '#sgl-launch-stage.tc-in .tc-yellow-bar{transform:translateX(0);}',
            '.tc-red-badge{position:absolute;left:14%;top:34%;background:#EF4444;padding:16px 38px;border:3px solid #fff;box-shadow:10px 10px 0 #0F172A;transform:translateX(-150%) skewX(-10deg);transition:transform 0.38s cubic-bezier(0.16,1,0.3,1) 0.04s;max-width:72vw;}',
            '#sgl-launch-stage.tc-in .tc-red-badge{transform:translateX(0) skewX(-10deg);}',
            '.tc-title{font-size:38px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:1.5px;text-shadow:4px 4px 0 #0F172A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.tc-zone{font-size:20px;font-weight:900;color:#0F172A;letter-spacing:4px;text-transform:uppercase;}',
            '.warp-ring-el{position:absolute;left:50%;top:50%;width:40px;height:40px;border-radius:50%;border:18px solid #FACC15;box-shadow:0 0 45px #F59E0B,inset 0 0 25px #FEF08A;transform:translate(-50%,-50%) scale(0.1);opacity:1;transition:transform 0.68s cubic-bezier(0.2,0.8,0.2,1),opacity 0.68s ease;}',
            '#sgl-launch-stage.warp-go .warp-ring-el{transform:translate(-50%,-50%) scale(42);opacity:0;}',
            '.crt-off-box{position:absolute;inset:0;background:#000;display:flex;align-items:center;justify-content:center;}',
            '.crt-off-line{width:100vw;height:100vh;background:#fff;transition:height 0.22s ease-out,width 0.22s ease-in 0.22s,opacity 0.15s ease 0.38s;}',
            '#sgl-launch-stage.crt-go .crt-off-line{height:4px;width:6px;opacity:0;}'
        );
        st.textContent = rules.join('\n');
        document.head.appendChild(st);

        if (!document.getElementById('sgl-launch-stage')) {
            const stg = mk('div', '', '');
            stg.id = 'sgl-launch-stage';
            document.body.appendChild(stg);
        }
    }

    window.applyCardAspectMode = function() {
        injectArcadeStyles();
        const mode = (typeof currentDesign !== 'undefined' && currentDesign && currentDesign.cardAspect) ? currentDesign.cardAspect : 'poster';
        document.body.classList.remove('aspect-poster', 'aspect-square', 'aspect-wide');
        document.body.classList.add('aspect-' + mode);
        if (typeof updateCarouselPositions === 'function') {
            setTimeout(updateCarouselPositions, 30);
        }
    };

function playLaunchTransition(game, onDone) {
        const mode = (typeof currentDesign !== 'undefined' && currentDesign && currentDesign.launchAnim) ? currentDesign.launchAnim : 'titlecard';
        const stg = document.getElementById('sgl-launch-stage');
        if (!stg || mode === 'flash' || currentDesign?.liteMode) {
            onDone();
            return;
        }

        stg.innerHTML = '';
        stg.className = 'active';

        if (mode === 'titlecard') {
            const bg = mk('div', 'tc-backdrop', '');
            const blue = mk('div', 'tc-blue-ribbon', '');
            if (game.color) blue.style.background = game.color;

            const yellow = mk('div', 'tc-yellow-bar', '');
            yellow.appendChild(mk('div', 'tc-zone', '', (game.tag || 'ZONE • ACT 1')));

            const red = mk('div', 'tc-red-badge', '');
            red.appendChild(mk('div', 'tc-title', '', game.name || 'SONIC'));

            stg.append(bg, blue, yellow, red);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => stg.classList.add('tc-in'));
            });
            setTimeout(() => {
                onDone();
                setTimeout(() => { stg.className = ''; stg.innerHTML = ''; }, 380);
            }, 980);
        } else if (mode === 'warpring') {
            const ring = mk('div', 'warp-ring-el', '');
            stg.appendChild(ring);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => stg.classList.add('warp-go'));
            });
            setTimeout(() => {
                onDone();
                setTimeout(() => { stg.className = ''; stg.innerHTML = ''; }, 200);
            }, 560);
        } else if (mode === 'crtoff') {
            const box = mk('div', 'crt-off-box', '');
            const line = mk('div', 'crt-off-line', '');
            box.appendChild(line);
            stg.appendChild(box);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => stg.classList.add('crt-go'));
            });
            setTimeout(() => {
                onDone();
                setTimeout(() => { stg.className = ''; stg.innerHTML = ''; }, 250);
            }, 460);
        } else {
            onDone();
        }
    }

    // Кастомные частицы клика (Изумруды, Звёзды бамперов, Кибер-осколки) + подавление штатных колец при смене режима
    const EMERALD_COLS = new Array('#22C55E', '#3B82F6', '#EF4444', '#A855F7', '#FACC15', '#06B6D4', '#E2E8F0');

    function spawnCustomClickParticles(x, y, mode) {
        const count = 8;
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
            const spd = 45 + Math.random() * 65;
            const dx = Math.cos(ang) * spd;
            const dy = Math.sin(ang) * spd - 20;

            let baseCss = 'position:fixed;left:' + x + 'px;top:' + y + 'px;pointer-events:none;z-index:9990;transition:transform 0.55s cubic-bezier(0.16,1,0.3,1),opacity 0.55s ease;';
            if (mode === 'emeralds') {
                const col = EMERALD_COLS.at(i % EMERALD_COLS.length);
                baseCss += 'width:12px;height:12px;background:' + col + ';transform:translate(-50%,-50%) rotate(45deg);border:1.5px solid #fff;box-shadow:0 0 10px ' + col + ';';
            } else if (mode === 'stars') {
                baseCss += 'width:13px;height:13px;background:#FACC15;clip-path:polygon(50% 0%,63% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,37% 35%);box-shadow:0 0 8px #F59E0B;';
            } else if (mode === 'cyber') {
                const cCol = (i % 2 === 0) ? '#22D3EE' : '#F43F5E';
                baseCss += 'width:10px;height:4px;background:' + cCol + ';box-shadow:0 0 8px ' + cCol + ';';
            }
            p.style.cssText = baseCss;
            document.body.appendChild(p);

            requestAnimationFrame(() => {
                const rot = (mode === 'emeralds') ? ' rotate(225deg) scale(0.4)' : ' scale(0.3)';
                p.style.transform = 'translate(calc(-50% + ' + dx.toFixed(1) + 'px), calc(-50% + ' + dy.toFixed(1) + 'px))' + rot;
                p.style.opacity = '0';
            });
            setTimeout(() => p.remove(), 580);
        }
    }

    // Если выбран режим отличный от 'rings', прячем старые кольца CSS-классом и рисуем выбранные частицы
    window.syncClickFxStyle = function() {
        let st = document.getElementById('sgl-clickfx-override');
        if (!st) {
            st = document.createElement('style');
            st.id = 'sgl-clickfx-override';
            document.head.appendChild(st);
        }
        const mode = currentDesign?.clickFx || 'rings';
        if (mode !== 'rings') {
            st.textContent = '.click-ring, .ring-particle { display: none !important; }';
        } else {
            st.textContent = '';
        }
    };

    window.addEventListener('pointerdown', (e) => {
        if (!currentDesign || currentDesign.liteMode) return;
        const mode = currentDesign.clickFx || 'rings';
        if (mode === 'emeralds' || mode === 'stars' || mode === 'cyber') {
            spawnCustomClickParticles(e.clientX, e.clientY, mode);
        }
    }, { passive: true });

function injectArcadeControls() {
        if (document.getElementById('inp-launchAnim')) return;
        const cardStyleSel = document.getElementById('inp-cardStyle');
        const anchor = cardStyleSel ? (cardStyleSel.closest('.custom-group') || cardStyleSel.parentElement) : null;
        if (!anchor) return;

        const wrap = mk('div', 'custom-group', 'margin-top:8px;padding:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;');

        const makeCol = (lblTxt, id, opts) => {
            const col = mk('div', '', 'display:flex;flex-direction:column;gap:4px;');
            col.appendChild(mk('label', '', 'font-size:11px;opacity:0.85;', lblTxt));
            const sel = mk('select', 'custom-select', 'width:100%;font-size:11px;padding:5px 6px;');
            sel.id = id;
            opts.forEach(o => {
                const opt = mk('option', '', '', o.t);
                opt.value = o.v;
                sel.appendChild(opt);
            });
            col.appendChild(sel);
            return col;
        };

        const cAspect = makeCol('Формат обложек:', 'inp-cardAspect', new Array(
            { v: 'poster', t: 'Постер (2:3)' },
            { v: 'square', t: 'Квадратный бокс (1:1)' },
            { v: 'wide', t: 'Широкий баннер (16:9)' }
        ));

        const cLaunch = makeCol('Переход запуска:', 'inp-launchAnim', new Array(
            { v: 'titlecard', t: 'Аркадные ленты' },
            { v: 'warpring', t: 'Кольцо-портал' },
            { v: 'crtoff', t: 'Выключение ЭЛТ' },
            { v: 'flash', t: 'Белая вспышка' }
        ));

        const cClick = makeCol('Эффект клика:', 'inp-clickFx', new Array(
            { v: 'rings', t: 'Золотые кольца' },
            { v: 'emeralds', t: 'Гранёные кристаллы' },
            { v: 'stars', t: 'Аркадные звёзды' },
            { v: 'cyber', t: 'Кибер-пиксели' },
            { v: 'none', t: 'Без частиц' }
        ));

        wrap.append(cAspect, cLaunch, cClick);
        anchor.after(wrap);

        const onChangeAny = () => {
            if (!currentDesign) return;
            currentDesign.cardAspect = document.getElementById('inp-cardAspect').value;
            currentDesign.launchAnim = document.getElementById('inp-launchAnim').value;
            currentDesign.clickFx = document.getElementById('inp-clickFx').value;
            window.applyCardAspectMode();
            window.syncClickFxStyle();
        };

        document.getElementById('inp-cardAspect').onchange = onChangeAny;
        document.getElementById('inp-launchAnim').onchange = onChangeAny;
        document.getElementById('inp-clickFx').onchange = onChangeAny;
    }

    function syncArcadeControls() {
        injectArcadeControls();
        if (!currentDesign) return;
        const aSel = document.getElementById('inp-cardAspect');
        const lSel = document.getElementById('inp-launchAnim');
        const cSel = document.getElementById('inp-clickFx');
        if (aSel) aSel.value = currentDesign.cardAspect || 'poster';
        if (lSel) lSel.value = currentDesign.launchAnim || 'titlecard';
        if (cSel) cSel.value = currentDesign.clickFx || 'rings';
    }

    const _bootArcade = () => {
        injectArcadeStyles();

        const origLaunch = window.triggerGameLaunch;
        if (typeof origLaunch === 'function' && !window._arcadeLaunchWrapped) {
            window._arcadeLaunchWrapped = true;
            window.triggerGameLaunch = function(game) {
                if (!game || launchBusy) return;
                const mode = currentDesign?.launchAnim || 'titlecard';
                if (mode === 'flash' || currentDesign?.liteMode) {
                    return origLaunch.apply(this, arguments);
                }
                launchBusy = true;
                if (typeof playSfx === 'function') playSfx('launch');
                if (typeof currentBgmAudio !== 'undefined' && currentBgmAudio && !currentBgmAudio.paused) {
                    currentBgmAudio.pause();
                }
                playLaunchTransition(game, () => {
                    launchBusy = false;
                    fetch('/api/launch?id=' + encodeURIComponent(game.id));
                });
            };
        }

        const origApply = window.applyDesign;
        if (typeof origApply === 'function') {
            window.applyDesign = function() {
                const r = origApply.apply(this, arguments);
                window.applyCardAspectMode();
                window.syncClickFxStyle();
                return r;
            };
        }

        const origOpen = window.openCustomModal;
        if (typeof origOpen === 'function') {
            window.openCustomModal = function() {
                const r = origOpen.apply(this, arguments);
                syncArcadeControls();
                return r;
            };
        }

        const origSync = window.syncAllControlsToDesign;
        if (typeof origSync === 'function') {
            window.syncAllControlsToDesign = function() {
                const r = origSync.apply(this, arguments);
                const aSel = document.getElementById('inp-cardAspect');
                const lSel = document.getElementById('inp-launchAnim');
                const cSel = document.getElementById('inp-clickFx');
                if (currentDesign && aSel) currentDesign.cardAspect = aSel.value;
                if (currentDesign && lSel) currentDesign.launchAnim = lSel.value;
                if (currentDesign && cSel) currentDesign.clickFx = cSel.value;
                return r;
            };
        }

        setTimeout(() => {
            window.applyCardAspectMode();
            window.syncClickFxStyle();
        }, 350);
    };

    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', _bootArcade);
    else _bootArcade();
})();
