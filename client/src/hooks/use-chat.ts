import { useQuery } from '@tanstack/react-query';
import { chatService } from '@/services/chat-service';
import { Chat } from '@/types/schema';

export function useChat(chatId: number | null) {
  const {
    data: chat,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['/api/chats', chatId],
    queryFn: () => chatId ? chatService.getChat(chatId) : null,
    enabled: !!chatId, // Only run if we have a chat ID
  });

  const {
    data: stages = [],
    isLoading: stagesLoading,
  } = useQuery({
    queryKey: ['/api/chats', chatId, 'stages'],
    queryFn: () => chatId ? chatService.getChatStages(chatId) : [],
    enabled: !!chatId, // Only run if we have a chat ID
  });

  return {
    chat,
    stages,
    isLoading: isLoading || stagesLoading,
    error,
  };
}