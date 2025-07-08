# Socket.IO Server Deployment Instructions for Render.com

## Prerequisites
- A Render.com account
- Your code pushed to a Git repository (GitHub, GitLab, etc.)

## Setup Instructions for Render.com

### 1. Create a new Web Service
1. Log in to your Render dashboard
2. Click "New" and select "Web Service"
3. Connect to your GitHub/GitLab repository
4. Select the repository containing your Slack Clone

### 2. Configure the Web Service
- **Name**: slack-clone-socket
- **Environment**: Node
- **Region**: Choose the closest to your users
- **Branch**: main (or your preferred branch)
- **Build Command**: `npm install`
- **Start Command**: `npm run start:socket:prod`
- **Instance Type**: Free (for testing) or Basic (for production)

### 3. Add Environment Variables
Add these environment variables in the Render dashboard:
- `NODE_ENV`: `production`
- `PORT`: `10000` (or let Render assign one)
- `ALLOWED_ORIGINS`: `https://slack-clone-b4hu.vercel.app,https://slack-clone.vercel.app` (add all your frontend domains)
- `ENABLE_SOCKET_LOGS`: `false`
- `DEBUG_SOCKETS`: `false`
- `CORS_CREDENTIALS`: `true`

### 4. Deploy the Service
Click "Create Web Service" and wait for the deployment to complete.

### 5. Update Your Frontend Configuration
Make sure your frontend is configured to connect to your Render socket server URL:
- In your Vercel project, add an environment variable:
  - `NEXT_PUBLIC_SOCKET_URL`: `https://slack-clone-socket.onrender.com` (use your actual Render URL)

### Troubleshooting
- If you encounter CORS issues, verify that your ALLOWED_ORIGINS includes all frontend domains
- Check the Render logs for connection errors
- Temporarily enable DEBUG_SOCKETS=true to get more detailed logs

### Notes for Local Development
- Run `npm run dev` for Next.js frontend
- Run `npm run dev:socket` in a separate terminal for the Socket.IO server
- Both should use the .env.local configuration
