// src/lib/logger.ts

type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'cache';

const colors = {
  info: '\x1b[32m',    // Green
  warn: '\x1b[33m',    // Yellow
  error: '\x1b[31m',   // Red
  debug: '\x1b[36m',   // Cyan
  cache: '\x1b[35m',   // Magenta
  reset: '\x1b[0m'
};

const getTimestamp = () => new Date().toISOString();

export const logger = {
  info: (message: string, meta?: any) => {
    console.log(`${colors.info}[INFO]${colors.reset} [${getTimestamp()}] ${message}`, meta || '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`${colors.warn}[WARN]${colors.reset} [${getTimestamp()}] ${message}`, meta || '');
  },
  error: (message: string, error?: any, meta?: any) => {
    console.error(`${colors.error}[ERROR]${colors.reset} [${getTimestamp()}] ${message}`, error || '', meta || '');
  },
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`${colors.debug}[DEBUG]${colors.reset} [${getTimestamp()}] ${message}`, meta || '');
    }
  },
  cache: (type: 'hit' | 'miss' | 'set' | 'del', message: string) => {
    console.log(`${colors.cache}[CACHE:${type.toUpperCase()}]${colors.reset} [${getTimestamp()}] ${message}`);
  }
};
