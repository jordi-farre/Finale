const path = require('node:path');
const sharp = require('sharp');

const dir = __dirname;

sharp(path.join(dir, 'feature-graphic.svg'))
  .flatten({ background: '#1F1B16' })
  .png()
  .toFile(path.join(dir, 'feature-graphic.png'))
  .then((info) => console.log('wrote feature-graphic.png', info));
