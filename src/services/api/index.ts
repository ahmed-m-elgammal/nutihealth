import { apiCall, api, ApiCallOptions } from '../apiWrapper';

// Re-export for backward compatibility
export { apiCall, api };
export type { ApiCallOptions };

/**
 * @deprecated Use apiCall or api methods from apiWrapper.ts instead
 * This file maintains backward compatibility with existing code
 * that imports from services/api/client.ts
 */
