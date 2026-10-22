// Conferência do site em todo pull request: <title>, links e imagens internos, nada de localhost, nenhum WhatsApp nem
// telefone, o padrão de marca (valorização, aviso das marcas de referência, Inter), o sitemap e o formulário no n8n.
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
  // Marcas de referência (15.2): com o aviso de não vínculo. Starlink sozinha, como integração compatível, só avisa
  // até o PR de marca decidir (tirar da lista ou pôr o aviso).
  const marcas = [...new Set([...texto.matchAll(MARCAS)].map(m => m[1]))];
  if (marcas.length && !texto.replace(/\s+/g, ' ').includes(AVISO_MARCAS)) {
    const msg = `${f}: cita ${marcas.join(', ')} sem o aviso "${AVISO_MARCAS}"`;
    if (marcas.every(m => m === 'Starlink')) aviso(msg + ' (Starlink como integração: só aviso até o PR de marca)'); else erro(msg);
  }
  // Tipografia (15.5): Google Fonts só com a Inter, pesos 300 a 700.
  for (const m of s.matchAll(/fonts\.googleapis\.com\/css2?\?([^"'\s>]*)/g)) if (m[1].replace(/&(amp;)?display=swap/, '') !== 'family=Inter:wght@300;400;500;600;700') erro(`${f}: Google Fonts fora do padrão (${m[1]}); só family=Inter:wght@300;400;500;600;700`);
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
if (avisos) console.log(`⚠️ ${avisos} aviso(s) (não bloqueiam).`);
console.log(erros ? `${erros} problema(s).` : `Tudo certo (${htmls.length} páginas).`);
process.exit(erros ? 1 : 0);
