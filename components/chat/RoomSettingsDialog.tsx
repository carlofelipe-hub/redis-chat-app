'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Settings, Hash, Users, Crown, Shield, UserMinus, MoreHorizontal, Lock, Globe } from 'lucide-react';
import { RoomWithMembers, UserSession } from '@/lib/types';

interface RoomSettingsDialogProps {
  children?: React.ReactNode;
  room: RoomWithMembers;
  user: UserSession;
}

export default function RoomSettingsDialog({ children, room, user }: RoomSettingsDialogProps) {
  const [open, setOpen] = useState(false);

  // Check if user is owner or admin
  const userMembership = room.members?.find(member => member.userId === user.id);
  const isOwner = userMembership?.role === 'OWNER';
  const isAdmin = userMembership?.role === 'ADMIN';
  const canManage = isOwner || isAdmin;

  if (!canManage) {
    return null; // Don't show settings if user can't manage
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 btn-minimal hover-glow">
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="glass-strong border-primary/20 max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <div className="p-1.5 bg-gradient-primary rounded-lg">
              <Settings className="h-4 w-4 text-white" />
            </div>
            Room Settings
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Manage #{room.name} settings and members.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Room Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Room Information
            </h3>
            <div className="space-y-2 p-4 glass rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Room Name</span>
                <span className="text-sm font-medium text-foreground">{room.name}</span>
              </div>
              {room.description && (
                <div className="flex items-start justify-between">
                  <span className="text-sm text-muted-foreground">Description</span>
                  <p className="text-sm text-foreground text-right max-w-xs">{room.description}</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Visibility</span>
                <Badge variant="secondary" className={`text-xs ${
                  room.isPrivate 
                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' 
                    : 'bg-green-500/20 text-green-400 border-green-500/30'
                }`}>
                  {room.isPrivate ? (
                    <>
                      <Lock className="h-3 w-3 mr-1" />
                      Private
                    </>
                  ) : (
                    <>
                      <Globe className="h-3 w-3 mr-1" />
                      Public
                    </>
                  )}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Max Members</span>
                <span className="text-sm text-foreground">{room.maxMembers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Members</span>
                <span className="text-sm text-foreground">{room._count?.members || 0}</span>
              </div>
            </div>
          </div>

          {/* Members Management */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members ({room._count?.members || 0})
            </h3>
            <ScrollArea className="h-60">
              <div className="space-y-2">
                {room.members?.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 glass rounded-lg hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                        <AvatarImage src={member.user.avatar || undefined} />
                        <AvatarFallback className="text-xs bg-gradient-secondary text-white">
                          {member.user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {member.user.username}
                          </span>
                          {member.role === 'OWNER' && (
                            <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                              <Crown className="h-3 w-3 mr-1" />
                              Owner
                            </Badge>
                          )}
                          {member.role === 'ADMIN' && (
                            <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                        </div>
                        {member.user.name && (
                          <p className="text-xs text-muted-foreground">{member.user.name}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Member Actions */}
                    {isOwner && member.userId !== user.id && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-primary/10">
            <div className="flex gap-2">
              {isOwner && (
                <Button variant="outline" className="text-muted-foreground border-primary/20 hover:bg-primary/10">
                  Edit Room
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}