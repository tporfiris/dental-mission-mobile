import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, Image, ScrollView } from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import QRCode from 'react-native-qrcode-svg';
import Patient from '../db/models/Patient';

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

      {patient.photoUri ? (
        <Image source={{ uri: patient.photoUri }} style={styles.image} />
      ) : null}

      <View style={styles.infoBox}>
        <Text style={styles.info}>Name: {patient.firstName} {patient.lastName}</Text>
        <Text style={styles.info}>Age: {patient.age}</Text>
        <Text style={styles.info}>Gender: {patient.gender}</Text>
        <Text style={styles.info}>Location: {patient.location}</Text>
      </View>

      <View style={styles.qrContainer}>
        <QRCode value={patient.id} size={200} />
        <Text style={styles.qrText}>Patient ID: {patient.id}</Text>
      </View>

      <View style={styles.buttonGroup}>
        <Button title="🦷 Dentition" onPress={() => navigation.navigate('DentitionAssessment', { patientId })} />
        <Button title="🪥 Hygiene" onPress={() => navigation.navigate('HygieneAssessment', { patientId })} />
        <Button title="🧱 Treatment Planning – Fillings" onPress={() => navigation.navigate('FillingsAssessment', { patientId })} />
        <Button title="🛠️ Treatment Planning – Extractions" onPress={() => navigation.navigate('ExtractionsAssessment', { patientId })} />
        <Button title="🦷 Denture" onPress={() => navigation.navigate('DentureAssessment', { patientId })} />
        <Button title="🧲 Implant" onPress={() => navigation.navigate('ImplantAssessment', { patientId })} />
      </View>
    </ScrollView>
  );
};

export default AssessmentsScreen;

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  infoBox: { marginBottom: 20 },
  info: { fontSize: 16, marginVertical: 2 },
  image: { width: 150, height: 150, borderRadius: 10, marginBottom: 20 },
  qrContainer: { alignItems: 'center', marginVertical: 20 },
  qrText: { marginTop: 10, fontSize: 12, color: '#888' },
  buttonGroup: { width: '100%', gap: 12 },
  loadingText: { padding: 20, fontSize: 16, textAlign: 'center' },
});
