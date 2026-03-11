import { api, apiCall } from '../apiWrapper';
import type { ApiResponse } from './types';

/**
 * @deprecated Use `api`/`apiCall` from `services/apiWrapper` directly.
 * This file remains as a compatibility surface for legacy imports.
 */
export type { ApiResponse };
export { api, apiCall };

export const apiClient = api;
export default apiClient;
