(function () {
    const el = document.getElementById('ascii-space');
    if (!el) return;

    const ramp = [' ', '.', ':', '-', '=', '+', '*', '#', '%', '@'];
    const tailChars = ['.', '+', '*', '#'];
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    let cols = 0, rows = 0, charW = 0, lineH = 0;
    let scene = [];
    let twinkles = [];
    let shooters = [];
    let nextShoot = 0;
    let last = 0;
    let planetCx = 0, planetCy = 0, planetRx = 0, planetRy = 0;
    let moonX = 0, moonY = 0, moonR = 0;
    let planet2Cx = 0, planet2Cy = 0, planet2Rx = 0, planet2Ry = 0;
    let ringA = 0;
    let ringParticles = [];

    function measure() {
        el.textContent = 'W';
        const range = document.createRange();
        range.selectNodeContents(el);
        const rect = range.getBoundingClientRect();
        charW = rect.width;
        lineH = rect.height;
        el.textContent = '';
    }

    function put(grid, x, y, c) {
        x = Math.round(x);
        y = Math.round(y);
        if (x >= 0 && x < cols && y >= 0 && y < rows) grid[y * cols + x] = c;
    }

    function shade(i) {
        return ramp[Math.min(ramp.length - 1, Math.max(0, i))];
    }

    const TILT = -0.12;
    const T_COS = Math.cos(TILT);
    const T_SIN = Math.sin(TILT);
    const RING_SPEED = 0.3;

    function rotate(u, v) {
        return { dx: u * T_COS - v * T_SIN, dy: u * T_SIN + v * T_COS };
    }

    function unrotate(dx, dy) {
        return { u: dx * T_COS + dy * T_SIN, v: -dx * T_SIN + dy * T_COS };
    }

    function inDisc(x, y, pad) {
        const p = pad || 0;
        const dx = (x - planetCx) / (planetRx + p);
        const dy = (y - planetCy) / (planetRy + p);
        return dx * dx + dy * dy <= 1;
    }

    function inDisc2(x, y, pad) {
        const p = pad || 0;
        const dx = (x - planet2Cx) / (planet2Rx + p);
        const dy = (y - planet2Cy) / (planet2Ry + p);
        return dx * dx + dy * dy <= 1;
    }

    function buildScene() {
        const grid = new Array(cols * rows).fill(' ');

        const aspect = charW / lineH;
        planetRy = Math.max(6, Math.min(cols * 0.06, rows * 0.2));
        planetRx = planetRy / aspect;
        ringA = planetRx * 2.5;
        planetCx = Math.min(cols * 0.72, cols - ringA - 3);
        planetCy = rows * 0.56;

        moonX = cols * 0.14;
        moonY = rows * 0.2;
        moonR = Math.max(3, Math.min(cols, rows) * 0.06);

        planet2Ry = Math.max(3, Math.min(cols * 0.045, rows * 0.12));
        planet2Rx = planet2Ry / aspect;
        planet2Cx = cols * 0.45;
        planet2Cy = rows * 0.82;

        const lx = -0.6, ly = -0.8;
        const llen = Math.hypot(lx, ly);

        function discDist(x, y) {
            const dx = (x - planetCx) / planetRx;
            const dy = (y - planetCy) / planetRy;
            return Math.hypot(dx, dy);
        }

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                if (inDisc(x, y)) continue;
                const dist = discDist(x, y);
                if (dist > 1.1) continue;
                const dx = x - planetCx, dy = y - planetCy;
                const diff = (dx / (planetRx * planetRx) * lx + dy / (planetRy * planetRy) * ly) / llen;
                if (diff > 0.25) put(grid, x, y, dist > 1.06 ? '.' : ':');
            }
        }

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                if (!inDisc(x, y)) continue;
                const dist = discDist(x, y);
                const dx = x - planetCx, dy = y - planetCy;
                const nx = dx / (planetRx * planetRx);
                const ny = dy / (planetRy * planetRy);
                const nlen = Math.hypot(nx, ny) || 1;
                const diff = Math.max(0, (nx * lx + ny * ly) / (nlen * llen));
                let b = diff * (1 - dist * dist * 0.3);
                b *= 0.8 + 0.2 * Math.sin((dy / planetRy) * 6.5 + 1.2);
                put(grid, x, y, shade(2 + Math.round(b * (ramp.length - 3))));
            }
        }

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const dx = x - moonX, dy = y - moonY;
                if (dx * dx + dy * dy <= moonR * moonR) {
                    const ex = dx - moonR * 0.55;
                    if (ex * ex + dy * dy > (moonR * 0.6) * (moonR * 0.6)) {
                        put(grid, x, y, shade(Math.floor((1 - (dx + moonR) / (2 * moonR)) * (ramp.length - 2))));
                    }
                }
            }
        }

        for (let i = 0; i < cols * rows * 0.045; i++) {
            const x = Math.random() * cols;
            const y = Math.random() * rows;
            if (inDisc(x, y, 2)) continue;
            if (inDisc2(x, y, 2)) continue;
            const mdx = x - moonX, mdy = y - moonY;
            if (mdx * mdx + mdy * mdy < (moonR + 2) * (moonR + 2)) continue;
            const c = Math.random() < 0.12 ? (Math.random() < 0.5 ? '*' : '+') : (Math.random() < 0.6 ? '.' : ':');
            put(grid, x, y, c);
        }

        return grid;
    }

    function buildTwinkles() {
        twinkles = [];
        let guard = 0;
        while (twinkles.length < 14 && guard++ < 900) {
            const x = Math.random() * cols;
            const y = Math.random() * rows;
            const pdx = (x - planetCx) / (planetRx + 2);
            const pdy = (y - planetCy) / (planetRy + 2);
            if (pdx * pdx + pdy * pdy <= 1) continue;
            const p2dx = (x - planet2Cx) / (planet2Rx + 2);
            const p2dy = (y - planet2Cy) / (planet2Ry + 2);
            if (p2dx * p2dx + p2dy * p2dy <= 1) continue;
            const mdx = x - moonX, mdy = y - moonY;
            if (mdx * mdx + mdy * mdy < (moonR + 2) * (moonR + 2)) continue;
            twinkles.push({ x, y, phase: Math.random() * Math.PI * 2, speed: 1.5 + Math.random() * 3 });
        }
    }

    function drawRing(grid, b, scale, frontChar, backChar, frontOnDisc, frontAtBottom) {
        const a = ringA * scale;
        const bS = Math.max(0.5, b * scale);
        for (let v = Math.ceil(-bS); v <= Math.floor(bS); v++) {
            const t = v / bS;
            const half = a * Math.sqrt(Math.max(0, 1 - t * t));
            for (const s of [-1, 1]) {
                const p = rotate(s * half, v);
                const x = Math.round(planetCx + p.dx);
                const y = Math.round(planetCy + p.dy);
                const onDisc = inDisc(x, y);
                if ((v >= 0) === frontAtBottom) {
                    if (!onDisc || frontOnDisc) {
                        put(grid, x, y, frontChar);
                        put(grid, x - s, y, frontChar);
                        put(grid, x + s, y, frontChar);
                    }
                } else if (!onDisc) {
                    put(grid, x, y, backChar);
                    put(grid, x - s, y, backChar);
                    put(grid, x + s, y, backChar);
                }
            }
        }
    }

    function drawRings(grid, b, frontAtBottom) {
        drawRing(grid, b, 0.82, '.', '.', true, frontAtBottom);
        drawRing(grid, b, 1, '.', '.', true, frontAtBottom);
        drawRing(grid, b, 1.18, '.', '.', true, frontAtBottom);
    }

    function ringPhase(t) {
        return t * 0.02;
    }

    function tipPhase(t) {
        return t * 0.3;
    }

    function buildRingParticles() {
        ringParticles = [];
        const groups = [
            { n: 10, scale: 1, head: '*', offset: 0 },
            { n: 3, scale: 0.82, head: '+', offset: 0.6 },
            { n: 3, scale: 1.18, head: '+', offset: 2.4 }
        ];
        for (const g of groups) {
            for (let i = 0; i < g.n; i++) {
                ringParticles.push({
                    scale: g.scale,
                    head: g.head,
                    angle: g.offset + i * ((Math.PI * 2) / g.n)
                });
            }
        }
    }

    function drawRingParticles(grid, dt, bBase, frontAtBottom) {
        for (const p of ringParticles) {
            p.angle += RING_SPEED * dt;
            if (p.angle > Math.PI * 2) p.angle -= Math.PI * 2;
            const a = ringA * p.scale;
            const b = bBase * p.scale;
            for (let k = 0; k < 3; k++) {
                const ang = p.angle - k * 0.07;
                const rp = rotate(Math.cos(ang) * a, Math.sin(ang) * b);
                const px = planetCx + rp.dx;
                const py = planetCy + rp.dy;
                const front = (Math.sin(ang) >= 0) === frontAtBottom;
                if (!front && inDisc(px, py)) continue;
                put(grid, px, py, k === 0 ? p.head : (k === 1 ? ':' : '.'));
            }
        }
    }

    const P2_SPIN = 0.4;
    const P2_STORM = 2.1;

    function drawPlanet2(grid, t) {
        const lx = -0.6, ly = -0.8;
        const llen = Math.hypot(lx, ly);
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                if (!inDisc2(x, y)) continue;
                const dx = x - planet2Cx, dy = y - planet2Cy;
                const nx = dx / (planet2Rx * planet2Rx);
                const ny = dy / (planet2Ry * planet2Ry);
                const nlen = Math.hypot(nx, ny) || 1;
                const dist2 = (dx / planet2Rx) * (dx / planet2Rx) + (dy / planet2Ry) * (dy / planet2Ry);
                const diff = Math.max(0, (nx * lx + ny * ly) / (nlen * llen));
                const u = Math.atan2(dy / planet2Ry, dx / planet2Rx) - t * P2_SPIN;
                const lat = dy / planet2Ry;
                const w = Math.atan2(Math.sin(u - P2_STORM), Math.cos(u - P2_STORM));
                const spot = Math.exp(-(w / 0.4) * (w / 0.4)) * (1 - Math.abs(lat) * 0.7);
                const tex = 0.85
                    + 0.18 * Math.sin(u * 5 + 0.5 * Math.sin(lat * 3))
                    + 0.12 * Math.sin(u * 11 + 2.1 + lat)
                    + 0.1 * Math.cos((u + 1.4) * 2 + lat * 2.2) * Math.sin(lat * 4 + 1.7)
                    - 0.3 * spot;
                const b = diff * (1 - dist2 * 0.3) * tex;
                put(grid, x, y, shade(2 + Math.round(b * (ramp.length - 3))));
            }
        }
    }

    function resize() {
        const w = el.clientWidth;
        const h = el.clientHeight;
        if (charW <= 0 || lineH <= 0 || w === 0 || h === 0) return;
        measure();
        if (charW <= 0 || lineH <= 0) return;
        cols = Math.max(20, Math.floor(w / charW));
        rows = Math.max(12, Math.floor(h / lineH));
        scene = buildScene();
        buildTwinkles();
        buildRingParticles();
        shooters = [];
        nextShoot = 2 + Math.random() * 3;
    }

    function spawnShooter() {
        shooters.push({
            x: cols * (0.15 + Math.random() * 0.45),
            y: 1 + Math.random() * rows * 0.3,
            vx: 1 + Math.random() * 0.6,
            vy: 0.6 + Math.random() * 0.6,
            trail: [],
            life: 0
        });
    }

    function drawShooters(grid, dt) {
        for (let i = shooters.length - 1; i >= 0; i--) {
            const shooter = shooters[i];
            shooter.x += shooter.vx;
            shooter.y += shooter.vy;
            shooter.life += dt;
            shooter.trail.push({ x: Math.round(shooter.x), y: Math.round(shooter.y) });
            if (shooter.trail.length > 6) shooter.trail.shift();
            for (let j = 0; j < shooter.trail.length; j++) {
                const t = shooter.trail[j];
                put(grid, t.x, t.y, tailChars[Math.min(j, tailChars.length - 1)]);
            }
            put(grid, shooter.x, shooter.y, '@');
            if (shooter.x > cols + 4 || shooter.y > rows + 4 || shooter.life > 2.5) {
                shooters.splice(i, 1);
                nextShoot = 3 + Math.random() * 3;
            }
        }
    }

    function gridToText(grid) {
        let out = '';
        for (let y = 0; y < rows; y++) out += grid.slice(y * cols, (y + 1) * cols).join('') + '\n';
        return out;
    }

    function frame(now) {
        const dt = last ? (now - last) / 1000 : 0.066;
        last = now;
        const t = now / 1000;

        const grid = scene.slice();

        const th = tipPhase(t);
        const b = planetRy * 0.85 * (0.35 + 0.65 * Math.cos(th));
        const frontAtBottom = true;
        drawRings(grid, b, frontAtBottom);
        drawRingParticles(grid, dt, b, frontAtBottom);
        drawPlanet2(grid, t);

        for (const tw of twinkles) {
            const v = (Math.sin(t * tw.speed + tw.phase) + 1) / 2;
            const c = v < 0.35 ? ' ' : v < 0.6 ? '.' : v < 0.85 ? ':' : '*';
            put(grid, tw.x, tw.y, c);
        }

        if (nextShoot > 0) nextShoot -= dt;
        if (nextShoot <= 0 && shooters.length < 2) {
            spawnShooter();
            nextShoot = 1.5 + Math.random() * 2.5;
        }
        if (shooters.length) drawShooters(grid, dt);

        el.textContent = gridToText(grid);
    }

    measure();
    resize();

    if (reduceMotion) {
        const grid = scene.slice();
        drawRings(grid, planetRy * 0.85, true);
        drawPlanet2(grid, 0);
        for (const tw of twinkles) put(grid, tw.x, tw.y, ':');
        el.textContent = gridToText(grid);
        return;
    }

    const timer = setInterval(() => frame(performance.now()), 65);

    if ('ResizeObserver' in window) {
        new ResizeObserver(resize).observe(el);
    } else {
        window.addEventListener('resize', resize);
    }
})();
