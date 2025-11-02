const http = require('http');
const WebSocket = require('ws');

const HTTP_RPC_URL = 'http://127.0.0.1:8545';
const WS_PORT = 7546;
const POLL_INTERVAL = 1000; // Poll every 1 second

const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Store subscriptions
const subscriptions = new Map();
let lastBlockNumber = 0;

// Function to make HTTP RPC call
function makeRPCCall(method, params = []) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      method: method,
      params: params,
      id: Date.now()
    });

    const req = http.request({
      hostname: '127.0.0.1',
      port: 8545,
      method: 'POST',
      path: '/',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Poll for new blocks and notify subscribers
async function pollBlocks() {
  try {
    const result = await makeRPCCall('eth_blockNumber');
    const currentBlock = parseInt(result.result, 16);
    
    if (currentBlock > lastBlockNumber && subscriptions.size > 0) {
      console.log(`📦 New block detected: ${currentBlock}`);
      lastBlockNumber = currentBlock;
      
      // Notify all subscribers
      for (const [subId, ws] of subscriptions.entries()) {
        try {
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_subscription',
            params: {
              subscription: subId,
              result: {
                number: result.result,
                hash: '0x0000000000000000000000000000000000000000000000000000000000000000'
              }
            }
          }));
        } catch (e) {
          console.error('Error sending to subscriber:', e);
          subscriptions.delete(subId);
        }
      }
    }
  } catch (error) {
    console.error('Error polling blocks:', error.message);
  }
}

// Start polling
setInterval(pollBlocks, POLL_INTERVAL);

wss.on('connection', (ws) => {
  console.log('✅ WebSocket client connected');
  let subscriptionCounter = 1000;
  
  ws.on('message', async (message) => {
    try {
      const rpcRequest = JSON.parse(message.toString());
      
      // Handle eth_subscribe
      if (rpcRequest.method === 'eth_subscribe') {
        const subId = `0x${subscriptionCounter++}`;
        subscriptions.set(subId, ws);
        
        console.log(`📝 Subscription created: ${subId} for ${rpcRequest.params[0]}`);
        
        ws.send(JSON.stringify({
          id: rpcRequest.id,
          jsonrpc: '2.0',
          result: subId
        }));
        return;
      }
      
      // Handle eth_unsubscribe
      if (rpcRequest.method === 'eth_unsubscribe') {
        const subId = rpcRequest.params[0];
        subscriptions.delete(subId);
        console.log(`🔌 Subscription removed: ${subId}`);
        
        ws.send(JSON.stringify({
          id: rpcRequest.id,
          jsonrpc: '2.0',
          result: true
        }));
        return;
      }
      
      // Forward other requests to HTTP RPC
      let result = await makeRPCCall(rpcRequest.method, rpcRequest.params);
      
      // Fix Chain ID for eth_chainId - return 5777 instead of actual chain ID
      if (rpcRequest.method === 'eth_chainId' && result.result) {
        result.result = '0x1691'; // 5777 in hex
        console.log(`🔧 Fixed Chain ID: returning 5777 (0x1691) instead of ${result.result}`);
      }
      
      ws.send(JSON.stringify({
        ...result,
        id: rpcRequest.id
      }));
      
    } catch (error) {
      console.error('❌ Error processing message:', error);
      ws.send(JSON.stringify({
        id: rpcRequest?.id || null,
        jsonrpc: '2.0',
        error: { code: -32603, message: error.message }
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
    // Remove all subscriptions for this client
    for (const [subId, clientWs] of subscriptions.entries()) {
      if (clientWs === ws) {
        subscriptions.delete(subId);
      }
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

server.listen(WS_PORT, '0.0.0.0', () => {
  console.log(`🚀 WebSocket Proxy Server started`);
  console.log(`   Listening on ws://0.0.0.0:${WS_PORT}`);
  console.log(`   Forwarding to ${HTTP_RPC_URL}`);
  console.log(`   Polling for new blocks every ${POLL_INTERVAL}ms`);
  console.log(`   Chainlink can connect to: ws://host.docker.internal:${WS_PORT}`);
});

