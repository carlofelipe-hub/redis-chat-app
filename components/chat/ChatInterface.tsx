"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserSession, RoomWithMembers, ChatMessage } from '@/lib/types';
import { Send, Hash, Users, UserPlus, Wifi, WifiOff, Plus, Settings, MoreHorizontal, Zap, Sparkles, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useSocket } from '@/hooks/useSocket';
import CreateRoomDialog from './CreateRoomDialog';
import BrowseRoomsDialog from './BrowseRoomsDialog';
import RoomSettingsDialog from './RoomSettingsDialog';
import UserProfileDialog from './UserProfileDialog';

interface ChatInterfaceProps {
  user: UserSession;
  currentRoom: RoomWithMembers;
  allRooms: RoomWithMembers[];
}

export default function ChatInterface({ user, currentRoom, allRooms }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [canSendMessages, setCanSendMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebSocket connection
  const { isConnected, onlineUsers, sendMessage: sendSocketMessage, startTyping, stopTyping } = useSocket({
    user,
    roomId: currentRoom.id,
    onNewMessage: (message) => {
      console.log('📨 Received new message:', message);
      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
      scrollToBottom();
    },
    onUserJoined: (data) => {
      toast.success(`${data.username} joined the room`);
    },
    onUserLeft: (data) => {
      toast.info(`${data.username} left the room`);
    },
    onUserTyping: (data) => {
      if (data.userId === user.id) return; // Don't show own typing
      
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (data.isTyping) {
          newSet.add(data.username);
        } else {
          newSet.delete(data.username);
        }
        return newSet;
      });
      
      // Auto-remove typing indicator after 3 seconds
      if (data.isTyping) {
        setTimeout(() => {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(data.username);
            return newSet;
          });
        }, 3000);
      }
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = useCallback(async () => {
    try {
      console.log('Loading messages for room:', currentRoom.id);
      const response = await fetch(`/api/rooms/${currentRoom.id}/messages`);
      console.log('Messages API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Messages loaded successfully, count:', data.messages?.length || 0);
        setMessages(data.messages || []);
        setCanSendMessages(true); // If we can load messages, we can send them
        console.log('Can send messages set to true');
        
        // Scroll to bottom after loading messages
        setTimeout(() => scrollToBottom(), 100);
      } else if (response.status === 403) {
        // Not a member
        console.log('403 response - not a member');
        setCanSendMessages(false);
        setMessages([]);
      } else {
        console.log('Unexpected response status:', response.status);
        const errorData = await response.text();
        console.log('Error response:', errorData);
        setCanSendMessages(false);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
      setCanSendMessages(false);
    }
  }, [currentRoom.id]);

  // Load messages for current room
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || isLoading) return;

    setIsLoading(true);
    
    try {
      const messageId = crypto.randomUUID();
      const timestamp = Date.now();
      
      const message: ChatMessage = {
        id: messageId,
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        text: newMessage.trim(),
        timestamp,
        type: 'TEXT',
      };

      // Try WebSocket first, fallback to HTTP
      if (isConnected && sendSocketMessage(message)) {
        console.log('✅ Message sent via WebSocket');
        setNewMessage('');
        
        // Add message to local state immediately for responsive UI
        setMessages(prev => [...prev, message]);
        scrollToBottom();
      } else {
        console.log('📡 WebSocket not available, using HTTP fallback');
        
        // HTTP fallback
        const response = await fetch(`/api/rooms/${currentRoom.id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: newMessage.trim(),
            type: 'TEXT',
          }),
        });

        if (response.ok) {
          setNewMessage('');
          // Reload messages to see the new one
          await loadMessages();
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to send message');
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
      stopTyping(); // Stop typing indicator
    }
  };

  const joinRoom = async () => {
    setIsJoining(true);
    try {
      console.log('Attempting to join room:', currentRoom.id);
      const response = await fetch(`/api/rooms/${currentRoom.id}/join-simple`, {
        method: 'POST',
      });

      console.log('Join response status:', response.status);

      if (response.ok) {
        toast.success('Successfully joined room!');
        console.log('Join successful, reloading messages...');
        // Reload messages to update membership status
        await loadMessages();
      } else {
        const error = await response.json();
        console.log('Join failed:', error);
        toast.error(error.error || 'Failed to join room');
      }
    } catch (error) {
      console.error('Failed to join room:', error);
      toast.error('Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  // Handle typing indicators
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    // Typing indicators
    if (value.trim() && canSendMessages) {
      startTyping();
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 2 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 2000);
    } else {
      stopTyping();
    }
  };

  // Use canSendMessages as the membership indicator
  const isMember = canSendMessages;

  // Debug logging
  useEffect(() => {
    console.log('Chat state update:', {
      canSendMessages,
      isMember,
      messagesCount: messages.length,
      roomId: currentRoom.id
    });
  }, [canSendMessages, isMember, messages.length, currentRoom.id]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex h-screen overflow-hidden cyber-grid" style={{ background: 'var(--chat-bg)' }}>
      {/* Left Sidebar - Room List */}
      <aside className="hidden md:flex w-60 lg:w-64 glass-strong border-r border-[var(--sidebar-border)] flex-col relative">
        {/* Server Header with gradient */}
        <div className="h-14 flex items-center justify-between px-3 lg:px-4 border-b border-[var(--sidebar-border)] bg-gradient-primary relative overflow-hidden">
          <div className="flex items-center gap-2 z-10">
            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <h2 className="font-bold text-sm text-white">Redis Chat</h2>
          </div>
          <div className="flex items-center gap-1 z-10">
            <CreateRoomDialog>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/80 hover:text-white hover:bg-white/20 btn-glow">
                <Plus className="h-3 w-3" />
              </Button>
            </CreateRoomDialog>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/80 hover:text-white hover:bg-white/20 btn-glow">
              <Settings className="h-3 w-3" />
            </Button>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 animate-pulse-soft"></div>
        </div>

        {/* Rooms Section */}
        <div className="flex-1 overflow-hidden p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-accent" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Channels
              </span>
            </div>
            <CreateRoomDialog>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 btn-minimal hover-glow">
                <Plus className="h-3 w-3" />
              </Button>
            </CreateRoomDialog>
          </div>
          
          <ScrollArea className="h-[calc(100vh-14rem)]">
            <div className="space-y-1">
              {allRooms.map((room) => (
                <a
                  key={room.id}
                  href={`/chat/${room.id}`}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 hover-lift ${
                    room.id === currentRoom.id
                      ? 'glass bg-gradient-to-r from-primary/20 to-accent/10 text-white border-primary/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/5'
                  }`}
                >
                  <Hash className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium truncate">{room.name}</span>
                  {room._count?.members && room._count.members > 0 && (
                    <Badge variant="secondary" className="text-xs ml-auto bg-primary/20 border-primary/30 text-primary-foreground">
                      {room._count.members}
                    </Badge>
                  )}
                </a>
              ))}
            </div>
          </ScrollArea>
          
          {/* Browse More Rooms */}
          <div className="px-3 pt-2">
            <BrowseRoomsDialog currentRoomId={currentRoom.id}>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/5 transition-all duration-300"
              >
                <Search className="h-4 w-4" />
                <span className="text-sm">Browse More Rooms</span>
              </Button>
            </BrowseRoomsDialog>
          </div>
        </div>

        {/* User Area with gradient */}
        <div className="h-16 glass-strong border-t border-[var(--sidebar-border)] flex items-center px-3 bg-gradient-to-r from-primary/10 to-accent/10">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative">
              <Avatar className="h-9 w-9 ring-2 ring-primary/30">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="text-sm bg-gradient-primary text-white">
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 status-online border-2 border-[var(--chat-sidebar)] rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{user.username}</p>
              <p className="text-xs text-primary">Connected</p>
            </div>
            <UserProfileDialog user={user}>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 btn-minimal hover-glow">
                <Settings className="h-3 w-3" />
              </Button>
            </UserProfileDialog>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative" style={{ background: 'var(--chat-bg)' }}>
        {/* Chat Header with glassmorphism */}
        <header className="h-14 glass-strong border-b border-[var(--sidebar-border)] backdrop-blur-xl relative overflow-hidden">
          <div className="h-full flex items-center justify-between px-3 md:px-4 z-10">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-1.5 bg-gradient-primary rounded-lg">
                <Hash className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-semibold text-foreground truncate text-sm leading-tight">{currentRoom.name}</h1>
                {currentRoom.description && (
                  <p className="hidden sm:block text-xs text-muted-foreground truncate max-w-xs lg:max-w-sm opacity-80 mt-0.5">
                    {currentRoom.description}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 glass rounded-full">
                {isConnected ? (
                  <div className="flex items-center gap-2 text-[var(--online-indicator)]">
                    <div className="w-2 h-2 status-online rounded-full animate-pulse"></div>
                    <span className="hidden md:inline text-xs font-medium">Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-destructive">
                    <div className="w-2 h-2 bg-destructive rounded-full"></div>
                    <span className="hidden md:inline text-xs font-medium">Disconnected</span>
                  </div>
                )}
              </div>
              
              {!isMember && (
                <Button
                  onClick={joinRoom}
                  disabled={isJoining}
                  className="btn-gradient h-8 px-3 md:px-4 text-xs font-semibold hover-glow"
                >
                  <UserPlus className="h-3 w-3 md:mr-2" />
                  <span className="hidden md:inline">{isJoining ? 'Joining...' : 'Join Room'}</span>
                </Button>
              )}
              
              <RoomSettingsDialog room={currentRoom} user={user}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 btn-minimal hover-glow">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </RoomSettingsDialog>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 scan-line"></div>
        </header>

        {/* Messages Container with chat bubbles */}
        <div className="flex-1 overflow-hidden relative">
          <ScrollArea className="h-full">
            <div className="p-4 md:p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 md:h-96 text-center animate-fade-in px-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-primary rounded-2xl flex items-center justify-center mb-6 floating">
                    <Hash className="h-8 w-8 md:h-10 md:w-10 text-white" />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-foreground mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Welcome to #{currentRoom.name}
                  </h3>
                  <p className="text-sm md:text-base text-muted-foreground max-w-lg leading-relaxed">
                    This is the beginning of your conversation in #{currentRoom.name}. 
                    {currentRoom.description && ` ${currentRoom.description}`}
                  </p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const prevMessage = index > 0 ? messages[index - 1] : null;
                  const isOwnMessage = message.userId === user.id;
                  const showAvatar = !prevMessage || prevMessage.userId !== message.userId || 
                    (message.timestamp - prevMessage.timestamp) > 300000; // 5 minutes
                  
                  return (
                    <div
                      key={message.id}
                      className={`group animate-fade-in ${
                        showAvatar ? 'mt-6' : 'mt-2'
                      } flex justify-start`}
                    >
                      <div className="flex gap-3 max-w-[80%] md:max-w-[70%]">
                        {showAvatar && (
                          <Avatar className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0 ring-2 ring-primary/20">
                            <AvatarImage src={message.avatar} />
                            <AvatarFallback className="text-xs md:text-sm bg-gradient-secondary text-white">
                              {message.username?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className={`flex flex-col items-start ${!showAvatar ? 'ml-11 md:ml-13' : ''} relative group`}>
                          {showAvatar && (
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-foreground text-sm">
                                {isOwnMessage ? 'You' : message.username}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(message.timestamp)}
                              </span>
                            </div>
                          )}
                          
                          {!showAvatar && (
                            <div className="absolute -top-10 -right-4 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out pointer-events-none z-10">
                              <span className="text-xs text-foreground bg-gradient-to-r from-primary/90 to-accent/90 px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg border border-primary/20 whitespace-nowrap">
                                {formatTime(message.timestamp)}
                              </span>
                            </div>
                          )}
                          
                          <div className="relative">
                            <p className="text-sm text-foreground leading-relaxed break-words">
                              {message.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              
              {/* Typing indicators */}
              {typingUsers.size > 0 && (
                <div className="flex gap-3 animate-fade-in">
                  <div className="h-10 w-10 bg-gradient-secondary rounded-full flex items-center justify-center">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <p className="text-sm text-muted-foreground italic">
                      <strong>{Array.from(typingUsers).join(', ')}</strong> {typingUsers.size === 1 ? 'is' : 'are'} typing...
                    </p>
                  </div>
                </div>
              )}
              
              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Message Input with glassmorphism */}
        <div className="p-4 md:p-6 glass-strong border-t border-[var(--sidebar-border)]">
          {isMember ? (
            <form onSubmit={sendMessage} className="relative">
              <div className="glass rounded-2xl p-1 backdrop-blur-xl">
                <Input
                  value={newMessage}
                  onChange={handleInputChange}
                  placeholder={`Message #${currentRoom.name}`}
                  className="w-full bg-transparent border-0 rounded-xl px-4 py-3 pr-14 text-sm placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={isLoading}
                  maxLength={1000}
                />
                <Button
                  type="submit"
                  disabled={!newMessage.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 p-0 btn-gradient hover-glow"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          ) : (
            <div className="text-center py-4 glass rounded-2xl">
              <p className="text-muted-foreground text-sm mb-3">
                You need to join this room to send messages
              </p>
              <Button
                onClick={joinRoom}
                disabled={isJoining}
                className="btn-gradient hover-glow"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {isJoining ? 'Joining...' : 'Join Room'}
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Right Sidebar - Members */}
      <aside className="hidden lg:flex w-60 xl:w-64 glass-strong border-l border-[var(--sidebar-border)] flex-col">
        {/* Members Header */}
        <div className="h-14 flex items-center px-3 xl:px-4 border-b border-[var(--sidebar-border)] bg-gradient-to-r from-accent/10 to-primary/10">
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3 text-accent" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Members — {currentRoom._count?.members || 0}
            </span>
          </div>
        </div>

        {/* Members List */}
        <ScrollArea className="flex-1">
          <div className="p-3">
            {/* Online Members */}
            {currentRoom.members && currentRoom.members.length > 0 && (
              <div className="space-y-2">
                <div className="px-2 py-1">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                    Online — {currentRoom.members.length}
                  </span>
                </div>
                {currentRoom.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 xl:gap-3 px-3 py-2 rounded-xl hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/5 transition-all duration-300 cursor-pointer group hover-lift"
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8 xl:h-9 xl:w-9 ring-2 ring-primary/20">
                        <AvatarImage src={member.user.avatar || undefined} />
                        <AvatarFallback className="text-xs bg-gradient-secondary text-white">
                          {member.user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 status-online border-2 border-[var(--chat-sidebar)] rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {member.user.username}
                        </span>
                        {member.role === 'OWNER' && (
                          <div className="w-4 h-4 bg-gradient-primary rounded-full flex items-center justify-center">
                            <span className="text-xs text-white font-bold">O</span>
                          </div>
                        )}
                        {member.role === 'ADMIN' && (
                          <div className="w-4 h-4 bg-gradient-accent rounded-full flex items-center justify-center">
                            <span className="text-xs text-white font-bold">A</span>
                          </div>
                        )}
                      </div>
                      {member.user.name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {member.user.name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>
    </div>
  );
}