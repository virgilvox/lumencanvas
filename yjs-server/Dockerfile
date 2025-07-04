# ───────────────────────────────────────────────
# yjs-websocket server with optional TLS support
# ───────────────────────────────────────────────
# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /usr/src/app

# Install the official server binary
RUN npm install -g y-websocket

# ─── Wrapper ---------------------------------------------------------------
# If ENABLE_TLS=true the wrapper starts the server with --cert / --key,
# otherwise it starts it in plain-WS mode.
COPY docker-entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint

# Default settings
ENV HOST=0.0.0.0 \
    PORT=1234 \
    ENABLE_TLS=false \
    TLS_CERT=/etc/ssl/certs/yjs-cert.pem \
    TLS_KEY=/etc/ssl/private/yjs-key.pem

# Expose both ports so you can bind whichever you need
EXPOSE 1234 443

ENTRYPOINT ["/usr/local/bin/entrypoint"] 