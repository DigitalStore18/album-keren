/* =========================================================
   MARIPOSA LUMINOSA
   - Aparece suavemente a los 3 s
   - Vuela sin parar con rumbo errante, aleteo y planeos
   - Brilla cambiando de color y deja polvo de luz a su paso
========================================================= */
(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = document.getElementById("fly");
    if (!cv) return;
    const cx = cv.getContext("2d");

    /* ---------- AJUSTES ---------- */
    const APPEAR_AT = 3;        // segundos hasta que empieza a aparecer
    const FADE_IN = 2.5;        // segundos que tarda en verse por completo
    const TRAIL_RATE = 75;      // partículas de rastro por segundo
    const TRAIL_MAX = 320;
    const COLOR_SPEED = 22;     // grados de matiz por segundo

    let W = 0, H = 0;
    function size() {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        W = innerWidth; H = innerHeight;
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
        cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    addEventListener("resize", size);

    const rnd = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

    /* Misma silueta que las mariposas del álbum (viewBox 60 × 50) */
    const UP = [
        "M30 25 C20 5, 2 2, 2 15 C2 24, 15 28, 30 25 Z",
        "M30 25 C40 5, 58 2, 58 15 C58 24, 45 28, 30 25 Z"
    ].map(d => new Path2D(d));
    const LOW = [
        "M30 26 C15 28, 4 35, 8 43 C12 48, 24 38, 30 26 Z",
        "M30 26 C45 28, 56 35, 52 43 C48 48, 36 38, 30 26 Z"
    ].map(d => new Path2D(d));
    const BODY = new Path2D("M29 13 C28 18, 28 32, 29 38 C30 38, 31 32, 31 13 Z");
    const ANT = [new Path2D("M29 10 C26 5, 22 4, 19 2"), new Path2D("M31 10 C34 5, 38 4, 41 2")];

    const b = {
        x: innerWidth * 0.3, y: innerHeight * 0.62, a: -0.6,
        phase: 0, freq: 3.4, t: 0, alpha: 0,
        tx: innerWidth / 2, ty: innerHeight / 2, nextTarget: 0,
        nextGlide: 4, glideEnd: 0, emit: 0
    };
    let trail = [];

    const sizeNow = () => clamp(Math.min(W, H) * 0.075, 36, 70);

    function update(dt) {
        b.t += dt;

        // Fundido de entrada
        b.alpha = clamp((b.t - APPEAR_AT) / FADE_IN, 0, 1);

        // Nuevo destino errante cada pocos segundos
        if (b.t >= b.nextTarget) {
            const m = Math.min(W, H) * 0.1 + 20;
            for (let i = 0; i < 6; i++) {
                b.tx = rnd(m, W - m);
                b.ty = rnd(m, H - m);
                if (Math.hypot(b.tx - b.x, b.ty - b.y) > Math.min(W, H) * 0.3) break;
            }
            b.nextTarget = b.t + rnd(2.5, 5);
        }
        // Si se acerca al borde, vuelve hacia el centro
        if (b.x < 20 || b.x > W - 20 || b.y < 20 || b.y > H - 20) {
            b.tx = W / 2 + rnd(-W * 0.2, W * 0.2);
            b.ty = H / 2 + rnd(-H * 0.2, H * 0.2);
            b.nextTarget = b.t + 3;
        }

        // Rumbo: hacia el destino con un vaivén suave (zigzag natural)
        const wob = Math.sin(b.t * 1.3) * 0.7 + Math.sin(b.t * 2.9 + 1.7) * 0.35;
        const want = Math.atan2(b.ty - b.y, b.tx - b.x) + wob;
        let diff = want - b.a;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        b.a += clamp(diff * 1.8 * dt, -2.4 * dt, 2.4 * dt);

        // Planeos ocasionales: aleteo lento y alas abiertas
        if (b.t > b.nextGlide) {
            b.glideEnd = b.t + rnd(0.8, 1.5);
            b.nextGlide = b.t + rnd(5, 9);
        }
        const gliding = b.t < b.glideEnd;
        const fTarget = gliding ? 0.9 : 3.6 + Math.sin(b.t * 0.6) * 0.5;
        b.freq += (fTarget - b.freq) * Math.min(1, dt * 3);
        b.phase += 2 * Math.PI * b.freq * dt;

        // Velocidad con impulso en cada aleteo
        const base = clamp(Math.min(W, H) * 0.2, 70, 170);
        const surge = 0.65 + 0.35 * Math.sin(b.phase + 1);
        const v = base * surge * (gliding ? 0.8 : 1);
        b.x = clamp(b.x + Math.cos(b.a) * v * dt, -30, W + 30);
        b.y = clamp(b.y + Math.sin(b.a) * v * dt, -30, H + 30);

        // Rastro de polvo de luz
        const al = b.alpha * b.alpha * (3 - 2 * b.alpha);
        b.emit += dt * TRAIL_RATE * al;
        const S = sizeNow(), hue = (b.t * COLOR_SPEED) % 360, bob = Math.sin(b.phase) * 5;
        while (b.emit >= 1) {
            b.emit -= 1;
            if (trail.length >= TRAIL_MAX) break;
            const ang = Math.random() * 6.283, r = Math.random() * S * 0.38;
            const life = rnd(1.2, 2.3);
            trail.push({
                x: b.x + Math.cos(ang) * r * 0.6 - Math.cos(b.a) * S * 0.25,
                y: b.y + bob + Math.sin(ang) * r * 0.6 - Math.sin(b.a) * S * 0.25,
                vx: rnd(-12, 12), vy: rnd(-16, 6),
                life, max: life, r: rnd(0.7, 2.1), h: hue + rnd(-30, 30), tw: rnd(0, 6.283)
            });
        }
        trail.forEach(p => {
            p.life -= dt;
            p.x += p.vx * dt; p.y += p.vy * dt;
            p.vx *= 1 - dt * 0.8;
            p.vy += 10 * dt; // cae despacio, como polvo
        });
        trail = trail.filter(p => p.life > 0);
    }

    function draw() {
        cx.clearRect(0, 0, W, H);
        const al = b.alpha * b.alpha * (3 - 2 * b.alpha);
        if (al <= 0.001 && !trail.length) return;

        const S = sizeNow(), k = S / 60;
        const hue = (b.t * COLOR_SPEED) % 360;
        const bob = Math.sin(b.phase) * 5;

        // Rastro (mezcla aditiva = brillo)
        cx.globalCompositeOperation = "lighter";
        trail.forEach(p => {
            const f = p.life / p.max;
            const a = f * f * (0.6 + 0.4 * Math.sin(p.tw + b.t * 8));
            cx.fillStyle = `hsla(${p.h},100%,70%,${(a * 0.22).toFixed(3)})`;
            cx.beginPath(); cx.arc(p.x, p.y, p.r * 3.2, 0, 6.283); cx.fill();
            cx.fillStyle = `hsla(${p.h},100%,86%,${a.toFixed(3)})`;
            cx.beginPath(); cx.arc(p.x, p.y, p.r * f + 0.3, 0, 6.283); cx.fill();
        });

        if (al > 0.001) {
            // Halo
            const g = cx.createRadialGradient(b.x, b.y + bob, 0, b.x, b.y + bob, S * 1.15);
            g.addColorStop(0, `hsla(${hue},100%,70%,${(0.32 * al).toFixed(3)})`);
            g.addColorStop(1, `hsla(${hue},100%,60%,0)`);
            cx.fillStyle = g;
            cx.fillRect(b.x - S * 1.2, b.y + bob - S * 1.2, S * 2.4, S * 2.4);

            // Mariposa
            cx.globalCompositeOperation = "source-over";
            cx.save();
            cx.translate(b.x, b.y + bob);
            cx.rotate(b.a + Math.PI / 2);
            cx.scale(k, k);
            cx.translate(-30, -25);

            const open = 0.16 + 0.84 * (0.5 + 0.5 * Math.cos(b.phase)); // aleteo visto desde arriba
            cx.save();
            cx.translate(30, 0); cx.scale(open, 1); cx.translate(-30, 0);
            cx.globalAlpha = al * 0.93;
            cx.shadowColor = `hsla(${hue},100%,65%,0.9)`;
            cx.shadowBlur = 20;

            const gu = cx.createLinearGradient(2, 0, 58, 40);
            gu.addColorStop(0, `hsla(${hue},95%,70%,1)`);
            gu.addColorStop(1, `hsla(${hue + 60},95%,74%,1)`);
            cx.fillStyle = gu;
            UP.forEach(p => cx.fill(p));

            const gl = cx.createLinearGradient(2, 20, 58, 48);
            gl.addColorStop(0, `hsla(${hue + 40},95%,68%,1)`);
            gl.addColorStop(1, `hsla(${hue + 110},95%,72%,1)`);
            cx.fillStyle = gl;
            LOW.forEach(p => cx.fill(p));

            cx.shadowBlur = 0;
            cx.strokeStyle = `hsla(${hue + 20},100%,93%,0.75)`;
            cx.lineWidth = 1;
            UP.concat(LOW).forEach(p => cx.stroke(p));
            cx.restore();

            // Cuerpo y antenas
            cx.globalAlpha = al;
            cx.shadowColor = `hsla(${hue},100%,70%,0.9)`;
            cx.shadowBlur = 10;
            cx.fillStyle = `hsla(${hue},70%,94%,1)`;
            cx.fill(BODY);
            cx.beginPath(); cx.arc(30, 11, 2, 0, 6.283); cx.fill();
            cx.shadowBlur = 0;
            cx.strokeStyle = `hsla(${hue},70%,92%,0.9)`;
            cx.lineWidth = 0.8;
            ANT.forEach(p => cx.stroke(p));
            cx.restore();
        }
        cx.globalAlpha = 1;
        cx.globalCompositeOperation = "source-over";
    }

    let last = performance.now();
    function frame(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        update(dt);
        draw();
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
})();
