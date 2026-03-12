// src/lib/ai/providers/groq.ts

import Groq from 'groq-sdk';
import { AIResponse } from '@/types';
import { AIProviderInterface } from './base';
import { getEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import { GROQ_MODELS, AI_CONFIG } from '@/config/constants';

export class GroqProvider implements AIProviderInterface {
    private client: Groq | null = null;
    private readonly models = [...GROQ_MODELS];

    constructor() {
        const env = getEnv();
        if (env.GROQ_API_KEY) {
            this.client = new Groq({
                apiKey: env.GROQ_API_KEY,
                dangerouslyAllowBrowser: true,
            });
        }
    }

    isConfigured(): boolean {
        return this.client !== null;
    }

    async generate(prompt: string, context?: string): Promise<AIResponse> {
        if (!this.client) {
            throw new Error('Groq not configured');
        }

        const systemPrompt = `You are an expert technical writer helping junior developers create professional README files. 
Be clear, concise, and educational. Always explain WHY something is important, not just WHAT it is.
Use markdown formatting appropriately.`;

        const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
            { role: 'system', content: systemPrompt },
        ];

        if (context) {
            messages.push({ role: 'user', content: `Project Context:\n${context}` });
        }

        messages.push({ role: 'user', content: prompt });

        for (const model of this.models) {
            try {
                logger.info('ai-groq', `Attempting with ${model}...`);

                const completion = await this.client.chat.completions.create({
                    messages,
                    model,
                    temperature: AI_CONFIG.DEFAULT_TEMPERATURE,
                    max_tokens: AI_CONFIG.DEFAULT_MAX_TOKENS,
                    top_p: 1,
                    stop: null,
                    stream: false,
                });

                const content = completion.choices[0]?.message?.content || '';

                if (content) {
                    return {
                        content,
                        provider: 'groq',
                        tokensUsed: completion.usage?.total_tokens,
                    };
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                logger.warn(`Groq ${model} failed:`, { error: errorMessage });
            }
        }

        throw new Error('All Groq models failed');
    }
}
