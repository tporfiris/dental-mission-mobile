// screens/PatientActionSelectionScreen.tsx - Choose between Assessment or Treatment
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';

const PatientActionSelectionScreen = ({ route, navigation }: any) => {
  const { patientId, patientName } = route.params;

  const handleAssessment = () => {
    navigation.navigate('Assessments', { patientId });
  };

  const handleTreatment = () => {
    navigation.navigate('Treatment', { patientId });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>What would you like to do?</Text>
          {patientName && (
            <Text style={styles.patientName}>Patient: {patientName}</Text>
          )}
          <Text style={styles.subtitle}>
            Choose whether to perform an assessment or begin treatment
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          {/* Assessment Button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.assessmentButton]}
            onPress={handleAssessment}
            activeOpacity={0.8}
          >
            <View style={styles.buttonIcon}>
              <Text style={styles.iconText}>📋</Text>
            </View>
            <Text style={styles.buttonTitle}>Patient Assessment</Text>
            <Text style={styles.buttonDescription}>
              Perform comprehensive dental assessments including dentition, hygiene, and treatment needs
            </Text>
          </TouchableOpacity>

          {/* Treatment Button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.treatmentButton]}
            onPress={handleTreatment}
            activeOpacity={0.8}
          >
            <View style={styles.buttonIcon}>
              <Text style={styles.iconText}>🦷</Text>
            </View>
            <Text style={styles.buttonTitle}>Begin Treatment</Text>
            <Text style={styles.buttonDescription}>
              Record treatments including extractions, fillings, cleanings, and other procedures
            </Text>
          </TouchableOpacity>
        </View>

        {/* Skip Button */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.skipButtonText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  patientName: {
    fontSize: 18,
    color: '#007bff',
    fontWeight: '600',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  buttonsContainer: {
    gap: 20,
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 2,
  },
  assessmentButton: {
    borderColor: '#007bff',
  },
  treatmentButton: {
    borderColor: '#28a745',
  },
  buttonIcon: {
    marginBottom: 16,
  },
  iconText: {
    fontSize: 64,
  },
  buttonTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  buttonDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  skipButton: {
    marginTop: 32,
    padding: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});

export default PatientActionSelectionScreen;