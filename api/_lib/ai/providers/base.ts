// src/lib/ai/providers/base.ts

import { AIResponse } from '../../types.js';

export interface AIProviderInterface {
  generate(prompt: string, context?: string): Promise<AIResponse>;
  isConfigured(): boolean;
}
