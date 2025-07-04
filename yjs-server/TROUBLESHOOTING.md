# Troubleshooting WebSocket Connection Issues

## Common Error: Code 1006 (Abnormal Closure)

This is the most common WebSocket error in production. It indicates the connection was closed abnormally, usually due to:

1. **Nginx misconfiguration** (90% of cases)
2. Network timeouts
3. SSL/TLS issues
4. Firewall blocking WebSocket traffic

## Quick Diagnosis

### 1. Check Browser Console

Look for these patterns:

```
WebSocket connection to 'wss://y.monolith.services/...' failed
CloseEvent {code: 1006, reason: '', wasClean: false}
```

If you see repeated connection attempts, the issue is likely nginx configuration.

### 2. Test Direct Connection

Bypass nginx to test if the server is working:

```bash
# SSH to your server
ssh root@your-server

# Test local connection
wscat -c ws://localhost:1234
> {"type":"connected"}
```

If this works, the issue is with your reverse proxy.

### 3. Check Nginx Error Logs

```bash
tail -f /var/log/nginx/error.log
```

Common errors:
- `upstream prematurely closed connection`
- `110: Connection timed out`
- `502 Bad Gateway`

## Solution: Proper Nginx Configuration

### The Critical Settings

```nginx
# 1. HTTP/1.1 is REQUIRED for WebSockets
proxy_http_version 1.1;

# 2. These headers MUST be set for protocol upgrade
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection $connection_upgrade;

# 3. Extended timeouts prevent disconnections
proxy_read_timeout 7d;    # 7 days
proxy_send_timeout 7d;
proxy_connect_timeout 7d;

# 4. Disable buffering for real-time data
proxy_buffering off;
```

### Complete Working Configuration

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 443 ssl http2;
    server_name y.monolith.services;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:1234;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Critical timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        
        # Disable buffering
        proxy_buffering off;
        proxy_request_buffering off;
        
        # Optional: larger buffers for WebSocket frames
        proxy_buffer_size 64k;
        proxy_buffers 8 64k;
        proxy_busy_buffers_size 128k;
    }
}
```

## Other Common Issues

### SSL/TLS Certificate Problems

**Symptoms**: Connection fails immediately with SSL errors

**Solution**: Ensure certificates are valid and properly configured:

```bash
# Test certificate
openssl s_client -connect y.monolith.services:443 -servername y.monolith.services

# Check certificate expiry
echo | openssl s_client -connect y.monolith.services:443 2>/dev/null | openssl x509 -noout -dates
```

### Firewall Blocking WebSocket

**Symptoms**: Connection times out

**Solution**: Ensure ports are open:

```bash
# Check if port is accessible
nc -zv y.monolith.services 443

# On server, check iptables
sudo iptables -L -n | grep 1234
```

### Docker Container Issues

**Symptoms**: Container keeps restarting

**Solution**: Check container logs and health:

```bash
# Check if container is running
docker ps | grep yjs-server

# View recent logs
docker logs --tail 50 yjs-server

# Check container health
docker inspect yjs-server | grep -A 10 Health
```

### Client-Side Issues

**Symptoms**: Works for some users but not others

**Common causes**:
1. Corporate proxies blocking WebSocket
2. Antivirus software interfering
3. Browser extensions blocking connections

**Solution**: Test with:
- Different network (mobile hotspot)
- Incognito/private browsing mode
- Different browser
- Disabled antivirus temporarily

## Testing Tools

### 1. wscat (Command Line)

```bash
# Install
npm install -g wscat

# Test connection
wscat -c wss://y.monolith.services

# Send test message
> {"type": "ping"}
< {"type": "pong"}
```

### 2. Browser Test Page

Use the included `test-yjs-connection.html`:

1. Open in browser
2. Click "Connect"
3. Check console for detailed logs
4. Status should show "Connected & Synced"

### 3. curl WebSocket Test

```bash
# Test upgrade headers
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" \
  -H "Sec-WebSocket-Version: 13" \
  https://y.monolith.services
```

Expected response should include:
```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: upgrade
```

## Performance Optimization

### For High-Traffic Deployments

1. **Increase worker connections**:
   ```nginx
   events {
       worker_connections 10000;
   }
   ```

2. **Optimize buffer sizes**:
   ```nginx
   proxy_buffer_size 128k;
   proxy_buffers 16 128k;
   ```

3. **Enable TCP keepalive**:
   ```nginx
   upstream websocket {
       server 127.0.0.1:1234;
       keepalive 64;
   }
   ```

4. **Monitor connection count**:
   ```bash
   # Active WebSocket connections
   ss -tan | grep :1234 | wc -l
   
   # Nginx connections
   nginx -V 2>&1 | grep -o with-http_stub_status_module
   ```

## Getting Help

If issues persist after following this guide:

1. **Collect diagnostics**:
   ```bash
   # Server info
   nginx -V
   docker version
   docker logs --tail 100 yjs-server > yjs-logs.txt
   
   # Network trace
   tcpdump -i any -w websocket.pcap port 1234
   ```

2. **Check versions**:
   - Nginx 1.3.13+ (WebSocket support)
   - Docker 20.10+
   - Node.js 18+

3. **Test with minimal setup**:
   - Disable SSL temporarily
   - Connect directly to Docker port
   - Use simple test client

Remember: 90% of WebSocket issues are nginx configuration. Start there! 