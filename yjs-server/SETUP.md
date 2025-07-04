# Quick Setup Guide

## Local Development

1. **Install dependencies**:
   ```bash
   cd yjs-server
   npm install
   ```

2. **Run locally**:
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

3. **Test the connection**:
   ```bash
   npm test
   ```

## Docker Deployment

1. **Build the image**:
   ```bash
   npm run docker:build
   # or manually:
   docker build -t lumencanvas-yjs-server .
   ```

2. **Run with Docker Compose**:
   ```bash
   # Development profile (port 1234)
   docker-compose --profile dev up -d

   # Production profile (port 443 with TLS)
   docker-compose --profile production up -d

   # Proxy profile (for nginx reverse proxy)
   docker-compose --profile proxy up -d
   ```

3. **Check logs**:
   ```bash
   docker logs -f yjs-server-dev
   # or for other profiles:
   docker logs -f yjs-server-prod
   docker logs -f yjs-server-proxy
   ```

## Production Deployment

1. **Copy to server**:
   ```bash
   rsync -avz --exclude node_modules --exclude .git . root@your-server:/opt/yjs-server/
   ```

2. **Build and run on server**:
   ```bash
   ssh root@your-server
   cd /opt/yjs-server
   docker build -t yjs-server . --no-cache
   docker run -d \
     --name yjs-server \
     --restart unless-stopped \
     -p 127.0.0.1:1234:1234 \
     yjs-server
   ```

3. **Configure nginx** (see nginx-config-example.conf)

4. **Test WebSocket connection**:
   ```bash
   wscat -c wss://your-domain.com
   ``` 