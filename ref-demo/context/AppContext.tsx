import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Friend,
  FriendRequest,
  Match,
  PullRequest,
  PullSuggestion,
  PushRequest,
  PushSuggestion,
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
  pushSuggestions: PushSuggestion[];
  pullRequests: PullRequest[];
  pullSuggestions: PullSuggestion[];
  friendRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  suggestedFriends: Friend[];
  refreshFriends: () => Promise<void>;
  login: (
    email: string,
    password: string,
  ) => Promise<{ user: User; isOnboarded: boolean } | null>;
  register: (
    email: string,
    password: string,
  ) => Promise<{ user: User; isOnboarded: boolean } | null>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<boolean>;
  completeOnboarding: (user: User) => void;
  addFriend: (friend: Friend) => void;
  createPushRequest: (target: User, candidates: User[], noteToTarget?: string, noteToCandidate?: string) => Promise<boolean>;
  respondToPushSuggestion: (
    suggestionId: string,
    action: 'accept' | 'decline',
  ) => Promise<boolean>;
  createPullRequest: (matchmaker: User) => Promise<boolean>;
  activatePullRequest: (requestId: string) => Promise<boolean>;
  completePullRequest: (requestId: string) => Promise<boolean>;
  addPullSuggestion: (
    pullRequestId: string,
    candidate: User,
    noteToRequester?: string,
    noteToCandidate?: string,
  ) => Promise<boolean>;
  respondToPullSuggestion: (
    suggestionId: string,
    action: 'accept' | 'decline',
  ) => Promise<boolean>;
  likeMatch: (matchId: string) => void;
  passMatch: (matchId: string) => void;
  addFriendById: (friendId: string) => Promise<boolean>;
  sendFriendRequest: (toUser: User) => Promise<boolean>;
  getLastApiError: () => string | null;
  reportUser: (
    reportedUserId: string,
    reason: 'inappropriate_behavior' | 'fake_or_spam',
    details?: string,
  ) => Promise<boolean>;
  acceptFriendRequest: (requestId: string) => void;
  declineFriendRequest: (requestId: string) => void;
  areFriends: (userId: string) => boolean;
  isRequestPending: (userId: string) => boolean;
  getFriendById: (friendId: string) => Friend | undefined;
  sendPasswordReset: (email: string) => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
  refreshAll: () => Promise<void>;
  unmatch: (matchId: string) => Promise<boolean>;
  blockUser: (userId: string) => Promise<boolean>;
  unblockUser: (userId: string) => Promise<boolean>;
  blockedIds: string[];
  findFriendByPhone: (phone: string) => Promise<User | null>;
  markChatRead: (matchId: string) => void;
  updateLastMessage: (matchId: string, msg: LastMessage) => void;
  lastMessages: Record<string, LastMessage>;
  unreadMessageCount: number;
}

const AppContextState = createContext<AppContextValue | null>(null);

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random()}`;
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ref-backend.vercel.app';
const AUTH_TOKEN_KEY = '@ref_auth_token';
const USER_ID_KEY = '@ref_user_id';
const AUTH_EMAIL_KEY = '@ref_auth_email';

const PHONE_KEY = '@ref_user_phone';
const CHAT_READ_PREFIX = '@ref_chat_read_';
const CHAT_LAST_MSG_PREFIX = '@ref_chat_last_msg_';

interface LastMessage {
  text: string;
  senderId: string;
  ts: string;
}

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
  gender?: 'man' | 'woman' | 'non-binary';
  lookingFor?: 'men' | 'women' | 'everyone';
  phone?: string;
}

interface ApiMatchItem {
  id: string;
  createdAt: string;
  otherUser: ApiPublicUser;
}

interface ApiFriendRequestItem {
  id: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  from: ApiPublicUser;
  to: ApiPublicUser;
}

interface ApiPullRequestItem {
  id: string;
  status: 'pending' | 'active' | 'completed';
  createdAt: string;
  requester: ApiPublicUser;
  matchmaker: ApiPublicUser;
}

interface ApiPullSuggestionItem {
  id: string;
  pullRequestId: string;
  requesterStatus: 'pending' | 'accepted' | 'declined';
  candidateStatus: 'pending' | 'accepted' | 'declined';
  finalStatus: 'pending' | 'matched' | 'declined';
  noteToRequester?: string;
  noteToCandidate?: string;
  createdAt: string;
  requester: ApiPublicUser;
  candidate: ApiPublicUser;
  matchmaker: ApiPublicUser;
}

interface ApiPushRequestItem {
  id: string;
  status: 'sent' | 'completed';
  role: 'matchmaker' | 'participant';
  createdAt: string;
  matchmaker: ApiPublicUser;
  target: ApiPublicUser;
}

interface ApiPushSuggestionItem {
  id: string;
  pushRequestId: string;
  targetStatus: 'pending' | 'accepted' | 'declined';
  candidateStatus: 'pending' | 'accepted' | 'declined';
  finalStatus: 'pending' | 'matched' | 'declined';
  createdAt: string;
  matchmaker: ApiPublicUser;
  target: ApiPublicUser;
  candidate: ApiPublicUser;
}

const toUser = (apiUser: ApiPublicUser): User => ({
  id: apiUser.id,
  name: apiUser.name,
  relationshipStatus: apiUser.relationshipStatus,
  photo: apiUser.photo ?? '',
  bio: apiUser.bio,
  age: apiUser.age,
  gender: apiUser.gender,
  lookingFor: apiUser.lookingFor,
  phone: apiUser.phone,
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
  const [pullSuggestions, setPullSuggestions] = useState<PullSuggestion[]>([]);
  const [pushSuggestions, setPushSuggestions] = useState<PushSuggestion[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [lastMessages, setLastMessages] = useState<Record<string, LastMessage>>({});
  const [chatReadTimestamps, setChatReadTimestamps] = useState<Record<string, string>>({});
  const lastApiErrorRef = useRef<string | null>(null);

  // Strips null/undefined so they are never sent to the backend (Zod .optional() rejects null)
  const stripNulls = (obj: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null));

  const apiRequest = async <T,>(
    path: string,
    options?: RequestInit,
    tokenOverride?: string | null,
  ): Promise<T | null> => {
    lastApiErrorRef.current = null;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const token = tokenOverride ?? authToken;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        // Always send auth if we have a token — the backend ignores it on public endpoints
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: { ...headers, ...(options?.headers ?? {}) },
        signal: controller.signal,
      });

      if (response.status === 401) {
        // Token expired or invalid — clear session so the app redirects to login
        await Promise.all([
          AsyncStorage.removeItem(USER_ID_KEY),
          AsyncStorage.removeItem(AUTH_TOKEN_KEY),
        ]);
        setCurrentUser(null);
        setAuthToken(null);
        setIsOnboarded(false);
        lastApiErrorRef.current = 'Session expired — please sign in again';
        return null;
      }

      if (!response.ok) {
        try {
          const body = await response.json();
          lastApiErrorRef.current = typeof body.error === 'string' ? body.error : `Error ${response.status}`;
        } catch {
          lastApiErrorRef.current = `Error ${response.status}`;
        }
        console.error(`API ${response.status} ${path}: ${lastApiErrorRef.current}`);
        return null;
      }

      return (await response.json()) as T;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        lastApiErrorRef.current = 'Request timed out';
        console.error('API Timeout:', path);
      } else {
        lastApiErrorRef.current = 'Network error';
        console.error('API Failed:', path, error);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const getLastApiError = () => lastApiErrorRef.current;

  const refreshFriends = async (user?: User, tokenOverride?: string | null) => {
    const targetUser = user ?? currentUser;
    if (!targetUser) return;

    const result = await apiRequest<{ items: ApiPublicUser[] }>(
      `/friends/${targetUser.id}`,
      undefined,
      tokenOverride,
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

  const refreshFriendRequests = async (user?: User, tokenOverride?: string | null) => {
    const targetUser = user ?? currentUser;
    if (!targetUser) return;

    const result = await apiRequest<{
      incoming: ApiFriendRequestItem[];
      outgoing: ApiFriendRequestItem[];
    }>(`/friends/requests/${targetUser.id}`, undefined, tokenOverride);

    if (!result) return;

    setFriendRequests(
      (result.incoming ?? []).map((item) => ({
        id: item.id,
        from: toUser(item.from),
        to: toUser(item.to),
        status: item.status,
        createdAt: new Date(item.createdAt),
      })),
    );

    setOutgoingRequests(
      (result.outgoing ?? []).map((item) => ({
        id: item.id,
        from: toUser(item.from),
        to: toUser(item.to),
        status: item.status,
        createdAt: new Date(item.createdAt),
      })),
    );
  };

  const refreshPullRequests = async (user?: User, tokenOverride?: string | null) => {
    const targetUser = user ?? currentUser;
    if (!targetUser) return;

    const result = await apiRequest<{
      incoming: ApiPullRequestItem[];
      outgoing: ApiPullRequestItem[];
    }>(`/pull/requests/${targetUser.id}`, undefined, tokenOverride);

    if (!result) return;

    const incoming: PullRequest[] = (result.incoming ?? []).map((item) => ({
      id: item.id,
      requester: toUser(item.requester),
      matchmaker: toUser(item.matchmaker),
      suggestions: [],
      status: item.status,
      role: 'incoming',
      createdAt: new Date(item.createdAt),
    }));

    const outgoing: PullRequest[] = (result.outgoing ?? []).map((item) => ({
      id: item.id,
      requester: toUser(item.requester),
      matchmaker: toUser(item.matchmaker),
      suggestions: [],
      status: item.status,
      role: 'outgoing',
      createdAt: new Date(item.createdAt),
    }));

    setPullRequests([...incoming, ...outgoing]);
  };

  const refreshPullSuggestions = async (user?: User, tokenOverride?: string | null) => {
    const targetUser = user ?? currentUser;
    if (!targetUser) return;

    const result = await apiRequest<{
      incomingRequester: ApiPullSuggestionItem[];
      incomingCandidate: ApiPullSuggestionItem[];
      byMatchmaker: ApiPullSuggestionItem[];
    }>(`/pull/suggestions/${targetUser.id}`, undefined, tokenOverride);

    if (!result) return;

    const combined = [
      ...(result.incomingRequester ?? []),
      ...(result.incomingCandidate ?? []),
      ...(result.byMatchmaker ?? []),
    ];
    const deduped = new Map<string, PullSuggestion>();

    combined.forEach((item) => {
      deduped.set(item.id, {
        id: item.id,
        pullRequestId: item.pullRequestId,
        requesterStatus: item.requesterStatus,
        candidateStatus: item.candidateStatus,
        finalStatus: item.finalStatus,
        noteToRequester: item.noteToRequester,
        noteToCandidate: item.noteToCandidate,
        requester: toUser(item.requester),
        candidate: toUser(item.candidate),
        matchmaker: toUser(item.matchmaker),
        createdAt: new Date(item.createdAt),
      });
    });

    setPullSuggestions(
      Array.from(deduped.values()).sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      ),
    );
  };

  const refreshPushRequests = async (user?: User, tokenOverride?: string | null) => {
    const targetUser = user ?? currentUser;
    if (!targetUser) return;

    const result = await apiRequest<{ items: ApiPushRequestItem[] }>(
      `/push/requests/${targetUser.id}`,
      undefined,
      tokenOverride,
    );
    if (!result) return;

    setPushRequests(
      (result.items ?? []).map((item) => ({
        id: item.id,
        status: item.status,
        role: item.role,
        createdAt: new Date(item.createdAt),
        matchmaker: toUser(item.matchmaker),
        target: toUser(item.target),
        candidates: [],
      })),
    );
  };

  const refreshPushSuggestions = async (user?: User, tokenOverride?: string | null) => {
    const targetUser = user ?? currentUser;
    if (!targetUser) return;

    const result = await apiRequest<{
      incomingTarget: ApiPushSuggestionItem[];
      incomingCandidate: ApiPushSuggestionItem[];
      byMatchmaker: ApiPushSuggestionItem[];
    }>(`/push/suggestions/${targetUser.id}`, undefined, tokenOverride);

    if (!result) return;

    const dedup = new Map<string, PushSuggestion>();
    const combined = [
      ...(result.incomingTarget ?? []),
      ...(result.incomingCandidate ?? []),
      ...(result.byMatchmaker ?? []),
    ];
    combined.forEach((item) => {
      dedup.set(item.id, {
        id: item.id,
        pushRequestId: item.pushRequestId,
        targetStatus: item.targetStatus,
        candidateStatus: item.candidateStatus,
        finalStatus: item.finalStatus,
        noteToTarget: item.noteToTarget,
        noteToCandidate: item.noteToCandidate,
        createdAt: new Date(item.createdAt),
        matchmaker: toUser(item.matchmaker),
        target: toUser(item.target),
        candidate: toUser(item.candidate),
      });
    });

    setPushSuggestions(
      Array.from(dedup.values()).sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      ),
    );
  };

  const refreshAuthenticatedData = async (
    user: User,
    tokenOverride?: string | null,
  ) => {
    await Promise.all([
      syncDiscoveryAndMatches(user, tokenOverride),
      refreshFriends(user, tokenOverride),
      refreshFriendRequests(user, tokenOverride),
      refreshPushRequests(user, tokenOverride),
      refreshPushSuggestions(user, tokenOverride),
      refreshPullRequests(user, tokenOverride),
      refreshPullSuggestions(user, tokenOverride),
    ]);
  };

  const loadStoredSession = async () => {
    try {
      const [storedUserId, storedToken, storedEmail, storedPhone] = await Promise.all([
        AsyncStorage.getItem(USER_ID_KEY),
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
        AsyncStorage.getItem(AUTH_EMAIL_KEY),
        AsyncStorage.getItem(PHONE_KEY),
      ]);

      if (storedUserId && storedToken) {
        setAuthToken(storedToken);
        const [profile, blockedResult] = await Promise.all([
          apiRequest<ApiPublicUser>(`/profiles/${storedUserId}`, undefined, storedToken),
          apiRequest<{ ids: string[] }>('/blocks', undefined, storedToken),
        ]);

        if (profile) {
          const user = {
            ...toUser(profile),
            email: storedEmail ?? undefined,
            phone: storedPhone ?? profile.phone ?? undefined,
          };
          setCurrentUser(user);
          setIsOnboarded(isProfileComplete(user));
          if (blockedResult?.ids) setBlockedIds(blockedResult.ids);
          await refreshAuthenticatedData(user, storedToken);
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
      AsyncStorage.removeItem(AUTH_EMAIL_KEY),
    ]);
    setAuthToken(null);
  };

  const login = async (
    email: string,
    password: string,
  ): Promise<{ user: User; isOnboarded: boolean } | null> => {
    try {
      const result = await apiRequest<{ user: ApiPublicUser; token: string }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        },
      );

      if (!result) return null;

      const user = { ...toUser(result.user), email };
      const nextIsOnboarded = isProfileComplete(user);
      setCurrentUser(user);
      setIsOnboarded(nextIsOnboarded);
      setAuthToken(result.token);

      await Promise.all([
        AsyncStorage.setItem(USER_ID_KEY, user.id),
        AsyncStorage.setItem(AUTH_TOKEN_KEY, result.token),
        AsyncStorage.setItem(AUTH_EMAIL_KEY, email),
      ]);

      await refreshAuthenticatedData(user, result.token);
      return { user, isOnboarded: nextIsOnboarded };
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  };

  const register = async (
    email: string,
    password: string,
  ): Promise<{ user: User; isOnboarded: boolean } | null> => {
    try {
      const result = await apiRequest<{ user: ApiPublicUser; token: string }>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        },
      );

      if (!result) return null;

      const user = { ...toUser(result.user), email };
      const nextIsOnboarded = isProfileComplete(user);
      setCurrentUser(user);
      setIsOnboarded(nextIsOnboarded);
      setAuthToken(result.token);

      await Promise.all([
        AsyncStorage.setItem(USER_ID_KEY, user.id),
        AsyncStorage.setItem(AUTH_TOKEN_KEY, result.token),
        AsyncStorage.setItem(AUTH_EMAIL_KEY, email),
      ]);

      return { user, isOnboarded: nextIsOnboarded };
    } catch (error) {
      console.error('Register error:', error);
      return null;
    }
  };

  const logout = async () => {
    await clearStoredSession();
    setCurrentUser(null);
    setIsOnboarded(false);
    setMatches([]);
    setPushRequests([]);
    setPushSuggestions([]);
    setPullRequests([]);
    setPullSuggestions([]);
    setFriendRequests([]);
    setOutgoingRequests([]);
    setAuthToken(null);
  };

  // Resize + compress image using canvas before uploading.
  // Keeps payload well under Vercel's 4.5 MB serverless body limit.
  const resizeBlob = (blob: Blob, maxPx = 900, quality = 0.78): Promise<Blob> =>
    new Promise((resolve) => {
      const img = new window.Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        canvas.toBlob((b) => resolve(b ?? blob), 'image/jpeg', quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(blob); };
      img.src = url;
    });

  const uploadPhoto = async (localUri: string): Promise<string | null> => {
    try {
      const response = await fetch(localUri);
      let blob = await response.blob();

      // Resize client-side so base64 payload stays under Vercel's 4.5 MB limit
      if (typeof document !== 'undefined') {
        blob = await resizeBlob(blob);
      }

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1] ?? '');
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const result = await apiRequest<{ url: string }>('/upload/photo', {
        method: 'POST',
        body: JSON.stringify({ base64, mimeType: 'image/jpeg' }),
      });
      return result?.url ?? null;
    } catch (e) {
      console.error('Photo upload failed:', e);
      return null;
    }
  };

  const updateProfile = async (updates: Partial<User>): Promise<boolean> => {
    if (!currentUser) return false;

    const nextUser: User = {
      ...currentUser,
      ...updates,
      id: currentUser.id,
    };

    // Optimistically apply changes so UI reflects intent immediately
    setCurrentUser(nextUser);
    setIsOnboarded(isProfileComplete(nextUser));

    // Upload local photo to storage before saving profile
    let resolvedPhoto = nextUser.photo;
    if (resolvedPhoto && !resolvedPhoto.startsWith('http')) {
      const uploadedUrl = await uploadPhoto(resolvedPhoto);
      if (uploadedUrl) {
        resolvedPhoto = uploadedUrl;
        setCurrentUser((u) => u ? { ...u, photo: uploadedUrl } : u);
      } else {
        resolvedPhoto = currentUser.photo; // fall back, don't block profile save
      }
    }

    const photoPayload = resolvedPhoto?.startsWith('http')
      ? { photo: resolvedPhoto }
      : {};

    const result = await apiRequest<ApiPublicUser>(`/profiles/${currentUser.id}`, {
      method: 'PUT',
      body: JSON.stringify(stripNulls({
        name: nextUser.name,
        relationshipStatus: nextUser.relationshipStatus,
        bio: nextUser.bio,
        age: nextUser.age,
        gender: nextUser.gender,
        lookingFor: nextUser.lookingFor,
        ...(nextUser.phone !== undefined ? { phone: nextUser.phone || null } : {}),
        ...photoPayload,
      })),
    });

    if (result && nextUser.phone !== undefined) {
      if (nextUser.phone) {
        await AsyncStorage.setItem(PHONE_KEY, nextUser.phone);
      } else {
        await AsyncStorage.removeItem(PHONE_KEY);
      }
    }

    if (!result) {
      // Roll back on failure
      setCurrentUser(currentUser);
      setIsOnboarded(isProfileComplete(currentUser));
      return false;
    }

    // Merge server response — keep local values if server returns null
    const serverUser: User = {
      ...toUser(result),
      photo: result.photo ?? nextUser.photo ?? '',
      gender: result.gender ?? nextUser.gender,
      lookingFor: result.lookingFor ?? nextUser.lookingFor,
    };
    setCurrentUser(serverUser);
    setIsOnboarded(isProfileComplete(serverUser));
    return true;
  };

  const syncDiscoveryAndMatches = async (
    user: User,
    tokenOverride?: string | null,
  ) => {
    const [discoveryResult, matchesResult] = await Promise.all([
      apiRequest<{ items: ApiPublicUser[] }>(`/discovery/${user.id}`, undefined, tokenOverride),
      apiRequest<{ items: ApiMatchItem[] }>(`/matches/${user.id}`, undefined, tokenOverride),
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
      // Upload local photo URI to storage before saving profile
      let resolvedPhoto = updatedUser.photo;
      if (resolvedPhoto && !resolvedPhoto.startsWith('http')) {
        const uploadedUrl = await uploadPhoto(resolvedPhoto);
        if (uploadedUrl) {
          resolvedPhoto = uploadedUrl;
          setCurrentUser((u) => u ? { ...u, photo: uploadedUrl } : u);
        } else {
          resolvedPhoto = undefined;
        }
      }

      const photoPayload = resolvedPhoto?.startsWith('http')
        ? { photo: resolvedPhoto }
        : {};

      await apiRequest(`/profiles/${currentUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(stripNulls({
          name: updatedUser.name,
          relationshipStatus: updatedUser.relationshipStatus,
          gender: updatedUser.gender,
          lookingFor: updatedUser.lookingFor,
          bio: updatedUser.bio,
          age: updatedUser.age,
          ...photoPayload,
        })),
      });

      await syncDiscoveryAndMatches(updatedUser);
    })();
  };

  const addFriend = (friend: Friend) => {
    setFriends((prev) => [...prev, friend]);
  };

  const createPushRequest = async (
    target: User,
    candidates: User[],
    noteToTarget?: string,
    noteToCandidate?: string,
  ): Promise<boolean> => {
    if (!currentUser) return false;
    if (candidates.length === 0) return false;

    const result = await apiRequest<{ pushRequest: { id: string } }>(
      '/push/requests',
      {
        method: 'POST',
        body: JSON.stringify({
          matchmakerId: currentUser.id,
          targetUserId: target.id,
          candidateIds: candidates.map((candidate) => candidate.id),
          ...(noteToTarget?.trim() ? { noteToTarget: noteToTarget.trim() } : {}),
          ...(noteToCandidate?.trim() ? { noteToCandidate: noteToCandidate.trim() } : {}),
        }),
      },
    );
    if (!result) return false;

    await Promise.all([
      refreshPushRequests(currentUser),
      refreshPushSuggestions(currentUser),
    ]);
    return true;
  };

  const respondToPushSuggestion = async (
    suggestionId: string,
    action: 'accept' | 'decline',
  ): Promise<boolean> => {
    if (!currentUser) return false;

    const result = await apiRequest<{ suggestion: { id: string } }>(
      '/push/suggestions/respond',
      {
        method: 'POST',
        body: JSON.stringify({
          suggestionId,
          userId: currentUser.id,
          action,
        }),
      },
    );
    if (!result) return false;

    await Promise.all([
      syncDiscoveryAndMatches(currentUser),
      refreshPushRequests(currentUser),
      refreshPushSuggestions(currentUser),
    ]);
    return true;
  };

  const createPullRequest = async (matchmaker: User): Promise<boolean> => {
    if (!currentUser) return false;

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

    if (!result) return false;
    await Promise.all([
      refreshPullRequests(currentUser),
      refreshPullSuggestions(currentUser),
    ]);
    return true;
  };

  const activatePullRequest = async (requestId: string): Promise<boolean> => {
    if (!currentUser) return false;
    const result = await apiRequest<{ pullRequest: { id: string } }>(
      '/pull/respond',
      {
        method: 'POST',
        body: JSON.stringify({
          requestId,
          userId: currentUser.id,
          action: 'activate',
        }),
      },
    );

    if (!result) return false;
    await Promise.all([
      refreshPullRequests(currentUser),
      refreshPullSuggestions(currentUser),
    ]);
    return true;
  };

  const completePullRequest = async (requestId: string): Promise<boolean> => {
    if (!currentUser) return false;
    const result = await apiRequest<{ pullRequest: { id: string } }>(
      '/pull/respond',
      {
        method: 'POST',
        body: JSON.stringify({
          requestId,
          userId: currentUser.id,
          action: 'complete',
        }),
      },
    );

    if (!result) return false;
    await Promise.all([
      refreshPullRequests(currentUser),
      refreshPullSuggestions(currentUser),
    ]);
    return true;
  };

  const addPullSuggestion = async (
    pullRequestId: string,
    candidate: User,
    noteToRequester?: string,
    noteToCandidate?: string,
  ): Promise<boolean> => {
    if (!currentUser) return false;

    const result = await apiRequest<{ suggestion: { id: string } }>(
      '/pull/suggestions',
      {
        method: 'POST',
        body: JSON.stringify({
          pullRequestId,
          matchmakerId: currentUser.id,
          candidateId: candidate.id,
          noteToRequester,
          noteToCandidate,
        }),
      },
    );

    if (!result) return false;
    await Promise.all([
      refreshPullRequests(currentUser),
      refreshPullSuggestions(currentUser),
    ]);
    return true;
  };

  const respondToPullSuggestion = async (
    suggestionId: string,
    action: 'accept' | 'decline',
  ): Promise<boolean> => {
    if (!currentUser) return false;

    const result = await apiRequest<{ suggestion: { id: string } }>(
      '/pull/suggestions/respond',
      {
        method: 'POST',
        body: JSON.stringify({
          suggestionId,
          userId: currentUser.id,
          action,
        }),
      },
    );

    if (!result) return false;
    await Promise.all([
      syncDiscoveryAndMatches(currentUser),
      refreshPullRequests(currentUser),
      refreshPullSuggestions(currentUser),
    ]);
    return true;
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

  const addFriendById = async (friendId: string): Promise<boolean> => {
    if (!currentUser) return false;

    const result = await apiRequest<{ friendship: { id: string } }>(
      '/friends/add',
      {
        method: 'POST',
        body: JSON.stringify({
          userId: currentUser.id,
          friendId,
        }),
      },
    );

    if (!result) return false;

    await Promise.all([
      refreshFriends(currentUser),
      refreshFriendRequests(currentUser),
    ]);
    return true;
  };

  const sendFriendRequest = async (toUser: User): Promise<boolean> => {
    if (!currentUser) return false;

    const result = await apiRequest<{ request: { id: string } }>(
      '/friends/request',
      {
        method: 'POST',
        body: JSON.stringify({
          requesterId: currentUser.id,
          addresseeId: toUser.id,
        }),
      },
    );

    if (!result) return false;

    await refreshFriendRequests(currentUser);
    return true;
  };

  const reportUser = async (
    reportedUserId: string,
    reason: 'inappropriate_behavior' | 'fake_or_spam',
    details?: string,
  ): Promise<boolean> => {
    if (!currentUser) return false;

    const result = await apiRequest<{ report: { id: string } }>(
      '/reports',
      {
        method: 'POST',
        body: JSON.stringify({
          reporterId: currentUser.id,
          reportedUserId,
          reason,
          details,
        }),
      },
    );

    return Boolean(result);
  };

  const acceptFriendRequest = (requestId: string) => {
    if (!currentUser) return;
    void (async () => {
      const result = await apiRequest<{ request: { id: string } }>(
        '/friends/respond',
        {
          method: 'POST',
          body: JSON.stringify({
            requestId,
            userId: currentUser.id,
            action: 'accept',
          }),
        },
      );

      if (!result) return;
      await Promise.all([
        refreshFriends(currentUser),
        refreshFriendRequests(currentUser),
      ]);
    })();
  };

  const declineFriendRequest = (requestId: string) => {
    if (!currentUser) return;
    void (async () => {
      const result = await apiRequest<{ request: { id: string } }>(
        '/friends/respond',
        {
          method: 'POST',
          body: JSON.stringify({
            requestId,
            userId: currentUser.id,
            action: 'decline',
          }),
        },
      );

      if (!result) return;
      await refreshFriendRequests(currentUser);
    })();
  };

  const areFriends = (userId: string) =>
    friends.some((friend) => friend.id === userId);

  const isRequestPending = (userId: string) =>
    outgoingRequests.some(
      (request) => request.to.id === userId && request.status === 'pending',
    );

  const getFriendById = (friendId: string) =>
    friends.find((friend) => friend.id === friendId);

  const unmatch = async (matchId: string): Promise<boolean> => {
    if (!currentUser) return false;
    const result = await apiRequest<{ ok: boolean }>(`/matches/${matchId}`, { method: 'DELETE' });
    if (!result) return false;
    setMatches((prev) => prev.filter((m) => m.id !== matchId));
    return true;
  };

  const blockUser = async (userId: string): Promise<boolean> => {
    if (!currentUser) return false;
    const result = await apiRequest<{ ok: boolean }>('/blocks', {
      method: 'POST',
      body: JSON.stringify({ blockedUserId: userId }),
    });
    if (!result) return false;
    setBlockedIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
    setMatches((prev) => prev.filter((m) => m.user.id !== userId));
    setFriends((prev) => prev.filter((f) => f.id !== userId));
    return true;
  };

  const unblockUser = async (userId: string): Promise<boolean> => {
    if (!currentUser) return false;
    await apiRequest<{ ok: boolean }>(`/blocks/${userId}`, { method: 'DELETE' });
    setBlockedIds((prev) => prev.filter((id) => id !== userId));
    return true;
  };

  const findFriendByPhone = async (phone: string): Promise<User | null> => {
    if (!currentUser) return null;
    const result = await apiRequest<{ user: ApiPublicUser }>('/friends/find-by-phone', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
    return result ? toUser(result.user) : null;
  };

  const markChatRead = (matchId: string) => {
    const ts = new Date().toISOString();
    setChatReadTimestamps((prev) => ({ ...prev, [matchId]: ts }));
    void AsyncStorage.setItem(`${CHAT_READ_PREFIX}${matchId}`, ts);
  };

  const updateLastMessage = (matchId: string, msg: LastMessage) => {
    setLastMessages((prev) => {
      const existing = prev[matchId];
      if (existing && existing.ts >= msg.ts) return prev;
      void AsyncStorage.setItem(`${CHAT_LAST_MSG_PREFIX}${matchId}`, JSON.stringify(msg));
      return { ...prev, [matchId]: msg };
    });
  };

  const refreshAll = async () => {
    if (!currentUser) return;
    await refreshAuthenticatedData(currentUser);
  };

  const sendPasswordReset = async (email: string): Promise<boolean> => {
    const result = await apiRequest<{ ok: boolean }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return Boolean(result?.ok);
  };

  const deleteAccount = async (): Promise<boolean> => {
    if (!currentUser) return false;
    const result = await apiRequest<{ ok: boolean }>('/auth/account', {
      method: 'DELETE',
    });
    return Boolean(result?.ok);
  };

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

  const unreadMessageCount = useMemo(() => {
    if (!currentUser) return 0;
    let count = 0;
    matches.filter((m) => m.status === 'matched').forEach((m) => {
      const last = lastMessages[m.id];
      const readTs = chatReadTimestamps[m.id];
      if (last && last.senderId !== currentUser.id) {
        if (!readTs || last.ts > readTs) count += 1;
      }
    });
    return count;
  }, [currentUser, matches, lastMessages, chatReadTimestamps]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Load persisted chat read timestamps + last messages when confirmed matches change
  useEffect(() => {
    const confirmedMatchIds = matches.filter((m) => m.status === 'matched').map((m) => m.id);
    if (confirmedMatchIds.length === 0) return;
    void (async () => {
      const entries = await Promise.all(
        confirmedMatchIds.flatMap((id) => [
          AsyncStorage.getItem(`${CHAT_READ_PREFIX}${id}`).then((v) => ({ key: `read:${id}`, val: v })),
          AsyncStorage.getItem(`${CHAT_LAST_MSG_PREFIX}${id}`).then((v) => ({ key: `msg:${id}`, val: v })),
        ]),
      );
      const readMap: Record<string, string> = {};
      const msgMap: Record<string, LastMessage> = {};
      entries.forEach(({ key, val }) => {
        if (!val) return;
        if (key.startsWith('read:')) {
          readMap[key.slice(5)] = val;
        } else {
          try { msgMap[key.slice(4)] = JSON.parse(val); } catch {}
        }
      });
      setChatReadTimestamps((prev) => ({ ...readMap, ...prev }));
      setLastMessages((prev) => ({ ...msgMap, ...prev }));
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches.length]);

  // Stable ref so screens can safely use refreshFriends in useEffect without it
  // appearing as a changing dependency on every render.
  const refreshFriendsRef = useRef(refreshFriends);
  refreshFriendsRef.current = refreshFriends;
  const stableRefreshFriends = useCallback(() => refreshFriendsRef.current(), []);

  const value = useMemo(
    () => ({
      currentUser,
      isOnboarded,
      isAuthLoading,
      friends,
      matches,
      pushRequests,
      pushSuggestions,
      pullRequests,
      pullSuggestions,
      friendRequests: pendingFriendRequests,
      outgoingRequests: pendingOutgoingRequests,
      suggestedFriends,
      refreshFriends: stableRefreshFriends,
      login,
      register,
      logout,
      updateProfile,
      completeOnboarding,
      addFriend,
      createPushRequest,
      respondToPushSuggestion,
      createPullRequest,
      activatePullRequest,
      completePullRequest,
      addPullSuggestion,
      respondToPullSuggestion,
      likeMatch,
      passMatch,
      addFriendById,
      sendFriendRequest,
      getLastApiError,
      reportUser,
      acceptFriendRequest,
      declineFriendRequest,
      areFriends,
      isRequestPending,
      getFriendById,
      sendPasswordReset,
      deleteAccount,
      refreshAll,
      unmatch,
      blockUser,
      unblockUser,
      blockedIds,
      findFriendByPhone,
      markChatRead,
      updateLastMessage,
      lastMessages,
      unreadMessageCount,
    }),
    [
      currentUser,
      isOnboarded,
      isAuthLoading,
      friends,
      matches,
      pushRequests,
      pushSuggestions,
      pullRequests,
      pullSuggestions,
      pendingFriendRequests,
      pendingOutgoingRequests,
      suggestedFriends,
      stableRefreshFriends,
      updateProfile,
      reportUser,
      blockedIds,
      lastMessages,
      unreadMessageCount,
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
