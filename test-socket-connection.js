// Socket server connection status checker
// This script tests connectivity to the socket server

const { io } = require('socket.io-client');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Default URL if not provided
let socketUrl = 'https://slack-clone-socket.onrender.com';

// Ask for the URL to test
rl.question(`Enter socket server URL to test (default: ${socketUrl}): `, (url) => {
    if (url && url.trim() !== '') {
        socketUrl = url.trim();
    }

    console.log(`Testing connection to: ${socketUrl}`);

    // Create socket instance
    const socket = io(socketUrl, {
        path: '/socket.io',
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 3,
        timeout: 10000,
        // Important: test both with and without credentials
        withCredentials: false
    });

    // Connection event
    socket.on('connect', () => {
        console.log('\x1b[32m%s\x1b[0m', '✓ Connected successfully!');
        console.log(`Socket ID: ${socket.id}`);
        console.log(`Transport: ${socket.io.engine.transport.name}`);

        // Try authentication
        console.log('Attempting authentication...');
        socket.emit('authenticate', {
            userId: 'test-user-id',
            name: 'Test User',
            image: null
        });
    });

    // Authentication response
    socket.on('authenticated', () => {
        console.log('\x1b[32m%s\x1b[0m', '✓ Authentication successful!');
        console.log('\nTesting complete. Socket is working correctly.');

        // Disconnect after successful test
        socket.disconnect();
        rl.close();
    });

    // Unauthorized response
    socket.on('unauthorized', (error) => {
        console.log('\x1b[31m%s\x1b[0m', '✗ Authentication failed:');
        console.log(error);

        socket.disconnect();
        rl.close();
    });

    // Connection error
    socket.on('connect_error', (err) => {
        console.log('\x1b[31m%s\x1b[0m', '✗ Connection error:');
        console.log(err.message);

        // Try again with credentials set to true
        if (socket.io.opts.withCredentials === false) {
            console.log('\nRetrying with withCredentials: true...');

            socket.disconnect();

            const credentialSocket = io(socketUrl, {
                path: '/socket.io',
                transports: ['polling', 'websocket'],
                reconnectionAttempts: 3,
                timeout: 10000,
                withCredentials: true
            });

            credentialSocket.on('connect', () => {
                console.log('\x1b[32m%s\x1b[0m', '✓ Connected successfully with credentials!');
                credentialSocket.disconnect();
                rl.close();
            });

            credentialSocket.on('connect_error', (err) => {
                console.log('\x1b[31m%s\x1b[0m', '✗ Connection error with credentials:');
                console.log(err.message);
                console.log('\nBoth connection modes failed. Please check your CORS settings.');
                credentialSocket.disconnect();
                rl.close();
            });
        } else {
            socket.disconnect();
            rl.close();
        }
    });

    // Set timeout
    setTimeout(() => {
        if (!socket.connected) {
            console.log('\x1b[31m%s\x1b[0m', '✗ Connection timed out');
            socket.disconnect();
            rl.close();
        }
    }, 10000);
});
