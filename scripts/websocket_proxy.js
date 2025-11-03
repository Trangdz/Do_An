const http = require('http');
const WebSocket = require('ws');

const HTTP_RPC_URL = 'http://127.0.0.1:7545';
const WS_PORT = 7546; // WebSocket proxy port

// HTTP server để forward JSON-RPC requests
const server = http.createServer();
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('✅ WebSocket client connected');
  
  ws.on('message', async (message) => {
    try {
      const rpcRequest = JSON.parse(message.toString());
      console.log('📨 Received RPC request:', rpcRequest.method);
      
      // Forward to HTTP RPC
      const httpRequest = http.request({
        hostname: '127.0.0.1',
        port: 7545,
        method: 'POST',
        path: '/',
        headers: {
          'Content-Type': 'application/json',
        }
      }, (httpResponse) => {
        let data = '';
        httpResponse.on('data', (chunk) => data += chunk);
        httpResponse.on('end', () => {
          ws.send(data);
        });
      });
      
      httpRequest.on('error', (error) => {
        console.error('❌ HTTP request error:', error);
        ws.send(JSON.stringify({
          id: rpcRequest.id,
          jsonrpc: '2.0',
          error: { code: -32603, message: error.message }
        }));
      });
      
      httpRequest.write(JSON.stringify(rpcRequest));
      httpRequest.end();
      
    } catch (error) {
      console.error('❌ Error processing message:', error);
      ws.send(JSON.stringify({
        id: null,
        jsonrpc: '2.0',
        error: { code: -32700, message: 'Parse error' }
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

server.listen(WS_PORT, '0.0.0.0', () => {
  console.log(`🚀 WebSocket Proxy Server started`);
  console.log(`   Listening on ws://0.0.0.0:${WS_PORT}`);
  console.log(`   Forwarding to ${HTTP_RPC_URL}`);
  console.log(`   Chainlink can connect to: ws://host.docker.internal:${WS_PORT}`);
});


