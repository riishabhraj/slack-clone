// This configuration file helps Vercel understand how to handle Socket.IO
// It's used by Vercel's API routes and deployment process

/**
 * @type {import('next').NextConfig}
 */
module.exports = {
    async headers() {
        return [
            {
                // This header applies to all routes that match this pattern
                source: '/api/socket/:path*',
                headers: [
                    {
                        key: 'Access-Control-Allow-Origin',
                        value: '*',
                    },
                    {
                        key: 'Access-Control-Allow-Methods',
                        value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
                    },
                    {
                        key: 'Access-Control-Allow-Headers',
                        value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
                    },
                    {
                        key: 'Access-Control-Allow-Credentials',
                        value: 'true',
                    },
                ],
            },
        ];
    },
};
