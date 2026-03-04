# MVP Testing Checklist

## Backend Health Check ✓
- [x] Server starts on port 4000
- [x] `/health` endpoint responds with `{ok: true, service: 'ref-backend'}`
- [x] Rate limiting middleware active
- [x] Error handler configured

## Authentication Flow
- [ ] **Register new user**
  1. Go to http://localhost:8082
  2. Click "Create Account"
  3. Enter email and password (min 6 chars)
  4. Submit - should see welcome screen
  5. Backend should create user in Supabase auth
  6. Backend should return JWT token
  7. Token should be stored in AsyncStorage

- [ ] **Login with existing user**
  1. Logout if needed
  2. Enter credentials from previous registration
  3. Should show dashboard
  4. Token should refresh from AsyncStorage

- [ ] **JWT token validation**
  1. Register user (get token)
  2. Try to update profile
  3. Should include Authorization header: `Bearer <token>`
  4. Backend should validate and allow update

- [ ] **Unauthorized requests**
  1. Clear AsyncStorage (simulate invalid token)
  2. Try to update profile
  3. Should return 401 Unauthorized

## Profile Management
- [ ] **View profile**
  1. After login, navigate to home/profile
  2. Should display:
     - Name
     - Relationship status
     - Age (if set)
     - Bio (if set)
     - Photo (if set)

- [ ] **Update profile**
  1. Click edit profile
  2. Update name, relationship status, age
  3. Submit changes
  4. Changes should persist on refresh
  5. Backend should validate:
     - Age: 18-120
     - Bio: max 500 chars
     - Photo: valid URL

- [ ] **Profile validation errors**
  1. Try to set age < 18 or > 120
  2. Should show error message
  3. Try empty name
  4. Should show error message

## Discovery & Matching
- [ ] **View discovery candidates**
  1. Go to Discover tab
  2. Should show single users
  3. Should not show:
     - Yourself
     - Already swiped on
     - Matches (people you liked who liked back)

- [ ] **Like/Pass on profile**
  1. Click like button
  2. Should move to next profile
  3. Backend should record swipe
  4. Should not re-show same profile

- [ ] **Get matches**
  1. Find another user and both like each other
  2. Go to Matches tab
  3. Should show mutual matches
  4. Should show match creation date

## Friends System
- [ ] **View friends list**
  1. Go to Friends tab
  2. Should show all friends
  3. Each friend should display:
     - Name
     - Photo
     - Relationship status

- [ ] **Add friend**
  1. View a profile from discovery
  2. Click "Add Friend" button
  3. Should add to friends list
  4. Should not appear in discovery anymore

## Matchmaking Features
- [ ] **Push matching (friend makes match)**
  1. As User A, go to Push tab
  2. Select User B and User C
  3. Backend should create match between B and C
  4. B and C should see match in Matches tab

- [ ] **Pull matching (friend requests match)**
  1. As User A, go to Pull tab
  2. Select a friend (matchmaker)
  3. Create request
  4. Matchmaker should see request notification
  5. Matchmaker can approve/decline

## Chat System
- [ ] **View match chat**
  1. Go to Matches tab
  2. Click on a match
  3. Should show conversation history
  4. Should load existing messages

- [ ] **Send message**
  1. In match chat, type message
  2. Click send
  3. Message should appear in chat
  4. Backend should validate:
     - Min 1 character
     - Max 1000 characters

- [ ] **Message validation**
  1. Try sending empty message
  2. Should show error
  3. Try sending 1001+ char message
  4. Should show error

## Error Handling
- [ ] **Network timeout**
  1. Kill backend server
  2. Try to load discovery
  3. Should show timeout error (15 sec)
  4. Restart backend
  5. Should work again

- [ ] **Invalid data**
  1. Try registering with invalid email
  2. Should show validation error
  3. Try registering with <6 char password
  4. Should show validation error

- [ ] **Rate limiting**
  1. Send 101 requests to backend in 15 minutes
  2. 101st request should fail with 429
  3. After 15 minutes, should work again

## Cross-Platform Testing
- [ ] **Web Browser** (http://localhost:8082)
  1. Register and login
  2. Test discovery flow
  3. Send message
  4. Refresh page - session persists

- [ ] **Mobile (via Expo Go)**
  1. Scan QR code from Expo startup
  2. Test same flows as web
  3. Verify AsyncStorage works
  4. Verify camera/image picker (if used)

## Performance
- [ ] **Page load time**
  - Discovery tab: < 2 seconds
  - Matches tab: < 1 second
  - Friends tab: < 1 second

- [ ] **Large data sets**
  1. Create 100+ profiles
  2. Each user should handle:
     - 50+ discovery candidates
     - 20+ matches
     - 30+ friends
     - 100+ messages in chat

## Data Persistence
- [ ] **AsyncStorage**
  1. Login
  2. Quit app
  3. Reopen
  4. Should still be logged in
  5. Logout
  6. Should require login again

- [ ] **Database persistence**
  1. Create profile
  2. Restart backend
  3. Profile still exists
  4. Swipes still recorded
  5. Matches still exist

## Security Testing
- [ ] **Token expiry**
  1. Get JWT token
  2. Wait for expiry (30 days)
  3. Should require login again

- [ ] **Unauthorized access**
  1. Try to update another user's profile
  2. Should return 403 Forbidden

- [ ] **SQL injection attempts**
  1. Try email with: `' OR '1'='1`
  2. Should be safely escaped
  3. Should not expose database errors

- [ ] **XSS attempts**
  1. Try bio with: `<script>alert('xss')</script>`
  2. Should be safely escaped
  3. Should display as text, not execute

## Environmental Variables
- [ ] **Production env**
  1. Verify NODE_ENV=production
  2. Verify JWT_SECRET is set
  3. Verify Supabase keys are correct
  4. Verify CORS is restricted to domain

- [ ] **Development env**
  1. Verify NODE_ENV=development
  2. Verify localhost CORS works
  3. Verify error messages show details

## Deployment Readiness
- [ ] Backend can build: `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] No console warnings in production
- [ ] All environment variables documented
- [ ] Database migrations applied
- [ ] Backup strategy in place
- [ ] Monitoring/logging configured
- [ ] SSL certificate valid
- [ ] API documentation up to date

## Success Criteria
✅ All items checked = **MVP Ready for Global Launch**

After passing all tests:
1. Deploy backend to production
2. Update frontend API_URL
3. Deploy frontend to app stores
4. Set up monitoring
5. Announce public beta
