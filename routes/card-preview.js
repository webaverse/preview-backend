const url = require('url');
const http = require('http');
const mime = require('mime');

const {getObject, putObject, deleteObject} = require('../aws.js');
const browserManager = require('../browser-manager.js');
const {renderTimeout} = require('../constants.js');

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
const serverPromise = (async () => {
browser = await browserManager.getBrowser();
ticketManager = browserManager.makeTicketManager(4);
})();

const _handleCardPreviewRequest = async (req, res) => {
  await serverPromise;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');

  const u = url.parse(req.url, true);
  const match = u.pathname.match(/^\/([0-9]+)$/);
  const tokenId = parseInt(match?.[1] || '', 10);
  const {query = {}} = u;
  const {w = 500 + '', ext = 'png'} = query;
  const cardWidth = parseInt(w, 10);
  if (!isNaN(tokenId) && ['png', 'jpg'].includes(ext) && !isNaN(cardWidth)) {
    const key = `cards/${tokenId}/${ext}`;
    
    if (req.method === 'GET') {    
      const cardHeight = cardWidth / 2.5 * 3.5;
      const cache = !query['nocache'];
      
      console.log('card preview get request', {tokenId, ext, w, cardWidth, cardHeight});
      
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
      const contentType = mime.getType(ext);
      if (o) {
        // res.setHeader('Content-Type', o.ContentType || 'application/octet-stream');
        res.setHeader('Content-Type', contentType);
        res.setHeader('ETag', o.ETag);
        res.end(o.Body);
      } else {
        await ticketManager.lock();

        let page;
        try {
          page = await browser.newPage();
          // const p = _makePromise();
          page.on('console', e => {
            console.log(e);
            /* const text = e.text();
            if (/cards done render/i.test(text)) {
              p.accept();
            } */
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
              reject(new Error('timed out: ' + JSON.stringify({tokenId, ext, w, cardWidth, cardHeight}, null, 2)));
            }, renderTimeout);
          });

          await Promise.race([
            (async () => {
              console.log('load page 1');
              await page.setViewport({
                width: cardWidth,
                height: cardHeight,
                // deviceScaleFactor: 1,
              });
              /* await page.exposeFunction('onMessageReceivedEvent', e => {
                console.log('got event outer', e);
                p.accept(e.data);
              }); */
              console.log('load page 2');
              await page.goto(`https://cards.webaverse.com/?t=${tokenId}&w=${cardWidth}`, {
                waitUntil: 'networkidle0',
              });
              console.log('load page 3');
              
              /* function listenFor(type) {
                return page.evaluateOnNewDocument(type => {
                  console.log('add listener', type, !!window.onMessageReceivedEvent);
                  window.addEventListener(type, e => {
                    console.log('got event inner', type, !!window.onMessageReceivedEvent, e);
                    window.onMessageReceivedEvent({type, data: e.data});
                  });
                }, type);
              }
              await listenFor('message'); // Listen for "message" custom event on page load. */
              
              console.log('load page 4');
              
              // await p;
              
              console.log('load page 5');
              
              const b = await page.screenshot({
                type: (() => {
                  switch (ext) {
                    case 'png': return 'png';
                    case 'jpg': return 'jpeg';
                    default: return null;
                  }
                })(),
                omitBackground: true,
              });
              console.log('load page 6');
              
              res.setHeader('Content-Type', contentType);
              res.end(b);

              if (cache) {
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
        } catch (err) {
          console.warn(err.stack);
        } finally {
          ticketManager.unlock();

          if (page) {
            page.close();
          }
        }
      }
    } else if (req.method === 'DELETE') {
      console.log('preview cards delete request', {hash, ext, key});
      
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
  _handleCardPreviewRequest,
}