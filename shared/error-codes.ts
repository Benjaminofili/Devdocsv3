/**
 * ERROR CODES - SINGLE SOURCE OF TRUTH
 * All error codes for the API surface
 * 
 * Format: {CATEGORY}_{NUMBER}
 * Categories:
 *   - AUTH: Authentication/Authorization errors
 *   - GEN: Generation errors
 *   - TIER: Tier/limit errors
 *   - BILLING: Payment/billing errors
 *   - REPO: Repository access errors
 *   - VALIDATION: Input validation errors
 */

export const ERROR_CODES = {
  // Authentication errors (AUTH_001-099)
  AUTH_MISSING_TOKEN: {
    code: 'AUTH_001',
    message: 'Missing authentication token',
    httpStatus: 401,
  },
  AUTH_INVALID_TOKEN: {
    code: 'AUTH_002',
    message: 'Invalid authentication token',
    httpStatus: 401,
  },
  AUTH_TOKEN_EXPIRED: {
    code: 'AUTH_003',
    message: 'Authentication token has expired',
    httpStatus: 401,
  },
  AUTH_UNAUTHORIZED: {
    code: 'AUTH_004',
    message: 'Unauthorized access',
    httpStatus: 401,
  },
  
  // Generation errors (GEN_001-099)
  GEN_FAILED: {
    code: 'GEN_001',
    message: 'README generation failed',
    httpStatus: 500,
  },
  GEN_TIMEOUT: {
    code: 'GEN_002',
    message: 'Generation timed out',
    httpStatus: 504,
  },
  GEN_AI_ERROR: {
    code: 'GEN_003',
    message: 'AI provider error',
    httpStatus: 502,
  },
  GEN_INVALID_PROFILE: {
    code: 'GEN_004',
    message: 'Invalid repository profile',
    httpStatus: 400,
  },
  
  // Tier/limit errors (TIER_001-099)
  TIER_LIMIT_EXCEEDED: {
    code: 'TIER_001',
    message: 'Generation limit exceeded for your tier',
    httpStatus: 429,
  },
  TIER_UPGRADE_REQUIRED: {
    code: 'TIER_002',
    message: 'Upgrade required to access this feature',
    httpStatus: 403,
  },
  TIER_REPO_SIZE_EXCEEDED: {
    code: 'TIER_003',
    message: 'Repository size exceeds your tier limit',
    httpStatus: 413,
  },
  
  // Billing errors (BILLING_001-099)
  BILLING_INVALID_SIGNATURE: {
    code: 'BILLING_001',
    message: 'Invalid payment signature',
    httpStatus: 401,
  },
  BILLING_AMOUNT_MISMATCH: {
    code: 'BILLING_002',
    message: 'Payment amount does not match plan price',
    httpStatus: 400,
  },
  BILLING_ALREADY_PROCESSED: {
    code: 'BILLING_003',
    message: 'Payment already processed',
    httpStatus: 200, // Idempotent - return success
  },
  BILLING_PLAN_NOT_FOUND: {
    code: 'BILLING_004',
    message: 'Plan not found',
    httpStatus: 404,
  },
  
  // Repository errors (REPO_001-099)
  REPO_NOT_FOUND: {
    code: 'REPO_001',
    message: 'Repository not found or inaccessible',
    httpStatus: 404,
  },
  REPO_ACCESS_DENIED: {
    code: 'REPO_002',
    message: 'Access denied to repository',
    httpStatus: 403,
  },
  REPO_INVALID_URL: {
    code: 'REPO_003',
    message: 'Invalid GitHub repository URL',
    httpStatus: 400,
  },
  REPO_TOO_LARGE: {
    code: 'REPO_004',
    message: 'Repository exceeds maximum file count',
    httpStatus: 413,
  },
  
  // Validation errors (VALIDATION_001-099)
  VALIDATION_INVALID_INPUT: {
    code: 'VALIDATION_001',
    message: 'Invalid input',
    httpStatus: 400,
  },
  VALIDATION_MISSING_FIELD: {
    code: 'VALIDATION_002',
    message: 'Missing required field',
    httpStatus: 400,
  },
  VALIDATION_INVALID_FORMAT: {
    code: 'VALIDATION_003',
    message: 'Invalid format',
    httpStatus: 400,
  },
  
  // Rate limiting (RATE_001-099)
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_001',
    message: 'Rate limit exceeded',
    httpStatus: 429,
  },
} as const;

export type ErrorCodeKey = keyof typeof ERROR_CODES;

export interface ErrorDefinition {
  code: string;
  message: string;
  httpStatus: number;
}

/**
 * Get error definition by key
 */
export function getError(key: ErrorCodeKey): ErrorDefinition {
  return ERROR_CODES[key];
}

/**
 * Create an API error response
 */
export function createErrorResponse(
  key: ErrorCodeKey,
  customMessage?: string
): { error: string; code: string } {
  const errorDef = ERROR_CODES[key];
  return {
    error: customMessage || errorDef.message,
    code: errorDef.code,
  };
}
