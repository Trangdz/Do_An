const axios = require("axios");

async function main() {
  const email = process.env.CL_EMAIL || "phamlendhub@email.com";
  const password = process.env.CL_PASSWORD || "SuperSecretUIpass!@#";
  const apiUrl = process.env.CL_API_URL || "http://localhost:6688";
  const jobId = process.env.JOB_ID || "45";

  // Login
  const loginRes = await axios.post(`${apiUrl}/sessions`, { email, password });
  const cookie = loginRes.headers["set-cookie"];
  console.log("Logged in");

  // Trigger webhook
  const triggerRes = await axios.post(
    `${apiUrl}/v2/jobs/${jobId}/runs`,
    {},
    { headers: { Cookie: cookie } }
  );
  console.log("Job run triggered:", triggerRes.data.data.id);
  console.log("Wait a few seconds, then check: npx hardhat run scripts/read_aggregator.cjs --network ganache");
}

main().catch((e) => {
  console.error(e.response?.data || e.message);
  process.exit(1);
});

