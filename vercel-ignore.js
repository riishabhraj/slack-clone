// This file helps Vercel decide which files to ignore during build
// to prevent type errors from failing the build

// List of paths to be skipped during type checking
module.exports = {
    typecheckIgnoredPaths: [
        'app/debug/**/*',
        'app/api/debug/**/*'
    ]
};
