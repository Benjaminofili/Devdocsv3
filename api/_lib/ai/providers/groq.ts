// src/lib/ai/providers/groq.ts

import Groq from 'groq-sdk';
import { AIResponse } from '../../types.js';
import { AIProviderInterface } from './base.js';
import { getEnv, getKeys } from '../../env.js';
import { logger } from '../../logger.js';
import { GROQ_MODELS, AI_CONFIG } from '../../constants.js';

export class GroqProvider implements AIProviderInterface {
    private keys: string[] = [];
    private currentKeyIndex = 0;
    private client: Groq | null = null;
    private readonly models = [...GROQ_MODELS];

    constructor() {
        const env = getEnv();
        this.keys = getKeys(env.GROQ_API_KEY);
        this.initClient();
    }

    private initClient() {
        if (this.keys[this.currentKeyIndex]) {
            this.client = new Groq({
                apiKey: this.keys[this.currentKeyIndex],
                dangerouslyAllowBrowser: true,
            });
        }
    }

    private rotateKey() {
        if (this.keys.length <= 1) return false;
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
        this.initClient();
        logger.info('ai-groq', `🔄 Rotated to Groq key #${this.currentKeyIndex + 1}`);
        return true;
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
                const isRateLimit = errorMessage.toLowerCase().includes('rate limit') || (error as any)?.status === 429;
                
                if (isRateLimit && this.rotateKey()) {
                    logger.info('ai-groq', '⚠️ Rate limited, retrying with rotated key...');
                    return this.generate(prompt, context);
                }
                
                logger.warn(`Groq ${model} failed:`, { error: errorMessage });
            }
        }

        throw new Error('All Groq models failed');
    }
}
