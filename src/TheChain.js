const Block = require("./Block"),
  BlockChain = require("./BlockChain"),
  Transaction = require("./Transaction");

const TheChain = new BlockChain();
console.log(TheChain);

module.exports = { Transaction, Block, BlockChain, TheChain };
