const path = require('node:path');
const sharp = require('sharp');

const root = path.join(__dirname, '..', '..');
const BACKGROUND = '#1F1B16';
const GOLD = '#FFB956';
const ADAPTIVE_SCALE = 0.86;

const CHECK = 'M395 525 L470 600 L630 440';

function glyph({ body, detail, cutout }) {
  const antennae = `<g stroke="${body}" stroke-width="40" stroke-linecap="round"><line x1="512" y1="330" x2="420" y2="226"/><line x1="512" y1="330" x2="604" y2="226"/></g>`;
  const stand = `<rect x="392" y="770" width="240" height="36" rx="18" fill="${body}"/>`;
  const check = (color) =>
    `<path d="${CHECK}" fill="none" stroke="${color}" stroke-width="56" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (cutout) {
    return `<defs><mask id="screen"><rect width="1024" height="1024" fill="#fff"/>${check('#000')}</mask></defs>${antennae}<rect x="222" y="318" width="580" height="420" rx="72" fill="${body}" mask="url(#screen)"/>${stand}`;
  }
  return `${antennae}<rect x="222" y="318" width="580" height="420" rx="72" fill="${body}"/>${check(detail)}${stand}`;
}

function svg(inner, { background, scale = 1 } = {}) {
  const offset = (1024 * (1 - scale)) / 2;
  const fill = background ? `<rect width="1024" height="1024" fill="${background}"/>` : '';
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${fill}<g transform="translate(${offset} ${offset}) scale(${scale})">${inner}</g></svg>`,
  );
}

const full = glyph({ body: GOLD, detail: BACKGROUND });

const outputs = [
  ['assets/images/icon.png', svg(full, { background: BACKGROUND })],
  ['assets/images/favicon.png', svg(full, { background: BACKGROUND })],
  ['assets/images/splash-icon.png', svg(full)],
  ['assets/images/android-icon-foreground.png', svg(full, { scale: ADAPTIVE_SCALE })],
  ['assets/images/android-icon-monochrome.png', svg(glyph({ body: '#FFFFFF', cutout: true }), { scale: ADAPTIVE_SCALE })],
];

(async () => {
  for (const [file, source] of outputs) {
    await sharp(source).png().toFile(path.join(root, file));
    console.log('wrote', file);
  }
  await sharp(svg(full, { background: BACKGROUND })).resize(512, 512).png().toFile(path.join(root, 'store/play/icon-512.png'));
  console.log('wrote store/play/icon-512.png');
})();
