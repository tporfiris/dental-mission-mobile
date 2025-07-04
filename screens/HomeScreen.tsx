// This screen:
// - Welcomes the user
// - Shows their email and role
// - Changes the content based on their role
// - Adds a working logout button

import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const HomeScreen = () => {
  const { user, role, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to the Dental Mission App</Text>
      <Text style={styles.text}>Logged in as: {user?.email}</Text>
      <Text style={styles.text}>Role: {role}</Text>

      {role === 'clinician' && <Text style={styles.roleSection}>🦷 Clinician Tools</Text>}
      {role === 'admin' && <Text style={styles.roleSection}>📊 Admin Dashboard</Text>}
      {role === 'triage' && <Text style={styles.roleSection}>📋 Triage Intake</Text>}

      <Button title="Logout" onPress={logout} />
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  text: { fontSize: 16, marginBottom: 10, textAlign: 'center' },
  roleSection: {
    fontSize: 18,
    marginVertical: 20,
    fontWeight: 'bold',
    color: '#3366CC',
    textAlign: 'center',
  },
});
