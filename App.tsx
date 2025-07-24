// App.tsx

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './contexts/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
import { DentitionAssessmentProvider } from './contexts/DentitionAssessmentContext'; // adjust path
import { database } from './db'; // your WatermelonDB instance

export default function App() {
  return (
    <DatabaseProvider database={database}>
      <AuthProvider>
        <DentitionAssessmentProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
        </DentitionAssessmentProvider>
      </AuthProvider>
    </DatabaseProvider>
  );
}
