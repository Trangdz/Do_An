const axios = require("axios");

const CL_API_URL = "http://localhost:6688";
const CL_EMAIL = "phamlendhub@email.com";
const CL_PASSWORD = "SuperSecretUIpass!@#";

async function login() {
  const res = await axios.post(`${CL_API_URL}/sessions`, {
    email: CL_EMAIL,
    password: CL_PASSWORD
  });
  return res.headers["set-cookie"]?.join(";") || "";
}

async function configureNode(cookie) {
  console.log("\n🔧 Configuring Chainlink node via API...\n");
  
  // Get chains
  try {
    const chainsRes = await axios.get(`${CL_API_URL}/v2/chains/evm`, {
      headers: { Cookie: cookie }
    });
    
    console.log("Current chains:", JSON.stringify(chainsRes.data, null, 2));
    
    // Try to update chain 5777 node
    const updateRes = await axios.patch(
      `${CL_API_URL}/v2/chains/evm/5777/nodes/primary-0-5777`,
      {
        httpURL: "http://host.docker.internal:8545",
        wsURL: "ws://host.docker.internal:8545"
      },
      {
        headers: { Cookie: cookie, "Content-Type": "application/json" }
      }
    );
    
    console.log("✅ Node updated:", JSON.stringify(updateRes.data, null, 2));
  } catch (error) {
    console.error("❌ Error configuring node:", error.response?.data || error.message);
    
    // Try alternative: create/update chain
    try {
      console.log("\n🔄 Trying to create/update chain 5777...");
      const chainRes = await axios.post(
        `${CL_API_URL}/v2/chains/evm`,
        {
          id: "5777",
          enabled: true,
          config: {
            ChainID: 5777,
            ChainType: "evm"
          }
        },
        {
          headers: { Cookie: cookie, "Content-Type": "application/json" }
        }
      );
      console.log("Chain created/updated:", JSON.stringify(chainRes.data, null, 2));
    } catch (chainError) {
      console.error("Chain creation error:", chainError.response?.data || chainError.message);
    }
  }
}

async function main() {
  try {
    const cookie = await login();
    await configureNode(cookie);
  } catch (error) {
    console.error("Failed:", error.message);
  }
}

main();


