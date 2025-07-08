/**
 * Socket.IO server startup script with improved error handling
 * This script starts the Socket.IO server with proper error handling and retries
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Ensure we're in the right directory
const projectRoot = path.resolve(__dirname);
process.chdir(projectRoot);

// Check if we're in production
const isProduction = process.env.NODE_ENV === 'production';
const envFile = isProduction ? '.env.socket.production' : '.env.local';

// Load environment variables
try {
    if (fs.existsSync(path.join(projectRoot, envFile))) {
        console.log(`Loading environment variables from ${envFile}`);
        dotenv.config({ path: path.join(projectRoot, envFile) });
    }
} catch (err) {
    console.warn(`Warning: Could not load ${envFile}:`, err.message);
}

// Handle errors
function handleError(error) {
    console.error('Error starting Socket.IO server:', error);

    // In production, we try once and then exit with error code
    if (isProduction) {
        process.exit(1);
    }

    console.log('Attempting to restart in 3 seconds...');
    // Wait 3 seconds and try again (development only)
    setTimeout(() => {
        startServer();
    }, 3000);
}

// Start the server
function startServer() {
    try {
        console.log(`Starting Socket.IO server in ${isProduction ? 'production' : 'development'} mode...`);

        // Set default port if not provided by environment
        const port = process.env.PORT || (isProduction ? '10000' : '4000');

        // Use execSync to ensure we see all output immediately
        execSync('node server.js', {
            stdio: 'inherit',
            env: {
                ...process.env,
                PORT: port,
                NODE_ENV: isProduction ? 'production' : 'development'
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
console.log(`Socket.IO server launcher starting in ${isProduction ? 'production' : 'development'} mode...`);
startServer();
