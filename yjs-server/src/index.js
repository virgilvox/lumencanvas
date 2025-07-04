const { WebSocketServer } = require('ws');
const http = require('http');
const https = require('https');
const fs = require('fs');
const { setupWSConnection } = require('y-websocket/bin/utils');

const host = process.env.HOST || '0.0.0.0';
const port = parseInt(process.env.PORT || 1234, 10);
const tlsPort = parseInt(process.env.TLS_PORT || 443, 10);
const enableTls = process.env.ENABLE_TLS === 'true';
const certPath = process.env.TLS_CERT || '';
const keyPath = process.env.TLS_KEY || '';

const createServer = (app) => {
  if (enableTls && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    try {
      const options = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
      console.log(`🚀 Starting HTTPS server on port ${tlsPort}`);
      return https.createServer(options, app);
    } catch (e) {
      console.error('❌ Failed to create HTTPS server. Check certificate paths.', e);
      // Fallback to HTTP if TLS setup fails
      console.log(`🚀 Starting HTTP server on port ${port} as a fallback.`);
      return http.createServer(app);
    }
  } else {
    if (enableTls) {
      console.warn('⚠️ TLS is enabled, but cert or key file is missing. Starting HTTP server instead.');
    }
    console.log(`🚀 Starting HTTP server on port ${port}`);
    return http.createServer(app);
  }
};

const server = createServer((req, res) => {
  // Basic health check endpoint
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('y-websocket server');
  }
});

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (conn, req) => {
  // The 'utils' module from y-websocket expects the URL in a specific format.
  // We attach it to the request object for compatibility.
  req.url = req.url || '/';
  setupWSConnection(conn, req);
});

server.on('upgrade', (request, socket, head) => {
  // Handle WebSocket upgrade requests
  wss.handleUpgrade(request, socket, head, ws => {
    wss.emit('connection', ws, request);
  });
});

const listenPort = enableTls ? tlsPort : port;

server.listen(listenPort, host, () => {
  console.log(`✅ y-websocket server listening on ${enableTls ? 'wss' : 'ws'}://${host}:${listenPort}`);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
}); 