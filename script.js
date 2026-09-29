/* ==========================================================
   MAPA DO MASTER SHOPPING
   - SVG inline: o zoom redesenha em vetor (sempre nítido)
   - Zoom por pinça, roda do mouse e botões +/−
   - Arrastar com inércia e limites reais do mapa
   - Duplo toque para zoom
   - Modo tela cheia
   - Download em PNG (gerado a partir do próprio SVG)
   ========================================================== */

(() => {
    'use strict';

    const SVG_URL  = 'IMG/mapaMaster14.09.svg';
    const FONTES   = [
        { familia: 'Century Gothic', peso: 400, url: 'fonts/cg400.woff2' },
        { familia: 'Century Gothic', peso: 700, url: 'fonts/cg700.woff2' },
        { familia: 'Arial',          peso: 400, url: 'fonts/arial400.woff2' },
    ];

    // Área útil do desenho dentro da folha A4 do SVG (sem a margem em branco)
    const BASE = { x: 100, y: 100, w: 28950, h: 20800 };

    // Categorias da legenda -> cor de preenchimento das lojas no SVG.
    // (A bolinha "Feminina" da legenda é vermelho puro, mas as lojas usam outro tom.)
    // Fitness e Pijamas e Lingerie usam a MESMA cor no arquivo, então hoje destacam as mesmas lojas.
    const CATEGORIAS = [
        { nome: 'Feminina',           cores: ['rgb(205,56,59)'] },
        { nome: 'Evangélica',         cores: ['rgb(113,203,220)'] },
        { nome: 'Jeans',              cores: ['rgb(73,92,155)'] },
        { nome: 'Masculina',          cores: ['rgb(70,118,70)'] },
        { nome: 'Utilidades',         cores: ['rgb(171,65,127)'] },
        { nome: 'Plus Size',          cores: ['rgb(248,181,84)'] },
        { nome: 'Acessórios',         cores: ['rgb(239,135,66)'] },
        { nome: 'Fitness',            cores: ['rgb(57,161,136)'] },
        { nome: 'Infantil',           cores: ['rgb(51,49,132)'] },
        { nome: 'Pijamas e Lingerie', cores: ['rgb(57,161,136)'] },
        { nome: 'Artigos de Loja',    cores: ['rgb(170,109,87)'] },
        { nome: 'Agentes de Moda',    cores: ['rgb(215,179,105)'] },
        { nome: 'Café/Restaurante',   cores: ['rgb(255,199,0)'] },
    ];
    const PAGINA = { w: 29700, h: 21000 };   // folha A4 do SVG original

    const MIN_ZOOM = 1;
    const MAX_ZOOM = 8;

    const frame   = document.getElementById('mapaFrame');
    const btnIn   = document.getElementById('btnZoomIn');
    const btnOut  = document.getElementById('btnZoomOut');
    const btnFull = document.getElementById('btnFullscreen');
    const btnDown = document.getElementById('btnDownload');
    const barraFiltros = document.getElementById('filtros');

    let svg = null;
    let zoom = 1;
    let cx = BASE.x + BASE.w / 2;
    let cy = BASE.y + BASE.h / 2;
    let cw = 1, ch = 1;          // tamanho do quadro em px
    let rafRender = null;
    let animRAF = null;
    let inertiaRAF = null;

    // ---------- Geometria ----------
    const pxPorUnidade = (z = zoom) => Math.min(cw / BASE.w, ch / BASE.h) * z;

    function limitar() {
        const ppu = pxPorUnidade();
        const vw = cw / ppu, vh = ch / ppu;
        cx = vw >= BASE.w ? BASE.x + BASE.w / 2
                          : Math.max(BASE.x + vw / 2, Math.min(BASE.x + BASE.w - vw / 2, cx));
        cy = vh >= BASE.h ? BASE.y + BASE.h / 2
                          : Math.max(BASE.y + vh / 2, Math.min(BASE.y + BASE.h - vh / 2, cy));
    }

    function desenhar() {
        rafRender = null;
        limitar();
        const ppu = pxPorUnidade();
        const vw = cw / ppu, vh = ch / ppu;

        if (svg) {
            svg.setAttribute('viewBox', `${cx - vw / 2} ${cy - vh / 2} ${vw} ${vh}`);
            return;
        }

        // Plano B: o SVG não carregou, então dá zoom na imagem simples (fica um pouco menos nítido)
        const img = frame.querySelector('.map-fallback');
        if (!img) return;
        const fp = Math.min(cw / PAGINA.w, ch / PAGINA.h);        // ajuste "contain" da folha inteira
        const ox = (cw - PAGINA.w * fp) / 2;
        const oy = (ch - PAGINA.h * fp) / 2;
        const k  = ppu / fp;
        const tx = (-ox / fp - (cx - vw / 2)) * ppu;
        const ty = (-oy / fp - (cy - vh / 2)) * ppu;
        img.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
    }

    function pedirDesenho() {
        if (!rafRender) rafRender = requestAnimationFrame(desenhar);
    }

    function medir() {
        const r = frame.getBoundingClientRect();
        cw = Math.max(1, r.width);
        ch = Math.max(1, r.height);
        pedirDesenho();
    }

    // Ponto do mapa (em unidades) que está sob um ponto da tela (px relativos ao quadro)
    function unidadeSob(fx, fy) {
        const ppu = pxPorUnidade();
        return { x: cx + (fx - cw / 2) / ppu, y: cy + (fy - ch / 2) / ppu };
    }

    // Mantém a unidade (ux, uy) sob o ponto (fx, fy) com o zoom z
    function ancorar(z, ux, uy, fx, fy) {
        zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
        const ppu = pxPorUnidade();
        cx = ux - (fx - cw / 2) / ppu;
        cy = uy - (fy - ch / 2) / ppu;
        pedirDesenho();
    }

    function pontoNoQuadro(clientX, clientY) {
        const r = frame.getBoundingClientRect();
        return { x: clientX - r.left, y: clientY - r.top };
    }

    // ---------- Animação suave (botões, duplo toque) ----------
    function animarPara(zAlvo, fx, fy) {
        cancelarAnimacao();
        cancelarInercia();
        zAlvo = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zAlvo));
        const z0 = zoom;
        const u = unidadeSob(fx, fy);
        const t0 = performance.now();
        const dur = 220;

        function passo(t) {
            const k = Math.min(1, (t - t0) / dur);
            const e = 1 - Math.pow(1 - k, 3);
            const z = z0 * Math.pow(zAlvo / z0, e);   // interpolação geométrica
            ancorar(z, u.x, u.y, fx, fy);
            desenhar();
            animRAF = k < 1 ? requestAnimationFrame(passo) : null;
        }
        animRAF = requestAnimationFrame(passo);
    }

    function cancelarAnimacao() {
        if (animRAF) { cancelAnimationFrame(animRAF); animRAF = null; }
    }

    const centro = () => ({ x: cw / 2, y: ch / 2 });

    btnIn.addEventListener('click',  () => { const c = centro(); animarPara(zoom * 1.5, c.x, c.y); });
    btnOut.addEventListener('click', () => { const c = centro(); animarPara(zoom / 1.5, c.x, c.y); });

    // ---------- Tela cheia ----------
    btnFull.addEventListener('click', () => {
        document.body.classList.toggle('fullscreen');
        requestAnimationFrame(medir);
    });

    // ==========================================================
    // POINTER EVENTS (mouse + toque)
    // ==========================================================
    const pointers = new Map();
    let arrasto = null;   // { x, y, cx, cy }
    let pinca = null;     // { dist, zoom, ux, uy }
    let vx = 0, vy = 0, ultT = 0, ultX = 0, ultY = 0;
    let toque = null;     // para detectar toque simples/duplo
    let ultimoToque = { t: 0, x: 0, y: 0 };

    frame.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        frame.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        cancelarAnimacao();
        cancelarInercia();

        if (pointers.size === 1) {
            arrasto = { x: e.clientX, y: e.clientY, cx, cy };
            toque = { t: performance.now(), x: e.clientX, y: e.clientY, mexeu: false };
            vx = vy = 0; ultT = performance.now(); ultX = e.clientX; ultY = e.clientY;
            frame.classList.add('grabbing');
        } else if (pointers.size === 2) {
            arrasto = null;
            toque = null;
            frame.classList.remove('grabbing');
            const [a, b] = [...pointers.values()];
            const c = pontoNoQuadro((a.x + b.x) / 2, (a.y + b.y) / 2);
            const u = unidadeSob(c.x, c.y);
            pinca = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom, ux: u.x, uy: u.y };
        }
    });

    frame.addEventListener('pointermove', (e) => {
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pinca && pointers.size === 2) {
            const [a, b] = [...pointers.values()];
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            const c = pontoNoQuadro((a.x + b.x) / 2, (a.y + b.y) / 2);
            ancorar(pinca.zoom * (dist / pinca.dist), pinca.ux, pinca.uy, c.x, c.y);
            return;
        }

        if (arrasto && pointers.size === 1) {
            const dx = e.clientX - arrasto.x;
            const dy = e.clientY - arrasto.y;
            if (toque && Math.hypot(dx, dy) > 8) toque.mexeu = true;

            const ppu = pxPorUnidade();
            cx = arrasto.cx - dx / ppu;
            cy = arrasto.cy - dy / ppu;
            pedirDesenho();

            const agora = performance.now();
            const dt = Math.max(1, agora - ultT);
            vx = (e.clientX - ultX) / dt * 16;
            vy = (e.clientY - ultY) / dt * 16;
            ultT = agora; ultX = e.clientX; ultY = e.clientY;
        }
    });

    function finalizar(e) {
        if (!pointers.has(e.pointerId)) return;
        pointers.delete(e.pointerId);

        if (pointers.size < 2) pinca = null;

        if (pointers.size === 1) {
            // Voltou a um dedo: recomeça o arrasto a partir da posição atual
            const [p] = [...pointers.values()];
            arrasto = { x: p.x, y: p.y, cx, cy };
            return;
        }

        if (pointers.size === 0) {
            frame.classList.remove('grabbing');
            const eraArrasto = !!arrasto;
            arrasto = null;

            // Toque simples numa linha da legenda do mapa = filtra
            if (e.type === 'pointerup' && toque && !toque.mexeu && itensLegenda.length) {
                const p = pontoNoQuadro(e.clientX, e.clientY);
                const u = unidadeSob(p.x, p.y);
                const item = itensLegenda.find(i => u.x >= i.x && u.x <= i.x + i.w && u.y >= i.y && u.y <= i.y + i.h);
                if (item) {
                    alternarFiltro(item.nome);
                    toque = null;
                    ultimoToque = { t: 0, x: 0, y: 0 };
                    return;
                }
            }

            // Duplo toque
            if (e.type === 'pointerup' && toque && !toque.mexeu) {
                const agora = performance.now();
                const perto = Math.hypot(e.clientX - ultimoToque.x, e.clientY - ultimoToque.y) < 40;
                if (agora - ultimoToque.t < 300 && perto) {
                    const p = pontoNoQuadro(e.clientX, e.clientY);
                    animarPara(zoom > 1.5 ? 1 : 3, p.x, p.y);
                    ultimoToque = { t: 0, x: 0, y: 0 };
                } else {
                    ultimoToque = { t: agora, x: e.clientX, y: e.clientY };
                }
                toque = null;
                return;
            }
            toque = null;

            if (eraArrasto && zoom > 1 && Math.hypot(vx, vy) > 2 && performance.now() - ultT < 80) {
                iniciarInercia();
            }
        }
    }

    frame.addEventListener('pointerup', finalizar);
    frame.addEventListener('pointercancel', finalizar);

    // ---------- Inércia ----------
    function iniciarInercia() {
        cancelarInercia();
        function passo() {
            vx *= 0.92; vy *= 0.92;
            const ppu = pxPorUnidade();
            cx -= vx / ppu;
            cy -= vy / ppu;
            desenhar();
            inertiaRAF = (Math.abs(vx) > 0.3 || Math.abs(vy) > 0.3) ? requestAnimationFrame(passo) : null;
        }
        inertiaRAF = requestAnimationFrame(passo);
    }

    function cancelarInercia() {
        if (inertiaRAF) { cancelAnimationFrame(inertiaRAF); inertiaRAF = null; }
    }

    // ---------- Roda do mouse / pinça do trackpad ----------
    document.getElementById('viewport').addEventListener('wheel', (e) => {
        e.preventDefault();
        cancelarAnimacao(); cancelarInercia();
        const p = pontoNoQuadro(e.clientX, e.clientY);
        const u = unidadeSob(p.x, p.y);
        const fator = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018));
        ancorar(zoom * fator, u.x, u.y, p.x, p.y);
    }, { passive: false });

    // ---------- Bloquear gestos nativos ----------
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(evt => {
        document.addEventListener(evt, (e) => e.preventDefault());
    });
    document.addEventListener('touchmove', (e) => {
        if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });

    // ==========================================================
    // CARREGAR O SVG (inline)
    // ==========================================================
    async function carregarSvg() {
        // Garante que as fontes estejam prontas antes de mostrar o texto
        // (se faltar algum arquivo de fonte, o mapa carrega mesmo assim, só espera no máximo 2 s)
        if (document.fonts && document.fonts.load) {
            await Promise.race([
                Promise.allSettled(FONTES.map(f => document.fonts.load(`${f.peso} 100px "${f.familia}"`))),
                new Promise(ok => setTimeout(ok, 2000)),
            ]);
        }
        const resp = await fetch(SVG_URL);
        if (!resp.ok) throw new Error('SVG não encontrado');
        const texto = await resp.text();
        const doc = new DOMParser().parseFromString(texto, 'image/svg+xml');
        const el = doc.documentElement;
        if (el.nodeName !== 'svg') throw new Error('SVG inválido');

        svg = document.importNode(el, true);
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', 'Mapa do Master Shopping');

        frame.replaceChildren(svg);
        medir();
        try { prepararFiltro(); } catch (err) { console.warn('Filtro indisponível:', err); }
    }

    carregarSvg().catch(err => {
        console.warn('Mapa: usando imagem simples (', err.message, ')');
        // Sem o SVG não há como filtrar: avisa em vez de esconder os botões sem explicação
        barraFiltros.textContent = 'Filtro indisponível: o mapa vetorial não carregou. ' +
            'Confira se o site está no servidor (não aberto do disco) e se a pasta IMG/ subiu.';
        barraFiltros.classList.add('aviso');
        barraFiltros.hidden = false;
    });

    new ResizeObserver(medir).observe(frame);


    // ==========================================================
    // FILTRO POR CATEGORIA
    // Escurece (com um véu branco) tudo que NÃO é da categoria escolhida.
    // ==========================================================
    const NS = 'http://www.w3.org/2000/svg';
    let itensLegenda = [];          // áreas tocáveis da legenda dentro do mapa
    let areaLegenda = null;         // retângulo da legenda (fica sempre visível)
    let camadas = [];               // formas preenchidas, na ordem de empilhamento do SVG
    let filtroAtual = null;
    let veu = null, defsFiltro = null;

    function criarSvg(tag, attrs) {
        const el = document.createElementNS(NS, tag);
        for (const k in attrs) el.setAttribute(k, attrs[k]);
        return el;
    }

    function prepararFiltro() {
        const nomes = new Set(CATEGORIAS.map(c => c.nome));
        itensLegenda = [];
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;

        svg.querySelectorAll('text').forEach(t => {
            const nome = t.textContent.replace(/\s+/g, ' ').trim();
            if (!nomes.has(nome)) return;
            const b = t.getBBox();
            itensLegenda.push({ nome, x: b.x - 750, y: b.y - 80, w: b.width + 900, h: b.height + 160 });
            x0 = Math.min(x0, b.x - 800); y0 = Math.min(y0, b.y - 250);
            x1 = Math.max(x1, b.x + b.width + 250); y1 = Math.max(y1, b.y + b.height + 250);
        });
        if (!itensLegenda.length) { itensLegenda = []; return; }
        areaLegenda = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };

        // Formas preenchidas, NA ORDEM DO ARQUIVO (a ordem é o empilhamento: o que vem depois fica por cima).
        // Guardamos as lojas de alguma categoria e as formas grandes das outras cores, porque uma
        // forma grande por cima de uma loja (ex.: Hotel sobre um polígono vermelho) precisa continuar coberta.
        const cores = new Set(CATEGORIAS.flatMap(c => c.cores));
        camadas = [];
        svg.querySelectorAll('path').forEach(p => {
            const f = p.getAttribute('fill');
            if (!f || !f.startsWith('rgb(')) return;
            const b = p.getBBox();
            const eLoja = cores.has(f);
            if (!eLoja && (b.width < 350 || b.height < 250)) return;   // ignora letras e filetes
            const dentroLegenda = b.x >= areaLegenda.x && b.y >= areaLegenda.y &&
                                  b.x + b.width <= areaLegenda.x + areaLegenda.w &&
                                  b.y + b.height <= areaLegenda.y + areaLegenda.h;
            if (dentroLegenda) return;
            camadas.push({ fill: f, d: p.getAttribute('d'), x: b.x, y: b.y, w: b.width, h: b.height });
        });

        montarBotoes();
    }

    function montarBotoes() {
        barraFiltros.replaceChildren();
        const todas = document.createElement('button');
        todas.className = 'chip';
        todas.dataset.nome = '';
        todas.textContent = 'Todas';
        barraFiltros.appendChild(todas);

        CATEGORIAS.forEach(c => {
            const b = document.createElement('button');
            b.className = 'chip';
            b.dataset.nome = c.nome;
            b.style.setProperty('--cor', c.cores[0]);
            const bolinha = document.createElement('i');
            b.append(bolinha, c.nome);
            barraFiltros.appendChild(b);
        });

        barraFiltros.addEventListener('click', (e) => {
            const b = e.target.closest('.chip');
            if (!b) return;
            aplicarFiltro(b.dataset.nome || null);
        });
        barraFiltros.hidden = false;
        atualizarBotoes();
        requestAnimationFrame(medir);
    }

    function atualizarBotoes() {
        barraFiltros.querySelectorAll('.chip').forEach(b => {
            const ativo = (b.dataset.nome || null) === filtroAtual;
            b.setAttribute('aria-pressed', ativo ? 'true' : 'false');
            if (ativo && b.scrollIntoView) b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        });
    }

    function alternarFiltro(nome) {
        aplicarFiltro(filtroAtual === nome ? null : nome);
    }

    function aplicarFiltro(nome) {
        filtroAtual = nome;
        limparFiltro();
        atualizarBotoes();
        if (!nome || !svg) return;

        const cat = CATEGORIAS.find(c => c.nome === nome);
        const cores = new Set(cat.cores);
        const escolhidas = camadas.filter(c => cores.has(c.fill));
        if (!escolhidas.length) return;
        const toca = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

        // Máscara: branco = coberto pelo véu; preto = "furo" (lojas escolhidas e legenda).
        // Formas de outras cores que ficam POR CIMA de uma loja escolhida voltam a ser cobertas (branco).
        // Cada forma é um elemento próprio, então sobreposições não criam falhas.
        const l = areaLegenda;
        const mascara = criarSvg('mask', {
            id: 'filtro-mascara', maskUnits: 'userSpaceOnUse',
            x: 0, y: 0, width: PAGINA.w, height: PAGINA.h,
        });
        mascara.append(
            criarSvg('rect', { x: 0, y: 0, width: PAGINA.w, height: PAGINA.h, fill: '#fff' }),
            criarSvg('rect', { x: l.x, y: l.y, width: l.w, height: l.h, fill: '#000' })
        );
        camadas.forEach(c => {
            const escolhida = cores.has(c.fill);
            if (!escolhida && !escolhidas.some(s => toca(s, c))) return;
            mascara.appendChild(criarSvg('path', {
                d: c.d, fill: escolhida ? '#000' : '#fff', 'fill-rule': 'evenodd',
            }));
        });
        defsFiltro = criarSvg('defs', { class: 'filtro-defs' });
        defsFiltro.appendChild(mascara);

        veu = criarSvg('rect', {
            x: 0, y: 0, width: PAGINA.w, height: PAGINA.h,
            fill: '#ffffff', 'fill-opacity': '0.86', mask: 'url(#filtro-mascara)',
            'pointer-events': 'none', class: 'filtro-veu',
        });
        svg.append(defsFiltro, veu);
    }

    function limparFiltro() {
        [veu, defsFiltro].forEach(el => el && el.remove());
        veu = defsFiltro = null;
    }

    // ==========================================================
    // DOWNLOAD EM PNG (gerado a partir do SVG + fontes)
    // ==========================================================
    async function paraBase64(url) {
        const buf = await (await fetch(url)).arrayBuffer();
        let bin = '';
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.length; i += 0x8000) {
            bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        }
        return btoa(bin);
    }

    async function gerarPng(largura = 4000) {
        const altura = Math.round(largura * BASE.h / BASE.w);

        const texto = await (await fetch(SVG_URL)).text();
        const doc = new DOMParser().parseFromString(texto, 'image/svg+xml');
        const el = doc.documentElement;
        el.setAttribute('width', largura);
        el.setAttribute('height', altura);
        el.setAttribute('viewBox', `${BASE.x} ${BASE.y} ${BASE.w} ${BASE.h}`);

        // Fontes embutidas em base64 (um SVG usado como imagem não enxerga as do site)
        let css = '';
        for (const f of FONTES) {
            try {
                css += `@font-face{font-family:"${f.familia}";font-weight:${f.peso};` +
                       `src:url(data:font/woff2;base64,${await paraBase64(f.url)}) format("woff2");}`;
            } catch (_) { /* sem essa fonte, o PNG usa a fonte padrão do aparelho */ }
        }
        css += 'tspan[font-family^="Arial"]{font-family:"Arial","Helvetica Neue",Helvetica,"Liberation Sans",Roboto,sans-serif;}';
        const style = doc.createElementNS('http://www.w3.org/2000/svg', 'style');
        style.textContent = css;
        el.insertBefore(style, el.firstChild);

        const xml = new XMLSerializer().serializeToString(el);
        const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));

        const img = new Image();
        img.decoding = 'async';
        await new Promise((ok, erro) => { img.onload = ok; img.onerror = erro; img.src = url; });

        const canvas = document.createElement('canvas');
        canvas.width = largura;
        canvas.height = altura;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, largura, altura);
        ctx.drawImage(img, 0, 0, largura, altura);
        URL.revokeObjectURL(url);

        return new Promise((ok, erro) => canvas.toBlob(b => b ? ok(b) : erro(new Error('toBlob')), 'image/png'));
    }

    function baixar(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mapa-master-shopping.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }

    btnDown.addEventListener('click', async () => {
        const rotulo = btnDown.querySelector('span');
        const original = rotulo.textContent;
        btnDown.disabled = true;
        rotulo.textContent = 'Gerando imagem…';
        try {
            baixar(await gerarPng(4000));
        } catch (err) {
            console.warn('Download em PNG falhou, tentando tamanho menor', err);
            try { baixar(await gerarPng(2400)); }
            catch (e2) {
                // Plano B: baixa o arquivo do mapa como está (SVG)
                const a = document.createElement('a');
                a.href = SVG_URL; a.download = 'mapa-master-shopping.svg';
                document.body.appendChild(a); a.click(); a.remove();
            }
        } finally {
            btnDown.disabled = false;
            rotulo.textContent = original;
        }
    });

    medir();
})();
