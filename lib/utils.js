function getURLParams(url) {
  return Object.fromEntries(url.searchParams.entries())
}

module.exports = {
  getURLParams,
}
