// screens/DentureAssessmentScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { useDentureAssessment, defaultDentureState } from '../contexts/DentureAssessmentContext';
import VoiceRecorder from '../components/VoiceRecorder';
import { useFocusEffect } from '@react-navigation/native';

// Get screen dimensions for responsive scaling
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive scaling functions
const scaleWidth = (size: number) => (SCREEN_WIDTH / 390) * size;
const scaleHeight = (size: number) => (SCREEN_HEIGHT / 844) * size;
const scaleFontSize = (size: number) => Math.round(scaleWidth(size));

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

const DENTURE_LABELS: Record<string, string> = {
  'none': 'No Denture Needed',
  'upper-partial-acrylic': 'Upper Partial Acrylic Denture',
  'upper-partial-cast': 'Upper Partial Cast Denture',
  'lower-partial-acrylic': 'Lower Partial Acrylic Denture',
  'lower-partial-cast': 'Lower Partial Cast Denture',
  'upper-complete': 'Upper Complete Denture',
  'lower-complete': 'Lower Complete Denture',
};

const RELINE_OPTIONS: Record<string, string> = {
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
    saveAssessment,
    loadLatestAssessment,
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft,
  } = useDentureAssessment();

  // ✅ LOCAL STATE - manages all assessment data
  const [selectedDentureType, setSelectedDentureType] = useState<DentureType>('none');
  const [dentureOptions, setDentureOptions] = useState({
    'upper-soft-reline': false,
    'lower-soft-reline': false,
  });
  const [notes, setNotes] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  
  const previousPatientIdRef = useRef<string | null>(null);
  const justSavedRef = useRef<boolean>(false); // ✅ Track if we just saved

  // ✅ LOAD STATE when screen focuses
  useFocusEffect(
    React.useCallback(() => {
      const loadState = async () => {
        try {
          console.log('🔄 Loading denture state for patient:', patientId);
          
          // Check if patient changed
          if (previousPatientIdRef.current && previousPatientIdRef.current !== patientId) {
            console.log('🔄 Patient changed from', previousPatientIdRef.current, 'to', patientId);
            justSavedRef.current = false; // Reset on patient change
          }
          previousPatientIdRef.current = patientId;
          
          // ✅ If we just saved, start fresh (don't load anything)
          if (justSavedRef.current) {
            console.log('✨ Just saved - starting fresh');
            setSelectedDentureType(defaultDentureState.selectedDentureType);
            setDentureOptions(defaultDentureState.dentureOptions);
            setNotes(defaultDentureState.notes);
            setIsLoaded(true);
            justSavedRef.current = false; // Reset flag
            return;
          }
          
          // STEP 1: Check for draft first
          const draft = loadDraft(patientId);
          
          if (draft) {
            console.log('📋 Loading denture draft:', draft);
            setSelectedDentureType(draft.selectedDentureType);
            setDentureOptions(draft.dentureOptions);
            setNotes(draft.notes);
            setIsLoaded(true);
            return;
          }
          
          // STEP 2: Start fresh (don't load saved assessments automatically)
          console.log('📋 No draft - starting fresh');
          setSelectedDentureType(defaultDentureState.selectedDentureType);
          setDentureOptions(defaultDentureState.dentureOptions);
          setNotes(defaultDentureState.notes);
          
          setIsLoaded(true);
        } catch (error) {
          console.error('❌ Error loading denture state:', error);
          setSelectedDentureType(defaultDentureState.selectedDentureType);
          setDentureOptions(defaultDentureState.dentureOptions);
          setNotes(defaultDentureState.notes);
          setIsLoaded(true);
        }
      };
      
      loadState();
      
      // Cleanup function - save draft when leaving
      return () => {
        if (isLoaded && !justSavedRef.current) {
          console.log('💾 Saving denture draft on blur');
          saveDraft(patientId, {
            selectedDentureType,
            dentureOptions,
            notes,
          });
        }
      };
    }, [patientId])
  );

  // ✅ SAVE DRAFT when state changes (debounced)
  useEffect(() => {
    if (!isLoaded) return; // Don't save during initial load
    
    const timeoutId = setTimeout(() => {
      console.log('💾 Auto-saving denture draft');
      saveDraft(patientId, {
        selectedDentureType,
        dentureOptions,
        notes,
      });
    }, 500); // Debounce for 500ms
    
    return () => clearTimeout(timeoutId);
  }, [selectedDentureType, dentureOptions, notes, isLoaded, patientId]);

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
      console.log('💾 Saving denture assessment...');
      
      const assessmentData = {
        selectedDentureType,
        dentureOptions,
        notes,
      };
      
      console.log('💾 Final denture assessment data:', assessmentData);
      
      await saveAssessment(patientId, assessmentData);
      
      // ✅ Set flag so we start fresh on next visit
      justSavedRef.current = true;
      
      Alert.alert('Success', 'Denture assessment saved!');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving denture assessment:', error);
      Alert.alert('Error', 'Failed to save assessment. Please try again.');
    }
  };

  const toggleRelineOption = (option: string) => {
    setDentureOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to clear all denture assessment data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: () => {
            setSelectedDentureType(defaultDentureState.selectedDentureType);
            setDentureOptions(defaultDentureState.dentureOptions);
            setNotes(defaultDentureState.notes);
            clearDraft(patientId);
            Alert.alert('Cleared', 'All denture assessment data has been cleared.');
          }
        }
      ]
    );
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
              onPress={() => setSelectedDentureType(type)}
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
      <Pressable style={styles.clearAllButton} onPress={handleClearAll}>
        <Text style={styles.clearAllButtonText}>Clear All</Text>
      </Pressable>
    </ScrollView>
  );
};

export default DentureAssessmentScreen;

const styles = StyleSheet.create({
  container: {
    padding: scaleWidth(20),
    alignItems: 'center',
  },
  header: {
    fontSize: scaleFontSize(22),
    fontWeight: 'bold',
    marginBottom: scaleHeight(4),
  },
  subtext: {
    fontSize: scaleFontSize(12),
    color: '#665',
    marginBottom: scaleHeight(16),
  },
  
  voiceRecordingSection: {
    backgroundColor: '#fff',
    borderRadius: scaleWidth(12),
    padding: scaleWidth(16),
    marginBottom: scaleHeight(20),
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
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: '#333',
    marginBottom: scaleHeight(4),
  },
  voiceRecordingSubtitle: {
    fontSize: scaleFontSize(12),
    color: '#666',
    marginBottom: scaleHeight(12),
    lineHeight: scaleFontSize(16),
  },
  voiceRecorderButton: {
    backgroundColor: '#6f42c1',
  },
  
  completedBanner: {
    backgroundColor: '#d4edda',
    borderRadius: scaleWidth(8),
    padding: scaleWidth(12),
    marginBottom: scaleHeight(20),
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  completedText: {
    fontSize: scaleFontSize(14),
    color: '#155724',
    fontWeight: '500',
    textAlign: 'center',
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scaleWidth(20),
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: scaleWidth(16),
    width: '100%',
    maxWidth: scaleWidth(380),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    padding: scaleWidth(20),
  },
  title: {
    fontSize: scaleFontSize(20),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: scaleHeight(4),
  },
  subtitle: {
    fontSize: scaleFontSize(14),
    color: '#666',
    fontWeight: '500',
  },
  content: {
    padding: scaleWidth(20),
  },
  instruction: {
    fontSize: scaleFontSize(15),
    color: '#495057',
    marginBottom: scaleHeight(20),
    textAlign: 'center',
    lineHeight: scaleFontSize(20),
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleHeight(16),
    padding: scaleWidth(12),
    backgroundColor: '#f8f9fa',
    borderRadius: scaleWidth(8),
  },
  checkButton: {
    width: scaleWidth(28),
    height: scaleWidth(28),
    borderRadius: scaleWidth(6),
    borderWidth: 2,
    borderColor: '#dee2e6',
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scaleWidth(12),
  },
  checkButtonActive: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  checkMark: {
    color: 'white',
    fontSize: scaleFontSize(18),
    fontWeight: 'bold',
  },
  checkTextContainer: {
    flex: 1,
  },
  checkTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: '#333',
    marginBottom: scaleHeight(2),
  },
  checkDescription: {
    fontSize: scaleFontSize(13),
    color: '#6c757d',
    lineHeight: scaleFontSize(17),
  },
  actions: {
    flexDirection: 'row',
    padding: scaleWidth(20),
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: scaleWidth(12),
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    borderRadius: scaleWidth(8),
    paddingVertical: scaleHeight(14),
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: scaleFontSize(16),
    fontWeight: '600',
  },
  proceedButton: {
    flex: 1,
    backgroundColor: '#e9ecef',
    borderRadius: scaleWidth(8),
    paddingVertical: scaleHeight(14),
    alignItems: 'center',
  },
  proceedButtonEnabled: {
    backgroundColor: '#007bff',
  },
  proceedButtonText: {
    color: '#6c757d',
    fontSize: scaleFontSize(16),
    fontWeight: '600',
  },
  proceedButtonTextEnabled: {
    color: 'white',
  },

  cardTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    marginBottom: scaleHeight(12),
    color: '#333',
  },
  dentureTypeCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: scaleWidth(12),
    padding: scaleWidth(16),
    width: '100%',
    marginBottom: scaleHeight(16),
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
    borderRadius: scaleWidth(8),
    padding: scaleWidth(10),
    width: '48%',
    marginBottom: scaleHeight(8),
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
    fontSize: scaleFontSize(12),
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
    borderRadius: scaleWidth(12),
    padding: scaleWidth(16),
    width: '100%',
    marginBottom: scaleHeight(16),
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  relineSubtext: {
    fontSize: scaleFontSize(12),
    color: '#856404',
    marginBottom: scaleHeight(12),
    fontStyle: 'italic',
  },
  relineGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  relineOption: {
    backgroundColor: 'white',
    borderRadius: scaleWidth(8),
    padding: scaleWidth(12),
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
    fontSize: scaleFontSize(12),
    fontWeight: '600',
    color: '#856404',
    textAlign: 'center',
  },
  relineOptionTextSelected: {
    color: 'white',
  },
  saveButton: {
    backgroundColor: '#007bff',
    paddingVertical: scaleHeight(12),
    paddingHorizontal: scaleWidth(24),
    borderRadius: scaleWidth(8),
    marginBottom: scaleHeight(12),
    width: '100%',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: scaleFontSize(16),
    textAlign: 'center',
  },
  clearAllButton: { 
    backgroundColor: '#fff', 
    borderWidth: 2,
    borderColor: '#dc3545',
    paddingVertical: scaleHeight(12), 
    paddingHorizontal: scaleWidth(24), 
    borderRadius: scaleWidth(8), 
    marginBottom: scaleHeight(20),
    width: '100%',
  },
  clearAllButtonText: { 
    color: '#dc3545', 
    fontWeight: 'bold', 
    fontSize: scaleFontSize(16), 
    textAlign: 'center' 
  },
});