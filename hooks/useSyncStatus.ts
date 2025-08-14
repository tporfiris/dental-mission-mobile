// hooks/useSyncStatus.ts
import { useState, useEffect } from 'react';
import { simpleFirestoreSyncService, SyncStatus } from '../services/SimpleFirestoreSync';

export const useSyncStatus = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    simpleFirestoreSyncService.getSyncStatus()
  );

  useEffect(() => {
    // Subscribe to sync status updates
    const unsubscribe = simpleFirestoreSyncService.subscribe(setSyncStatus);

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  const forceSync = async () => {
    await simpleFirestoreSyncService.forceSync();
  };

  return {
    syncStatus,
    forceSync,
  };
};