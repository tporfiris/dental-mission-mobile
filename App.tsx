// App.tsx

import React from 'react';
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
// import { AudioRecordingProvider } from './contexts/AudioRecordingContext'; // Add this import

import { database } from './db'; // your WatermelonDB instance

export default function App() {
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