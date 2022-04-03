const { ec, MINT_PUBLIC_ADDRESS, SHA256 } = require("../config");

class Transaction {
  constructor(from, to, amount) {
    this.from = from;
    this.to = to;
    this.amount = amount;
  }

  sign(keyPair) {
    const publicKey = keyPair.getPublic("hex");

    if (publicKey == this.from) {
      this.signature = keyPair
        .sign(SHA256(this.from + this.to + this.amount), "base64")
        .toDER("hex");
    }
  }

  static isValid(tx, chain) {
    return (
        tx.from &&
        tx.to &&
        tx.amount &&
        tx.signature &&
        (chain.getBalance(tx.from) >= tx.amount || tx.from === MINT_PUBLIC_ADDRESS) && 
        ec.keyFromPublic(tx.from, "hex").verify(SHA256(tx.from + tx.to + tx.amount), tx.signature)
      );
  }
}

module.exports = Transaction;
