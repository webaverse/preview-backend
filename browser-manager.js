const puppeteer = require('puppeteer');

const fs = require('fs');
const exists = fs.existsSync('/usr/bin/google-chrome-stable');

console.log("********* CHROME EXISTS?", exists);

const browserPromise = puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  args: [
    '--no-sandbox',
    '--no-zygote',
    '--disable-setuid-sandbox'
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