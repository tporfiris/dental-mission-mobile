import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { useExtractionsAssessment } from '../contexts/ExtractionsAssessmentContext';
import VoiceRecorder from '../components/VoiceRecorder';
import { useFocusEffect } from '@react-navigation/native';

// Get screen dimensions for responsive scaling
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive scaling functions
const scaleWidth = (size: number) => (SCREEN_WIDTH / 390) * size;
const scaleHeight = (size: number) => (SCREEN_HEIGHT / 844) * size;
const scaleFontSize = (size: number) => Math.round(scaleWidth(size));

// Chart dimensions that scale with screen size
const CHART_WIDTH = Math.min(SCREEN_WIDTH * 0.92, 360);
const CHART_HEIGHT = CHART_WIDTH * 1.33;

const EXTRACTION_REASONS = ['none', 'loose', 'root-tip', 'non-restorable'] as const;
type ExtractionReason = typeof EXTRACTION_REASONS[number];

const UPPER_RIGHT = ['11', '12', '13', '14', '15', '16', '17', '18'];
const UPPER_LEFT = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_RIGHT = ['41', '42', '43', '44', '45', '46', '47', '48'];
const LOWER_LEFT = ['31', '32', '33', '34', '35', '36', '37', '38'];

const REASON_LABELS = {
  'none': 'No Extraction',
  'loose': 'Loose',
  'root-tip': 'Root Tip',
  'non-restorable': 'Non-Restorable'
};

const REASON_ABBREVIATIONS = {
  'none': '',
  'loose': 'L',
  'root-tip': 'RT',
  'non-restorable': 'NR'
};

// ✅ Initial state helper
const getInitialExtractionStates = (): Record<string, ExtractionReason> => {
  const states: Record<string, ExtractionReason> = {};
  [...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_RIGHT, ...LOWER_LEFT].forEach(id => {
    states[id] = 'none';
  });
  return states;
};

const ExtractionTreatmentPlanningScreen = ({ route, navigation }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  
  const { 
    saveAssessment,
    loadLatestAssessment,
    saveDraft,
    loadDraft,
    clearDraft,
  } = useExtractionsAssessment();
  
  // ✅ LOCAL STATE
  const [extractionStates, setExtractionStates] = useState<Record<string, ExtractionReason>>(getInitialExtractionStates());
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const previousPatientIdRef = useRef<string | null>(null);
  const justSavedRef = useRef<boolean>(false);

  // ✅ LOAD STATE when screen focuses
  useFocusEffect(
    React.useCallback(() => {
      const loadState = async () => {
        try {
          console.log('🔄 Loading extractions state for patient:', patientId);
          
          // Check if patient changed
          if (previousPatientIdRef.current && previousPatientIdRef.current !== patientId) {
            console.log('🔄 Patient changed from', previousPatientIdRef.current, 'to', patientId);
            justSavedRef.current = false;
          }
          previousPatientIdRef.current = patientId;
          
          // ✅ If we just saved, start fresh
          if (justSavedRef.current) {
            console.log('✨ Just saved - starting fresh');
            setExtractionStates(getInitialExtractionStates());
            setIsLoaded(true);
            justSavedRef.current = false;
            return;
          }
          
          // STEP 1: Check for draft first
          const draft = loadDraft(patientId);
          
          if (draft) {
            console.log('📋 Loading draft:', draft);
            setExtractionStates(draft.extractionStates);
            setIsLoaded(true);
            return;
          }
          
          // STEP 2: Start fresh
          console.log('📋 No draft - starting fresh');
          setExtractionStates(getInitialExtractionStates());
          setIsLoaded(true);
          
        } catch (error) {
          console.error('❌ Error loading extractions state:', error);
          setExtractionStates(getInitialExtractionStates());
          setIsLoaded(true);
        }
      };
      
      loadState();
      
      // Cleanup function - save draft when leaving
      return () => {
        if (isLoaded && !justSavedRef.current) {
          console.log('💾 Saving extractions draft on blur');
          saveDraft(patientId, extractionStates);
        }
      };
    }, [patientId])
  );

  // ✅ SAVE DRAFT when state changes (debounced)
  useEffect(() => {
    if (!isLoaded) return;
    
    const timeoutId = setTimeout(() => {
      console.log('💾 Auto-saving extractions draft');
      saveDraft(patientId, extractionStates);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [extractionStates, isLoaded, patientId]);

  // Updated tooth positions
  const toothOffsets: Record<string, { x: number; y: number }> = {
    '21': { x: 20, y: -120 }, '11': { x: -20, y: -120 },
    '22': { x: 55, y: -110 }, '12': { x: -55, y: -110 },
    '23': { x: 90, y: -90 }, '13': { x: -90, y: -90 },
    '24': { x: 110, y: -60 }, '14': { x: -110, y: -60 },
    '25': { x: 120, y: -25 }, '15': { x: -120, y: -25 },
    '26': { x: 125, y: 10 }, '16': { x: -125, y: 10 },
    '27': { x: 125, y: 45 }, '17': { x: -125, y: 45 },
    '28': { x: 125, y: 80 }, '18': { x: -125, y: 80 },
    '31': { x: 20, y: 330 }, '41': { x: -20, y: 330 },
    '32': { x: 55, y: 320 }, '42': { x: -55, y: 320 },
    '33': { x: 90, y: 300 }, '43': { x: -90, y: 300 },
    '34': { x: 110, y: 270 }, '44': { x: -110, y: 270 },
    '35': { x: 120, y: 235 }, '45': { x: -120, y: 235 },
    '36': { x: 125, y: 200 }, '46': { x: -125, y: 200 },
    '37': { x: 125, y: 165 }, '47': { x: -125, y: 165 },
    '38': { x: 125, y: 130 }, '48': { x: -125, y: 130 },
  };

  const handleSaveAssessment = async () => {
    try {
      console.log('💾 Saving extractions assessment');
      console.log('Current extraction states:', extractionStates);
      
      await saveAssessment(patientId, extractionStates);
      
      // ✅ Set flag so we start fresh on next visit
      justSavedRef.current = true;
      
      Alert.alert('Success', 'Extractions assessment saved successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving extractions assessment:', error);
      Alert.alert('Error', 'Failed to save extractions assessment. Please try again.');
    }
  };

  const openToothEditor = (toothId: string) => {
    setSelectedTooth(toothId);
    setModalVisible(true);
  };

  const closeToothEditor = () => {
    setSelectedTooth(null);
    setModalVisible(false);
  };

  const setExtractionReason = (reason: ExtractionReason) => {
    if (!selectedTooth) return;
    
    console.log('🦷 Setting tooth', selectedTooth, 'to', reason);
    setExtractionStates(prev => ({
      ...prev,
      [selectedTooth]: reason
    }));
    closeToothEditor();
  };

  const quickToggleExtraction = (toothId: string) => {
    setExtractionStates(prev => ({
      ...prev,
      [toothId]: prev[toothId] === 'none' ? 'non-restorable' : 'none'
    }));
  };

  const getToothStyle = (reason: ExtractionReason) => {
    switch (reason) {
      case 'none': return styles.toothNormal;
      case 'loose': return styles.toothLoose;
      case 'root-tip': return styles.toothRootTip;
      case 'non-restorable': return styles.toothNonRestorable;
    }
  };

  const getToothPosition = (toothId: string) => {
    const chartCenter = { x: CHART_WIDTH / 2, y: CHART_HEIGHT / 2.85 };
    const offset = toothOffsets[toothId];
    const scale = CHART_WIDTH / 360;
    const toothSize = scaleWidth(30);
    
    return {
      left: chartCenter.x + (offset.x * scale) - (toothSize / 2),
      top: chartCenter.y + (offset.y * scale) - (toothSize / 2)
    };
  };

  const renderTooth = (toothId: string) => {
    const position = getToothPosition(toothId);
    const reason = extractionStates[toothId];
    
    return (
      <Pressable
        key={toothId}
        onPress={() => openToothEditor(toothId)}
        onLongPress={() => quickToggleExtraction(toothId)}
        style={[
          styles.toothCircle,
          getToothStyle(reason),
          {
            position: 'absolute',
            left: position.left,
            top: position.top,
          }
        ]}
      >
        <Text style={styles.toothLabel}>{toothId}</Text>
        {reason !== 'none' && (
          <View style={styles.reasonIndicator}>
            <Text style={styles.reasonText}>
              {REASON_ABBREVIATIONS[reason]}
            </Text>
          </View>
        )}
        {reason !== 'none' && (
          <View style={styles.extractionFlag}>
            <Text style={styles.extractionText}>✖</Text>
          </View>
        )}
      </Pressable>
    );
  };

  const extractionSummary = useMemo(() => {
    const extractionList = Object.entries(extractionStates).filter(([_, reason]) => reason !== 'none');
    
    const byReason = {
      loose: extractionList.filter(([_, reason]) => reason === 'loose'),
      'root-tip': extractionList.filter(([_, reason]) => reason === 'root-tip'),
      'non-restorable': extractionList.filter(([_, reason]) => reason === 'non-restorable'),
    };

    return {
      totalExtractions: extractionList.length,
      byReason,
      extractionList: extractionList.map(([toothId, reason]) => ({
        toothId,
        reason: REASON_LABELS[reason]
      })).sort((a, b) => parseInt(a.toothId) - parseInt(b.toothId))
    };
  }, [extractionStates]);

  const showExtractionList = () => {
    if (extractionSummary.totalExtractions === 0) {
      Alert.alert('Extraction List', 'No teeth currently marked for extraction.');
      return;
    }

    const report = `
Extraction Treatment Plan
Patient ID: ${patientId}

Total Extractions Planned: ${extractionSummary.totalExtractions}

Breakdown by Reason:
• Loose Teeth: ${extractionSummary.byReason.loose.length}
• Root Tips: ${extractionSummary.byReason['root-tip'].length}
• Non-Restorable: ${extractionSummary.byReason['non-restorable'].length}

Detailed Extraction List:
${extractionSummary.extractionList.map(item => 
  `• Tooth ${item.toothId}: ${item.reason}`
).join('\n')}

Priority Notes:
${extractionSummary.byReason['root-tip'].length > 0 ? '⚠️ Root tips should be prioritized to prevent infection.\n' : ''}${extractionSummary.byReason.loose.length > 0 ? '🦷 Loose teeth may be easily extracted.\n' : ''}${extractionSummary.byReason['non-restorable'].length > 0 ? '🔧 Non-restorable teeth require careful assessment.' : ''}
    `;
    
    Alert.alert('Extraction Treatment Plan', report.trim());
  };

  const clearAllExtractions = () => {
    Alert.alert(
      'Clear All Extractions',
      'Are you sure you want to clear all extraction markings?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: () => {
            setExtractionStates(getInitialExtractionStates());
            clearDraft(patientId);
          }
        }
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>🦷 Treatment Planning - Extractions</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

      {/* Voice Recording Section */}
      <View style={styles.voiceRecordingSection}>
        <Text style={styles.voiceRecordingTitle}>📝 Voice Notes</Text>
        <Text style={styles.voiceRecordingSubtitle}>
          Record voice notes during extraction assessment for later reference
        </Text>
        <VoiceRecorder
          patientId={patientId}
          category="Assessment"
          subcategory="Extractions"
          buttonStyle={styles.voiceRecorderButton}
        />
      </View>

      {/* Extraction Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Extraction Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Extractions:</Text>
          <Text style={styles.summaryValue}>{extractionSummary.totalExtractions}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Loose Teeth:</Text>
          <Text style={styles.summaryValue}>{extractionSummary.byReason.loose.length}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Root Tips:</Text>
          <Text style={styles.summaryValue}>{extractionSummary.byReason['root-tip'].length}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Non-Restorable:</Text>
          <Text style={styles.summaryValue}>{extractionSummary.byReason['non-restorable'].length}</Text>
        </View>
        
        <View style={styles.buttonRow}>
          {extractionSummary.totalExtractions > 0 && (
            <Pressable style={styles.reportButton} onPress={showExtractionList}>
              <Text style={styles.reportButtonText}>View Extraction List</Text>
            </Pressable>
          )}
          {extractionSummary.totalExtractions > 0 && (
            <Pressable style={styles.clearButton} onPress={clearAllExtractions}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Dental Chart Container */}
      <View style={[styles.dentalChart, { width: CHART_WIDTH, height: CHART_HEIGHT }]}>
        <Text style={[styles.centerInstructions, { 
          top: CHART_HEIGHT / 2 - scaleHeight(30), 
          left: CHART_WIDTH / 2 - scaleWidth(75) 
        }]}>
          Tap to mark{'\n'}for extraction{'\n'}Long press for{'\n'}quick toggle
        </Text>
        
        {[...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_RIGHT, ...LOWER_LEFT].map(toothId => 
          renderTooth(toothId)
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothNormal]} />
          <Text style={styles.legendLabel}>No Extraction Needed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothLoose]} />
          <Text style={styles.legendLabel}>Loose (L)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothRootTip]} />
          <Text style={styles.legendLabel}>Root Tip (RT)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothNonRestorable]} />
          <Text style={styles.legendLabel}>Non-Restorable (NR)</Text>
        </View>
      </View>

      <Text style={styles.instructionNote}>
        Tap: Select extraction reason • Long press: Quick toggle non-restorable
      </Text>

      <Pressable style={styles.saveButton} onPress={handleSaveAssessment}>
        <Text style={styles.saveButtonText}>Save Assessment</Text>
      </Pressable>

      {/* Clear All Button */}
      <Pressable 
        style={styles.clearAllButton} 
        onPress={() => {
          Alert.alert(
            'Clear All Data',
            'Are you sure you want to clear all extraction data? This cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Clear All', 
                style: 'destructive',
                onPress: () => {
                  setExtractionStates(getInitialExtractionStates());
                  clearDraft(patientId);
                  Alert.alert('Cleared', 'All extraction data has been cleared.');
                }
              }
            ]
          );
        }}
      >
        <Text style={styles.clearAllButtonText}>Clear All</Text>
      </Pressable>

      {/* Extraction Reason Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeToothEditor}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Tooth {selectedTooth} - Extraction Assessment
            </Text>
            
            <Text style={styles.sectionTitle}>Select Extraction Reason:</Text>
            
            {EXTRACTION_REASONS.map(reason => (
              <Pressable
                key={reason}
                style={[
                  styles.reasonButton,
                  reason === 'none' && styles.reasonButtonNone,
                  reason === 'loose' && styles.reasonButtonLoose,
                  reason === 'root-tip' && styles.reasonButtonRootTip,
                  reason === 'non-restorable' && styles.reasonButtonNonRestorable,
                ]}
                onPress={() => setExtractionReason(reason)}
              >
                <Text style={styles.reasonButtonText}>
                  {reason === 'none' ? '✓ ' : '✖ '}{REASON_LABELS[reason]}
                </Text>
                {reason !== 'none' && (
                  <Text style={styles.reasonDescription}>
                    {reason === 'loose' && 'Tooth is mobile and easily extractable'}
                    {reason === 'root-tip' && 'Only root fragment remains'}
                    {reason === 'non-restorable' && 'Too damaged to restore'}
                  </Text>
                )}
              </Pressable>
            ))}

            <Pressable style={styles.cancelButton} onPress={closeToothEditor}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default ExtractionTreatmentPlanningScreen;

const styles = StyleSheet.create({
  container: { padding: scaleWidth(20), alignItems: 'center' },
  header: { fontSize: scaleFontSize(22), fontWeight: 'bold', marginBottom: scaleHeight(4) },
  subtext: { fontSize: scaleFontSize(12), color: '#665', marginBottom: scaleHeight(16) },
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
  voiceRecordingTitle: { fontSize: scaleFontSize(16), fontWeight: '600', color: '#333', marginBottom: scaleHeight(4) },
  voiceRecordingSubtitle: { fontSize: scaleFontSize(12), color: '#666', marginBottom: scaleHeight(12), lineHeight: scaleFontSize(16) },
  voiceRecorderButton: { backgroundColor: '#6f42c1' },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: scaleWidth(12),
    padding: scaleWidth(16),
    width: '100%',
    marginBottom: scaleHeight(20),
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  summaryTitle: { fontSize: scaleFontSize(16), fontWeight: '600', marginBottom: scaleHeight(12), color: '#333' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: scaleHeight(8) },
  summaryLabel: { fontSize: scaleFontSize(14), color: '#665' },
  summaryValue: { fontSize: scaleFontSize(14), fontWeight: '600', color: '#333' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: scaleHeight(12), gap: scaleWidth(8) },
  reportButton: {
    backgroundColor: '#007bff',
    borderRadius: scaleWidth(8),
    paddingVertical: scaleHeight(8),
    paddingHorizontal: scaleWidth(12),
    flex: 1,
  },
  reportButtonText: { color: 'white', fontSize: scaleFontSize(12), fontWeight: '600', textAlign: 'center' },
  clearButton: {
    backgroundColor: '#dc3545',
    borderRadius: scaleWidth(8),
    paddingVertical: scaleHeight(8),
    paddingHorizontal: scaleWidth(12),
    flex: 1,
  },
  clearButtonText: { color: 'white', fontSize: scaleFontSize(12), fontWeight: '600', textAlign: 'center' },
  dentalChart: { position: 'relative', marginBottom: scaleHeight(30) },
  centerInstructions: {
    fontSize: scaleFontSize(10),
    color: '#999',
    textAlign: 'center',
    position: 'absolute',
    width: scaleWidth(150),
    lineHeight: scaleFontSize(14),
  },
  toothCircle: {
    width: scaleWidth(30),
    height: scaleWidth(30),
    borderRadius: scaleWidth(15),
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  toothLabel: { color: 'white', fontWeight: '600', fontSize: scaleFontSize(10) },
  reasonIndicator: {
    position: 'absolute',
    bottom: scaleHeight(-12),
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: scaleWidth(6),
    paddingHorizontal: scaleWidth(3),
    paddingVertical: scaleHeight(1),
  },
  reasonText: { color: 'white', fontSize: scaleFontSize(7), fontWeight: '600' },
  extractionFlag: {
    position: 'absolute',
    top: scaleHeight(-8),
    right: scaleWidth(-8),
    backgroundColor: '#dc3545',
    borderRadius: scaleWidth(8),
    width: scaleWidth(16),
    height: scaleWidth(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  extractionText: { color: 'white', fontSize: scaleFontSize(10), fontWeight: 'bold' },
  toothNormal: { backgroundColor: '#28a745' },
  toothLoose: { backgroundColor: '#ffc107' },
  toothRootTip: { backgroundColor: '#6f42c1' },
  toothNonRestorable: { backgroundColor: '#dc3545' },
  legend: { width: '100%', alignItems: 'flex-start', marginBottom: scaleHeight(16), marginTop: scaleHeight(16) },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginVertical: scaleHeight(3), width: '100%' },
  legendCircle: { width: scaleWidth(18), height: scaleWidth(18), borderRadius: scaleWidth(9), marginRight: scaleWidth(12) },
  legendLabel: { fontSize: scaleFontSize(13), color: '#333' },
  instructionNote: {
    fontSize: scaleFontSize(11),
    color: '#665',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: scaleHeight(20),
    lineHeight: scaleFontSize(16),
  },
  saveButton: {
    backgroundColor: '#007bff',
    paddingVertical: scaleHeight(12),
    paddingHorizontal: scaleWidth(24),
    borderRadius: scaleWidth(8),
    marginBottom: scaleHeight(12),
    width: '90%',
  },
  saveButtonText: { color: 'white', fontWeight: 'bold', fontSize: scaleFontSize(16), textAlign: 'center' },
  clearAllButton: { 
    backgroundColor: '#fff', 
    borderWidth: 2,
    borderColor: '#dc3545',
    paddingVertical: scaleHeight(12), 
    paddingHorizontal: scaleWidth(24), 
    borderRadius: scaleWidth(8), 
    marginBottom: scaleHeight(20),
    width: '90%',
  },
  clearAllButtonText: { color: '#dc3545', fontWeight: 'bold', fontSize: scaleFontSize(16), textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: scaleWidth(16),
    padding: scaleWidth(24),
    width: '90%',
    maxWidth: scaleWidth(400),
  },
  modalTitle: { fontSize: scaleFontSize(18), fontWeight: 'bold', textAlign: 'center', marginBottom: scaleHeight(20), color: '#333' },
  sectionTitle: { fontSize: scaleFontSize(14), fontWeight: '600', marginBottom: scaleHeight(16), color: '#333' },
  reasonButton: { borderRadius: scaleWidth(8), paddingVertical: scaleHeight(12), paddingHorizontal: scaleWidth(16), marginBottom: scaleHeight(12), borderWidth: 2 },
  reasonButtonNone: { backgroundColor: '#f8f9fa', borderColor: '#28a745' },
  reasonButtonLoose: { backgroundColor: '#fff3cd', borderColor: '#ffc107' },
  reasonButtonRootTip: { backgroundColor: '#f3e5f5', borderColor: '#6f42c1' },
  reasonButtonNonRestorable: { backgroundColor: '#f8d7da', borderColor: '#dc3545' },
  reasonButtonText: { fontSize: scaleFontSize(16), fontWeight: '600', color: '#333', marginBottom: scaleHeight(4) },
  reasonDescription: { fontSize: scaleFontSize(12), color: '#665', fontStyle: 'italic' },
  cancelButton: { backgroundColor: '#6c757d', borderRadius: scaleWidth(8), paddingVertical: scaleHeight(12), paddingHorizontal: scaleWidth(24), marginTop: scaleHeight(8) },
  cancelButtonText: { color: 'white', fontSize: scaleFontSize(14), fontWeight: '600', textAlign: 'center' },
});