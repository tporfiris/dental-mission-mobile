// screens/HomeScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import SyncStatusIndicator from '../components/SyncStatusIndicator';

const HomeScreen = () => {
  const { user, role, logout } = useAuth();
  const navigation = useNavigation<any>();

  const renderRoleSection = () => {
    switch (role) {
      case 'clinician':
        return (
          <>
            <Text style={styles.roleSection}>🦷 Clinician Tools</Text>
            <Button title="Add New Patient" onPress={() => navigation.navigate('NewPatient')} />
            <View style={styles.spacer} />
            <Button title="Scan Patient QR" onPress={() => navigation.navigate('ScanQRCode')} />
            <View style={styles.spacer} />
            <Button 
              title="🎤 Voice Recordings" 
              onPress={() => navigation.navigate('VoiceRecordings')}
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
            <Button title="Scan Patient QR" onPress={() => navigation.navigate('ScanQRCode')} />
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
            <Button 
              title="📊 View Mission Dashboard" 
              onPress={() => navigation.navigate('AdminDashboard')}
              color="#007bff"
            />
            <View style={styles.spacer} />
            <Button title="Register New Patient" onPress={() => navigation.navigate('NewPatient')} />
            <View style={styles.spacer} />
            <Button title="Scan Patient QR" onPress={() => navigation.navigate('ScanQRCode')} />
            <View style={styles.spacer} />
            <Button 
              title="🎤 Voice Recordings" 
              onPress={() => navigation.navigate('VoiceRecordings')}
              color="#6f42c1"
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
      <Text style={styles.text}>Logged in as: {user?.email}</Text>
      <Text style={styles.text}>Role: {role}</Text>

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
  text: { 
    fontSize: 16, 
    marginBottom: 10, 
    textAlign: 'center' 
  },
  roleSection: {
    fontSize: 18,
    marginVertical: 20,
    fontWeight: 'bold',
    color: '#3366CC',
    textAlign: 'center',
  },
  spacer: {
    height: 10,
  },
});