import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { useDentureAssessment } from '../contexts/DentureAssessmentContext';
import VoiceRecorder from '../components/VoiceRecorder';

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
  'upper-complete': 'Upper Complete Denture',
  'lower-complete': 'Lower Complete Denture',
};

const RELINE_OPTIONS = {
  'upper-soft-reline': 'Upper Soft Reline',
  'lower-soft-reline': 'Lower Soft Reline',
};

// Clean Assessment Gate Component
const AssessmentGate = ({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) => {
  const [dentitionCompleted, setDentitionCompleted] = useState(false);
  const [extractionsCompleted, setExtractionsCompleted] = useState(false);

  const canProceed = dentitionCompleted && extractionsCompleted;

  const handleProceed = () => {
    if (canProceed) {
      onConfirm();
    } else {
      Alert.alert(
        'Prerequisites Required',
        'Please confirm both assessments are completed before proceeding.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={true}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>🦷 Denture Assessment</Text>
            <Text style={styles.subtitle}>Prerequisites Required</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.instruction}>
              Please confirm these assessments are completed:
            </Text>

            {/* Dentition Assessment */}
            <View style={styles.checkItem}>
              <Pressable
                style={[styles.checkButton, dentitionCompleted && styles.checkButtonActive]}
                onPress={() => setDentitionCompleted(!dentitionCompleted)}
              >
                {dentitionCompleted && <Text style={styles.checkMark}>✓</Text>}
              </Pressable>
              <View style={styles.checkTextContainer}>
                <Text style={styles.checkTitle}>Dentition Assessment</Text>
                <Text style={styles.checkDescription}>Current tooth status documented</Text>
              </View>
            </View>

            {/* Extractions Assessment */}
            <View style={styles.checkItem}>
              <Pressable
                style={[styles.checkButton, extractionsCompleted && styles.checkButtonActive]}
                onPress={() => setExtractionsCompleted(!extractionsCompleted)}
              >
                {extractionsCompleted && <Text style={styles.checkMark}>✓</Text>}
              </Pressable>
              <View style={styles.checkTextContainer}>
                <Text style={styles.checkTitle}>Extractions Assessment</Text>
                <Text style={styles.checkDescription}>Extraction planning completed</Text>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            
            <Pressable 
              style={[styles.proceedButton, canProceed && styles.proceedButtonEnabled]} 
              onPress={handleProceed}
            >
              <Text style={[styles.proceedButtonText, canProceed && styles.proceedButtonTextEnabled]}>
                Continue
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const DentureAssessmentScreen = ({ route, navigation }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  const [showGate, setShowGate] = useState(true);
  
  const { 
    dentureState, 
    updateDentureType, 
    updateDentureOptions, 
    updateNotes,
    saveAssessment,
  } = useDentureAssessment();

  const { selectedDentureType, dentureOptions, notes } = dentureState;

  const handleGateConfirm = () => {
    setShowGate(false);
  };

  const handleGateCancel = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleSaveAssessment = async () => {
    try {
      await saveAssessment(patientId);
      Alert.alert('Success', 'Denture assessment saved!');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving denture assessment:', error);
      Alert.alert('Error', 'Failed to save assessment. Please try again.');
    }
  };

  const toggleRelineOption = (option: string) => {
    const updatedOptions = {
      ...dentureOptions,
      [option]: !dentureOptions[option]
    };
    updateDentureOptions(updatedOptions);
  };

  if (showGate) {
    return (
      <AssessmentGate 
        onConfirm={handleGateConfirm} 
        onCancel={handleGateCancel}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>🦷 Denture Assessment</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

      {/* Voice Recording Section */}
      <View style={styles.voiceRecordingSection}>
        <Text style={styles.voiceRecordingTitle}>📝 Voice Notes</Text>
        <Text style={styles.voiceRecordingSubtitle}>
          Record voice notes during denture assessment for later reference
        </Text>
        <VoiceRecorder
          patientId={patientId}
          category="Assessment"
          subcategory="Denture"
          buttonStyle={styles.voiceRecorderButton}
        />
      </View>

      {/* Prerequisites Completed Banner */}
      <View style={styles.completedBanner}>
        <Text style={styles.completedText}>
          ✅ Prerequisites confirmed
        </Text>
      </View>

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
      <Pressable style={styles.saveButton} onPress={handleSaveAssessment}>
        <Text style={styles.saveButtonText}>Save Assessment</Text>
      </Pressable>

      {/* Clear All Button */}
      <Pressable 
        style={styles.clearAllButton} 
        onPress={() => {
          Alert.alert(
            'Clear All Data',
            'Are you sure you want to clear all denture assessment data? This cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Clear All', 
                style: 'destructive',
                onPress: () => {
                  updateDentureType('none');
                  updateDentureOptions({
                    'upper-soft-reline': false,
                    'lower-soft-reline': false,
                  });
                  updateNotes('');
                  Alert.alert('Cleared', 'All denture assessment data has been cleared.');
                }
              }
            ]
          );
        }}
      >
        <Text style={styles.clearAllButtonText}>Clear All</Text>
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
  
  voiceRecordingSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#6f42c1',
    width: '100%',
  },
  voiceRecordingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  voiceRecordingSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  voiceRecorderButton: {
    backgroundColor: '#6f42c1',
  },
  
  completedBanner: {
    backgroundColor: '#d4edda',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  completedText: {
    fontSize: 14,
    color: '#155724',
    fontWeight: '500',
    textAlign: 'center',
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  content: {
    padding: 20,
  },
  instruction: {
    fontSize: 15,
    color: '#495057',
    marginBottom: 20,
    textAlign: 'center',
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  checkButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#dee2e6',
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkButtonActive: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  checkMark: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  checkTextContainer: {
    flex: 1,
  },
  checkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  checkDescription: {
    fontSize: 13,
    color: '#6c757d',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  proceedButton: {
    flex: 1,
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  proceedButtonEnabled: {
    backgroundColor: '#007bff',
  },
  proceedButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
  proceedButtonTextEnabled: {
    color: 'white',
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
    marginBottom: 12,
    width: '100%',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  clearAllButton: { 
    backgroundColor: '#fff', 
    borderWidth: 2,
    borderColor: '#dc3545',
    paddingVertical: 12, 
    paddingHorizontal: 24, 
    borderRadius: 8, 
    marginBottom: 20,
    width: '100%',
  },
  clearAllButtonText: { 
    color: '#dc3545', 
    fontWeight: 'bold', 
    fontSize: 16, 
    textAlign: 'center' 
  },
});