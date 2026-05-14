import * as SentryReact from '@sentry/react';

// Determine if we are in a browser or Node environment (Vercel Serverless)
const isBrowser = typeof window !== 'undefined';
const isDev = process.env.NODE_ENV === 'development';

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
  info: (message: string, context?: any) => {
    if (isDev) {
      console.log(`${colors.info}[INFO]${colors.reset} [${getTimestamp()}] ${message}`, context || '');
    } else {
      if (isBrowser) {
        SentryReact.addBreadcrumb({
          category: 'info',
          message: message,
          data: context,
          level: 'info',
        });
      }
      console.log(message, context || '');
    }
  },

  warn: (message: string, context?: any) => {
    if (isDev) {
      console.warn(`${colors.warn}[WARN]${colors.reset} [${getTimestamp()}] ${message}`, context || '');
    } else {
      if (isBrowser) {
        SentryReact.captureMessage(message, { level: 'warning', extra: context });
      } else {
        console.warn(message, context || '');
      }
    }
  },

  error: (error: Error | string, context?: any) => {
    if (isDev) {
      console.error(`${colors.error}[ERROR]${colors.reset} [${getTimestamp()}]`, error, context || '');
    } else {
      if (isBrowser) {
        if (typeof error === 'string') {
          SentryReact.captureMessage(error, { level: 'error', extra: context });
        } else {
          SentryReact.captureException(error, { extra: context });
        }
      }
      console.error(error, context || '');
    }
  },

  debug: (message: string, context?: any) => {
    if (isDev) {
      console.log(`${colors.debug}[DEBUG]${colors.reset} [${getTimestamp()}] ${message}`, context || '');
    } else if (isBrowser) {
      SentryReact.addBreadcrumb({
        category: 'debug',
        message: message,
        data: context,
        level: 'debug',
      });
    }
  },

  cache: (type: 'hit' | 'miss' | 'set' | 'del', message: string) => {
    if (isDev) {
      console.log(`${colors.cache}[CACHE:${type.toUpperCase()}]${colors.reset} [${getTimestamp()}] ${message}`);
    } else if (isBrowser) {
      SentryReact.addBreadcrumb({
        category: 'cache',
        message: `[${type.toUpperCase()}] ${message}`,
        level: 'info',
      });
    }
  }
};

