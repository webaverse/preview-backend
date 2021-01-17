const path = require('path');
const stream = require('stream');
const fs = require('fs');
const url = require('url');
// const querystring = require('querystring');
const http = require('http');
const https = require('https');
// const dns = require('dns');
// const crypto = require('crypto');
// const zlib = require('zlib');
// const child_process = require('child_process');
// const mkdirp = require('mkdirp');
// const express = require('express');
// const httpProxy = require('http-proxy');
// const ws = require('ws');
// const LRU = require('lru');
// const request = require('request');
// const mime = require('mime');
// const AWS = require('aws-sdk');
// const Stripe = require('stripe');
// const puppeteer = require('puppeteer');
// const namegen = require('./namegen.js');
// const Base64Encoder = require('./encoder.js').Encoder;
// const {JSONServer, CustomEvent} = require('./dist/sync-server.js');
// const fetch = require('node-fetch');
// const {SHA3} = require('sha3');
// const {default: formurlencoded} = require('form-urlencoded');
// const Web3 = require('web3');
// const bip39 = require('bip39');
// const {hdkey} = require('ethereumjs-wallet');
// const blockchain = require('./blockchain.js');
// const {getExt, makePromise} = require('./utils.js');
// const accountManager = require('./account-manager.js');
// const eventsManager = require('./events-manager.js');
// const ethereumHost = 'ethereum.exokit.org';

// const api = require('./api.js');
const {_handlePreviewRequest} = require('./routes/preview.js')
const {_handleLandPreviewRequest} = require('./routes/land-preview.js')
const {_handleBakeRequest} = require('./routes/bake.js')

const CERT = fs.readFileSync('./certs/fullchain.pem');
const PRIVKEY = fs.readFileSync('./certs/privkey.pem');

const PORT = parseInt(process.env.PORT, 10) || 80;

Error.stackTraceLimit = 300;

const _req = protocol => (req, res) => {
  try {
    const o = url.parse(protocol + '//' + (req.headers['host'] || '') + req.url);
    if (o.host === 'preview.exokit.org') {
      _handlePreviewRequest(req, res);
      return;
    } else if (o.host === 'land-preview.exokit.org') {
      _handleLandPreviewRequest(req, res);
      return;
    } else if (o.host === 'bake.exokit.org') {
      _handleBakeRequest(req, res);
      return;
    }

    res.statusCode = 404;
    res.end('host not found');
  } catch(err) {
    console.warn(err.stack);

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
