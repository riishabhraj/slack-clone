#!/usr/bin/env node

// This script is used to build the app for Vercel deployment
console.log('Starting custom Vercel build process...');

// Force disable optimization
process.env.NEXT_DISABLE_OPTIMIZATION = 'true';

// Execute commands in sequence
const { execSync } = require('child_process');

try {
    console.log('Checking environment...');
    execSync('node ./scripts/check-env.js', { stdio: 'inherit' });

    console.log('Generating Prisma client without engine...');
    execSync('node ./scripts/prisma-generate.js', { stdio: 'inherit' });

    console.log('Building Next.js application...');
    execSync('node ./node_modules/.bin/next build', {
        stdio: 'inherit',
        env: {
            ...process.env,
            NEXT_DISABLE_OPTIMIZATION: 'true'
        }
    });

    console.log('Build completed successfully!');
    process.exit(0);
} catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
}
