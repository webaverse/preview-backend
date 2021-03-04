const http = require('http');
const mime = require('mime');

const {getObjectOrNull, putObject} = require('../aws.js');
const browserManager = require('../browser-manager.js');
const {appURL} = require('../const.js');
const {
  makePromise,
  timeoutCallback,
} = require('../lib/async.js');
const {
  handle404,
  handleOptions,
  promisifyRequest,
  setHeaders,
} = require('../lib/request.js');
const { getURLParams } = require( '../lib/utils.js' )

const PREVIEW_HOST = '127.0.0.1';
const PREVIEW_PORT = 8999;

const bucketNames = { preview: 'preview.exokit.org' };
const storageHost = 'https://ipfs.exokit.org';

const idRegex = /^\/([0-9]+)/;
const queryA = /^\/\[([^\]]+)\.([^\].]+)]\/([^.]+)\.(.+)$/;
const queryB = /^\/([^.]+)\.([^\/]+)\/([^.]+)\.(.+)$/;

const headers = [
  ['Access-Control-Allow-Origin', '*'],
  ['Access-Control-Allow-Headers', '*'],
  ['Access-Control-Allow-Methods', '*'],
]

// Add request callbacks to a table to resolve later.
let cbIndex = 0;
const cbs = {};

// Render previews in a browser to keep them as close to in-game as possible.
let browser;
let ticketManager;

// Make sure the server is loaded before handling any requests.
const {
  promise: serverPromise,
  resolve,
  reject
} = makePromise();

process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

init().catch(console.error)

async function _handlePreviewRequest(req, res, url) {
  await serverPromise;
  setHeaders(res, headers);

  await getPreview(res, url);
}

async function init() {
  browser = await browserManager.getBrowser();
  ticketManager = browserManager.makeTicketManager(4);

  const server = createServer();

  server.on('error', reject);
  server.listen(PREVIEW_PORT, PREVIEW_HOST, resolve);
}

function createServer() {
  return http.createServer((req, res) => {
    setHeaders(res, headers);

    switch (req.method) {
      case 'OPTIONS': return handleOptions(res, req);
      case 'POST': return handlePost(res, req);
      default: return handle404(res);
    }
  })
}

function handlePost(res, req) {
  const match = req.url.match(idRegex);

  if (match) {
    const index = parseInt(match[1], 10);

    if (cbs[index]) executeCallback(index, {req, res});
    else handle404(res);
  } else handle404(res);

  return true;
}

function executeCallback(index, param) {
  try {
    cbs[index](param);
  } catch (e) {
    console.error(e);
  } finally {
    delete cbs[index];
  }
}

async function getProxyRequest({
  spec: {url, ext, hash, type},
  useCache,
  contentType,
  index,
  key,
  page,
  proxy,
  res
}) {
  const screenshotURL = `${appURL}/screenshot.html?url=${url}&hash=${hash}&ext=${ext}&type=${type}&dst=http://${PREVIEW_HOST}:${PREVIEW_PORT}/${index}`

  await page.goto(screenshotURL);

  const buffers = [];

  const {
    req: proxyReq,
    res: proxyRes,
  } = await proxy.promise;

  res.setHeader('Content-Type', contentType);

  // Pipe the request and add data to buffers.
  proxyReq.pipe(res);
  proxyReq.on('data', d => buffers.push(d));

  // Wait for end of request.
  await promisifyRequest(proxyReq);
  proxyRes.end();

  // Put object in s3 bucket if caching request.
  if (useCache) await cacheObjectBuffers({buffers, contentType, key});
}

async function cacheObjectBuffers({buffers, contentType, key}) {
  const buffer = Buffer.concat(buffers);
  buffers.length = 0;

  return await putObject(
    bucketNames.preview,
    key,
    buffer,
    contentType,
  );
}

async function getPreview(res, url) {
  const spec = getSpec(url);
  // Caching should be opt-out.
  const useCache = !url.searchParams.get('nocache');

  if (spec) {
    const {hash, ext, type} = spec;
    const contentType = mime.getType(ext);
    const key = `${hash}/${ext}/${type}`;
    const o = useCache
      ? await getObjectOrNull(bucketNames.preview, key)
      : null;

    console.log('preview request:', {hash, ext, type, useCache});

    if (o) {
      res.setHeader('Content-Type', contentType);
      res.end(o.Body);
    } else {
      await ticketManager.lock();

      const proxy = makePromise();

      // Increment index and add to callback register.
      const index = ++cbIndex;
      cbs[index] = proxy.resolve;

      // Open a new page and attempt a proxy request.
      let page;
      try {
        page = await browser.newPage();

        page.on('console', console.log);
        page.on('error', console.error);
        page.on('pageerror', console.error);

        await timeoutCallback(getProxyRequest.bind(
          null,
          {spec, useCache, contentType, index, key, page, proxy, res}
        ));

      } catch (err) {
        console.error(err);
      } finally {
        ticketManager.unlock();
        page?.close();
        res.end();
      }
    }
  } else handle404(res);
}

function getSpec(url) {
  const match = url.pathname.match(queryA);

  if (match) {
    return {
      ext: match[2].toLowerCase(),
      hash: match[1],
      type: match[4].toLowerCase(),
      url: match[1] + '.' + match[2],
    };
  } else {
    const match = url.pathname.match(queryB);

    if (match) {
      const hash = match[1];

      return {
        hash,
        ext: match[2].toLowerCase(),
        type: match[4].toLowerCase(),
        url: `${storageHost}/${hash}`,
      };
    } else {
      return null;
    }
  }
}

module.exports = {
  _handlePreviewRequest,
}
