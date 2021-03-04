const fs = require('fs');
const http = require('http');
const https = require('https');

const {devMode} = require('./const.js');
const {_handlePreviewRequest} = require('./routes/preview.js')
const {_handleLandPreviewRequest} = require('./routes/land-preview.js')
const {_handleBakeRequest} = require('./routes/bake.js')

const CERT = fs.readFileSync('./certs/fullchain.pem');
const PRIVKEY = fs.readFileSync('./certs/privkey.pem');

const PORT = parseInt(process.env.PORT, 10) || 80;

const bakeRegex = /\/bake\//
const landPreviewRegex = /\/land-preview\//
const previewRegex = /\/preview\//


Error.stackTraceLimit = 300;

function handleDevRequest(req) {
  // Shim host and routes for local development.
  if (devMode) {
    // Bake
    if (bakeRegex.test(req.url)) {
      req.url = req.url.substr('/bake'.length);
      req.headers.host = 'bake.exokit.org'

    // Land Preview
    } else if (landPreviewRegex.test(req.url)) {
      req.url = req.url.substr('/land-preview'.length);
      req.headers.host = 'land-preview.exokit.org'

    // Preview
    } else if (previewRegex.test(req.url)) {
      req.url = req.url.substr('/preview'.length);
      req.headers.host = 'preview.exokit.org'
    }
  }
}

const _req = protocol => (req, res) => {
  try {
    handleDevRequest(req);

    const url = new URL(req.url, `${protocol}//${req.headers.host || ''}`);

    if (url.host === 'preview.exokit.org') {
      _handlePreviewRequest(req, res, url);
      return;
    } else if (url.host === 'land-preview.exokit.org') {
      _handleLandPreviewRequest(req, res);
      return;
    } else if (url.host === 'bake.exokit.org') {
      _handleBakeRequest(req, res);
      return;
    }

    res.statusCode = 404;
    res.end('host not found');
  } catch(err) {
    console.error(err);

    res.statusCode = 500;
    res.end(err.stack);
  }
};

const server = http.createServer(_req('http:'));
const server2 = https.createServer({
  cert: CERT,
  key: PRIVKEY,
}, _req('https:'));

const _warn = err => {
  console.warn('uncaught: ' + err.stack);
};
process.on('uncaughtException', _warn);
process.on('unhandledRejection', _warn);

server.listen(PORT);
server2.listen(443);

console.log(`http://127.0.0.1:${PORT}`);
console.log(`https://127.0.0.1:443`);
