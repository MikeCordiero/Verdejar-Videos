// Confirma que um plano de vídeo cumpre as regras antes de se gastar tempo a renderizá-lo.
// Uso: node scripts/validar-plano.mjs planos/<endereco>.json [mais…]
// Sai com 1 e diz porquê, se alguma regra falhar. Usado pelo agente (antes do commit) e pelo GitHub.
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

export const CENAS = ['triste', 'calma', 'copo', 'afogar', 'secura', 'calendario', 'dedo', 'regar', 'pouca-luz', 'sol-forte', 'frio', 'ar-seco', 'feliz', 'item', 'app', 'link'];
export const FORMAS = ['folhagem', 'flor', 'cato', 'espada', 'palmeira', 'arvore'];
export const VASOS = ['azul', 'rosa', 'lilas', 'terracota', 'creme', 'verde'];
export const CORES = ['vermelho', 'rosa', 'branco', 'roxo', 'amarelo', 'laranja'];

export function validar(p, ficheiro = '') {
  const e = [];
  const ok = (c, msg) => { if (!c) e.push(msg); };
  ok(p && typeof p === 'object', 'o plano não é um objeto JSON');
  if (e.length) return e;
  ok(['erros', 'lista', 'sintoma'].includes(p.modelo), 'modelo tem de ser "erros", "lista" ou "sintoma"');
  ok(typeof p.natal === 'boolean', 'natal tem de ser true ou false');
  const a = p.artigo || {};
  ok(/^[a-z0-9-]+$/.test(a.endereco || ''), 'artigo.endereco em falta ou inválido (só a-z, 0-9 e hífen)');
  if (ficheiro) ok(basename(ficheiro, '.json') === a.endereco, `o ficheiro tem de se chamar ${a.endereco}.json`);
  ok(typeof a.titulo === 'string' && a.titulo.length > 3, 'artigo.titulo em falta');
  ok(typeof a.planta === 'string' && a.planta.length > 1, 'artigo.planta (nome inglês da planta principal, para a hashtag) em falta');
  const planta = p.planta || {};
  const cfg = (c, onde) => {
    ok(FORMAS.includes(c.forma), `${onde}.forma tem de ser uma de: ${FORMAS.join(', ')}`);
    if (c.vaso !== undefined) ok(VASOS.includes(c.vaso), `${onde}.vaso tem de ser um de: ${VASOS.join(', ')}`);
    if (c.corFlor !== undefined) ok(CORES.includes(c.corFlor), `${onde}.corFlor tem de ser uma de: ${CORES.join(', ')}`);
    if (c.bracteas) ok(c.forma === 'flor' && c.corFlor, `${onde}.bracteas só com forma "flor" e uma corFlor`);
  };
  cfg(planta, 'planta');
  ok(typeof p.legenda === 'string' && p.legenda.length >= 20 && p.legenda.length <= 300, 'legenda (o texto do post, 20 a 300 caracteres) em falta');
  ok(!/https?:|www\./i.test(p.legenda || ''), 'a legenda não leva ligações (o Instagram não as abre; a ligação está na bio)');
  const beats = Array.isArray(p.beats) ? p.beats : [];
  ok(beats.length >= 5 && beats.length <= 9, 'entre 5 e 9 falas (beats)');
  let palavras = 0;
  beats.forEach((b, i) => {
    const onde = `fala ${i + 1}`;
    ok(typeof b.texto === 'string' && b.texto.trim().length > 0 && b.texto.length <= 95, `${onde}: texto vazio ou com mais de 95 caracteres`);
    ok(CENAS.includes(b.cena), `${onde}: cena "${b.cena}" não existe (cenas: ${CENAS.join(', ')})`);
    ok(!/verdejar/i.test(b.texto || ''), `${onde}: o vídeo não diz "Verdejar" (regra do Miguel)`);
    ok(!/https?:|www\.|\.com\b/i.test(b.texto || ''), `${onde}: sem endereços na fala`);
    ok(!/\b\d+\s*(days?|weeks?|times a)\b/i.test(b.texto || ''), `${onde}: sem números de rega ("every 7 days"): cada casa é diferente, e os números são da app`);
    (b.enfase || []).forEach((w) => ok((b.texto || '').toLowerCase().includes(String(w).toLowerCase()), `${onde}: a ênfase "${w}" não está no texto`));
    ok((b.enfase || []).length <= 2, `${onde}: no máximo 2 palavras em ênfase`);
    if (b.cena === 'item') { ok(b.item && typeof b.item === 'object', `${onde}: a cena "item" precisa de "item"`); if (b.item) { cfg(b.item, `${onde}.item`); ok(typeof b.item.nome === 'string' && b.item.nome.length > 1 && b.item.nome.length <= 22, `${onde}.item.nome (até 22 caracteres) em falta`); } }
    if (b.cena !== 'link') palavras += (b.texto || '').split(/\s+/).filter(Boolean).length;
  });
  const ult = beats.at(-1), pen = beats.at(-2);
  ok(ult && ult.cena === 'link' && /^link in bio!?$/i.test((ult.texto || '').trim()), 'a última fala é exatamente "Link in bio!" com a cena "link"');
  ok(pen && pen.cena === 'app' && /\bapp\b/i.test(pen.texto || ''), 'a penúltima fala tem a cena "app" e fala de uma app');
  ok(beats[0] && beats[0].cena !== 'app' && beats[0].cena !== 'link', 'a primeira fala é o hook (não pode ser "app" nem "link")');
  ok(beats[0] && (beats[0].texto || '').split(/\s+/).length <= 9, 'o hook tem no máximo 9 palavras (2 segundos)');
  if (p.modelo === 'lista') {
    const nomes = new Set(beats.filter((b) => b.cena === 'item').map((b) => (b.item?.nome || '').toLowerCase()));
    ok(nomes.size >= 2 && nomes.size <= 4, 'uma lista mostra entre 2 e 4 plantas diferentes (cenas "item")');
  }
  ok(palavras >= 28 && palavras <= 52, `entre 28 e 52 palavras faladas para caber em 15–20 s (tem ${palavras})`);
  if (p.pronuncia !== undefined) ok(typeof p.pronuncia === 'object', 'pronuncia é um objeto {"palavra": "como se diz"}');
  return e;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let falhou = false;
  for (const f of process.argv.slice(2)) {
    let p;
    try { p = JSON.parse(readFileSync(f, 'utf8')); } catch (err) { console.error(`${f}: JSON inválido (${err.message})`); falhou = true; continue; }
    const erros = validar(p, f);
    if (erros.length) { falhou = true; console.error(`${f}:\n  - ${erros.join('\n  - ')}`); } else console.log(`${f}: OK`);
  }
  process.exit(falhou ? 1 : 0);
}
