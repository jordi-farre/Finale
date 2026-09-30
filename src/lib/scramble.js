function toHex(byte) {
  return byte.toString(16).padStart(2, '0');
}

function keyByte(keyHex, index) {
  const offset = (index % (keyHex.length / 2)) * 2;
  return parseInt(keyHex.slice(offset, offset + 2), 16);
}

function scramble(text, keyHex) {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    out += toHex(text.charCodeAt(i) ^ keyByte(keyHex, i));
  }
  return out;
}

function unscramble(hex, keyHex) {
  let out = '';
  for (let i = 0; i < hex.length / 2; i++) {
    out += String.fromCharCode(parseInt(hex.slice(i * 2, i * 2 + 2), 16) ^ keyByte(keyHex, i));
  }
  return out;
}

module.exports = { scramble, unscramble };
