(async () => {
    const pad = n => String(n).padStart(2, "0");
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* Fotos: si existe la carpeta fotos/mini (la crea medir.html) las páginas usan esas versiones
       livianas y la original solo se descarga al ampliar una foto. */
    let useMini = true;
    const thumb = n => (useMini ? "fotos/mini/" : "fotos/") + pad(n) + ".jpg";
    const full = n => "fotos/" + pad(n) + ".jpg";
    let miniOk = 0, miniFail = 0; // se decide sobre la marcha, sin bloquear el arranque

    /* ---------- CONTENIDO ---------- */
    const HERO = [70, 53, 82, 86];
    const CHAPTERS = [
        { k: "Papá, mamá y amigos", t: "Abrazos, regalos y buenos deseos", a: 1, b: 16 },
        { k: "Juegos y mucha energía", t: "¡A jugar y reír sin parar!", a: 17, b: 66 },
        { k: "Una canción, diez velitas y miles de recuerdos", t: "Pidamos un deseo", a: 67, b: 111 }
    ];
    // Proporción (ancho ÷ alto) de las fotos 01…111, para armar cada página sin recortar nada.
    // Si está en null se miden al abrir el álbum (tarda un poco la primera vez).
    // Para evitar esa espera: abre medir.html, copia la línea que genera y reemplaza esta.
    const RATIOS = [1.5, 1, 1, 1, 1.237, 1.051, 1, 1, 1.303, 0.8, 0.945, 1.407, 1.232, 1.166, 0.667, 0.731, 0.778, 1.5, 1.317, 0.715, 1.169, 1.383, 1.5, 1.406, 1.27, 1.151, 1.151, 1.189, 1.5, 1.502, 1.457, 0.648, 1.588, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 0.719, 0.79, 1.329, 1.095, 1.379, 1.306, 1.231, 1.326, 1.308, 1.356, 1.419, 1.5, 1.5, 1.319, 1.647, 1.468, 1.209, 0.754, 0.754, 1.412, 1.434, 1.5, 1.5, 1.152, 1.5, 1.5, 1.5, 1.5, 1.266, 1.374, 1.5, 1.5, 1.414, 1.447, 1.447, 1.5, 1.5, 1.5, 1.391, 1.278, 1.5, 1.5, 1.033, 0.65, 1.481, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.069, 1.331, 1.468, 1.453, 0.656, 0.751, 0.803, 0.953, 0.918, 0.802, 0.76, 1.02, 0.812, 1.5, 0.732, 0.854, 0.791];
    const CAPS = ["Diez años, diez velitas", "Risas que se quedan", "Un día para recordar", "Cada foto, un abrazo", "Gracias por tanto"];
    const EGGS = [
        "Un deseo escondido: que nunca dejes de reír así.",
        "Diez años y toda una vida de aventuras por delante.",
        "Esta mariposa guarda un secreto: ¡eres increíble!"
    ];
    const BUTTERFLY = `<svg class="bf" viewBox="0 0 60 50" aria-hidden="true"><path d="M30 25C20 5 2 2 2 15c0 9 13 13 28 10zM30 26C15 28 4 35 8 43c4 5 16-5 22-17zM30 25C40 5 58 2 58 15c0 9-13 13-28 10zM30 26c15 2 26 9 22 17-4 5-16-5-22-17z"/><path d="M29 13c-1 5-1 19 0 25 1 0 2-6 2-25z"/><circle cx="30" cy="11" r="2"/></svg>`;

    /* ---------- DISEÑO SEGÚN LA PROPORCIÓN DE CADA FOTO ----------
       Las fotos no se recortan: se prueban todas las formas de repartir las fotos de una página
       en filas o columnas (cada foto conserva su proporción) y se elige la que mejor aprovecha la hoja.
       Unidades: 1 = 1% del ancho de la hoja (la hoja mide 18 × 25, igual que .book en el CSS). */
    const PAGE_H = 100 * 25 / 18;
    const BOX_W = 83;                 // zona útil: coincide con .grid (inset 8% + 9%)
    const BOX_H = PAGE_H * 0.84;      // sin leyenda (inset 7% + 9%)
    const BOX_H_CAP = PAGE_H * 0.79;  // con leyenda (inset 7% + 14%)
    const GAP = 2.2;                  // espacio entre fotos
    const MAX_PER_PAGE = 6;
    const K_PENALTY = [0, 0.14, 0.02, 0, 0.01, 0.05, 0.1]; // preferencia por 2–4 fotos por página
    const MIN_SHARE = 0.075;          // ninguna foto debe ocupar menos de ~7% de la zona útil

    // Formas de cortar k fotos consecutivas en grupos (p. ej. 4 → [1,3], [2,2], [1,1,2]…)
    const COMPS = Array.from({ length: MAX_PER_PAGE + 1 }, (_, k) => {
        const out = [];
        for (let mask = 0; k && mask < (1 << (k - 1)); mask++) {
            const sizes = []; let size = 1;
            for (let b = 0; b < k - 1; b++) {
                if (mask & (1 << b)) { sizes.push(size); size = 1; } else size++;
            }
            sizes.push(size);
            out.push(sizes);
        }
        return out;
    });

    // "R": cada grupo es una fila (fotos lado a lado) y las filas se apilan.
    // "C": cada grupo es una columna (fotos apiladas) y las columnas van lado a lado.
    function fitLayout(r, sizes, orient, boxH) {
        const g = GAP, groups = [];
        let p = 0;
        sizes.forEach(n => { groups.push(r.slice(p, p + n)); p += n; });
        const m = groups.length;
        const rects = [];
        let w, h;

        if (orient === "R") {
            const alpha = groups.map(gr => gr.reduce((a, x) => a + x, 0));
            const beta = groups.map(gr => g * (gr.length - 1));
            const A = alpha.reduce((a, x) => a + 1 / x, 0);
            const B = g * (m - 1) - beta.reduce((a, x, j) => a + x / alpha[j], 0);
            w = BOX_W; h = A * w + B;
            if (h > boxH) { h = boxH; w = (h - B) / A; }
            const rowH = groups.map((gr, j) => (w - beta[j]) / alpha[j]);
            if (rowH.some(x => !(x > 1))) return null;
            let y = 0;
            groups.forEach((gr, j) => {
                let x = 0;
                gr.forEach(ri => { rects.push({ x, y, w: ri * rowH[j], h: rowH[j] }); x += ri * rowH[j] + g; });
                y += rowH[j] + g;
            });
        } else {
            const alpha = groups.map(gr => 1 / gr.reduce((a, x) => a + 1 / x, 0));
            const beta = groups.map((gr, j) => -alpha[j] * g * (gr.length - 1));
            const P = alpha.reduce((a, x) => a + x, 0);
            const Q = beta.reduce((a, x) => a + x, 0) + g * (m - 1);
            h = boxH; w = P * h + Q;
            if (w > BOX_W) { w = BOX_W; h = (w - Q) / P; }
            const colW = groups.map((gr, j) => alpha[j] * h + beta[j]);
            if (colW.some(x => !(x > 1))) return null;
            let x = 0;
            groups.forEach((gr, j) => {
                let y = 0;
                gr.forEach(ri => { rects.push({ x, y, w: colW[j], h: colW[j] / ri }); y += colW[j] / ri + g; });
                x += colW[j] + g;
            });
        }

        // centrar en la zona útil
        const x0 = (BOX_W - w) / 2, y0 = (boxH - h) / 2;
        rects.forEach(q => { q.x += x0; q.y += y0; });

        const area = BOX_W * boxH;
        const cover = rects.reduce((a, q) => a + q.w * q.h, 0) / area;
        const minShare = Math.min(...rects.map(q => q.w * q.h)) / area;
        const score = (1 - cover) + K_PENALTY[r.length]
            + (minShare < MIN_SHARE ? (MIN_SHARE - minShare) * 10 : 0) + 0.03;
        return { rects, score, boxH };
    }

    // Mejor diseño para las fotos [i, i+k) (i es índice desde 0)
    function layoutFor(rs, i, k, boxH) {
        const r = rs.slice(i, i + k);
        let best = null;
        for (const sizes of COMPS[k]) {
            for (const orient of (k === 1 ? ["R"] : ["R", "C"])) {
                const L = fitLayout(r, sizes, orient, boxH);
                if (L && (!best || L.score < best.score)) best = L;
            }
        }
        return best;
    }

    // Reparte las fotos a..b (números de foto) en páginas minimizando el espacio desaprovechado
    function planChapter(rs, a, b) {
        const n = b - a + 1;
        const cost = new Array(n + 1).fill(Infinity), take = new Array(n + 1).fill(1);
        cost[n] = 0;
        for (let s = n - 1; s >= 0; s--) {
            for (let k = 1; k <= Math.min(MAX_PER_PAGE, n - s); k++) {
                const L = layoutFor(rs, a - 1 + s, k, BOX_H);
                if (!L) continue;
                const c = L.score + cost[s + k];
                if (c < cost[s]) { cost[s] = c; take[s] = k; }
            }
        }
        const groups = [];
        for (let s = 0; s < n; s += take[s]) groups.push({ from: a + s, k: take[s] });
        return groups;
    }

    // Lee (o mide) la proporción ancho/alto de cada foto
    async function loadRatios() {
        const total = CHAPTERS[CHAPTERS.length - 1].b;
        if (Array.isArray(RATIOS) && RATIOS.length >= total) return RATIOS;
        const key = "album-ratios-v1-" + total;
        try {
            const c = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(c) && c.length >= total && c.every(x => x > 0)) return c;
        } catch (_) {}

        const box = document.createElement("div");
        box.className = "loading";
        box.innerHTML = "<p>Preparando el álbum…</p><i></i>";
        document.body.appendChild(box);

        const out = new Array(total).fill(0);
        let next = 0, done = 0;
        const worker = async () => {
            while (next < total) {
                const n = ++next;
                await new Promise(res => {
                    const im = new Image();
                    im.onload = () => { if (im.naturalHeight) out[n - 1] = +(im.naturalWidth / im.naturalHeight).toFixed(3); res(); };
                    im.onerror = res;
                    im.src = thumb(n);
                });
                box.style.setProperty("--p", Math.round(++done / total * 100) + "%");
            }
        };
        await Promise.all(Array.from({ length: 6 }, worker));
        const ok = out.map(x => x || 1.5); // si una foto no carga, se asume horizontal 3:2
        try { if (out.every(Boolean)) localStorage.setItem(key, JSON.stringify(ok)); } catch (_) {}
        box.remove();
        return ok;
    }

    /* ---------- CONSTRUCCIÓN DE PÁGINAS ---------- */
    const pages = [];
    const ratios = await loadRatios();
    pages.push({
        cls: "cover",
        h: `<div class="hero">${HERO.map((n, i) => `<img class="h${i ? "" : " on"}" data-src="${thumb(n)}" data-full="${full(n)}" alt="${i ? "" : "Portada"}" draggable="false">`).join("")}</div>
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

    const plans = CHAPTERS.map(c => planChapter(ratios, c.a, c.b));
    const totalPhotoPages = plans.reduce((sum, g) => sum + g.length, 0);
    const eggPages = [0.12, 0.42, 0.75].map(f => Math.max(1, Math.round(totalPhotoPages * f)));
    const pct = v => +v.toFixed(3);
    let photoPages = 0, eggIndex = 0;
    CHAPTERS.forEach((c, ci) => {
        pages.push({
            cls: "txt",
            h: `<div class="num">${["I", "II", "III"][ci]}</div><p class="kick">${c.k}</p><h2>${c.t}</h2>${BUTTERFLY}`
        });
        plans[ci].forEach(({ from, k }) => {
            const hasCap = photoPages % 3 === 1;
            const boxH = hasCap ? BOX_H_CAP : BOX_H;
            const L = layoutFor(ratios, from - 1, k, boxH);
            const slots = L.rects.map((q, j) => {
                const n = from + j;
                return `<figure class="s" style="left:${pct(q.x / BOX_W * 100)}%;top:${pct(q.y / boxH * 100)}%;width:${pct(q.w / BOX_W * 100)}%;height:${pct(q.h / boxH * 100)}%"><img data-src="${thumb(n)}" data-full="${full(n)}" alt="Fotografía ${pad(n)}" draggable="false"></figure>`;
            });
            const egg = eggPages.includes(photoPages) && eggIndex < EGGS.length
                ? `<button class="egg" data-msg="${EGGS[eggIndex++]}" aria-label="Sorpresa escondida">${BUTTERFLY}</button>` : "";
            pages.push({
                cls: `photos${hasCap ? " has-cap" : ""}`,
                h: `<div class="grid">${slots.join("")}</div>${hasCap ? `<p class="cap">${CAPS[photoPages % CAPS.length]}</p>` : ""}${egg}`
            });
            photoPages++;
        });
    });
    pages.push({
        cls: "back",
        h: `<div class="bframe"></div>
            <div class="bcol">
                <p class="bfin">Fin del álbum</p>
                <h2>Hasta el<br>próximo año</h2>
                <div class="bbody">
                    <figure class="s bphoto" style="aspect-ratio:${clamp(ratios[69] || 0.75, 0.62, 1.6).toFixed(3)}"><img data-src="${thumb(70)}" data-full="${full(70)}" alt="Keren" draggable="false"></figure>
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

    /* Carga con prioridad: primero las hojas que se ven, luego las siguientes.
       Solo hay unas pocas descargas a la vez, así las fotos de la hoja actual no compiten con las demás. */
    const MAX_LOADS = matchMedia("(pointer: coarse)").matches ? 5 : 8;
    const queue = new Set();
    let loadingNow = 0, curF = 0;

    function start(im) {
        loadingNow++;
        const hero = im.classList.contains("h");
        let retried = false, freed = false;
        const free = () => { if (!freed) { freed = true; loadingNow--; pump(); } };
        im.onload = () => {
            if (!retried) miniOk++;
            free(); // el cupo se libera al terminar la descarga, no la decodificación
            // decodificar antes de mostrar: evita el tirón al aparecer y al empezar el doblez
            const show = () => { if (!hero) im.classList.add("on"); };
            if (im.decode) im.decode().then(show, show); else show();
        };
        im.onerror = () => {
            if (!retried && im.dataset.full && !im.src.endsWith(im.dataset.full)) {
                if (useMini && !miniOk && ++miniFail >= 3) { // la carpeta mini no está donde se espera
                    useMini = false;
                    console.warn("No se encontró fotos/mini/: se usan las fotos originales (más lentas). Revisa que existan fotos/mini/01.jpg, 02.jpg…");
                }
                retried = true; im.src = im.dataset.full;
            } else free();
        };
        const d = im._pi - curF;
        im.fetchPriority = d >= 0 && d <= 2 ? "high" : "low";
        im.src = useMini || !im.dataset.full ? im.dataset.src : im.dataset.full;
        im.removeAttribute("data-src");
    }
    function pump() {
        while (loadingNow < MAX_LOADS && queue.size) {
            let best = null, bp = Infinity;
            queue.forEach(im => {
                const d = im._pi - curF;
                const pr = d >= 0 ? d : -d * 1.5 + 0.5; // lo de adelante pesa más que lo de atrás
                if (pr < bp) { bp = pr; best = im; }
            });
            if (bp > 6 && loadingNow >= 2) break; // precarga lejana: solo 2 cupos, el resto queda libre para lo cercano
            queue.delete(best);
            start(best);
        }
    }
    function forceLoad(el) { // una hoja a punto de doblarse necesita todas sus fotos ya
        el.querySelectorAll("img[data-src]").forEach(im => { queue.delete(im); start(im); });
    }
    function loadNear() {
        const f = Math.floor(pos);
        curF = f;
        for (let i = 0; i < N; i++) { // todo el álbum, pero la prioridad pone primero lo cercano
            els[i].querySelectorAll("img[data-src]").forEach(im => { im._pi = i; queue.add(im); });
        }
        pump();
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
        forceLoad(el);
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
        if (im && im.src) openZoom(im.dataset.full ? new URL(im.dataset.full, document.baseURI).href : im.src, im.alt, im.src);
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
    let zoomToken = 0;
    function openZoom(src, alt, preview) {
        Z = { s: 1, x: 0, y: 0 }; applyZ();
        const token = ++zoomToken;
        zimg.alt = alt || "";
        zimg.src = preview || src; // se ve al instante la versión que ya está cargada…
        if (preview && preview !== src) { // …y se cambia por la original en cuanto llega
            const big = new Image();
            big.onload = () => { if (token === zoomToken) zimg.src = src; };
            big.src = src;
        }
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
