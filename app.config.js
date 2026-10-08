module.exports = ({ config }) => {
  const override = process.env.TMDB_PROXY_URL;
  if (!override) return config;
  return { ...config, extra: { ...config.extra, tmdbProxyUrl: override } };
};
