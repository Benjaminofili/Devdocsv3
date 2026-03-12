// src/lib/ai/providers/gemini.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIResponse } from '../../../types';
import { AIProviderInterface } from './base';
import { logger } from '../../logger';
import { AI_CONFIG, GEMINI_MODELS } from '../../../config/constants';
import { getEnv, getKeys } from '../../env';

type ErrorType = 'rate_limit' | 'overloaded' | 'not_found' | 'network' | 'unknown';

interface GeminiError {
    message?: string;
    status?: number;
}

export class GeminiProvider implements AIProviderInterface {
    private keys: string[] = [];
    private currentKeyIndex = 0;
    private client: GoogleGenerativeAI | null = null;
    private readonly MAX_RETRIES = AI_CONFIG.MAX_RETRIES;
    private readonly RETRY_DELAY = AI_CONFIG.RETRY_DELAY_MS;

    constructor() {
        const env = getEnv();
        this.keys = getKeys(env.GEMINI_API_KEY);
        if (this.keys.length > 0) {
            this.client = new GoogleGenerativeAI(this.keys[0]);
        }
    }

    private rotateKey() {
        if (this.keys.length <= 1) return false;
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
        this.client = new GoogleGenerativeAI(this.keys[this.currentKeyIndex]);
        logger.info('ai-gemini', `🔄 Rotated to Gemini key #${this.currentKeyIndex + 1}`);
        return true;
    }

    isConfigured(): boolean {
        return this.client !== null;
    }

    private wait(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private getErrorType(error: unknown): ErrorType {
        const geminiError = error as GeminiError;
        const message = geminiError?.message || '';
        const status = geminiError?.status;

        if (status === 429 || message.includes('429') || message.includes('quota')) {
            return 'rate_limit';
        }
        if (status === 503 || message.includes('503') || message.includes('overloaded')) {
            return 'overloaded';
        }
        if (status === 404 || message.includes('404') || message.includes('not found')) {
            return 'not_found';
        }
        if (message.includes('fetch') || message.includes('network')) {
            return 'network';
        }
        return 'unknown';
    }

    private async generateWithModel(
        modelName: string,
        prompt: string,
        context?: string,
        attempt: number = 1
    ): Promise<AIResponse | null> {
        if (!this.client) {
            throw new Error('Gemini not configured');
        }

        try {
            logger.info('ai-gemini', `${modelName} (attempt ${attempt}/${this.MAX_RETRIES})...`);

            const model = this.client.getGenerativeModel({ model: modelName });

            const systemPrompt = `You are an expert technical writer creating professional README files for junior developers.

Guidelines:
- Be clear, concise, and practical
- Use proper markdown formatting
- Focus on WHY each section matters, not just WHAT it contains
- Provide actionable examples
- Keep it beginner-friendly`;

            let fullPrompt = systemPrompt + '\n\n';
            if (context) {
                fullPrompt += `Context:\n${context}\n\n`;
            }
            fullPrompt += prompt;

            const result = await model.generateContent(fullPrompt);
            const text = result.response.text();

            if (text) {
                logger.info('ai-gemini', `✅ ${modelName} succeeded`);
                return { content: text, provider: 'gemini' };
            }

            return null;

        } catch (error: unknown) {
            const errorType = this.getErrorType(error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Gemini ${modelName} (${errorType}): ${errorMessage}`, error);

            const shouldRetry = (errorType === 'overloaded' || errorType === 'network')
                && attempt < this.MAX_RETRIES;

            if (shouldRetry) {
                const waitTime = this.RETRY_DELAY * attempt;
                logger.warn(`Retrying after ${waitTime / 1000}s...`);
                await this.wait(waitTime);
                return this.generateWithModel(modelName, prompt, context, attempt + 1);
            }

            if (errorType === 'rate_limit') {
                if (this.rotateKey()) {
                    logger.info('ai-gemini', '⚠️ Rate limited, retrying with rotated key...');
                    return this.generateWithModel(modelName, prompt, context, attempt);
                }
                throw new Error(`Gemini rate limited: ${errorMessage}`);
            }

            return null;
        }
    }

    async generate(prompt: string, context?: string): Promise<AIResponse> {
        if (!this.client) {
            throw new Error('Gemini not configured');
        }

        const modelsToTry = [...GEMINI_MODELS];

        for (const modelName of modelsToTry) {
            const result = await this.generateWithModel(modelName, prompt, context);

            if (result) {
                return result;
            }

            await this.wait(1000);
        }

        throw new Error('All Gemini models failed - possibly rate limited');
    }
}
