#!/usr/bin/env node

// This script ensures prisma generate runs properly
console.log('Running Prisma generate script...');

const { execSync } = require('child_process');

try {
    // Use our custom prisma wrapper script
    console.log('Running prisma generate via custom wrapper...');
    execSync('node ./scripts/prisma.js generate --no-engine', { stdio: 'inherit' });

    console.log('Prisma client generated successfully');
} catch (error) {
    console.error('Failed to generate Prisma client:', error);
    process.exit(1);
}
