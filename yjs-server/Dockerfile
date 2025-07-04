# ───────────────────────────────────────────────
# yjs-websocket server with optional TLS support
# ───────────────────────────────────────────────
# syntax=docker/dockerfile:1

# Stage 1: Build dependencies
FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --only=production

# Stage 2: Production image
FROM node:20-alpine

# Create a non-root user and group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /usr/src/app

COPY --from=builder --chown=nodejs:nodejs /usr/src/app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

USER nodejs

# Default settings
ENV HOST=0.0.0.0 \
    PORT=1234 \
    TLS_PORT=443 \
    ENABLE_TLS=false \
    TLS_CERT=/etc/ssl/certs/yjs-cert.pem \
    TLS_KEY=/etc/ssl/private/yjs-key.pem

# Expose both ports so you can bind whichever you need
EXPOSE 1234 443

# Healthcheck to verify the server is running
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O - "http://localhost:${PORT:-1234}/healthz" || exit 1

CMD [ "npm", "start" ] 