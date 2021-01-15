const path = require('path');
const stream = require('stream');
const fs = require('fs');
const url = require('url');
const querystring = require('querystring');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const zlib = require('zlib');
const child_process = require('child_process');
const mime = require('mime');

const {getObject, putObject} = require('../aws.js');
const puppeteer = require('puppeteer');
const browserManager = require('../browser-manager.js');

const PREVIEW_HOST = '127.0.0.1';
const PREVIEW_PORT = 8998;

const bucketNames = {
  preview: 'land-preview.exokit.org',
};
const storageHost = 'https://ipfs.exokit.org';

const _makePromise = () => {
  let accept, reject;
  const p = new Promise((a, r) => {
    accept = a;
    reject = r;
  });
  p.accept = accept;
  p.reject = reject;
  return p;
};

const _warn = err => {
  console.warn('uncaught: ' + err.stack);
};
process.on('uncaughtException', _warn);
process.on('unhandledRejection', _warn);

let browser;
const serverPromise = _makePromise();
let cbIndex = 0;
const cbs = {};

(async () => {
browser = await browserManager.getBrowser();
ticketManager = browserManager.makeTicketManager(4);

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  if (req.method === 'OPTIONS') {
    res.end();
  } else if (req.method === 'POST') {
    const match = req.url.match(/^\/([0-9]+)/);
    // console.log('callback server 1', req.url, !!match);
    if (match) {
      const index = parseInt(match[1], 10);
      const cb = cbs[index];
      // console.log('callback server 2', req.url, index, !!cb);
      if (cb) {
        delete cbs[index];
        cb({req, res});
      } else {
        res.statusCode = 404;
        res.end();
      }
    } else {
      res.statusCode = 404;
      res.end();
    }
  } else {
    res.statusCode = 404;
    res.end();
  }
});
server.on('error', serverPromise.reject.bind(serverPromise));
server.listen(PREVIEW_PORT, PREVIEW_HOST, serverPromise.accept.bind(serverPromise));
})();

const _handleLandPreviewRequest = async (req, res) => {
  await serverPromise;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');

  const u = url.parse(req.url, true);
  const spec = (() => {
    const match = u.pathname.match(/^\/(-?[0-9\.]+)\/(-?[0-9\.]+)\/(-?[0-9\.]+)$/);
    if (match) {
      const z = parseFloat(match[1]);
      const x = parseFloat(match[2]);
      const y = parseFloat(match[3]);
      const e = match[4] || '';
      return {
        z,
        x,
        y,
        e,
      };
    } else {
      return null;
    }
  })();
  const {query = {}} = u;
  const cache = !query['nocache'];
  if (spec) {
    const {z, x, y} = spec;
    const {e, r} = query;
    const key = `parcels/${z}/${x}/${y}/${e || ''}/${r || ''}`;
    const o = cache ? await (async () => {
      try {
        return await getObject(
          bucketNames.preview,
          key,
        );
      } catch(err) {
        // console.warn(err);
        return null;
      }
    })() : null;
    const contentType = 'image/png';
    if (o) {
      // res.setHeader('Content-Type', o.ContentType || 'application/octet-stream');
      res.setHeader('Content-Type', contentType);
      res.end(o.Body);
    } else {
      await ticketManager.lock();

      const p = _makePromise()
      const index = ++cbIndex;
      cbs[index] = p.accept.bind(p);

      let page;
      try {
        // console.log('preview 3');
        page = await browser.newPage();
        // console.log('preview 4');
        page.on('console', e => {
          console.log(e);
        });
        page.on('error', err => {
          console.log(err);
        });
        page.on('pageerror', err => {
          console.log(err);
        });

        let timeout;
        const t = new Promise((accept, reject) => {
          timeout = setTimeout(() => {
            reject(new Error('timed out'));
          }, 30 * 1000);
        });

        await Promise.race([
          (async () => {
            await page.goto(`https://app.webaverse.com/map.html?x=${x}&y=${y}&sw=${z}&sh=${z}&dw=512&dh=512${e ? `&e=${e}` : ''}${r ? `&r=${r}` : ''}&dst=http://${PREVIEW_HOST}:${PREVIEW_PORT}/` + index);
            const {
              req: proxyReq,
              res: proxyRes,
            } = await p;

            res.setHeader('Content-Type', contentType);
            proxyReq.pipe(res);

            const bs = [];
            proxyReq.on('data', d => {
              bs.push(d);
            });
            proxyReq.on('error', err => {
              console.log(err);
            });
            await new Promise((accept, reject) => {
              proxyReq.on('end', accept);
            });
            proxyRes.end();
            // page.close();

            if (cache) {
              const b = Buffer.concat(bs);
              bs.length = 0;
              await putObject(
                bucketNames.preview,
                key,
                b,
                contentType,
              );
            }
          })(),
          t,
        ]);
        clearTimeout(timeout);
      } catch (err) {
        console.warn(err.stack);
      } finally {
        ticketManager.unlock();

        if (page) {
          page.close();
        }
      }
    }
  } else {
    res.statusCode = 404;
    res.end();
  }
};

module.exports = {
  _handleLandPreviewRequest,
}
