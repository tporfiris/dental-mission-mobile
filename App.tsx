// App.tsx - UPDATED with continuous hub sync
import React, { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './contexts/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
import { DentitionAssessmentProvider } from './contexts/DentitionAssessmentContext';
import { HygieneAssessmentProvider } from './contexts/HygieneAssessmentContext';
import { ExtractionsAssessmentProvider } from './contexts/ExtractionsAssessmentContext';
import { FillingsAssessmentProvider } from './contexts/FillingsAssessmentContext';
import { DentureAssessmentProvider } from './contexts/DentureAssessmentContext';
import { ImplantAssessmentProvider } from './contexts/ImplantAssessmentContext';
import { HygieneTreatmentProvider } from './contexts/HygieneTreatmentContext';
import { ExtractionsTreatmentProvider } from './contexts/ExtractionsTreatmentContext';
import { FillingsTreatmentProvider } from './contexts/FillingsTreatmentContext'; 
import { DentureTreatmentProvider } from './contexts/DentureTreatmentContext';
import { ImplantTreatmentProvider } from './contexts/ImplantTreatmentContext';
// import { AudioRecordingProvider } from './contexts/AudioRecordingContext';

import { database } from './db';
import { initializeSync } from './utils/initializeSync';
import { localHubSyncService } from './services/LocalHubSync';

export default function App() {
  useEffect(() => {
    // Initialize both sync services
    const initializeSyncServices = async () => {
      console.log('🔄 Initializing dual sync system...');
      
      // 1. Initialize Firestore cloud sync (for internet connectivity)
      await initializeSync();
      
      // 2. Initialize Local Hub sync (for mission offline network)
      console.log('📡 Initializing Local Hub sync service...');
      const hubFound = await localHubSyncService.discoverHub();
      
      if (hubFound) {
        console.log('✅ Hub discovered - starting local hub sync');
        // ✅ CHANGE: For testing, use 30 seconds. Change back to 180 after testing works!
        localHubSyncService.startPeriodicSync(30); // 30 seconds for testing
      } else {
        console.log('ℹ️ No hub found - app will work in cloud-only mode');
        console.log('ℹ️ Hub sync will retry if you connect to mission network later');
        
        // ✅ NEW: Auto-retry hub discovery every 2 minutes
        const retryInterval = setInterval(async () => {
          console.log('🔍 Retrying hub discovery...');
          const found = await localHubSyncService.discoverHub();
          if (found) {
            console.log('✅ Hub found on retry - starting sync');
            localHubSyncService.startPeriodicSync(30); // 30 seconds for testing
            clearInterval(retryInterval);
          }
        }, 120000); // 2 minutes
        
        // Store for cleanup
        (global as any).hubRetryInterval = retryInterval;
      }
      
      console.log('✅ Dual sync system initialized');
      console.log('   - Firestore sync: Active (syncs to cloud every 45s)');
      console.log(`   - Local Hub sync: ${hubFound ? 'Active' : 'Standby'} (syncs to hub every 30s)`);
    };
    
    initializeSyncServices();
    
    // ✅ NEW: Handle app state changes (foreground/background)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('📱 App state changed to:', nextAppState);
      
      if (nextAppState === 'active') {
        console.log('📱 App came to foreground - triggering immediate sync');
        // Force sync when app comes back to foreground
        localHubSyncService.forceSync();
      }
    };
    
    // ✅ NEW: Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // ✅ NEW: Cleanup on unmount
    return () => {
      console.log('🛑 App unmounting - stopping sync services');
      localHubSyncService.stopPeriodicSync();
      subscription.remove();
      
      // Clear retry interval if exists
      if ((global as any).hubRetryInterval) {
        clearInterval((global as any).hubRetryInterval);
      }
    };
  }, []);

  return (
    <DatabaseProvider database={database}>
      <AuthProvider>
        {/* <AudioRecordingProvider> */}
          <DentitionAssessmentProvider>
            <HygieneAssessmentProvider>
              <ExtractionsAssessmentProvider>
                <FillingsAssessmentProvider>
                  <DentureAssessmentProvider>
                    <ImplantAssessmentProvider>
                      <HygieneTreatmentProvider>
                        <ExtractionsTreatmentProvider>
                          <FillingsTreatmentProvider>
                            <DentureTreatmentProvider>
                              <ImplantTreatmentProvider>
                                <NavigationContainer>
                                  <AppNavigator />
                                </NavigationContainer>
                              </ImplantTreatmentProvider>
                            </DentureTreatmentProvider>
                          </FillingsTreatmentProvider>
                        </ExtractionsTreatmentProvider>
                      </HygieneTreatmentProvider>
                    </ImplantAssessmentProvider>
                  </DentureAssessmentProvider>
                </FillingsAssessmentProvider>
              </ExtractionsAssessmentProvider>
            </HygieneAssessmentProvider>
          </DentitionAssessmentProvider>
        {/* </AudioRecordingProvider> */}
      </AuthProvider>
    </DatabaseProvider>
  );
}