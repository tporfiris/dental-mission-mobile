// screens/AssessmentsScreen.tsx - UPDATED with Begin Treatment button
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ScrollView, TouchableOpacity } from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import QRCode from 'react-native-qrcode-svg';
import Patient from '../db/models/Patient';
import { SmartImage } from '../components/SmartImage';

const AssessmentsScreen = ({ route, navigation }: any) => {
  const { patientId } = route.params;
  const db = useDatabase();
  const [patient, setPatient] = useState<Patient | null>(null);

  useEffect(() => {
    const loadPatient = async () => {
      try {
        const foundPatient = await db.get<Patient>('patients').find(patientId);
        setPatient(foundPatient);
      } catch (err) {
        console.error('❌ Failed to load patient:', err);
      }
    };
    loadPatient();
  }, [patientId]);

  if (!patient) {
    return <Text style={styles.loadingText}>Loading patient...</Text>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Patient Assessments</Text>

      {/* Patient Information Card */}
      <View style={styles.patientInfoCard}>
        <Text style={styles.sectionTitle}>Patient Information</Text>
        
        {patient.photoUri ? (
          <SmartImage
            localUri={patient.photoUri}
            cloudUri={patient.photoCloudUri}
            style={styles.patientImage}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>No Photo</Text>
          </View>
        )}

        <View style={styles.infoGrid}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{patient.firstName} {patient.lastName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Age:</Text>
            <Text style={styles.infoValue}>{patient.age}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Gender:</Text>
            <Text style={styles.infoValue}>{patient.gender}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location:</Text>
            <Text style={styles.infoValue}>{patient.location}</Text>
          </View>
        </View>
      </View>

      {/* Assessment Buttons Section */}
      <View style={styles.assessmentSection}>
        <Text style={styles.sectionTitle}>Assessment Options</Text>
        <View style={styles.buttonGroup}>
          <View style={styles.buttonRow}>
            <Button title="🦷 Dentition" onPress={() => navigation.navigate('DentitionAssessment', { patientId })} />
          </View>
          <View style={styles.buttonRow}>
            <Button title="🪥 Hygiene" onPress={() => navigation.navigate('HygieneAssessment', { patientId })} />
          </View>
          <View style={styles.buttonRow}>
            <Button title="🧱 Treatment Planning – Fillings" onPress={() => navigation.navigate('FillingsAssessment', { patientId })} />
          </View>
          <View style={styles.buttonRow}>
            <Button title="🛠️ Treatment Planning – Extractions" onPress={() => navigation.navigate('ExtractionsAssessment', { patientId })} />
          </View>
          <View style={styles.buttonRow}>
            <Button title="🦷 Denture" onPress={() => navigation.navigate('DentureAssessment', { patientId })} />
          </View>
          <View style={styles.buttonRow}>
            <Button title="🧲 Implant" onPress={() => navigation.navigate('ImplantAssessment', { patientId })} />
          </View>
        </View>
      </View>

      {/* ✅ NEW: Begin Treatment Button */}
      <View style={styles.treatmentButtonContainer}>
        <TouchableOpacity
          style={styles.beginTreatmentButton}
          onPress={() => navigation.navigate('Treatment', { patientId })}
          activeOpacity={0.8}
        >
          <Text style={styles.beginTreatmentIcon}>🦷</Text>
          <Text style={styles.beginTreatmentText}>Begin Treatment</Text>
          <Text style={styles.beginTreatmentSubtext}>
            Click here to start.
          </Text>
        </TouchableOpacity>
      </View>

      {/* QR Code at Bottom */}
      <View style={styles.qrContainer}>
        <Text style={styles.qrLabel}>Patient QR Code</Text>
        <QRCode value={patient.id} size={100} />
        <Text style={styles.qrText}>ID: {patient.id.slice(0, 8)}...</Text>
      </View>
    </ScrollView>
  );
};

export default AssessmentsScreen;

const styles = StyleSheet.create({
  container: { 
    padding: 20, 
    alignItems: 'center' 
  },
  header: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 20,
    color: '#333'
  },
  loadingText: { 
    padding: 20, 
    fontSize: 16, 
    textAlign: 'center' 
  },
  patientInfoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  patientImage: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    marginBottom: 16 
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  placeholderText: {
    color: '#6c757d',
    fontSize: 12,
  },
  infoGrid: {
    width: '100%',
    marginBottom: 16,
  },
  infoRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  infoLabel: { 
    fontSize: 14, 
    fontWeight: '600',
    color: '#495057',
    flex: 1,
  },
  infoValue: { 
    fontSize: 14, 
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  assessmentSection: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 20,
  },
  buttonGroup: { 
    width: '100%',
  },
  buttonRow: {
    marginBottom: 12,
  },
  // ✅ NEW: Begin Treatment Button Styles
  treatmentButtonContainer: {
    width: '100%',
    marginBottom: 24,
  },
  beginTreatmentButton: {
    backgroundColor: '#28a745',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  beginTreatmentIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  beginTreatmentText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  beginTreatmentSubtext: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
  },
  qrContainer: { 
    alignItems: 'center', 
    marginTop: 10,
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    width: '100%',
  },
  qrLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  qrText: { 
    marginTop: 8, 
    fontSize: 11, 
    color: '#888',
  },
});