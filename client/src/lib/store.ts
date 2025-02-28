import { create } from 'zustand';
import { createSelectors } from './create-selectors';
import type { Chat, PipelineStage } from '@/types/schema';

// Split the store into separate slices for better organization

interface ChatState {
  selectedChatId: number | null;
  pendingChat: boolean;
  setSelectedChatId: (id: number | null) => void;
  setPendingChat: (pending: boolean) => void;
}

interface StageState {
  selectedStageId: number | null;
  setSelectedStageId: (id: number | null) => void;
}

interface AppState extends ChatState, StageState {
  resetState: () => void; // Helper to reset the entire state
}

// Create a store with slices
const useStoreBase = create<AppState>((set) => ({
  // Chat slice
  selectedChatId: null,
  pendingChat: false,
  setSelectedChatId: (id: number | null) => set({ selectedChatId: id }),
  setPendingChat: (pending: boolean) => set({ pendingChat: pending }),
  
  // Stage slice
  selectedStageId: null,
  setSelectedStageId: (id: number | null) => set({ selectedStageId: id }),
  
  // App-wide operations
  resetState: () => set({ 
    selectedChatId: null, 
    selectedStageId: null, 
    pendingChat: false 
  }),
}));

// Export the store with selectors for more convenient usage
export const useStore = createSelectors(useStoreBase);