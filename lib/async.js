
function makePromise() {
  let reject, resolve

  //eslint-disable-next-line promise/param-names
  const promise = new Promise(( res, rej ) => {
    reject = rej
    resolve = res
  })

  //noinspection JSUnusedAssignment
  return { promise, reject, resolve }
}

async function timeoutCallback( cb, maxTime = 10000) {
  let timeout;

  const t = new Promise((resolve, reject) => {
    timeout = setTimeout(() => reject(new Error('timed out')), maxTime);
  });

  await Promise.race([cb(), t]);

  clearTimeout(timeout);
}

module.exports = {
  makePromise,
  timeoutCallback,
}
