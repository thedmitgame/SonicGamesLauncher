/* === STAGE 4 POLISH (v1.4.3): AUTO-CAMERA 3D EMERALD, COMPOSITE MUSEUM TROPHIES & IDLE GPU <3% === */
(function() {
    const ACTIVE_3D_LOOPS = new Set();

    function mk(tag, cls, css, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (css) e.style.cssText = css;
        if (txt !== undefined && txt !== null) e.textContent = txt;
        return e;
    }

    function v3(x, y, z) { return Float32Array.of(x, y, z); }
    function rotV(p, rx, ry) {
        const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
        const x1 = p.at(0) * cy + p.at(2) * sy;
        const z1 = -p.at(0) * sy + p.at(2) * cy;
        const y2 = p.at(1) * cx - z1 * sx;
        const z2 = p.at(1) * sx + z1 * cx;
        return Float32Array.of(x1, y2, z2);
    }

    function hexRgb(hex) {
        const h = String(hex || '#38bdf8').replace('#', '');
        const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16) || 0x38bdf8;
        return Array.of((n >> 16) & 255, (n >> 8) & 255, n & 255);
    }

    function shadeFace(rgb, nx, ny, nz, specPow, rimStr, isLocked) {
        if (isLocked) {
            const rim = Math.pow(1 - Math.abs(nz), 2.1);
            const v = Math.round(18 + rim * 55);
            return { fill: 'rgba(' + v + ',' + (v + 12) + ',' + (v + 30) + ',0.92)', stroke: 'rgba(56,189,248,' + (0.22 + rim * 0.58).toFixed(2) + ')' };
        }
        const diff = Math.max(0.14, nx * 0.42 + ny * 0.62 + nz * 0.66);
        const fill2 = Math.max(0, -nx * 0.5 - ny * 0.25 + nz * 0.45) * 0.28;
        const hdot = Math.max(0, nx * 0.26 + ny * 0.38 + nz * 0.88);
        const spec = Math.pow(hdot, 26) * (specPow || 0.75);
        const rim = Math.pow(1 - Math.abs(nz), 2.3) * (rimStr || 0.55);
        const k = diff + fill2;
        const r = Math.min(255, Math.round(rgb.at(0) * k + spec * 255 + rim * 165));
        const g = Math.min(255, Math.round(rgb.at(1) * k + spec * 255 + rim * 220));
        const b = Math.min(255, Math.round(rgb.at(2) * k + spec * 255 + rim * 255));
        return { fill: 'rgb(' + r + ',' + g + ',' + b + ')', stroke: 'rgba(255,255,255,' + (0.18 + rim * 0.65).toFixed(2) + ')' };
    }

    function addFacet(faces, pts, col, spec, rim, dbl) {
        faces.push({ pts, rgb: hexRgb(col), spec: spec || 0.75, rim: rim || 0.55, dbl: Boolean(dbl) });
    }

    function addOctaPedestal(faces, accentCol, yBase) {
        const segs = 8;
        const tiers = Array.of(
            { rB: 1.08, rT: 0.96, yB: yBase - 0.28, yT: yBase - 0.14, col: '#1e293b' },
            { rB: 0.90, rT: 0.78, yB: yBase - 0.14, yT: yBase, col: '#334155' }
        );
        tiers.forEach(tr => {
            const topPts = new Array();
            for (let i = 0; i < segs; i++) {
                const a0 = (i / segs) * Math.PI * 2 + Math.PI / 8;
                const a1 = ((i + 1) / segs) * Math.PI * 2 + Math.PI / 8;
                const b0 = v3(Math.cos(a0) * tr.rB, tr.yB, Math.sin(a0) * tr.rB);
                const b1 = v3(Math.cos(a1) * tr.rB, tr.yB, Math.sin(a1) * tr.rB);
                const t1 = v3(Math.cos(a1) * tr.rT, tr.yT, Math.sin(a1) * tr.rT);
                const t0 = v3(Math.cos(a0) * tr.rT, tr.yT, Math.sin(a0) * tr.rT);
                addFacet(faces, Array.of(b0, b1, t1, t0), tr.col, 0.55, 0.45, false);
                topPts.push(t0);
            }
            addFacet(faces, topPts.reverse(), '#475569', 0.4, 0.35, false);
        });
        for (let i = 0; i < segs; i++) {
            const a0 = (i / segs) * Math.PI * 2 + Math.PI / 8;
            const a1 = ((i + 1) / segs) * Math.PI * 2 + Math.PI / 8;
            const o0 = v3(Math.cos(a0) * 0.80, yBase + 0.015, Math.sin(a0) * 0.80);
            const o1 = v3(Math.cos(a1) * 0.80, yBase + 0.015, Math.sin(a1) * 0.80);
            const i1 = v3(Math.cos(a1) * 0.68, yBase + 0.015, Math.sin(a1) * 0.68);
            const i0 = v3(Math.cos(a0) * 0.68, yBase + 0.015, Math.sin(a0) * 0.68);
            addFacet(faces, Array.of(o0, o1, i1, i0), accentCol || '#facc15', 1.1, 0.9, true);
        }
    }

    function addEmeraldCrystal(faces, col, sc, ox, oy, oz) {
        const sides = 12, rTop = 0.52 * sc, rMid = 0.96 * sc;
        const yTop = oy + 0.52 * sc, yMid = oy + 0.14 * sc, yBot = oy - 0.82 * sc;
        const topRing = new Array(), botPt = v3(ox, yBot, oz);
        for (let i = 0; i < sides; i++) {
            const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2;
            const t0 = v3(ox + Math.cos(a0) * rTop, yTop, oz + Math.sin(a0) * rTop);
            const t1 = v3(ox + Math.cos(a1) * rTop, yTop, oz + Math.sin(a1) * rTop);
            const m1 = v3(ox + Math.cos(a1) * rMid, yMid, oz + Math.sin(a1) * rMid);
            const m0 = v3(ox + Math.cos(a0) * rMid, yMid, oz + Math.sin(a0) * rMid);
            addFacet(faces, Array.of(t0, t1, m1, m0), col, 1.0, 0.8, true);
            addFacet(faces, Array.of(m0, m1, botPt), col, 0.95, 0.85, true);
            topRing.push(t0);
        }
        addFacet(faces, topRing.reverse(), col, 1.1, 0.6, true);
    }

    function addTorus(faces, col, R, r, majSeg, minSeg, yOff, tiltX, tiltZ) {
        const ctX = Math.cos(tiltX || 0), stX = Math.sin(tiltX || 0);
        const ctZ = Math.cos(tiltZ || 0), stZ = Math.sin(tiltZ || 0);
        function pt(u, v) {
            const x0 = (R + r * Math.cos(v)) * Math.cos(u);
            const y0 = (R + r * Math.cos(v)) * Math.sin(u);
            const z0 = r * Math.sin(v);
            const y1 = y0 * ctX - z0 * stX, z1 = y0 * stX + z0 * ctX;
            const x2 = x0 * ctZ - y1 * stZ, y2 = x0 * stZ + y1 * ctZ;
            return v3(x2, y2 + yOff, z1);
        }
        for (let i = 0; i < majSeg; i++) {
            const u0 = (i / majSeg) * Math.PI * 2, u1 = ((i + 1) / majSeg) * Math.PI * 2;
            for (let j = 0; j < minSeg; j++) {
                const v0 = (j / minSeg) * Math.PI * 2, v1 = ((j + 1) / minSeg) * Math.PI * 2;
                addFacet(faces, Array.of(pt(u0, v0), pt(u1, v0), pt(u1, v1), pt(u0, v1)), col, 1.05, 0.7, false);
            }
        }
    }

    function addSpeedEmblem(faces, col, yOff) {
        const pts = 5, rOut = 0.72, rIn = 0.34, zD = 0.24;
        const frontC = v3(0, yOff, zD), backC = v3(0, yOff, -zD);
        for (let i = 0; i < pts * 2; i++) {
            const a0 = (i / (pts * 2)) * Math.PI * 2 - Math.PI * 0.5;
            const a1 = ((i + 1) / (pts * 2)) * Math.PI * 2 - Math.PI * 0.5;
            const r0 = i % 2 === 0 ? rOut : rIn, r1 = i % 2 === 0 ? rIn : rOut;
            const p0 = v3(Math.cos(a0) * r0, yOff + Math.sin(a0) * r0, 0);
            const p1 = v3(Math.cos(a1) * r1, yOff + Math.sin(a1) * r1, 0);
            addFacet(faces, Array.of(frontC, p0, p1), col, 1.0, 0.75, false);
            addFacet(faces, Array.of(backC, p1, p0), col, 0.9, 0.7, false);
        }
        Array.of(-1, 1).forEach(s => {
            const w0 = v3(s * 0.42, yOff + 0.08, 0.06), w1 = v3(s * 1.18, yOff + 0.48, -0.08);
            const w2 = v3(s * 1.02, yOff - 0.16, -0.10), w3 = v3(s * 0.38, yOff - 0.22, 0.06);
            addFacet(faces, Array.of(w0, w1, w2, w3), '#38bdf8', 0.95, 0.85, true);
        });
    }

    function buildCompositeMesh(kind, accentCol, tSec, includePedestal) {
        const faces = new Array();
        if (includePedestal) addOctaPedestal(faces, accentCol, -0.82);
        const bob = Math.sin(tSec * 2.2) * 0.07;

        if (kind === 'master_emerald') {
            addEmeraldCrystal(faces, '#10b981', 0.76, 0, 0.16 + bob, 0);
            const orbCols = Array.of('#ef4444', '#3b82f6', '#facc15', '#22c55e', '#e2e8f0', '#38bdf8', '#a855f7');
            orbCols.forEach((c, idx) => {
                const a = tSec * 0.95 + (idx / 7) * Math.PI * 2;
                addEmeraldCrystal(faces, c, 0.19, Math.cos(a) * 1.05, 0.18 + Math.sin(tSec * 2.5 + idx) * 0.14, Math.sin(a) * 1.05);
            });
        } else if (kind === 'ring') {
            addTorus(faces, '#facc15', 0.68, 0.17, 18, 8, 0.18 + bob, 0, 0);
            addTorus(faces, '#fef08a', 0.56, 0.07, 18, 6, 0.18 + bob, 0, 0);
        } else if (kind === 'chrono') {
            addEmeraldCrystal(faces, '#38bdf8', 0.62, 0, 0.18 + bob, 0);
            addTorus(faces, '#facc15', 0.94, 0.045, 20, 6, 0.18 + bob, 1.15 + tSec * 0.7, 0.35);
            addTorus(faces, '#a855f7', 0.80, 0.04, 18, 6, 0.18 + bob, -1.0 - tSec * 0.6, -0.45);
        } else if (kind === 'speed') {
            addSpeedEmblem(faces, accentCol || '#facc15', 0.20 + bob);
        } else {
            addEmeraldCrystal(faces, accentCol || '#10b981', 0.82, 0, 0.12 + bob, 0);
        }
        return faces;
    }

    window.mountPro3DCanvas = function(host, opts) {
        if (!host) return null;
        if (host._pro3dStop) host._pro3dStop();
        host.innerHTML = '';
        const cvs = mk('canvas', '', 'width:100%;height:100%;display:block;cursor:grab;');
        host.appendChild(cvs);
        const ctx = cvs.getContext('2d');

        let yaw = 0.35, pitch = 0.22, drag = false, lx = 0, ly = 0, rafId = 0, lastFrame = 0, stopped = false;
        const kind = opts.kind || 'emerald', col = opts.color || '#10b981', locked = Boolean(opts.locked), hasPed = opts.pedestal !== false;

        cvs.onpointerdown = e => { drag = true; lx = e.clientX; ly = e.clientY; cvs.setPointerCapture(e.pointerId); };
        cvs.onpointermove = e => {
            if (!drag) return;
            yaw += (e.clientX - lx) * 0.013;
            pitch = Math.max(-0.55, Math.min(0.65, pitch + (e.clientY - ly) * 0.01));
            lx = e.clientX; ly = e.clientY;
        };
        cvs.onpointerup = () => { drag = false; };

        function drawFrame(now) {
            if (stopped || !cvs.isConnected) { ACTIVE_3D_LOOPS.delete(ctrl); return; }
            rafId = requestAnimationFrame(drawFrame);
            if (document.hidden || cvs.offsetParent === null) return;
            if (now - lastFrame < 32) return;
            lastFrame = now;

            const w = host.clientWidth || 260, h = host.clientHeight || 260;
            if (cvs.width !== w || cvs.height !== h) { cvs.width = w; cvs.height = h; }
            if (!drag) yaw += 0.016;
            ctx.clearRect(0, 0, w, h);

            const faces = buildCompositeMesh(kind, col, now * 0.001, hasPed);
            let maxR = 1.05;
            faces.forEach(f => f.pts.forEach(p => { const d = Math.hypot(p.at(0), p.at(1), p.at(2)); if (d > maxR) maxR = d; }));

            // Автоматический расчёт дистанции камеры с запасом отступов ~25% со всех сторон
            const fov = Math.min(w, h) * 1.18;
            const camDist = (maxR * 1.18) / 0.34;
            const renderList = new Array();

            faces.forEach(f => {
                const tr = f.pts.map(p => rotV(p, pitch, yaw));
                const a = tr.at(0), b = tr.at(1), c = tr.at(2);
                const ux = b.at(0) - a.at(0), uy = b.at(1) - a.at(1), uz = b.at(2) - a.at(2);
                const vx = c.at(0) - a.at(0), vy = c.at(1) - a.at(1), vz = c.at(2) - a.at(2);
                let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
                const nl = Math.hypot(nx, ny, nz) || 1;
                nx /= nl; ny /= nl; nz /= nl;
                if (nz < 0) { if (!f.dbl) return; nx = -nx; ny = -ny; nz = -nz; }
                let zAvg = 0;
                const proj = tr.map(p => {
                    const pz = camDist - p.at(2);
                    zAvg += p.at(2);
                    return Array.of(w * 0.5 + (p.at(0) / pz) * fov, h * 0.5 - (p.at(1) / pz) * fov);
                });
                renderList.push({ z: zAvg / tr.length, proj, style: shadeFace(f.rgb, nx, ny, nz, f.spec, f.rim, locked) });
            });

            renderList.sort((a, b) => a.z - b.z);
            renderList.forEach(it => {
                ctx.beginPath();
                it.proj.forEach((pt, idx) => { if (idx === 0) ctx.moveTo(pt.at(0), pt.at(1)); else ctx.lineTo(pt.at(0), pt.at(1)); });
                ctx.closePath();
                ctx.fillStyle = it.style.fill; ctx.fill();
                ctx.strokeStyle = it.style.stroke; ctx.lineWidth = locked ? 1.25 : 0.85; ctx.stroke();
            });
        }

        const ctrl = { stop() { stopped = true; if (rafId) cancelAnimationFrame(rafId); ACTIVE_3D_LOOPS.delete(ctrl); } };
        host._pro3dStop = ctrl.stop;
        ACTIVE_3D_LOOPS.add(ctrl);
        rafId = requestAnimationFrame(drawFrame);
        return ctrl;
    };

    function detectTrophyKind(text) {
        const t = (text || '').toLowerCase();
        if (t.includes('мастер') || t.includes('master')) return { kind: 'master_emerald', color: '#10b981' };
        if (t.includes('кольц') || t.includes('ring')) return { kind: 'ring', color: '#facc15' };
        if (t.includes('хроно') || t.includes('время') || t.includes('time') || t.includes('cd')) return { kind: 'chrono', color: '#38bdf8' };
        if (t.includes('скорост') || t.includes('эмблем') || t.includes('speed') || t.includes('star')) return { kind: 'speed', color: '#facc15' };
        return { kind: 'emerald', color: '#38bdf8' };
    }

    function enhanceProfileAndMuseum3D() {
        const pModal = document.getElementById('profile-stats-modal');
        if (pModal && pModal.classList.contains('active')) {
            const sideHost = pModal.querySelector('.prof-3d-host, #prof-3d-stage, .profile-3d-box');
            if (sideHost && !sideHost.dataset.pro3dMounted) {
                sideHost.dataset.pro3dMounted = '1';
                window.mountPro3DCanvas(sideHost, { kind: 'emerald', color: '#10b981', pedestal: true, locked: false });
            }
        }
        const mModal = document.getElementById('sgl-museum-modal');
        if (mModal && mModal.classList.contains('active')) {
            const stage = mModal.querySelector('.mus-cvs-host, #mus-3d-host, .trophy-stage-cvs') || mModal.querySelector('canvas')?.parentElement;
            const titleEl = mModal.querySelector('.mus-info-title, h3, .trophy-title');
            const badgeEl = mModal.querySelector('.mus-info-status, .trophy-status');
            if (stage && titleEl) {
                const sig = (titleEl.textContent || '') + '|' + (badgeEl ? badgeEl.textContent : '');
                if (stage.dataset.pro3dSig !== sig) {
                    stage.dataset.pro3dSig = sig;
                    const info = detectTrophyKind(titleEl.textContent);
                    const isLocked = /закрыт|locked|заблок/i.test((badgeEl ? badgeEl.textContent : '') + ' ' + mModal.textContent);
                    window.mountPro3DCanvas(stage, { kind: info.kind, color: info.color, pedestal: true, locked: isLocked });
                }
            }
        }
    }

    function initIdleGpuGovernor() {
        const origRaf = window.requestAnimationFrame.bind(window);
        const origDpr = window.devicePixelRatio || 1;

        function clampBgCanvas() {
            const bg = document.getElementById('bg-shader-canvas');
            if (!bg) return;
            const sh = (typeof currentDesign !== 'undefined' && currentDesign) ? (currentDesign.shaderType || 'none') : 'none';
            const off = (sh === 'none' || Boolean(currentDesign?.liteMode) || document.hidden);
            window._sglBgShaderPaused = off;
            bg.style.display = off ? 'none' : 'block';
            if (!off && origDpr > 1) {
                if (bg.width > window.innerWidth) bg.width = window.innerWidth;
                if (bg.height > window.innerHeight) bg.height = window.innerHeight;
            }
        }

        window.addEventListener('visibilitychange', () => {
            clampBgCanvas();
            if (!document.hidden) enhanceProfileAndMuseum3D();
        });
        window.addEventListener('resize', clampBgCanvas, { passive: true });
        setInterval(clampBgCanvas, 2000);

        let tObs = 0;
        const obs = new MutationObserver(() => {
            if (tObs) return;
            tObs = setTimeout(() => { tObs = 0; enhanceProfileAndMuseum3D(); }, 120);
        });
        obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: Array.of('class') });
        setTimeout(clampBgCanvas, 400);
        void origRaf;
    }

    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', initIdleGpuGovernor);
    else initIdleGpuGovernor();
})();
