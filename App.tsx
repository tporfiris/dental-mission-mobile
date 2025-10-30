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
import { ImplantAssessmentProvider } from './contexts/ImplantAssessmentContext'; // NEW SIMPLE CONTEXT
import { HygieneTreatmentProvider } from './contexts/HygieneTreatmentContext';
import { ExtractionsTreatmentProvider } from './contexts/ExtractionsTreatmentContext';
import { FillingsTreatmentProvider } from './contexts/FillingsTreatmentContext'; 
import { DentureTreatmentProvider } from './contexts/DentureTreatmentContext';
import { ImplantTreatmentProvider } from './contexts/ImplantTreatmentContext';
// import { AudioRecordingProvider } from './contexts/AudioRecordingContext'; // Add this import
import { localHubSyncService } from './services/LocalHubSync';

import { database } from './db'; // your WatermelonDB instance
import { initializeSync } from './utils/initializeSync';

export default function App() {
  useEffect(() => {
    // Initialize sync service when app starts
    initializeSync();
  }, []);

  useEffect(() => {
    // Try to connect to hub on app start
    localHubSyncService.discoverHub();
    
    // Start periodic sync (will only work if hub is found)
    localHubSyncService.startPeriodicSync(180); // 3 minutes
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