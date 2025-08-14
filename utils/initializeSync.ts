// utils/initializeSync.ts
import { simpleFirestoreSyncService } from '../services/SimpleFirestoreSync';

// Initialize sync service when app starts
export const initializeSync = async () => {
  try {
    console.log('🔄 Initializing simple sync service...');
    
    // The service automatically starts its periodic check
    // No manual initialization needed
    
    console.log('✅ Simple sync service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize sync service:', error);
  }
};

// Helper function to trigger immediate sync check (optional)
export const triggerSyncCheck = async () => {
  try {
    console.log('🔍 Triggering immediate sync check...');
    await simpleFirestoreSyncService.forceSync();
  } catch (error) {
    console.error('❌ Error triggering sync check:', error);
  }
};