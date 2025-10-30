// screens/BeginTreatmentScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const BeginTreatmentScreen = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Begin Treatment</Text>
      <Text style={styles.subtitle}>How would you like to find the patient?</Text>

      <View style={styles.optionsContainer}>
        {/* QR Code Scan Option */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => navigation.navigate('ScanQRCode')}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>📱</Text>
          </View>
          <Text style={styles.optionTitle}>Scan QR Code</Text>
          <Text style={styles.optionDescription}>
            Quickly scan the patient's QR code to begin treatment
          </Text>
        </TouchableOpacity>

        {/* Patient Search Option */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => navigation.navigate('TreatmentPatientSearch')}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔍</Text>
          </View>
          <Text style={styles.optionTitle}>Search Patient</Text>
          <Text style={styles.optionDescription}>
            Find patient by entering their information
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default BeginTreatmentScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e7f3ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 40,
  },
  optionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});