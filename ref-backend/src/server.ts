import cors from 'cors';
import express from 'express';
import { z } from 'zod';
import { store } from './store-supabase.js';
import { supabase } from './supabase.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateToken, createRateLimiter, errorHandler } from './middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT ?? 4000);
const publicReadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 400,
});
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many sign-in attempts, please try again later',
});
const writeLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 120,
});

// Security & public assets
app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json({ limit: '10mb' }));

// Serve invite landing page
app.get('/invite', publicReadLimiter, (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/invite.html'));
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'ref-backend' });
});

app.post('/auth/register', authLimiter, async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1).optional(),
    relationshipStatus: z.enum(['single', 'not-single']).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const result = await store.register(
      parsed.data.email,
      parsed.data.password,
      parsed.data.name ?? '',
      parsed.data.relationshipStatus ?? 'single',
    );
    if (!result) return res.status(409).json({ error: 'Email already exists' });
    return res.status(201).json(result);
  } catch (error) {
    console.error('❌ Registration error:', error);
    return res.status(500).json({ error: 'Registration failed', details: String(error) });
  }
});

app.post('/auth/login', authLimiter, async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const result = await store.login(parsed.data.email, parsed.data.password);
  if (!result) return res.status(401).json({ error: 'Invalid credentials' });
  return res.json(result);
});

app.post('/auth/forgot-password', authLimiter, async (req, res) => {
  const schema = z.object({ email: z.string().email() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid email' });

  // Always return 200 to avoid email enumeration
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.FRONTEND_URL ?? 'https://ref-demo-three.vercel.app'}/auth/reset-password`,
  });
  return res.json({ ok: true });
});

app.delete('/auth/account', writeLimiter, validateToken, async (req, res) => {
  const userId = req.userId!;
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    console.error('❌ Delete account error:', error);
    return res.status(500).json({ error: 'Could not delete account' });
  }
  return res.json({ ok: true });
});

app.get('/profiles/:userId', publicReadLimiter, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const user = await store.getProfile(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(user);
});

app.put('/profiles/:userId', writeLimiter, validateToken, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  // Users can only update their own profile
  if (req.userId !== req.params.userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const schema = z.object({
    name: z.string().min(1).optional(),
    relationshipStatus: z.enum(['single', 'not-single']).optional(),
    photo: z.string().url().optional().nullable(),
    bio: z.string().max(500).optional().nullable(),
    age: z.number().int().min(18).max(120).optional().nullable(),
    gender: z.enum(['man', 'woman', 'non-binary']).optional().nullable(),
    lookingFor: z.enum(['men', 'women', 'everyone']).optional().nullable(),
    phone: z.string().max(30).optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const updateData: any = {};
  if (parsed.data.name) updateData.name = parsed.data.name;
  if (parsed.data.relationshipStatus) updateData.relationship_status = parsed.data.relationshipStatus;
  if (parsed.data.photo) updateData.photo = parsed.data.photo;
  if (parsed.data.bio) updateData.bio = parsed.data.bio;
  if (parsed.data.age) updateData.age = parsed.data.age;
  if (parsed.data.gender) updateData.gender = parsed.data.gender;
  if (parsed.data.lookingFor) updateData.looking_for = parsed.data.lookingFor;
  if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone ?? null;

  const updated = await store.updateProfile(req.params.userId, updateData);
  if (!updated) return res.status(404).json({ error: 'User not found' });
  return res.json(updated);
});

app.get('/discovery/:userId', publicReadLimiter, async (req, res) => {
  const users = await store.getDiscovery(req.params.userId);
  if (!users) return res.status(404).json({ error: 'User not found' });
  return res.json({ items: users });
});

app.post('/swipes', writeLimiter, validateToken, async (req, res) => {
  const schema = z.object({
    fromUserId: z.string().min(1),
    toUserId: z.string().min(1),
    direction: z.enum(['like', 'pass']),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  // Validate the user is swiping as themselves
  if (req.userId !== parsed.data.fromUserId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  if (parsed.data.fromUserId === parsed.data.toUserId) {
    return res.status(400).json({ error: 'Cannot swipe on yourself' });
  }

  const result = await store.addSwipe(
    parsed.data.fromUserId,
    parsed.data.toUserId,
    parsed.data.direction,
  );
  if ('error' in result) return res.status(400).json(result);
  return res.json(result);
});

app.get('/matches/:userId', publicReadLimiter, async (req, res) => {
  const matches = await store.getMatches(req.params.userId);
  return res.json({ items: matches });
});

app.delete('/matches/:matchId', writeLimiter, validateToken, async (req, res) => {
  const result = await store.unmatch(req.params.matchId, req.userId!);
  if ('error' in result) {
    if (result.error === 'Unauthorized') return res.status(403).json(result);
    if (result.error === 'Match not found') return res.status(404).json(result);
    return res.status(400).json(result);
  }
  return res.json(result);
});

app.post('/blocks', writeLimiter, validateToken, async (req, res) => {
  const schema = z.object({ blockedUserId: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const result = await store.blockUser(req.userId!, parsed.data.blockedUserId);
  if ('error' in result) return res.status(400).json(result);
  return res.status(201).json(result);
});

app.delete('/blocks/:blockedUserId', writeLimiter, validateToken, async (req, res) => {
  const result = await store.unblockUser(req.userId!, req.params.blockedUserId);
  return res.json(result);
});

app.get('/blocks', writeLimiter, validateToken, async (req, res) => {
  const ids = await store.getBlockedIds(req.userId!);
  return res.json({ ids });
});

app.post('/friends/find-by-phone', writeLimiter, validateToken, async (req, res) => {
  const schema = z.object({ phone: z.string().min(5).max(30) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await store.findProfileByPhone(parsed.data.phone);
  if (!user) return res.status(404).json({ error: 'No user found with that phone number' });
  return res.json({ user });
});

app.post('/friends/add', writeLimiter, validateToken, async (req, res) => {
  const schema = z.object({
    userId: z.string().min(1),
    friendId: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  // Validate the user is adding friends as themselves
  if (req.userId !== parsed.data.userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const result = await store.addFriend(parsed.data.userId, parsed.data.friendId);
  if ('error' in result) return res.status(400).json(result);
  return res.status(201).json(result);
});

app.post('/friends/request', writeLimiter, validateToken, async (req, res) => {
  const schema = z.object({
    requesterId: z.string().min(1),
    addresseeId: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  if (req.userId !== parsed.data.requesterId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const result = await store.createFriendRequest(
    parsed.data.requesterId,
    parsed.data.addresseeId,
  );
  if ('error' in result) return res.status(400).json(result);
  return res.status(201).json(result);
});

app.get('/friends/requests/:userId', publicReadLimiter, validateToken, async (req, res) => {
  if (req.userId !== req.params.userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const requests = await store.getFriendRequests(req.params.userId);
  return res.json(requests);
});

app.get('/friends/:userId', publicReadLimiter, async (req, res) => {
  const friends = await store.getFriends(req.params.userId);
  return res.json({ items: friends });
});

app.post('/friends/respond', writeLimiter, validateToken, async (req, res) => {
  const schema = z.object({
    requestId: z.string().min(1),
    userId: z.string().min(1),
    action: z.enum(['accept', 'decline']),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  if (req.userId !== parsed.data.userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const result = await store.respondToFriendRequest(
    parsed.data.requestId,
    parsed.data.userId,
    parsed.data.action,
  );
  if ('error' in result) {
    if (result.error === 'Unauthorized') return res.status(403).json(result);
    return res.status(400).json(result);
  }
  return res.json(result);
});

app.post('/reports', writeLimiter, validateToken, async (req, res) => {
  const schema = z.object({
    reporterId: z.string().min(1),
    reportedUserId: z.string().min(1),
    reason: z.enum(['inappropriate_behavior', 'fake_or_spam']),
    details: z.string().max(500).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  if (req.userId !== parsed.data.reporterId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (parsed.data.reporterId === parsed.data.reportedUserId) {
    return res.status(400).json({ error: 'Cannot report yourself' });
  }

  const result = await store.createUserReport({
    reporterId: parsed.data.reporterId,
    reportedUserId: parsed.data.reportedUserId,
    reason: parsed.data.reason,
    details: parsed.data.details,
  });

  if (!result) return res.status(500).json({ error: 'Could not submit report' });
  return res.status(201).json({ report: result });
});

app.post('/push', writeLimiter, validateToken, async (req, res) => {
  const schema = z.object({
    matchmakerId: z.string().min(1),
    person1Id: z.string().min(1),
    person2Id: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  // Validate the matchmaker is the authenticated user
  if (req.userId !== parsed.data.matchmakerId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const result = await store.createPushMatch(
    parsed.data.matchmakerId,
    parsed.data.person1Id,
    parsed.data.person2Id,
  );
  if ('error' in result) return res.status(400).json(result);
  return res.status(201).json(result);
});

app.post('/push/requests', writeLimiter, validateToken, async (req, res) => {
  const schema = z.object({
    matchmakerId: z.string().min(1),
    targetUserId: z.string().min(1),
    candidateIds: z.array(z.string().min(1)).min(1),
    noteToTarget: z.string().max(500).optional().nullable(),
    noteToCandidate: z.string().max(500).optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  if (req.userId !== parsed.data.matchmakerId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const result = await store.createPushRequestThread(
    parsed.data.matchmakerId,
    parsed.data.targetUserId,
    parsed.data.candidateIds,
    parsed.data.noteToTarget ?? undefined,
    parsed.data.noteToCandidate ?? undefined,
  );
  if ('error' in result) return res.status(400).json(result);
  return res.status(201).json(result);
});

app.get('/push/requests/:userId', validateToken, async (req, res) => {
  if (req.userId !== req.params.userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  const result = await store.getPushRequests(req.params.userId);
  return res.json(result);
});

app.get('/push/suggestions/:userId', validateToken, async (req, res) => {
  if (req.userId !== req.params.userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  const result = await store.getPushSuggestions(req.params.userId);
  return res.json(result);
});

app.post('/push/suggestions/respond', validateToken, async (req, res) => {
  const schema = z.object({
    suggestionId: z.string().min(1),
    userId: z.string().min(1),
    action: z.enum(['accept', 'decline']),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  if (req.userId !== parsed.data.userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  const result = await store.respondToPushSuggestion(
    parsed.data.suggestionId,
    parsed.data.userId,
    parsed.data.action,
  );
  if ('error' in result) {
    if (result.error === 'Unauthorized') return res.status(403).json(result);
    return res.status(400).json(result);
  }
  return res.json(result);
});

app.post('/pull', validateToken, async (req, res) => {
  const schema = z.object({
    requesterId: z.string().min(1),
    matchmakerId: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  // Validate the requester is the authenticated user
  if (req.userId !== parsed.data.requesterId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const result = await store.createPullRequest(
    parsed.data.requesterId,
    parsed.data.matchmakerId,
  );
  if ('error' in result) return res.status(400).json(result);
  return res.status(201).json(result);
});

app.get('/pull/requests/:userId', validateToken, async (req, res) => {
  if (req.userId !== req.params.userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const result = await store.getPullRequests(req.params.userId);
  return res.json(result);
});

app.post('/pull/respond', validateToken, async (req, res) => {
  const schema = z.object({
    requestId: z.string().min(1),
    userId: z.string().min(1),
    action: z.enum(['activate', 'complete']),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  if (req.userId !== parsed.data.userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const result = await store.updatePullRequestStatus(
    parsed.data.requestId,
    parsed.data.userId,
    parsed.data.action,
  );
  if ('error' in result) {
    if (result.error === 'Unauthorized') return res.status(403).json(result);
    return res.status(400).json(result);
  }
  return res.json(result);
});

app.post('/pull/suggestions', validateToken, async (req, res) => {
  const schema = z.object({
    pullRequestId: z.string().min(1),
    matchmakerId: z.string().min(1),
    candidateId: z.string().min(1),
    noteToRequester: z.string().max(500).optional(),
    noteToCandidate: z.string().max(500).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  if (req.userId !== parsed.data.matchmakerId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const result = await store.addPullSuggestion(
    parsed.data.pullRequestId,
    parsed.data.matchmakerId,
    parsed.data.candidateId,
    parsed.data.noteToRequester,
    parsed.data.noteToCandidate,
  );
  if ('error' in result) return res.status(400).json(result);
  return res.status(201).json(result);
});

app.get('/pull/suggestions/:userId', validateToken, async (req, res) => {
  if (req.userId !== req.params.userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const result = await store.getPullSuggestions(req.params.userId);
  return res.json(result);
});

app.post('/pull/suggestions/respond', validateToken, async (req, res) => {
  const schema = z.object({
    suggestionId: z.string().min(1),
    userId: z.string().min(1),
    action: z.enum(['accept', 'decline']),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  if (req.userId !== parsed.data.userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const result = await store.respondToPullSuggestion(
    parsed.data.suggestionId,
    parsed.data.userId,
    parsed.data.action,
  );
  if ('error' in result) {
    if (result.error === 'Unauthorized') return res.status(403).json(result);
    return res.status(400).json(result);
  }
  return res.json(result);
});

app.get('/chats/:matchId/messages', async (req, res) => {
  const messages = await store.getMessages(req.params.matchId);
  if (!messages) return res.status(404).json({ error: 'Match not found' });
  return res.json({ items: messages });
});

app.post('/chats/:matchId/messages', validateToken, async (req, res) => {
  const schema = z.object({
    senderId: z.string().min(1),
    text: z.string().min(1).max(1000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  // Validate the sender is the authenticated user
  if (req.userId !== parsed.data.senderId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const message = await store.addMessage(
    req.params.matchId,
    parsed.data.senderId,
    parsed.data.text,
  );
  if (!message) return res.status(404).json({ error: 'Match not found' });
  return res.status(201).json(message);
});

app.post('/upload/photo', writeLimiter, validateToken, async (req, res) => {
  const schema = z.object({
    base64: z.string().min(1),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { base64, mimeType } = parsed.data;
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.byteLength > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'Image must be under 5MB' });
  }

  const ext = mimeType.split('/')[1];
  const fileName = `${req.userId}-${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, buffer, { contentType: mimeType, upsert: true });

  if (error) {
    console.error('Storage upload error:', error);
    return res.status(500).json({ error: 'Could not upload photo' });
  }

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.path);
  return res.json({ url: urlData.publicUrl });
});

app.use(errorHandler);

async function ensureStorageBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === 'avatars');
  if (!exists) {
    await supabase.storage.createBucket('avatars', { public: true, fileSizeLimit: 5242880 });
  }
}

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`ref-backend listening on http://localhost:${port}`);
  void ensureStorageBucket();
});
