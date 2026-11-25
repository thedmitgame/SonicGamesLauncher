/* _sgl3dVisGuard */
/* === NATIVE WEBGL 3D ENGINE v3.1 (VERIFIED GLSL + POT TEXTURES) === */
(function() {
    function toPotCanvas(imgSource) {
        const c = document.createElement('canvas');
        c.width = 1024;
        c.height = 1024;
        c.getContext('2d').drawImage(imgSource, 0, 0, 1024, 1024);
        return c;
    }

    function computeNormals(pos) {
        const nrm = new Float32Array(pos.length);
        for (let i = 0; i < pos.length; i += 9) {
            const ax = pos.at(i+3) - pos.at(i), ay = pos.at(i+4) - pos.at(i+1), az = pos.at(i+5) - pos.at(i+2);
            const bx = pos.at(i+6) - pos.at(i), by = pos.at(i+7) - pos.at(i+1), bz = pos.at(i+8) - pos.at(i+2);
            let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
            const l = Math.hypot(nx, ny, nz) || 1;
            nx /= l; ny /= l; nz /= l;
            for (let k = 0; k < 9; k += 3) {
                nrm.set(Array.of(nx, ny, nz), i + k);
            }
        }
        return nrm;
    }

    function normalizeParts(parts) {
        const valid = parts.filter(p => p && p.pos && p.pos.length >= 9);
        if (!valid.length) return createBuiltinEmeraldMesh();
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        valid.forEach(p => {
            const a = p.pos;
            for (let i = 0; i < a.length; i += 3) {
                const x = a.at(i), y = a.at(i+1), z = a.at(i+2);
                if (!isFinite(x) || !isFinite(y) || !isFinite(z)) continue;
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
                if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
            }
        });
        if (!isFinite(minX)) return createBuiltinEmeraldMesh();
        const cx = (minX + maxX) * 0.5, cy = (minY + maxY) * 0.5, cz = (minZ + maxZ) * 0.5;
        const sc = 1.95 / (Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1);
        valid.forEach(p => {
            const a = p.pos;
            for (let i = 0; i < a.length; i += 3) {
                a.set(Array.of(((a.at(i)||0) - cx)*sc, ((a.at(i+1)||0) - cy)*sc, ((a.at(i+2)||0) - cz)*sc), i);
            }
            if (!p.nrm || p.nrm.length !== a.length) p.nrm = computeNormals(a);
            let hasUv = false;
            if (p.uv && p.uv.length === (a.length / 3) * 2) {
                for (let j = 0; j < p.uv.length; j++) { if (p.uv.at(j) !== 0) { hasUv = true; break; } }
            }
            if (!hasUv) {
                p.uv = new Float32Array((a.length / 3) * 2);
                for (let i = 0, u = 0; i < a.length; i += 3, u += 2) {
                    p.uv.set(Array.of(a.at(i) * 0.5 + 0.5, 0.5 - a.at(i+1) * 0.5), u);
                }
            }
        });
        return valid;
    }

    function addOctaPedestalPart() {
        const mkP = makeGeoBuilder();
        const base = mkP(Float32Array.of(0.16, 0.20, 0.30));
        base.addCylY(-0.96, 0.86, 0.76, 0.14, 8);
        base.addCylY(-0.82, 0.70, 0.62, 0.12, 8);
        const glow = mkP(Float32Array.of(1.0, 0.84, 0.18));
        glow.addCylY(-0.75, 0.65, 0.65, 0.035, 24);
        return Array.of(base.build(), glow.build());
    }

    function buildCrystalVerts(sides, rTop, rMid, yTop, yMid, yBot, ox, oy, oz) {
        const out = new Array();
        const tri = (a, b, c) => { out.push(a.at(0),a.at(1),a.at(2), b.at(0),b.at(1),b.at(2), c.at(0),c.at(1),c.at(2)); };
        for (let i = 0; i < sides; i++) {
            const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2;
            const t0 = Array.of(ox + Math.cos(a0)*rTop, oy + yTop, oz + Math.sin(a0)*rTop);
            const t1 = Array.of(ox + Math.cos(a1)*rTop, oy + yTop, oz + Math.sin(a1)*rTop);
            const m0 = Array.of(ox + Math.cos(a0)*rMid, oy + yMid, oz + Math.sin(a0)*rMid);
            const m1 = Array.of(ox + Math.cos(a1)*rMid, oy + yMid, oz + Math.sin(a1)*rMid);
            tri(Array.of(ox, oy + yTop, oz), t1, t0);
            tri(t0, t1, m1); tri(t0, m1, m0);
            tri(m0, m1, Array.of(ox, oy + yBot, oz));
        }
        return new Float32Array(out);
    }

    function createBuiltinEmeraldMesh(withOrbit) {
        const pos = buildCrystalVerts(16, 0.48, 0.88, 0.46, 0.12, -0.74, 0, 0.08, 0);
        const parts = Array.of({ pos, uv: new Float32Array((pos.length / 3) * 2), nrm: computeNormals(pos), color: Float32Array.of(0.12, 0.92, 0.48) });
        if (withOrbit) {
            const cols = Array.of(
                Float32Array.of(0.95,0.25,0.25), Float32Array.of(0.22,0.55,1.0), Float32Array.of(1.0,0.84,0.12),
                Float32Array.of(0.18,0.88,0.42), Float32Array.of(0.92,0.95,1.0), Float32Array.of(0.22,0.85,0.98), Float32Array.of(0.72,0.35,0.98)
            );
            cols.forEach((c, idx) => {
                const a = (idx / 7) * Math.PI * 2;
                const mp = buildCrystalVerts(8, 0.09, 0.16, 0.12, 0.02, -0.16, Math.cos(a)*1.08, 0.06 + Math.sin(a*2)*0.14, Math.sin(a)*1.08);
                parts.push({ pos: mp, uv: new Float32Array((mp.length / 3) * 2), nrm: computeNormals(mp), color: c });
            });
        }
        return normalizeParts(parts);
    }

    function createBuiltinRingMesh() {
        const R = 0.62, r = 0.17, segU = 36, segV = 18, out = new Array();
        const pt = (u, v) => {
            const cu = Math.cos(u), su = Math.sin(u), cv = Math.cos(v), sv = Math.sin(v);
            return Array.of((R + r * cv) * cu, (R + r * cv) * su, r * sv);
        };
        const tri = (a, b, c) => { out.push(a.at(0),a.at(1),a.at(2), b.at(0),b.at(1),b.at(2), c.at(0),c.at(1),c.at(2)); };
        for (let i = 0; i < segU; i++) {
            const u0 = (i / segU) * Math.PI * 2, u1 = ((i + 1) / segU) * Math.PI * 2;
            for (let j = 0; j < segV; j++) {
                const v0 = (j / segV) * Math.PI * 2, v1 = ((j + 1) / segV) * Math.PI * 2;
                const p00 = pt(u0, v0), p10 = pt(u1, v0), p11 = pt(u1, v1), p01 = pt(u0, v1);
                tri(p00, p10, p11); tri(p00, p11, p01);
            }
        }
        const mkP = makeGeoBuilder();
        const wings = mkP(Float32Array.of(0.22, 0.78, 1.0));
        Array.of(-1, 1).forEach(s => {
            wings.addBox(s * 0.92, 0.12, 0, 0.24, 0.08, 0.05);
            wings.addBox(s * 1.02, -0.04, 0, 0.18, 0.07, 0.04);
        });
        const pos = new Float32Array(out);
        const ringP = { pos, uv: new Float32Array((pos.length / 3) * 2), nrm: computeNormals(pos), color: Float32Array.of(1.0, 0.82, 0.12) };
        return normalizeParts(Array.of(ringP, wings.build()));
    }

    function createBuiltinMonitorMesh() {
        const mkP = makeGeoBuilder();
        const body = mkP(Float32Array.of(0.24, 0.30, 0.40));
        // Основной корпус со скошенными фасками (bevel)
        body.addBox(0, 0.12, -0.02, 0.56, 0.46, 0.44);
        body.addBox(0, 0.12, -0.02, 0.60, 0.40, 0.38);
        body.addBox(0, 0.12, -0.02, 0.50, 0.50, 0.38);
        // Козырёк сверху и рамка вокруг утопленного экрана
        body.addBox(0, 0.60, 0.14, 0.58, 0.055, 0.34);
        body.addBox(-0.50, 0.12, 0.42, 0.08, 0.44, 0.07);
        body.addBox(0.50, 0.12, 0.42, 0.08, 0.44, 0.07);
        body.addBox(0, -0.32, 0.42, 0.56, 0.07, 0.07);
        // Выемка и основание снизу
        body.addBox(0, -0.44, 0, 0.28, 0.09, 0.28);
        body.addBox(0, -0.56, 0, 0.52, 0.06, 0.44);

        const vents = mkP(Float32Array.of(0.11, 0.14, 0.20));
        for (let k = -2; k <= 2; k++) {
            vents.addBox(-0.61, 0.12 + k * 0.11, -0.02, 0.02, 0.03, 0.28);
            vents.addBox(0.61, 0.12 + k * 0.11, -0.02, 0.02, 0.03, 0.28);
        }
        const rivets = mkP(Float32Array.of(0.76, 0.82, 0.90));
        Array.of(-0.42, 0.42).forEach(rx => {
            Array.of(-0.34, 0.34).forEach(rz => { rivets.addCylY(-0.63, 0.08, 0.07, 0.08, 16); });
            rivets.addBox(rx, -0.62, 0.32, 0.07, 0.05, 0.07);
            rivets.addBox(rx, -0.62, -0.32, 0.07, 0.05, 0.07);
        });
        const screen = mkP(Float32Array.of(0.06, 0.24, 0.52));
        screen.addBox(0, 0.12, 0.38, 0.41, 0.35, 0.03);
        const icon = mkP(Float32Array.of(1.0, 0.85, 0.15));
        icon.addCylZ(0.415, 0.21, 0.025, 24);
        const inner = mkP(Float32Array.of(0.06, 0.24, 0.52));
        inner.addCylZ(0.422, 0.12, 0.02, 20);
        return normalizeParts(Array.of(body.build(), vents.build(), rivets.build(), screen.build(), icon.build(), inner.build()));
    }

    function createBuiltinStarMesh() {
        const pts = 5, rOut = 0.96, rIn = 0.42, zMid = 0.36, out = new Array();
        const tri = (a, b, c) => { out.push(a.at(0),a.at(1),a.at(2), b.at(0),b.at(1),b.at(2), c.at(0),c.at(1),c.at(2)); };
        for (let i = 0; i < pts * 2; i++) {
            const a0 = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
            const a1 = ((i + 1) / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
            const rad0 = (i % 2 === 0) ? rOut : rIn;
            const rad1 = ((i + 1) % 2 === 0) ? rOut : rIn;
            const p0 = Array.of(Math.cos(a0)*rad0, -Math.sin(a0)*rad0, 0);
            const p1 = Array.of(Math.cos(a1)*rad1, -Math.sin(a1)*rad1, 0);
            tri(Array.of(0, 0, zMid), p0, p1);
            tri(Array.of(0, 0, -zMid), p1, p0);
        }
        const pos = new Float32Array(out);
        return normalizeParts(Array.of({ pos, color: Float32Array.of(1.0, 0.32, 0.24) }));
    }


    function makeGeoBuilder() {
        const makePart = (col) => {
            const out = new Array();
            const tri = (a, b, c) => { out.push(a.at(0),a.at(1),a.at(2), b.at(0),b.at(1),b.at(2), c.at(0),c.at(1),c.at(2)); };
            const addBox = (cx, cy, cz, sx, sy, sz) => {
                const x0 = cx-sx, x1 = cx+sx, y0 = cy-sy, y1 = cy+sy, z0 = cz-sz, z1 = cz+sz;
                const fs = Array.of(
                    Array.of(x0,y0,z1, x1,y0,z1, x1,y1,z1, x0,y1,z1), Array.of(x1,y0,z0, x0,y0,z0, x0,y1,z0, x1,y1,z0),
                    Array.of(x0,y1,z1, x1,y1,z1, x1,y1,z0, x0,y1,z0), Array.of(x0,y0,z0, x1,y0,z0, x1,y0,z1, x0,y0,z1),
                    Array.of(x1,y0,z1, x1,y0,z0, x1,y1,z0, x1,y1,z1), Array.of(x0,y0,z0, x0,y0,z1, x0,y1,z1, x0,y1,z0)
                );
                fs.forEach(f => {
                    tri(Array.of(f.at(0),f.at(1),f.at(2)), Array.of(f.at(3),f.at(4),f.at(5)), Array.of(f.at(6),f.at(7),f.at(8)));
                    tri(Array.of(f.at(0),f.at(1),f.at(2)), Array.of(f.at(6),f.at(7),f.at(8)), Array.of(f.at(9),f.at(10),f.at(11)));
                });
            };
            const addCylY = (cy, rBot, rTop, h, segs) => {
                const y0 = cy - h * 0.5, y1 = cy + h * 0.5;
                for (let i = 0; i < segs; i++) {
                    const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
                    const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
                    const b0 = Array.of(c0*rBot, y0, s0*rBot), b1 = Array.of(c1*rBot, y0, s1*rBot);
                    const t0 = Array.of(c0*rTop, y1, s0*rTop), t1 = Array.of(c1*rTop, y1, s1*rTop);
                    tri(b0, b1, t1); tri(b0, t1, t0);
                    tri(Array.of(0, y1, 0), t0, t1);
                    tri(Array.of(0, y0, 0), b1, b0);
                }
            };
            const addCylZ = (cz, r, depth, segs) => {
                const z0 = cz - depth * 0.5, z1 = cz + depth * 0.5;
                for (let i = 0; i < segs; i++) {
                    const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
                    const p0 = Array.of(Math.cos(a0)*r, Math.sin(a0)*r), p1 = Array.of(Math.cos(a1)*r, Math.sin(a1)*r);
                    tri(Array.of(p0.at(0),p0.at(1),z0), Array.of(p1.at(0),p1.at(1),z0), Array.of(p1.at(0),p1.at(1),z1));
                    tri(Array.of(p0.at(0),p0.at(1),z0), Array.of(p1.at(0),p1.at(1),z1), Array.of(p0.at(0),p0.at(1),z1));
                    tri(Array.of(0,0,z1), Array.of(p0.at(0),p0.at(1),z1), Array.of(p1.at(0),p1.at(1),z1));
                    tri(Array.of(0,0,z0), Array.of(p1.at(0),p1.at(1),z0), Array.of(p0.at(0),p0.at(1),z0));
                }
            };
            const addLathe = (profile, segs) => {
                for (let k = 0; k < profile.length - 1; k++) {
                    const p0 = profile.at(k), p1 = profile.at(k + 1);
                    const r0 = p0.at(0), y0 = p0.at(1), r1 = p1.at(0), y1 = p1.at(1);
                    for (let i = 0; i < segs; i++) {
                        const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
                        const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
                        const v00 = Array.of(c0*r0, y0, s0*r0), v10 = Array.of(c1*r0, y0, s1*r0);
                        const v11 = Array.of(c1*r1, y1, s1*r1), v01 = Array.of(c0*r1, y1, s0*r1);
                        tri(v00, v10, v11); tri(v00, v11, v01);
                    }
                }
            };
            const addArcHandle = (side, cx, cy, rx, ry, rTube, segU, segV) => {
                const pt = (u, v) => {
                    const au = -Math.PI * 0.5 + u * Math.PI;
                    const bx = cx + side * Math.cos(au) * rx, by = cy + Math.sin(au) * ry;
                    const nx = side * Math.cos(au), ny = Math.sin(au);
                    return Array.of(bx + nx * Math.cos(v) * rTube, by + ny * Math.cos(v) * rTube, Math.sin(v) * rTube);
                };
                for (let i = 0; i < segU; i++) {
                    const u0 = i / segU, u1 = (i + 1) / segU;
                    for (let j = 0; j < segV; j++) {
                        const v0 = (j / segV) * Math.PI * 2, v1 = ((j + 1) / segV) * Math.PI * 2;
                        tri(pt(u0, v0), pt(u1, v0), pt(u1, v1)); tri(pt(u0, v0), pt(u1, v1), pt(u0, v1));
                    }
                }
            };
            const build = () => {
                const pos = new Float32Array(out);
                return { pos, uv: new Float32Array((pos.length / 3) * 2), nrm: computeNormals(pos), color: col };
            };
            return { tri, addBox, addCylY, addCylZ, addLathe, addArcHandle, build };
        };
        return makePart;
    }

    function createBuiltinGoalPlateMesh() {
        const mkP = makeGeoBuilder();
        const metal = mkP(Float32Array.of(0.78, 0.82, 0.90));
        // Круглое ступенчатое основание и рифлёный столб
        metal.addCylY(-0.78, 0.36, 0.30, 0.09, 28);
        metal.addCylY(-0.70, 0.22, 0.16, 0.08, 28);
        metal.addCylY(-0.34, 0.065, 0.065, 0.68, 24);
        for (let r = 0; r < 5; r++) {
            metal.addCylY(-0.56 + r * 0.12, 0.082, 0.082, 0.03, 24);
        }
        // Объёмный золотой обод таблички на 32 сегмента
        const rim = mkP(Float32Array.of(1.0, 0.82, 0.14));
        rim.addCylZ(0, 0.50, 0.11, 32);
        const frontBlue = mkP(Float32Array.of(0.08, 0.44, 0.96));
        frontBlue.addCylZ(0.052, 0.41, 0.03, 32);
        const backRed = mkP(Float32Array.of(0.92, 0.18, 0.22));
        backRed.addCylZ(-0.052, 0.41, 0.03, 32);

        // Выпуклый рельеф звезды на обеих сторонах таблички
        const relief = mkP(Float32Array.of(1.0, 0.92, 0.32));
        for (let i = 0; i < 10; i++) {
            const a0 = (i / 10) * Math.PI * 2 - Math.PI * 0.5;
            const a1 = ((i + 1) / 10) * Math.PI * 2 - Math.PI * 0.5;
            const d0 = (i % 2 === 0) ? 0.28 : 0.12, d1 = ((i + 1) % 2 === 0) ? 0.28 : 0.12;
            const f0 = Array.of(Math.cos(a0)*d0, -Math.sin(a0)*d0, 0.068);
            const f1 = Array.of(Math.cos(a1)*d1, -Math.sin(a1)*d1, 0.068);
            relief.tri(Array.of(0, 0, 0.115), f0, f1);
            const b0 = Array.of(Math.cos(a0)*d0, -Math.sin(a0)*d0, -0.068);
            const b1 = Array.of(Math.cos(a1)*d1, -Math.sin(a1)*d1, -0.068);
            relief.tri(Array.of(0, 0, -0.115), b1, b0);
        }
        return normalizeParts(Array.of(metal.build(), rim.build(), frontBlue.build(), backRed.build(), relief.build()));
    }

    function createBuiltinRedRingMesh() {
        const R = 0.68, r = 0.17, segU = 26, segV = 14, out = new Array();
        const pt = (u, v) => Array.of((R + r * Math.cos(v)) * Math.cos(u), (R + r * Math.cos(v)) * Math.sin(u), r * Math.sin(v));
        const tri = (a, b, c) => { out.push(a.at(0),a.at(1),a.at(2), b.at(0),b.at(1),b.at(2), c.at(0),c.at(1),c.at(2)); };
        for (let i = 0; i < segU; i++) {
            const u0 = (i / segU) * Math.PI * 2, u1 = ((i + 1) / segU) * Math.PI * 2;
            for (let j = 0; j < segV; j++) {
                const v0 = (j / segV) * Math.PI * 2, v1 = ((j + 1) / segV) * Math.PI * 2;
                const p00 = pt(u0, v0), p10 = pt(u1, v0), p11 = pt(u1, v1), p01 = pt(u0, v1);
                tri(p00, p10, p11); tri(p00, p11, p01);
            }
        }
        const mkP = makeGeoBuilder();
        const star = mkP(Float32Array.of(1.0, 0.88, 0.22));
        for (let i = 0; i < 10; i++) {
            const a0 = (i / 10) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / 10) * Math.PI * 2 - Math.PI / 2;
            const d0 = (i % 2 === 0) ? 0.44 : 0.19, d1 = ((i + 1) % 2 === 0) ? 0.44 : 0.19;
            const p0 = Array.of(Math.cos(a0)*d0, -Math.sin(a0)*d0, 0), p1 = Array.of(Math.cos(a1)*d1, -Math.sin(a1)*d1, 0);
            star.tri(Array.of(0,0,0.12), p0, p1);
            star.tri(Array.of(0,0,-0.12), p1, p0);
        }
        const rPos = new Float32Array(out);
        const ringPart = { pos: rPos, uv: new Float32Array((rPos.length / 3) * 2), nrm: computeNormals(rPos), color: Float32Array.of(0.95, 0.14, 0.22) };
        return normalizeParts(Array.of(ringPart, star.build()));
    }

    function createBuiltinCapsuleMesh() {
        const mkP = makeGeoBuilder();
        const base = mkP(Float32Array.of(0.18, 0.44, 0.92));
        base.addCylY(-0.34, 0.56, 0.52, 0.34, 28);
        const stripe = mkP(Float32Array.of(1.0, 0.82, 0.12));
        stripe.addCylY(-0.14, 0.54, 0.54, 0.08, 28);
        const dome = mkP(Float32Array.of(0.45, 0.88, 1.0));
        dome.addCylY(0.14, 0.48, 0.32, 0.46, 28);
        const btn = mkP(Float32Array.of(0.94, 0.18, 0.22));
        btn.addCylY(0.44, 0.24, 0.20, 0.14, 24);
        return normalizeParts(Array.of(base.build(), stripe.build(), dome.build(), btn.build()));
    }

    function createBuiltinTimeStoneMesh() {
        const sides = 6, rTop = 0.30, rMid = 0.62, yTop = 0.68, yMid = 0.04, yBot = -0.72, out = new Array();
        const tri = (a, b, c) => { out.push(a.at(0),a.at(1),a.at(2), b.at(0),b.at(1),b.at(2), c.at(0),c.at(1),c.at(2)); };
        for (let i = 0; i < sides; i++) {
            const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2;
            const t0 = Array.of(Math.cos(a0)*rTop, yTop, Math.sin(a0)*rTop*0.78), t1 = Array.of(Math.cos(a1)*rTop, yTop, Math.sin(a1)*rTop*0.78);
            const m0 = Array.of(Math.cos(a0)*rMid, yMid, Math.sin(a0)*rMid*0.78), m1 = Array.of(Math.cos(a1)*rMid, yMid, Math.sin(a1)*rMid*0.78);
            tri(Array.of(0, yTop, 0), t1, t0); tri(t0, t1, m1); tri(t0, m1, m0); tri(m0, m1, Array.of(0, yBot, 0));
        }
        const pos = new Float32Array(out);
        return normalizeParts(Array.of({ pos, uv: new Float32Array((pos.length / 3) * 2), nrm: computeNormals(pos), color: Float32Array.of(0.14, 0.88, 0.98) }));
    }

    function createBuiltinCupMesh() {
        const mkP = makeGeoBuilder();
        const gold = mkP(Float32Array.of(1.0, 0.83, 0.16));
        // Плавная ваза вращения (lathe на 32 сегмента)
        const cupProfile = Array.of(
            Array.of(0.42, -0.62), Array.of(0.40, -0.54), Array.of(0.32, -0.50),
            Array.of(0.28, -0.44), Array.of(0.14, -0.34), Array.of(0.10, -0.18),
            Array.of(0.15, -0.06), Array.of(0.11, 0.02),  Array.of(0.26, 0.12),
            Array.of(0.42, 0.28),  Array.of(0.50, 0.46),  Array.of(0.54, 0.58),
            Array.of(0.48, 0.60),  Array.of(0.44, 0.46),  Array.of(0.28, 0.20),
            Array.of(0.02, 0.12)
        );
        gold.addLathe(cupProfile, 32);
        // Две изогнутые дугообразные ручки по бокам
        gold.addArcHandle(-1, -0.42, 0.36, 0.22, 0.20, 0.042, 16, 10);
        gold.addArcHandle(1, 0.42, 0.36, 0.22, 0.20, 0.042, 16, 10);

        const base = mkP(Float32Array.of(0.16, 0.20, 0.30));
        base.addCylY(-0.72, 0.56, 0.48, 0.14, 32);
        base.addCylY(-0.62, 0.44, 0.42, 0.06, 32);

        // Парящая объёмная звезда прямо над чашей
        const star = mkP(Float32Array.of(1.0, 0.94, 0.38));
        const sy = 0.86, rOut = 0.24, rIn = 0.105, zD = 0.08;
        for (let i = 0; i < 10; i++) {
            const a0 = (i / 10) * Math.PI * 2 - Math.PI * 0.5;
            const a1 = ((i + 1) / 10) * Math.PI * 2 - Math.PI * 0.5;
            const d0 = (i % 2 === 0) ? rOut : rIn, d1 = ((i + 1) % 2 === 0) ? rOut : rIn;
            const p0 = Array.of(Math.cos(a0)*d0, sy - Math.sin(a0)*d0, 0);
            const p1 = Array.of(Math.cos(a1)*d1, sy - Math.sin(a1)*d1, 0);
            star.tri(Array.of(0, sy, zD), p0, p1);
            star.tri(Array.of(0, sy, -zD), p1, p0);
        }
        return normalizeParts(Array.of(gold.build(), base.build(), star.build()));
    }

    function createBuiltinPrismMesh() {
        const sides = 10, rMid = 0.76, yTop = 0.94, yBot = -0.94, out = new Array();
        const tri = (a, b, c) => { out.push(a.at(0),a.at(1),a.at(2), b.at(0),b.at(1),b.at(2), c.at(0),c.at(1),c.at(2)); };
        for (let i = 0; i < sides; i++) {
            const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2;
            const p0 = Array.of(Math.cos(a0)*rMid, 0, Math.sin(a0)*rMid);
            const p1 = Array.of(Math.cos(a1)*rMid, 0, Math.sin(a1)*rMid);
            tri(Array.of(0, yTop, 0), p1, p0);
            tri(p0, p1, Array.of(0, yBot, 0));
        }
        const pos = new Float32Array(out);
        return normalizeParts(Array.of({ pos, uv: new Float32Array((pos.length / 3) * 2), nrm: computeNormals(pos), color: Float32Array.of(0.75, 0.45, 1.0) }));
    }

    function createBuiltinMedallionMesh() {
        const mkP = makeGeoBuilder();
        const gear = mkP(Float32Array.of(0.86, 0.90, 0.96));
        gear.addCylZ(0, 0.66, 0.14, 24);
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            gear.addBox(Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0, 0.11, 0.11, 0.10);
        }
        const rim = mkP(Float32Array.of(1.0, 0.82, 0.14));
        rim.addCylZ(0, 0.50, 0.18, 20);
        const core = mkP(Float32Array.of(0.14, 0.68, 1.0));
        core.addCylZ(0, 0.28, 0.22, 16);
        return normalizeParts(Array.of(gear.build(), rim.build(), core.build()));
    }

    function parseSTL(buf) {
        const dv = new DataView(buf);
        if (buf.byteLength > 84) {
            const triCnt = dv.getUint32(80, true);
            if (84 + triCnt * 50 === buf.byteLength) {
                const pos = new Float32Array(triCnt * 9);
                let off = 84;
                for (let t = 0; t < triCnt; t++) {
                    off += 12;
                    for (let k = 0; k < 9; k++) { pos.fill(dv.getFloat32(off, true), t*9+k, t*9+k+1); off += 4; }
                    off += 2;
                }
                return normalizeParts(Array.of({ pos, color: Float32Array.of(0.86, 0.9, 0.96) }));
            }
        }
        const txt = new TextDecoder().decode(buf), nums = new Array();
        const re = /vertex\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)/g;
        let m;
        while ((m = re.exec(txt)) !== null) nums.push(parseFloat(m.at(1)), parseFloat(m.at(2)), parseFloat(m.at(3)));
        return normalizeParts(Array.of({ pos: new Float32Array(nums), color: Float32Array.of(0.86, 0.9, 0.96) }));
    }

    function parseOBJ(buf) {
        const txt = new TextDecoder().decode(buf);
        const V = Array.of(Array.of(0,0,0)), VT = Array.of(Array.of(0,0)), VN = Array.of(Array.of(0,1,0));
        const outP = new Array(), outT = new Array(), outN = new Array();
        let hasVN = false;
        const lines = txt.split(/\r?\n/);
        for (let l = 0; l < lines.length; l++) {
            const ln = lines.at(l).trim();
            if (!ln || ln.charCodeAt(0) === 35) continue;
            const sp = ln.split(/\s+/);
            const cmd = sp.at(0);
            if (cmd === 'v') V.push(Array.of(parseFloat(sp.at(1))||0, parseFloat(sp.at(2))||0, parseFloat(sp.at(3))||0));
            else if (cmd === 'vt') VT.push(Array.of(parseFloat(sp.at(1))||0, 1.0 - (parseFloat(sp.at(2))||0)));
            else if (cmd === 'vn') VN.push(Array.of(parseFloat(sp.at(1))||0, parseFloat(sp.at(2))||0, parseFloat(sp.at(3))||0));
            else if (cmd === 'f' && sp.length >= 4) {
                const nVerts = sp.length - 1;
                const faceV = new Array();
                for (let j = 0; j < nVerts; j++) {
                    const parts = sp.at(j + 1).split('/');
                    let vi = parseInt(parts.at(0), 10) || 0;
                    let ti = parts.length > 1 && parts.at(1) !== '' ? (parseInt(parts.at(1), 10) || 0) : 0;
                    let ni = parts.length > 2 && parts.at(2) !== '' ? (parseInt(parts.at(2), 10) || 0) : 0;
                    if (vi < 0) vi = V.length + vi;
                    if (ti < 0) ti = VT.length + ti;
                    if (ni < 0) ni = VN.length + ni;
                    const vnItem = ni > 0 ? VN.at(ni) : null;
                    if (vnItem) hasVN = true;
                    faceV.push({ p: V.at(vi) || V.at(0), t: VT.at(ti) || VT.at(0), n: vnItem });
                }
                const v0 = faceV.at(0);
                for (let k = 1; k < nVerts - 1; k++) {
                    const v1 = faceV.at(k), v2 = faceV.at(k + 1);
                    outP.push(v0.p.at(0), v0.p.at(1), v0.p.at(2), v1.p.at(0), v1.p.at(1), v1.p.at(2), v2.p.at(0), v2.p.at(1), v2.p.at(2));
                    outT.push(v0.t.at(0), v0.t.at(1), v1.t.at(0), v1.t.at(1), v2.t.at(0), v2.t.at(1));
                    if (v0.n && v1.n && v2.n) {
                        outN.push(v0.n.at(0), v0.n.at(1), v0.n.at(2), v1.n.at(0), v1.n.at(1), v1.n.at(2), v2.n.at(0), v2.n.at(1), v2.n.at(2));
                    }
                }
            }
        }
        const okNrm = (hasVN && outN.length === outP.length) ? new Float32Array(outN) : null;
        return normalizeParts(Array.of({ pos: new Float32Array(outP), uv: new Float32Array(outT), nrm: okNrm, color: Float32Array.of(0.88, 0.91, 0.96) }));
    }

    function mulMat4(a, b) {
        const o = new Float32Array(16);
        for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
            o.fill(a.at(r)*b.at(c*4) + a.at(4+r)*b.at(c*4+1) + a.at(8+r)*b.at(c*4+2) + a.at(12+r)*b.at(c*4+3), c*4+r, c*4+r+1);
        }
        return o;
    }

    function trsToMat4(n) {
        if (n.matrix) return new Float32Array(n.matrix);
        const t = n.translation || Array.of(0,0,0), q = n.rotation || Array.of(0,0,0,1), s = n.scale || Array.of(1,1,1);
        const x = q.at(0), y = q.at(1), z = q.at(2), w = q.at(3), x2 = x+x, y2 = y+y, z2 = z+z;
        const xx = x*x2, xy = x*y2, xz = x*z2, yy = y*y2, yz = y*z2, zz = z*z2, wx = w*x2, wy = w*y2, wz = w*z2;
        const s0 = s.at(0), s1 = s.at(1), s2 = s.at(2);
        return Float32Array.of(
            (1-(yy+zz))*s0, (xy+wz)*s0, (xz-wy)*s0, 0,
            (xy-wz)*s1, (1-(xx+zz))*s1, (yz+wx)*s1, 0,
            (xz+wy)*s2, (yz-wx)*s2, (1-(xx+yy))*s2, 0,
            t.at(0), t.at(1), t.at(2), 1
        );
    }

    async function parseGLB(buf) {
        const dv = new DataView(buf);
        if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('Invalid GLB');
        const jsonLen = dv.getUint32(12, true);
        const gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen)));
        const binChunk = new Uint8Array(buf, 20 + jsonLen + 8, dv.getUint32(20 + jsonLen, true));

        const readAcc = (accIdx) => {
            if (accIdx === undefined || accIdx === null) return null;
            const acc = gltf.accessors.at(accIdx), bv = gltf.bufferViews.at(acc.bufferView);
            const comps = ({ SCALAR:1, VEC2:2, VEC3:3, VEC4:4 })[acc.type] || 3;
            const bpc = ({ 5120:1, 5121:1, 5122:2, 5123:2, 5125:4, 5126:4 })[acc.componentType] || 4;
            const out = (acc.componentType === 5126) ? new Float32Array(acc.count * comps) : new Uint32Array(acc.count * comps);
            const view = new DataView(buf, binChunk.byteOffset + (bv.byteOffset || 0) + (acc.byteOffset || 0));
            const stride = bv.byteStride || (comps * bpc);
            for (let i = 0; i < acc.count; i++) {
                for (let c = 0; c < comps; c++) {
                    const o = i * stride + c * bpc;
                    let v = 0;
                    if (acc.componentType === 5126) v = view.getFloat32(o, true);
                    else if (acc.componentType === 5123) v = view.getUint16(o, true);
                    else if (acc.componentType === 5125) v = view.getUint32(o, true);
                    else if (acc.componentType === 5121) v = view.getUint8(o);
                    out.fill(v, i*comps+c, i*comps+c+1);
                }
            }
            return out;
        };

        const imgCache = new Map();
        const loadTex = async (matIdx) => {
            const defCol = Float32Array.of(0.9, 0.92, 0.96);
            if (matIdx === undefined) return { color: defCol, img: null };
            const mat = (gltf.materials || new Array()).at(matIdx) || {};
            const pbr = mat.pbrMetallicRoughness || {};
            const bf = pbr.baseColorFactor || Array.of(1, 1, 1, 1);
            const col = Float32Array.of(bf.at(0), bf.at(1), bf.at(2));
            if (!pbr.baseColorTexture) return { color: col, img: null };
            const tex = (gltf.textures || new Array()).at(pbr.baseColorTexture.index);
            const sIdx = tex ? tex.source : undefined;
            if (sIdx === undefined) return { color: col, img: null };
            if (imgCache.has(sIdx)) return { color: col, img: imgCache.get(sIdx) };
            const imDef = (gltf.images || new Array()).at(sIdx);
            if (imDef && imDef.bufferView !== undefined) {
                const bv = gltf.bufferViews.at(imDef.bufferView);
                const blob = new Blob(Array.of(binChunk.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength)), { type: imDef.mimeType || 'image/png' });
                const pot = toPotCanvas(await createImageBitmap(blob));
                imgCache.set(sIdx, pot);
                return { color: col, img: pot };
            }
            return { color: col, img: null };
        };

        const parts = new Array();
        const extractMesh = async (mIdx, wm) => {
            const mesh = (gltf.meshes || new Array()).at(mIdx);
            if (!mesh) return;
            for (const prim of (mesh.primitives || new Array())) {
                if (prim.mode !== undefined && prim.mode !== 4) continue;
                const pR = readAcc(prim.attributes.POSITION);
                if (!pR) continue;
                const nR = readAcc(prim.attributes.NORMAL), tR = readAcc(prim.attributes.TEXCOORD_0), ix = readAcc(prim.indices);
                const cnt = ix ? ix.length : (pR.length / 3);
                const pos = new Float32Array(cnt * 3), uv = new Float32Array(cnt * 2), nrm = nR ? new Float32Array(cnt * 3) : null;
                for (let k = 0; k < cnt; k++) {
                    const vi = ix ? ix.at(k) : k;
                    const x = pR.at(vi*3), y = pR.at(vi*3+1), z = pR.at(vi*3+2);
                    pos.set(Array.of(
                        wm.at(0)*x + wm.at(4)*y + wm.at(8)*z  + wm.at(12),
                        wm.at(1)*x + wm.at(5)*y + wm.at(9)*z  + wm.at(13),
                        wm.at(2)*x + wm.at(6)*y + wm.at(10)*z + wm.at(14)
                    ), k*3);
                    if (tR) uv.set(Array.of(tR.at(vi*2), tR.at(vi*2+1)), k*2);
                    if (nrm) {
                        const nx = nR.at(vi*3), ny = nR.at(vi*3+1), nz = nR.at(vi*3+2);
                        const rx = wm.at(0)*nx + wm.at(4)*ny + wm.at(8)*nz;
                        const ry = wm.at(1)*nx + wm.at(5)*ny + wm.at(9)*nz;
                        const rz = wm.at(2)*nx + wm.at(6)*ny + wm.at(10)*nz;
                        const rl = Math.hypot(rx, ry, rz) || 1;
                        nrm.set(Array.of(rx/rl, ry/rl, rz/rl), k*3);
                    }
                }
                const md = await loadTex(prim.material);
                parts.push({ pos, uv, nrm, color: md.color, img: md.img });
            }
        };

        const walk = async (ni, pm) => {
            const nd = (gltf.nodes || new Array()).at(ni);
            if (!nd) return;
            const m = mulMat4(pm, trsToMat4(nd));
            if (nd.mesh !== undefined) await extractMesh(nd.mesh, m);
            for (const ch of (nd.children || new Array())) await walk(ch, m);
        };
        const idMat = Float32Array.of(1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1);
        const scObj = (gltf.scenes || new Array()).at(gltf.scene || 0);
        const roots = scObj ? scObj.nodes : (gltf.nodes || new Array()).map((_, i) => i);
        for (const r of (roots || new Array())) await walk(r, idMat);
        return normalizeParts(parts);
    }

    const VS = Array.of(
        'attribute vec3 aPos; attribute vec3 aNrm; attribute vec2 aUv;',
        'uniform mat4 uProj; uniform mat4 uView;',
        'varying vec3 vN; varying vec3 vV; varying vec2 vUv;',
        'void main() {',
        '  vec4 wp = uView * vec4(aPos, 1.0);',
        '  vV = -wp.xyz;',
        '  vN = normalize((uView * vec4(aNrm, 0.0)).xyz);',
        '  vUv = aUv;',
        '  gl_Position = uProj * wp;',
        '}'
    ).join('\n');

    const FS = Array.of(
        'precision mediump float;',
        'varying vec3 vN; varying vec3 vV; varying vec2 vUv;',
        'uniform vec3 uBaseCol; uniform int uHasTex; uniform int uFlipUv; uniform int uMatMode;',
        'uniform sampler2D uTex; uniform float uTime;',
        'void main() {',
        '  vec3 N = normalize(vN); vec3 V = normalize(vV);',
        '  if (dot(N, V) < 0.0) N = -N;',
        '  vec3 L1 = normalize(vec3(0.55, 0.75, 0.85)); vec3 L2 = normalize(vec3(-0.6, -0.25, 0.5));',
        '  float diff = max(dot(N, L1), 0.0) * 0.76 + max(dot(N, L2), 0.0) * 0.30 + 0.28;',
        '  float spec = pow(max(dot(N, normalize(L1 + V)), 0.0), uMatMode == 2 ? 48.0 : 26.0);',
        '  float rim = pow(1.0 - max(dot(N, V), 0.0), 2.5);',
        '  vec3 col = uBaseCol;',
        '  vec2 tuv = (uFlipUv == 1) ? vec2(vUv.x, 1.0 - vUv.y) : vUv;',
        '  if (uHasTex == 1 && (uMatMode == 0 || uMatMode == 7)) col = texture2D(uTex, tuv).rgb;',
        '  if (uMatMode == 7) { col = mix(col, vec3(0.2, 0.95, 0.55), 0.32) * diff + vec3(0.3, 1.0, 0.65) * rim * 0.5; }',
        '  else if (uMatMode == 1) { col = vec3(1.0, 0.78, 0.14) * diff + vec3(1.0, 0.95, 0.6) * spec * 0.95 + vec3(0.95, 0.6, 0.05) * rim * 0.45; }',
        '  else if (uMatMode == 2) { col = vec3(0.1, 0.88, 0.46) * (diff * 0.85) + vec3(0.75, 1.0, 0.88) * spec * 1.15 + vec3(0.25, 1.0, 0.7) * rim * 0.7; }',
        '  else if (uMatMode == 3) { col = mix(vec3(0.32, 0.38, 0.48), vec3(0.92, 0.96, 1.0), clamp(N.y * 0.5 + 0.5, 0.0, 1.0)) * diff + vec3(1.0) * spec * 1.1; }',
        '  else if (uMatMode == 4) { float scan = 0.82 + 0.18 * sin(vV.y * 28.0 - uTime * 5.0); gl_FragColor = vec4(vec3(0.15, 0.78, 1.0) * (rim * 1.3 + 0.32) * scan + vec3(0.6, 0.95, 1.0) * spec, 0.86); return; }',
        '  else if (uMatMode == 5) { vec3 texc = (uHasTex == 1) ? texture2D(uTex, tuv).rgb : col; float lum = dot(texc, vec3(0.299, 0.587, 0.114)); col = mix(texc, vec3(1.0, 0.84, 0.18) * (lum * 1.35 + 0.15), 0.72) * diff + vec3(1.0, 0.95, 0.55) * (spec * 0.85 + rim * 0.55); }',
        '  else if (uMatMode == 6) { vec3 texc = (uHasTex == 1) ? texture2D(uTex, tuv).rgb : col; vec3 rb = 0.55 + 0.45 * cos(uTime * 3.2 + vV.xyx * 2.2 + vec3(0.0, 2.1, 4.2)); col = mix(texc, rb * 1.25, 0.58) * diff + rb * rim * 0.75 + vec3(1.0) * spec * 0.9; }',
        '  else if (uMatMode == 8) { col = vec3(0.03, 0.05, 0.09) + vec3(0.28, 0.42, 0.78) * pow(rim, 1.8) * 0.85; }',
        '  else { col = col * diff + vec3(1.0) * spec * 0.22 + col * rim * 0.14; }',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'
    ).join('\n');

    const MAT_MAP = { original: 0, gold: 1, emerald: 2, chrome: 3, holo: 4, super_tint: 5, hyper_tint: 6, emerald_tint: 7, silhouette: 8 };

    window.mountSgl3dViewer = function(hostEl, opts) {
        if (!hostEl) return null;
        hostEl.innerHTML = '';
        const cvs = document.createElement('canvas');
        cvs.style.cssText = 'width:100%;height:100%;display:block;cursor:grab;';
        hostEl.appendChild(cvs);
        const gl = cvs.getContext('webgl', { alpha: true, antialias: true });
        if (!gl) return null;

        const comp = (t, s) => {
            const sh = gl.createShader(t);
            gl.shaderSource(sh, s);
            gl.compileShader(sh);
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error('SGL Shader:', gl.getShaderInfoLog(sh));
            return sh;
        };
        const prog = gl.createProgram();
        gl.attachShader(prog, comp(gl.VERTEX_SHADER, VS));
        gl.attachShader(prog, comp(gl.FRAGMENT_SHADER, FS));
        gl.linkProgram(prog);

        const aPos = gl.getAttribLocation(prog, 'aPos'), aNrm = gl.getAttribLocation(prog, 'aNrm'), aUv = gl.getAttribLocation(prog, 'aUv');
        const uProj = gl.getUniformLocation(prog, 'uProj'), uView = gl.getUniformLocation(prog, 'uView');
        const uBaseCol = gl.getUniformLocation(prog, 'uBaseCol'), uHasTex = gl.getUniformLocation(prog, 'uHasTex');
        const uFlipUv = gl.getUniformLocation(prog, 'uFlipUv'), uMatMode = gl.getUniformLocation(prog, 'uMatMode');
        const uTime = gl.getUniformLocation(prog, 'uTime');

        const makeGlTex = (imgLike) => {
            const tx = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tx);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, toPotCanvas(imgLike));
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.generateMipmap(gl.TEXTURE_2D);
            return tx;
        };

        const whiteTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, whiteTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, Uint8Array.of(255, 255, 255, 255));

        let customTex = null, gpuParts = new Array();
        let state = Object.assign({ url: '', texUrl: '', flipUv: false, material: 'original', speed: 1.0, zoom: 1.0, interactive: true }, opts || {});
        let rotY = 0.45, rotX = 0.18, dragging = false, dead = false, startT = performance.now();

        function loadCustomTex(tUrl) {
            if (!tUrl) { customTex = null; return; }
            const im = new Image();
            im.crossOrigin = 'anonymous';
            im.onload = () => { if (!dead) customTex = makeGlTex(im); };
            im.src = tUrl;
        }

        function upload(parts) {
            if (state.pedestal) parts = Array.of(...parts, ...addOctaPedestalPart());
            gpuParts = parts.map(p => {
                const mkB = (arr) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW); return b; };
                return { bPos: mkB(p.pos), bNrm: mkB(p.nrm), bUv: mkB(p.uv), count: p.pos.length / 3, color: p.color || Float32Array.of(0.88, 0.91, 0.96), tex: p.img ? makeGlTex(p.img) : null };
            });
        }

        async function loadSrc(url) {
            try {
                if (url === 'builtin_super_emerald') { upload(createBuiltinEmeraldMesh(true)); return; }
                if (!url || url === 'builtin_emerald') { upload(createBuiltinEmeraldMesh(false)); return; }
                if (url === 'builtin_ring') { upload(createBuiltinRingMesh()); return; }
                if (url === 'builtin_monitor') { upload(createBuiltinMonitorMesh()); return; }
                if (url === 'builtin_starpost') { upload(createBuiltinStarMesh()); return; }
                if (url === 'builtin_goalplate') { upload(createBuiltinGoalPlateMesh()); return; }
                if (url === 'builtin_redring') { upload(createBuiltinRedRingMesh()); return; }
                if (url === 'builtin_capsule') { upload(createBuiltinCapsuleMesh()); return; }
                if (url === 'builtin_timestone') { upload(createBuiltinTimeStoneMesh()); return; }
                if (url === 'builtin_cup') { upload(createBuiltinCupMesh()); return; }
                if (url === 'builtin_prism') { upload(createBuiltinPrismMesh()); return; }
                if (url === 'builtin_medallion') { upload(createBuiltinMedallionMesh()); return; }
                const res = await fetch(url);
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const buf = await res.arrayBuffer();
                const cleanUrl = String(url).split('?').at(0).toLowerCase();
                if (cleanUrl.endsWith('.glb')) upload(await parseGLB(buf));
                else if (cleanUrl.endsWith('.obj')) upload(parseOBJ(buf));
                else if (cleanUrl.endsWith('.stl')) upload(parseSTL(buf));
                else upload(createBuiltinEmeraldMesh());
            } catch (err) {
                console.error('SGL 3D Load Error:', err);
                upload(createBuiltinEmeraldMesh());
            }
        }

        if (state.interactive !== false) {
            let lx = 0, ly = 0;
            cvs.onpointerdown = (e) => {
                if (document.body.classList.contains('hud-editing')) return;
                e.stopPropagation(); dragging = true; lx = e.clientX; ly = e.clientY; cvs.setPointerCapture(e.pointerId);
            };
            cvs.onpointermove = (e) => {
                if (!dragging) return;
                rotY += (e.clientX - lx) * 0.012; rotX = Math.max(-1.3, Math.min(1.3, rotX + (e.clientY - ly) * 0.012));
                lx = e.clientX; ly = e.clientY;
            };
            cvs.onpointerup = () => { dragging = false; };
            cvs.onwheel = (e) => { e.preventDefault(); state.zoom = Math.max(0.5, Math.min(2.4, Number(state.zoom || 1) + (e.deltaY < 0 ? 0.1 : -0.1))); };
        }

        let lastDraw = 0;
        function frame(now) {
            if (dead || !cvs.isConnected) return;
            if (document.hidden || cvs.offsetParent === null) { setTimeout(() => { if (!dead && cvs.isConnected) requestAnimationFrame(frame); }, 450); return; }
            requestAnimationFrame(frame);
            const d3Int = (typeof window.SGL_GET_FPS === 'function') ? window.SGL_GET_FPS('3d') : 16.6;
            if (d3Int > 20 && now - lastDraw < d3Int - 3) return;
            lastDraw = now;
            if (document.hidden) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
            const w = Math.max(40, Math.floor((hostEl.clientWidth || 220) * dpr));
            const h = Math.max(40, Math.floor((hostEl.clientHeight || 220) * dpr));
            if (cvs.width !== w || cvs.height !== h) { cvs.width = w; cvs.height = h; }
            if (!dragging && Number(state.speed) > 0) {
                let step = 0.015 * Number(state.speed);
                if (state.url === 'builtin_goalplate') {
                    const cyc = ((now - startT) % 5200);
                    if (cyc < 680) {
                        step = 0.28;
                        if (cyc < 55 && typeof state.onSpinBurst === 'function') state.onSpinBurst();
                    }
                }
                rotY += step;
            }

            gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.useProgram(prog);

            const f = 1.0 / Math.tan((42 * Math.PI) / 360), nf = 1 / (0.1 - 30), dist = 4.45 / Math.max(0.35, Number(state.zoom || 1));
            const cx = Math.cos(rotX), sx = Math.sin(rotX), cy = Math.cos(rotY), sy = Math.sin(rotY);
            gl.uniformMatrix4fv(uProj, false, Float32Array.of(f/(w/h),0,0,0, 0,f,0,0, 0,0,30.1*nf,-1, 0,0,6*nf,0));
            gl.uniformMatrix4fv(uView, false, Float32Array.of(cy,sx*sy,-cx*sy,0, 0,cx,sx,0, sy,-sx*cy,cx*cy,0, 0,0,-dist,1));
            gl.uniform1i(uMatMode, MAT_MAP[state.material] ?? 0);
            gl.uniform1i(uFlipUv, state.flipUv ? 1 : 0);
            gl.uniform1f(uTime, (now - startT) * 0.001);

            gpuParts.forEach(gp => {
                gl.bindBuffer(gl.ARRAY_BUFFER, gp.bPos); gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
                gl.bindBuffer(gl.ARRAY_BUFFER, gp.bNrm); gl.enableVertexAttribArray(aNrm); gl.vertexAttribPointer(aNrm, 3, gl.FLOAT, false, 0, 0);
                if (aUv >= 0) { gl.bindBuffer(gl.ARRAY_BUFFER, gp.bUv); gl.enableVertexAttribArray(aUv); gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0); }
                const activeTx = customTex || gp.tex;
                gl.uniform3fv(uBaseCol, activeTx ? Float32Array.of(1, 1, 1) : gp.color);
                gl.uniform1i(uHasTex, activeTx ? 1 : 0);
                gl.bindTexture(gl.TEXTURE_2D, activeTx || whiteTex);
                gl.drawArrays(gl.TRIANGLES, 0, gp.count);
            });
        }

        loadSrc(state.url);
        if (state.texUrl) loadCustomTex(state.texUrl);
        requestAnimationFrame(frame);

        return {
            update(nx) {
                const ch = nx.url !== undefined && nx.url !== state.url;
                const tch = nx.texUrl !== undefined && nx.texUrl !== state.texUrl;
                Object.assign(state, nx);
                if (ch) loadSrc(state.url);
                if (tch) loadCustomTex(state.texUrl);
            },
            destroy() { dead = true; }
        };
    };
})();
