// src/lib/validators/cache.ts

import { CACHE_CONFIG, INVALID_CONTENT_PATTERNS } from '@/config/constants';

interface CachedResponse {
  content: string;
  [key: string]: any;
}

export const isCacheValid = (cached: CachedResponse | null | undefined): boolean => {
  if (!cached || !cached.content) return false;
  
  // Basic length check
  if (cached.content.length < CACHE_CONFIG.MIN_VALID_CONTENT_LENGTH) return false;

  // Pattern checks
  const isInvalid = INVALID_CONTENT_PATTERNS.some(pattern => 
    cached.content.includes(pattern)
  );

  return !isInvalid;
};

export const isContentCacheable = (content: string | null | undefined): boolean => {
  if (!content) return false;
  if (content.length < CACHE_CONFIG.MIN_VALID_CONTENT_LENGTH) return false;

  const isInvalid = INVALID_CONTENT_PATTERNS.some(pattern => 
    content.includes(pattern)
  );

  return !isInvalid;
};
