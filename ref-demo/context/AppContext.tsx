import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Friend,
  FriendRequest,
  Match,
  PullRequest,
  PushRequest,
  User,
  RelationshipStatus,
} from '@/types';

interface AppContextValue {
  currentUser: User | null;
  isOnboarded: boolean;
  isAuthLoading: boolean;
  friends: Friend[];
  matches: Match[];
  pushRequests: PushRequest[];
  pullRequests: PullRequest[];
  friendRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  suggestedFriends: Friend[];
  refreshFriends: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  completeOnboarding: (user: User) => void;
  addFriend: (friend: Friend) => void;
  createPushRequest: (person1: User, person2: User) => void;
  createPullRequest: (matchmaker: User) => void;
  likeMatch: (matchId: string) => void;
  passMatch: (matchId: string) => void;
  sendFriendRequest: (toUser: User) => void;
  acceptFriendRequest: (requestId: string) => void;
  declineFriendRequest: (requestId: string) => void;
  areFriends: (userId: string) => boolean;
  isRequestPending: (userId: string) => boolean;
  getFriendById: (friendId: string) => Friend | undefined;
}

const AppContextState = createContext<AppContextValue | null>(null);

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random()}`;
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
const AUTH_TOKEN_KEY = '@ref_auth_token';
const USER_ID_KEY = '@ref_user_id';

const SYSTEM_MATCHMAKER: User = {
  id: 'ref-system',
  name: 'Ref',
  photo: '',
  relationshipStatus: 'not-single',
};

interface ApiPublicUser {
  id: string;
  name: string;
  relationshipStatus: 'single' | 'not-single';
  photo?: string;
  bio?: string;
  age?: number;
}

interface ApiMatchItem {
  id: string;
  createdAt: string;
  otherUser: ApiPublicUser;
}

const toUser = (apiUser: ApiPublicUser): User => ({
  id: apiUser.id,
  name: apiUser.name,
  relationshipStatus: apiUser.relationshipStatus,
  photo: apiUser.photo ?? '',
  bio: apiUser.bio,
  age: apiUser.age,
});

const isProfileComplete = (user: User) =>
  Boolean(user.name?.trim()) &&
  Boolean(user.relationshipStatus);

export const AppContext = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [pushRequests, setPushRequests] = useState<PushRequest[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);

  const apiRequest = async <T,>(
    path: string,
    options?: RequestInit,
  ): Promise<T | null> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      console.log(`API Request: ${API_BASE_URL}${path}`);
      const response = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers ?? {}),
        },
        ...options,
        signal: controller.signal,
      });
      console.log(`API Response: ${response.status} ${response.statusText}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error: ${errorText}`);
        return null;
      }
      return (await response.json()) as T;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        console.error('API Request Timed Out');
      } else {
        console.error(`API Request Failed:`, error);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const refreshFriends = async (user?: User) => {
    const targetUser = user ?? currentUser;
    if (!targetUser) return;

    const result = await apiRequest<{ items: ApiPublicUser[] }>(
      `/friends/${targetUser.id}`,
    );

    if (!result) return;

    setFriends(
      (result.items ?? []).map((item) => ({
        ...toUser(item),
        mutualFriendsCount: 0,
        friendsOfFriend: [],
      })),
    );
  };

  const loadStoredSession = async () => {
    try {
      const [storedUserId, storedToken] = await Promise.all([
        AsyncStorage.getItem(USER_ID_KEY),
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
      ]);

      if (storedUserId && storedToken) {
        const profile = await apiRequest<ApiPublicUser>(
          `/profiles/${storedUserId}`,
        );

        if (profile) {
          const user = toUser(profile);
          setCurrentUser(user);
          setIsOnboarded(isProfileComplete(user));
          await Promise.all([
            syncDiscoveryAndMatches(user),
            refreshFriends(user),
          ]);
        } else {
          await clearStoredSession();
        }
      }
    } catch (error) {
      console.error('Failed to load stored session:', error);
      await clearStoredSession();
    } finally {
      setIsAuthLoading(false);
    }
  };

  const clearStoredSession = async () => {
    await Promise.all([
      AsyncStorage.removeItem(USER_ID_KEY),
      AsyncStorage.removeItem(AUTH_TOKEN_KEY),
    ]);
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await apiRequest<{ user: ApiPublicUser; token: string }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        },
      );

      if (!result) return false;

      const user = toUser(result.user);
      setCurrentUser(user);
      setIsOnboarded(isProfileComplete(user));

      await Promise.all([
        AsyncStorage.setItem(USER_ID_KEY, user.id),
        AsyncStorage.setItem(AUTH_TOKEN_KEY, result.token),
      ]);

      await Promise.all([
        syncDiscoveryAndMatches(user),
        refreshFriends(user),
      ]);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (
    email: string,
    password: string,
  ): Promise<boolean> => {
    try {
      const result = await apiRequest<{ user: ApiPublicUser; token: string }>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        },
      );

      if (!result) return false;

      const user = toUser(result.user);
      setCurrentUser(user);
      setIsOnboarded(false); // Always false for new registrations

      await Promise.all([
        AsyncStorage.setItem(USER_ID_KEY, user.id),
        AsyncStorage.setItem(AUTH_TOKEN_KEY, result.token),
      ]);

      return true;
    } catch (error) {
      console.error('Register error:', error);
      return false;
    }
  };

  const logout = async () => {
    await clearStoredSession();
    setCurrentUser(null);
    setIsOnboarded(false);
    setMatches([]);
    setPushRequests([]);
    setPullRequests([]);
  };

  const syncDiscoveryAndMatches = async (user: User) => {
    const [discoveryResult, matchesResult] = await Promise.all([
      apiRequest<{ items: ApiPublicUser[] }>(`/discovery/${user.id}`),
      apiRequest<{ items: ApiMatchItem[] }>(`/matches/${user.id}`),
    ]);

    if (!discoveryResult && !matchesResult) return;

    const pendingMatches: Match[] = (discoveryResult?.items ?? []).map((item) => ({
      id: `discovery-${item.id}`,
      user: toUser(item),
      matchedBy: SYSTEM_MATCHMAKER,
      status: 'pending',
      createdAt: new Date(),
    }));

    const confirmedMatches: Match[] = (matchesResult?.items ?? []).map((item) => ({
      id: item.id,
      user: toUser(item.otherUser),
      matchedBy: SYSTEM_MATCHMAKER,
      status: 'matched',
      createdAt: new Date(item.createdAt),
    }));

    setMatches([...confirmedMatches, ...pendingMatches]);
  };


  const completeOnboarding = (user: User) => {
    if (!currentUser) return;

    const updatedUser: User = {
      ...currentUser,
      ...user,
    };

    setCurrentUser(updatedUser);
    setIsOnboarded(isProfileComplete(updatedUser));

    void (async () => {
      const photoPayload = updatedUser.photo?.startsWith('http')
        ? { photo: updatedUser.photo }
        : {};

      await apiRequest(`/profiles/${currentUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: updatedUser.name,
          relationshipStatus: updatedUser.relationshipStatus,
          ...photoPayload,
        }),
      });

      await syncDiscoveryAndMatches(updatedUser);
    })();
  };

  const addFriend = (friend: Friend) => {
    setFriends((prev) => [...prev, friend]);
  };

  const createPushRequest = (person1: User, person2: User) => {
    if (!currentUser) return;

    void (async () => {
      const result = await apiRequest<{ match: { id: string } }>(
        '/push',
        {
          method: 'POST',
          body: JSON.stringify({
            matchmakerId: currentUser.id,
            person1Id: person1.id,
            person2Id: person2.id,
          }),
        },
      );

      if (!result) return;

      const pushRequest: PushRequest = {
        id: makeId('push'),
        matchmaker: currentUser,
        person1,
        person2,
        status: 'completed',
        createdAt: new Date(),
      };

      setPushRequests((prev) => [...prev, pushRequest]);
      await syncDiscoveryAndMatches(currentUser);
    })();
  };

  const createPullRequest = (matchmaker: User) => {
    if (!currentUser) return;

    void (async () => {
      const result = await apiRequest<{ pullRequest: { id: string } }>(
        '/pull',
        {
          method: 'POST',
          body: JSON.stringify({
            requesterId: currentUser.id,
            matchmakerId: matchmaker.id,
          }),
        },
      );

      if (!result) return;

      const pullRequest: PullRequest = {
        id: result.pullRequest.id,
        requester: currentUser,
        matchmaker,
        suggestions: [],
        status: 'pending',
        createdAt: new Date(),
      };

      setPullRequests((prev) => [...prev, pullRequest]);
    })();
  };

  const likeMatch = (matchId: string) => {
    const currentMatch = matches.find((match) => match.id === matchId);
    if (!currentMatch || !currentUser) return;

    setMatches((prev) =>
      prev.map((match) =>
        match.id === matchId ? { ...match, status: 'liked' } : match,
      ),
    );

    void (async () => {
      const result = await apiRequest<{ match: { id: string } | null }>(
        '/swipes',
        {
          method: 'POST',
          body: JSON.stringify({
            fromUserId: currentUser.id,
            toUserId: currentMatch.user.id,
            direction: 'like',
          }),
        },
      );

      if (result?.match) {
        setMatches((prev) =>
          prev.map((match) =>
            match.id === matchId
              ? {
                  ...match,
                  id: result.match!.id,
                  status: 'matched',
                }
              : match,
          ),
        );
        return;
      }

      await syncDiscoveryAndMatches(currentUser);
    })();
  };

  const passMatch = (matchId: string) => {
    const currentMatch = matches.find((match) => match.id === matchId);
    if (!currentMatch || !currentUser) return;

    setMatches((prev) =>
      prev.map((match) =>
        match.id === matchId ? { ...match, status: 'passed' } : match,
      ),
    );

    void apiRequest('/swipes', {
      method: 'POST',
      body: JSON.stringify({
        fromUserId: currentUser.id,
        toUserId: currentMatch.user.id,
        direction: 'pass',
      }),
    });
  };

  const sendFriendRequest = (toUser: User) => {
    if (!currentUser) return;

    const request: FriendRequest = {
      id: makeId('request'),
      from: currentUser,
      to: toUser,
      status: 'pending',
      createdAt: new Date(),
    };

    setOutgoingRequests((prev) => [...prev, request]);
  };

  const acceptFriendRequest = (requestId: string) => {
    const request = friendRequests.find((req) => req.id === requestId);
    if (!request) return;

    const newFriend: Friend = {
      ...request.from,
      mutualFriendsCount: randomInt(1, 5),
      friendsOfFriend: [],
    };

    setFriends((prev) => [...prev, newFriend]);
    setFriendRequests((prev) =>
      prev.map((req) =>
        req.id === requestId ? { ...req, status: 'accepted' } : req,
      ),
    );
  };

  const declineFriendRequest = (requestId: string) => {
    setFriendRequests((prev) =>
      prev.map((req) =>
        req.id === requestId ? { ...req, status: 'declined' } : req,
      ),
    );
  };

  const areFriends = (userId: string) =>
    friends.some((friend) => friend.id === userId);

  const isRequestPending = (userId: string) =>
    outgoingRequests.some(
      (request) => request.to.id === userId && request.status === 'pending',
    );

  const getFriendById = (friendId: string) =>
    friends.find((friend) => friend.id === friendId);

  const suggestedFriends = useMemo(() => {
    if (friends.length < 3) return [];

    const existingFriendIds = new Set(friends.map((friend) => friend.id));
    const incomingRequestIds = new Set(
      friendRequests
        .filter((req) => req.status === 'pending')
        .map((req) => req.from.id),
    );
    const outgoingRequestIds = new Set(
      outgoingRequests
        .filter((req) => req.status === 'pending')
        .map((req) => req.to.id),
    );

    const map = new Map<string, { user: User; mutualCount: number }>();

    friends.forEach((friend) => {
      friend.friendsOfFriend?.forEach((user) => {
        if (
          !currentUser ||
          user.id === currentUser.id ||
          existingFriendIds.has(user.id) ||
          incomingRequestIds.has(user.id) ||
          outgoingRequestIds.has(user.id)
        ) {
          return;
        }

        const entry = map.get(user.id);
        if (entry) {
          entry.mutualCount += 1;
        } else {
          map.set(user.id, { user, mutualCount: 1 });
        }
      });
    });

    return Array.from(map.values())
      .filter((entry) => entry.mutualCount >= 2)
      .sort((a, b) => b.mutualCount - a.mutualCount)
      .slice(0, 25)
      .map((entry) => ({
        ...entry.user,
        mutualFriendsCount: entry.mutualCount,
      }));
  }, [currentUser, friends, friendRequests, outgoingRequests]);

  const pendingFriendRequests = friendRequests.filter(
    (request) => request.status === 'pending',
  );
  const pendingOutgoingRequests = outgoingRequests.filter(
    (request) => request.status === 'pending',
  );

  useEffect(() => {
    void loadStoredSession();
  }, []);

  useEffect(() => {
    if (!currentUser || currentUser.id.startsWith('local-')) return;
    void syncDiscoveryAndMatches(currentUser);
  }, [currentUser]);

  const value = useMemo(
    () => ({
      currentUser,
      isOnboarded,
      isAuthLoading,
      friends,
      matches,
      pushRequests,
      pullRequests,
      friendRequests: pendingFriendRequests,
      outgoingRequests: pendingOutgoingRequests,
      suggestedFriends,
      refreshFriends: () => refreshFriends(),
      login,
      register,
      logout,
      completeOnboarding,
      addFriend,
      createPushRequest,
      createPullRequest,
      likeMatch,
      passMatch,
      sendFriendRequest,
      acceptFriendRequest,
      declineFriendRequest,
      areFriends,
      isRequestPending,
      getFriendById,
    }),
    [
      currentUser,
      isOnboarded,
      isAuthLoading,
      friends,
      matches,
      pushRequests,
      pullRequests,
      pendingFriendRequests,
      pendingOutgoingRequests,
      suggestedFriends,
      refreshFriends,
    ],
  );

  return <AppContextState.Provider value={value}>{children}</AppContextState.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContextState);
  if (!context) {
    throw new Error('useApp must be used within AppContext');
  }
  return context;
};
