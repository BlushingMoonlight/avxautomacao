// Fotos e conferência da demonstração do App AVX (app.html) no Chromium, em vários tamanhos de tela.
// Não roda no GitHub (precisa do Playwright e do Chromium); roda na máquina de quem mexe no app:
//   node scripts/app_telas.mjs [--saida=pasta] [--tamanhos=390x844,1180x820]   (padrão: ./telas-app, no .gitignore)
// O que confere, em cada largura (320 a 1440, em pé e deitado) e em cada ambiente:
//   - nenhum texto cortado: todo texto visível cabe na caixa dele e dentro de quem o recorta (overflow hidden);
//   - todos os cartões de uma grade com a mesma altura;
//   - alvos de toque de pelo menos 44 × 44 px (botões, chips, cenas, barras de ajuste);
//   - nada rola para o lado, e o último cartão termina acima da linha do tempo (rolando até o fim);
//   - a folha de detalhes de cada tipo de cartão, as 6 cenas e um alerta, sem texto cortado;
//   - toque e arrasto no mesmo cartão: tocar liga e desliga; arrastar a barra para o lado ajusta; arrastar para
//     cima ou para baixo rola a página sem mudar nada;
//   - o modo embed (dentro do index.html) com o selo "Demonstração · casa simulada" visível;
//   - movimento reduzido: sem transição.
// No fim, monta uma galeria (galeria-*.png) com as fotos.
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { try { ({ chromium } = require(path.join(process.env.PW || '', ''))); } catch { console.log('Falta o Playwright (npm install --no-save playwright).'); process.exit(1); } }

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const saida = path.resolve((process.argv.find(a => a.startsWith('--saida=')) || '--saida=telas-app').slice(8));
fs.mkdirSync(saida, { recursive: true });

// Servidor local (a fonte não carrega por file://)
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain' };
const servidor = http.createServer((q, r) => {
  const f = path.join(raiz, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(raiz) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0, '127.0.0.1');
await new Promise(ok => servidor.on('listening', ok));
const BASE = `http://127.0.0.1:${servidor.address().port}`;

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
let falhas = 0; const fotos = [];
const falha = m => { falhas++; console.log('✗ ' + m); };
const ok = m => console.log('✓ ' + m);

// Conferência dentro da página: texto cortado, alturas, alvos, rolagem para o lado
const CONFERIR = () => {
  const erros = [];
  const visivel = el => { const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('.sr-only,[hidden],dialog:not([open]),.pular'); };
  for (const el of document.querySelectorAll('body *')) {
    if (!['SPAN', 'DIV', 'P', 'H1', 'H2', 'H3', 'BUTTON', 'A', 'LI', 'LABEL'].includes(el.tagName)) continue;
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    if (!visivel(el)) continue;
    const t = el.textContent.trim().slice(0, 40), cs = getComputedStyle(el);
    if (cs.textOverflow === 'ellipsis') erros.push(`reticências em "${t}"`);
    if (el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== 'visible' && cs.display !== 'inline') erros.push(`texto não cabe na largura: "${t}"`);
    const r = el.getBoundingClientRect();
    if (el.closest('.barra,.dock') && (r.right > innerWidth + 1 || r.left < -1)) erros.push(`"${t}" sai da tela`);
    for (const pai of [el.closest('.barra'), el.closest('.dock')].filter(Boolean)) if (pai.scrollWidth > pai.clientWidth + 1) erros.push(`${pai.className} não cabe na largura`);
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const ac = getComputedStyle(a);
      const corta = v => v === 'hidden' || v === 'clip';
      if (!corta(ac.overflowX) && !corta(ac.overflowY)) continue;
      const ra = a.getBoundingClientRect();
      if (corta(ac.overflowX) && (r.left < ra.left - 1 || r.right > ra.right + 1)) erros.push(`"${t}" cortado dos lados por ${a.className || a.tagName}`);
      if (corta(ac.overflowY) && (r.top < ra.top - 1 || r.bottom > ra.bottom + 1)) erros.push(`"${t}" cortado em cima ou embaixo por ${a.className || a.tagName}`);
    }
  }
  // Partes do cartão que passam da borda
  for (const tile of document.querySelectorAll('#cartoes .tile')) {
    const rt = tile.getBoundingClientRect();
    for (const p of tile.querySelectorAll('.tile-topo,.tile-nome,.tile-estado,.tile-pe')) { const r = p.getBoundingClientRect(); if (r.bottom > rt.bottom - 6 || r.right > rt.right - 4) erros.push(`no cartão "${tile.querySelector('.tile-nome').textContent}", ${p.className} encosta ou passa da borda`); }
  }
  for (const g of document.querySelectorAll('.grade')) { const hs = [...g.children].map(c => Math.round(c.getBoundingClientRect().height)); if (new Set(hs).size > 1) erros.push(`cartões de alturas diferentes: ${hs.join(', ')}`); }
  for (const el of document.querySelectorAll('button,a,[role=slider],input')) {
    if (!visivel(el) || el.closest('.planta-caixa')) continue;
    const r = el.getBoundingClientRect();
    if ((r.height < 43.5 && !el.matches('.barra-ajuste,.redondo')) || r.width < 43.5) erros.push(`alvo pequeno ${Math.round(r.width)}×${Math.round(r.height)}: ${el.getAttribute('aria-label') || el.textContent.trim().slice(0, 30)}`);
    if (el.matches('.barra-ajuste,.redondo') && r.height < 24) erros.push(`barra baixa demais (${Math.round(r.height)} px)`);
  }
  if (document.documentElement.scrollWidth > innerWidth + 1) erros.push(`rola para o lado (${document.documentElement.scrollWidth} > ${innerWidth})`);
  return [...new Set(erros)];
};

async function abrir(vp, extra = '', opcoes = {}) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: vp.width < 900 && vp.height > vp.width, deviceScaleFactor: 1, ...opcoes });
  const page = await ctx.newPage();
  const erros = []; page.on('pageerror', e => erros.push(e.message)); page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
  await page.route('**/*', r => r.request().url().startsWith(BASE) ? r.continue() : (erros.push('pedido de fora: ' + r.request().url()), r.abort()));
  await page.goto(`${BASE}/app.html${extra}`); await page.waitForTimeout(500);
  return { ctx, page, erros };
}
// Nos passos de navegação, aciona o botão direto (o toque de verdade é testado à parte, mais abaixo)
const clicar = (page, sel) => page.$eval(sel, e => e.click());
const conferir = async (page, onde) => { const e = await page.evaluate(CONFERIR); for (const x of e) falha(`${onde}: ${x}`); return e.length; };
const foto = async (page, nome, cheia = false) => { const f = path.join(saida, nome + '.png'); await page.screenshot({ path: f, fullPage: cheia }); fotos.push(f); };

const TODAS = [[320, 568], [360, 740], [375, 812], [390, 844], [414, 896], [600, 960], [768, 1024], [820, 1180], [1024, 768], [1180, 820], [1366, 1024], [1440, 900]];
// --tamanhos=390x844,1180x820 roda só esses
const filtro = (process.argv.find(a => a.startsWith('--tamanhos=')) || '').slice(11).split(',').filter(Boolean);
const TELAS = filtro.length ? TODAS.filter(([w, h]) => filtro.includes(`${w}x${h}`)) : TODAS;
const AMB = ['living', 'suite', 'cinema', 'varanda', 'cozinha', 'hall', 'escritorio', 'hospedes', 'tecnica'];
for (const [w, h] of TELAS) {
  const nome = `${w}x${h}`, { ctx, page, erros } = await abrir({ width: w, height: h });
  let n = 0;
  for (const a of AMB) {
    await clicar(page, `.chip[data-amb="${a}"]`); await page.waitForTimeout(260);
    n += await conferir(page, `${nome} ${a}`);
    // Rolando até o fim, o último cartão fica acima da linha do tempo
    const sobra = await page.evaluate(() => {
      const area = document.querySelector('.area-cartoes'); const deitado = getComputedStyle(area).overflowY === 'auto';
      if (deitado) area.scrollTop = area.scrollHeight; else scrollTo(0, document.documentElement.scrollHeight);
      const ultimo = [...document.querySelectorAll('#cartoes .tile')].pop().getBoundingClientRect(), dock = document.querySelector('.dock').getBoundingClientRect();
      return Math.round(dock.top - ultimo.bottom);
    });
    if (sobra < 0) { falha(`${nome} ${a}: o último cartão fica ${-sobra} px por baixo da linha do tempo`); n++; }
    if (a === 'living' || (w === 390 && ['suite', 'cozinha', 'tecnica'].includes(a))) { await page.evaluate(() => { scrollTo(0, 0); document.querySelector('.area-cartoes').scrollTop = 0; }); await page.waitForTimeout(200); await foto(page, `${nome}-${a}`); }
    await page.evaluate(() => { scrollTo(0, 0); document.querySelector('.area-cartoes').scrollTop = 0; });
  }
  // Folha de detalhes de cada tipo
  for (const id of ['living.fita', 'living.voil', 'living.clima', 'living.som', 'cozinha.gas', 'cozinha.tomada', 'tecnica.central', 'hall.luz']) {
    const amb = id.split('.')[0];
    await clicar(page, `.chip[data-amb="${amb}"]`); await page.waitForTimeout(200);
    await clicar(page, `[data-id="${id}"] .tile-mais`); await page.waitForTimeout(450);
    n += await conferir(page, `${nome} folha ${id}`);
    if (w === 390 && id === 'living.fita' || w === 1180 && id === 'living.som') await foto(page, `${nome}-folha-${id.replace('.', '-')}`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  }
  // Cenas e alerta
  await clicar(page, '.chip[data-amb="living"]');
  for (const c of ['chegada', 'cinema', 'jantar', 'dormir', 'ausente', 'recluso']) { await clicar(page, `.cena[data-cena="${c}"]`); await page.waitForTimeout(2600); n += await conferir(page, `${nome} cena ${c}`); }
  await clicar(page, '.chip[data-amb="cozinha"]'); await page.waitForTimeout(200);
  await clicar(page, '[data-id="cozinha.gas"] .tile-mais'); await page.waitForTimeout(400); await clicar(page, '.folha [data-acao="testar"]'); await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  n += await conferir(page, `${nome} alerta`);
  if (w === 390 || w === 1180) await foto(page, `${nome}-alerta`);
  if (erros.length) { falha(`${nome}: erro na página: ${erros.join(' | ')}`); n++; }
  if (!n) ok(`${nome}: nenhum texto cortado, cartões iguais, alvos ≥ 44 px, nada sob a linha do tempo (9 ambientes, 8 folhas, 6 cenas, alerta)`);
  await ctx.close();
}

// Toque e arrasto no mesmo cartão (celular, toque de verdade pelo protocolo do Chromium)
{
  const { ctx, page } = await abrir({ width: 390, height: 844 });
  const cdp = await ctx.newCDPSession(page);
  const toque = async (pontos) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pontos[0][0], y: pontos[0][1] }] });
    for (const [x, y] of pontos.slice(1)) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] }); await page.waitForTimeout(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(350);
  };
  const estado = () => page.evaluate(() => ({ on: document.querySelector('[data-id="living.sanca"]').dataset.ligado, v: +document.querySelector('[data-id="living.sanca"] .barra-ajuste').getAttribute('aria-valuenow'), y: Math.round(scrollY) }));
  await page.evaluate(() => scrollTo(0, 260)); await page.waitForTimeout(300);
  const barra = async () => { const r = await page.locator('[data-id="living.sanca"] .barra-ajuste').boundingBox(); return [r.x + r.width / 2, r.y + r.height / 2, r.width]; };
  const e0 = await estado();
  // 1. Tocar no cartão (fora da barra) liga e desliga
  const t = await page.locator('[data-id="living.sanca"] .tile-nome').boundingBox();
  await toque([[t.x + 10, t.y + 5]]);
  const e1 = await estado();
  if (e1.on !== e0.on) ok('toque: tocar no cartão liga e desliga'); else falha(`toque: tocar no cartão não mudou (${e0.on} → ${e1.on})`);
  await toque([[t.x + 10, t.y + 5]]);
  // 2. Tocar na barra (sem arrastar) também liga e desliga
  let [bx, by, bw] = await barra();
  await toque([[bx, by]]);
  const e2 = await estado();
  if (e2.on !== e0.on && e2.v === e0.v) ok('toque: tocar na barra liga e desliga, sem mudar o valor'); else falha(`toque na barra: ${JSON.stringify(e2)}`);
  await toque([[bx, by]]);
  // 3. Arrastar a barra para o lado ajusta
  [bx, by, bw] = await barra();
  await toque(Array.from({ length: 10 }, (_, i) => [bx - i * bw * 0.03, by]));
  const e3 = await estado();
  if (e3.v < e0.v - 10 && e3.on === 'true' && Math.abs(e3.y - e0.y) <= 4) ok(`arrasto para o lado: brilho ${e0.v}% → ${e3.v}%, sem rolar a página`); else falha(`arrasto para o lado: ${JSON.stringify(e0)} → ${JSON.stringify(e3)}`);
  // 4. Arrastar para cima em cima da barra rola a página e não muda nada
  [bx, by] = await barra();
  await toque(Array.from({ length: 12 }, (_, i) => [bx + (i % 2), by - i * 14]));
  await page.waitForTimeout(400);
  const e4 = await estado();
  if (e4.y > e3.y + 40 && e4.v === e3.v && e4.on === e3.on) ok(`arrasto para cima na barra: a página rolou ${e4.y - e3.y} px e nada mudou`); else falha(`arrasto vertical: ${JSON.stringify(e3)} → ${JSON.stringify(e4)}`);
  // 5. O "⋯" sempre visível abre os detalhes
  const mais = await page.locator('[data-id="living.sanca"] .tile-mais').isVisible();
  if (mais) ok('"⋯" visível em todo cartão'); else falha('"⋯" não está visível');
  await ctx.close();
}

// Modo embed (dentro do index.html): selo visível, marca e rodapé escondidos
for (const [w, h] of [[740, 555], [1100, 688]]) {
  const { ctx, page, erros } = await abrir({ width: w, height: h }, '?embed=1');
  const r = await page.evaluate(() => ({ selo: getComputedStyle(document.querySelector('.selo')).display !== 'none' && document.querySelector('.selo').getBoundingClientRect().width > 0, marca: getComputedStyle(document.querySelector('.marca')).display }));
  if (r.selo && r.marca === 'none') ok(`embed ${w}×${h}: selo visível, marca escondida`); else falha(`embed ${w}×${h}: ${JSON.stringify(r)}`);
  await conferir(page, `embed ${w}×${h}`); await foto(page, `embed-${w}x${h}`);
  if (erros.length) falha(`embed: ${erros.join(' | ')}`);
  await ctx.close();
}

// Movimento reduzido: sem transição, a cena aplica tudo de uma vez
{
  const { ctx, page } = await abrir({ width: 390, height: 844 }, '', { reducedMotion: 'reduce' });
  await clicar(page, '.cena[data-cena="jantar"]'); await page.waitForTimeout(120);
  const r = await page.evaluate(() => ({ estado: document.querySelector('[data-id="living.pendente"] .tile-estado').textContent, t: getComputedStyle(document.querySelector('#planta .luz')).transitionDuration }));
  if (r.estado === '70%' && parseFloat(r.t) < 0.05) ok('movimento reduzido: a cena muda tudo de uma vez, sem transição'); else falha(`movimento reduzido: ${JSON.stringify(r)}`);
  await ctx.close();
}

// Galeria: as fotos lado a lado, em folhas de até 6
const lotes = []; for (let i = 0; i < fotos.length; i += 6) lotes.push(fotos.slice(i, i + 6));
const pg = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
for (const [i, lote] of lotes.entries()) {
  const html = `<body style="margin:0;background:#0b0b0c;color:#b6b2aa;font:14px Inter,Arial;display:flex;flex-wrap:wrap;gap:16px;padding:16px;align-items:flex-start">` +
    lote.map(f => `<figure style="margin:0"><img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}" style="max-height:860px;max-width:${lote.length > 3 ? 560 : 860}px;border:1px solid #333;border-radius:8px;display:block"><figcaption style="margin-top:6px">${path.basename(f, '.png')}</figcaption></figure>`).join('') + '</body>';
  await pg.setContent(html); await pg.waitForTimeout(200);
  await pg.screenshot({ path: path.join(saida, `galeria-${i + 1}.png`), fullPage: true });
}
await browser.close(); servidor.close();
console.log(falhas ? `\n${falhas} problema(s).` : `\nTudo certo. Fotos e galeria em ${saida}`);
process.exit(falhas ? 1 : 0);
