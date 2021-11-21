const puppeteer = require('puppeteer');

const browserPromise = puppeteer.launch({
  args: [
    '--no-sandbox',
    '--no-zygote',
    '--disable-setuid-sandbox',
    '--disable-background-networking',
    '--enable-features=NetworkService,NetworkServiceInProcess',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-breakpad',
    '--disable-client-side-phishing-detection',
    '--disable-component-extensions-with-background-pages',
    '--disable-default-apps',
    '--disable-dev-shm-usage',
    '--disable-extensions',
    '--disable-features=TranslateUI',
    '--disable-hang-monitor',
    '--disable-ipc-flooding-protection',
    '--disable-popup-blocking',
    '--disable-prompt-on-repost',
    '--disable-renderer-backgrounding',
    '--disable-sync',
    '--force-color-profile=srgb',
    '--metrics-recording-only',
    '--no-first-run',
    '--enable-automation',
    '--password-store=basic',
    '--use-mock-keychain',
    '--headless',
    '--hide-scrollbars',
    '--mute-audio',
    '--disable-web-security',
    '--user-data-dir=/var/www/project-generator/var/chrome-user-data',
    '--allow-file-access-from-files',
    '--no-sandbox',
    '--no-sandbox-and-elevated',
    '--no-zygote',
    '--use-gl=desktop',
    '--use-skia-renderer',
    '--enable-gpu-rasterization',
    '--enable-zero-copy',
    '--disable-gpu-sandbox',
    '--enable-native-gpu-memory-buffers',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--ignore-certificate-errors',
    '--enable-hardware-overlays',
    '--num-raster-threads=4',
    '--enable-oop-rasterization',
    '--remote-debugging-port=0',
    '--disable-gpu-compositing',
    '--allow-pre-commit-input'

    // '--disable-dev-shm-usage',
  ],
  // defaultViewport: chromium.defaultViewport,
  // executablePath: await chromium.executablePath,
  headless: true,
});

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

class TicketManager {
  constructor(tickets) {
    this.tickets = tickets;
    this.queue = [];
  }
  async lock() {
    if (this.tickets > 0) {
      this.tickets--;
    } else {
      const p = _makePromise();
      this.queue.push(p.accept);
      await p;
      await this.lock();
    }
  }
  unlock() {
    this.tickets++;
    if (this.queue.length > 0) {
      this.queue.shift()();
    }
  }
}

module.exports = {
  async getBrowser() {
    return await browserPromise;
  },
  makeTicketManager(tickets) {
    return new TicketManager(tickets);
  },
};