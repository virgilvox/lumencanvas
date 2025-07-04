# Yjs WebSocket Server

A Docker-based Yjs WebSocket server with optional TLS support for real-time collaborative editing in LumenCanvas.

## Features

- WebSocket server for Yjs collaborative editing
- Optional TLS/SSL support for secure connections
- Configurable host and port settings
- Docker-based deployment
- Alpine Linux for minimal footprint

## Quick Start

### Basic Usage (HTTP/WS)

```bash
# Build the Docker image
docker build -t yjs-server .

# Run without TLS (plain WebSocket)
docker run -p 1234:1234 yjs-server
```

Your Yjs server will be available at `ws://localhost:1234`

### With TLS (HTTPS/WSS)

```bash
# Run with TLS support
docker run \
  -p 443:443 \
  -v /path/to/your/certs:/certs \
  -e TLS_ENABLED=true \
  -e TLS_CERT_PATH=/certs/cert.pem \
  -e TLS_KEY_PATH=/certs/key.pem \
  -e TLS_PORT=443 \
  yjs-server
```

Your secure Yjs server will be available at `wss://yourdomain.com`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `0.0.0.0` | Host address to bind to |
| `PORT` | `1234` | Port for non-TLS connections |
| `TLS_ENABLED` | `false` | Enable TLS/SSL support |
| `TLS_PORT` | `443` | Port for TLS connections |
| `TLS_CERT_PATH` | `/certs/cert.pem` | Path to TLS certificate |
| `TLS_KEY_PATH` | `/certs/key.pem` | Path to TLS private key |

## Testing the Server

### Using wscat

Install wscat globally:
```bash
npm install -g wscat
```

Test plain WebSocket connection:
```bash
wscat -c ws://localhost:1234
```

Test secure WebSocket connection:
```bash
wscat -c wss://yourdomain.com
```

### Using the Test Script

We provide a simple Node.js test script to verify server connectivity:

```bash
# Test local server
node test-server.js

# Test specific server
node test-server.js ws://localhost:1234
node test-server.js wss://yourdomain.com
```

### Using JavaScript

```javascript
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// For development (plain WebSocket)
const doc = new Y.Doc();
const provider = new WebsocketProvider('ws://localhost:1234', 'my-document', doc);

// For production (secure WebSocket)
const secureProvider = new WebsocketProvider('wss://yourdomain.com', 'my-document', doc);

// Test the connection
provider.on('status', event => {
  console.log(event.status); // 'connecting', 'connected', or 'disconnected'
});
```

## Deployment Options

### Option 1: Direct Docker Deployment

Build and run the container directly as shown in the Quick Start section.

### Option 2: Behind a Reverse Proxy

For automatic SSL certificate management, deploy behind a reverse proxy like Nginx or Traefik:

```bash
# Run without built-in TLS (let reverse proxy handle SSL)
docker run -p 1234:1234 yjs-server
```

Then configure your reverse proxy to:
- Handle SSL termination
- Proxy WebSocket connections to the container
- Manage certificate renewal (Let's Encrypt, etc.)

### Option 3: Cloud Deployment

Deploy to cloud platforms like:
- **Railway**: Easy deployment with automatic SSL
- **Heroku**: Add websocket support in dyno
- **DigitalOcean App Platform**: Built-in load balancing
- **AWS ECS/Fargate**: Scalable container deployment

## Integration with LumenCanvas

To integrate this Yjs server with your LumenCanvas application:

1. **Install Yjs dependencies in your main app:**
   ```bash
   npm install yjs y-websocket
   ```

2. **Create a collaborative store or composable:**
   ```javascript
   // composables/useCollaboration.js
   import * as Y from 'yjs';
   import { WebsocketProvider } from 'y-websocket';
   
   export function useCollaboration(documentId) {
     const doc = new Y.Doc();
     const provider = new WebsocketProvider(
       process.env.NODE_ENV === 'production' 
         ? 'wss://your-yjs-server.com' 
         : 'ws://localhost:1234',
       documentId,
       doc
     );
     
     return { doc, provider };
   }
   ```

3. **Use in your components:**
   ```javascript
   // In your Vue component
   import { useCollaboration } from '@/composables/useCollaboration';
   
   export default {
     setup() {
       const { doc, provider } = useCollaboration('project-123');
       
       // Sync your project data with Yjs
       const yMap = doc.getMap('project');
       
       return { yMap, provider };
     }
   };
   ```

## Troubleshooting

### Connection Issues

1. **Check firewall settings** - Ensure ports 1234 (or your custom port) are open
2. **Verify WebSocket support** - Some corporate networks block WebSocket connections
3. **Check TLS certificates** - Ensure certificates are valid and paths are correct

### Performance Tuning

1. **Memory limits** - Adjust Docker memory limits for large documents
2. **Persistence** - Consider adding Redis or database persistence for document history
3. **Scaling** - Use multiple instances behind a load balancer for high traffic

### Development Tips

1. **Hot reloading** - Mount your code as a volume during development
2. **Logging** - Add `DEBUG=y*` environment variable for verbose logging
3. **Health checks** - Implement health check endpoints for monitoring

## Security Considerations

1. **Use TLS in production** - Always use secure WebSocket connections (wss://) in production
2. **Authentication** - Consider adding authentication middleware
3. **Rate limiting** - Implement rate limiting to prevent abuse
4. **CORS** - Configure CORS policies appropriately
5. **Certificate management** - Use automated certificate renewal

## Contributing

When contributing to the Yjs server setup:

1. Test both TLS and non-TLS configurations
2. Ensure Docker builds successfully
3. Verify WebSocket connections work properly
4. Update documentation for any new features
5. Test integration with the main LumenCanvas application 