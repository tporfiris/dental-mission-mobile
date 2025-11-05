import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ScrollView } from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import QRCode from 'react-native-qrcode-svg';
import Patient from '../db/models/Patient';
import { SmartImage } from '../components/SmartImage';

const TreatmentScreen = ({ route, navigation }: any) => {
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
      <Text style={styles.header}>Patient Treatment</Text>

      {/* Patient Information Section */}
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
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Patient ID:</Text>
            <Text style={styles.infoValue}>{patient.id}</Text>
          </View>
        </View>

        <View style={styles.qrContainer}>
          <QRCode value={patient.id} size={120} />
        </View>
      </View>

      {/* View Assessment Button */}
      <View style={styles.assessmentSection}>
        <Button 
          title="📋 View Assessment" 
          onPress={() => navigation.navigate('ViewAssessment', { patientId })} 
        />
      </View>

      {/* Treatment Buttons Section */}
      <View style={styles.treatmentSection}>
        <Text style={styles.sectionTitle}>Treatment Options</Text>
        <View style={styles.buttonGrid}>
          <View style={styles.buttonRow}>
            <Button 
              title="🪥 Hygiene" 
              onPress={() => navigation.navigate('HygieneTreatment', { patientId })} 
            />
          </View>
          <View style={styles.buttonRow}>
            <Button 
              title="🛠️ Extractions" 
              onPress={() => navigation.navigate('ExtractionsTreatment', { patientId })} 
            />
          </View>
          <View style={styles.buttonRow}>
            <Button 
              title="🧱 Fillings" 
              onPress={() => navigation.navigate('FillingsTreatment', { patientId })} 
            />
          </View>
          <View style={styles.buttonRow}>
            <Button 
              title="🦷 Denture Placement" 
              onPress={() => navigation.navigate('DentureTreatment', { patientId })} 
            />
          </View>
          <View style={styles.buttonRow}>
            <Button 
              title="🧲 Implant Placement" 
              onPress={() => navigation.navigate('ImplantTreatment', { patientId })} 
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default TreatmentScreen;

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
  qrContainer: { 
    alignItems: 'center', 
    marginTop: 10 
  },
  assessmentSection: {
    width: '100%',
    marginBottom: 20,
  },
  treatmentSection: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  buttonGrid: {
    width: '100%',
  },
  buttonRow: {
    marginBottom: 12,
  },
});