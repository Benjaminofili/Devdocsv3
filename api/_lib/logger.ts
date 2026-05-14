import * as SentryNode from '@sentry/node';

// Determine if we are in a development environment
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
      SentryNode.addBreadcrumb({
        category: 'info',
        message: message,
        data: context,
        level: 'info',
      });
      console.log(message, context || '');
    }
  },

  warn: (message: string, context?: any) => {
    if (isDev) {
      console.warn(`${colors.warn}[WARN]${colors.reset} [${getTimestamp()}] ${message}`, context || '');
    } else {
      SentryNode.captureMessage(message, { level: 'warning', extra: context });
      console.warn(message, context || '');
    }
  },

  error: (error: Error | string, context?: any) => {
    if (isDev) {
      console.error(`${colors.error}[ERROR]${colors.reset} [${getTimestamp()}]`, error, context || '');
    } else {
      if (typeof error === 'string') {
        SentryNode.captureMessage(error, { level: 'error', extra: context });
      } else {
        SentryNode.captureException(error, { extra: context });
      }
      console.error(error, context || '');
    }
  },

  debug: (message: string, context?: any) => {
    if (isDev) {
      console.log(`${colors.debug}[DEBUG]${colors.reset} [${getTimestamp()}] ${message}`, context || '');
    } else {
      SentryNode.addBreadcrumb({
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
    } else {
      SentryNode.addBreadcrumb({
        category: 'cache',
        message: `[${type.toUpperCase()}] ${message}`,
        level: 'info',
      });
    }
  }
};
