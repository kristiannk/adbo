const { app, start } = require('../app');

let initialized = false;

module.exports = async (req, res) => {
  if (!initialized) {
    initialized = true;
    await start();
  }
  return app(req, res);
};
