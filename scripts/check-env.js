#!/usr/bin/env node

// This script checks the environment to help diagnose issues
console.log('Checking environment for Prisma installation...');

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check NODE_PATH and PATH
console.log('NODE_PATH:', process.env.NODE_PATH || 'not set');
console.log('PATH:', process.env.PATH);

// Check if we're running in Vercel
console.log('VERCEL:', process.env.VERCEL || 'not set');
console.log('CI:', process.env.CI || 'not set');

// Check node_modules structure
const nodeModulesPath = path.join(process.cwd(), 'node_modules');
console.log(`Checking if ${nodeModulesPath} exists:`, fs.existsSync(nodeModulesPath));

// Check for prisma binary
const prismaBinPath = path.join(nodeModulesPath, '.bin', 'prisma');
console.log(`Checking if ${prismaBinPath} exists:`, fs.existsSync(prismaBinPath));

// Check for prisma package
const prismaPath = path.join(nodeModulesPath, 'prisma');
console.log(`Checking if ${prismaPath} exists:`, fs.existsSync(prismaPath));

// Check for @prisma/client
const prismaClientPath = path.join(nodeModulesPath, '@prisma', 'client');
console.log(`Checking if ${prismaClientPath} exists:`, fs.existsSync(prismaClientPath));

// List .bin directory
try {
  const binPath = path.join(nodeModulesPath, '.bin');
  if (fs.existsSync(binPath)) {
    console.log('\nContents of node_modules/.bin:');
    const binFiles = fs.readdirSync(binPath);
    console.log(binFiles.join(', '));
  }
} catch (error) {
  console.log('Error listing .bin directory:', error.message);
}

// Try to run prisma --version with different methods
console.log('\nAttempting to run prisma --version:');
try {
  const version = execSync('npx prisma --version').toString().trim();
  console.log('Via npx:', version);
} catch (error) {
  console.log('Via npx: Failed -', error.message);
}

try {
  if (fs.existsSync(prismaBinPath)) {
    const version = execSync(`"${prismaBinPath}" --version`).toString().trim();
    console.log('Via direct path:', version);
  } else {
    console.log('Via direct path: Binary not found');
  }
} catch (error) {
  console.log('Via direct path: Failed -', error.message);
}
