
const devMode = process.env.NODE_ENV === 'development';

let appURL;
if (devMode) appURL = 'http://localhost:3000';
else appURL = 'https://app.webaverse.com';

module.exports = {
  appURL,
  devMode,
}
