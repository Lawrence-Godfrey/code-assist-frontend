// Export all types from the shared schema
export * from '@shared/schema';

// Additional type definitions specific to the frontend
export interface Chat {
  id: number;
  created_at: string;
  description?: string | null;
  stages?: PipelineStage[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}