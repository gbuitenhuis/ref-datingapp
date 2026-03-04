# Ref Dating App - MVP Quick Start

## Current Status
🚀 **MVP is LIVE and ready for testing**

- Backend: http://localhost:4000
- Frontend (Web): http://localhost:8082
- Database: Supabase PostgreSQL (Cloud)

## What's Implemented

### Core Features
✅ **Authentication**
- Register with email/password
- Secure JWT tokens (30-day expiry)
- Session persistence

✅ **User Profiles**
- Edit profile (name, age, status, bio, photo)
- View other profiles
- Profile validation

✅ **Discovery & Matching**
- Swipe on single users
- Track liked/passed profiles
- Mutual match detection
- Match history

✅ **Friends System**
- Add friends
- View friends list
- Friend profile viewing

✅ **Matchmaking**
- **Push matching**: You match your friends
- **Pull matching**: Friends request matches for you

✅ **Chat**
- Message matches
- Message history
- Message validation

### Security Features
✅ JWT authentication with 30-day expiry
✅ Rate limiting (100 requests per 15 min)
✅ Authorization checks on protected endpoints
✅ Input validation on all endpoints
✅ SQL injection & XSS protection (via Supabase)

## Quick Start

### 1. Start Backend
```bash
cd ref-backend
npm run dev
```
Backend runs on http://localhost:4000

### 2. Start Frontend
```bash
cd ref-demo
EXPO_PUBLIC_API_URL=http://localhost:4000 npx expo start --web
```
Frontend runs on http://localhost:8082

### 3. Test the App

**Browser**: http://localhost:8082

**First User (Register)**:
1. Click "Create Account"
2. Enter email: `user1@example.com`
3. Enter password: `password123`
4. Click Create
5. Complete onboarding (name, age, status)

**Second User (Register)**:
1. Logout (hamburger menu)
2. Click "Create Account"
3. Enter email: `user2@example.com`
4. Enter password: `password123`
5. Complete onboarding

**Test Discovery**:
1. User 1 → Discover tab
2. Should see User 2
3. Click heart (like) or X (pass)
4. Move to next profile

**Test Matching**:
1. User 1 likes User 2
2. User 2 likes User 1
3. Both should see match in "Matches" tab

**Test Chat**:
1. Open match
2. Click message icon
3. Send message
4. Message appears in chat history

**Test Friends**:
1. User 1 Friends tab → Add user from discovery
2. User 1 → Friends tab → Should see User 2

**Test Matchmaking**:
1. Create 3 users total
2. User 1 → Push tab → Select User 2 and 3
3. User 2 and 3 should see match

## API Documentation

### Health Check
```bash
GET /health
→ {ok: true, service: 'ref-backend'}
```

### Authentication
```bash
POST /auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "relationshipStatus": "single"
}
→ {user: {id, name, relationshipStatus, ...}, token: "jwt..."}

POST /auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
→ {user: {...}, token: "jwt..."}
```

### Protected Endpoints (Require JWT)
```bash
# Add Authorization header:
Authorization: Bearer <token>

PUT /profiles/:userId
{
  "name": "Jane",
  "age": 25,
  "bio": "Coffee lover",
  "photo": "https://..."
}

POST /swipes
{
  "fromUserId": "user1",
  "toUserId": "user2",
  "direction": "like" | "pass"
}

POST /friends/add
{
  "userId": "user1",
  "friendId": "user2"
}

POST /push
{
  "matchmakerId": "user1",
  "person1Id": "user2",
  "person2Id": "user3"
}

POST /pull
{
  "requesterId": "user1",
  "matchmakerId": "friend"
}

POST /chats/:matchId/messages
{
  "senderId": "user1",
  "text": "Hey, how are you?"
}
```

### Public Read Endpoints
```bash
GET /profiles/:userId
→ {id, name, age, photo, bio, relationshipStatus}

GET /discovery/:userId
→ {items: [user1, user2, ...]}

GET /matches/:userId
→ {items: [{id, createdAt, otherUser}, ...]}

GET /friends/:userId
→ {items: [friend1, friend2, ...]}

GET /chats/:matchId/messages
→ {items: [message1, message2, ...]}
```

## Environment Setup

### Backend (.env)
```
PORT=4000
NODE_ENV=development
JWT_SECRET=dev-key-change-in-production
SUPABASE_URL=https://pysrrxjuoaeubtimkgkq.supabase.co
SUPABASE_ANON_KEY=sb_publishable_qMED8nVlB5i5Wc1zAD1t2w_DiO_M8Cx
SUPABASE_SERVICE_ROLE_KEY=<service-key>
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (.env.local)
```
EXPO_PUBLIC_API_URL=http://localhost:4000
```

## Troubleshooting

**Backend not starting?**
```bash
# Check if npm packages installed
cd ref-backend
npm install

# Make sure port 4000 is free
lsof -i :4000

# Kill process if needed
kill -9 <pid>
```

**Frontend not connecting to backend?**
```bash
# Check API_URL is set correctly
echo $EXPO_PUBLIC_API_URL

# Test backend health
curl http://localhost:4000/health

# Check browser console for errors
# (Open DevTools: F12)
```

**Can't register new user?**
- Check Supabase connection
- Verify email format is valid
- Password must be 6+ characters
- Check backend logs for errors

**Session not persisting?**
- Check AsyncStorage on device
- Clear app cache: Settings → App → Clear Data
- Check JWT token isn't expired

## Development Tips

### Add Console Logging
In `ref-demo/context/AppContext.tsx`, logs show API calls:
```
API Request: http://localhost:4000/auth/login
API Response: 200 OK
```

### Test with cURL
```bash
# Register
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Get discovery
curl http://localhost:4000/discovery/user-id

# With token
curl http://localhost:4000/profiles/user-id \
  -H "Authorization: Bearer <token>"
```

### Database Inspection
1. Go to https://app.supabase.com
2. Select "ref-datingapp" project
3. View tables: profiles, swipes, matches, friends, messages
4. Check data directly in SQL Editor

## Next Steps

1. **Test all flows** using [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)
2. **Prepare for production** using [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)
3. **Add features**:
   - Real-time chat (WebSocket)
   - Push notifications
   - Image upload
   - Email verification
   - Password reset

## Architecture

```
┌─────────────────────────────────────────┐
│ Frontend (React Native + Expo Router)   │
│ - Authentication                        │
│ - Discovery & Matching UI               │
│ - Chat interface                        │
│ - AsyncStorage for persistence          │
└──────────────┬──────────────────────────┘
               │ HTTP/REST
               ↓
┌─────────────────────────────────────────┐
│ Backend (Express.js)                    │
│ - JWT authentication                    │
│ - Rate limiting                         │
│ - Input validation                      │
│ - Business logic                        │
│ - CORS handling                         │
└──────────────┬──────────────────────────┘
               │ SQL
               ↓
┌─────────────────────────────────────────┐
│ Database (Supabase PostgreSQL)          │
│ - User authentication (Supabase Auth)   │
│ - Profiles, swipes, matches             │
│ - Messages, friends, requests           │
│ - Real-time subscriptions (ready)       │
└─────────────────────────────────────────┘
```

## File Structure

```
ref-backend/
├── src/
│   ├── server.ts          # Express app & routes
│   ├── middleware.ts      # JWT, rate limit, errors
│   ├── store-supabase.ts  # Database operations
│   ├── supabase.ts        # Supabase client
│   └── types.ts           # TypeScript types
└── package.json

ref-demo/
├── app/                   # Expo Router screens
│   ├── _layout.tsx        # Navigation
│   ├── index.tsx          # Home
│   ├── discover.tsx       # Discovery
│   ├── matches.tsx        # Matches
│   ├── friends.tsx        # Friends
│   ├── push.tsx           # Push matching
│   ├── pull.tsx           # Pull matching
│   └── auth/              # Auth screens
├── context/
│   └── AppContext.tsx     # Global state & API
├── types/
│   └── index.ts           # Type definitions
└── package.json
```

## Support & Questions

- Check logs: `npm run dev` (backend) or browser console (frontend)
- Test API: Use cURL or Postman
- Database: Inspect at https://app.supabase.com
- Debug auth: Check AsyncStorage and JWT token in storage

Ready to launch! 🚀
