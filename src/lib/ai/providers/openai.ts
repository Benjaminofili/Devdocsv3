import OpenAI from 'openai';
import { AIResponse } from '@/types';
import { AIProviderInterface } from './base';
import { getEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import { AI_CONFIG } from '@/config/constants';

export class OpenAIProvider implements AIProviderInterface {
  private client: OpenAI | null = null;
  private readonly MAX_RETRIES = AI_CONFIG.MAX_RETRIES;
  private readonly RETRY_DELAY = AI_CONFIG.RETRY_DELAY_MS;

  constructor() {
    const env = getEnv();
    if (env.OPENAI_API_KEY) {
      this.client = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
        dangerouslyAllowBrowser: true, // Needed for client-side usage if not using a proxy
      });
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getErrorType(error: unknown): 'rate_limit' | 'overloaded' | 'server_error' | 'context_length' | 'unknown' {
    const openAIError = error as { status?: number; code?: string };
    const status = openAIError?.status;
    const code = openAIError?.code;

    if (status === 429 || code === 'rate_limit_exceeded') return 'rate_limit';
    if (status === 503 || status === 502) return 'overloaded';
    if (status && status >= 500) return 'server_error';
    if (code === 'context_length_exceeded') return 'context_length';

    return 'unknown';
  }

  private async generateWithModel(
    modelName: string,
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    attempt: number = 1
  ): Promise<AIResponse | null> {
    if (!this.client) throw new Error('OpenAI not configured');

    try {
      logger.info('ai-openai', `Generating with ${modelName} (attempt ${attempt}/${this.MAX_RETRIES})...`);

      const response = await this.client.chat.completions.create({
        model: modelName,
        messages,
        temperature: AI_CONFIG.DEFAULT_TEMPERATURE,
        max_tokens: AI_CONFIG.DEFAULT_MAX_TOKENS,
      });

      return {
        content: response.choices[0]?.message?.content || '',
        provider: 'openai',
        tokensUsed: response.usage?.total_tokens,
      };

    } catch (error: unknown) {
      const errorType = this.getErrorType(error);
      logger.error(`OpenAI ${modelName} error (${errorType})`, error);

      if (errorType === 'context_length') return null;

      const shouldRetry = (errorType === 'rate_limit' || errorType === 'overloaded' || errorType === 'server_error')
        && attempt < this.MAX_RETRIES;

      if (shouldRetry) {
        const waitTime = this.RETRY_DELAY * attempt;
        logger.warn(`Retrying OpenAI request after ${waitTime / 1000}s...`);
        await this.wait(waitTime);
        return this.generateWithModel(modelName, messages, attempt + 1);
      }

      return null;
    }
  }

  async generate(prompt: string, context?: string): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('OpenAI not configured');
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are an expert technical writer helping junior developers create professional README files. 
        Be clear, concise, and educational. Always explain WHY something is important, not just WHAT it is.
        Use markdown formatting appropriately.`,
      },
    ];

    if (context) {
      messages.push({
        role: 'user',
        content: `Project Context:\n${context}`,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    const modelsToTry = ['gpt-4o', 'gpt-4o-mini'];

    for (const model of modelsToTry) {
      const result = await this.generateWithModel(model, messages);
      if (result) return result;
      await this.wait(1000);
    }

    throw new Error('All OpenAI models failed');
  }
}
