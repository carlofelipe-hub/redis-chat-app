'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ChatMessage, UserSession } from '@/lib/types';

interface UseSocketProps {
  user: UserSession;
  roomId: string;
  onNewMessage?: (message: ChatMessage) => void;
  onUserJoined?: (data: { userId: string; username: string; timestamp: number }) => void;
  onUserLeft?: (data: { userId: string; username: string; timestamp: number }) => void;
  onUserTyping?: (data: { userId: string; username: string; isTyping: boolean }) => void;
}

export function useSocket({
  user,
  roomId,
  onNewMessage,
  onUserJoined,
  onUserLeft,
  onUserTyping,
}: UseSocketProps) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // Store latest callbacks in refs to avoid recreating socket connection
  const onNewMessageRef = useRef(onNewMessage);
  const onUserJoinedRef = useRef(onUserJoined);
  const onUserLeftRef = useRef(onUserLeft);
  const onUserTypingRef = useRef(onUserTyping);

  // Update refs when callbacks change
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onUserJoinedRef.current = onUserJoined;
    onUserLeftRef.current = onUserLeft;
    onUserTypingRef.current = onUserTyping;
  });

  useEffect(() => {
    // Prevent creating multiple connections
    if (socketRef.current?.connected) {
      console.log('⚠️ Socket already connected, skipping connection attempt');
      return;
    }

    // Create socket connection
    const socketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001';
    console.log('🔌 Connecting to WebSocket server:', socketUrl);
    
    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
      forceNew: true, // Force a new connection
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
      setIsConnected(true);
      
      // Join the room
      socket.emit('join-room', {
        roomId,
        userId: user.id,
        username: user.username,
      });
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from WebSocket server');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      setIsConnected(false);
    });

    // Message events
    socket.on('new-message', (message: ChatMessage) => {
      console.log('📨 New message received:', message);
      onNewMessageRef.current?.(message);
    });

    // User presence events
    socket.on('user-joined', (data) => {
      console.log('👋 User joined:', data.username);
      setOnlineUsers(prev => new Set([...prev, data.userId]));
      onUserJoinedRef.current?.(data);
    });

    socket.on('user-left', (data) => {
      console.log('👋 User left:', data.username);
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
      onUserLeftRef.current?.(data);
    });

    // Typing events
    socket.on('user-typing', (data) => {
      onUserTypingRef.current?.(data);
    });

    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up socket connection');
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [user.id, roomId]); // Only depend on stable values

  // Send message function
  const sendMessage = (message: ChatMessage) => {
    if (!socketRef.current?.connected) {
      console.warn('⚠️ Socket not connected, cannot send message');
      return false;
    }

    console.log('📤 Sending message via WebSocket:', message);
    socketRef.current.emit('send-message', {
      roomId,
      message,
    });
    return true;
  };

  // Typing indicators
  const startTyping = () => {
    if (!socketRef.current?.connected) return;
    
    socketRef.current.emit('typing-start', {
      roomId,
      userId: user.id,
      username: user.username,
    });
  };

  const stopTyping = () => {
    if (!socketRef.current?.connected) return;
    
    socketRef.current.emit('typing-stop', {
      roomId,
      userId: user.id,
      username: user.username,
    });
  };

  return {
    isConnected,
    onlineUsers,
    sendMessage,
    startTyping,
    stopTyping,
  };
}