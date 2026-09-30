const { randomBytes } = require('crypto');

const { scramble } = require('./src/lib/scramble');

module.exports = ({ config }) => {
  const token = process.env.TMDB_TOKEN;
  if (!token) return config;
  const key = randomBytes(32).toString('hex');
  return {
    ...config,
    extra: { ...config.extra, tmdb: { key, value: scramble(token, key) } },
  };
};
