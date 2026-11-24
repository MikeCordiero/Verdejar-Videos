// Publica um vídeo como Reel na página do Facebook e no Instagram ligado a ela.
// Uso: node scripts/publicar.mjs <plano.json> <video.mp4>
// Precisa de FB_PAGE_ID e FB_PAGE_TOKEN (o token da PÁGINA, o mesmo do Rega-WEB).
// O vídeo sobe direto do runner para a Meta (upload "resumable"): não precisa de endereço público.
import { readFileSync, statSync } from 'node:fs';

const [planoPath, videoPath] = process.argv.slice(2);
const { FB_PAGE_ID, FB_PAGE_TOKEN } = process.env;
const V = process.env.GRAPH_VERSION || 'v21.0';
const GRAPH = `https://graph.facebook.com/${V}`;
if (!FB_PAGE_ID || !FB_PAGE_TOKEN) throw new Error('Faltam os Secrets FB_PAGE_ID e FB_PAGE_TOKEN (Settings → Secrets and variables → Actions).');

const plano = JSON.parse(readFileSync(planoPath, 'utf8'));
const video = readFileSync(videoPath);
const tamanho = statSync(videoPath).size;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function graph(caminho, opcoes = {}) {
  const r = await fetch(caminho.startsWith('http') ? caminho : GRAPH + caminho, opcoes);
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok || corpo.error) {
    // Nunca se imprime o token: só a mensagem da Meta.
    throw new Error(`Meta respondeu ${r.status}: ${corpo.error?.message || JSON.stringify(corpo).slice(0, 300)}`);
  }
  return corpo;
}
const form = (o) => new URLSearchParams({ ...o, access_token: FB_PAGE_TOKEN });

// Hashtags no padrão dos posts dos artigos: a planta, três gerais e #Verdejar.
const tag = (s) => '#' + s.replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join('');
const hashtags = [tag(plano.artigo.planta), '#PlantCare', '#PlantTips', plano.natal ? '#ChristmasPlants' : '#PlantLovers', '#Verdejar'].join(' ');
const legenda = `${plano.legenda.trim()}\n\nRead the full article — link in bio\n\n${hashtags}`;

async function confirmarPagina() {
  const eu = await graph(`/me?fields=id,name&access_token=${encodeURIComponent(FB_PAGE_TOKEN)}`);
  if (eu.id !== FB_PAGE_ID) throw new Error('O FB_PAGE_TOKEN não é o token da página FB_PAGE_ID. Não publico.');
  console.log(`Página confirmada: ${eu.name}`);
}

async function reelFacebook() {
  const ini = await graph(`/${FB_PAGE_ID}/video_reels`, { method: 'POST', body: form({ upload_phase: 'start' }) });
  await graph(ini.upload_url || `https://rupload.facebook.com/video-upload/${V}/${ini.video_id}`, {
    method: 'POST', headers: { Authorization: `OAuth ${FB_PAGE_TOKEN}`, offset: '0', file_size: String(tamanho) }, body: video,
  });
  await graph(`/${FB_PAGE_ID}/video_reels`, { method: 'POST', body: form({ upload_phase: 'finish', video_id: ini.video_id, video_state: 'PUBLISHED', description: legenda }) });
  console.log(`Facebook: reel enviado (vídeo ${ini.video_id}); a Meta acaba de o processar e publica.`);
  return ini.video_id;
}

async function reelInstagram() {
  const pag = await graph(`/${FB_PAGE_ID}?fields=instagram_business_account&access_token=${encodeURIComponent(FB_PAGE_TOKEN)}`);
  const ig = pag.instagram_business_account?.id;
  if (!ig) { console.log('A página não tem Instagram profissional ligado: não publico no Instagram.'); return null; }
  const base = { media_type: 'REELS', upload_type: 'resumable', caption: legenda, share_to_feed: 'true' };
  let cont;
  try { cont = await graph(`/${ig}/media`, { method: 'POST', body: form({ ...base, is_ai_generated: 'true' }) }); }
  catch (err) {
    // Versões da API que ainda não conhecem a etiqueta de IA: tenta-se sem ela, e diz-se.
    if (!/is_ai_generated/i.test(err.message)) throw err;
    console.log('Esta versão da API não aceita is_ai_generated; publico sem a etiqueta.');
    cont = await graph(`/${ig}/media`, { method: 'POST', body: form(base) });
  }
  await graph(cont.uri || `https://rupload.facebook.com/ig-api-upload/${V}/${cont.id}`, {
    method: 'POST', headers: { Authorization: `OAuth ${FB_PAGE_TOKEN}`, offset: '0', file_size: String(tamanho) }, body: video,
  });
  for (let i = 0; i < 60; i++) { // até 10 minutos de processamento
    const s = await graph(`/${cont.id}?fields=status_code,status&access_token=${encodeURIComponent(FB_PAGE_TOKEN)}`);
    if (s.status_code === 'FINISHED') break;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`O Instagram recusou o vídeo (${s.status_code}: ${s.status || ''}).`);
    if (i === 59) throw new Error('O Instagram não acabou de processar o vídeo em 10 minutos.');
    await espera(10_000);
  }
  const pub = await graph(`/${ig}/media_publish`, { method: 'POST', body: form({ creation_id: cont.id }) });
  console.log(`Instagram: reel publicado (${pub.id}).`);
  return pub.id;
}

await confirmarPagina();
console.log(`A publicar: ${plano.artigo.titulo}\n---\n${legenda}\n---`);
await reelFacebook();
try { await reelInstagram(); }
catch (err) { console.error(`O Facebook publicou, mas o Instagram falhou: ${err.message}`); process.exit(1); }
