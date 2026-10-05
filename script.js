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
    const SEG = COARSE ? 12 : 24;   // franjas por hoja (más = más suave, pero más pesado; el celular usa menos)
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
        if (el === els[0]) { // portada: una sola foto por franja (la que se ve se copia al empezar el giro)
            [...base.querySelectorAll(".hero img")].forEach((im, n) => n ? im.remove() : im.classList.add("on"));
        }
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
            segs.push({ seg, sh, in: inn, tr: "", r: 0, bg: "" });
        }
        root.style.visibility = "hidden";   // se deja lista pero oculta hasta que se use
        el.appendChild(root);
        return { root, segs, sw, on: false };
    }

    function activate(el, i, b) {
        if (i === 0) { // la portada rota sus fotos: copiar la que se ve ahora
            const cur = heroImgs[Math.max(0, heroImgs.findIndex(im => im.classList.contains("on")))];
            const url = cur && cur.src;
            b.root.querySelectorAll(".hero img").forEach(im => {
                im.style.transition = "none"; im.classList.add("on");
                if (url && im.src !== url) im.src = url;
            });
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
            const todo = [c, c - 1].filter(i => i >= 0 && i < N - 1 && !bends[i]);
            const next = () => { // una hoja por turno: construir las dos de golpe congelaba la pantalla
                const i = todo.shift();
                if (i === undefined || drag || Math.round(pos) !== c) return;
                if (!bends[i]) bends[i] = buildBend(els[i]);
                if (todo.length) warmTimer = setTimeout(next, 140);
            };
            next();
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
            const tr = `rotateY(${(-(th - prev)).toFixed(2)}deg)`;
            prev = th;
            if (s.tr !== tr) { s.tr = tr; s.seg.style.transform = tr; }
            // Solape hacia la franja vecina (en pasos de 1px: cambiar `right` en cada frame obliga a repintar la franja)
            const r = Math.ceil(clamp(2.2 / Math.cos(th * Math.PI / 180), 2.2, 18));
            if (s.r !== r) { s.r = r; s.in.style.right = -r + "px"; }
            // Degradado continuo de un borde de la franja al otro: sin escalones entre franjas
            const t0 = ang(j / SEG), t1 = ang((j + 1) / SEG);
            const bg = `linear-gradient(90deg,rgba(10,5,16,${dark(t0).toFixed(3)}) 0,rgba(10,5,16,${dark(t1).toFixed(3)}) ${b.sw.toFixed(1)}px)`;
            if (s.bg !== bg) { s.bg = bg; s.sh.style.background = bg; }
        });
    }

    const bgEl = document.querySelector(".bg");
    const vc = els.map(() => ({}));
    const shadeEls = els.map(el => el.querySelector(":scope > .shade"));
    const castEls = els.map(el => el.querySelector(":scope > .cast"));
    // La opacidad se pone directo en la sombra (no en una variable de la página):
    // así no se recalcula el estilo de todo el contenido de la hoja en cada frame
    const setOp = (list, i, key, v) => { if (vc[i][key] !== v) { vc[i][key] = v; list[i].style.opacity = v; } };
    let lastF = -1, lastPP = "", lastLabel = "", lastHide = null, rr = 0, bookW = book.clientWidth;
    const queueRender = () => { if (!rr) rr = requestAnimationFrame(() => { rr = 0; render(); }); };

    function render() {
        const dp = pos - lastPos;
        if (Math.abs(dp) > 1e-5) dirS += ((dp > 0 ? 1 : -1) - dirS) * 0.35; // hacia dónde se voltea
        lastPos = pos;
        const fast = Math.abs(dp) > 0.2; // saltos largos: no vale la pena curvar cada hoja que pasa
        window.__flipping = Math.abs(pos - Math.round(pos)) > 0.002; // las animaciones de fondo bajan de ritmo mientras se pasa de página

        const f = Math.floor(pos + 1e-6);
        els.forEach((el, i) => {
            const t = clamp(pos - i, 0, 1);
            const behind = clamp(pos - (i - 1), 0, 1); // avance de la hoja que cubre a esta
            const visible = t < 1 && i <= f + 2;
            const vis = visible ? "visible" : "hidden";
            if (vc[i].vis !== vis) { vc[i].vis = vis; el.style.visibility = vis; }
            if (!visible) { unbend(i); return; }
            if (t > 0.001 && t < 0.999 && !fast) {
                const b = bends[i] || (bends[i] = buildBend(el));
                if (!b.on) activate(el, i, b);
                el.style.transform = "translateZ(.1px)";
                poseBend(b, t);
            } else {
                unbend(i);
                el.style.transform = `rotateY(${(-t * 90).toFixed(2)}deg)`;
                setOp(shadeEls, i, "t", t.toFixed(3));
            }
            setOp(castEls, i, "c", (Math.sin(Math.PI * behind) * 0.55).toFixed(3));
        });
        const shown = Math.round(pos);
        const label = `${pad(shown + 1)} / ${pad(N)}`;
        if (label !== lastLabel) { lastLabel = label; count.textContent = label; }
        const hideC = pos < 0.5;
        if (hideC !== lastHide) { lastHide = hideC; count.classList.toggle("hide", hideC); }
        const pp = pos.toFixed(2);
        if (!COARSE && pp !== lastPP) { lastPP = pp; bgEl.style.setProperty("--pp", pp); } // en .bg, no en body; en celular no hay parallax
        if (f !== lastF) { lastF = f; loadNear(); }
    }
    let rzT = 0;
    addEventListener("resize", () => { // al cambiar de tamaño las hojas curvables se reconstruyen con las medidas nuevas
        clearTimeout(rzT);
        rzT = setTimeout(() => {
            bends.forEach((b, i) => { if (b) { els[i].classList.remove("bending"); b.root.remove(); bends[i] = null; } });
            bookW = book.clientWidth;
            render(); warm();
        }, 150);
    });

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

    /* ---------- SONIDO DE PÁGINA: soplo suave de viento (sintetizado, sin archivos) ---------- */
    const WIND_VOLUME = 1;   // sube o baja el volumen general (0.5 = la mitad, 1.5 = más fuerte)
    let ac = null, bus = null, noise = null, soundOn = true;
    try { soundOn = localStorage.getItem("album-sound") !== "off"; } catch (_) {}

    function audio() {
        if (!ac) {
            const A = window.AudioContext || window.webkitAudioContext;
            if (!A) return null;
            ac = new A();
            // cadena maestra: volumen -> filtro que recorta los agudos -> salida
            const tone = ac.createBiquadFilter();
            tone.type = "lowpass"; tone.frequency.value = 3200; tone.Q.value = 0.3;
            tone.connect(ac.destination);
            bus = ac.createGain();
            bus.gain.value = 0.9 * WIND_VOLUME;
            bus.connect(tone);
            // ruido "café" (predominan los graves): suena a aire, no a estática
            noise = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate);
            const d = noise.getChannelData(0);
            let last = 0, peak = 0;
            for (let i = 0; i < d.length; i++) {
                last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
                d[i] = last;
                if (Math.abs(last) > peak) peak = Math.abs(last);
            }
            for (let i = 0; i < d.length; i++) d[i] /= peak;
        }
        if (ac.state === "suspended") ac.resume();
        return ac;
    }
    ["pointerdown", "keydown"].forEach(ev => addEventListener(ev, () => audio(), { once: true }));

    // Una ráfaga: ruido grave filtrado que sube y baja con suavidad y un leve vaivén
    function gust(c, t0, len, gain, f0, f1, f2, out) {
        const src = c.createBufferSource();
        src.buffer = noise; src.loop = true;
        const bp = c.createBiquadFilter();
        bp.type = "bandpass"; bp.Q.value = 0.4;
        bp.frequency.setValueAtTime(f0, t0);
        bp.frequency.exponentialRampToValueAtTime(f1, t0 + len * 0.45);
        bp.frequency.exponentialRampToValueAtTime(f2, t0 + len);
        const sway = c.createGain();             // vaivén lento, como el viento real
        sway.gain.value = 0.85;
        const lfo = c.createOscillator();
        lfo.type = "sine"; lfo.frequency.value = 1.2 + Math.random() * 1.3;
        const amt = c.createGain();
        amt.gain.value = 0.15;
        lfo.connect(amt); amt.connect(sway.gain);
        const g = c.createGain();                // entra y sale despacio: sin golpes ni chasquidos
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(gain, t0 + len * 0.42);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
        src.connect(bp); bp.connect(sway); sway.connect(g); g.connect(out);
        src.start(t0, Math.random() * 1.5); src.stop(t0 + len + 0.05);
        lfo.start(t0); lfo.stop(t0 + len + 0.05);
    }

    // Una hoja: un soplo grave y un toque de aire más claro, cruzando de lado a lado
    function pageSound(c, t0, len, dir) {
        const out = c.createStereoPanner ? c.createStereoPanner() : c.createGain();
        if (out.pan) {
            out.pan.setValueAtTime(0.3 * dir, t0);
            out.pan.linearRampToValueAtTime(-0.3 * dir, t0 + len);
        }
        out.connect(bus);
        const v = 0.92 + Math.random() * 0.16; // pequeña variación para que no suene repetido
        gust(c, t0, len, 0.6, 380 * v, 760 * v, 480 * v, out);
        gust(c, t0 + len * 0.05, len * 0.9, 0.22, 900 * v, 1500 * v, 1000 * v, out);
    }

    function flip(dist, secs, dir) {
        if (!soundOn) return;
        const c = audio(); if (!c) return;
        const n = dist > 1.5 ? Math.min(4, Math.round(dist)) : 1;
        const len = n === 1 ? clamp(secs * 1.05, 0.5, 1.1) : 0.6;
        const gap = n > 1 ? Math.max(0.12, (secs - len) / (n - 1)) : 0;
        for (let i = 0; i < n; i++) pageSound(c, c.currentTime + 0.01 + i * gap, len, dir || 1);
    }
    function rustle() {
        if (!soundOn) return;
        const c = audio(); if (!c) return;
        gust(c, c.currentTime + 0.01, 0.35, 0.25, 500, 800, 600, bus);
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
    let mvX = 0, mvY = 0, mvQ = false;
    addEventListener("pointermove", e => {
        if (!COARSE) { // parallax del fondo: máximo una vez por frame, y solo con mouse
            mvX = e.clientX; mvY = e.clientY;
            if (!mvQ) {
                mvQ = true;
                requestAnimationFrame(() => {
                    mvQ = false;
                    bgEl.style.setProperty("--mx", ((mvX / innerWidth - 0.5) * 2).toFixed(2));
                    bgEl.style.setProperty("--my", ((mvY / innerHeight - 0.5) * 2).toFixed(2));
                });
            }
        }
        if (!drag) return;
        const dx = e.clientX - drag.x;
        if (!moved && Math.abs(dx) < 7) return;
        if (!moved) { moved = true; try { book.setPointerCapture(drag.id); } catch (_) {} rustle(); }
        const now = performance.now();
        drag.v = (e.clientX - drag.lx) / Math.max(1, now - drag.lt);
        drag.lx = e.clientX; drag.lt = now;
        pos = clamp(drag.p - dx / (bookW * 0.85), 0, N - 1);
        queueRender(); // varios eventos de dedo por frame: se dibuja una sola vez
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
        const NP = COARSE ? 14 : 26;
        for (let i = 0; i < NP; i++) P.push({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: 0.6 + Math.random() * 1.5, vx: (Math.random() - 0.5) * 0.12, vy: -0.08 - Math.random() * 0.18, life: Infinity, a: 0.2 });
        let lastT = 0;
        (function tick(now) {
            requestAnimationFrame(tick);
            if (window.__zoomOpen || document.hidden) { lastT = now; return; }
            const el = now - lastT;
            if (el < (COARSE || window.__flipping ? 30 : 15)) return; // menos frames en celular y mientras se pasa de página
            lastT = now;
            const k = Math.min(3, el / 16.67); // velocidades iguales sin importar los fps
            cx.clearRect(0, 0, W, H);
            P.forEach(p => {
                p.x += p.vx * k; p.y += p.vy * k;
                if (p.life === Infinity) {
                    p.a = 0.12 + 0.25 * Math.abs(Math.sin(now / 1800 + p.x));
                    if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
                } else { p.vy += 0.05 * k; p.life -= k; p.a = Math.max(0, p.life / 60); }
                cx.globalAlpha = Math.min(1, p.a);
                cx.fillStyle = p.life === Infinity ? "#e6cdfa" : "#ffe9b8";
                cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.283); cx.fill();
            });
            P = P.filter(p => p.life > 0);
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
        window.__zoomOpen = true;
    }
    function closeZoom() {
        zoomEl.classList.remove("open"); zoomEl.setAttribute("aria-hidden", "true");
        window.__zoomOpen = false;
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
