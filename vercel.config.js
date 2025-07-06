// Custom serverless configuration for Vercel
// This is used by Vercel to configure the serverless functions

module.exports = {
    // Customize next.config.js path
    target: 'serverless',
    generateBuildId: async () => {
        // Generate a unique build ID based on timestamp for better cache invalidation
        return `build-${Date.now()}`
    },
    env: {
        // Public environment variables that should be available to the client
        NEXT_PUBLIC_SOCKET_SERVER: process.env.NEXT_PUBLIC_SOCKET_URL || ''
    },
    // Configure headers for CORS
    async headers() {
        return [
            {
                source: '/api/socket/(.*)',
                headers: [
                    { key: 'Access-Control-Allow-Credentials', value: 'true' },
                    { key: 'Access-Control-Allow-Origin', value: '*' },
                    { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
                    { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
                ],
            },
        ]
    }
};
