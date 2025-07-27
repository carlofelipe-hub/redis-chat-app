'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { User, Settings, Calendar, Mail, Edit3 } from 'lucide-react';
import { UserSession } from '@/lib/types';

const updateProfileSchema = z.object({
  name: z.string()
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  bio: z.string()
    .max(500, 'Bio must be less than 500 characters')
    .optional(),
  avatar: z.string()
    .url('Avatar must be a valid URL')
    .optional()
    .or(z.literal('')),
});

type UpdateProfileForm = z.infer<typeof updateProfileSchema>;

interface UserProfileDialogProps {
  children?: React.ReactNode;
  user: UserSession;
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  name: string | null;
  bio: string | null;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function UserProfileDialog({ children, user }: UserProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const form = useForm<UpdateProfileForm>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: '',
      bio: '',
      avatar: '',
    },
  });

  // Load user profile when dialog opens
  useEffect(() => {
    if (open) {
      loadProfile();
    }
  }, [open]);

  // Update form when profile is loaded
  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name || '',
        bio: profile.bio || '',
        avatar: profile.avatar || '',
      });
    }
  }, [profile, form]);

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/users/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      } else {
        toast.error('Failed to load profile');
      }
    } catch (error) {
      console.error('Load profile error:', error);
      toast.error('Failed to load profile');
    }
  };

  const onSubmit = async (data: UpdateProfileForm) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        setProfile(result.profile);
        setIsEditing(false);
        toast.success('Profile updated successfully!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 btn-minimal hover-glow">
            <Settings className="h-3 w-3" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="glass-strong border-primary/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <div className="p-1.5 bg-gradient-primary rounded-lg">
              <User className="h-4 w-4 text-white" />
            </div>
            {isEditing ? 'Edit Profile' : 'User Profile'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEditing ? 'Update your profile information.' : 'View and manage your profile.'}
          </DialogDescription>
        </DialogHeader>

        {profile && (
          <div className="space-y-6">
            {!isEditing ? (
              /* View Mode */
              <div className="space-y-4">
                {/* Avatar and Basic Info */}
                <div className="flex items-center gap-4 p-4 glass rounded-lg">
                  <Avatar className="h-16 w-16 ring-2 ring-primary/30">
                    <AvatarImage src={profile.avatar || undefined} />
                    <AvatarFallback className="text-lg bg-gradient-primary text-white">
                      {profile.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      {profile.name || profile.username}
                    </h3>
                    <p className="text-sm text-muted-foreground">@{profile.username}</p>
                    <Badge variant="secondary" className="mt-1 text-xs bg-green-500/20 text-green-400 border-green-500/30">
                      Online
                    </Badge>
                  </div>
                </div>

                {/* Profile Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{profile.email}</span>
                  </div>
                  
                  {profile.bio && (
                    <div className="p-3 glass rounded-lg">
                      <p className="text-sm text-foreground leading-relaxed">{profile.bio}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Joined {formatDate(profile.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between pt-4 border-t border-primary/10">
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="btn-gradient hover-glow gap-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit Profile
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setOpen(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              /* Edit Mode */
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Display Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Your display name"
                            className="bg-input/50 border-primary/20 focus:border-primary/40 text-foreground"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-muted-foreground">
                          This is how others will see your name
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us about yourself..."
                            className="bg-input/50 border-primary/20 focus:border-primary/40 text-foreground resize-none"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-muted-foreground">
                          A short description about yourself
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="avatar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Avatar URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://example.com/avatar.jpg"
                            className="bg-input/50 border-primary/20 focus:border-primary/40 text-foreground"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-muted-foreground">
                          URL to your profile picture
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsEditing(false)}
                      disabled={isLoading}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="btn-gradient hover-glow"
                    >
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}