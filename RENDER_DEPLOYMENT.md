# Deploying Socket.IO Server to Render.com

## Step 1: Create a Web Service on Render

1. Log in to your Render.com account
2. Click "New" and select "Web Service"
3. Connect your GitHub repository with the Slack Clone project
4. Configure the Web Service:

   - **Name**: slack-clone-socket
   - **Environment**: Node
   - **Region**: Choose the closest to your users
   - **Branch**: main (or your deployment branch)
   - **Build Command**: `npm install`
   - **Start Command**: `node prod-socket-server.js`
   - **Root Directory**: Leave empty to use repository root

## Step 2: Configure Environment Variables

Add the following environment variables in the Render dashboard:

- `NODE_ENV`: `production`
- `PORT`: `10000` (or Render will assign one automatically)
- `CLIENT_URL`: `https://slack-clone-b4hu.vercel.app` (your Vercel app URL)

## Step 3: Deploy

1. Click "Create Web Service"
2. Wait for the deployment to complete
3. Note the URL of your socket server (e.g., https://slack-clone-socket.onrender.com)

## Step 4: Update Client Configuration

1. In your Vercel dashboard, add this environment variable:
   - `NEXT_PUBLIC_SOCKET_URL`: `https://slack-clone-socket.onrender.com` (your Render socket server URL)

2. Redeploy your Next.js application on Vercel

## Troubleshooting

If you encounter CORS errors:

1. Verify that the `CLIENT_URL` on Render matches your Vercel app URL exactly
2. Check that `credentials` is set to `false` in the Socket.IO initialization
3. Ensure your client is connecting without `withCredentials` in production

## Testing the Connection

You can test the connection by visiting your socket server URL in a browser. You should see:
```
Socket.IO server is running. Allowing connection from: https://slack-clone-b4hu.vercel.app
```
