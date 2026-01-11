// screens/HomeScreen.tsx - UPDATED with office tracking
import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import SyncStatusIndicator from '../components/SyncStatusIndicator';

const HomeScreen = () => {
  const { user, userProfile, role, logout } = useAuth();
  const navigation = useNavigation<any>();

  const renderRoleSection = () => {
    switch (role) {
      case 'clinician':
        return (
          <>
            <Text style={styles.roleSection}>🦷 Clinician Tools</Text>
            <Button title="Add New Patient" onPress={() => navigation.navigate('NewPatient')} />
            <View style={styles.spacer} />
            <Button 
              title="🔍 Search Existing Patients" 
              onPress={() => navigation.navigate('PatientSearch')}
              color="#17a2b8"
            />
            <View style={styles.spacer} />
            <Button 
              title="🏥 Begin Treatment" 
              onPress={() => navigation.navigate('BeginTreatment')}
              color="#28a745"
            />
            <View style={styles.spacer} />
            <Button 
              title="🎤 Voice Recordings" 
              onPress={() => navigation.navigate('VoiceRecordings')}
              color="#6f42c1"
            />
            <View style={styles.spacer} />
            <Text style={styles.roleSection}>🧪 Testing</Text>
            <Button 
              title="🧪 Hub Sync Test" 
              onPress={() => navigation.navigate('HubTest')}
              color="#6f42c1"
            />
            <View style={styles.spacer} />
          </>
        );
      case 'triage':
        return (
          <>
            <Text style={styles.roleSection}>📋 Triage Intake Tools</Text>
            <Button title="Register New Patient" onPress={() => navigation.navigate('NewPatient')} />
            <View style={styles.spacer} />
            <Button 
              title="🏥 Begin Treatment" 
              onPress={() => navigation.navigate('BeginTreatment')}
              color="#28a745"
            />
            <View style={styles.spacer} />
            <Button 
              title="🔍 Search Existing Patients" 
              onPress={() => navigation.navigate('PatientSearch')}
              color="#17a2b8"
            />
            <View style={styles.spacer} />
            <Button 
              title="🎤 Voice Recordings" 
              onPress={() => navigation.navigate('VoiceRecordings')}
              color="#6f42c1"
            />
            <View style={styles.spacer} />
          </>
        );
      case 'admin':
        return (
          <>
            <Text style={styles.roleSection}>📊 Admin Dashboard Access</Text>
            <Text style={styles.adminNote}>
              As an admin, you have read-only access to view mission data and analytics.
            </Text>
            <View style={styles.spacer} />
            <Button 
              title="📊 View Mission Dashboard" 
              onPress={() => navigation.navigate('AdminDashboard')}
              color="#007bff"
            />
            <View style={styles.spacer} />
            <Button 
              title="🏥 Manage Offices" 
              onPress={() => navigation.navigate('OfficeManagement')}
              color="#6c757d"
            />
            <View style={styles.spacer} />
          </>
        );
      default:
        return <Text style={styles.roleSection}>❓ Unknown Role</Text>;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to the Dental Mission App</Text>
      
      {/* User Info Section */}
      <View style={styles.userInfoCard}>
        <Text style={styles.text}>
          <Text style={styles.label}>Email:</Text> {user?.email}
        </Text>
        <Text style={styles.text}>
          <Text style={styles.label}>Role:</Text> {role}
        </Text>
        
        {/* Show office information if available */}
        {userProfile?.fullName && (
          <Text style={styles.text}>
            <Text style={styles.label}>Name:</Text> {userProfile.fullName}
          </Text>
        )}
        
        {userProfile?.officeName && (
          <View style={styles.officeInfo}>
            <Text style={styles.officeLabel}>🏥 Your Office</Text>
            <Text style={styles.officeName}>{userProfile.officeName}</Text>
            {userProfile.officeLocation && (
              <Text style={styles.officeLocation}>📍 {userProfile.officeLocation}</Text>
            )}
          </View>
        )}
      </View>

      {/* Sync Status Indicator - Compact version for home screen */}
      <SyncStatusIndicator showDetails={false} />

      {renderRoleSection()}

      <View style={styles.spacer} />
      <Button title="Logout" onPress={logout} />
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    padding: 20 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    textAlign: 'center' 
  },
  userInfoCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  text: { 
    fontSize: 14, 
    marginBottom: 8,
    color: '#495057',
  },
  label: {
    fontWeight: '600',
    color: '#212529',
  },
  officeInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  officeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 4,
  },
  officeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 2,
  },
  officeLocation: {
    fontSize: 13,
    color: '#6c757d',
  },
  roleSection: {
    fontSize: 18,
    marginVertical: 20,
    fontWeight: 'bold',
    color: '#3366CC',
    textAlign: 'center',
  },
  adminNote: {
    fontSize: 14,
    marginVertical: 10,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
  spacer: {
    height: 10,
  },
});