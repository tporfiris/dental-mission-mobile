import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { database } from '../db'; // adjust path if needed
import DentureAssessment from '../db/models/DentureAssessment';
import { Q } from '@nozbe/watermelondb';
import uuid from 'react-native-uuid';
import { useDentureAssessment } from '../contexts/DentureAssessmentContext';

const DENTURE_TYPES = [
  'none',
  'upper-partial-acrylic',
  'upper-partial-cast',
  'lower-partial-acrylic',
  'lower-partial-cast',
  'upper-immediate-complete',
  'upper-complete',
  'lower-immediate-complete',
  'lower-complete'
] as const;
type DentureType = typeof DENTURE_TYPES[number];

const DENTURE_LABELS = {
  'none': 'No Denture Needed',
  'upper-partial-acrylic': 'Upper Partial Acrylic Denture',
  'upper-partial-cast': 'Upper Partial Cast Denture',
  'lower-partial-acrylic': 'Lower Partial Acrylic Denture',
  'lower-partial-cast': 'Lower Partial Cast Denture',
  'upper-immediate-complete': 'Upper Immediate Complete Denture',
  'upper-complete': 'Upper Complete Denture',
  'lower-immediate-complete': 'Lower Immediate Complete Denture',
  'lower-complete': 'Lower Complete Denture',
};

const RELINE_OPTIONS = {
  'upper-soft-reline': 'Upper Soft Reline',
  'lower-soft-reline': 'Lower Soft Reline',
};

const DentureAssessmentScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  const { 
    dentureState, 
    updateDentureType, 
    updateDentureOptions, 
    updateNotes 
  } = useDentureAssessment();

  const { selectedDentureType, dentureOptions, notes } = dentureState;

  const saveAssessment = async () => {
    try {
      const collection = database.get<DentureAssessment>('denture_assessments');
      console.log('🔎 Looking for existing denture assessment for patient:', patientId);
      const existing = await collection
        .query(Q.where('patient_id', Q.eq(patientId)))
        .fetch();

      console.log('🔍 Matched existing denture assessment:', existing);
  
      // Create comprehensive assessment data object
      const assessmentData = {
        selectedDentureType,
        dentureOptions,
        notes,
        timestamp: new Date().toISOString()
      };
      
      const jsonData = JSON.stringify(assessmentData);
  
      await database.write(async () => {
        console.log("existing denture assessments:")
        console.log(existing)
        console.log("existing length:")
        console.log(existing.length)
        if (existing.length > 0) {
          console.log('🔍 Existing denture assessments for patient', patientId, ':', existing);
          // Update existing record
          await existing[0].update(record => {
            record.data = jsonData;
            record.updatedAt = new Date();
          });
          console.log('✅ Denture assessment updated');
          Alert.alert('✅ Denture assessment updated');
        } else {
          // Create new record
          await collection.create(record => {
            const id = uuid.v4();
            record._raw.id = id;
            record.patientId = patientId; // must match schema!
            record.data = jsonData;
            record.createdAt = new Date();
            record.updatedAt = new Date();
            Alert.alert('✅ Denture assessment created')
            console.log('🔧 Created denture assessment record:', {
              id,
              patient_id: patientId,
              data: jsonData,
            });
          });
        }
      });
    } catch (err) {
      console.error('❌ Failed to save denture assessment:', err);
      Alert.alert('❌ Failed to save denture assessment');
    }
  };

  const toggleRelineOption = (option: string) => {
    const updatedOptions = {
      ...dentureOptions,
      [option]: !dentureOptions[option]
    };
    updateDentureOptions(updatedOptions);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>🦷 Denture Assessment</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

      {/* Denture Type Selection */}
      <View style={styles.dentureTypeCard}>
        <Text style={styles.cardTitle}>Denture Type Selection</Text>
        <View style={styles.dentureGrid}>
          {(Object.keys(DENTURE_LABELS) as DentureType[]).map(type => (
            <Pressable
              key={type}
              style={[
                styles.dentureOption,
                selectedDentureType === type && styles.dentureOptionSelected,
                type === 'none' && styles.dentureOptionNone
              ]}
              onPress={() => updateDentureType(type)}
            >
              <Text style={[
                styles.dentureOptionText,
                selectedDentureType === type && styles.dentureOptionTextSelected,
                type === 'none' && selectedDentureType === type && styles.dentureOptionNoneTextSelected
              ]}>
                {DENTURE_LABELS[type]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Reline Options for Existing Dentures */}
      <View style={styles.relineCard}>
        <Text style={styles.cardTitle}>Existing Denture Services</Text>
        <Text style={styles.relineSubtext}>Select if patient already has dentures that need relining</Text>
        <View style={styles.relineGrid}>
          {Object.entries(RELINE_OPTIONS).map(([key, label]) => (
            <Pressable
              key={key}
              style={[
                styles.relineOption,
                dentureOptions[key] && styles.relineOptionSelected
              ]}
              onPress={() => toggleRelineOption(key)}
            >
              <Text style={[
                styles.relineOptionText,
                dentureOptions[key] && styles.relineOptionTextSelected
              ]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Save Button */}
      <Pressable style={styles.saveButton} onPress={saveAssessment}>
        <Text style={styles.saveButtonText}>Save Assessment</Text>
      </Pressable>
    </ScrollView>
  );
};

export default DentureAssessmentScreen;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtext: {
    fontSize: 12,
    color: '#665',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  dentureTypeCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  dentureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dentureOption: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    width: '48%',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  dentureOptionSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  dentureOptionNone: {
    width: '100%',
  },
  dentureOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  dentureOptionTextSelected: {
    color: 'white',
  },
  dentureOptionNoneTextSelected: {
    color: 'white',
  },
  relineCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  relineSubtext: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  relineGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  relineOption: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    width: '48%',
    borderWidth: 2,
    borderColor: '#ffeaa7',
    alignItems: 'center',
  },
  relineOptionSelected: {
    backgroundColor: '#ffc107',
    borderColor: '#ffc107',
  },
  relineOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#856404',
    textAlign: 'center',
  },
  relineOptionTextSelected: {
    color: 'white',
  },
  saveButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 20,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
});