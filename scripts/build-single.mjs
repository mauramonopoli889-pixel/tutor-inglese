// Packs the web export (dist/) into one self-contained HTML page, so the app can be
// opened from a single link with no server: JS inlined, fonts and images as data: URIs.
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const out = process.argv[2] ?? 'dist-single/tutor.html';
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const src = html.match(/<script src="([^"]+)"/)[1];
let js = fs.readFileSync(path.join(dist, src), 'utf8');

const USED_FONTS = /(BricolageGrotesque_(600SemiBold|800ExtraBold)|DMSans_(400Regular|500Medium|700Bold))\./;
const MIME = { '.ttf': 'font/ttf', '.png': 'image/png' };
js = js.replace(/"(\/assets\/[^"]+)"/g, (all, p) => {
  const ext = path.extname(p);
  if (ext === '.ttf' && !USED_FONTS.test(p)) return all;
  const file = path.join(dist, p);
  if (!fs.existsSync(file) || !MIME[ext]) return all;
  return `"data:${MIME[ext]};base64,${fs.readFileSync(file).toString('base64')}"`;
});

const style = html.match(/<style id="expo-reset">[\s\S]*?<\/style>/)[0];
const page = `<title>Tutor</title>
<meta name="description" content="Tutor di inglese A0-A1">
${style}
<style>html,body{margin:0;background:#FFF8F0}@media (prefers-color-scheme: dark){html,body{background:#121120}}</style>
<div id="root"></div>
<script>
// The router reads the URL path: start the app at its home screen whatever path the page is served from.
try { history.replaceState(null, '', '/'); } catch (e) {}
</script>
<script>${js.replace(/<\/script/gi, '<\\/script')}</script>
`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, page);
console.log(out, (page.length / 1024 / 1024).toFixed(2) + ' MB');
