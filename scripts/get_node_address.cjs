const axios = require("axios");
const fs = require("fs");

(async () => {
  try {
    const [email, password] = fs.readFileSync("./chainlink-data/.api", "utf8").trim().split("\n");
    const api = axios.create({ baseURL: "http://localhost:6688", withCredentials: true });
    
    // Login to get session cookie
    const loginRes = await api.post("/sessions", { email, password });
    const cookie = loginRes.headers["set-cookie"];
    
    // Get EVM keys
    const keysRes = await api.get("/v2/keys/evm", {
      headers: { "Cookie": cookie ? cookie.join("; ") : "" }
    });
    
    if (keysRes.data.data && keysRes.data.data.length > 0) {
      const nodeAddress = keysRes.data.data[0].attributes.address;
      console.log("=== CHAINLINK NODE ADDRESS ===");
      console.log(nodeAddress);
      console.log("\nExport for use:");
      console.log(`$env:NODE_ADDRESS="${nodeAddress}"`);
      return nodeAddress;
    } else {
      console.log("No EVM keys found!");
    }
  } catch (error) {
    console.error("Error:", error.message);
    if (error.response) {
      console.error("Response:", error.response.data);
    }
    process.exit(1);
  }
})();











