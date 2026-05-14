// src/lib/withSentry.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as SentryNode from '@sentry/node';

// Initialize Sentry for the Node.js (Serverless) environment
SentryNode.init({
  // WARNING: Replace this with your NODE.JS DSN in your .env as SENTRY_NODE_DSN
  dsn: process.env.SENTRY_NODE_DSN,
  tracesSampleRate: 1.0,
});

type VercelHandler = (req: VercelRequest, res: VercelResponse) => Promise<any> | void;

export function withSentry(handler: VercelHandler): VercelHandler {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      return await handler(req, res);
    } catch (error) {
      console.error('Unhandled API Error Caught by Sentry Wrapper:', error);
      
      // Capture the exception
      SentryNode.captureException(error, {
        tags: {
          endpoint: req.url,
          method: req.method,
        }
      });

      // CRITICAL: Force Sentry to flush the event before Vercel kills the function
      await SentryNode.flush(2000); 

      return res.status(500).json({ 
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      });
    }
  };
}
