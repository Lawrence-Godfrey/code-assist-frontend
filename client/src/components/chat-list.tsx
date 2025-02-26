import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiRequest, queryClient } from '@/lib/queryClient';

// Define the Chat interface matching the backend Chat model
interface Chat {
  id: string;
  created_at: string;
}

// Function to fetch chats from the backend
const fetchChats = async (): Promise<Chat[]> => {
  const response = await apiRequest('GET', '/api/chats');
  return await response.json();
};

// Function to create a new chat
const createChat = async (): Promise<Chat> => {
  const response = await apiRequest('POST', '/api/chats');
  return await response.json();
};

export const ChatList: React.FC = () => {
  const { data: chats = [], isLoading, error } = useQuery<Chat[]>({
    queryKey: ['/api/chats'] as const, // Consistent with ChatInterface query key style
    queryFn: fetchChats,
  });

  const mutation = useMutation({
    mutationFn: createChat,
    onMutate: async () => {
      // Optimistically update the chat list
      await queryClient.cancelQueries({ queryKey: ['/api/chats'] });
      const previousChats = queryClient.getQueryData<Chat[]>(['/api/chats']) || [];
      
      const optimisticChat: Chat = {
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      
      queryClient.setQueryData(['/api/chats'], [...previousChats, optimisticChat]);
      return { previousChats };
    },
    onError: (error, _variables, context) => {
      // Revert on error
      queryClient.setQueryData(['/api/chats'], context?.previousChats);
      console.error('Error creating chat:', error);
    },
    onSuccess: () => {
      // Invalidate to fetch the real data
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 text-center">
        Error loading chats. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {chats.length === 0 ? (
        <div className="text-center p-4 text-gray-500">
          No chats yet.{' '}
          <button
            className="text-blue-500 hover:underline"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            Start a new conversation!
          </button>
        </div>
      ) : (
        <>
          <button
            className="w-full p-3 text-blue-500 hover:underline text-center"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Creating...' : 'New Chat'}
          </button>
          {chats.map((chat) => (
            <button
              key={chat.id}
              className={cn(
                'w-full p-3 flex items-center gap-3 rounded-lg transition-colors',
                'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200',
                'text-left'
              )}
              onClick={() => {}}
            >
              <MessageSquare className="w-5 h-5 text-gray-500" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">Chat {chat.id}</div>
                <div className="text-sm text-gray-500 truncate">
                  {new Date(chat.created_at).toLocaleDateString()}
                </div>
              </div>
            </button>
          ))}
        </>
      )}
    </div>
  );
};

export default ChatList;