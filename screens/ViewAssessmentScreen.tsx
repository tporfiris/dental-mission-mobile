import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import DentitionAssessment from '../db/models/DentitionAssessment';
import HygieneAssessment from '../db/models/HygieneAssessment';
import ExtractionsAssessment from '../db/models/ExtractionsAssessment';
import FillingsAssessment from '../db/models/FillingsAssessment';
import DentureAssessment from '../db/models/DentureAssessment';
import ImplantAssessment from '../db/models/ImplantAssessment';

const ViewAssessmentScreen = ({ route }: any) => {
  const { patientId } = route.params;
  const db = useDatabase();
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<any>({
    dentition: null,
    hygiene: null,
    extractions: null,
    fillings: null,
    denture: null,
    implant: null,
  });

  useEffect(() => {
    const loadAssessments = async () => {
      try {
        console.log('🔍 Loading assessments for patient:', patientId);

        // Load all assessment types
        const [dentition, hygiene, extractions, fillings, denture, implant] = await Promise.all([
          db.get<DentitionAssessment>('dentition_assessments').query(Q.where('patient_id', Q.eq(patientId))).fetch(),
          db.get<HygieneAssessment>('hygiene_assessments').query(Q.where('patient_id', Q.eq(patientId))).fetch(),
          db.get<ExtractionsAssessment>('extractions_assessments').query(Q.where('patient_id', Q.eq(patientId))).fetch(),
          db.get<FillingsAssessment>('fillings_assessments').query(Q.where('patient_id', Q.eq(patientId))).fetch(),
          db.get<DentureAssessment>('denture_assessments').query(Q.where('patient_id', Q.eq(patientId))).fetch(),
          db.get<ImplantAssessment>('implant_assessments').query(Q.where('patient_id', Q.eq(patientId))).fetch(),
        ]);

        setAssessments({
          dentition: dentition.length > 0 ? JSON.parse(dentition[0].data) : null,
          hygiene: hygiene.length > 0 ? JSON.parse(hygiene[0].data) : null,
          extractions: extractions.length > 0 ? JSON.parse(extractions[0].data) : null,
          fillings: fillings.length > 0 ? JSON.parse(fillings[0].data) : null,
          denture: denture.length > 0 ? JSON.parse(denture[0].data) : null,
          implant: implant.length > 0 ? JSON.parse(implant[0].data) : null,
        });

        console.log('✅ Assessments loaded successfully');
      } catch (err) {
        console.error('❌ Failed to load assessments:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAssessments();
  }, [patientId]);

  const renderAssessmentCard = (title: string, data: any, emoji: string) => {
    if (!data) {
      return (
        <View style={styles.assessmentCard}>
          <Text style={styles.assessmentTitle}>{emoji} {title}</Text>
          <Text style={styles.noDataText}>No assessment data available</Text>
        </View>
      );
    }

    return (
      <View style={styles.assessmentCard}>
        <Text style={styles.assessmentTitle}>{emoji} {title}</Text>
        <Text style={styles.dataText}>Assessment completed</Text>
        <Text style={styles.jsonData}>{JSON.stringify(data, null, 2)}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading assessments...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>📋 Patient Assessment Summary</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

      {renderAssessmentCard('Dentition Assessment', assessments.dentition, '🦷')}
      {renderAssessmentCard('Hygiene Assessment', assessments.hygiene, '🪥')}
      {renderAssessmentCard('Extractions Assessment', assessments.extractions, '🛠️')}
      {renderAssessmentCard('Fillings Assessment', assessments.fillings, '🧱')}
      {renderAssessmentCard('Denture Assessment', assessments.denture, '🦷')}
      {renderAssessmentCard('Implant Assessment', assessments.implant, '🧲')}
    </ScrollView>
  );
};

export default ViewAssessmentScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  assessmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  assessmentTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  dataText: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '500',
    marginBottom: 8,
  },
  jsonData: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 6,
    fontFamily: 'monospace',
  },
});