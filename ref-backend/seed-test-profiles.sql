-- Seed test profiles for the Ref dating app
-- Run this in Supabase SQL Editor to create test users

-- First, we need to create auth users (this creates entries in auth.users table)
-- Note: In production, you'd use the Supabase admin API to create these
-- For now, these are placeholder user IDs that match what we'll create

-- Insert test profiles
INSERT INTO public.profiles (id, email, name, photo, bio, age, relationship_status, created_at, updated_at)
VALUES
  -- Test User 1: Emma (not single, matchmaker)
  (gen_random_uuid(), 'emma.test@refapp.com', 'Emma', 'https://i.pravatar.cc/300?img=47', 'Coffee lover and weekend hiker.', 29, 'not-single', now(), now()),
  
  -- Test User 2: Noah (not single, matchmaker)
  (gen_random_uuid(), 'noah.test@refapp.com', 'Noah', 'https://i.pravatar.cc/300?img=12', 'Matchmaker-in-chief.', 31, 'not-single', now(), now()),
  
  -- Test User 3: Mia (not single, matchmaker)
  (gen_random_uuid(), 'mia.test@refapp.com', 'Mia', 'https://i.pravatar.cc/300?img=8', 'Writes poems. Loves dogs.', 27, 'not-single', now(), now()),
  
  -- Test User 4: Sophie (single, looking for match)
  (gen_random_uuid(), 'sophie.test@refapp.com', 'Sophie', 'https://i.pravatar.cc/300?img=32', 'Bakes sourdough for fun.', 26, 'single', now(), now()),
  
  -- Test User 5: Lucas (single, looking for match)
  (gen_random_uuid(), 'lucas.test@refapp.com', 'Lucas', 'https://i.pravatar.cc/300?img=15', 'Live music every Friday.', 28, 'single', now(), now()),
  
  -- Test User 6: David (single, looking for match)
  (gen_random_uuid(), 'david.test@refapp.com', 'David', 'https://i.pravatar.cc/300?img=56', 'Always down for ramen.', 30, 'single', now(), now()),
  
  -- Test User 7: Isabella (single, looking for match)
  (gen_random_uuid(), 'isabella.test@refapp.com', 'Isabella', 'https://i.pravatar.cc/300?img=65', 'Architect. Loves art galleries.', 27, 'single', now(), now()),
  
  -- Test User 8: Oliver (not single, matchmaker)
  (gen_random_uuid(), 'oliver.test@refapp.com', 'Oliver', 'https://i.pravatar.cc/300?img=70', 'Cyclist and espresso nerd.', 32, 'not-single', now(), now()),
  
  -- Test User 9: Ava (single, looking for match)
  (gen_random_uuid(), 'ava.test@refapp.com', 'Ava', 'https://i.pravatar.cc/300?img=22', 'Sunrise runs and matcha.', 26, 'single', now(), now()),
  
  -- Test User 10: James (single, looking for match)
  (gen_random_uuid(), 'james.test@refapp.com', 'James', 'https://i.pravatar.cc/300?img=38', 'Photographer. Loves road trips.', 29, 'single', now(), now()),
  
  -- Test User 11: Charlotte (single, looking for match)
  (gen_random_uuid(), 'charlotte.test@refapp.com', 'Charlotte', 'https://i.pravatar.cc/300?img=44', 'Yoga, tea, and good books.', 28, 'single', now(), now()),
  
  -- Test User 12: William (single, looking for match)
  (gen_random_uuid(), 'william.test@refapp.com', 'William', 'https://i.pravatar.cc/300?img=6', 'Sunday brunch professional.', 30, 'single', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Create a view to easily see test profiles
CREATE OR REPLACE VIEW test_profiles AS
SELECT 
  id,
  name,
  email,
  relationship_status,
  age,
  bio,
  created_at
FROM public.profiles
WHERE email LIKE '%@refapp.com'
ORDER BY name;

-- Query to see all test profiles
-- SELECT * FROM test_profiles;

-- To delete all test data later:
-- DELETE FROM public.profiles WHERE email LIKE '%@refapp.com';
