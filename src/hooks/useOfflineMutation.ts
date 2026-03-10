// src/hooks/useOfflineMutation.ts
import { useState } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { Alert } from 'react-native';

interface MutationOptions {
  offlineMessage?: string;
  successMessage?: string;
  showAlerts?: boolean;
}

export function useOfflineMutation<T, P>(
  mutationFn: (params: P) => Promise<{ success: boolean; data?: T; error?: string }>,
  options: MutationOptions = {}
) {
  const { isOffline, isPoorConnection, addToSyncQueue } = useNetwork();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (params: P, queueKey?: string) => {
    setLoading(true);
    setError(null);

    try {
      // If offline or on poor connection, queue for later
      if (isOffline || isPoorConnection) {
        const queueId = queueKey || `mutation_${Date.now()}`;
        
        await addToSyncQueue(queueId, {
          type: 'mutation',
          params,
          timestamp: new Date().toISOString(),
        });

        if (options.showAlerts !== false) {
          Alert.alert(
            '📱 Offline Mode',
            options.offlineMessage || 'Your changes will be saved when connection improves',
            [{ text: 'OK' }]
          );
        }

        setLoading(false);
        return { 
          success: true, 
          offline: true,
          message: options.offlineMessage || 'Saved offline'
        };
      }

      // Online - execute normally
      const response = await mutationFn(params);
      
      if (response.success && options.successMessage && options.showAlerts !== false) {
        Alert.alert('✅ Success', options.successMessage);
      }
      
      setLoading(false);
      return response;
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
      return { success: false, error: err.message };
    }
  };

  return {
    execute,
    loading,
    error,
    isOffline,
    isPoorConnection,
  };
}