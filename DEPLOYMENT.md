# Frontend Deployment Guide

## Backend Configuration

Your backend is deployed and running at:
**https://missedtask-backend-2.onrender.com**

### Backend Endpoints

- Health Check: `https://missedtask-backend-2.onrender.com/healthz`
- Test Endpoint: `https://missedtask-backend-2.onrender.com/test`
- API Documentation: `https://missedtask-backend-2.onrender.com/docs`

## Environment Setup

### 1. Environment Variables

The frontend uses the `.env` file to configure the backend API URL:

```bash
REACT_APP_API_BASE_URL=https://missedtask-backend-2.onrender.com
```

This is already configured in `apps/web/.env`.

### 2. Local Development

To run the frontend locally with the deployed backend:

```bash
cd apps/web
npm install
npm start
```

The app will run on `http://localhost:3000` and connect to your deployed backend.

### 3. Production Build

To create a production build:

```bash
cd apps/web
npm run build
```

The optimized production files will be in the `apps/web/build` directory.

## Deployment Options

### Option 1: Netlify

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Deploy:
   ```bash
   cd apps/web
   netlify deploy --prod --dir=build
   ```

### Option 2: Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   cd apps/web
   vercel --prod
   ```

### Option 3: Render (Static Site)

1. Create a new Static Site on Render
2. Connect your GitHub repository
3. Configure:
   - **Build Command**: `cd apps/web && npm install && npm run build`
   - **Publish Directory**: `apps/web/build`
   - **Environment Variables**:
     - `REACT_APP_API_BASE_URL=https://missedtask-backend-2.onrender.com`

### Option 4: GitHub Pages

1. Add homepage to `package.json`:
   ```json
   "homepage": "https://yourusername.github.io/your-repo-name"
   ```

2. Install gh-pages:
   ```bash
   npm install --save-dev gh-pages
   ```

3. Add deploy scripts to `package.json`:
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d build"
   }
   ```

4. Deploy:
   ```bash
   npm run deploy
   ```

## API Configuration

The frontend automatically uses the backend URL from the environment variable:

```typescript
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://missedtask-backend-2.onrender.com';
```

### Testing Backend Connection

You can test the backend connection using curl:

```bash
# Health check
curl https://missedtask-backend-2.onrender.com/healthz

# Test endpoint
curl https://missedtask-backend-2.onrender.com/test
```

## CORS Configuration

The backend should have CORS configured to accept requests from your frontend domain. If you encounter CORS issues after deployment, you may need to update the backend's CORS settings to include your frontend URL.

## Environment Variables for Different Environments

### Development (.env.development)
```bash
REACT_APP_API_BASE_URL=http://localhost:4000
```

### Production (.env.production)
```bash
REACT_APP_API_BASE_URL=https://missedtask-backend-2.onrender.com
```

## Next Steps

1. Choose a deployment platform from the options above
2. Deploy your frontend
3. Update the backend's CORS settings if needed to include your frontend URL
4. Test all functionality after deployment

## Troubleshooting

### CORS Errors
If you see CORS errors in the browser console, the backend needs to be configured to accept requests from your frontend domain.

### API Connection Issues
- Verify the backend is running: `curl https://missedtask-backend-2.onrender.com/healthz`
- Check browser console for error messages
- Verify environment variables are set correctly

### Build Failures
- Clear cache: `rm -rf node_modules package-lock.json && npm install`
- Check Node.js version compatibility
- Review build warnings and errors

## Support

For issues with:
- Backend: Check Render deployment logs
- Frontend: Check browser console and deployment platform logs
