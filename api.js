const Web3 = require('web3');
const bip32 = require('./bip32.js');
const bip39 = require('./bip39.js');

const fs = require('fs');
const webaverseAbi = require('./webaverse-abi.json');
const webaverseAddress = require('./webaverse-address.json');


let infuraApiKey, network, mnemonic;
if(fs.existsSync('./config.json')){
  infuraApiKey  = require('./config.json').infuraApiKey;
  network  = require('./config.json').network;
  mnemonic  = require('./config.json').mnemonic;
} else {
  infuraApiKey = process.env.infuraApiKey;
  network = process.env.network;
  mnemonic = process.env.mnemonic;
}

const _makeContracts = web3 => {
  return {
    webaverse: new web3.eth.Contract(webaverseAbi, webaverseAddress),
  };
};
async function _execute(spec) {
  const _waitTransaction = txId => new Promise((accept, reject) => {
    const _recurse = () => {
      this.eth.getTransactionReceipt(txId, (err, result) => {
        if (!err) {
          if (result !== null) {
            accept(result);
          } else {
            _recurse();
          }
        } else {
          reject(err);
        }
      });
    };
    _recurse();
  });

  const {method, data, wait} = spec;
  switch (method) {
    case 'mintToken': {
      const {tokenId, addr, name} = data;

      const nonce = (await this.eth.getTransactionCount(this.eth.defaultAccount)) + 1;
      const gas = await this.contracts.webaverse.methods.mintToken(tokenId, addr, name).estimateGas({from: this.eth.defaultAccount, nonce});
      console.log('estimate gas', gas);
      // const {transactionHash} = await this.contracts.webaverse.methods.mintToken(tokenId, addr, name).send({from: this.eth.defaultAccount, gas, nonce});
      const transactionHash = await new Promise((accept, reject) => {
        const p = this.contracts.webaverse.methods.mintToken(tokenId, addr, name).send({from: this.eth.defaultAccount, gas, nonce});
        p.once('transactionHash', accept);
        p.once('error', reject);
      });
      console.log('got txid', transactionHash);
      if (wait) {
        const rx = await _waitTransaction(transactionHash);
        console.log('got rx', rx);
        return rx;
        /* const result = await this.contracts.webaverse.methods.getTokenByName(name).call();
        console.log('got result 1', result);
        const tokenId = parseInt(result[1], 10);
        console.log('got result 2', tokenId);
        return tokenId; */
      } else {
        return null;
      }
    }
    case 'transferTo': {
      const {addr, tokenId} = data;

      const nonce = (await this.eth.getTransactionCount(this.eth.defaultAccount)) + 1;
      const gas = await this.contracts.webaverse.methods.transferTo(addr, tokenId).estimateGas({from: this.eth.defaultAccount, nonce});
      console.log('estimate gas', gas);
      // const {transactionHash} = await this.contracts.webaverse.methods.mintToken(tokenId, addr, name).send({from: this.eth.defaultAccount, gas, nonce});
      const transactionHash = await new Promise((accept, reject) => {
        const p = this.contracts.webaverse.methods.transferTo(addr, tokenId).send({from: this.eth.defaultAccount, gas, nonce});
        p.once('transactionHash', accept);
        p.once('error', reject);
      });
      console.log('got txid', transactionHash);
      if (wait) {
        const rx = await _waitTransaction(transactionHash);
        console.log('got rx', rx);
        return rx;
        /* const result = await this.contracts.webaverse.methods.getTokenByName(name).call();
        console.log('got result 1', result);
        const tokenId = parseInt(result[1], 10);
        console.log('got result 2', tokenId);
        return tokenId; */
      } else {
        return null;
      }
    }
    default: throw new Error(`unknown execute method ${method}`);
  }
} 
const makeWeb3 = () => {
  const rpcUrl = `https://${network}.infura.io/v3/${infuraApiKey}`;

  const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
  const seed = bip39.mnemonicToSeedSync(mnemonic, '');
  const privateKey = '0x' + bip32.fromSeed(seed).derivePath("m/44'/60'/0'/0").derive(0).privateKey.toString('hex');
  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  web3.eth.accounts.wallet.add(account);
  web3.eth.defaultAccount = account.address;
  web3.contracts = _makeContracts(web3);
  web3.execute = _execute;
  return web3;
};

module.exports = makeWeb3();
