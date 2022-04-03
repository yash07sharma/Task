const { MINT_PUBLIC_ADDRESS, SHA256 } = require("../config"),
  Transaction = require("./Transaction");

class Block {
  constructor(timestamp = Date.now().toString(), data = []) {
    this.timestamp = timestamp;
    this.data = data;
    this.hash = Block.getHash(this);
    this.prevHash = "";
    this.nonce = 0;
  }

  static getHash(block) {
    return SHA256(
      String(block.timestamp + block.prevHash + JSON.stringify(block.data) + block.nonce)
    );
  }

  mine (difficulty) {
    while (!this.hash.startsWith(Array(difficulty + 1).join("0"))) {
      this.nonce++;
      this.hash = Block.getHash(this);
    }
  }

  static hasValidTransactions(block, chain) {
    let reward = 0;
    block.data.forEach(transaction => {
      if (transaction.from === MINT_PUBLIC_ADDRESS) {
        reward = transaction.amount;
      }
    })

    return (
      reward === chain.reward &&
      block.data.every(transaction => Transaction.isValid(transaction, chain)) &&
      block.data.filter(transaction => transaction.from === MINT_PUBLIC_ADDRESS).length === 1
    );
  }
}

module.exports = Block;
