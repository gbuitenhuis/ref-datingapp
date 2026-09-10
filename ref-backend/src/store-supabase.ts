import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase.js';
import type { PublicUser, RelationshipStatus, SwipeDirection, Gender, LookingFor } from './types.js';
import { createToken } from './middleware.js';

export const store = {
  async register(
    email: string,
    password: string,
    name: string,
    relationshipStatus: RelationshipStatus,
  ) {
    console.log('🔵 Register attempt:', { email, hasPassword: !!password, name });
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      console.error('❌ Auth error:', authError?.message, authError?.status, authError?.code);
      if (authError?.code === 'user_already_exists') {
        return null; // Will trigger 409
      }
      throw new Error(`Supabase auth failed: ${authError?.message || 'Unknown error'}`);
    }
    
    console.log('✅ Auth user created:', authData.user.id);
    
    console.log('✅ Auth user created:', authData.user.id);

    // Create profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        name,
        relationship_status: relationshipStatus,
      })
      .select()
      .single();

    if (profileError || !profile) {
      console.error('❌ Profile error:', profileError?.message);
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Profile creation failed: ${profileError?.message || 'Unknown error'}`);
    }
    
    console.log('✅ Profile created successfully');

    // Generate JWT token
    const token = createToken(authData.user.id);

    return {
      user: this.toPublicUser(profile),
      token,
    };
  },

  async login(email: string, password: string) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY for login');
      return null;
    }

    // Use a dedicated auth client so sign-in does not mutate the global admin client session.
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return null;
    }

    const profile = await this.getProfile(data.user.id);
    if (!profile) return null;

    // Generate JWT token
    const token = createToken(data.user.id);

    return {
      user: profile,
      token,
    };
  },

  async getProfile(userId: string): Promise<PublicUser | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) return null;
    return this.toPublicUser(data);
  },

  async updateProfile(
    userId: string,
    patch: Partial<{
      name: string;
      relationship_status: RelationshipStatus;
      photo: string;
      bio: string;
      age: number;
      gender: Gender;
      looking_for: LookingFor;
      phone: string | null;
    }>,
  ): Promise<PublicUser | null> {
    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', userId)
      .select()
      .single();

    if (error || !data) return null;
    return this.toPublicUser(data);
  },

  async createUserReport(input: {
    reporterId: string;
    reportedUserId: string;
    reason: 'inappropriate_behavior' | 'fake_or_spam';
    details?: string;
  }) {
    const { data, error } = await supabase
      .from('user_reports')
      .insert({
        reporter_id: input.reporterId,
        reported_user_id: input.reportedUserId,
        reason: input.reason,
        details: input.details?.trim() || null,
      })
      .select('id')
      .single();

    if (error || !data) return null;
    return { id: data.id };
  },

  async getDiscovery(userId: string): Promise<PublicUser[] | null> {
    const profile = await this.getProfile(userId);
    if (!profile) return null;

    const [swipesResult, blockedIds] = await Promise.all([
      supabase.from('swipes').select('to_user_id').eq('from_user_id', userId),
      this.getBlockedIds(userId),
    ]);

    const swipedIds = new Set(swipesResult.data?.map((s) => s.to_user_id) || []);
    const blockedSet = new Set(blockedIds);

    const { data: candidates, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('relationship_status', 'single')
      .neq('id', userId);

    if (error || !candidates) return [];

    return candidates
      .filter((c) => Boolean(c.name?.trim()) && !swipedIds.has(c.id) && !blockedSet.has(c.id))
      .map(this.toPublicUser);
  },

  async addSwipe(
    fromUserId: string,
    toUserId: string,
    direction: SwipeDirection,
  ): Promise<{ match: { id: string } | null } | { error: string }> {
    if (fromUserId === toUserId) {
      return { error: 'Cannot swipe on yourself' };
    }

    // Verify both users exist
    const [fromUser, toUser] = await Promise.all([
      this.getProfile(fromUserId),
      this.getProfile(toUserId),
    ]);

    if (!fromUser || !toUser) {
      return { error: 'User not found' };
    }

    // Record swipe; ignore duplicate attempts for the same direction.
    const { error: swipeError } = await supabase.from('swipes').insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      direction,
    });

    if (swipeError) {
      const isDuplicate = swipeError.code === '23505';
      if (!isDuplicate) {
        console.error('❌ Swipe insert error:', swipeError.message);
        return { error: 'Failed to record swipe' };
      }
    }

    // If it's a pass, no match
    if (direction === 'pass') {
      return { match: null };
    }

    // Check if there's a mutual like
    const { data: reverseSwipe } = await supabase
      .from('swipes')
      .select('*')
      .eq('from_user_id', toUserId)
      .eq('to_user_id', fromUserId)
      .eq('direction', 'like')
      .maybeSingle();

    if (!reverseSwipe) {
      return { match: null };
    }

    // Create match (ensure consistent ordering)
    const [user1Id, user2Id] = [fromUserId, toUserId].sort();
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        user1_id: user1Id,
        user2_id: user2Id,
      })
      .select()
      .single();

    if (matchError) {
      const isDuplicateMatch = matchError.code === '23505';
      if (!isDuplicateMatch) {
        console.error('❌ Match insert error:', matchError.message);
        return { match: null };
      }

      const { data: existingMatch } = await supabase
        .from('matches')
        .select('id')
        .eq('user1_id', user1Id)
        .eq('user2_id', user2Id)
        .maybeSingle();

      if (existingMatch) {
        return { match: { id: existingMatch.id } };
      }
      return { match: null };
    }

    if (!match) {
      return { match: null };
    }

    return { match: { id: match.id } };
  },

  async getMatches(userId: string) {
    const { data: matches, error } = await supabase
      .from('matches')
      .select(
        'id, created_at, user1_id, user2_id, user1:profiles!matches_user1_id_fkey(*), user2:profiles!matches_user2_id_fkey(*)',
      )
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    if (error || !matches) {
      if (error) {
        console.error('❌ Get matches error:', error.message);
      }
      return [];
    }

    return matches
      .map((match: any) => {
        const otherUser = match.user1_id === userId ? match.user2 : match.user1;
        if (!otherUser) return null;

        return {
          id: match.id,
          createdAt: match.created_at,
          otherUser: this.toPublicUser(otherUser),
        };
      })
      .filter(Boolean);
  },

  async getMessages(matchId: string) {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });

    if (error) return null;
    return messages || [];
  },

  async addMessage(matchId: string, senderId: string, text: string) {
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        match_id: matchId,
        sender_id: senderId,
        text,
      })
      .select()
      .single();

    if (error || !message) return null;
    return message;
  },

  async addFriend(userId: string, friendId: string) {
    // Verify both users exist
    const [user, friend] = await Promise.all([
      this.getProfile(userId),
      this.getProfile(friendId),
    ]);

    if (!user || !friend) {
      return { error: 'User not found' };
    }

    // Check if already friends
    const { data: existing } = await supabase
      .from('friends')
      .select('*')
      .or(
        `and(requester_id.eq.${userId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userId})`
      );

    if (existing && existing.length > 0) {
      return { error: 'Already friends' };
    }

    // Create friend relationship
    const { data: friendship, error } = await supabase
      .from('friends')
      .insert({
        requester_id: userId,
        addressee_id: friendId,
        status: 'accepted',
      })
      .select()
      .single();

    if (error || !friendship) {
      return { error: 'Failed to add friend' };
    }

    return { friendship };
  },

  async createFriendRequest(requesterId: string, addresseeId: string) {
    if (requesterId === addresseeId) {
      return { error: 'Cannot send request to yourself' };
    }

    const [requester, addressee] = await Promise.all([
      this.getProfile(requesterId),
      this.getProfile(addresseeId),
    ]);

    if (!requester || !addressee) {
      return { error: 'User not found' };
    }

    const { data: existing } = await supabase
      .from('friends')
      .select('id, status, requester_id, addressee_id')
      .or(
        `and(requester_id.eq.${requesterId},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${requesterId})`,
      );

    if (existing && existing.length > 0) {
      const accepted = existing.some((row: any) => row.status === 'accepted');
      if (accepted) return { error: 'Already friends' };
      return { error: 'Request already exists' };
    }

    const { data: request, error } = await supabase
      .from('friends')
      .insert({
        requester_id: requesterId,
        addressee_id: addresseeId,
        status: 'pending',
      })
      .select()
      .single();

    if (error || !request) {
      return { error: 'Failed to create friend request' };
    }

    return { request };
  },

  async getFriendRequests(userId: string) {
    const { data, error } = await supabase
      .from('friends')
      .select(
        'id, requester_id, addressee_id, status, created_at, requester:profiles!friends_requester_id_fkey(*), addressee:profiles!friends_addressee_id_fkey(*)',
      )
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'pending');

    if (error || !data) return { incoming: [], outgoing: [] };

    const incoming = data
      .filter((row: any) => row.addressee_id === userId)
      .map((row: any) => ({
        id: row.id,
        status: row.status,
        createdAt: row.created_at,
        from: this.toPublicUser(row.requester),
        to: this.toPublicUser(row.addressee),
      }));

    const outgoing = data
      .filter((row: any) => row.requester_id === userId)
      .map((row: any) => ({
        id: row.id,
        status: row.status,
        createdAt: row.created_at,
        from: this.toPublicUser(row.requester),
        to: this.toPublicUser(row.addressee),
      }));

    return { incoming, outgoing };
  },

  async respondToFriendRequest(
    requestId: string,
    userId: string,
    action: 'accept' | 'decline',
  ) {
    const { data: request, error: requestError } = await supabase
      .from('friends')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      return { error: 'Request not found' };
    }

    if (request.addressee_id !== userId) {
      return { error: 'Unauthorized' };
    }

    if (request.status !== 'pending') {
      return { error: 'Request already handled' };
    }

    const nextStatus = action === 'accept' ? 'accepted' : 'declined';
    const { data: updated, error } = await supabase
      .from('friends')
      .update({ status: nextStatus })
      .eq('id', requestId)
      .select()
      .single();

    if (error || !updated) {
      return { error: 'Failed to update request' };
    }

    return { request: updated };
  },

  async getFriends(userId: string) {
    const { data, error } = await supabase
      .from('friends')
      .select(
        'id, requester_id, addressee_id, status, requester:profiles!friends_requester_id_fkey(*), addressee:profiles!friends_addressee_id_fkey(*)'
      )
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (error || !data) return [];

    return data.map((row: any) => {
      const otherUser = row.requester_id === userId ? row.addressee : row.requester;
      return this.toPublicUser(otherUser);
    });
  },

  async createPushMatch(matchmakerId: string, person1Id: string, person2Id: string) {
    const [p1, p2] = await Promise.all([
      this.getProfile(person1Id),
      this.getProfile(person2Id),
    ]);

    if (!p1 || !p2) {
      return { error: 'User not found' };
    }

    const [user1Id, user2Id] = [person1Id, person2Id].sort();

    const { data: existing } = await supabase
      .from('matches')
      .select('*')
      .eq('user1_id', user1Id)
      .eq('user2_id', user2Id)
      .maybeSingle();

    if (existing) {
      return { match: { id: existing.id } };
    }

    const { data: match, error } = await supabase
      .from('matches')
      .insert({
        user1_id: user1Id,
        user2_id: user2Id,
      })
      .select()
      .single();

    if (error || !match) {
      return { error: 'Failed to create match' };
    }

    return { match: { id: match.id } };
  },

  async createPushRequestThread(
    matchmakerId: string,
    targetUserId: string,
    candidateIds: string[],
    noteToTarget?: string,
    noteToCandidate?: string,
  ) {
    if (targetUserId === matchmakerId) {
      return { error: 'Cannot target yourself' };
    }
    const uniqueCandidates = Array.from(new Set(candidateIds.filter(Boolean)));
    if (uniqueCandidates.length === 0) {
      return { error: 'At least one candidate is required' };
    }
    if (uniqueCandidates.includes(targetUserId)) {
      return { error: 'Target cannot also be a candidate' };
    }
    if (uniqueCandidates.includes(matchmakerId)) {
      return { error: 'Cannot suggest yourself as candidate' };
    }

    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id')
      .in('id', [targetUserId, ...uniqueCandidates, matchmakerId]);
    if (usersError || !users) return { error: 'User lookup failed' };
    const ids = new Set(users.map((u: any) => u.id));
    if (!ids.has(targetUserId) || !ids.has(matchmakerId)) return { error: 'User not found' };
    if (uniqueCandidates.some((id) => !ids.has(id))) return { error: 'Candidate not found' };

    const { data: request, error: requestError } = await supabase
      .from('push_requests')
      .insert({
        matchmaker_id: matchmakerId,
        target_user_id: targetUserId,
        status: 'sent',
      })
      .select()
      .single();

    if (requestError || !request) {
      const msg = String(requestError?.message ?? '');
      if (requestError?.code === '42P01' || msg.includes('push_requests')) {
        return { error: 'Push tables missing. Run migration first.' };
      }
      return { error: 'Failed to create push request' };
    }

    const payload = uniqueCandidates.map((candidateId) => ({
      push_request_id: request.id,
      matchmaker_id: matchmakerId,
      target_user_id: targetUserId,
      candidate_id: candidateId,
      note_to_target: noteToTarget ?? null,
      note_to_candidate: noteToCandidate ?? null,
    }));
    const { error: suggError } = await supabase
      .from('push_suggestions')
      .insert(payload);

    if (suggError) {
      return { error: 'Failed to create push suggestions' };
    }

    return { pushRequest: request };
  },

  async getPushRequests(userId: string) {
    const { data, error } = await supabase
      .from('push_requests')
      .select(
        'id, status, created_at, matchmaker_id, target_user_id, matchmaker:profiles!push_requests_matchmaker_id_fkey(*), target:profiles!push_requests_target_user_id_fkey(*)',
      )
      .or(`matchmaker_id.eq.${userId},target_user_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error || !data) return { items: [] };

    const items = data.map((row: any) => ({
      id: row.id,
      status: row.status,
      role: row.matchmaker_id === userId ? 'matchmaker' : 'participant',
      createdAt: row.created_at,
      note: row.note,
      matchmaker: this.toPublicUser(row.matchmaker),
      target: this.toPublicUser(row.target),
      candidates: [],
    }));

    return { items };
  },

  async getPushSuggestions(userId: string) {
    const { data, error } = await supabase
      .from('push_suggestions')
      .select(
        'id, push_request_id, target_status, candidate_status, final_status, created_at, matchmaker_id, target_user_id, candidate_id, note_to_target, note_to_candidate, matchmaker:profiles!push_suggestions_matchmaker_id_fkey(*), target:profiles!push_suggestions_target_user_id_fkey(*), candidate:profiles!push_suggestions_candidate_id_fkey(*)',
      )
      .or(`target_user_id.eq.${userId},candidate_id.eq.${userId},matchmaker_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      const msg = String(error.message ?? '');
      if (error.code === '42P01' || msg.includes('push_suggestions')) {
        return { incomingTarget: [], incomingCandidate: [], byMatchmaker: [] };
      }
      return { incomingTarget: [], incomingCandidate: [], byMatchmaker: [] };
    }

    const toItem = (row: any) => ({
      id: row.id,
      pushRequestId: row.push_request_id,
      targetStatus: row.target_status,
      candidateStatus: row.candidate_status,
      finalStatus: row.final_status,
      createdAt: row.created_at,
      noteToTarget: row.note_to_target ?? undefined,
      noteToCandidate: row.note_to_candidate ?? undefined,
      matchmaker: this.toPublicUser(row.matchmaker),
      target: this.toPublicUser(row.target),
      candidate: this.toPublicUser(row.candidate),
    });

    return {
      incomingTarget: (data ?? []).filter((row: any) => row.target_user_id === userId).map(toItem),
      incomingCandidate: (data ?? []).filter((row: any) => row.candidate_id === userId).map(toItem),
      byMatchmaker: (data ?? []).filter((row: any) => row.matchmaker_id === userId).map(toItem),
    };
  },

  async respondToPushSuggestion(
    suggestionId: string,
    userId: string,
    action: 'accept' | 'decline',
  ) {
    const { data: suggestion, error: fetchErr } = await supabase
      .from('push_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .single();
    if (fetchErr || !suggestion) return { error: 'Suggestion not found' };
    if (suggestion.final_status !== 'pending') return { error: 'Suggestion already closed' };

    const isTarget = suggestion.target_user_id === userId;
    const isCandidate = suggestion.candidate_id === userId;
    if (!isTarget && !isCandidate) return { error: 'Unauthorized' };

    const next = action === 'accept' ? 'accepted' : 'declined';
    const patch: any = {};
    if (isTarget) patch.target_status = next;
    if (isCandidate) patch.candidate_status = next;
    if (action === 'decline') patch.final_status = 'declined';

    const targetStatus = isTarget ? next : suggestion.target_status;
    const candidateStatus = isCandidate ? next : suggestion.candidate_status;
    if (action === 'accept' && targetStatus === 'accepted' && candidateStatus === 'accepted') {
      patch.final_status = 'matched';
    }

    const { data: updated, error: updErr } = await supabase
      .from('push_suggestions')
      .update(patch)
      .eq('id', suggestionId)
      .select()
      .single();
    if (updErr || !updated) return { error: 'Failed to update suggestion' };

    let match: { id: string } | null = null;
    if (updated.final_status === 'matched') {
      const matchResult = await this.createOrGetMatch(updated.target_user_id, updated.candidate_id);
      if ('error' in matchResult) return { error: matchResult.error };
      match = matchResult.match;
    }

    await this.refreshPushRequestStatus(updated.push_request_id);
    return { suggestion: updated, match };
  },

  async refreshPushRequestStatus(pushRequestId: string) {
    const { data: rows } = await supabase
      .from('push_suggestions')
      .select('final_status')
      .eq('push_request_id', pushRequestId);
    if (!rows || rows.length === 0) return;

    const hasMatched = rows.some((r: any) => r.final_status === 'matched');
    const hasPending = rows.some((r: any) => r.final_status === 'pending');
    const nextStatus = hasMatched || !hasPending ? 'completed' : 'sent';
    await supabase
      .from('push_requests')
      .update({ status: nextStatus })
      .eq('id', pushRequestId);
  },

  async createPullRequest(requesterId: string, matchmakerId: string) {
    const [requester, matchmaker] = await Promise.all([
      this.getProfile(requesterId),
      this.getProfile(matchmakerId),
    ]);

    if (!requester || !matchmaker) {
      return { error: 'User not found' };
    }

    if (requesterId === matchmakerId) {
      return { error: 'Cannot request yourself' };
    }

    const { data: existingPending } = await supabase
      .from('pull_requests')
      .select('id')
      .eq('requester_id', requesterId)
      .eq('matchmaker_id', matchmakerId)
      .in('status', ['pending', 'active'])
      .maybeSingle();

    if (existingPending?.id) {
      return { error: 'Request already active' };
    }

    const { data: pullRequest, error } = await supabase
      .from('pull_requests')
      .insert({
        requester_id: requesterId,
        matchmaker_id: matchmakerId,
        status: 'pending',
      })
      .select()
      .single();

    if (error || !pullRequest) {
      return { error: 'Failed to create pull request' };
    }

    return { pullRequest };
  },

  async getPullRequests(userId: string) {
    const { data, error } = await supabase
      .from('pull_requests')
      .select(
        'id, requester_id, matchmaker_id, status, created_at, requester:profiles!pull_requests_requester_id_fkey(*), matchmaker:profiles!pull_requests_matchmaker_id_fkey(*)',
      )
      .or(`requester_id.eq.${userId},matchmaker_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error || !data) {
      if (error) {
        console.error('❌ Get pull requests error:', error.message);
      }
      return { incoming: [], outgoing: [] };
    }

    const incoming = data
      .filter((row: any) => row.matchmaker_id === userId)
      .map((row: any) => ({
        id: row.id,
        status: row.status,
        createdAt: row.created_at,
        requester: this.toPublicUser(row.requester),
        matchmaker: this.toPublicUser(row.matchmaker),
      }));

    const outgoing = data
      .filter((row: any) => row.requester_id === userId)
      .map((row: any) => ({
        id: row.id,
        status: row.status,
        createdAt: row.created_at,
        requester: this.toPublicUser(row.requester),
        matchmaker: this.toPublicUser(row.matchmaker),
      }));

    return { incoming, outgoing };
  },

  async updatePullRequestStatus(
    requestId: string,
    userId: string,
    action: 'activate' | 'complete',
  ) {
    const { data: request, error: requestError } = await supabase
      .from('pull_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      return { error: 'Request not found' };
    }

    const isMatchmaker = request.matchmaker_id === userId;
    const isRequester = request.requester_id === userId;
    if (!isMatchmaker && !isRequester) {
      return { error: 'Unauthorized' };
    }

    const nextStatus = action === 'activate' ? 'active' : 'completed';
    if (action === 'activate' && !isMatchmaker) {
      return { error: 'Only matchmaker can activate request' };
    }
    if (request.status === 'completed') {
      return { error: 'Request already completed' };
    }

    const { data: updated, error } = await supabase
      .from('pull_requests')
      .update({ status: nextStatus })
      .eq('id', requestId)
      .select()
      .single();

    if (error || !updated) {
      return { error: 'Failed to update pull request' };
    }

    return { pullRequest: updated };
  },

  async addPullSuggestion(
    pullRequestId: string,
    matchmakerId: string,
    candidateId: string,
    noteToRequester?: string,
    noteToCandidate?: string,
  ) {
    const { data: pullRequest, error: pullError } = await supabase
      .from('pull_requests')
      .select('*')
      .eq('id', pullRequestId)
      .single();

    if (pullError || !pullRequest) return { error: 'Pull request not found' };
    if (pullRequest.matchmaker_id !== matchmakerId) return { error: 'Unauthorized' };
    if (pullRequest.status === 'completed') return { error: 'Pull request already completed' };
    if (candidateId === pullRequest.requester_id) return { error: 'Cannot suggest requester' };

    const { data: candidate } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', candidateId)
      .maybeSingle();
    if (!candidate) return { error: 'Candidate not found' };

    const { data: suggestion, error } = await supabase
      .from('pull_suggestions')
      .insert({
        pull_request_id: pullRequestId,
        requester_id: pullRequest.requester_id,
        candidate_id: candidateId,
        matchmaker_id: matchmakerId,
        note_to_requester: noteToRequester ?? null,
        note_to_candidate: noteToCandidate ?? null,
      })
      .select()
      .single();

    if (error || !suggestion) {
      const message = String(error?.message ?? '');
      const relationMissing =
        error?.code === '42P01' ||
        message.toLowerCase().includes('relation') ||
        message.toLowerCase().includes('pull_suggestions');
      if (relationMissing) {
        return { error: 'Pull suggestions table missing. Run migration first.' };
      }
      if (error?.code === '23505') {
        return { error: 'Candidate already suggested in this request' };
      }
      return { error: 'Failed to add suggestion', details: message };
    }

    if (pullRequest.status === 'pending') {
      await supabase
        .from('pull_requests')
        .update({ status: 'active' })
        .eq('id', pullRequestId);
    }

    return { suggestion };
  },

  async getPullSuggestions(userId: string) {
    const { data, error } = await supabase
      .from('pull_suggestions')
      .select(
        'id, pull_request_id, requester_id, candidate_id, matchmaker_id, requester_status, candidate_status, final_status, note_to_requester, note_to_candidate, created_at, requester:profiles!pull_suggestions_requester_id_fkey(*), candidate:profiles!pull_suggestions_candidate_id_fkey(*), matchmaker:profiles!pull_suggestions_matchmaker_id_fkey(*)',
      )
      .or(
        `requester_id.eq.${userId},candidate_id.eq.${userId},matchmaker_id.eq.${userId}`,
      )
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        return { incomingRequester: [], incomingCandidate: [], byMatchmaker: [] };
      }
      return { incomingRequester: [], incomingCandidate: [], byMatchmaker: [] };
    }

    const mapRow = (row: any) => ({
      id: row.id,
      pullRequestId: row.pull_request_id,
      requesterStatus: row.requester_status,
      candidateStatus: row.candidate_status,
      finalStatus: row.final_status,
      noteToRequester: row.note_to_requester,
      noteToCandidate: row.note_to_candidate,
      createdAt: row.created_at,
      requester: this.toPublicUser(row.requester),
      candidate: this.toPublicUser(row.candidate),
      matchmaker: this.toPublicUser(row.matchmaker),
    });

    return {
      incomingRequester: (data ?? [])
        .filter((row: any) => row.requester_id === userId)
        .map(mapRow),
      incomingCandidate: (data ?? [])
        .filter((row: any) => row.candidate_id === userId)
        .map(mapRow),
      byMatchmaker: (data ?? [])
        .filter((row: any) => row.matchmaker_id === userId)
        .map(mapRow),
    };
  },

  async respondToPullSuggestion(
    suggestionId: string,
    userId: string,
    action: 'accept' | 'decline',
  ) {
    const { data: suggestion, error: fetchError } = await supabase
      .from('pull_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .single();

    if (fetchError || !suggestion) return { error: 'Suggestion not found' };
    if (suggestion.final_status !== 'pending') return { error: 'Suggestion already closed' };

    const isRequester = suggestion.requester_id === userId;
    const isCandidate = suggestion.candidate_id === userId;
    if (!isRequester && !isCandidate) return { error: 'Unauthorized' };

    const next = action === 'accept' ? 'accepted' : 'declined';
    const patch: any = {};
    if (isRequester) patch.requester_status = next;
    if (isCandidate) patch.candidate_status = next;

    if (action === 'decline') {
      patch.final_status = 'declined';
    }

    const prospectiveRequesterStatus = isRequester ? next : suggestion.requester_status;
    const prospectiveCandidateStatus = isCandidate ? next : suggestion.candidate_status;
    if (
      action === 'accept' &&
      prospectiveRequesterStatus === 'accepted' &&
      prospectiveCandidateStatus === 'accepted'
    ) {
      patch.final_status = 'matched';
    }

    const { data: updated, error: updateError } = await supabase
      .from('pull_suggestions')
      .update(patch)
      .eq('id', suggestionId)
      .select()
      .single();

    if (updateError || !updated) return { error: 'Failed to update suggestion' };

    if (updated.final_status === 'matched') {
      const matchResult = await this.createOrGetMatch(
        updated.requester_id,
        updated.candidate_id,
      );
      if ('error' in matchResult) {
        return { error: 'Suggestion accepted but failed to create match' };
      }
      return { suggestion: updated, match: matchResult.match };
    }

    return { suggestion: updated, match: null };
  },

  async createOrGetMatch(userAId: string, userBId: string) {
    const [user1Id, user2Id] = [userAId, userBId].sort();

    const { data: existing } = await supabase
      .from('matches')
      .select('id')
      .eq('user1_id', user1Id)
      .eq('user2_id', user2Id)
      .maybeSingle();

    if (existing) {
      return { match: { id: existing.id } };
    }

    const { data: match, error } = await supabase
      .from('matches')
      .insert({
        user1_id: user1Id,
        user2_id: user2Id,
      })
      .select('id')
      .single();

    if (error || !match) {
      return { error: 'Failed to create match' };
    }

    return { match: { id: match.id } };
  },

  toPublicUser(profile: any): PublicUser {
    return {
      id: profile.id,
      name: profile.name,
      relationshipStatus: profile.relationship_status,
      photo: profile.photo,
      bio: profile.bio,
      age: profile.age,
      gender: profile.gender,
      lookingFor: profile.looking_for,
    };
  },

  async unmatch(matchId: string, userId: string): Promise<{ ok: boolean } | { error: string }> {
    const { data: match, error: fetchError } = await supabase
      .from('matches')
      .select('id, user1_id, user2_id')
      .eq('id', matchId)
      .maybeSingle();

    if (fetchError || !match) return { error: 'Match not found' };
    if (match.user1_id !== userId && match.user2_id !== userId) return { error: 'Unauthorized' };

    const { error } = await supabase.from('matches').delete().eq('id', matchId);
    if (error) return { error: 'Failed to unmatch' };
    return { ok: true };
  },

  async blockUser(blockerId: string, blockedId: string): Promise<{ ok: boolean } | { error: string }> {
    if (blockerId === blockedId) return { error: 'Cannot block yourself' };
    const { error } = await supabase
      .from('blocked_users')
      .insert({ blocker_id: blockerId, blocked_id: blockedId })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') return { ok: true }; // already blocked
      if (error.code === '42P01') return { ok: true }; // table doesn't exist yet, graceful
      return { error: 'Failed to block user' };
    }
    return { ok: true };
  },

  async unblockUser(blockerId: string, blockedId: string): Promise<{ ok: boolean }> {
    await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);
    return { ok: true };
  },

  async getBlockedIds(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('blocked_users')
      .select('blocked_id')
      .eq('blocker_id', userId);

    if (error) {
      if (error.code === '42P01') return []; // table doesn't exist yet
      return [];
    }
    return (data ?? []).map((r: any) => r.blocked_id);
  },

  async findProfileByPhone(phone: string): Promise<PublicUser | null> {
    const normalized = phone.replace(/\s+/g, '').replace(/^00/, '+');
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', normalized)
      .maybeSingle();

    if (error || !data) return null;
    return this.toPublicUser(data);
  },
};
