import { create } from 'zustand';
import type { PipelineStage } from '@shared/schema';

interface AppState {
  selectedStageId: number | null;
  setSelectedStageId: (id: number | null) => void;
}

export const useStore = create<AppState>((set) => ({
  selectedStageId: 1, // Start with the first stage selected
  setSelectedStageId: (id: number | null) => set({ selectedStageId: id }),
}));