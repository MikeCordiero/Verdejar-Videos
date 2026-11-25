// Bot do «Comment APP»: a quem comenta APP num Reel (Instagram ou Facebook), manda por
// mensagem privada a ligação da app, e responde ao comentário para se ver que foi tratado.
// Uso: node scripts/responder.mjs        (REAL=1 para enviar; sem isso só mostra o que faria)
// Precisa de FB_PAGE_ID e FB_PAGE_TOKEN, com as permissões de mensagens e comentários (README).
// Lembra-se de quem já recebeu em estado/respondidos.json (o fluxo faz commit desse ficheiro).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const { FB_PAGE_ID, FB_PAGE_TOKEN } = process.env;
const REAL = process.env.REAL === '1';
const V = process.env.GRAPH_VERSION || 'v21.0';
const GRAPH = `https://graph.facebook.com/${V}`;
const LIGACAO = 'https://apps.apple.com/app/verdejar/id6825218751'; // a mesma de LOJAS.appStore.en no Rega-WEB
const MENSAGEM = `Hi! 🌱 Here's the link: ${LIGACAO}\n\nThe app tells you when each of your plants needs water, based on where it lives.`;
const RESPOSTA = 'Sent! Check your messages 📩';
const CARTAO_TITULO = 'Your plant-care app 🌱';
const CARTAO_TEXTO = 'Free on the App Store. Follow us for a new plant tip every day!';
// A imagem do cartão (1200×628, a proporção que o Instagram mostra) vive neste repositório público.
const CARTAO_IMAGEM = 'https://raw.githubusercontent.com/MikeCordiero/Verdejar-Videos/main/assets/cartao-mensagem.png';
const PALAVRA = /\bapp\b/i;          // «APP», «app», «App please»…
const DIAS_MEDIA = 30;                // Reels publicados há menos de 30 dias
const JANELA_H = 7 * 24 - 2;          // a Meta só deixa a resposta privada até 7 dias depois do comentário
const ESTADO = 'estado/respondidos.json';

if (!FB_PAGE_ID || !FB_PAGE_TOKEN) throw new Error('Faltam os Secrets FB_PAGE_ID e FB_PAGE_TOKEN.');
const feitos = new Set(existsSync(ESTADO) ? JSON.parse(readFileSync(ESTADO, 'utf8')) : []);
const tok = encodeURIComponent(FB_PAGE_TOKEN);

async function graph(caminho, opcoes) {
  const r = await fetch(GRAPH + caminho, opcoes);
  const c = await r.json().catch(() => ({}));
  if (!r.ok || c.error) throw new Error(`Meta ${r.status}: ${c.error?.message || JSON.stringify(c).slice(0, 200)}`);
  return c;
}
const get = (c) => graph(`${c}${c.includes('?') ? '&' : '?'}access_token=${tok}`);
const post = (c, corpo) => graph(`${c}?access_token=${tok}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
const recente = (iso, horas) => Date.now() - new Date(iso).getTime() < horas * 3600e3;

let enviados = 0, erros = 0;
let ig = null;
async function tratar(rede, c, eu) {
  if (feitos.has(c.id) || !PALAVRA.test(c.text || c.message || '')) return;
  if (eu && (c.username === eu || c.from?.id === FB_PAGE_ID)) return;           // os nossos próprios comentários
  if (!recente(c.timestamp || c.created_time, JANELA_H)) { feitos.add(c.id); return; }  // fora da janela da Meta
  console.log(`${rede}: comentário ${c.id} («${(c.text || c.message || '').slice(0, 40)}»)`);
  if (!REAL) return;
  try {
    // Resposta privada a um comentário. No Instagram (Facebook Login) a chamada é no ID da conta
    // de Instagram e só pede instagram_manage_messages; a da página pedia pages_messaging, que o
    // token não tem (a Meta respondia «500: An unknown error»). Se falhar, tenta-se a da página.
    // A mensagem vai como cartão com dois botões (a app e seguir a página). A Meta só deixa UMA
    // resposta privada por comentário: se o cartão for recusado, manda-se o texto com as duas ligações.
    const perfil = rede === 'instagram' && ig?.username ? `https://www.instagram.com/${ig.username}/` : `https://www.facebook.com/${FB_PAGE_ID}`;
    const cartao = { attachment: { type: 'template', payload: { template_type: 'generic', elements: [{
      title: CARTAO_TITULO, subtitle: CARTAO_TEXTO, image_url: CARTAO_IMAGEM,
      default_action: { type: 'web_url', url: LIGACAO },
      buttons: [{ type: 'web_url', url: LIGACAO, title: 'Get the app' }, { type: 'web_url', url: perfil, title: 'Follow us' }] }] } } };
    const texto = { text: `${MENSAGEM}\n\n👉 Follow us: ${perfil}` };
    const destino = rede === 'instagram' ? `/${ig.id}/messages` : `/${FB_PAGE_ID}/messages`;
    try { await post(destino, { recipient: { comment_id: c.id }, message: cartao }); }
    catch (e1) {
      console.log(`  (o cartão com botões foi recusado: ${e1.message}; mando em texto)`);
      try { await post(destino, { recipient: { comment_id: c.id }, message: texto }); }
      catch (e2) { if (rede !== 'instagram') throw e2; console.log(`  (pela conta de Instagram falhou: ${e2.message}; tento pela página)`); await post(`/${FB_PAGE_ID}/messages`, { recipient: { comment_id: c.id }, message: texto }); }
    }
    try { await post(`/${c.id}/${rede === 'instagram' ? 'replies' : 'comments'}`, { message: RESPOSTA }); } catch (e) { console.log(`  (não consegui responder em público: ${e.message})`); }
    feitos.add(c.id); enviados++;
  } catch (e) { erros++; console.error(`  falhou: ${e.message}`); }
}

// Instagram
const pag = await get(`/${FB_PAGE_ID}?fields=instagram_business_account{id,username}`);
ig = pag.instagram_business_account;
if (ig) {
  const media = await get(`/${ig.id}/media?fields=id,media_product_type,timestamp&limit=30`);
  for (const m of media.data || []) {
    if (!recente(m.timestamp, DIAS_MEDIA * 24)) continue;
    const cs = await get(`/${m.id}/comments?fields=id,text,username,timestamp&limit=100`);
    for (const c of cs.data || []) await tratar('instagram', c, ig.username);
  }
} else console.log('A página não tem Instagram profissional ligado.');

// Facebook (os Reels da página): só com BOT_FACEBOOK=1, porque precisa de pages_messaging
// (caso de utilização do Messenger na app da Meta). O Instagram chega para começar.
if (process.env.BOT_FACEBOOK === '1') try {
  const reels = await get(`/${FB_PAGE_ID}/video_reels?fields=id,created_time&limit=30`);
  for (const r of reels.data || []) {
    if (!recente(r.created_time, DIAS_MEDIA * 24)) continue;
    const cs = await get(`/${r.id}/comments?fields=id,message,from,created_time&limit=100`);
    for (const c of cs.data || []) await tratar('facebook', c, true);
  }
} catch (e) { console.log(`Facebook: ${e.message}`); }

mkdirSync('estado', { recursive: true });
writeFileSync(ESTADO, JSON.stringify([...feitos].slice(-3000), null, 0) + '\n');
console.log(REAL ? `Enviadas ${enviados} mensagens (${erros} erros).` : 'Modo de ensaio: nada foi enviado (REAL=1 para enviar).');
if (erros) process.exit(1);
