/**
 * Vercel Serverless Function Handler
 * Seamlessly routes API requests in cloud/serverless environment
 */

const app = require('../server');

module.exports = (req, res) => {
  return app(req, res);
};
