
function handle404(res) {
  res.statusCode = 404;
  res.end();
  return true;
}

function handleOptions(res) {
  res.end();
  return true;
}

async function promisifyRequest( req) {
  return await new Promise((resolve, reject) => {
    req.on('end', resolve);
    req.on('error', reject);
  });
}

function setHeaders(res, headers) {
  headers.forEach( h => res.setHeader(...h));
}

module.exports = {
  handle404,
  handleOptions,
  promisifyRequest,
  setHeaders,
}
