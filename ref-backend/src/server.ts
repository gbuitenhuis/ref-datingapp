import cors from 'cors';
import express from 'express';
import { z } from 'zod';
import { store } from './store-supabase.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Serve invite landing page
app.get('/invite', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/invite.html'));
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'ref-backend' });
});

app.post('/auth/register', async (req, res) => {
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

  const result = await store.register(
    parsed.data.email,
    parsed.data.password,
    parsed.data.name ?? '',
    parsed.data.relationshipStatus ?? 'single',
  );
  if (!result) return res.status(409).json({ error: 'Email already exists' });
  return res.status(201).json(result);
});

app.post('/auth/login', async (req, res) => {
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

app.get('/profiles/:userId', async (req, res) => {
  const user = await store.getProfile(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(user);
});

app.put('/profiles/:userId', async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).optional(),
    relationshipStatus: z.enum(['single', 'not-single']).optional(),
    photo: z.string().url().optional(),
    bio: z.string().max(500).optional(),
    age: z.number().int().min(18).max(120).optional(),
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

  const updated = await store.updateProfile(req.params.userId, updateData);
  if (!updated) return res.status(404).json({ error: 'User not found' });
  return res.json(updated);
});

app.get('/discovery/:userId', async (req, res) => {
  const users = await store.getDiscovery(req.params.userId);
  if (!users) return res.status(404).json({ error: 'User not found' });
  return res.json({ items: users });
});

app.post('/swipes', async (req, res) => {
  const schema = z.object({
    fromUserId: z.string().min(1),
    toUserId: z.string().min(1),
    direction: z.enum(['like', 'pass']),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const result = await store.addSwipe(
    parsed.data.fromUserId,
    parsed.data.toUserId,
    parsed.data.direction,
  );
  if ('error' in result) return res.status(404).json(result);
  return res.json(result);
});

app.get('/matches/:userId', async (req, res) => {
  const matches = await store.getMatches(req.params.userId);
  return res.json({ items: matches });
});

app.post('/friends/add', async (req, res) => {
  const schema = z.object({
    userId: z.string().min(1),
    friendId: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const result = await store.addFriend(parsed.data.userId, parsed.data.friendId);
  if ('error' in result) return res.status(400).json(result);
  return res.status(201).json(result);
});

app.get('/friends/:userId', async (req, res) => {
  const friends = await store.getFriends(req.params.userId);
  return res.json({ items: friends });
});

app.post('/push', async (req, res) => {
  const schema = z.object({
    matchmakerId: z.string().min(1),
    person1Id: z.string().min(1),
    person2Id: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const result = await store.createPushMatch(
    parsed.data.matchmakerId,
    parsed.data.person1Id,
    parsed.data.person2Id,
  );
  if ('error' in result) return res.status(400).json(result);
  return res.status(201).json(result);
});

app.post('/pull', async (req, res) => {
  const schema = z.object({
    requesterId: z.string().min(1),
    matchmakerId: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const result = await store.createPullRequest(
    parsed.data.requesterId,
    parsed.data.matchmakerId,
  );
  if ('error' in result) return res.status(400).json(result);
  return res.status(201).json(result);
});

app.get('/chats/:matchId/messages', async (req, res) => {
  const messages = await store.getMessages(req.params.matchId);
  if (!messages) return res.status(404).json({ error: 'Match not found' });
  return res.json({ items: messages });
});

app.post('/chats/:matchId/messages', async (req, res) => {
  const schema = z.object({
    senderId: z.string().min(1),
    text: z.string().min(1).max(1000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const message = await store.addMessage(
    req.params.matchId,
    parsed.data.senderId,
    parsed.data.text,
  );
  if (!message) return res.status(404).json({ error: 'Match not found' });
  return res.status(201).json(message);
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`ref-backend listening on http://localhost:${port}`);
});
