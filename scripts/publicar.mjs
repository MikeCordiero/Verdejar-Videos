// Publica um vídeo como Reel na página do Facebook e no Instagram ligado a ela.
// Uso: node scripts/publicar.mjs <plano.json> <video.mp4>
// Precisa de FB_PAGE_ID e FB_PAGE_TOKEN (o token da PÁGINA, o mesmo do Rega-WEB).
// O vídeo sobe direto do runner para a Meta (upload "resumable"): não precisa de endereço público.
// SO_INSTAGRAM=1 publica só no Instagram (para um vídeo que já está no Facebook: repetir o
// job inteiro punha o Reel duas vezes na página). VIDEO_URL (opcional) é o endereço público do
// MP4 (a release no GitHub): se o envio direto ao Instagram falhar, a Meta vai buscá-lo lá.
import { readFileSync, statSync } from 'node:fs';

const [planoPath, videoPath] = process.argv.slice(2);
// Sem espaços nem mudanças de linha das pontas (é fácil colá-los no Secret sem se ver).
const FB_PAGE_ID = (process.env.FB_PAGE_ID || '').trim();
const FB_PAGE_TOKEN = (process.env.FB_PAGE_TOKEN || '').trim();
const SO_INSTAGRAM = process.env.SO_INSTAGRAM === '1' || process.env.SO_INSTAGRAM === 'true';
const VIDEO_URL = (process.env.VIDEO_URL || '').trim();
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
const legenda = `${plano.legenda.trim()}\n\nComment APP and I'll send you the link.\nThe full article is in our bio.\n\n${hashtags}`;

async function confirmarPagina() {
  const eu = await graph(`/me?fields=id,name&access_token=${encodeURIComponent(FB_PAGE_TOKEN)}`);
  if (eu.id !== FB_PAGE_ID) {
    // O nome e o id de quem é o token não são segredo (o id de uma página é público), e dizem o que corrigir.
    throw new Error(`O FB_PAGE_TOKEN é de «${eu.name}» (id ${eu.id}), e o FB_PAGE_ID tem ${FB_PAGE_ID.length} carateres e acaba em …${FB_PAGE_ID.slice(-4)}. ` +
      'Têm de ser a mesma página: o token sai de GET /me/accounts (o access_token da linha da página) e o FB_PAGE_ID é o id dessa linha. Não publico.');
  }
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

async function contentor(ig, extra) {
  const base = { media_type: 'REELS', caption: legenda, share_to_feed: 'true', ...extra };
  try { return await graph(`/${ig}/media`, { method: 'POST', body: form({ ...base, is_ai_generated: 'true' }) }); }
  catch (err) {
    // Versões da API que ainda não conhecem a etiqueta de IA: tenta-se sem ela, e diz-se.
    if (!/is_ai_generated/i.test(err.message)) throw err;
    console.log('Esta versão da API não aceita is_ai_generated; publico sem a etiqueta.');
    return graph(`/${ig}/media`, { method: 'POST', body: form(base) });
  }
}

async function esperarProcessamento(id) {
  for (let i = 0; i < 60; i++) { // até 10 minutos de processamento
    const s = await graph(`/${id}?fields=status_code,status&access_token=${encodeURIComponent(FB_PAGE_TOKEN)}`);
    if (s.status_code === 'FINISHED') return;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`O Instagram recusou o vídeo (${s.status_code}: ${s.status || ''}).`);
    await espera(10_000);
  }
  throw new Error('O Instagram não acabou de processar o vídeo em 10 minutos.');
}

// Um contentor por tentativa: um que falhou não se reaproveita.
async function tentarDireto(ig) {
  const cont = await contentor(ig, { upload_type: 'resumable' });
  await graph(cont.uri || `https://rupload.facebook.com/ig-api-upload/${V}/${cont.id}`, {
    method: 'POST', headers: { Authorization: `OAuth ${FB_PAGE_TOKEN}`, offset: '0', file_size: String(tamanho), 'Content-Type': 'application/octet-stream' }, body: video,
  });
  await esperarProcessamento(cont.id);
  return cont.id;
}

async function tentarPorEndereco(ig) {
  const cont = await contentor(ig, { video_url: VIDEO_URL });
  await esperarProcessamento(cont.id);
  return cont.id;
}

async function reelInstagram() {
  const pag = await graph(`/${FB_PAGE_ID}?fields=instagram_business_account&access_token=${encodeURIComponent(FB_PAGE_TOKEN)}`);
  const ig = pag.instagram_business_account?.id;
  if (!ig) { console.log('A página não tem Instagram profissional ligado: não publico no Instagram.'); return null; }
  // O envio direto às vezes falha do lado da Meta (ProcessingFailedError): tenta-se três vezes,
  // com um minuto entre cada, e depois pelo endereço público do vídeo, se houver.
  const tentativas = [() => tentarDireto(ig), () => tentarDireto(ig), () => tentarDireto(ig)];
  if (VIDEO_URL) tentativas.push(() => tentarPorEndereco(ig));
  let id = null, ultimo;
  for (const [n, tentar] of tentativas.entries()) {
    try { id = await tentar(); break; }
    catch (err) {
      ultimo = err;
      console.log(`Instagram, tentativa ${n + 1}/${tentativas.length} falhou: ${err.message}`);
      if (n < tentativas.length - 1) await espera(60_000);
    }
  }
  if (!id) throw ultimo;
  const pub = await graph(`/${ig}/media_publish`, { method: 'POST', body: form({ creation_id: id }) });
  console.log(`Instagram: reel publicado (${pub.id}).`);
  return pub.id;
}

await confirmarPagina();
console.log(`A publicar: ${plano.artigo.titulo}\n---\n${legenda}\n---`);
if (SO_INSTAGRAM) console.log('Só Instagram: o Facebook fica como está.');
else await reelFacebook();
try { await reelInstagram(); }
catch (err) { console.error(`${SO_INSTAGRAM ? 'O' : 'O Facebook publicou, mas o'} Instagram falhou: ${err.message}`); process.exit(1); }
