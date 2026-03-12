// src/lib/env.ts

export const getEnv = () => {
  return {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
    GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY,
    ANTHROPIC_API_KEY: import.meta.env.VITE_ANTHROPIC_API_KEY,
    GROQ_API_KEY: import.meta.env.VITE_GROQ_API_KEY,
    UPSTASH_REDIS_REST_URL: import.meta.env.VITE_UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN,
    GITHUB_TOKEN: import.meta.env.VITE_GITHUB_TOKEN,
  };
};

export const validateEnv = () => {
    const env = getEnv();
    const missing = Object.entries(env)
        .filter(([_, value]) => !value)
        .map(([key]) => key);

    if (missing.length > 0) {
        console.warn(`⚠️ Missing environment variables: ${missing.join(', ')}`);
    }
};
