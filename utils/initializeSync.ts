// utils/initializeSync.ts
import { simpleFirestoreSyncService } from '../services/SimpleFirestoreSync';

// Initialize Firestore sync service when app starts
export const initializeSync = async () => {
  try {
    console.log('☁️ Initializing Firestore sync service...');
    
    // Just update auth status - don't force sync
    // (sync will be triggered automatically when user logs in)
    simpleFirestoreSyncService.updateAuthStatus();
    
    console.log('✅ Firestore sync service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firestore sync service:', error);
  }
};

// Helper function to trigger immediate sync check (optional)
export const triggerSyncCheck = async () => {
  try {
    console.log('🔍 Triggering immediate Firestore sync check...');
    await simpleFirestoreSyncService.forceSync();
  } catch (error) {
    console.error('❌ Error triggering Firestore sync check:', error);
  }
};