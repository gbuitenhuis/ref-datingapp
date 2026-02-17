import { supabase } from './supabase.js';
import type { PublicUser, RelationshipStatus, SwipeDirection } from './types.js';

export const store = {
  async register(
    email: string,
    password: string,
    name: string,
    relationshipStatus: RelationshipStatus,
  ) {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      return null;
    }

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
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return null;
    }

    // Generate a simple token (user ID for now)
    const token = authData.user.id;

    return {
      user: this.toPublicUser(profile),
      token,
    };
  },

  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return null;
    }

    const profile = await this.getProfile(data.user.id);
    if (!profile) return null;

    return {
      user: profile,
      token: data.user.id,
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

  async getDiscovery(userId: string): Promise<PublicUser[] | null> {
    const profile = await this.getProfile(userId);
    if (!profile) return null;

    // Get all user IDs this user has already swiped on
    const { data: swipes } = await supabase
      .from('swipes')
      .select('to_user_id')
      .eq('from_user_id', userId);

    const swipedIds = new Set(swipes?.map((s) => s.to_user_id) || []);

    // Get single users that haven't been swiped on yet
    const { data: candidates, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('relationship_status', 'single')
      .neq('id', userId);

    if (error || !candidates) return [];

    return candidates
      .filter((c) => !swipedIds.has(c.id))
      .map(this.toPublicUser);
  },

  async addSwipe(
    fromUserId: string,
    toUserId: string,
    direction: SwipeDirection,
  ): Promise<{ match: { id: string } | null } | { error: string }> {
    // Verify both users exist
    const [fromUser, toUser] = await Promise.all([
      this.getProfile(fromUserId),
      this.getProfile(toUserId),
    ]);

    if (!fromUser || !toUser) {
      return { error: 'User not found' };
    }

    // Record the swipe
    const { error: swipeError } = await supabase.from('swipes').insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      direction,
    });

    if (swipeError) {
      return { error: 'Failed to record swipe' };
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
      .single();

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

    if (matchError || !match) {
      return { match: null };
    }

    return { match: { id: match.id } };
  },

  async getMatches(userId: string) {
    const { data: matches, error } = await supabase
      .from('matches')
      .select('*, profiles!matches_user1_id_fkey(*), profiles!matches_user2_id_fkey(*)')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    if (error || !matches) return [];

    return matches.map((match: any) => {
      const otherUser =
        match.user1_id === userId
          ? match.profiles[1] || match.profiles
          : match.profiles[0] || match.profiles;

      return {
        id: match.id,
        createdAt: match.created_at,
        otherUser: this.toPublicUser(otherUser),
      };
    });
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

  async createPullRequest(requesterId: string, matchmakerId: string) {
    const [requester, matchmaker] = await Promise.all([
      this.getProfile(requesterId),
      this.getProfile(matchmakerId),
    ]);

    if (!requester || !matchmaker) {
      return { error: 'User not found' };
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

  toPublicUser(profile: any): PublicUser {
    return {
      id: profile.id,
      name: profile.name,
      relationshipStatus: profile.relationship_status,
      photo: profile.photo,
      bio: profile.bio,
      age: profile.age,
    };
  },
};
