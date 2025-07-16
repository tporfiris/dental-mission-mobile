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

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null; // Optional: show spinner here

  return (
    <Stack.Navigator>
      {user ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
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
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
