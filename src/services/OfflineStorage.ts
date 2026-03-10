// services/OfflineStorage.ts
// Using AsyncStorage since react-native-mmkv is not installed.
import AsyncStorage from '@react-native-async-storage/async-storage';

export class OfflineStorage {
  async save(key: string, data: any): Promise<void> {
    const serialized = JSON.stringify({
      data,
      timestamp: Date.now(),
      synced: false,
    });
    await AsyncStorage.setItem(key, serialized);
  }

  async get(key: string): Promise<any> {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  async markSynced(key: string): Promise<void> {
    const item = await this.get(key);
    if (item) {
      item.synced = true;
      await this.save(key, item);
    }
  }
}