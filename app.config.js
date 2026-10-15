module.exports = ({ config }) => {
  const extra = { ...config.extra };
  if (process.env.TMDB_PROXY_URL) extra.tmdbProxyUrl = process.env.TMDB_PROXY_URL;
  if (process.env.FINALE_BUILD_PROFILE) extra.buildProfile = process.env.FINALE_BUILD_PROFILE;
  return { ...config, extra };
};
