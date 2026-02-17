/**
 * Script to create test users for the Ref dating app
 * Run with: node create-test-users.js
 */

const testUsers = [
  {
    email: 'emma.test@refapp.com',
    password: 'password123',
    name: 'Emma',
    photo: 'https://i.pravatar.cc/300?img=47',
    bio: 'Coffee lover and weekend hiker.',
    age: 29,
    relationshipStatus: 'not-single'
  },
  {
    email: 'noah.test@refapp.com',
    password: 'password123',
    name: 'Noah',
    photo: 'https://i.pravatar.cc/300?img=12',
    bio: 'Matchmaker-in-chief.',
    age: 31,
    relationshipStatus: 'not-single'
  },
  {
    email: 'sophie.test@refapp.com',
    password: 'password123',
    name: 'Sophie',
    photo: 'https://i.pravatar.cc/300?img=32',
    bio: 'Bakes sourdough for fun.',
    age: 26,
    relationshipStatus: 'single'
  },
  {
    email: 'lucas.test@refapp.com',
    password: 'password123',
    name: 'Lucas',
    photo: 'https://i.pravatar.cc/300?img=15',
    bio: 'Live music every Friday.',
    age: 28,
    relationshipStatus: 'single'
  },
  {
    email: 'david.test@refapp.com',
    password: 'password123',
    name: 'David',
    photo: 'https://i.pravatar.cc/300?img=56',
    bio: 'Always down for ramen.',
    age: 30,
    relationshipStatus: 'single'
  },
  {
    email: 'isabella.test@refapp.com',
    password: 'password123',
    name: 'Isabella',
    photo: 'https://i.pravatar.cc/300?img=65',
    bio: 'Architect. Loves art galleries.',
    age: 27,
    relationshipStatus: 'single'
  },
  {
    email: 'ava.test@refapp.com',
    password: 'password123',
    name: 'Ava',
    photo: 'https://i.pravatar.cc/300?img=22',
    bio: 'Sunrise runs and matcha.',
    age: 26,
    relationshipStatus: 'single'
  },
  {
    email: 'james.test@refapp.com',
    password: 'password123',
    name: 'James',
    photo: 'https://i.pravatar.cc/300?img=38',
    bio: 'Photographer. Loves road trips.',
    age: 29,
    relationshipStatus: 'single'
  }
];

async function createTestUsers() {
  console.log('Creating test users...\n');
  
  for (const user of testUsers) {
    try {
      // Register the user
      const registerResponse = await fetch('http://localhost:4000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
          name: user.name,
          relationshipStatus: user.relationshipStatus
        })
      });

      if (!registerResponse.ok) {
        const error = await registerResponse.json();
        console.log(`❌ ${user.name}: ${error.error || 'Registration failed'}`);
        continue;
      }

      const registerResult = await registerResponse.json();
      const userId = registerResult?.user?.id;

      if (!userId) {
        console.log(`⚠️  ${user.name} created but user id missing`);
        continue;
      }

      // Update profile with additional details
      const updateResponse = await fetch(`http://localhost:4000/profiles/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo: user.photo,
          bio: user.bio,
          age: user.age
        })
      });

      if (updateResponse.ok) {
        console.log(`✅ ${user.name} (${user.email}) - ${user.relationshipStatus}`);
      } else {
        console.log(`⚠️  ${user.name} created but profile update failed`);
      }

    } catch (error) {
      console.log(`❌ ${user.name}: ${error.message}`);
    }
  }

  console.log('\n✨ Test user creation complete!');
  console.log('You can now log in with any of these accounts.');
  console.log('Password for all accounts: password123');
}

// Check if backend is running
async function checkBackend() {
  try {
    const response = await fetch('http://localhost:4000/health');
    if (response.ok) {
      return true;
    }
  } catch (error) {
    return false;
  }
  return false;
}

// Main execution
(async () => {
  const backendRunning = await checkBackend();
  
  if (!backendRunning) {
    console.error('❌ Backend is not running on http://localhost:4000');
    console.error('Please start the backend first with: npm run dev');
    process.exit(1);
  }

  await createTestUsers();
})();
