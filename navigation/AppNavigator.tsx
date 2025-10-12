// navigation/AppNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import NewPatientScreen from '../screens/NewPatientScreen';
import PatientQRCodeScreen from '../screens/PatientQRCodeScreen';
import ScanQRCodeScreen from '../screens/ScanQRCodeScreen';
import AssessmentsScreen from '../screens/AssessmentsScreen';
import DentitionAssessmentScreen from '../screens/DentitionAssessmentScreen';
import HygieneAssessmentScreen from '../screens/HygieneAssessmentScreen';
import FillingsAssessmentScreen from '../screens/FillingsAssessmentScreen';
import ExtractionsAssessmentScreen from '../screens/ExtractionsAssessmentScreen';
import DentureAssessmentScreen from '../screens/DentureAssessmentScreen';
import ImplantAssessmentScreen from '../screens/ImplantAssessmentScreen';

// Treatment Screens
import TreatmentScreen from '../screens/TreatmentScreen';
import ViewAssessmentScreen from '../screens/ViewAssessmentScreen';
import HygieneTreatmentScreen from '../screens/HygieneTreatmentScreen';
import ExtractionsTreatmentScreen from '../screens/ExtractionsTreatmentScreen';
import FillingsTreatmentScreen from '../screens/FillingsTreatmentScreen';
import DentureTreatmentScreen from '../screens/DentureTreatmentScreen';
import ImplantTreatmentScreen from '../screens/ImplantTreatmentScreen';

// Voice Recordings Screen
import VoiceRecordingsScreen from '../screens/VoiceRecordingsScreen';

// Admin Dashboard Screen
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import PatientListScreen from '../screens/PatientListScreen';
import PatientDetailScreen from '../screens/PatientDetailScreen';

// Patient Search Screens - ADD THESE IMPORTS
import PatientSearchScreen from '../screens/PatientSearchScreen';
import PatientProfileScreen from '../screens/PatientProfileScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null; // Optional: show spinner here

  return (
    <Stack.Navigator>
      {user ? (
        <>
          <Stack.Screen 
            name="Home" 
            component={HomeScreen}
            options={{ title: 'Dental Mission Home' }}
          />
          
          {/* Patient Search Screens - ADD THESE TWO SCREENS */}
          <Stack.Screen 
            name="PatientSearch" 
            component={PatientSearchScreen}
            options={{ 
              title: 'Search Patients',
              headerBackTitleVisible: false
            }}
          />
          <Stack.Screen 
            name="PatientProfile" 
            component={PatientProfileScreen}
            options={{ 
              title: 'Patient Profile',
              headerBackTitleVisible: false
            }}
          />
          
          <Stack.Screen 
            name="VoiceRecordings" 
            component={VoiceRecordingsScreen}
            options={{ 
              title: 'Voice Recordings',
              headerBackTitleVisible: false
            }}
          />
          <Stack.Screen 
            name="AdminDashboard" 
            component={AdminDashboardScreen}
            options={{ 
              title: 'Mission Dashboard',
              headerBackTitleVisible: false
            }}
          />
          <Stack.Screen 
            name="PatientList" 
            component={PatientListScreen}
            options={{ 
              title: 'Patient Directory',
              headerBackTitleVisible: false
            }}
          />
          <Stack.Screen 
            name="PatientDetail" 
            component={PatientDetailScreen}
            options={{ 
              title: 'Patient Details',
              headerBackTitleVisible: false
            }}
          />
          <Stack.Screen name="NewPatient" component={NewPatientScreen} />
          <Stack.Screen name="PatientQRCode" component={PatientQRCodeScreen} />
          <Stack.Screen name="ScanQRCode" component={ScanQRCodeScreen} />
          <Stack.Screen name="Assessments" component={AssessmentsScreen} />
          <Stack.Screen name="DentitionAssessment" component={DentitionAssessmentScreen} />
          <Stack.Screen name="HygieneAssessment" component={HygieneAssessmentScreen} />
          <Stack.Screen name="FillingsAssessment" component={FillingsAssessmentScreen} />
          <Stack.Screen name="ExtractionsAssessment" component={ExtractionsAssessmentScreen} />
          <Stack.Screen name="DentureAssessment" component={DentureAssessmentScreen} />
          <Stack.Screen name="ImplantAssessment" component={ImplantAssessmentScreen} />
          
          {/* Treatment Screens */}
          <Stack.Screen name="Treatment" component={TreatmentScreen} />
          <Stack.Screen name="ViewAssessment" component={ViewAssessmentScreen} />
          <Stack.Screen name="HygieneTreatment" component={HygieneTreatmentScreen} />
          <Stack.Screen name="ExtractionsTreatment" component={ExtractionsTreatmentScreen} />
          <Stack.Screen name="FillingsTreatment" component={FillingsTreatmentScreen} />
          <Stack.Screen name="DentureTreatment" component={DentureTreatmentScreen} />
          <Stack.Screen name="ImplantTreatment" component={ImplantTreatmentScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}