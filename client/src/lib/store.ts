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
  setSelectedChatId: (id: number | null) => void;
  setSelectedStageId: (id: number | null) => void;
}

export const useStore = create<AppState>((set) => ({
  selectedChatId: null,
  selectedStageId: null,
  setSelectedChatId: (id: number | null) => set({ selectedChatId: id }),
  setSelectedStageId: (id: number | null) => set({ selectedStageId: id }),
}));