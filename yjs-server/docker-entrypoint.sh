#!/bin/sh

# Check if TLS is enabled and certificates exist
if [ "$ENABLE_TLS" = "true" ] && [ -f "$TLS_CERT" ] && [ -f "$TLS_KEY" ]; then
    echo "Starting y-websocket server with TLS on port ${TLS_PORT:-443}"
    exec npx y-websocket --port="${TLS_PORT:-443}" --host="$HOST" --cert="$TLS_CERT" --key="$TLS_KEY"
else
    echo "Starting y-websocket server without TLS on port $PORT"
    exec npx y-websocket --port="$PORT" --host="$HOST"
fi 