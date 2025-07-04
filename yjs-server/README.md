# Yjs WebSocket Server

A Docker-based Yjs WebSocket server with optional TLS support for real-time collaborative editing in LumenCanvas.

## Features

- WebSocket server for Yjs collaborative editing
- Optional TLS/SSL support for secure connections
- Configurable host and port settings
- Docker-based deployment
- Alpine Linux for minimal footprint

## Quick Start

### Development (HTTP/WS on port 1234)

```bash
# Using Docker Compose (recommended)
docker-compose up yjs-server-dev

# Or manually with Docker
docker build -t yjs-server .
docker run -p 1234:1234 yjs-server
```

Your development Yjs server will be available at `ws://localhost:1234`

### Production with Direct TLS (HTTPS/WSS on port 443)

```bash
# Using Docker Compose with your SSL certificates
docker-compose --profile production up yjs-server-prod

# Or manually with Docker
docker run \
  -p 443:443 \
  -v /path/to/your/ssl/certs:/certs:ro \
  -e ENABLE_TLS=true \
  -e TLS_CERT=/certs/cert.pem \
  -e TLS_KEY=/certs/key.pem \
  -e TLS_PORT=443 \
  yjs-server
```

Your secure Yjs server will be available at `wss://yourdomain.com`

### Production Behind Reverse Proxy (Recommended)

For production, it's often better to use a reverse proxy (Nginx, Traefik, Cloudflare) for SSL termination:

```bash
# Using Docker Compose
docker-compose --profile proxy up yjs-server-proxy

# The reverse proxy handles SSL and forwards to ws://container:1234
# Your clients connect to wss://yourdomain.com (handled by reverse proxy)
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `0.0.0.0` | Host address to bind to |
| `PORT` | `1234` | Port for non-TLS connections |
| `ENABLE_TLS` | `false` | Enable TLS/SSL support |
| `TLS_PORT` | `443` | Port for TLS connections |
| `TLS_CERT` | `/etc/ssl/certs/yjs-cert.pem` | Path to TLS certificate |
| `TLS_KEY` | `/etc/ssl/private/yjs-key.pem` | Path to TLS private key |

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

### Option 1: DigitalOcean Droplet with Reverse Proxy (Recommended)

Since you're running at `y.monolith.services`, you likely have a reverse proxy (Nginx/Traefik) handling SSL:

```bash
# On your DigitalOcean droplet
git clone <your-repo>
cd lumencanvas/yjs-server

# Build and run behind reverse proxy
docker-compose --profile proxy up -d yjs-server-proxy

# Or manually
docker build -t yjs-server .
docker run -d -p 1234:1234 --name yjs-server yjs-server
```

Configure your reverse proxy to forward WSS connections:
- Client connects to: `wss://y.monolith.services`
- Proxy forwards to: `ws://localhost:1234`

### Option 2: Direct TLS (if you want container to handle SSL)

```bash
# Place your SSL certificates in /etc/ssl/certs/
docker-compose --profile production up -d yjs-server-prod
```

### Option 3: Cloud Platforms

Deploy to platforms with automatic SSL:
- **Railway**: Easy deployment with automatic SSL
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
     
     // Determine server URL based on environment
     const getServerUrl = () => {
       if (typeof window !== 'undefined') {
         // Browser environment - use same protocol as page
         const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
         const host = window.location.hostname;
         
         if (host === 'localhost' || host === '127.0.0.1') {
           return 'ws://localhost:1234';
         } else {
           return `${protocol}//${host === 'your-domain.com' ? 'y.monolith.services' : host}`;
         }
       }
       // Fallback for SSR
       return process.env.NODE_ENV === 'production' 
         ? 'wss://y.monolith.services' 
         : 'ws://localhost:1234';
     };
     
     const provider = new WebsocketProvider(getServerUrl(), documentId, doc);
     
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

### Common Issues

#### "npm error could not determine executable to run"

This error typically occurs when the Docker container can't find the y-websocket executable. To fix:

1. **Rebuild the Docker image** to ensure the latest fixes are applied:
   ```bash
   docker build -t yjs-server . --no-cache
   ```

2. **Stop any running containers** and restart:
   ```bash
   docker stop $(docker ps -q --filter ancestor=yjs-server)
   docker run -p 1234:1234 yjs-server
   ```

3. **Check the logs** for specific error details:
   ```bash
   docker logs <container-id>
   ```

#### Connection Issues

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

## DigitalOcean Deployment Guide

### Prerequisites
- DigitalOcean droplet with Docker installed
- Domain pointing to your droplet (y.monolith.services)
- Reverse proxy (Nginx/Traefik) handling SSL

### Step-by-Step Deployment

1. **SSH into your droplet:**
   ```bash
   ssh root@your-droplet-ip
   ```

2. **Navigate to your project and update:**
   ```bash
   cd /path/to/lumencanvas
   git pull origin main
   ```

3. **Stop the old container (if running):**
   ```bash
   docker stop yjs-server 2>/dev/null || true
   docker rm yjs-server 2>/dev/null || true
   ```

4. **Build and start the new server:**
   ```bash
   cd yjs-server
   docker build -t yjs-server . --no-cache
   docker run -d \
     --name yjs-server \
     --restart unless-stopped \
     -p 127.0.0.1:1234:1234 \
     yjs-server
   ```

5. **Verify it's running:**
   ```bash
   docker logs yjs-server
   curl -I http://localhost:1234
   ```

6. **Update your reverse proxy config** to forward WSS to the container:
   
   **For Nginx:**
   ```nginx
   # Add to your nginx config
   location /yjs/ {
       proxy_pass http://127.0.0.1:1234/;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```

7. **Test the connection:**
   ```bash
   # From your local machine
   wscat -c wss://y.monolith.services/yjs/
   ```

### Monitoring & Logs

```bash
# Check container status
docker ps | grep yjs-server

# View logs
docker logs yjs-server

# Follow logs in real-time
docker logs -f yjs-server

# Check resource usage
docker stats yjs-server
```

### Backup & Restore

```bash
# Backup container image
docker save yjs-server | gzip > yjs-server-backup.tar.gz

# Restore from backup
gunzip -c yjs-server-backup.tar.gz | docker load
``` 