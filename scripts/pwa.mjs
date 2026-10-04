// After `expo export --platform web`: makes dist/ installable on a phone's home screen
// (manifest, icons, full-screen on iOS) and adds 404.html so static hosts serve app routes.
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const app = JSON.parse(fs.readFileSync('app.json', 'utf8')).expo;
const base = (app.experiments?.baseUrl ?? '').replace(/\/$/, '');
const file = path.join(dist, 'index.html');
let html = fs.readFileSync(file, 'utf8');

const head = `
    <link rel="manifest" href="${base}/manifest.webmanifest" />
    <meta name="theme-color" content="#FF5A3C" />
    <link rel="apple-touch-icon" href="${base}/apple-touch-icon.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Tutor" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="description" content="Il tuo insegnante di inglese personale, dall'A0 al B2." />
  </head>`;
if (!html.includes('rel="manifest"')) html = html.replace('</head>', head);
html = html.replace('<html lang="en">', '<html lang="it">').replace('initial-scale=1, shrink-to-fit=no', 'initial-scale=1, shrink-to-fit=no, viewport-fit=cover');
fs.writeFileSync(file, html);
fs.writeFileSync(path.join(dist, '404.html'), html);
console.log('PWA head added', base || '/');
