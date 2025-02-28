import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { chatService } from '@/services/chat-service';
import { Chat } from '@/types/schema';

export function useChats() {
  // Get all chats
  const {
    data: chats = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['/api/chats'],
    queryFn: () => chatService.getChats(),
  });

  // Create chat mutation
  const { mutate: createChat, isPending: isCreating } = useMutation({
    mutationFn: (data: { description?: string | null, create_default_stages?: boolean }) => 
      chatService.createChat(data),
    onSuccess: () => {
      // Invalidate the chats query
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
    },
  });

  // Delete chat mutation
  const { mutate: deleteChat, isPending: isDeleting } = useMutation({
    mutationFn: (id: number) => chatService.deleteChat(id),
    onSuccess: () => {
      // Invalidate the chats query
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
    },
  });

  return {
    chats,
    isLoading,
    error,
    createChat,
    isCreating,
    deleteChat,
    isDeleting,
  };
}