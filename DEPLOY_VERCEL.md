# Deploy to Vercel - Step by Step

## Quick Setup (5 minutes)

### Step 1: Login to Vercel
```bash
vercel login
```
This will open your browser to authenticate. Click "Continue" with your email or GitHub account.

### Step 2: Deploy Backend
```bash
cd ref-backend
vercel --prod
```

**When prompted:**
- "Set up and deploy?" → **y**
- "Which scope?" → Select your personal account
- "Link to existing project?" → **n** (create new)
- "Project name?" → `ref-backend` (or any name)
- "Anything else?" → Just press Enter

### Step 3: Set Environment Variables
After deployment, Vercel will give you a URL like: `https://ref-backend-xxx.vercel.app`

Go to: https://vercel.com/dashboard
1. Click your new `ref-backend` project
2. Go to **Settings** → **Environment Variables**
3. Add these variables:
   ```
   JWT_SECRET = (generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   SUPABASE_URL = https://pysrrxjuoaeubtimkgkq.supabase.co
   SUPABASE_ANON_KEY = sb_publishable_qMED8nVlB5i5Wc1zAD1t2w_DiO_M8Cx
   SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   NODE_ENV = production
   RATE_LIMIT_WINDOW_MS = 900000
   RATE_LIMIT_MAX_REQUESTS = 100
   ```

### Step 4: Test Deployment
```bash
curl https://ref-backend-xxx.vercel.app/health
```

Should return: `{"ok":true,"service":"ref-backend"}`

### Step 5: Update Frontend
Edit `/ref-demo/.env.local`:
```
EXPO_PUBLIC_API_URL=https://ref-backend-xxx.vercel.app
```

### Step 6: Redeploy Frontend (Optional for now)
```bash
cd ref-demo
npx eas build --platform all --auto-submit
```

## If You Get Stuck

**"Authentication failed"**
- Run: `vercel logout` then `vercel login` again

**"Build failed"**
- Check: `dist/` folder exists and has `server.js`
- Run locally: `npm run build` then `npm start`

**"Environment variables not found"**
- Verify variables are set in Vercel dashboard
- Redeploy after adding variables: Click "Redeploy" in Vercel dashboard

**"Database connection error"**
- Check Supabase credentials are correct
- Verify `SUPABASE_URL` is accessible from Vercel
- Check Supabase firewall rules

## After Deployment

Your backend is now live! Test it:

```bash
# Health check
curl https://ref-backend-xxx.vercel.app/health

# Register a user
curl -X POST https://ref-backend-xxx.vercel.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test"}'

# Login
curl -X POST https://ref-backend-xxx.vercel.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

## Production Checklist

- [ ] Backend deployed to Vercel
- [ ] Environment variables set (JWT_SECRET, Supabase keys)
- [ ] Health check working
- [ ] Can register new user
- [ ] Can login
- [ ] Frontend updated with new API URL
- [ ] Tested with cURL or Postman
- [ ] Ready for beta users!

## Support

If deployment fails:
1. Check Vercel dashboard logs: https://vercel.com/dashboard
2. Look for error messages in "Deployments" tab
3. Check environment variables are all set
4. Verify backend builds locally: `npm run build && npm start`

---

**Status**: Ready to deploy! 🚀
