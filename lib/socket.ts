'use client';

import { io, Socket } from 'socket.io-client';
import { ChatMessage, OnlineUser } from './types';

class SocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(userId: string) {
    if (this.socket?.connected) return this.socket;

    const socketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001';
    
    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      auth: {
        userId,
      },
    });

    this.setupEventListeners();
    return this.socket;
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔌 Connected to WebSocket server');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from WebSocket server:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error);
      this.handleReconnect();
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    }
  }

  joinRoom(roomId: string, user: { id: string; username: string }) {
    this.socket?.emit('join-room', { roomId, user });
  }

  leaveRoom(roomId: string) {
    this.socket?.emit('leave-room', { roomId });
  }

  sendMessage(roomId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) {
    this.socket?.emit('send-message', { roomId, message });
  }

  onNewMessage(callback: (message: ChatMessage) => void) {
    this.socket?.on('new-message', callback);
  }

  onUserJoined(callback: (data: { roomId: string; user: OnlineUser }) => void) {
    this.socket?.on('user-joined', callback);
  }

  onUserLeft(callback: (data: { roomId: string; userId: string }) => void) {
    this.socket?.on('user-left', callback);
  }

  onTyping(callback: (data: { roomId: string; user: { id: string; username: string } }) => void) {
    this.socket?.on('user-typing', callback);
  }

  onStoppedTyping(callback: (data: { roomId: string; userId: string }) => void) {
    this.socket?.on('user-stopped-typing', callback);
  }

  startTyping(roomId: string) {
    this.socket?.emit('typing-start', { roomId });
  }

  stopTyping(roomId: string) {
    this.socket?.emit('typing-stop', { roomId });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  removeAllListeners() {
    this.socket?.removeAllListeners();
  }
}

export const socketManager = new SocketManager();