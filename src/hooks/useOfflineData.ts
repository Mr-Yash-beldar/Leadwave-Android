// src/hooks/useOfflineData.ts
import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetwork } from '../context/NetworkContext';

interface CacheConfig {
  key: string;
  expiryTime?: number; // in milliseconds, default 5 minutes
}

interface FetchOptions {
  showLoading?: boolean;
  forceRefresh?: boolean;
}

export function useOfflineData<T>(
  fetchFn: () => Promise<{ success: boolean; data: T }>,
  cacheConfig: CacheConfig,
  options: FetchOptions = { showLoading: true }
) {
  const { isOffline, isPoorConnection, addToSyncQueue } = useNetwork();

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(options.showLoading);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const loadFromCache = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(cacheConfig.key);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const expiry = cacheConfig.expiryTime || 5 * 60 * 1000; // 5 minutes default

        // Check if cache is still valid
        if (Date.now() - timestamp < expiry) {
          setData(data);
          setLastUpdated(new Date(timestamp));
          setIsFromCache(true);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error loading from cache:', error);
      return false;
    }
  }, [cacheConfig.key, cacheConfig.expiryTime]);

  const saveToCache = useCallback(async (newData: T) => {
    try {
      const cacheData = {
        data: newData,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(cacheConfig.key, JSON.stringify(cacheData));
      setLastUpdated(new Date());
      setIsFromCache(false);
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }, [cacheConfig.key]);

  const fetchData = useCallback(async (refresh = false) => {
    // If offline or poor connection, try to load from cache
    if (isOffline || isPoorConnection) {
      const cached = await loadFromCache();
      if (!cached) {
        setError(isOffline ? 'You are offline and no cached data is available' : 'Slow connection and no cached data');
      }
      setLoading(false);
      return;
    }

    // Online with good connection
    try {
      if (!refresh) setLoading(true);
      const response = await fetchFn();

      if (response.success) {
        setData(response.data);
        await saveToCache(response.data);
        setError(null);
      } else {
        setError('Failed to fetch data');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      // Try to load from cache on error
      const cached = await loadFromCache();
      if (!cached) {
        setError('Network error and no cached data');
      }
    } finally {
      setLoading(false);
    }
  }, [fetchFn, isOffline, isPoorConnection, loadFromCache, saveToCache]);

  // Load on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]); // Add dependencies that should trigger refetch

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    isFromCache,
    isOffline,
    isPoorConnection,
    refresh,
    refetch: fetchData,
  };
}