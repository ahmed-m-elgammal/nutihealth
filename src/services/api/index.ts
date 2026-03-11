import { apiCall, api, ApiCallOptions } from '../apiWrapper';
import type { ApiResponse, ApiError } from './types';

// Re-export for backward compatibility
export { apiCall, api };
export type { ApiCallOptions };
export type { ApiResponse, ApiError };

/**
 * @deprecated Use apiCall/api from apiWrapper.ts (or services/api/client.ts compatibility re-export) instead
 * This file maintains backward compatibility with existing code
 * that imports from services/api/client.ts or services/api/index.ts
 */
