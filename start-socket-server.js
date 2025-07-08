/**
 * Socket.IO server startup script with improved error handling
 * This script starts the Socket.IO server with proper error handling and retries
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure we're in the right directory
const projectRoot = path.resolve(__dirname);
process.chdir(projectRoot);

// Set development environment
process.env.NODE_ENV = 'development';

// Handle errors
function handleError(error) {
    console.error('Error starting Socket.IO server:', error);
    console.log('Attempting to restart in 3 seconds...');

    // Wait 3 seconds and try again
    setTimeout(() => {
        startServer();
    }, 3000);
}

// Start the server
function startServer() {
    try {
        console.log('Starting Socket.IO server...');

        // Use execSync to ensure we see all output immediately
        execSync('node server.js', {
            stdio: 'inherit',
            env: {
                ...process.env,
                PORT: '4000', // Ensure we use port 4000
                NODE_ENV: 'development'
            }
        });
    } catch (error) {
        handleError(error);
    }
}

// Check if server.js exists
if (!fs.existsSync(path.join(projectRoot, 'server.js'))) {
    console.error('Error: server.js not found in', projectRoot);
    process.exit(1);
}

// Start the server
console.log('Socket.IO server launcher starting...');
startServer();
