# Production Deployment Guide for Ref Dating App

## Current State
✅ **Backend improvements completed:**
- JWT authentication implemented
- Rate limiting enabled (100 requests per 15 minutes)
- Authorization checks on protected endpoints
- Error handling with proper HTTP status codes
- Environment configuration support

✅ **Frontend updated:**
- Automatic JWT token attachment to protected endpoints
- Token persistence with AsyncStorage
- Secure session management

## Deployment Steps to Production

### 1. Environment Setup

Create a `.env` file in `ref-backend/` with these variables:
```bash
NODE_ENV=production
PORT=4000
JWT_SECRET=<generate-a-strong-random-string>
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-key>
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**⚠️ IMPORTANT:** 
- Generate a strong JWT_SECRET using: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Never commit `.env` to version control
- Use different secrets for dev/staging/production

### 2. Build Backend for Production

```bash
cd ref-backend
npm run build
```

This creates `/dist` folder with compiled JavaScript.

### 3. Deploy Backend

**Option A: Vercel (Recommended for Node.js)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd ref-backend
vercel --prod
```

**Option B: Railway.app**
1. Push code to GitHub
2. Connect repository at railway.app
3. Set environment variables in dashboard
4. Deploy automatically on push

**Option C: DigitalOcean App Platform**
1. Connect GitHub repository
2. Select `Node.js` runtime
3. Set environment variables
4. Deploy

**Option D: AWS/GCP/Azure**
Use containerized deployment with Docker:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 4000
CMD ["node", "dist/server.js"]
```

### 4. Update Frontend API URL

In `ref-demo/.env.local`:
```
EXPO_PUBLIC_API_URL=https://your-production-api.com
```

Then rebuild and deploy:
```bash
cd ref-demo
npx eas build --platform all --auto-submit
```

### 5. Database Migration (If Needed)

Supabase PostgreSQL is already configured. To add new tables/columns:

1. Update schema in Supabase dashboard or use migrations
2. Run: `npx supabase db pull` to sync local schema
3. Create migration: `npx supabase migration new <name>`
4. Deploy: `npx supabase db push`

## Security Checklist

- [ ] JWT_SECRET is strong and random
- [ ] All environment variables are set in production
- [ ] CORS is properly configured for your domain
- [ ] Rate limiting is enabled (current: 100 requests/15min)
- [ ] HTTPS is enforced
- [ ] Database has automatic backups enabled
- [ ] Monitor error logs regularly
- [ ] Set up health check: `GET /health`
- [ ] Enable Supabase Row Level Security (RLS) policies
- [ ] Implement request logging for audit trails

## Scaling for Global Users

### Performance Optimization
1. **CDN for static assets** - Use Cloudflare or similar
2. **Database indexing** - Add indexes on frequently queried fields:
   ```sql
   CREATE INDEX idx_profiles_relationship_status ON profiles(relationship_status);
   CREATE INDEX idx_swipes_from_user_id ON swipes(from_user_id);
   CREATE INDEX idx_matches_user1_id ON matches(user1_id);
   ```

3. **Caching** - Add Redis for session tokens:
   ```typescript
   // Example: Cache profiles for 5 minutes
   const CACHE_TTL = 300;
   const cache = new Map();
   ```

4. **Database replication** - Use Supabase's automatic replication for multi-region

### Regional Deployment
1. **Primary region** - Keep main backend near your database
2. **Edge functions** - Use Vercel Edge Functions for lightweight endpoints
3. **Content delivery** - Serve images from CDN

### Monitoring & Alerts
Set up monitoring with:
- **Sentry.io** for error tracking
- **Datadog** or **New Relic** for performance
- **PagerDuty** for on-call alerts

## API Endpoints Summary

### Auth (Public)
- `POST /auth/register` - Create account
- `POST /auth/login` - Sign in
- `GET /health` - Health check

### Protected Endpoints (Require JWT)
- `PUT /profiles/:userId` - Update profile
- `POST /swipes` - Record swipe
- `POST /friends/add` - Add friend
- `POST /push` - Create match for friends
- `POST /pull` - Request match from friend
- `POST /chats/:matchId/messages` - Send message

### Public Read Endpoints
- `GET /profiles/:userId` - Get user profile
- `GET /discovery/:userId` - Get discovery candidates
- `GET /matches/:userId` - Get matches
- `GET /friends/:userId` - Get friends
- `GET /chats/:matchId/messages` - Get match messages

## Testing Production

```bash
# Test health check
curl https://your-api.com/health

# Test registration
curl -X POST https://your-api.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}'

# Test with JWT
curl https://your-api.com/profiles/user-id \
  -H "Authorization: Bearer <token>"

# Test rate limiting (send 101 requests in 15 minutes)
for i in {1..101}; do curl https://your-api.com/health; done
```

## Troubleshooting

### Backend not responding
```bash
# Check if service is running
curl https://your-api.com/health

# Check logs
vercel logs --tail  # if using Vercel
railway logs        # if using Railway
```

### JWT token errors
- Ensure JWT_SECRET matches between environments
- Check token expiry (set to 30 days currently)
- Verify Authorization header format: `Bearer <token>`

### Database connection issues
- Verify Supabase credentials in .env
- Check network connectivity
- Enable Supabase firewall rules if needed

### Rate limiting too strict
Adjust in `.env`:
```
RATE_LIMIT_WINDOW_MS=1800000  # 30 minutes
RATE_LIMIT_MAX_REQUESTS=500    # 500 requests
```

## Next Steps (Future)

1. **Add WebSocket support** for real-time chat
2. **Implement push notifications** with Firebase Cloud Messaging
3. **Add image upload** to Supabase Storage
4. **Enable email verification** for security
5. **Implement password reset** flow
6. **Add analytics** to track user behavior
7. **Set up A/B testing** for features
8. **Implement social features** (share matches, etc.)

## Support
For production issues:
1. Check Supabase status: https://status.supabase.com
2. Review backend logs in your deployment platform
3. Check frontend errors in browser console
4. Test API with curl/Postman
