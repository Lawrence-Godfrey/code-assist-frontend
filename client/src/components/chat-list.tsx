import React from 'react';
import { MessageSquare, MessageSquarePlus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';
import { useChats } from '@/hooks/use-chats';
import { useToast } from '@/hooks/use-toast';
import { Chat } from '@/types/schema';

export const ChatList: React.FC = () => {
  // Use our custom hooks for chat management
  const { 
    chats = [], 
    isLoading, 
    error, 
    deleteChat 
  } = useChats();
  
  // Get global state management from the store
  const selectedChatId = useStore.selectedChatId();
  const pendingChat = useStore.pendingChat();
  const setSelectedChatId = useStore.setSelectedChatId();
  const setSelectedStageId = useStore.setSelectedStageId();
  const setPendingChat = useStore.setPendingChat();
  const resetState = useStore.resetState();
  
  // Toast notifications
  const { toast } = useToast();

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
        // Use the deleteChat function from our hook
        deleteChat(chatId);
        
        // If the deleted chat was selected, reset selection
        if (selectedChatId === chatId) {
          resetState();
        }
        
        toast({
          title: "Chat deleted",
          description: "The chat has been successfully deleted.",
        });
      } catch (error) {
        console.error('Failed to delete chat:', error);
        toast({
          title: "Error",
          description: "Failed to delete the chat. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSelectChat = (chat: Chat) => {
    setPendingChat(false);
    setSelectedChatId(chat.id);
    
    // Select the first stage if available
    if (chat.stages && chat.stages.length > 0) {
      setSelectedStageId(chat.stages[0].id);
    } else {
      // Clear selected stage if no stages are available
      setSelectedStageId(null);
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
        <EmptyChatList onNewChat={handleNewChat} />
      ) : (
        <ChatListContent 
          chats={chats}
          selectedChatId={selectedChatId}
          pendingChat={pendingChat}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
        />
      )}
    </div>
  );
};

// Component for empty state
const EmptyChatList: React.FC<{ onNewChat: () => void }> = ({ onNewChat }) => (
  <div className="text-center p-6 flex-1 flex flex-col items-center justify-center">
    <MessageSquarePlus className="w-12 h-12 text-gray-400 mx-auto mb-3" />
    <h3 className="text-gray-700 font-medium mb-2">No chats yet</h3>
    <button
      className="flex items-center justify-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors font-medium rounded-md border border-gray-200"
      onClick={onNewChat}
    >
      <MessageSquarePlus className="w-4 h-4" />
      Start a new conversation
    </button>
  </div>
);

// Component for chat list with content
interface ChatListContentProps {
  chats: Chat[];
  selectedChatId: number | null;
  pendingChat: boolean;
  onNewChat: () => void;
  onSelectChat: (chat: Chat) => void;
  onDeleteChat: (chatId: number, e: React.MouseEvent) => void;
}

const ChatListContent: React.FC<ChatListContentProps> = ({ 
  chats, 
  selectedChatId, 
  pendingChat, 
  onNewChat, 
  onSelectChat, 
  onDeleteChat 
}) => (
  <>
    <button
      className="w-full p-3 flex items-center justify-center gap-2 text-gray-700 hover:bg-gray-100 transition-colors font-medium rounded-md"
      onClick={onNewChat}
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
              onClick={() => onSelectChat(chat)}
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
              onClick={(e) => onDeleteChat(chat.id, e)}
              title="Delete chat"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        ))}
    </div>
  </>
);

export default ChatList;