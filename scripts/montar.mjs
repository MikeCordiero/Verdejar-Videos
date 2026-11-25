// Monta e renderiza um vídeo a partir dos tempos da voz.
// Uso: node scripts/montar.mjs <pasta> [--so-html] [--fotogramas t1,t2,…]
// Lê <pasta>/tempos.json e <pasta>/voz.wav; escreve <pasta>/video.html e <pasta>/video.mp4.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
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

execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(pasta, 'voz.wav'), '-c:a', 'aac', '-b:a', '128k', join(pasta, 'voz.m4a')]);
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
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', join(pasta, 'video.mp4')]);
rmSync(dir, { recursive: true, force: true });
console.log(`vídeo: ${join(pasta, 'video.mp4')} (${plano.duracao} s)`);
