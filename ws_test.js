import Web3 from "web3";

const web3 = new Web3("ws://127.0.0.1:7545");

web3.eth.subscribe("newBlockHeaders", (err, block) => {
  if (err) console.error("❌ WebSocket lỗi:", err.message);
  else console.log("✅ Block mới:", block.number);
});
