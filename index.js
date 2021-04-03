const path = require('path');
const stream = require('stream');
const fs = require('fs');
const url = require('url');
const http = require('http');
const https = require('https');
const { _handlePreviewRequest } = require('./routes/preview.js')
const { _handleLandPreviewRequest } = require('./routes/land-preview.js')
const { _handleBakeRequest } = require('./routes/bake.js')

let CERT, PRIVKEY
try {
  CERT = fs.readFileSync('./certs/fullchain.pem');
PRIVKEY = fs.readFileSync('./certs/privkey.pem');
} catch {console.warn("No certs found")}
const PORT = parseInt(process.env.PORT, 10) || 80;

Error.stackTraceLimit = 300;

const _req = protocol => (req, res) => {
  try {
    const o = url.parse(protocol + '//' + (req.headers['host'] || '') + req.url);
    if (/^previews?\.exokit\.org$/.test(o.host)) {
      _handlePreviewRequest(req, res);
      return;
    } else if (/^land-previews?\.exokit\.org$/.test(o.host)) {
      _handleLandPreviewRequest(req, res);
      return;
    } else if (/^bakes?\.exokit\.org$/.test(o.host)) {
      _handleBakeRequest(req, res);
      return;
    } /* else if (o.host.includes("preview-backend")){
      _handlePreviewRequest(req, res);
      return;
    } */

    res.statusCode = 404;
    res.end('host not found');
  } catch (err) {
    console.warn(err.stack);

    res.statusCode = 500;
    res.end(err.stack);
  }
};

const server = http.createServer(_req('http:'));
let server2;
if (CERT !== undefined) {
  server2 = https.createServer({
    cert: CERT,
    key: PRIVKEY,
  }, _req('https:'));
}
const _warn = err => {
  console.warn('uncaught: ' + err.stack);
};
process.on('uncaughtException', _warn);
process.on('unhandledRejection', _warn);

server.listen(process.env.HTTP_PORT || PORT);
console.log(`http://127.0.0.1:${PORT}`);

if (CERT !== undefined) {
  const HTTPS_PORT = 443
  server2.listen(process.env.HTTPS_PORT || HTTPS_PORT);
  console.log(`https://127.0.0.1:${HTTPS_PORT}`);
}

