# Yjs WebSocket Server for LumenCanvas

A production-ready, Docker-based Yjs WebSocket server with optional TLS support. This server is built as a standard Node.js application for reliability and maintainability.

## Features

- WebSocket server for Yjs collaborative editing
- Optional TLS/SSL support (`wss://`) via environment variables
- Standard Node.js application structure
- Docker-based deployment using a lean, multi-stage build on Alpine Linux
- Health check endpoint (`/healthz`) for container orchestration
- Runs as a non-root user inside the container for enhanced security

## Quick Start

### Development (HTTP/WS on port 1234)

This is the simplest way to run the server for local development.

```bash
# Using Docker Compose (recommended)
docker-compose up yjs-server-dev
```

Your development Yjs server will be available at `ws://localhost:1234`.

### Production with Direct TLS (HTTPS/WSS on port 443)

This profile tells the Node.js application to handle TLS termination directly.

**1. Place your SSL certificates:**
   Create a `certs` directory inside `yjs-server/` and place your `cert.pem` and `key.pem` files inside it.

**2. Run with the `production` profile:**
```bash
# This automatically mounts the ./certs directory
docker-compose --profile production up yjs-server-prod
```

Your secure Yjs server will be available at `wss://yourdomain.com`.

### Production Behind a Reverse Proxy (Recommended)

This is the most common and recommended production setup. Your reverse proxy (Nginx, Traefik, Caddy, etc.) handles SSL, and the Yjs server runs in plain HTTP mode, only accessible from the proxy.

```bash
# Using Docker Compose
docker-compose --profile proxy up yjs-server-proxy
```

Your reverse proxy should be configured to handle traffic for `wss://y.monolith.services` and forward it to the container at `ws://127.0.0.1:1234`.

## Environment Variables

| Variable     | Default                          | Description                                                                 |
|--------------|----------------------------------|-----------------------------------------------------------------------------|
| `HOST`       | `0.0.0.0`                        | Host address to bind to.                                                    |
| `PORT`       | `1234`                           | Port for non-TLS connections.                                               |
| `ENABLE_TLS` | `false`                          | Set to `true` to enable direct TLS/SSL support.                             |
| `TLS_PORT`   | `443`                            | Port for TLS connections.                                                   |
| `TLS_CERT`   | `/certs/cert.pem`                | Path inside the container to your TLS certificate.                          |
| `TLS_KEY`    | `/certs/key.pem`                 | Path inside the container to your TLS private key.                          |

## Testing the Server

### Using the Test Script
A simple Node.js test script is included to verify server connectivity.

```bash
# Test local server (from inside the yjs-server directory)
node test-server.js

# Test a specific server URL
node test-server.js ws://localhost:1234
node test-server.js wss://y.monolith.services
```

### Using `wscat`
A useful command-line tool for WebSocket testing.

```bash
npm install -g wscat

# Test plain WebSocket
wscat -c ws://localhost:1234

# Test secure WebSocket
wscat -c wss://y.monolith.services
```

## DigitalOcean Deployment Guide

This guide assumes you are using the recommended **Reverse Proxy** setup.

1.  **SSH into your droplet:**
    ```bash
    ssh root@your-droplet-ip
    ```

2.  **Navigate to your project and update:**
    ```bash
    cd /path/to/lumencanvas
    git pull origin main
    ```

3.  **Stop any old containers:**
    ```bash
    cd yjs-server
    docker-compose --profile proxy down
    ```

4.  **Build and start the new server:**
    ```bash
    docker-compose --profile proxy up --build -d
    ```

5.  **Verify it's running:**
    ```bash
    # Check the logs for the "listening on ws://..." message
    docker-compose --profile proxy logs

    # Check the health status
    docker inspect --format '{{.State.Health.Status}}' yjs-server-proxy
    ```

6.  **Ensure your reverse proxy is configured** to forward `wss://y.monolith.services` to `ws://127.0.0.1:1234`.

This completes the setup. The server is now running in a detached, production-ready state.

## Nginx Configuration for WebSocket Proxying

The most common cause of WebSocket connection errors (code 1006) is improper nginx configuration. WebSockets require special handling in nginx to maintain long-lived connections.

### Critical Configuration Elements

1. **WebSocket Upgrade Headers**: Required for protocol switching
2. **Extended Timeouts**: Prevent premature connection closure
3. **Disabled Buffering**: Ensures real-time data flow
4. **Connection Upgrade Mapping**: Handles the protocol upgrade properly

### Example Configuration

See `nginx-config-example.conf` for a complete configuration. Key settings:

```nginx
# Map for connection upgrade
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

location / {
    proxy_pass http://127.0.0.1:1234;
    proxy_http_version 1.1;
    
    # Critical WebSocket headers
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    
    # Extended timeouts (7 days)
    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;
    
    # Disable buffering
    proxy_buffering off;
}
```

### Applying the Configuration

1. Copy the configuration to your server:
   ```bash
   scp nginx-config-example.conf root@your-server:/etc/nginx/sites-available/y.monolith.services
   ```

2. Enable the site:
   ```bash
   ln -s /etc/nginx/sites-available/y.monolith.services /etc/nginx/sites-enabled/
   ```

3. Test the configuration:
   ```bash
   nginx -t
   ```

4. Reload nginx:
   ```bash
   systemctl reload nginx
   ```

### Troubleshooting WebSocket Issues

If you see connection errors in the browser console:

1. **Check nginx error logs**:
   ```bash
   tail -f /var/log/nginx/error.log
   ```

2. **Verify WebSocket headers are being passed**:
   ```bash
   curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" https://y.monolith.services
   ```

3. **Common issues**:
   - Missing `proxy_http_version 1.1` (WebSockets require HTTP/1.1)
   - Default 60s timeout causing disconnections
   - Missing upgrade headers
   - Buffering enabled (causes delays)

## Monitoring

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
   docker run -d -p 1234:1234 --name yjs-server yjs-server
   ```

5. **Verify it's running:**
   ```bash
   docker logs yjs-server
   curl -I http://localhost:1234
   ```

6. **Update your reverse proxy config** to forward `wss://y.monolith.services` to `ws://127.0.0.1:1234`.

This completes the setup. The server is now running in a detached, production-ready state.

## Nginx Configuration for WebSocket Proxying

The most common cause of WebSocket connection errors (code 1006) is improper nginx configuration. WebSockets require special handling in nginx to maintain long-lived connections.

### Critical Configuration Elements

1. **WebSocket Upgrade Headers**: Required for protocol switching
2. **Extended Timeouts**: Prevent premature connection closure
3. **Disabled Buffering**: Ensures real-time data flow
4. **Connection Upgrade Mapping**: Handles the protocol upgrade properly

### Example Configuration

See `nginx-config-example.conf` for a complete configuration. Key settings:

```nginx
# Map for connection upgrade
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

location / {
    proxy_pass http://127.0.0.1:1234;
    proxy_http_version 1.1;
    
    # Critical WebSocket headers
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    
    # Extended timeouts (7 days)
    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;
    
    # Disable buffering
    proxy_buffering off;
}
```

### Applying the Configuration

1. Copy the configuration to your server:
   ```bash
   scp nginx-config-example.conf root@your-server:/etc/nginx/sites-available/y.monolith.services
   ```

2. Enable the site:
   ```bash
   ln -s /etc/nginx/sites-available/y.monolith.services /etc/nginx/sites-enabled/
   ```

3. Test the configuration:
   ```bash
   nginx -t
   ```

4. Reload nginx:
   ```bash
   systemctl reload nginx
   ```

### Troubleshooting WebSocket Issues

If you see connection errors in the browser console:

1. **Check nginx error logs**:
   ```bash
   tail -f /var/log/nginx/error.log
   ```

2. **Verify WebSocket headers are being passed**:
   ```bash
   curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" https://y.monolith.services
   ```

3. **Common issues**:
   - Missing `proxy_http_version 1.1` (WebSockets require HTTP/1.1)
   - Default 60s timeout causing disconnections
   - Missing upgrade headers
   - Buffering enabled (causes delays)

## Monitoring

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