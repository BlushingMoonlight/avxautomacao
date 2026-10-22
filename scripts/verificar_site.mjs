// Conferência do site em todo pull request: <title>, links e imagens internos, nada de localhost, nenhum WhatsApp nem
// telefone, o padrão de marca (claims, valorização, aviso das marcas, paleta, escala tipográfica, Inter do próprio site),
// o Google Analytics só depois do aceite, o sitemap, o formulário no n8n e a demonstração do App AVX.
import fs from 'node:fs'; import path from 'node:path';
const N8N = 'https://rxsync-n8n-e38038-187-127-49-110.sslip.io';   // o mesmo do site da RXSync
const FORMULARIO = N8N + '/webhook/formulario-avx', ORIGEM = 'avx-site-2026';
let erros = 0, avisos = 0;
const erro = m => { erros++; console.log('::error::' + m); };
const aviso = m => { avisos++; console.log('::warning::' + m); };
const andar = (d, pular) => fs.readdirSync(d).flatMap(f => { const p = path.join(d, f); if (pular(f)) return []; return fs.statSync(p).isDirectory() ? andar(p, pular) : [p]; });
const todos = andar('.', f => f.startsWith('.') || f === 'node_modules' || f === 'scripts');
const htmls = todos.filter(f => f.endsWith('.html'));
// Texto que aparece na tela: sem <script>, <style>, comentários e marcação.
const visivel = s => s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ');
const MARCAS = /\b(Rolls-Royce|Patek Philippe|Tesla|Palantir|Anduril|SpaceX|Starlink)\b/g;
const AVISO_MARCAS = 'A AVX não possui vínculo, parceria ou endosso oficial dessas marcas.';
const FONTE_VALORIZACAO = 'Média apurada em imóveis automatizados pela AVX e decorados para venda no litoral de Santa Catarina';
// Faixa de integrações (decisão do Jean): marca citada como compatibilidade leva esta linha, não o aviso de inspiração.
const LINHA_COMPATIBILIDADE = 'As marcas citadas pertencem aos seus donos. Compatibilidade, sem vínculo oficial.';
// Paleta (15.4) + cores de categoria e de estado (funcionais); #000 e #FFF só para máscara e texto sobre o vermelho.
const CORES = new Set(['0B0B0C', '141416', '111113', 'F0EDE7', 'ECE8E1', 'B6B2AA', '8D8980', 'DA291C', 'C1241A', '76AFA5', 'C0A87A', '8FA987', '7FA6B8', '9A8FAE', 'B88A9E', '9FE0B4', 'F0A89F', '000', '000000', 'FFF', 'FFFFFF']);
// Escala fechada de letter-spacing (15.5)
const ESCALA = new Set(['-.025em', '.02em', '.1em', '.2em', '.26em']);
for (const f of htmls) {
  const s = fs.readFileSync(f, 'utf8'), texto = visivel(s);
  if (!/<title>[^<]+<\/title>/i.test(s)) erro(`${f}: página sem <title>`);
  for (const m of s.matchAll(/\b(?:href|src)\s*=\s*"([^"]+)"/gi)) {
    let u = m[1].trim();
    if (!u || /^(https?:|mailto:|tel:|#|javascript:|data:|\/\/|\{|\$)/i.test(u) || /['+]/.test(u) || u.includes('${')) continue;
    u = u.split('#')[0].split('?')[0]; if (!u) continue;
    let alvo = u.startsWith('/') ? path.join('.', u) : path.join(path.dirname(f), u);
    try { alvo = decodeURIComponent(alvo); } catch {}
    if (fs.existsSync(alvo) && fs.statSync(alvo).isDirectory()) alvo = path.join(alvo, 'index.html');
    if (!fs.existsSync(alvo) && !fs.existsSync(alvo + '.html')) erro(`${f}: link para "${m[1]}", que não existe no repositório`);
  }
  if (/https?:\/\/(localhost|127\.0\.0\.1)/i.test(s)) erro(`${f}: tem endereço de teste (localhost)`);
  for (const m of s.matchAll(/https?:\/\/[a-z0-9.-]*sslip\.io/gi)) if (m[0] !== N8N) erro(`${f}: aponta para outro n8n (${m[0]})`);
  // WhatsApp nunca no site (padrão de marca 15.3): nem link, nem a palavra, nem número de telefone na tela.
  // O exemplo do campo de telefone (0000-0000) não conta.
  const wa = s.match(/wa\.me|api\.whatsapp|whatsapp:\/\/|\btel:|whatsapp/i);
  if (wa) erro(`${f}: WhatsApp ou telefone não pode aparecer no site (achei "${wa[0]}"); o canal é o formulário`);
  for (const m of texto.matchAll(/(?:\+?55\s?)?\(?\b\d{2}\)?\s?9?\s?\d{4}[-\s.]\d{4}\b/g)) if (!/0000[-\s.]0000$/.test(m[0])) erro(`${f}: número de telefone na página (${m[0].trim()})`);
  // Valorização (15.2): só "valorização estimada de até 11,3%*", com a fonte na mesma página.
  for (const m of s.matchAll(/valoriza[çc][ãa]o.{0,40}/gi)) if (!/^valorização estimada de até 11,3%\*/i.test(m[0])) erro(`${f}: "valorização" fora da redação fechada ("valorização estimada de até 11,3%*"): ${m[0]}`);
  if (/valoriza[çc][ãa]o/i.test(s) && !s.includes(FONTE_VALORIZACAO)) erro(`${f}: cita a valorização sem a fonte do asterisco ("${FONTE_VALORIZACAO}")`);
  // Marcas de referência (15.2): como inspiração, com o aviso de não vínculo. A faixa de integrações (.marquee) cita
  // marcas como compatibilidade e leva a linha de compatibilidade logo abaixo (decisão do Jean).
  let semFaixa = s;
  if (s.includes(LINHA_COMPATIBILIDADE)) semFaixa = s.replace(/<div class="marquee">[\s\S]*?<\/div>/, ' ');
  else if (/<div class="marquee">/.test(s)) erro(`${f}: a faixa de integrações precisa da linha "${LINHA_COMPATIBILIDADE}"`);
  const marcas = [...new Set([...visivel(semFaixa).matchAll(MARCAS)].map(m => m[1]))];
  if (marcas.length && !texto.replace(/\s+/g, ' ').includes(AVISO_MARCAS)) erro(`${f}: cita ${marcas.join(', ')} sem o aviso "${AVISO_MARCAS}"`);
  // "Bespoke" com maiúscula (15.1)
  for (const m of texto.matchAll(/\bbespoke\b/g)) erro(`${f}: "bespoke" com minúscula; é "Bespoke"`);
  for (const m of s.matchAll(/(?:title|alt|content|aria-label)="[^"]*\bbespoke\b/g)) erro(`${f}: "bespoke" com minúscula num atributo`);
  // Tipografia (15.5): a Inter vem do próprio site (assets/fontes), nunca do Google Fonts
  if (/fonts\.(googleapis|gstatic)\.com/.test(s)) erro(`${f}: carrega a fonte do Google; use assets/fontes/fontes.css`);
  if (!/<link rel="stylesheet" href="assets\/fontes\/fontes\.css">/.test(s)) erro(`${f}: falta a fonte do próprio site (assets/fontes/fontes.css)`);
  // Paleta e escala tipográfica no CSS da página
  const css = [...s.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n') + [...s.matchAll(/style="([^"]*)"/g)].map(m => m[1]).join(';');
  for (const m of css.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) if (!CORES.has(m[1].toUpperCase())) erro(`${f}: cor fora da paleta (#${m[1]})`);
  for (const m of css.matchAll(/letter-spacing:\s*([^;}"]+)/g)) { const v = m[1].trim(); if (!ESCALA.has(v) && v !== 'inherit' && !/^var\(--ls-/.test(v)) erro(`${f}: letter-spacing fora da escala (${v}; só -.025em, .02em, .1em, .2em, .26em)`); }
  // Google Analytics em modo básico (decisão do Jean): nada carregado antes do aceite. O script do Google só entra pela
  // avxCarregarGA(), chamada no aceite.
  if (/<script[^>]*src="https:\/\/www\.googletagmanager\.com/.test(s)) erro(`${f}: o Google Analytics carrega antes do aceite (tire o <script src> do googletagmanager; use a avxCarregarGA)`);
  if (/googletagmanager/.test(s) && !/function avxCarregarGA\(\)/.test(s)) erro(`${f}: o Google Analytics precisa passar pela avxCarregarGA() (só depois do aceite)`);
  // Nenhum script de fora carregado de saída (ícones dentro da página; o jsPDF só no "Baixar PDF")
  for (const m of s.matchAll(/<script[^>]*\bsrc="(https?:[^"]+)"/g)) erro(`${f}: script de fora carregado de saída (${m[1]})`);
  // Fotos do banco de imagens com a legenda "Imagem ilustrativa"
  if (/images\.unsplash\.com/.test(s)) { const fotos = (s.match(/class="slide-bg/g) || []).length, legendas = (s.match(/>Imagem ilustrativa</g) || []).length; if (legendas < fotos) erro(`${f}: ${fotos} fotos do banco de imagens e só ${legendas} legendas "Imagem ilustrativa"`); }
  // Portfólio sem nome de construtora (decisão do Jean)
  if (/Construtora/.test(texto)) erro(`${f}: cita construtora (o portfólio não leva o nome das construtoras)`);
  // "Certificações" leva à lista, não a "#"
  if (/>Certificações</.test(s) && (/href="#">Certificações</.test(s) || !/id="certificacoes"/.test(s))) erro(`${f}: o link "Certificações" leva à lista (#certificacoes)`);
  // Certificações da AVX: só as que ela tem (decisão do Jean). LEED, PMI e LGPD ficam em "Normas e métodos que seguimos",
  // nunca como certificação. Certificação nova entra aqui antes de entrar na página.
  const CERTIFICACOES = ['ISO 9001', 'ISO 27001'];
  const grupo = s.match(/<h2[^>]*>Certificações<\/h2>\s*<ul[^>]*>([\s\S]*?)<\/ul>/);
  if (grupo) for (const m of grupo[1].matchAll(/<b>([^<]+)<\/b>/g)) if (!CERTIFICACOES.includes(m[1].trim())) erro(`${f}: "${m[1].trim()}" está em "Certificações", mas a AVX só tem ${CERTIFICACOES.join(' e ')}`);
  for (const m of texto.replace(/\s+/g, ' ').matchAll(/\b(LEED|PMI|LGPD)\b[^.]{0,40}certifica|certifica\w*[^.]{0,40}\b(LEED|PMI|LGPD)\b/gi)) erro(`${f}: ${m[1] || m[2]} aparece como certificação da AVX ("${m[0]}"); é norma ou método que seguimos`);
}
// Documentos legais: versão e data no topo; os links do rodapé e o "Saiba mais" dos cookies levam a eles.
// Ponto ainda em aberto (class="confirmar") só avisa: quem decide publicar é o Jean.
for (const doc of ['privacidade.html', 'termos.html']) {
  if (!fs.existsSync(doc)) { erro(`${doc}: não existe`); continue; }
  const s = fs.readFileSync(doc, 'utf8');
  if (!/Versão \d{4}-\d{2}-v\d+ · Vigente a partir de \d{1,2} de [a-zç]+ de \d{4}/.test(s)) erro(`${doc}: falta "Versão AAAA-MM-vN · Vigente a partir de D de mês de AAAA" no topo`);
  if (!/href="assets\/documento\.css"/.test(s)) erro(`${doc}: falta o estilo dos documentos (assets/documento.css)`);
  if (/googletagmanager/.test(s)) erro(`${doc}: o documento legal não carrega o Google Analytics`);
  const abertos = (s.match(/class="confirmar"/g) || []).length;
  if (abertos) aviso(`${doc}: ${abertos} ponto(s) "a confirmar" ainda em aberto (preencha antes do Merge)`);
}
for (const f of ['index.html', 'catalogo.html']) {
  if (!fs.existsSync(f)) continue;
  const s = fs.readFileSync(f, 'utf8');
  if (!/<a href="privacidade\.html">Privacidade<\/a>/.test(s)) erro(`${f}: o link "Privacidade" do rodapé leva a privacidade.html`);
  if (!/<a href="termos\.html">Termos de Uso<\/a>/.test(s)) erro(`${f}: o link "Termos de Uso" do rodapé leva a termos.html`);
  if (/id="cookie-banner"/.test(s) && !/<a href="privacidade\.html#cookies">Saiba mais<\/a>/.test(s)) erro(`${f}: o "Saiba mais" do aviso de cookies leva a privacidade.html#cookies`);
}
// Estilos próprios em assets/ (fora a fonte) seguem a paleta e a escala
for (const c of todos.filter(f => f.endsWith('.css') && !f.includes('fontes'))) {
  const css = fs.readFileSync(c, 'utf8');
  for (const m of css.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) if (!CORES.has(m[1].toUpperCase())) erro(`${c}: cor fora da paleta (#${m[1]})`);
  for (const m of css.matchAll(/letter-spacing:\s*([^;}"]+)/g)) { const v = m[1].trim(); if (!ESCALA.has(v) && v !== 'inherit') erro(`${c}: letter-spacing fora da escala (${v})`); }
}
// Fonte do próprio site: o arquivo e a licença
for (const a of ['assets/fontes/fontes.css', 'assets/fontes/inter-variavel.woff2', 'assets/fontes/OFL-inter.txt']) if (!fs.existsSync(a)) erro(`${a}: não existe`);
// Claims com redação fechada (15.2) no index.html: literais
{
  const ix = fs.existsSync('index.html') ? visivel(fs.readFileSync('index.html', 'utf8')).replace(/\s+/g, ' ') : '';
  for (const c of ['instalação sem obras, em média 7 dias úteis', '5 anos de garantia com check-ups anuais inclusos', '2.500+ dispositivos compatíveis', 'processamento 100% local — a casa funciona com ou sem internet'])
    if (!ix.includes(c)) erro(`index.html: falta o claim com a redação fechada "${c}"`);
  for (const velho of ['Cobertura total de hardware', '% privado', 'Servidor privado', 'sem quebrar paredes', 'Cor-assinatura']) if (ix.includes(velho)) erro(`index.html: ainda tem o texto antigo "${velho}"`);
}
// Sitemap: toda página pública (sem noindex) está nele, e todo endereço dele existe.
{
  const sm = fs.existsSync('sitemap.xml') ? fs.readFileSync('sitemap.xml', 'utf8') : '';
  if (!sm) erro('sitemap.xml: não existe');
  const locs = [...sm.matchAll(/<loc>https:\/\/avxautomacao\.com\.br\/([^<]*)<\/loc>/g)].map(m => m[1] || 'index.html');
  for (const l of locs) if (!fs.existsSync(l.endsWith('/') ? l + 'index.html' : l)) erro(`sitemap.xml: ${l} não existe no repositório`);
  for (const f of htmls) {
    if (/<meta name="robots" content="noindex/.test(fs.readFileSync(f, 'utf8'))) continue;
    const url = f.split(path.sep).join('/');
    if (!locs.includes(url) && !locs.includes(url.replace(/index\.html$/, ''))) erro(`${f}: página pública fora do sitemap.xml`);
  }
}
// Formulário de contato: vai ao n8n (workflow 41) com o cabeçalho do site; o serviço antigo não volta.
{
  const ix = fs.existsSync('index.html') ? fs.readFileSync('index.html', 'utf8') : '';
  if (!ix.includes(`id="contact-form"`) || !ix.includes(`action="${FORMULARIO}"`)) erro(`index.html: o formulário de contato precisa apontar para ${FORMULARIO}`);
  if (!ix.includes(`'x-avx-origem':'${ORIGEM}'`)) erro(`index.html: o envio do formulário precisa do cabeçalho x-avx-origem: ${ORIGEM}`);
  if (!/name="website"/.test(ix)) erro('index.html: falta o campo escondido "website" do formulário');
  const antigo = new RegExp('form' + 'spree', 'i');   // montado em pedaços para este arquivo não se acusar
  for (const f of andar('.', f => f === '.git' || f === 'node_modules')) {
    if (/\.(png|jpe?g|gif|webp|ico|pdf|woff2?)$/i.test(f)) continue;
    if (antigo.test(fs.readFileSync(f, 'utf8'))) erro(`${f}: cita o serviço de formulário antigo; o formulário vai ao n8n`);
  }
}
// Demonstração do App AVX (app.html): tudo simulado na página. Nenhum pedido a servidor, nada guardado no navegador,
// nenhum script de fora (os ícones do Lucide ficam dentro da página), sem Google Analytics, o selo sempre presente e
// nenhum assistente de voz, plataforma de automação ou serviço de música de terceiros.
{
  const arq = 'app.html';
  if (!fs.existsSync(arq)) erro(`${arq}: não existe`);
  else {
    const s = fs.readFileSync(arq, 'utf8');
    const PROIBIDOS = [[/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|\bimport\s*\(/, 'pedido a servidor'],
      [/localStorage|sessionStorage|indexedDB|document\.cookie|caches\./, 'algo guardado no navegador'],
      [/googletagmanager|gtag\(|google-analytics/i, 'Google Analytics'],
      [/<script[^>]*\bsrc=/i, 'script de fora (os ícones ficam dentro da página)'],
      [/html\.embed[^{]*\.selo[^{]*\{[^}]*display:\s*none/, 'o selo escondido no modo embed (ele fica visível dentro do index)'],
      [new RegExp(['Home ' + 'Assistant', 'Alexa', 'Siri', 'Google Home', 'HomeKit', 'Spotify', 'Deezer', 'YouTube', 'Apple Music', 'Amazon Music', 'Tidal'].join('|'), 'i'), 'nome de assistente, plataforma ou serviço de terceiros']];
    for (const [re, nome] of PROIBIDOS) { const m = s.match(re); if (m) erro(`${arq}: ${nome} não pode aparecer na demonstração (achei "${m[0]}")`); }
    // <link> que baixa algo (o canonical só aponta o endereço da própria página): nada vem de fora.
    for (const m of s.matchAll(/<link\b([^>]*)>/g)) {
      const href = (m[1].match(/href="([^"]+)"/) || [])[1] || '', rel = (m[1].match(/rel="([^"]+)"/) || [])[1] || '';
      if (/^https?:/.test(href) && rel !== 'canonical') erro(`${arq}: carrega coisa de fora (${href})`);
    }
    // O modelo AVX fica só na folha de detalhes, nunca no cartão
    const cartao = (s.match(/function cartao\(d\) \{([\s\S]*?)\n\}/) || [])[1] || '';
    if (!cartao) erro(`${arq}: não achei a função cartao()`); else if (/modelo/.test(cartao)) erro(`${arq}: o cartão mostra o modelo AVX; ele fica só na folha de detalhes`);
    if (!/class="tile-mais"/.test(s)) erro(`${arq}: falta o "⋯" dos cartões (os detalhes não podem depender de segurar o dedo)`);
    // O index.html mostra o app de verdade numa moldura, carregando só quando a seção aparece
    const ix = fs.existsSync('index.html') ? fs.readFileSync('index.html', 'utf8') : '';
    if (!/<iframe src="app\.html\?embed=1" loading="lazy"/.test(ix)) erro('index.html: a seção App AVX mostra o app num <iframe src="app.html?embed=1" loading="lazy">');
    if (!s.includes('Demonstração · casa simulada')) erro(`${arq}: falta o selo "Demonstração · casa simulada"`);
    if (!/aria-live="polite"/.test(s)) erro(`${arq}: o resumo das cenas é anunciado com aria-live="polite"`);
  }
}
if (avisos) console.log(`⚠️ ${avisos} aviso(s) (não bloqueiam).`);
console.log(erros ? `${erros} problema(s).` : `Tudo certo (${htmls.length} páginas).`);
process.exit(erros ? 1 : 0);
