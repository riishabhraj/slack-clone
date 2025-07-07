#!/usr/bin/env node

// This script is used to build the Next.js app without using critters for CSS optimization
process.env.NEXT_DISABLE_OPTIMIZATION = 'true';

// Load and run the standard build script from Next.js
require('next/dist/bin/next');
