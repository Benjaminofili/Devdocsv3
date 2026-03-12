// src/lib/ai/orchestrator.ts

import { AIProvider, AIResponse } from '../../types';
import { AIProviderInterface } from './providers/base';
import { OpenAIProvider } from './providers/openai';
import { GeminiProvider } from './providers/gemini';
import { GroqProvider } from './providers/groq';
import { logger } from '../logger';

interface ProviderConfig {
  provider: AIProvider;
  instance: AIProviderInterface;
  priority: number;
  isAvailable: boolean;
}

export class AIOrchestrator {
  private providers: ProviderConfig[] = [];
  private currentProvider: AIProvider = 'openai';

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    const providerConfigs: Array<{
      provider: AIProvider;
      instance: AIProviderInterface;
      priority: number;
    }> = [
        { provider: 'groq', instance: new GroqProvider(), priority: 1 },
        { provider: 'gemini', instance: new GeminiProvider(), priority: 2 },
        { provider: 'openai', instance: new OpenAIProvider(), priority: 3 },
      ];

    this.providers = providerConfigs.map(config => ({
      ...config,
      isAvailable: config.instance.isConfigured(),
    }));

    const available = this.providers.find(p => p.isAvailable);
    if (available) {
      this.currentProvider = available.provider;
    }

    const availableNames = this.providers
      .filter(p => p.isAvailable)
      .map(p => p.provider)
      .join(', ');

    logger.info('AI Orchestrator initialized', { available: availableNames || 'None' });
  }

  async generate(
    prompt: string,
    context?: string,
    preferredProvider?: AIProvider
  ): Promise<AIResponse> {
    const providersToTry = this.getProvidersInOrder(preferredProvider);

    if (providersToTry.length === 0) {
      throw new Error('No AI providers configured');
    }

    for (const providerConfig of providersToTry) {
      try {
        const response = await providerConfig.instance.generate(prompt, context);
        return response;
      } catch (error) {
        logger.warn(`${providerConfig.provider} failed, trying next...`);
        continue;
      }
    }

    throw new Error('All AI providers failed');
  }

  private getProvidersInOrder(preferred?: AIProvider): ProviderConfig[] {
    const available = this.providers.filter(p => p.isAvailable);

    if (preferred) {
      const preferredProvider = available.find(p => p.provider === preferred);
      if (preferredProvider) {
        return [
          preferredProvider,
          ...available.filter(p => p.provider !== preferred),
        ];
      }
    }

    return available.sort((a, b) => a.priority - b.priority);
  }

  getAvailableProviders(): AIProvider[] {
    return this.providers
      .filter(p => p.isAvailable)
      .map(p => p.provider);
  }
}

export const aiOrchestrator = new AIOrchestrator();
