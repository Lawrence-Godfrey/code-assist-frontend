import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, MessageSquarePlus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import { useStore } from '@/lib/store';

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

export const ChatList: React.FC = () => {
  const { 
    selectedChatId, 
    setSelectedChatId, 
    setSelectedStageId, 
    pendingChat,
    setPendingChat,
    resetChat
  } = useStore();
  
  const queryClient = useQueryClient();
  
  const { data: chats = [], isLoading, error } = useQuery<Chat[]>({
    queryKey: ['/api/chats'] as const,
    queryFn: fetchChats,
  });

  const handleNewChat = () => {
    // If we're already in a pending chat state, do nothing
    if (pendingChat) return;
    
    // Set pending chat to true and clear the current selections
    setPendingChat(true);
    setSelectedChatId(null);
    setSelectedStageId(null);
  };
  
  const handleDeleteChat = async (chatId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent chat selection when clicking delete
    
    if (confirm('Are you sure you want to delete this chat?')) {
      try {
        await apiRequest('DELETE', `/api/chats/${chatId}`);
        
        // If the deleted chat was selected, reset selection
        if (selectedChatId === chatId) {
          resetChat();
        }
        
        // Refresh chat list
        queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
      } catch (error) {
        console.error('Failed to delete chat:', error);
        alert('Failed to delete the chat. Please try again.');
      }
    }
  };

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
    <div className="flex flex-col h-full">
      {chats.length === 0 && !pendingChat ? (
        <div className="text-center p-6 flex-1 flex flex-col items-center justify-center">
          <MessageSquarePlus className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-gray-700 font-medium mb-2">No chats yet</h3>
          <button
            className="flex items-center justify-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors font-medium rounded-md border border-gray-200"
            onClick={handleNewChat}
          >
            <MessageSquarePlus className="w-4 h-4" />
            Start a new conversation
          </button>
        </div>
      ) : (
        <>
          <button
            className="w-full p-3 flex items-center justify-center gap-2 text-gray-700 hover:bg-gray-100 transition-colors font-medium rounded-md"
            onClick={handleNewChat}
          >
            <MessageSquarePlus className="w-4 h-4" />
            New Chat
          </button>
          
          <div className="flex-1 overflow-y-auto space-y-1 mt-2">
            {/* Sort chats by created_at in descending order to show newest first */}
            {[...chats]
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((chat) => (
                <div
                  key={chat.id}
                  className={cn(
                    'w-full py-2 px-3 flex items-center transition-colors',
                    'hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-200',
                    'text-left rounded-md',
                    'group',
                    (selectedChatId === chat.id && !pendingChat) ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
                  )}
                >
                  <button
                    className="flex-1 flex items-center gap-2 justify-start text-left mr-2"
                    onClick={() => {
                      setPendingChat(false);
                      setSelectedChatId(chat.id);
                      // Select the first stage if available
                      if (chat.stages && chat.stages.length > 0) {
                        setSelectedStageId(chat.stages[0].id);
                      } else {
                        // Clear selected stage if no stages are available
                        setSelectedStageId(null);
                      }
                    }}
                  >
                    <MessageSquare className={cn(
                      "w-4 h-4 flex-shrink-0",
                      (selectedChatId === chat.id && !pendingChat) ? 'text-blue-600' : 'text-gray-500'
                    )} />
                    <div className="min-w-0">
                      <div className="font-medium truncate">Chat {chat.id}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {new Date(chat.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-red-50"
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                    title="Delete chat"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ChatList;