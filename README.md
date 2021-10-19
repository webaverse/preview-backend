# preview-backend

The preview server is a headless chromium instance that generates screenshots and animations of items via puppeteer. It's also in charge of generating unique trading cards for every NFT item minted. Here's how it works:

![](https://docs.webaverse.com/assets/images/preview-flow-d0335e01f5f36cf1a12ba51486b9abd7.jpg)

1. Start with user-agent (website or Discord bot) requesting a preview image.
2. Request gets sent to the preview server, checks S3 cache if there's a preview already.
3. If there's no preview, the server will ask the API about the token and fetch the IPFS content
4. The files from the IPFS hash get rendered using Puppeteer, exported as previews.

# Local screenshots

Run https://github.com/webaverse/app, then:

https://127.0.0.1:3001/screenshot.html?url=https://webaverse.github.io/assets/male.vrm&ext=vrm&type=png

