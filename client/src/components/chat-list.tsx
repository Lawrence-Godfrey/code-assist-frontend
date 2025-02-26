import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

// Define the Chat interface matching the backend Chat model
interface Chat {
  id: number;
  created_at: string;
  stages?: any[];
}

// Function to fetch chats from the backend
const fetchChats = async (): Promise<Chat[]> => {
  const response = await apiRequest('GET', '/api/chats');
  return await response.json();
};

// Function to create a new chat
const createChat = async (): Promise<Chat> => {
  const response = await apiRequest('POST', '/api/chats', {
    description: null,
    create_default_stages: true
  });
  return await response.json();
};

export const ChatList: React.FC = () => {
  const { toast } = useToast();
  const { selectedChatId, setSelectedChatId, setSelectedStageId } = useStore();
  
  const { data: chats = [], isLoading, error } = useQuery<Chat[]>({
    queryKey: ['/api/chats'] as const,
    queryFn: fetchChats,
  });

  const mutation = useMutation({
    mutationFn: createChat,
    onMutate: async () => {
      // Optimistically update the chat list
      await queryClient.cancelQueries({ queryKey: ['/api/chats'] });
      const previousChats = queryClient.getQueryData<Chat[]>(['/api/chats']) || [];
      
      const optimisticChat: Chat = {
        id: Date.now(),
        created_at: new Date().toISOString(),
      };
      
      queryClient.setQueryData(['/api/chats'], [...previousChats, optimisticChat]);
      return { previousChats };
    },
    onError: (error, _variables, context) => {
      // Revert on error
      queryClient.setQueryData(['/api/chats'], context?.previousChats);
      console.error('Error creating chat:', error);
      toast({
        title: "Error creating chat",
        description: "Please try again later",
        variant: "destructive"
      });
    },
    onSuccess: (newChat) => {
      // Invalidate to fetch the real data
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
      
      // Set the selected chat
      setSelectedChatId(newChat.id);
      
      // If the chat has stages, select the first one
      if (newChat.stages && newChat.stages.length > 0) {
        setSelectedStageId(newChat.stages[0].id);
      }
      
      toast({
        title: "Chat created",
        description: "Your new conversation is ready",
      });
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
                'text-left',
                selectedChatId === chat.id ? 'bg-blue-50 border-blue-200 border' : ''
              )}
              onClick={() => {
                setSelectedChatId(chat.id);
                // Optional: Also select the first stage if available
                if (chat.stages && chat.stages.length > 0) {
                  setSelectedStageId(chat.stages[0].id);
                } else {
                  // Clear selected stage if no stages are available
                  setSelectedStageId(null);
                }
              }}
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