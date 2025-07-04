#!/usr/bin/env node

/**
 * Simple test script to verify Yjs server connectivity
 * Run with: node test-server.js [ws://localhost:1234]
 */

const WebSocket = require('ws');

// Default server URL
const serverUrl = process.argv[2] || 'ws://localhost:1234';

console.log(`Testing Yjs server at: ${serverUrl}`);
console.log('Attempting to connect...\n');

const ws = new WebSocket(serverUrl);

ws.on('open', function() {
    console.log('✅ Connected successfully!');
    console.log('📡 Server is accepting WebSocket connections');
    
    // Send a test message to verify bidirectional communication
    const testMessage = JSON.stringify({
        type: 'test',
        timestamp: Date.now(),
        message: 'Hello from test client'
    });
    
    ws.send(testMessage);
    console.log('📤 Sent test message');
    
    // Close connection after a short delay
    setTimeout(() => {
        ws.close();
    }, 1000);
});

ws.on('message', function(data) {
    console.log('📥 Received message:', data.toString());
});

ws.on('close', function(code, reason) {
    console.log(`🔌 Connection closed (code: ${code})`);
    if (reason) {
        console.log(`   Reason: ${reason}`);
    }
    console.log('\n✨ Test completed successfully!');
    process.exit(0);
});

ws.on('error', function(error) {
    console.error('❌ Connection failed:');
    console.error(`   Error: ${error.message}`);
    console.error('\n🔍 Troubleshooting tips:');
    console.error('   • Make sure the server is running');
    console.error('   • Check the server URL and port');
    console.error('   • Verify firewall settings');
    console.error('   • For wss://, ensure valid SSL certificates');
    process.exit(1);
});

// Handle timeout
setTimeout(() => {
    if (ws.readyState === WebSocket.CONNECTING) {
        console.error('⏰ Connection timeout');
        console.error('   Server might not be running or unreachable');
        ws.terminate();
        process.exit(1);
    }
}, 5000); 