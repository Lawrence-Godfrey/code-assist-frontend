import { api } from './api';
import { Chat, Message } from '@/types/schema';

export const chatService = {
  // Get all chats
  getChats: () => api.get<Chat[]>('/api/chats'),
  
  // Get a single chat by ID
  getChat: (id: number) => api.get<Chat>(`/api/chats/${id}`),
  
  // Create a new chat
  createChat: (data: { description?: string | null, create_default_stages?: boolean }) => 
    api.post<Chat>('/api/chats', data),
  
  // Update a chat
  updateChat: (id: number, description: string) => 
    api.patch<Chat>(`/api/chats/${id}`, { description }),
  
  // Delete a chat
  deleteChat: (id: number) => api.delete(`/api/chats/${id}`),
  
  // Get chat stages
  getChatStages: (chatId: number) => 
    api.get<Chat['stages']>(`/api/chats/${chatId}/stages`),
};