// Monta e renderiza um vídeo a partir dos tempos da voz.
// Uso: node scripts/montar.mjs <pasta> [--so-html] [--fotogramas t1,t2,…]
// Lê <pasta>/tempos.json e <pasta>/voz.wav; escreve <pasta>/video.html e <pasta>/video.mp4.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const pasta = resolve(process.argv[2]);
const soHtml = process.argv.includes('--so-html');
const iFot = process.argv.indexOf('--fotogramas');
const FPS = 30;
const raiz = resolve(new URL('..', import.meta.url).pathname);
const nm = join(raiz, 'node_modules');
const b64 = (p) => readFileSync(p).toString('base64');

const plano = JSON.parse(readFileSync(join(pasta, 'tempos.json'), 'utf8'));
// Legendas sem ponto final (regra do Miguel); ? e ! ficam. Cada legenda sai antes da seguinte.
plano.beats.forEach((b, i) => {
  // "?!" e "!?" no guião dão a entoação de pergunta à voz; na legenda fica só "?".
  b.palavras = b.palavras.map(([w, t]) => [w.replace(/[?!]*\?[?!]*$/, '?').replace(/\.+$/, '').replace(/^\.+/, ''), t]).filter(([w]) => w);
  const prox = plano.beats[i + 1];
  b.fimLegenda = prox ? Math.max(b.t1 + 0.1, prox.t0 - 0.12) : null;
  if (prox?.cena === 'link') b.fimLegenda = prox.t0 - 0.1;
});

// Música de fundo (faixas da Meta Sound Collection em assets/musica/). Escolhe uma pelo endereço
// do artigo (o mesmo artigo dá sempre a mesma faixa; artigos diferentes vão rodando entre elas).
// A música é igualada em volume (loudnorm), fica bem por baixo da voz e baixa ainda mais
// sempre que a voz fala (sidechaincompress); entra e sai em fade. Sem faixas: só a voz.
// MUSICA=<ficheiro> escolhe uma à mão; MUSICA=nenhuma tira-a.
const dirMusica = join(raiz, 'assets/musica');
const faixas = existsSync(dirMusica) ? readdirSync(dirMusica).filter((f) => /\.(mp3|m4a|aac|wav|ogg|flac)$/i.test(f)).sort() : [];
const chave = plano.artigo?.endereco || basename(pasta);
let faixa = null;
if (process.env.MUSICA === 'nenhuma') faixa = null;
else if (process.env.MUSICA) faixa = faixas.find((f) => f === basename(process.env.MUSICA)) ?? (() => { throw new Error(`MUSICA: não há ${process.env.MUSICA} em assets/musica/`); })();
else if (faixas.length) faixa = faixas[createHash('sha256').update(chave).digest().readUInt32BE(0) % faixas.length];
if (faixa) {
  const d = plano.duracao, fim = Math.max(0, d - 2.5).toFixed(2);
  const filtro =
    `[1:a]aformat=sample_rates=48000:channel_layouts=stereo,loudnorm=I=-30:TP=-6:LRA=11,atrim=0:${d},asetpts=N/SR/TB,` +
    `afade=t=in:d=0.8,afade=t=out:st=${fim}:d=2.5[m];` +
    `[0:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[v][sc];` +
    `[m][sc]sidechaincompress=threshold=0.015:ratio=8:attack=30:release=600[md];` +
    `[v][md]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[out]`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(pasta, 'voz.wav'), '-stream_loop', '-1', '-i', join(dirMusica, faixa),
    '-filter_complex', filtro, '-map', '[out]', '-ar', '48000', '-ac', '2', '-c:a', 'aac', '-b:a', '160k', join(pasta, 'voz.m4a')]);
  console.log(`música: ${faixa}`);
} else {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(pasta, 'voz.wav'), '-ar', '48000', '-ac', '2', '-c:a', 'aac', '-b:a', '128k', join(pasta, 'voz.m4a')]);
  console.log('música: nenhuma (sem faixas em assets/musica/)');
}
const fontes =
  ['700', '800'].map((w) => `@font-face{font-family:'Manrope';font-weight:${w};src:url(data:font/woff2;base64,${b64(join(nm, `@fontsource/manrope/files/manrope-latin-${w}-normal.woff2`))}) format('woff2')}`).join('') +
  `@font-face{font-family:'Caveat Brush';font-weight:400;src:url(data:font/woff2;base64,${b64(join(nm, '@fontsource/caveat-brush/files/caveat-brush-latin-400-normal.woff2'))}) format('woff2')}`;
// O plano vai como JSON dentro de um <script>: escapar "<" impede que um texto feche a tag.
const planoJs = JSON.stringify(plano).replace(/</g, '\\u003c');
let html = readFileSync(join(raiz, 'motor/modelo.html'), 'utf8');
html = html.replace('%%FONTES%%', () => fontes).replace('%%GSAP%%', () => readFileSync(join(nm, 'gsap/dist/gsap.min.js'), 'utf8'))
  .replace('%%AUDIO%%', () => 'data:audio/mp4;base64,' + b64(join(pasta, 'voz.m4a'))).replace('%%PLANO%%', () => planoJs);
writeFileSync(join(pasta, 'video.html'), html);
if (soHtml) process.exit(0);

const { default: puppeteer } = await import('puppeteer-core');
const chrome = process.env.CHROME || ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
page.on('pageerror', (e) => { console.error('ERRO NA PÁGINA:', e.message); process.exitCode = 1; });
await page.setViewport({ width: 1080, height: 1920 });
await page.goto(pathToFileURL(join(pasta, 'video.html')).href + '?clean=1', { waitUntil: 'load' });
await page.waitForFunction('window.OPENER && window.OPENER.ready', { timeout: 60000 });
const seek = (t) => page.evaluate(async (t) => { OPENER.seek(t); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); OPENER.seek(t); }, t);

if (iFot > 0) {
  // Fotogramas soltos para verificar (lembrete: ver, não renderizar tudo).
  const dir = join(pasta, 'fotogramas'); mkdirSync(dir, { recursive: true });
  for (const t of process.argv[iFot + 1].split(',').map(Number)) { await seek(t); await page.screenshot({ path: join(dir, `t${t.toFixed(2)}.png`) }); }
  await browser.close(); process.exit(process.exitCode || 0);
}

const dir = join(pasta, 'frames'); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir);
const total = Math.ceil(plano.duracao * FPS);
for (let i = 0; i < total; i++) {
  await seek(i / FPS);
  await page.screenshot({ path: join(dir, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92, optimizeForSpeed: true });
  if (i % 150 === 0) console.log(`  fotograma ${i}/${total}`);
}
await browser.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(dir, 'f%05d.jpg'), '-i', join(pasta, 'voz.m4a'),
  // No formato que a Meta pede para os Reels: H.264 High 4.1, yuv420p em gama de vídeo (os JPEG
  // davam yuvj420p, gama total), BT.709, um fotograma-chave a cada 2 s, até 10 Mb/s, e o som AAC
  // a 48 kHz em estéreo (a voz sai a 24 kHz mono).
  '-vf', 'scale=out_range=tv:out_color_matrix=bt709,format=yuv420p',
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-maxrate', '10M', '-bufsize', '20M', '-profile:v', 'high', '-level', '4.1',
  '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-g', String(FPS * 2),
  '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', '-shortest', '-movflags', '+faststart', join(pasta, 'video.mp4')]);
rmSync(dir, { recursive: true, force: true });
console.log(`vídeo: ${join(pasta, 'video.mp4')} (${plano.duracao} s)`);
