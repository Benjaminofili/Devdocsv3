// src/lib/env.ts

export const getEnv = () => {
  const isNode = typeof process !== 'undefined' && process.env;

  const getSrv = (key: string) => {
    if (!isNode) return undefined;
    return process.env[key] || process.env[`VITE_${key}`];
  };

  return {
    // Shared keys (checked in both environments)
    // @ts-ignore
    OPENAI_API_KEY: isNode ? getSrv('OPENAI_API_KEY') : import.meta.env.VITE_OPENAI_API_KEY,
    // @ts-ignore
    GEMINI_API_KEY: isNode ? getSrv('GEMINI_API_KEY') : import.meta.env.VITE_GEMINI_API_KEY,
    // @ts-ignore
    ANTHROPIC_API_KEY: isNode ? getSrv('ANTHROPIC_API_KEY') : import.meta.env.VITE_ANTHROPIC_API_KEY,
    // @ts-ignore
    GROQ_API_KEY: isNode ? getSrv('GROQ_API_KEY') : import.meta.env.VITE_GROQ_API_KEY,
    // @ts-ignore
    GITHUB_TOKEN: isNode ? getSrv('GITHUB_TOKEN') : import.meta.env.VITE_GITHUB_TOKEN,
    // @ts-ignore
    FIREBASE_API_KEY: isNode ? getSrv('FIREBASE_API_KEY') : import.meta.env.VITE_FIREBASE_API_KEY,
    // @ts-ignore
    FIREBASE_AUTH_DOMAIN: isNode ? getSrv('FIREBASE_AUTH_DOMAIN') : import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    // @ts-ignore
    FIREBASE_PROJECT_ID: isNode ? getSrv('FIREBASE_PROJECT_ID') : import.meta.env.VITE_FIREBASE_PROJECT_ID,
    // @ts-ignore
    FIREBASE_STORAGE_BUCKET: isNode ? getSrv('FIREBASE_STORAGE_BUCKET') : import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    // @ts-ignore
    FIREBASE_MESSAGING_SENDER_ID: isNode ? getSrv('FIREBASE_MESSAGING_SENDER_ID') : import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    // @ts-ignore
    FIREBASE_APP_ID: isNode ? getSrv('FIREBASE_APP_ID') : import.meta.env.VITE_FIREBASE_APP_ID,
  };
};

export const getKeys = (raw: string | undefined): string[] => {
  if (!raw) return [];
  return raw.split(',').map(k => k.trim()).filter(Boolean);
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
