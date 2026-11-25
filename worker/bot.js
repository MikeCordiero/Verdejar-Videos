// Bot imediato do «Comment APP». A Meta avisa este endereço (webhook) no instante em que alguém
// comenta no Instagram da Verdejar; se o comentário disser APP, responde logo por mensagem privada
// (cartão com «Get the app» e «Follow us») e responde ao comentário em público.
// O fluxo «responder» (de 5 em 5 min) fica como rede de segurança, para algum aviso que falhe.
// Os textos são os mesmos de scripts/responder.mjs: muda-se um, muda-se o outro.
//
// Segredos (wrangler secret, postos pelo fluxo bot.yml): FB_PAGE_TOKEN, META_APP_SECRET,
// WEBHOOK_VERIFY_TOKEN.

const LIGACAO = 'https://apps.apple.com/app/verdejar/id6825218751';
const MENSAGEM = `Hi! 🌱 Here's the link: ${LIGACAO}\n\nThe app tells you when each of your plants needs water, based on where it lives.`;
const RESPOSTA = 'Sent! Check your messages 📩';
const CARTAO_TITULO = 'Your plant-care app 🌱';
const CARTAO_TEXTO = 'Free on the App Store. Follow us for a new plant tip every day!';
const CARTAO_IMAGEM = 'https://raw.githubusercontent.com/MikeCordiero/Verdejar-Videos/main/assets/cartao-mensagem.png';
const PALAVRA = /\bapp\b/i;

const enc = new TextEncoder();
async function assinaturaValida(corpo, cabecalho, segredo) {
  if (!cabecalho || !cabecalho.startsWith('sha256=')) return false;
  const chave = await crypto.subtle.importKey('raw', enc.encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', chave, enc.encode(corpo)));
  const esperado = [...mac].map((b) => b.toString(16).padStart(2, '0')).join('');
  const recebido = cabecalho.slice(7);
  if (recebido.length !== esperado.length) return false;
  let dif = 0;
  for (let i = 0; i < esperado.length; i++) dif |= esperado.charCodeAt(i) ^ recebido.charCodeAt(i);
  return dif === 0;
}

async function graph(env, caminho, corpo) {
  const url = `https://graph.facebook.com/${env.GRAPH_VERSION}${caminho}${caminho.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(env.FB_PAGE_TOKEN)}`;
  const r = await fetch(url, corpo ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) } : {});
  const c = await r.json().catch(() => ({}));
  if (!r.ok || c.error) throw new Error(`Meta ${r.status}: ${c.error?.message || 'sem detalhe'}`);
  return c;
}

let nomeConta = null;
async function responder(env, igId, comentarioId) {
  if (!nomeConta) nomeConta = (await graph(env, `/${igId}?fields=username`)).username;
  const perfil = `https://www.instagram.com/${nomeConta}/`;
  const cartao = { attachment: { type: 'template', payload: { template_type: 'generic', elements: [{
    title: CARTAO_TITULO, subtitle: CARTAO_TEXTO, image_url: CARTAO_IMAGEM, default_action: { type: 'web_url', url: LIGACAO },
    buttons: [{ type: 'web_url', url: LIGACAO, title: 'Get the app' }, { type: 'web_url', url: perfil, title: 'Follow us' }] }] } } };
  try { await graph(env, `/${igId}/messages`, { recipient: { comment_id: comentarioId }, message: cartao }); }
  catch (e) {
    console.log(`cartão recusado (${e.message}); mando em texto`);
    await graph(env, `/${igId}/messages`, { recipient: { comment_id: comentarioId }, message: { text: `${MENSAGEM}\n\n👉 Follow us: ${perfil}` } });
  }
  try { await graph(env, `/${comentarioId}/replies`, { message: RESPOSTA }); } catch (e) { console.log(`resposta pública falhou: ${e.message}`); }
  console.log(`respondido: ${comentarioId}`);
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname !== '/webhook') return new Response('Verdejar', { status: 200 });
    if (req.method === 'GET') {
      // A Meta confirma o endereço uma vez, ao configurar o webhook.
      const ok = url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === env.WEBHOOK_VERIFY_TOKEN;
      return ok ? new Response(url.searchParams.get('hub.challenge') || '', { status: 200 }) : new Response('não', { status: 403 });
    }
    if (req.method !== 'POST') return new Response('não', { status: 405 });
    const corpo = await req.text();
    if (!(await assinaturaValida(corpo, req.headers.get('x-hub-signature-256'), env.META_APP_SECRET))) return new Response('assinatura inválida', { status: 401 });
    let dados; try { dados = JSON.parse(corpo); } catch { return new Response('ok'); }
    if (dados.object === 'instagram') {
      for (const entrada of dados.entry || []) {
        for (const m of entrada.changes || []) {
          const v = m.value || {};
          if (m.field !== 'comments' || !v.id || !PALAVRA.test(v.text || '')) continue;
          if (v.from?.id === entrada.id) continue;                     // os nossos próprios comentários
          ctx.waitUntil(responder(env, entrada.id, v.id).catch((e) => console.log(`falhou ${v.id}: ${e.message}`)));
        }
      }
    }
    return new Response('ok', { status: 200 });                           // responde já; a Meta não espera
  },
};
