import { create } from 'zustand';
import type { PipelineStage } from '@shared/schema';

interface Chat {
  id: number;
  created_at: string;
  stages?: any[];
}

interface AppState {
  selectedChatId: number | null;
  selectedStageId: number | null;
  pendingChat: boolean; // Track if we're in a pending chat state
  setSelectedChatId: (id: number | null) => void;
  setSelectedStageId: (id: number | null) => void;
  setPendingChat: (pending: boolean) => void;
  resetChat: () => void; // Helper to reset both chat ID and stage ID
}

export const useStore = create<AppState>((set) => ({
  selectedChatId: null,
  selectedStageId: null,
  pendingChat: false,
  setSelectedChatId: (id: number | null) => set({ selectedChatId: id }),
  setSelectedStageId: (id: number | null) => set({ selectedStageId: id }),
  setPendingChat: (pending: boolean) => set({ pendingChat: pending }),
  resetChat: () => set({ selectedChatId: null, selectedStageId: null, pendingChat: false }),
}));