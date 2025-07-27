import { User, Room, RoomMember, Session, Role } from './generated/prisma';

export type { User, Room, RoomMember, Session, Role };

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  text: string;
  timestamp: number;
  type: 'TEXT' | 'IMAGE' | 'FILE';
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  emoji: string;
  userId: string;
  username: string;
}

export interface OnlineUser {
  id: string;
  username: string;
  avatar?: string;
  lastSeen: number;
}

export interface TypingIndicator {
  userId: string;
  username: string;
  roomId: string;
}

export interface Notification {
  id: string;
  type: 'MESSAGE' | 'MENTION' | 'ROOM_INVITE' | 'SYSTEM';
  title: string;
  message: string;
  roomId?: string;
  userId?: string;
  timestamp: number;
  read: boolean;
}

export interface RoomWithMembers extends Room {
  members?: (RoomMember & { 
    user: Pick<User, 'id' | 'username' | 'name' | 'avatar'> 
  })[];
  owner?: Pick<User, 'id' | 'username' | 'name' | 'avatar'>;
  _count?: {
    members: number;
  };
}

export interface UserSession {
  id: string;
  username: string;
  email: string;
  name?: string;
  avatar?: string;
}

export interface WebSocketEvents {
  'join-room': { roomId: string; userId: string };
  'leave-room': { roomId: string; userId: string };
  'send-message': { roomId: string; message: ChatMessage };
  'typing-start': { roomId: string; userId: string; username: string };
  'typing-stop': { roomId: string; userId: string };
  'add-reaction': { messageId: string; emoji: string; userId: string };
  'user-joined': { roomId: string; user: OnlineUser };
  'user-left': { roomId: string; userId: string };
  'new-message': { roomId: string; message: ChatMessage };
  'user-typing': { roomId: string; user: TypingIndicator };
  'reaction-added': { messageId: string; reaction: MessageReaction };
  'presence-update': { userId: string; status: 'online' | 'offline' };
}