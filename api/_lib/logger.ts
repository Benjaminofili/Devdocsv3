import * as SentryNode from '@sentry/node';

// Determine if we are in a development environment
const isDev = process.env.NODE_ENV === 'development';

const colors = {
  info: '\x1b[32m',    // Green
  warn: '\x1b[33m',    // Yellow
  error: '\x1b[31m',   // Red
  debug: '\x1b[36m',   // Cyan
  reset: '\x1b[0m'
};

const getTimestamp = () => new Date().toISOString();

/**
 * Structured JSON log output for production
 * Format: { level, message, uid, requestId, timestamp, ...metadata }
 * 
 * NEVER log: tokens, passwords, GitHub OAuth tokens, full request bodies with file contents
 */
export const logger = {
  /**
   * Log an info-level message
   * Events: auth_success, auth_failure, generation_start, generation_success
   */
  info: (message: string, metadata?: { uid?: string; requestId?: string; [key: string]: unknown }) => {
    if (isDev) {
      console.log(`${colors.info}[INFO]${colors.reset} [${getTimestamp()}] ${message}`, metadata || '');
    } else {
      // Structured JSON output for production
      const logEntry = {
        level: 'info',
        message,
        uid: metadata?.uid,
        requestId: metadata?.requestId,
        timestamp: getTimestamp(),
        ...metadata,
      };
      console.log(JSON.stringify(logEntry));
      
      SentryNode.addBreadcrumb({
        category: 'info',
        message: message,
        data: metadata,
        level: 'info',
      });
    }
  },

  /**
   * Log a warning-level message
   */
  warn: (message: string, metadata?: { uid?: string; requestId?: string; [key: string]: unknown }) => {
    if (isDev) {
      console.warn(`${colors.warn}[WARN]${colors.reset} [${getTimestamp()}] ${message}`, metadata || '');
    } else {
      const logEntry = {
        level: 'warn',
        message,
        uid: metadata?.uid,
        requestId: metadata?.requestId,
        timestamp: getTimestamp(),
        ...metadata,
      };
      console.log(JSON.stringify(logEntry));
      
      SentryNode.captureMessage(message, { level: 'warning', extra: metadata });
    }
  },

  /**
   * Log an error-level message
   * NEVER return error.message directly to clients
   */
  error: (error: Error | string, metadata?: { uid?: string; requestId?: string; [key: string]: unknown }) => {
    const errorMessage = typeof error === 'string' ? error : error.message;
    
    if (isDev) {
      console.error(`${colors.error}[ERROR]${colors.reset} [${getTimestamp()}]`, error, metadata || '');
    } else {
      const logEntry = {
        level: 'error',
        message: errorMessage,
        uid: metadata?.uid,
        requestId: metadata?.requestId,
        timestamp: getTimestamp(),
        ...metadata,
      };
      console.log(JSON.stringify(logEntry));
      
      if (typeof error === 'string') {
        SentryNode.captureMessage(error, { level: 'error', extra: metadata });
      } else {
        SentryNode.captureException(error, { extra: metadata });
      }
    }
  },

  /**
   * Log a debug-level message
   */
  debug: (message: string, metadata?: { uid?: string; requestId?: string; [key: string]: unknown }) => {
    if (isDev) {
      console.log(`${colors.debug}[DEBUG]${colors.reset} [${getTimestamp()}] ${message}`, metadata || '');
    } else {
      const logEntry = {
        level: 'debug',
        message,
        uid: metadata?.uid,
        requestId: metadata?.requestId,
        timestamp: getTimestamp(),
        ...metadata,
      };
      console.log(JSON.stringify(logEntry));
      
      SentryNode.addBreadcrumb({
        category: 'debug',
        message: message,
        data: metadata,
        level: 'debug',
      });
    }
  },

  /**
   * Log authentication events
   * Events: auth_success, auth_failure
   */
  auth: (event: 'success' | 'failure', metadata?: { uid?: string; reason?: string }) => {
    const message = event === 'success' ? 'auth_success' : 'auth_failure';
    if (event === 'success') {
      logger.info(message, metadata);
    } else {
      logger.warn(message, metadata);
    }
  },

  /**
   * Log generation events
   * Events: generation_start, generation_success, generation_failure
   */
  generation: (event: 'start' | 'success' | 'failure', metadata?: { uid?: string; sectionId?: string; provider?: string; ms?: number }) => {
    const message = `generation_${event}`;
    if (event === 'failure') {
      logger.error(message, metadata);
    } else {
      logger.info(message, metadata);
    }
  },

  /**
   * Log webhook events
   * Events: webhook_received, webhook_verified, webhook_rejected
   */
  webhook: (event: 'received' | 'verified' | 'rejected', metadata?: { uid?: string; reference?: string; reason?: string }) => {
    const message = `webhook_${event}`;
    if (event === 'rejected') {
      logger.warn(message, metadata);
    } else {
      logger.info(message, metadata);
    }
  },

  /**
   * Log tier update events
   */
  tier: (event: 'updated', metadata?: { uid?: string; oldTier?: string; newTier?: string }) => {
    logger.info('tier_updated', metadata);
  },
};
