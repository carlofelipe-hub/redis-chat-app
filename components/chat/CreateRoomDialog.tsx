'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { toast } from 'sonner';
import { Plus, Hash } from 'lucide-react';

const createRoomSchema = z.object({
  name: z.string()
    .min(1, 'Room name is required')
    .max(50, 'Room name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Room name can only contain letters, numbers, spaces, hyphens, and underscores'),
  description: z.string()
    .max(200, 'Description must be less than 200 characters')
    .optional(),
  isPrivate: z.boolean().default(false),
  maxMembers: z.number()
    .min(2, 'Room must allow at least 2 members')
    .max(1000, 'Room cannot have more than 1000 members')
    .default(100),
});

type CreateRoomForm = z.infer<typeof createRoomSchema>;

interface CreateRoomDialogProps {
  children?: React.ReactNode;
}

export default function CreateRoomDialog({ children }: CreateRoomDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<CreateRoomForm>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      name: '',
      description: '',
      isPrivate: false,
      maxMembers: 100,
    },
  });

  const onSubmit = async (data: CreateRoomForm) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Room created successfully!');
        setOpen(false);
        form.reset();
        
        // Redirect to the new room
        router.push(`/chat/${result.room.id}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create room');
      }
    } catch (error) {
      console.error('Create room error:', error);
      toast.error('Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0 text-white/80 hover:text-white hover:bg-white/20 btn-glow"
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="glass-strong border-primary/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <div className="p-1.5 bg-gradient-primary rounded-lg">
              <Hash className="h-4 w-4 text-white" />
            </div>
            Create New Room
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a new chat room for your community. You&apos;ll become the room owner.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Room Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., General Discussion"
                      className="bg-input/50 border-primary/20 focus:border-primary/40 text-foreground"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-muted-foreground">
                    Choose a descriptive name for your room
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What's this room about?"
                      className="bg-input/50 border-primary/20 focus:border-primary/40 text-foreground resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-muted-foreground">
                    Help others understand what this room is for
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxMembers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Max Members</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={2}
                      max={1000}
                      className="bg-input/50 border-primary/20 focus:border-primary/40 text-foreground"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 100)}
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-muted-foreground">
                    Maximum number of members allowed (2-1000)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
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
                {isLoading ? 'Creating...' : 'Create Room'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}