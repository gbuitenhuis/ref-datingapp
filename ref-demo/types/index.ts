export type RelationshipStatus = 'single' | 'not-single';

export interface User {
  id: string;
  name: string;
  photo: string;
  relationshipStatus: RelationshipStatus;
  bio?: string;
  age?: number;
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
  person1: User;
  person2: User;
  status: 'pending' | 'completed';
  createdAt: Date;
}

export interface PullRequest {
  id: string;
  requester: User;
  matchmaker: User;
  suggestions: User[];
  status: 'pending' | 'active' | 'completed';
  createdAt: Date;
}
