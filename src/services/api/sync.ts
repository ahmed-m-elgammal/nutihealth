import { SyncOrchestrator, SyncStatus, type SyncQueueItem, type SyncResult } from './syncOrchestrator';

export { SyncStatus };
export type { SyncQueueItem, SyncResult };

export const syncService = new SyncOrchestrator();
export default syncService;
