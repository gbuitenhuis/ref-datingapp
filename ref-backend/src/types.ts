export type RelationshipStatus = 'single' | 'not-single';
export type SwipeDirection = 'like' | 'pass';
export type Gender = 'man' | 'woman' | 'non-binary';
export type LookingFor = 'men' | 'women' | 'everyone';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  relationshipStatus: RelationshipStatus;
  photo?: string;
  bio?: string;
  age?: number;
  gender?: Gender;
  lookingFor?: LookingFor;
  createdAt: string;
}

export interface Match {
  id: string;
  users: [string, string];
  createdAt: string;
}

export interface Swipe {
  fromUserId: string;
  toUserId: string;
  direction: SwipeDirection;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  name: string;
  relationshipStatus: RelationshipStatus;
  photo?: string;
  bio?: string;
  age?: number;
  gender?: Gender;
  lookingFor?: LookingFor;
}
