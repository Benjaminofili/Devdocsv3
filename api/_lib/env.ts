export const getEnv = () => {
  const getSrv = (key: string) => {
    return process.env[key] || process.env[`VITE_${key}`];
  };

  return {
    OPENAI_API_KEY: getSrv('OPENAI_API_KEY'),
    GEMINI_API_KEY: getSrv('GEMINI_API_KEY'),
    ANTHROPIC_API_KEY: getSrv('ANTHROPIC_API_KEY'),
    GROQ_API_KEY: getSrv('GROQ_API_KEY'),
    GITHUB_TOKEN: getSrv('GITHUB_TOKEN'),
    FIREBASE_API_KEY: getSrv('FIREBASE_API_KEY'),
    FIREBASE_AUTH_DOMAIN: getSrv('FIREBASE_AUTH_DOMAIN'),
    FIREBASE_PROJECT_ID: getSrv('FIREBASE_PROJECT_ID'),
    FIREBASE_STORAGE_BUCKET: getSrv('FIREBASE_STORAGE_BUCKET'),
    FIREBASE_MESSAGING_SENDER_ID: getSrv('FIREBASE_MESSAGING_SENDER_ID'),
    FIREBASE_APP_ID: getSrv('FIREBASE_APP_ID'),
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
