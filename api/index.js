const { app, ensureStarted } = require('../app');

module.exports = async (req, res) => {
  await ensureStarted();
  return app(req, res);
};
