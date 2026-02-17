# Setting Up Test Profiles

Follow these steps to create test profiles in your Ref dating app:

## Step 1: Create Test Accounts via Registration

Since we're using Supabase Auth, we need to create actual user accounts. You can do this through the app's registration flow.

### Option A: Register through the app (Recommended)
1. Go to http://localhost:8081
2. Click "Sign Up"
3. Register with these test accounts:
   - emma.test@refapp.com / password123
   - noah.test@refapp.com / password123
   - sophie.test@refapp.com / password123
   - lucas.test@refapp.com / password123
   - david.test@refapp.com / password123
   - isabella.test@refapp.com / password123
   - ava.test@refapp.com / password123
   - james.test@refapp.com / password123

4. After registering, complete onboarding with:
   - Name, photo, and relationship status
   - Make some "single" and some "not-single"

### Option B: Use Supabase Admin API (Advanced)
Run this Node.js script in the backend directory:

```bash
cd ref-backend
node create-test-users.js
```

## Step 2: Update Profile Data

After creating accounts, you can update their profiles with more details:

```sql
-- Run in Supabase SQL Editor
-- Update Emma's profile
UPDATE profiles 
SET bio = 'Coffee lover and weekend hiker.', 
    age = 29,
    photo = 'https://i.pravatar.cc/300?img=47'
WHERE email = 'emma.test@refapp.com';

-- Update Sophie's profile
UPDATE profiles 
SET bio = 'Bakes sourdough for fun.', 
    age = 26,
    photo = 'https://i.pravatar.cc/300?img=32'
WHERE email = 'sophie.test@refapp.com';

-- Add more updates for other test users...
```

## Step 3: Verify Test Data

Check that profiles were created:
```sql
SELECT id, name, email, relationship_status, age 
FROM profiles 
WHERE email LIKE '%@refapp.com'
ORDER BY name;
```

## Step 4: Test Discovery Flow

1. Log in as a single user (e.g., sophie.test@refapp.com)
2. Go to the Discover screen
3. You should see other single users who haven't been swiped on yet
4. Swipe right (like) or left (pass) on profiles
5. If two users both swipe right on each other, they'll match!

## Cleanup

To remove all test data:
```sql
-- Delete test profiles (this will cascade to swipes, matches, etc.)
DELETE FROM auth.users WHERE email LIKE '%@refapp.com';
DELETE FROM profiles WHERE email LIKE '%@refapp.com';
```

## Current Status

Right now:
- ✅ Backend endpoints are ready (`/discovery/:userId`, `/swipes`, `/matches/:userId`)
- ✅ Frontend removed mock data dependencies
- ✅ App will load real data from Supabase
- ⚠️ You need to manually create test accounts via registration
- ⚠️ Discover screen needs to be connected to actually display and swipe on profiles

## Next Steps

1. Create 5-10 test accounts with the registration flow
2. Complete their onboarding with realistic data
3. Test the discovery/matching flow
4. We can then make the Discover screen fully functional with swiping!
