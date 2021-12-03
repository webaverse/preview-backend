const fs = require('fs');
const url = require('url');
const http = require('http');
const https = require('https');
const { _handlePreviewRequest } = require('./routes/preview.js')
const { _handleLandPreviewRequest } = require('./routes/land-preview.js')
const { _handleCardPreviewRequest } = require('./routes/card-preview.js')
const { _handleBakeRequest } = require('./routes/bake.js')

let CERT, PRIVKEY;
try {
  CERT = fs.readFileSync('./certs/fullchain.pem');
  PRIVKEY = fs.readFileSync('./certs/privkey.pem');
} catch {
  console.warn("No certs found");
}
const PORT = parseInt(process.env.PORT, 10) || 80;

Error.stackTraceLimit = 300;

const _req = protocol => (req, res) => {
  try {
    const o = url.parse(protocol + '//' + (req.headers['host'] || '') + req.url);
    if (o.host === 'preview.webaverse.com') {
      _handlePreviewRequest(req, res);
      return;
    } else if (o.host === 'land-preview.exokit.org') {
      _handleLandPreviewRequest(req, res);
      return;
    } else if (o.host === 'card-preview.exokit.org') {
      _handleCardPreviewRequest(req, res);
      return;
    } else if (o.host === 'bake.exokit.org') {
      _handleBakeRequest(req, res);
      return;
    } else if (o.host.includes("preview-backend") || o.host.includes("webaverse-preview")){
      _handlePreviewRequest(req, res);
      return;
    }

    res.statusCode = 200;
    res.end('host not found: ' + JSON.stringify(o));
  } catch (err) {
    console.warn(err.stack);

    res.statusCode = 500;
    res.end(err.stack);
  }
};

const server = http.createServer(_req('http:'));
server.on('error', err => {
  console.warn('http server error', err);
});
let server2;
if (CERT && PRIVKEY) {
  server2 = https.createServer({
    cert: CERT,
    key: PRIVKEY,
  }, _req('https:'));
  server2.on('error', err => {
    console.warn('https server error', err);
  });
}
const _warn = err => {
  console.warn('uncaught: ' + err.stack);
};
process.on('uncaughtException', _warn);
process.on('unhandledRejection', _warn);

server.listen(process.env.HTTP_PORT || PORT);
console.log(`http://127.0.0.1:${PORT}`);

if (CERT && PRIVKEY) {
  const HTTPS_PORT = 443;
  server2.listen(process.env.HTTPS_PORT || HTTPS_PORT);
  console.log(`https://127.0.0.1:${HTTPS_PORT}`);
}

process.on('exit', (code, signal) => {
  console.warn('process exited', {code, signal});
});
