#!/usr/bin/env node

// A simple wrapper script for running prisma commands
// This allows us to have better control over how Prisma is executed

const path = require('path');
const { spawnSync } = require('child_process');

// Get arguments passed to this script
const args = process.argv.slice(2);

// Try multiple methods to run prisma
const methods = [
  // Method 0: Use globally installed Prisma CLI
  () => {
    return spawnSync('prisma', args, { stdio: 'inherit' });
  },

  // Method 1: Use the prisma bin directly
  () => {
    const prismaBin = path.join(process.cwd(), 'node_modules', '.bin', 'prisma');
    return spawnSync(prismaBin, args, { stdio: 'inherit' });
  },

  // Method 2: Use node to execute prisma
  () => {
    const prismaBin = path.join(process.cwd(), 'node_modules', '.bin', 'prisma');
    return spawnSync('node', [prismaBin, ...args], { stdio: 'inherit' });
  },

  // Method 3: Use npx
  () => {
    return spawnSync('npx', ['prisma', ...args], { stdio: 'inherit' });
  },

  // Method 4: Try to find prisma/index.js
  () => {
    const prismaIndex = path.join(process.cwd(), 'node_modules', 'prisma', 'index.js');
    return spawnSync('node', [prismaIndex, ...args], { stdio: 'inherit' });
  }
];

// Try each method until one succeeds
let success = false;
for (const method of methods) {
  try {
    console.log(`Trying method ${methods.indexOf(method) + 1} to run prisma...`);
    const result = method();
    if (result.status === 0) {
      success = true;
      break;
    }
  } catch (err) {
    console.error(`Method ${methods.indexOf(method) + 1} failed:`, err.message);
  }
}

if (!success) {
  console.error('All methods to run prisma failed');
  process.exit(1);
}
