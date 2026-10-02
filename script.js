(() => {
    const pad = n => String(n).padStart(2, "0");
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---------- CONTENIDO ---------- */
    const HERO = [70, 53, 82, 86];
    const CHAPTERS = [
        { k: "Papá, mamá y amigos", t: "Abrazos, regalos y buenos deseos", a: 1, b: 16 },
        { k: "Juegos y mucha energía", t: "¡A jugar y reír sin parar!", a: 17, b: 66 },
        { k: "Una canción, diez velitas y miles de recuerdos", t: "Pidamos un deseo", a: 67, b: 111 }
    ];
    const COUNT = { full: 1, one: 1, "2a": 2, "2b": 2, "3a": 3, "3b": 3, "4a": 4, "4b": 4 };
    const BY_COUNT = { 1: ["full", "one"], 2: ["2a", "2b"], 3: ["3a", "3b"], 4: ["4a", "4b"] };
    const CYCLE = ["3a", "2a", "4a", "full", "3b", "4b", "2b", "one"];
    const CAPS = ["Diez años, diez velitas", "Risas que se quedan", "Un día para recordar", "Cada foto, un abrazo", "Gracias por tanto"];
    const EGGS = [
        "Un deseo escondido: que nunca dejes de reír así.",
        "Diez años y toda una vida de aventuras por delante.",
        "Esta mariposa guarda un secreto: ¡eres increíble!"
    ];
    const BUTTERFLY = `<svg class="bf" viewBox="0 0 60 50" aria-hidden="true"><path d="M30 25C20 5 2 2 2 15c0 9 13 13 28 10zM30 26C15 28 4 35 8 43c4 5 16-5 22-17zM30 25C40 5 58 2 58 15c0 9-13 13-28 10zM30 26c15 2 26 9 22 17-4 5-16-5-22-17z"/><path d="M29 13c-1 5-1 19 0 25 1 0 2-6 2-25z"/><circle cx="30" cy="11" r="2"/></svg>`;

    /* ---------- CONSTRUCCIÓN DE PÁGINAS ---------- */
    const pages = [];
    pages.push({
        cls: "cover",
        h: `<div class="hero">${HERO.map((n, i) => `<img class="h${i ? "" : " on"}" data-src="fotos/${pad(n)}.jpg" alt="${i ? "" : "Portada"}" draggable="false">`).join("")}</div>
            <div class="cshade"></div><div class="cframe"></div>
            <div class="ctext">
                <span class="ten" id="ten">10 años</span>
                <h1>Keren</h1>
                <p>23 de setiembre</p>
                <p>Una década de risas, ocurrencias y momentos inolvidables.</p>
                <button class="open" id="open">Abrir álbum</button>
                <small>Desliza o usa ← → para pasar las páginas</small>
            </div>`
    });
    pages.push({
        cls: "txt",
        h: `${BUTTERFLY}<h2>Parece que fue ayer cuando aprendiste a caminar</h2>
            <p>y hoy celebramos una década llena de risas, ocurrencias y momentos inolvidables. Gracias por llenarnos de alegría todos los días. ¡Disfruta de tu día al máximo!</p>`
    });

    let k = 0, photoPages = 0, eggIndex = 0;
    CHAPTERS.forEach((c, ci) => {
        pages.push({
            cls: "txt",
            h: `<div class="num">${["I", "II", "III"][ci]}</div><p class="kick">${c.k}</p><h2>${c.t}</h2>${BUTTERFLY}`
        });
        let n = c.a;
        while (n <= c.b) {
            const left = c.b - n + 1;
            let tpl = CYCLE[k++ % CYCLE.length];
            let cnt = COUNT[tpl];
            if (cnt > left) { cnt = left; tpl = BY_COUNT[left][k % 2]; }

            const slots = [];
            for (let j = 0; j < cnt; j++, n++) {
                slots.push(`<figure class="s"><img data-src="fotos/${pad(n)}.jpg" alt="Fotografía ${pad(n)}" draggable="false"></figure>`);
            }
            const hasCap = photoPages % 3 === 1;
            const egg = [4, 13, 24].includes(photoPages) && eggIndex < EGGS.length
                ? `<button class="egg" data-msg="${EGGS[eggIndex++]}" aria-label="Sorpresa escondida">${BUTTERFLY}</button>` : "";
            pages.push({
                cls: `t-${tpl}${hasCap ? " has-cap" : ""}`,
                h: `<div class="grid">${slots.join("")}</div>${hasCap ? `<p class="cap">${CAPS[photoPages % CAPS.length]}</p>` : ""}${egg}`
            });
            photoPages++;
        }
    });
    pages.push({
        cls: "back",
        h: `<div class="bframe"></div>
            <div class="bcol">
                <p class="bfin">Fin del álbum</p>
                <h2>Hasta el<br>próximo año</h2>
                <div class="bbody">
                    <figure class="s bphoto"><img data-src="fotos/70.jpg" alt="Keren" draggable="false"></figure>
                    <p class="btext">Gracias a todos por estar presentes, por los regalos, las risas y por hacer que este décimo cumpleaños sea un recuerdo inolvidable.</p>
                    <p class="bq">¡Por muchos años más de felicidad!</p>
                </div>
                <div class="bfoot">
                    <div class="bmark">${BUTTERFLY}<span>Keren, 10 años<br>23 de setiembre</span></div>
                    <div class="barcode" aria-hidden="true"><i></i><span>23 · 09 · 10</span></div>
                </div>
                <button class="blink" id="restart">Volver a la portada</button>
            </div>`
    });

    const N = pages.length;
    const book = document.getElementById("book");
    book.innerHTML = pages.map((p, i) =>
        `<section class="page ${p.cls}" style="z-index:${N - i}">${p.h}<i class="shade"></i><i class="cast"></i></section>`).join("");
    const els = [...book.children];

    /* ---------- MOTOR DE PÁGINAS ---------- */
    let pos = 0, raf = 0;
    const count = document.getElementById("count");

    function loadNear() {
        const f = Math.floor(pos);
        for (let i = Math.max(0, f - 1); i <= Math.min(N - 1, f + 3); i++) {
            els[i].querySelectorAll("img[data-src]").forEach(im => {
                const hero = im.classList.contains("h");
                im.onload = () => { if (!hero) im.classList.add("on"); };
                im.src = im.dataset.src;
                im.removeAttribute("data-src");
                if (im.complete && !hero) im.classList.add("on");
            });
        }
    }

    /* ---------- HOJA QUE SE DOBLA ----------
       Mientras una hoja gira, se divide en franjas verticales encadenadas;
       cada una gira un poco más (o menos) que la anterior, así el borde
       libre se curva hacia el lado al que se voltea la página. */
    const COARSE = matchMedia("(pointer: coarse)").matches || innerWidth < 700;
    const SEG = COARSE ? 16 : 28;   // franjas por hoja (más = más suave, pero más pesado; el celular usa menos)
    const BEND = 1.8;    // dureza del doblez: más alto = el borde se adelanta más
    const CURL = 1.6;    // más alto = la curva se concentra cerca del borde libre
    const bends = new Array(N).fill(null);
    let lastPos = 0, dirS = 1;

    function buildBend(el) {
        const pw = book.clientWidth, sw = pw / SEG;
        const base = el.cloneNode(true);
        base.querySelectorAll(".shade,.cast,.bend").forEach(n => n.remove());
        base.removeAttribute("style");
        base.removeAttribute("id");
        base.querySelectorAll("[id]").forEach(n => n.removeAttribute("id"));
        base.querySelectorAll("img").forEach(im => {
            im.decoding = "sync";
            if (!im.classList.contains("h")) im.classList.add("on");
        });
        const root = document.createElement("div");
        root.className = "bend";
        root.inert = true;
        const segs = [];
        let parent = root;
        for (let j = 0; j < SEG; j++) {
            const seg = document.createElement("div");
            seg.className = "seg";
            seg.style.width = sw + "px";
            seg.style.left = j ? "100%" : "0";
            const inn = document.createElement("div");
            inn.className = "in";
            const wide = document.createElement("div");
            wide.className = "wide";
            wide.style.cssText = `width:${pw}px;left:${(-j * sw).toFixed(2)}px`;
            wide.appendChild(base.cloneNode(true));
            const sh = document.createElement("i"); sh.className = "sh";
            inn.append(wide, sh);
            seg.appendChild(inn);
            parent.appendChild(seg);
            parent = seg;
            segs.push({ seg, sh, in: inn });
        }
        root.style.visibility = "hidden";   // se deja lista pero oculta hasta que se use
        el.appendChild(root);
        return { root, segs, sw, on: false };
    }

    function activate(el, i, b) {
        if (i === 0) { // la portada rota sus fotos: copiar la que se ve ahora
            const cur = heroImgs.findIndex(im => im.classList.contains("on"));
            b.root.querySelectorAll(".hero").forEach(h => [...h.children].forEach((im, k) => {
                im.style.transition = "none"; im.classList.toggle("on", k === cur);
            }));
        }
        b.root.style.visibility = "";
        el.classList.add("bending");
        b.on = true;
    }

    function unbend(i) {
        const b = bends[i];
        if (!b) return;
        if (b.on) {
            els[i].classList.remove("bending");
            b.root.style.visibility = "hidden";
            b.on = false;
        }
        const c = Math.round(pos);
        if (i !== c && i !== c - 1) { b.root.remove(); bends[i] = null; } // solo se guardan las 2 hojas que se pueden voltear
    }

    // Deja lista la hoja que se puede voltear (adelante y atrás) cuando el álbum está quieto,
    // para que el giro empiece sin trabarse.
    let warmTimer = 0;
    function warm() {
        clearTimeout(warmTimer);
        warmTimer = setTimeout(() => {
            const c = Math.round(pos);
            [c, c - 1].forEach(i => {
                if (i >= 0 && i < N - 1 && !bends[i]) bends[i] = buildBend(els[i]);
            });
        }, 250);
    }

    function poseBend(b, t) {
        // Hacia delante el borde libre se adelanta a la base; hacia atrás, al revés.
        const lead = 90 * (1 - Math.pow(1 - t, BEND));   // va por delante
        const lag = 90 * Math.pow(t, BEND);              // va por detrás
        const m = (dirS + 1) / 2;                        // 1 = avanzando, 0 = retrocediendo
        const spine = lag * m + lead * (1 - m);
        const tip = lead * m + lag * (1 - m);
        const ang = u => clamp(spine + (tip - spine) * Math.pow(u, CURL), 0, 89.5);
        const dark = th => 0.5 * Math.pow(th / 90, 1.3);                          // sombra al girar
        let prev = 0;
        b.segs.forEach((s, j) => {
            const th = ang((j + 0.5) / SEG);
            s.seg.style.transform = `rotateY(${(-(th - prev)).toFixed(3)}deg)`;
            prev = th;
            // Solape hacia la franja vecina, compensando la inclinación: en pantalla siempre ~2px,
            // así el borde suavizado (antialiasing) nunca deja ver el fondo entre franjas.
            s.in.style.right = -clamp(2.2 / Math.cos(th * Math.PI / 180), 2.2, 18).toFixed(1) + "px";
            // Degradado continuo de un borde de la franja al otro: sin escalones entre franjas
            const t0 = ang(j / SEG), t1 = ang((j + 1) / SEG);
            s.sh.style.background = `linear-gradient(90deg,rgba(10,5,16,${dark(t0).toFixed(4)}) 0,rgba(10,5,16,${dark(t1).toFixed(4)}) ${b.sw.toFixed(2)}px)`;
        });
    }

    const bgEl = document.querySelector(".bg");
    const vc = els.map(() => ({}));
    const setVar = (i, k, v) => { if (vc[i][k] !== v) { vc[i][k] = v; els[i].style.setProperty(k, v); } };
    let lastF = -1, lastPP = "";

    function render() {
        const dp = pos - lastPos;
        if (Math.abs(dp) > 1e-5) dirS += ((dp > 0 ? 1 : -1) - dirS) * 0.35; // hacia dónde se voltea
        lastPos = pos;
        const fast = Math.abs(dp) > 0.2; // saltos largos: no vale la pena curvar cada hoja que pasa

        const f = Math.floor(pos + 1e-6);
        els.forEach((el, i) => {
            const t = clamp(pos - i, 0, 1);
            const behind = clamp(pos - (i - 1), 0, 1); // avance de la hoja que cubre a esta
            const visible = t < 1 && i <= f + 2;
            el.style.visibility = visible ? "visible" : "hidden";
            if (!visible) { unbend(i); return; }
            if (t > 0.001 && t < 0.999 && !fast) {
                const b = bends[i] || (bends[i] = buildBend(el));
                if (!b.on) activate(el, i, b);
                el.style.transform = "translateZ(.1px)";
                poseBend(b, t);
                // con la hoja curvada no se toca --t: cambiarla recalcularía el estilo de todas las franjas
            } else {
                unbend(i);
                el.style.transform = `rotateY(${(-t * 90).toFixed(2)}deg)`;
                setVar(i, "--t", t.toFixed(3));
            }
            setVar(i, "--cast", (Math.sin(Math.PI * behind) * 0.55).toFixed(3));
        });
        const shown = Math.round(pos);
        count.textContent = `${pad(shown + 1)} / ${pad(N)}`;
        count.classList.toggle("hide", pos < 0.5);
        const pp = pos.toFixed(2);
        if (pp !== lastPP) { lastPP = pp; bgEl.style.setProperty("--pp", pp); } // en .bg, no en body: así no se recalcula todo el documento
        if (f !== lastF) { lastF = f; loadNear(); }
    }
    addEventListener("resize", () => { bends.forEach((b, i) => b && unbend(i)); render(); });

    function glide(to, sound) {
        cancelAnimationFrame(raf);
        const from = pos, dist = Math.abs(to - from);
        if (!dist) return;
        const dur = reduce ? 1 : 520 + 260 * Math.min(dist, 2);
        if (sound) flip(dist, dur / 1000, Math.sign(to - from));
        const t0 = performance.now();
        const ease = x => -(Math.cos(Math.PI * x) - 1) / 2;
        (function step(now) {
            const p = Math.min(1, (now - t0) / dur);
            pos = from + (to - from) * ease(p);
            render();
            if (p < 1) raf = requestAnimationFrame(step); else warm();
        })(t0);
    }
    const go = dir => glide(clamp(Math.round(pos) + dir, 0, N - 1), true);

    /* ---------- SONIDO DE PÁGINA (sintetizado, sin archivos) ---------- */
    let ac = null, bus = null, noise = null, crackle = null, soundOn = true;
    try { soundOn = localStorage.getItem("album-sound") !== "off"; } catch (_) {}

    function audio() {
        if (!ac) {
            const A = window.AudioContext || window.webkitAudioContext;
            if (!A) return null;
            ac = new A();
            bus = ac.createGain();
            bus.gain.value = 0.9; // volumen general del álbum
            bus.connect(ac.destination);
            // ruido blanco (el "soplo" del aire que mueve la hoja)
            noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
            const d = noise.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
            // crujidos sueltos (las fibras del papel)
            crackle = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
            const cd = crackle.getChannelData(0);
            let prev = 0;
            for (let i = 0; i < cd.length; i++) {
                const hit = Math.random() < 0.0045 ? (Math.random() * 2 - 1) * (0.4 + Math.random() * 1.2) : 0;
                prev = prev * 0.55 + hit;
                cd[i] = prev;
            }
        }
        if (ac.state === "suspended") ac.resume();
        return ac;
    }
    ["pointerdown", "keydown"].forEach(ev => addEventListener(ev, () => audio(), { once: true }));

    const env = (g, t0, peak, tPeak, dur) => {
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(peak, t0 + dur * tPeak);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    };

    // Crujido seco de papel (clics muy cortos filtrados)
    function crack(c, t0, dur, gain, freq, out) {
        const src = c.createBufferSource();
        src.buffer = crackle; src.loop = true;
        src.playbackRate.value = 0.85 + Math.random() * 0.35;
        const bp = c.createBiquadFilter();
        bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = 0.7;
        const hp = c.createBiquadFilter();
        hp.type = "highpass"; hp.frequency.value = 1400;
        const g = c.createGain();
        env(g, t0, gain, 0.4, dur);
        src.connect(bp); bp.connect(hp); hp.connect(g); g.connect(out);
        src.start(t0, Math.random() * 1.5);
        src.stop(t0 + dur + 0.05);
    }

    // Una hoja completa: despegue, roce con el aire, crujido y golpecito al asentarse
    function pageSound(c, t0, len, dir) {
        const out = c.createStereoPanner ? c.createStereoPanner() : c.createGain();
        if (out.pan) { // la hoja cruza de derecha a izquierda (o al revés)
            out.pan.setValueAtTime(0.4 * dir, t0);
            out.pan.linearRampToValueAtTime(-0.4 * dir, t0 + len);
        }
        out.connect(bus);
        const v = 0.9 + Math.random() * 0.2; // pequeña variación para que no suene repetido

        // 1) despegue: crujidito al levantar la hoja
        crack(c, t0, 0.16, 0.5, 3000 * v, out);

        // 2) roce con el aire, con aleteo irregular
        const src = c.createBufferSource();
        src.buffer = noise; src.loop = true;
        const bp = c.createBiquadFilter();
        bp.type = "bandpass"; bp.Q.value = 0.55;
        bp.frequency.setValueAtTime(1500 * v, t0);
        bp.frequency.exponentialRampToValueAtTime(3600 * v, t0 + len * 0.45);
        bp.frequency.exponentialRampToValueAtTime(2000 * v, t0 + len);
        const hp = c.createBiquadFilter();
        hp.type = "highpass"; hp.frequency.value = 600;
        const flut = c.createGain();
        flut.gain.value = 0.7;
        const lfo = c.createOscillator();
        lfo.type = "triangle"; lfo.frequency.value = 16 + Math.random() * 14;
        const lfoAmt = c.createGain();
        lfoAmt.gain.value = 0.3;
        lfo.connect(lfoAmt); lfoAmt.connect(flut.gain);
        const g = c.createGain();
        env(g, t0 + 0.03, 0.13, 0.4, len * 0.92);
        src.connect(bp); bp.connect(hp); hp.connect(flut); flut.connect(g); g.connect(out);
        src.start(t0, Math.random() * 0.5); src.stop(t0 + len + 0.05);
        lfo.start(t0); lfo.stop(t0 + len + 0.05);

        // 3) crujido del papel mientras se dobla
        crack(c, t0 + len * 0.1, len * 0.6, 0.55, 4600 * v, out);
        crack(c, t0 + len * 0.3, len * 0.4, 0.35, 6500 * v, out);

        // 4) la hoja cae y se asienta con un golpecito suave
        const ts = t0 + len * 0.88;
        const th = c.createBufferSource();
        th.buffer = noise; th.loop = true;
        const lp = c.createBiquadFilter();
        lp.type = "lowpass"; lp.frequency.value = 650; lp.Q.value = 0.8;
        const tg = c.createGain();
        env(tg, ts, 0.22, 0.18, 0.11);
        th.connect(lp); lp.connect(tg); tg.connect(out);
        th.start(ts, Math.random() * 0.5); th.stop(ts + 0.16);
        crack(c, ts, 0.08, 0.35, 5200, out);
    }

    function flip(dist, secs, dir) {
        if (!soundOn) return;
        const c = audio(); if (!c) return;
        const n = dist > 1.5 ? Math.min(5, Math.round(dist)) : 1;
        const len = n === 1 ? clamp(secs * 0.92, 0.3, 0.8) : 0.46;
        const gap = n > 1 ? Math.max(0.1, (secs - len) / (n - 1)) : 0;
        for (let i = 0; i < n; i++) pageSound(c, c.currentTime + 0.01 + i * gap, len, dir || 1);
    }
    function rustle() {
        if (!soundOn) return;
        const c = audio(); if (!c) return;
        crack(c, c.currentTime + 0.01, 0.2, 0.3, 3600, bus);
    }
    const snd = document.getElementById("snd");
    const paintSnd = () => { snd.classList.toggle("off", !soundOn); snd.setAttribute("aria-pressed", String(soundOn)); };
    snd.addEventListener("click", () => {
        soundOn = !soundOn;
        try { localStorage.setItem("album-sound", soundOn ? "on" : "off"); } catch (_) {}
        paintSnd();
        if (soundOn) rustle();
    });
    paintSnd();

    /* ---------- GESTOS DE NAVEGACIÓN ---------- */
    let drag = null, moved = false;
    book.addEventListener("pointerdown", e => {
        moved = false;
        if (e.target.closest("button")) return;
        cancelAnimationFrame(raf);
        drag = { x: e.clientX, p: pos, id: e.pointerId, lx: e.clientX, lt: performance.now(), v: 0 };
    });
    addEventListener("pointermove", e => {
        bgEl.style.setProperty("--mx", ((e.clientX / innerWidth - 0.5) * 2).toFixed(2));
        bgEl.style.setProperty("--my", ((e.clientY / innerHeight - 0.5) * 2).toFixed(2));
        if (!drag) return;
        const dx = e.clientX - drag.x;
        if (!moved && Math.abs(dx) < 7) return;
        if (!moved) { moved = true; try { book.setPointerCapture(drag.id); } catch (_) {} rustle(); }
        const now = performance.now();
        drag.v = (e.clientX - drag.lx) / Math.max(1, now - drag.lt);
        drag.lx = e.clientX; drag.lt = now;
        pos = clamp(drag.p - dx / (book.clientWidth * 0.85), 0, N - 1);
        render();
    });
    function endDrag() {
        if (!drag) return;
        const d = drag; drag = null;
        if (!moved) return;
        const base = Math.round(d.p);
        const dir = pos > base ? 1 : pos < base ? -1 : 0;
        const fast = Math.abs(d.v) > 0.45 && Math.sign(-d.v) === dir;
        const commit = dir && (Math.abs(pos - base) > 0.28 || fast);
        const to = clamp(base + (commit ? dir : 0), 0, N - 1);
        glide(to, to !== base);
    }
    addEventListener("pointerup", endDrag);
    addEventListener("pointercancel", endDrag);

    addEventListener("keydown", e => {
        if (zoomEl.classList.contains("open")) { if (e.key === "Escape") closeZoom(); return; }
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
    });
    document.getElementById("next").onclick = () => go(1);
    document.getElementById("prev").onclick = () => go(-1);

    /* ---------- PORTADA, SORPRESAS Y PARTÍCULAS ---------- */
    const toast = document.getElementById("toast");
    let toastTimer;
    function say(msg) {
        toast.textContent = msg;
        toast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
    }

    const heroImgs = [...book.querySelectorAll(".hero img")];
    let hi = 0;
    setInterval(() => {
        if (pos > 0.9) return;
        heroImgs[hi].classList.remove("on");
        hi = (hi + 1) % heroImgs.length;
        heroImgs[hi].classList.add("on");
    }, 2000);

    const cv = document.getElementById("fx"), cx = cv.getContext("2d");
    let W = 0, H = 0, P = [];
    const size = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; };
    size(); addEventListener("resize", size);
    if (!reduce) {
        for (let i = 0; i < 26; i++) P.push({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: 0.6 + Math.random() * 1.5, vx: (Math.random() - 0.5) * 0.12, vy: -0.08 - Math.random() * 0.18, life: Infinity, a: 0.2 });
        (function tick(now) {
            cx.clearRect(0, 0, W, H);
            P.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if (p.life === Infinity) {
                    p.a = 0.12 + 0.25 * Math.abs(Math.sin(now / 1800 + p.x));
                    if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
                } else { p.vy += 0.05; p.life--; p.a = Math.max(0, p.life / 60); }
                cx.globalAlpha = Math.min(1, p.a);
                cx.fillStyle = p.life === Infinity ? "#e6cdfa" : "#ffe9b8";
                cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.283); cx.fill();
            });
            P = P.filter(p => p.life > 0);
            requestAnimationFrame(tick);
        })(0);
    }
    function burst(x, y) {
        if (reduce) return;
        for (let i = 0; i < 28; i++) {
            const a = Math.random() * 6.283, s = 1 + Math.random() * 3;
            P.push({ x, y, r: 1 + Math.random() * 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, life: 60 + Math.random() * 30, a: 1 });
        }
    }

    book.addEventListener("click", e => {
        if (moved) return;
        const egg = e.target.closest(".egg");
        if (egg) { burst(e.clientX, e.clientY); say(egg.dataset.msg); return; }
        if (e.target.closest("#open")) { glide(1, true); return; }
        if (e.target.closest("#restart")) { glide(0, true); return; }
        if (e.target.closest("#ten")) { burst(e.clientX, e.clientY); say("¡Diez años! 🎉"); return; }
        const im = e.target.closest(".s") && e.target.closest(".s").querySelector("img");
        if (im && im.src) openZoom(im.src, im.alt);
    });

    /* ---------- VISOR DE FOTO: ZOOM Y DESPLAZAMIENTO ---------- */
    const zoomEl = document.getElementById("zoom"), zimg = document.getElementById("zimg");
    let Z = { s: 1, x: 0, y: 0 };
    const pointers = new Map();
    let pinch0 = 0, pinchS = 1, lastTap = 0;

    const applyZ = () => { zimg.style.transform = `translate(${Z.x}px,${Z.y}px) scale(${Z.s})`; };
    function limitZ() {
        if (Z.s <= 1) { Z.x = Z.y = 0; return; }
        const mx = Math.max(0, (zimg.offsetWidth * Z.s - innerWidth) / 2);
        const my = Math.max(0, (zimg.offsetHeight * Z.s - innerHeight) / 2);
        Z.x = clamp(Z.x, -mx, mx); Z.y = clamp(Z.y, -my, my);
    }
    function zoomAt(ns, cx0, cy0) {
        ns = clamp(ns, 1, 5);
        const px = cx0 - innerWidth / 2, py = cy0 - innerHeight / 2, r = ns / Z.s;
        Z.x = px - (px - Z.x) * r; Z.y = py - (py - Z.y) * r; Z.s = ns;
        limitZ(); applyZ();
    }
    function openZoom(src, alt) {
        Z = { s: 1, x: 0, y: 0 }; applyZ();
        zimg.src = src; zimg.alt = alt || "";
        zoomEl.classList.add("open"); zoomEl.setAttribute("aria-hidden", "false");
    }
    function closeZoom() {
        zoomEl.classList.remove("open"); zoomEl.setAttribute("aria-hidden", "true");
    }
    document.getElementById("zclose").onclick = closeZoom;
    zoomEl.addEventListener("click", e => { if (e.target === zoomEl && Z.s === 1) closeZoom(); });
    zoomEl.addEventListener("wheel", e => {
        e.preventDefault();
        zoomAt(Z.s * (e.deltaY < 0 ? 1.18 : 0.85), e.clientX, e.clientY);
    }, { passive: false });
    zoomEl.addEventListener("dblclick", e => zoomAt(Z.s > 1 ? 1 : 2.6, e.clientX, e.clientY));
    zoomEl.addEventListener("pointerdown", e => {
        if (e.target.closest("button")) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        zoomEl.setPointerCapture(e.pointerId);
        if (pointers.size === 2) {
            const [a, b] = [...pointers.values()];
            pinch0 = Math.hypot(b.x - a.x, b.y - a.y); pinchS = Z.s;
        } else if (e.pointerType === "touch") { // doble toque en móvil
            const now = performance.now();
            if (now - lastTap < 300) zoomAt(Z.s > 1 ? 1 : 2.6, e.clientX, e.clientY);
            lastTap = now;
        }
    });
    zoomEl.addEventListener("pointermove", e => {
        const p = pointers.get(e.pointerId);
        if (!p) return;
        const dx = e.clientX - p.x, dy = e.clientY - p.y;
        p.x = e.clientX; p.y = e.clientY;
        if (pointers.size === 2) {
            const [a, b] = [...pointers.values()];
            const d = Math.hypot(b.x - a.x, b.y - a.y);
            if (pinch0) zoomAt(pinchS * d / pinch0, (a.x + b.x) / 2, (a.y + b.y) / 2);
        } else if (Z.s > 1) {
            Z.x += dx; Z.y += dy; limitZ(); applyZ();
        }
    });
    const upZ = e => { pointers.delete(e.pointerId); pinch0 = 0; };
    zoomEl.addEventListener("pointerup", upZ);
    zoomEl.addEventListener("pointercancel", upZ);

    render();
    warm();
})();
