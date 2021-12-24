const url = require('url');
const http = require('http');
const mime = require('mime');
const fetch = require('node-fetch');
const {parseQuery} = require('../utils.js');
const {hasCacheSupport, getObject, putObject, deleteObject} = require('../aws.js');
const browserManager = require('../browser-manager.js');
const {renderTimeout} = require('../constants.js');

const PREVIEW_HOST = '127.0.0.1';
const PREVIEW_PORT = 8999;

const bucketNames = {
  preview: 'preview-exokit-org',
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

let browser, ticketManager;
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
        cb.accept({req, res});
      } else {
        res.statusCode = 404;
        res.end();
      }
    } else {
      res.statusCode = 404;
      res.end();
    }
  } else if (req.method === 'DELETE') {
    const match = req.url.match(/^\/([0-9]+)/);
    if (match) {
      const index = parseInt(match[1], 10);
      const cb = cbs[index];
      if (cb) {
        delete cbs[index];
        cb.reject({req, res});
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

const _handlePreviewRequest = async (req, res) => {
  await serverPromise;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');

  if (req.method === 'OPTIONS') {
    res.end();
    return;
  }

  const u = url.parse(req.url, true);
  const spec = (() => {

    if(!u.search){
        const match = u.pathname.match(/^\/([^\.]+)\.([^\/]+)\/([^\.]+)\.(.+)$/);
        if (match) {
          let hash = match[1];
          let ext = match[2].toLowerCase();
          let type = match[4].toLowerCase();
          let url = `${storageHost}/${hash}/${hash}.${ext}`;
          let width = match[3]?.match(/(?<=\/)[\w+.-]+.+?(?=x)/)?.[0];
          let height = match[3]?.match(/(?<=x)[\w+.-]+/)?.[0];
          return {
            url,
            hash,
            ext,
            type,
            width,
            height
          }
        }
    }else if(u.search){
      return parseQuery(u.search);
    }
    return null;
  })();
  const {query = {}} = u;
  const cache = hasCacheSupport && !query['nocache'];
  if (spec) {
    const {url, hash, ext, type, height, width} = spec;
    const key = `${hash}/${ext}/${type}`;
    
    if (req.method === 'GET') {
      console.log('preview get request', {url, hash, ext, type, cache, height, width, key});
      
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
      const contentType = mime.getType(type);
      if (o) {
        console.log('preview get from cache', key, contentType, o.Body.byteLength);
        
        // res.setHeader('Content-Type', o.ContentType || 'application/octet-stream');
        res.setHeader('Content-Type', contentType);
        res.setHeader('ETag', o.ETag);
        res.end(o.Body);
      } else {
        await ticketManager.lock();

        const p = _makePromise()
        const index = ++cbIndex;
        cbs[index] = p;

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
              reject(new Error('timed out: ' + JSON.stringify(spec, null, 2)));
            }, renderTimeout);
          });

          await Promise.race([
            (async () => {
              let b;
              if (ext !== 'html') {
                const u = `https://app.webaverse.com/screenshot.html?url=${url}&hash=${hash}&ext=${ext}&type=${type}&width=${width}&height=${height}&dst=http://${PREVIEW_HOST}:${PREVIEW_PORT}/` + index;
                console.log('rendering preview url', u);
                page.browser().version()
                  .then(version => {
                    console.log('chrome version', version);
                  });
                await page.goto(u);
                
                // wait for response from page
                let proxyReq, proxyRes, err;
                try {
                  const o = await p;
                  proxyReq = o.req;
                  proxyRes = o.res;
                  err = null;
                } catch (e) {
                  proxyReq = e.req;
                  proxyRes = e.res;
                  
                  const bs = [];
                  proxyReq.on('data', d => {
                    bs.push(d);
                  });
                  proxyReq.on('error', err => {
                    console.warn(err);
                  });
                  await new Promise((accept, reject) => {
                    proxyReq.on('end', accept);
                  });
                  proxyRes.end();
                  // page.close();
                  
                  b = Buffer.concat(bs);
                  bs.length = 0;
                  
                  const s = b.slice(0, 4096).toString('utf8');
                  err = new Error('preview failed: ' + s);
                }
                console.log('got err', !!err);
                if (!err) {
                  res.setHeader('Content-Type', contentType);
                  proxyReq.pipe(res);

                  const bs = [];
                  proxyReq.on('data', d => {
                    bs.push(d);
                  });
                  proxyReq.on('error', err => {
                    console.warn(err);
                  });
                  await new Promise((accept, reject) => {
                    proxyReq.on('end', accept);
                  });
                  proxyRes.end();
                  // page.close();
                  
                  b = Buffer.concat(bs);
                  bs.length = 0;
                } else {
                  proxyRes.end();

                  throw err;
                }
              } else {
                let localWidth = parseInt(width, 10);
                if (isNaN(localWidth)) {
                  localWidth = 1024;
                }
                let localHeight = parseInt(height, 10);
                if (isNaN(localHeight)) {
                  localHeight = 768;
                }
                await page.setViewport({
                  width: localWidth,
                  height: localHeight,
                });
                await page.goto(url);
                
                const ogImageMetaValue = await page.$eval("head > meta[property='og:image']", element => element.content);
                
                if (ogImageMetaValue) {
                  const ogImageUrl = new URL(ogImageMetaValue, url + (!/\/$/.test(url) ? '/' : ''));
                  // console.log('got og image', url, ogImageMetaValue, ogImageUrl);
                  // await page.goto(ogImageUrl);
                  const res = await fetch(ogImageUrl);
                  b = await res.buffer();
                } else {
                  b = await page.screenshot({});
                }

                res.setHeader('Content-Type', contentType);
                res.end(b);
              }

              if (cache) {
                console.log('put preview result', {
                  bucketName: bucketNames.preview,
                  key,
                  length: b.length,
                  contentType,
                });

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
          console.warn('preview error', err.stack);
          
          res.status = 500;
          res.end(err.stack);
        } finally {
          ticketManager.unlock();

          if (page) {
            page.close();
          }
        }
      }
    } else if (req.method === 'DELETE') {
      console.log('preview delete request', {hash, ext, key});
      
      await deleteObject(
        bucketNames.preview,
        key
      );
      
      res.setHeader('Content-Type', 'application/json');
      const j = {
        ok: true,
      };
      const s = JSON.stringify(j);
      res.end(s);
    } else {
      res.statusCode = 404;
      res.end();
    }
  } else {
    res.statusCode = 404;
    res.end();
  }
};

module.exports = {
  _handlePreviewRequest,
}
