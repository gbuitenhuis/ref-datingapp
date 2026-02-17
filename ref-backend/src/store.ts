import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ChatMessage, Match, PublicUser, Swipe, User } from './types.js';

const id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataDir = join(__dirname, '..', '.data');
const dataFile = join(dataDir, 'db.json');

interface DbState {
  users: User[];
  swipes: Swipe[];
  matches: Match[];
  messagesByMatch: Record<string, ChatMessage[]>;
}

const seededUsers: Omit<User, 'id' | 'createdAt' | 'password'>[] = [
  {
    name: 'Sophie',
    email: 'sophie@example.com',
    relationshipStatus: 'single',
    photo:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600',
    bio: 'Love coffee walks and live music.',
    age: 27,
  },
  {
    name: 'Milan',
    email: 'milan@example.com',
    relationshipStatus: 'single',
    photo:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600',
    bio: 'Builder, reader, weekend cyclist.',
    age: 29,
  },
  {
    name: 'Nora',
    email: 'nora@example.com',
    relationshipStatus: 'not-single',
    photo:
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600',
    bio: 'Best wingwoman in town.',
    age: 30,
  },
];

const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  name: user.name,
  relationshipStatus: user.relationshipStatus,
  photo: user.photo,
  bio: user.bio,
  age: user.age,
});

const makeSeedState = (): DbState => {
  const users = seededUsers.map((u) => ({
    id: id(),
    createdAt: new Date().toISOString(),
    password: 'demo123',
    ...u,
  }));
  return {
    users,
    swipes: [],
    matches: [],
    messagesByMatch: {},
  };
};

const loadState = (): DbState => {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (!existsSync(dataFile)) {
    const seed = makeSeedState();
    writeFileSync(dataFile, JSON.stringify(seed, null, 2));
    return seed;
  }

  try {
    const raw = readFileSync(dataFile, 'utf8');
    const parsed = JSON.parse(raw) as DbState;
    if (
      !parsed ||
      !Array.isArray(parsed.users) ||
      !Array.isArray(parsed.swipes) ||
      !Array.isArray(parsed.matches) ||
      typeof parsed.messagesByMatch !== 'object'
    ) {
      const reset = makeSeedState();
      writeFileSync(dataFile, JSON.stringify(reset, null, 2));
      return reset;
    }
    return parsed;
  } catch {
    const reset = makeSeedState();
    writeFileSync(dataFile, JSON.stringify(reset, null, 2));
    return reset;
  }
};

let state = loadState();
const sessions = new Map<string, string>();

const saveState = () => {
  writeFileSync(dataFile, JSON.stringify(state, null, 2));
};

export const store = {
  createUser(input: {
    name: string;
    email: string;
    password: string;
    relationshipStatus: User['relationshipStatus'];
  }) {
    const alreadyExists = state.users.find(
      (u) => u.email.toLowerCase() === input.email.toLowerCase(),
    );
    if (alreadyExists) return null;

    const user: User = {
      id: id(),
      name: input.name,
      email: input.email,
      password: input.password,
      relationshipStatus: input.relationshipStatus,
      createdAt: new Date().toISOString(),
    };
    state = { ...state, users: [...state.users, user] };
    saveState();

    const token = `token-${id()}`;
    sessions.set(token, user.id);
    return { user: toPublicUser(user), token };
  },

  login(email: string, password: string) {
    const user = state.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
    );
    if (!user) return null;

    const token = `token-${id()}`;
    sessions.set(token, user.id);
    return { user: toPublicUser(user), token };
  },

  getUser(userId: string) {
    const user = state.users.find((u) => u.id === userId);
    return user ? toPublicUser(user) : null;
  },

  updateUser(
    userId: string,
    patch: Partial<
      Pick<User, 'name' | 'relationshipStatus' | 'photo' | 'bio' | 'age'>
    >,
  ) {
    const index = state.users.findIndex((u) => u.id === userId);
    if (index < 0) return null;
    const nextUser: User = { ...state.users[index]!, ...patch };
    const users = [...state.users];
    users[index] = nextUser;
    state = { ...state, users };
    saveState();
    return toPublicUser(nextUser);
  },

  getDiscovery(userId: string) {
    const self = state.users.find((u) => u.id === userId);
    if (!self) return null;

    const swipedIds = new Set(
      state.swipes.filter((s) => s.fromUserId === userId).map((s) => s.toUserId),
    );

    return state.users
      .filter((u) => u.id !== userId)
      .filter((u) => u.relationshipStatus === 'single')
      .filter((u) => !swipedIds.has(u.id))
      .map(toPublicUser);
  },

  addSwipe(fromUserId: string, toUserId: string, direction: Swipe['direction']) {
    const from = state.users.find((u) => u.id === fromUserId);
    const to = state.users.find((u) => u.id === toUserId);
    if (!from || !to) return { error: 'User not found' as const };

    const swipe: Swipe = {
      fromUserId,
      toUserId,
      direction,
      createdAt: new Date().toISOString(),
    };
    state = { ...state, swipes: [...state.swipes, swipe] };
    saveState();

    if (direction === 'pass') return { match: null };

    const reverseLike = state.swipes.find(
      (s) =>
        s.fromUserId === toUserId &&
        s.toUserId === fromUserId &&
        s.direction === 'like',
    );
    if (!reverseLike) return { match: null };

    const pair = [fromUserId, toUserId].sort();
    const existing = state.matches.find(
      (m) =>
        m.users.includes(pair[0]!) &&
        m.users.includes(pair[1]!) &&
        m.users.length === 2,
    );
    if (existing) return { match: existing };

    const match: Match = {
      id: id(),
      users: [pair[0]!, pair[1]!],
      createdAt: new Date().toISOString(),
    };
    state = { ...state, matches: [...state.matches, match] };
    if (!state.messagesByMatch[match.id]) {
      state = {
        ...state,
        messagesByMatch: { ...state.messagesByMatch, [match.id]: [] },
      };
    }
    saveState();
    return { match };
  },

  getMatches(userId: string) {
    return state.matches
      .filter((m) => m.users.includes(userId))
      .map((m) => {
        const otherUserId = m.users.find((u) => u !== userId)!;
        const other = state.users.find((u) => u.id === otherUserId)!;
        return {
          ...m,
          otherUser: toPublicUser(other),
        };
      });
  },

  getMessages(matchId: string) {
    return state.messagesByMatch[matchId] ?? null;
  },

  addMessage(matchId: string, senderId: string, text: string) {
    const thread = state.messagesByMatch[matchId];
    if (!thread) return null;
    const message: ChatMessage = {
      id: id(),
      matchId,
      senderId,
      text,
      createdAt: new Date().toISOString(),
    };
    state = {
      ...state,
      messagesByMatch: {
        ...state.messagesByMatch,
        [matchId]: [...thread, message],
      },
    };
    saveState();
    return message;
  },
};
