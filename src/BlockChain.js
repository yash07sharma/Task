const Block = require("./Block"),
  Transaction = require("./Transaction"),
  { MINT_KEY_PAIR, MINT_PUBLIC_ADDRESS } = require("../config");


class BlockChain {
  constructor() {
    //Initial coin release
    const holderPublicKey = "04719af634ece3e9bf00bfd7c58163b2caf2b8acd1a437a3e99a093c8dd7b1485c20d8a4c9f6621557f1d583e0fcff99f3234dd1bb365596d1d67909c270c16d64";
    const initalCoinRelease = new Transaction(
      MINT_PUBLIC_ADDRESS,
      holderPublicKey,
      100000
    );

    this.transactions = [];
    this.chain = [new Block("", [initalCoinRelease])];
    this.difficulty = 1;
    this.blockTime = 10000; // 10 seconds
    this.reward = 100;
    
  }

  getLastBlock() {
    return this.chain[this.chain.length - 1];
  }

  addBlock (block) {
    block.prevHash = this.getLastBlock().hash;
    block.hash = Block.getHash(block);
    block.mine(this.difficulty);
    this.chain.push(Object.freeze(block));

    this.difficulty += Date.now() - parseInt(this.getLastBlock().timestamp) < this.blockTime ? 1 : -1;
  } 

  addTransaction(transaction) {
    if (Transaction.isValid(transaction, this)) {
      this.transactions.push(transaction);
    }
  }

  mineTransactions (rewardAddress) {
    const rewardTransaction = new Transaction(MINT_PUBLIC_ADDRESS, rewardAddress, this.reward);
    rewardTransaction.sign(MINT_KEY_PAIR);

    const blockTransactions = [rewardTransaction, ...this.transactions];

    if (this.transactions.length !== 0) {
      this.addBlock(new Block(Date.now().toString(), blockTransactions));
      }
    
    this.transactions.splice(0, blockTransactions.length - 1);
  }

  getBalance (address) {
    let balance = 0;

    this.chain.forEach(block => {
      block.data.forEach(transaction => {
        if (transaction.from === address) {
          balance -= transaction.amount;
        }

        if (transaction.to === address) {
          balance += transaction.amount;
        }
      })
    })

    return balance;
  }

  static isValid(blockchain = this) {
    const len = blockchain.chain.length;
    for (let i = 1; i < len; i++) {
      const currBlock = blockchain.chain[i];
      const prevBlock = blockchain.chain[i - 1];

      if (
        currBlock.hash !== Block.getHash(currBlock) ||
        currBlock.prevHash !== prevBlock.hash ||
        Transaction.hasValidTransactions(currBlock, blockchain)
      )
        return false;
    }
    return true;
  }
}

module.exports = BlockChain;
