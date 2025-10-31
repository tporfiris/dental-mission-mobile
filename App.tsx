// App.tsx
import React, { useEffect } from 'react';
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
        localHubSyncService.startPeriodicSync(180); // 3 minutes
      } else {
        console.log('ℹ️ No hub found - app will work in cloud-only mode');
        console.log('ℹ️ Hub sync will retry if you connect to mission network later');
        
        // Optionally retry hub discovery every 5 minutes
        // Uncomment if you want automatic retry:
        // setTimeout(() => {
        //   localHubSyncService.discoverHub().then(found => {
        //     if (found) localHubSyncService.startPeriodicSync(180);
        //   });
        // }, 300000); // 5 minutes
      }
      
      console.log('✅ Dual sync system initialized');
      console.log('   - Firestore sync: Active (syncs to cloud every 45s)');
      console.log(`   - Local Hub sync: ${hubFound ? 'Active' : 'Standby'} (syncs to hub every 3 min)`);
    };
    
    initializeSyncServices();
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