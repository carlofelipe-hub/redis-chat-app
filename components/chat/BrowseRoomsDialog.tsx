'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Search, Hash, Users, Lock, UserPlus, Globe } from 'lucide-react';
import { RoomWithMembers } from '@/lib/types';

interface BrowseRoomsDialogProps {
  children?: React.ReactNode;
  currentRoomId?: string;
}

export default function BrowseRoomsDialog({ children, currentRoomId }: BrowseRoomsDialogProps) {
  const [open, setOpen] = useState(false);
  const [rooms, setRooms] = useState<RoomWithMembers[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<RoomWithMembers[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const router = useRouter();

  // Load rooms when dialog opens
  useEffect(() => {
    if (open) {
      loadRooms();
    }
  }, [open]);

  // Filter rooms based on search query
  useEffect(() => {
    if (!searchQuery) {
      setFilteredRooms(rooms);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredRooms(
        rooms.filter(
          (room) =>
            room.name.toLowerCase().includes(query) ||
            room.description?.toLowerCase().includes(query) ||
            room.owner?.username.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, rooms]);

  const loadRooms = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/rooms');
      if (response.ok) {
        const data = await response.json();
        setRooms(data.rooms || []);
      } else {
        toast.error('Failed to load rooms');
      }
    } catch (error) {
      console.error('Load rooms error:', error);
      toast.error('Failed to load rooms');
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoom = async (roomId: string) => {
    if (roomId === currentRoomId) {
      toast.info('You are already in this room');
      return;
    }

    setJoiningRoomId(roomId);
    try {
      const response = await fetch(`/api/rooms/${roomId}/join-simple`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Successfully joined room!');
        setOpen(false);
        router.push(`/chat/${roomId}`);
      } else {
        const error = await response.json();
        if (error.error === 'Already a member of this room') {
          // If already a member, just navigate to the room
          setOpen(false);
          router.push(`/chat/${roomId}`);
        } else {
          toast.error(error.error || 'Failed to join room');
        }
      }
    } catch (error) {
      console.error('Join room error:', error);
      toast.error('Failed to join room');
    } finally {
      setJoiningRoomId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="gap-2">
            <Search className="h-4 w-4" />
            Browse Rooms
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="glass-strong border-primary/20 max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <div className="p-1.5 bg-gradient-secondary rounded-lg">
              <Search className="h-4 w-4 text-white" />
            </div>
            Browse Rooms
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Discover and join public rooms in the community.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rooms by name, description, or owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-input/50 border-primary/20 focus:border-primary/40 text-foreground"
            />
          </div>

          {/* Rooms List */}
          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Loading rooms...</div>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 bg-gradient-secondary rounded-full flex items-center justify-center mb-3">
                  <Hash className="h-6 w-6 text-white" />
                </div>
                <p className="text-muted-foreground">
                  {searchQuery ? 'No rooms match your search.' : 'No public rooms available.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRooms.map((room) => (
                  <div
                    key={room.id}
                    className="p-4 glass rounded-xl border border-primary/10 hover:border-primary/20 transition-all duration-300 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gradient-primary rounded-lg flex-shrink-0">
                        {room.isPrivate ? (
                          <Lock className="h-4 w-4 text-white" />
                        ) : (
                          <Hash className="h-4 w-4 text-white" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">
                            {room.name}
                          </h3>
                          <div className="flex items-center gap-1">
                            {room.isPrivate ? (
                              <Badge variant="secondary" className="text-xs bg-orange-500/20 text-orange-400 border-orange-500/30">
                                <Lock className="h-3 w-3 mr-1" />
                                Private
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                                <Globe className="h-3 w-3 mr-1" />
                                Public
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {room.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {room.description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>{room._count?.members || 0} members</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Avatar className="h-4 w-4">
                                <AvatarImage src={room.owner?.avatar || undefined} />
                                <AvatarFallback className="text-xs bg-gradient-accent text-white">
                                  {room.owner?.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span>by {room.owner?.username}</span>
                            </div>
                          </div>
                          
                          <Button
                            size="sm"
                            onClick={() => joinRoom(room.id)}
                            disabled={joiningRoomId === room.id || room.id === currentRoomId}
                            className={`
                              h-8 px-3 text-xs 
                              ${room.id === currentRoomId 
                                ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                                : 'btn-gradient hover-glow'
                              }
                            `}
                          >
                            {room.id === currentRoomId ? (
                              'Current Room'
                            ) : joiningRoomId === room.id ? (
                              'Joining...'
                            ) : (
                              <>
                                <UserPlus className="h-3 w-3 mr-1" />
                                Join
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-3 pt-4 border-t border-primary/10">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Close
            </Button>
            <Button onClick={loadRooms} disabled={isLoading} className="btn-gradient hover-glow">
              Refresh
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}