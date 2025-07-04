#!/bin/sh

# Check if TLS is enabled and certificates exist
if [ "$TLS_ENABLED" = "true" ] && [ -f "$TLS_CERT_PATH" ] && [ -f "$TLS_KEY_PATH" ]; then
    echo "Starting y-websocket server with TLS on port $TLS_PORT"
    exec npx y-websocket --port="$TLS_PORT" --host="$HOST" --cert="$TLS_CERT_PATH" --key="$TLS_KEY_PATH"
else
    echo "Starting y-websocket server without TLS on port $PORT"
    exec npx y-websocket --port="$PORT" --host="$HOST"
fi 