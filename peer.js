const { ec, MINT_PUBLIC_ADDRESS, SHA256 } = require("./config");
const { Transaction, BlockChain, TheChain } = require("./src/TheChain");

const WS = require("ws");

const privateKey = "62d101759086c306848a0c1020922a78e8402e1330981afe9404d0ecc0a4be3d";
const keyPair = ec.keyFromPrivate(privateKey, "hex");
const publicKey = keyPair.getPublic("hex");

const PORT = 3000;
const PEERS = [];
const MY_ADDRESS = "ws://localhost:3000";
const server = new WS.Server({ port: PORT });

let opened = [],
  connected = [];
let tempChain = new BlockChain();

console.log("Listening to PORT : ", PORT);

server.on("connection", async (socket, req) => {
  socket.on("message", (message) => {
    const _message = JSON.parse(message);

    console.log("new connection", _message);

    switch (_message.type) {
      case "TYPE_REPLACE_CHAIN":
        const [newBlock, newDiff] = _message.data;
        const ourTx = [
          ...TheChain.transactions.map((tx) => JSON.stringify(tx)),
        ];
        const theirTx = [
          ...newBlock.data
            .filter((tx) => tx.from !== MINT_PUBLIC_ADDRESS)
            .map((tx) => JSON.stringify(tx)),
        ];
        const n = theirTx.length;

        if (newBlock.prevHash !== TheChain.getLastBlock().prevHash) {
          //removes all elements from new chain that are present in curr chain's transactions
            for (let i = 0; i < n; i++) {
            const index = ourTx.indexOf(theirTx[0]);
            if (index === -1) break; // if a transaction is in new chain which is not in current chain, then can't replace chain 
            ourTx.splice(index, 1);
            theirTx.splice(0, 1);
          }

          if (
            //check if all transaction in new chain are present in curr chain
            theirTx.length === 0 &&
            //verify hash of new block in new chain
            SHA256(newBlock.timestamp + TheChain.getLastBlock().hash + JSON.stringify(newBlock.data) + newBlock.nonce) === newBlock.hash &&
            //compare nonce of new chain by finding zeroes at start
            newBlock.hash.startsWith("0" + Array(Math.round(Math.log(TheChain.difficulty) / Math.log(16) + 1)).join("0")) &&
            //compare timestamps of new block and last block of current chain
            (parseInt(newBlock.timestamp) > parseInt(TheChain.getLastBlock.timestamp) || TheChain.getLastBlock().timestamp === "") && 
            //compare timenow with new block timestamp
            parseInt(newBlock.timestamp) < Date.now() &&
            //check prevHashof new block
            TheChain.getLastBlock().hash === newBlock.prevHash &&
            //check if difference in new difficulty and difficulty of current chain is 1 
            (newDiff + 1 === TheChain.difficulty || newDiff - 1 === TheChain.difficulty)
          ) {
            TheChain.chain.push(newBlock);
            TheChain.difficulty = newDiff;
            TheChain.transactions = [...ourTx.map((tx) => JSON.parse(tx))];
          } else {
            console.log('Not everything is true')
            console.log(SHA256(newBlock.timestamp + TheChain.getLastBlock().hash + JSON.stringify(newBlock.data) + newBlock.nonce) === newBlock.hash)
            console.log(newBlock.hash.startsWith("0" + Array(Math.round(Math.log(TheChain.difficulty) / Math.log(16) + 1)).join("0")))
          }
        }
        break;

      case "TYPE_CREATE_TRANSACTION":
        const transaction = _message.data;
        TheChain.addTransaction(transaction);
        break;

      case "TYPE_SEND_CHAIN":
        const { block, finished } = _message.data;
        tempChain.chain.push(block);
        if (finished) {
          if (BlockChain.isValid(tempChain)) {
            TheChain.chain = tempChain.chain;
          }
          tempChain = new BlockChain();
        }
        break;
      
      case "TYPE_REQUEST_CHAIN":
        const socket = opened.filter((node) => node.address === _message.data)[0].socket;
        const len = TheChain.chain.length;
        for (let i = 1; i < len; i++) {
          socket.send(JSON.stringify(
              produceMessage("TYPE_SEND_CHAIN", {
                block: TheChain.chain[i],
                finished: i == len - 1,
              })));
        }
        break;
      case "TYPE_REQUEST_INFO":
        opened.filter((node) => node.address === _message.data)[0].socket.send(
            JSON.stringify(
              produceMessage("TYPE_SEND_INFO", [
                TheChain.difficulty,
                TheChain.transactions,
              ])
            )
          );
        break;

      case "TYPE_SEND_INFO":
        [TheChain.difficulty, TheChain.transactions] = _message.data;
        break;

      case "TYPE_HANDSHAKE":
        const nodes = _message.data;
        nodes.forEach((node) => connect(node));
    }
  });
});

async function connect(address) {
  if (
    !connected.find((peerAddress) => peerAddress === address) &&
    address !== MY_ADDRESS
  ) {
    const socket = new WS(address);
    socket.on("open", () => {
      socket.send(
        JSON.stringify(produceMessage("TYPE_HANDSHAKE", [MY_ADDRESS]))
      );

      opened.forEach((node) =>
        node.socket.send(
          JSON.stringify(produceMessage("TYPE_HANDSHAKE", [address]))
        )
      );

      if (
        !opened.find((peer) => peer.address === address) &&
        address !== MY_ADDRESS
      ) {
        opened.push({ socket, address });
      }

      if (
        !connected.find((peer) => peer.address === address) &&
        address !== MY_ADDRESS
      ) {
        connected.push(address);
      }
    });
    socket.on("close", () => {
      console.log("connection closed", address);
      opened.splice(opened.indexOf(address), 1);
      connected.splice(connected.indexOf(address), 1);
    });
  }
}

function produceMessage(type, data) {
  return { type, data };
}

function sendMessage(message) {
    opened.forEach(node => {
        node.socket.send(JSON.stringify(message))
    })
}

process.on("uncaughtException", (err) => console.log(err));

PEERS.forEach((peer) => connect(peer));

setTimeout(() => {
    const transaction = new Transaction(publicKey, "046856ec283a5ecbd040cd71383a5e6f6ed90ed2d7e8e599dbb5891c13dff26f2941229d9b7301edf19c5aec052177fac4231bb2515cb59b1b34aea5c06acdef43", 200)
    transaction.sign(keyPair)
    sendMessage(produceMessage("TYPE_CREATE_TRANSACTION", transaction));
    TheChain.addTransaction(transaction);
}, 7000)

setTimeout(() => {
    console.log(TheChain)
}, 15000)
