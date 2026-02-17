import { Friend, FriendRequest, User } from '@/types';

const dayMs = 24 * 60 * 60 * 1000;

const baseUsers: User[] = [
  {
    id: 'friend-1',
    name: 'Emma',
    photo: 'https://i.pravatar.cc/300?img=47',
    relationshipStatus: 'not-single',
    bio: 'Coffee lover and weekend hiker.',
    age: 29,
  },
  {
    id: 'friend-2',
    name: 'Noah',
    photo: 'https://i.pravatar.cc/300?img=12',
    relationshipStatus: 'not-single',
    bio: 'Matchmaker-in-chief.',
    age: 31,
  },
  {
    id: 'friend-3',
    name: 'Mia',
    photo: 'https://i.pravatar.cc/300?img=8',
    relationshipStatus: 'not-single',
    bio: 'Writes poems. Loves dogs.',
    age: 27,
  },
  {
    id: 'friend-4',
    name: 'Sophie',
    photo: 'https://i.pravatar.cc/300?img=32',
    relationshipStatus: 'single',
    bio: 'Bakes sourdough for fun.',
    age: 26,
  },
  {
    id: 'friend-5',
    name: 'Lucas',
    photo: 'https://i.pravatar.cc/300?img=15',
    relationshipStatus: 'single',
    bio: 'Live music every Friday.',
    age: 28,
  },
  {
    id: 'friend-6',
    name: 'David',
    photo: 'https://i.pravatar.cc/300?img=56',
    relationshipStatus: 'single',
    bio: 'Always down for ramen.',
    age: 30,
  },
  {
    id: 'friend-7',
    name: 'Isabella',
    photo: 'https://i.pravatar.cc/300?img=65',
    relationshipStatus: 'single',
    bio: 'Architect. Loves art galleries.',
    age: 27,
  },
  {
    id: 'friend-8',
    name: 'Oliver',
    photo: 'https://i.pravatar.cc/300?img=70',
    relationshipStatus: 'not-single',
    bio: 'Cyclist and espresso nerd.',
    age: 32,
  },
];

const friendsOfFriend: User[] = [
  {
    id: 'fof-1',
    name: 'Ava',
    photo: 'https://i.pravatar.cc/300?img=22',
    relationshipStatus: 'single',
    bio: 'Sunrise runs and matcha.',
    age: 26,
  },
  {
    id: 'fof-2',
    name: 'James',
    photo: 'https://i.pravatar.cc/300?img=38',
    relationshipStatus: 'single',
    bio: 'Photographer. Loves road trips.',
    age: 29,
  },
  {
    id: 'fof-3',
    name: 'Charlotte',
    photo: 'https://i.pravatar.cc/300?img=44',
    relationshipStatus: 'single',
    bio: 'Yoga, tea, and good books.',
    age: 28,
  },
  {
    id: 'fof-4',
    name: 'William',
    photo: 'https://i.pravatar.cc/300?img=6',
    relationshipStatus: 'single',
    bio: 'Sunday brunch professional.',
    age: 30,
  },
];

export const mockFriends: Friend[] = [
  {
    ...baseUsers[0],
    mutualFriendsCount: 4,
    friendsOfFriend: [friendsOfFriend[0], friendsOfFriend[1]],
  },
  {
    ...baseUsers[1],
    mutualFriendsCount: 3,
    friendsOfFriend: [friendsOfFriend[0], friendsOfFriend[2]],
  },
  {
    ...baseUsers[2],
    mutualFriendsCount: 2,
    friendsOfFriend: [friendsOfFriend[1], friendsOfFriend[2], friendsOfFriend[3]],
  },
  {
    ...baseUsers[3],
    mutualFriendsCount: 1,
  },
  {
    ...baseUsers[4],
    mutualFriendsCount: 2,
  },
  {
    ...baseUsers[5],
    mutualFriendsCount: 1,
  },
  {
    ...baseUsers[6],
    mutualFriendsCount: 2,
  },
  {
    ...baseUsers[7],
    mutualFriendsCount: 3,
  },
];

export const mockFriendRequests: FriendRequest[] = [
  {
    id: 'request-1',
    from: friendsOfFriend[0],
    to: baseUsers[0],
    status: 'pending',
    createdAt: new Date(Date.now() - dayMs),
  },
  {
    id: 'request-2',
    from: friendsOfFriend[3],
    to: baseUsers[1],
    status: 'pending',
    createdAt: new Date(Date.now() - dayMs / 2),
  },
];

export const mockCurrentUser: User = {
  id: 'current-user',
  name: 'Alex',
  photo: 'https://i.pravatar.cc/300?img=4',
  relationshipStatus: 'single',
  bio: 'Looking for someone to explore the city with.',
  age: 27,
};
