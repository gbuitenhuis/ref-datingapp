export type RelationshipStatus = 'single' | 'not-single';
export type Gender = 'man' | 'woman' | 'non-binary';
export type LookingFor = 'men' | 'women' | 'everyone';

export interface User {
  id: string;
  name: string;
  photo: string;
  relationshipStatus: RelationshipStatus;
  email?: string;
  phone?: string;
  bio?: string;
  age?: number;
  gender?: Gender;
  lookingFor?: LookingFor;
}

export interface Friend extends User {
  invitedBy?: string;
  mutualFriendsCount?: number;
  friendsOfFriend?: User[];
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

export interface FriendRequest {
  id: string;
  from: User;
  to: User;
  status: FriendRequestStatus;
  createdAt: Date;
}

export interface Match {
  id: string;
  user: User;
  matchedBy: User;
  status: 'pending' | 'liked' | 'passed' | 'matched';
  createdAt: Date;
}

export interface PushRequest {
  id: string;
  matchmaker: User;
  target: User;
  candidates: User[];
  status: 'sent' | 'completed';
  role?: 'matchmaker' | 'participant';
  createdAt: Date;
}

export interface PushSuggestion {
  id: string;
  pushRequestId: string;
  matchmaker: User;
  target: User;
  candidate: User;
  noteToTarget?: string;
  noteToCandidate?: string;
  targetStatus: 'pending' | 'accepted' | 'declined';
  candidateStatus: 'pending' | 'accepted' | 'declined';
  finalStatus: 'pending' | 'matched' | 'declined';
  createdAt: Date;
}

export interface PullRequest {
  id: string;
  requester: User;
  matchmaker: User;
  suggestions: User[];
  status: 'pending' | 'active' | 'completed';
  role?: 'incoming' | 'outgoing';
  createdAt: Date;
}

export interface PullSuggestion {
  id: string;
  pullRequestId: string;
  requester: User;
  candidate: User;
  matchmaker: User;
  noteToRequester?: string;
  noteToCandidate?: string;
  requesterStatus: 'pending' | 'accepted' | 'declined';
  candidateStatus: 'pending' | 'accepted' | 'declined';
  finalStatus: 'pending' | 'matched' | 'declined';
  createdAt: Date;
}
