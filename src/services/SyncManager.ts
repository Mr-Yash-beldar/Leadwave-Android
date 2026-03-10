// services/SyncManager.ts
import NetInfo from '@react-native-community/netinfo';
import { DeviceEventEmitter } from 'react-native';
import { OfflineStorage } from './OfflineStorage';

export class SyncManager {
  private storage: OfflineStorage;
  private syncQueue: Array<{ key: string; data: any }> = [];

  constructor() {
    this.storage = new OfflineStorage();
    this.setupNetworkListener();
  }

  private setupNetworkListener() {
    NetInfo.addEventListener(state => {
      if (state.isConnected && this.syncQueue.length > 0) {
        this.processSyncQueue();
      }
    });
  }

  async queueForSync(key: string, data: any) {
    this.syncQueue.push({ key, data });
    await this.storage.save(key, { ...data, pending: true });

    // Show subtle indicator that item is pending
    this.updatePendingIndicator();
  }

  /**
   * Syncs a single item to the backend.
   * Override or replace this with your real API call.
   */
  private async syncToServer(key: string, data: any): Promise<void> {
    // TODO: Replace with your real API call, e.g.:
    // await api.post(`/sync/${key}`, data);
    // console.log('[SyncManager] syncToServer:', key, data);
  }

  private async processSyncQueue() {
    for (const item of this.syncQueue) {
      try {
        // Sync to your backend
        await this.syncToServer(item.key, item.data);
        await this.storage.markSynced(item.key);

        // Remove from queue
        this.syncQueue = this.syncQueue.filter(q => q.key !== item.key);
      } catch (error) {
        console.error('Sync failed for:', item.key, error);
        // Will retry on next connection
      }
    }

    this.updatePendingIndicator();
  }

  private updatePendingIndicator() {
    // Emit event for UI to listen via DeviceEventEmitter.addListener('pendingSyncUpdate', ...)
    DeviceEventEmitter.emit('pendingSyncUpdate', { count: this.syncQueue.length });
  }
}