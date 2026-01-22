import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { useImplantAssessment } from '../contexts/ImplantAssessmentContext';
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

const UPPER_RIGHT = ['11', '12', '13', '14', '15', '16', '17', '18'];
const UPPER_LEFT = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_RIGHT = ['41', '42', '43', '44', '45', '46', '47', '48'];
const LOWER_LEFT = ['31', '32', '33', '34', '35', '36', '37', '38'];

type ImplantMode = 'single' | 'bridge';
type TimingMode = 'immediate' | 'delayed';

interface ImplantAssessmentState {
  implantMode: ImplantMode;
  singleImplantTeeth: string[];
  bridgeImplantTeeth: string[];
  boneGraftingPlanned: boolean;
  timingMode: TimingMode;
  notes: string;
}

const defaultImplantState: ImplantAssessmentState = {
  implantMode: 'single',
  singleImplantTeeth: [],
  bridgeImplantTeeth: [],
  boneGraftingPlanned: false,
  timingMode: 'immediate',
  notes: '',
};

const ImplantAssessmentScreen = ({ route, navigation }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  
  const { 
    saveAssessment,
    loadLatestAssessment,
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft,
  } = useImplantAssessment();

  // ✅ LOCAL STATE
  const [implantState, setImplantState] = useState<ImplantAssessmentState>(defaultImplantState);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const previousPatientIdRef = useRef<string | null>(null);
  const justSavedRef = useRef<boolean>(false);

  // ✅ LOAD STATE when screen focuses
  useFocusEffect(
    React.useCallback(() => {
      const loadState = async () => {
        try {
          console.log('🔄 Loading implant state for patient:', patientId);
          
          // Check if patient changed
          if (previousPatientIdRef.current && previousPatientIdRef.current !== patientId) {
            console.log('🔄 Patient changed from', previousPatientIdRef.current, 'to', patientId);
            justSavedRef.current = false;
          }
          previousPatientIdRef.current = patientId;
          
          // ✅ If we just saved, start fresh
          if (justSavedRef.current) {
            console.log('✨ Just saved - starting fresh');
            setImplantState(defaultImplantState);
            setIsLoaded(true);
            justSavedRef.current = false;
            return;
          }
          
          // STEP 1: Check for draft first
          const draft = loadDraft(patientId);
          
          if (draft) {
            console.log('📋 Loading draft:', draft);
            setImplantState(draft.implantState);
            setIsLoaded(true);
            return;
          }
          
          // STEP 2: Start fresh
          console.log('📋 No draft - starting fresh');
          setImplantState(defaultImplantState);
          setIsLoaded(true);
        } catch (error) {
          console.error('❌ Error loading state:', error);
          setImplantState(defaultImplantState);
          setIsLoaded(true);
        }
      };
      
      loadState();
      
      // Cleanup - save draft when leaving
      return () => {
        if (isLoaded && !justSavedRef.current) {
          console.log('💾 Saving draft on blur');
          saveDraft(patientId, implantState);
        }
      };
    }, [patientId])
  );

  // ✅ AUTO-SAVE DRAFT when state changes (debounced)
  useEffect(() => {
    if (!isLoaded) return;
    
    const timeoutId = setTimeout(() => {
      console.log('💾 Auto-saving implant draft');
      saveDraft(patientId, implantState);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [implantState, isLoaded, patientId]);

  // Helper functions
  const getSelectedTeeth = () => {
    return implantState.implantMode === 'single' 
      ? implantState.singleImplantTeeth 
      : implantState.bridgeImplantTeeth;
  };

  const updateImplantMode = (mode: ImplantMode) => {
    setImplantState(prev => ({ 
      ...prev, 
      implantMode: mode
    }));
  };

  const toggleTooth = (toothId: string) => {
    setImplantState(prev => {
      if (prev.implantMode === 'single') {
        const newSingleTeeth = prev.singleImplantTeeth.includes(toothId)
          ? prev.singleImplantTeeth.filter(id => id !== toothId)
          : [...prev.singleImplantTeeth, toothId];
        
        return { ...prev, singleImplantTeeth: newSingleTeeth };
      } else {
        const newBridgeTeeth = prev.bridgeImplantTeeth.includes(toothId)
          ? prev.bridgeImplantTeeth.filter(id => id !== toothId)
          : [...prev.bridgeImplantTeeth, toothId];
        
        return { ...prev, bridgeImplantTeeth: newBridgeTeeth };
      }
    });
  };

  const updateBoneGrafting = (planned: boolean) => {
    setImplantState(prev => ({ ...prev, boneGraftingPlanned: planned }));
  };

  const updateTimingMode = (timing: TimingMode) => {
    setImplantState(prev => ({ ...prev, timingMode: timing }));
  };

  const clearCurrentSelection = () => {
    setImplantState(prev => {
      if (prev.implantMode === 'single') {
        return { ...prev, singleImplantTeeth: [] };
      } else {
        return { ...prev, bridgeImplantTeeth: [] };
      }
    });
  };

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
      console.log('💾 Saving implant assessment...');
      console.log('Current state:', implantState);
      
      if (implantState.singleImplantTeeth.length === 0 && implantState.bridgeImplantTeeth.length === 0) {
        Alert.alert(
          'No Teeth Selected',
          'Please select at least one tooth for implant assessment.',
          [{ text: 'OK' }]
        );
        return;
      }

      await saveAssessment(patientId, implantState);
      
      // ✅ Set flag so we start fresh on next visit
      justSavedRef.current = true;
      
      Alert.alert(
        'Success',
        'Implant assessment saved successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error saving implant assessment:', error);
      Alert.alert(
        'Error',
        'Failed to save implant assessment. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleImplantModeChange = (mode: ImplantMode) => {
    updateImplantMode(mode);
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

  const selectedTeeth = getSelectedTeeth();

  const getToothStyle = (toothId: string) => {
    if (selectedTeeth.includes(toothId)) {
      return implantState.implantMode === 'single' ? styles.toothSingleImplant : styles.toothBridge;
    }
    return styles.toothNormal;
  };

  const renderTooth = (toothId: string) => {
    const position = getToothPosition(toothId);
    
    return (
      <Pressable
        key={toothId}
        onPress={() => toggleTooth(toothId)}
        style={[
          styles.toothCircle,
          getToothStyle(toothId),
          {
            position: 'absolute',
            left: position.left,
            top: position.top,
          }
        ]}
      >
        <Text style={styles.toothLabel}>{toothId}</Text>
        {selectedTeeth.includes(toothId) && (
          <View style={styles.implantFlag}>
            <Text style={styles.implantText}>
              {implantState.implantMode === 'single' ? '🔩' : '🌉'}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>🦷 Implant Assessment</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

      {/* Voice Recording Section */}
      <View style={styles.voiceRecordingSection}>
        <Text style={styles.voiceRecordingTitle}>📝 Voice Notes</Text>
        <Text style={styles.voiceRecordingSubtitle}>
          Record voice notes during implant assessment for later reference
        </Text>
        <VoiceRecorder
          patientId={patientId}
          category="Assessment"
          subcategory="Implant"
          buttonStyle={styles.voiceRecorderButton}
        />
      </View>

      {/* State Preservation Indicator */}
      {(implantState.singleImplantTeeth.length > 0 || implantState.bridgeImplantTeeth.length > 0) && (
        <View style={styles.stateIndicator}>
          <Text style={styles.stateIndicatorText}>
            ✅ State preserved: Single ({implantState.singleImplantTeeth.length}) | Bridge ({implantState.bridgeImplantTeeth.length})
          </Text>
        </View>
      )}

      {/* Implant Type Selector */}
      <View style={styles.selectorCard}>
        <Text style={styles.cardTitle}>Implant Type</Text>
        <View style={styles.typeSelector}>
          <Pressable
            style={[
              styles.typeSelectorButton,
              implantState.implantMode === 'single' && styles.typeSelectorButtonActive
            ]}
            onPress={() => handleImplantModeChange('single')}
          >
            <Text style={[
              styles.typeSelectorText,
              implantState.implantMode === 'single' && styles.typeSelectorTextActive
            ]}>
              Single Implant ({implantState.singleImplantTeeth.length})
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.typeSelectorButton,
              implantState.implantMode === 'bridge' && styles.typeSelectorButtonActive
            ]}
            onPress={() => handleImplantModeChange('bridge')}
          >
            <Text style={[
              styles.typeSelectorText,
              implantState.implantMode === 'bridge' && styles.typeSelectorTextActive
            ]}>
              Bridge ({implantState.bridgeImplantTeeth.length})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Selection Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Current Selection - {implantState.implantMode === 'single' ? 'Single Implants' : 'Implant Bridge'}</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Selected Teeth:</Text>
          <Text style={styles.summaryValue}>
            {selectedTeeth.length === 0 ? 'None' : selectedTeeth.sort().join(', ')}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Count:</Text>
          <Text style={styles.summaryValue}>{selectedTeeth.length}</Text>
        </View>
        
        {selectedTeeth.length > 0 && (
          <Pressable style={styles.clearButton} onPress={clearCurrentSelection}>
            <Text style={styles.clearButtonText}>Clear {implantState.implantMode === 'single' ? 'Single' : 'Bridge'} Selection</Text>
          </Pressable>
        )}
      </View>

      {/* Visual Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>
          Select Teeth for {implantState.implantMode === 'single' ? 'Single Implants' : 'Implant Bridge'}
        </Text>
        <View style={[styles.dentalChart, { width: CHART_WIDTH, height: CHART_HEIGHT }]}>

          <Text style={[styles.centerInstructions, { 
            top: CHART_HEIGHT / 2 - scaleHeight(25), 
            left: CHART_WIDTH / 2 - scaleWidth(50) 
          }]}>
            Tap teeth to{'\n'}select for{'\n'}
            {implantState.implantMode === 'single' ? 'implants' : 'bridge'}
          </Text>
          
          {[...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_RIGHT, ...LOWER_LEFT].map(toothId => 
            renderTooth(toothId)
          )}
        </View>
      </View>

      {/* Treatment Options */}
      <View style={styles.optionsCard}>
        <Text style={styles.cardTitle}>Treatment Options</Text>
        
        <View style={styles.optionRow}>
          <Text style={styles.optionLabel}>Bone Grafting Planned:</Text>
          <Pressable
            style={[
              styles.optionToggle,
              implantState.boneGraftingPlanned && styles.optionToggleActive
            ]}
            onPress={() => updateBoneGrafting(!implantState.boneGraftingPlanned)}
          >
            <Text style={[
              styles.optionToggleText,
              implantState.boneGraftingPlanned && styles.optionToggleTextActive
            ]}>
              {implantState.boneGraftingPlanned ? 'Yes' : 'No'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.optionRow}>
          <Text style={styles.optionLabel}>Implant Timing:</Text>
          <View style={styles.timingSelector}>
            <Pressable
              style={[
                styles.timingSelectorButton,
                implantState.timingMode === 'immediate' && styles.timingSelectorButtonActive
              ]}
              onPress={() => updateTimingMode('immediate')}
            >
              <Text style={[
                styles.timingSelectorText,
                implantState.timingMode === 'immediate' && styles.timingSelectorTextActive
              ]}>
                Immediate
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.timingSelectorButton,
                implantState.timingMode === 'delayed' && styles.timingSelectorButtonActive
              ]}
              onPress={() => updateTimingMode('delayed')}
            >
              <Text style={[
                styles.timingSelectorText,
                implantState.timingMode === 'delayed' && styles.timingSelectorTextActive
              ]}>
                Delayed
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothNormal]} />
          <Text style={styles.legendLabel}>Available for Selection</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothSingleImplant]} />
          <Text style={styles.legendLabel}>Single Implant Selected</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothBridge]} />
          <Text style={styles.legendLabel}>Bridge Implant Selected</Text>
        </View>
      </View>

      <Pressable style={styles.saveButton} onPress={handleSaveAssessment}>
        <Text style={styles.saveButtonText}>Save Assessment</Text>
      </Pressable>

      {/* Clear All Button */}
      <Pressable 
        style={styles.clearAllButton} 
        onPress={() => {
          Alert.alert(
            'Clear All Data',
            'Are you sure you want to clear all implant assessment data? This cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Clear All', 
                style: 'destructive',
                onPress: () => {
                  setImplantState(defaultImplantState);
                  clearDraft(patientId);
                  Alert.alert('Cleared', 'All implant assessment data has been cleared.');
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

export default ImplantAssessmentScreen;

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
  stateIndicator: {
    backgroundColor: '#d4edda',
    borderRadius: scaleWidth(8),
    padding: scaleWidth(12),
    marginBottom: scaleHeight(16),
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  stateIndicatorText: {
    fontSize: scaleFontSize(12),
    color: '#155724',
    fontWeight: '600',
    textAlign: 'center',
  },
  selectorCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: scaleWidth(12),
    padding: scaleWidth(16),
    width: '100%',
    marginBottom: scaleHeight(16),
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cardTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    marginBottom: scaleHeight(12),
    color: '#333',
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#e9ecef',
    borderRadius: scaleWidth(8),
    padding: scaleWidth(2),
  },
  typeSelectorButton: {
    flex: 1,
    paddingVertical: scaleHeight(10),
    paddingHorizontal: scaleWidth(12),
    borderRadius: scaleWidth(6),
    alignItems: 'center',
  },
  typeSelectorButtonActive: {
    backgroundColor: '#007bff',
  },
  typeSelectorText: {
    fontSize: scaleFontSize(11),
    fontWeight: '600',
    color: '#6c757d',
    textAlign: 'center',
  },
  typeSelectorTextActive: {
    color: 'white',
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: scaleWidth(12),
    padding: scaleWidth(16),
    width: '100%',
    marginBottom: scaleHeight(16),
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  summaryTitle: {
    fontSize: scaleFontSize(15),
    fontWeight: '600',
    marginBottom: scaleHeight(12),
    color: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scaleHeight(8),
  },
  summaryLabel: {
    fontSize: scaleFontSize(14),
    color: '#665',
    flex: 1,
  },
  summaryValue: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  clearButton: {
    backgroundColor: '#6c757d',
    borderRadius: scaleWidth(6),
    paddingVertical: scaleHeight(8),
    paddingHorizontal: scaleWidth(16),
    marginTop: scaleHeight(12),
    alignSelf: 'flex-start',
  },
  clearButtonText: {
    color: 'white',
    fontSize: scaleFontSize(12),
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: scaleWidth(12),
    padding: scaleWidth(40),
    width: '100%',
    marginBottom: scaleHeight(20),
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  dentalChart: {
    position: 'relative',
    alignSelf: 'center',
  },
  centerInstructions: {
    fontSize: scaleFontSize(11),
    color: '#999',
    textAlign: 'center',
    position: 'absolute',
    width: scaleWidth(100),
    lineHeight: scaleFontSize(15),
  },
  toothCircle: {
    width: scaleWidth(30),
    height: scaleWidth(30),
    borderRadius: scaleWidth(15),
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  toothLabel: {
    color: 'white',
    fontWeight: '600',
    fontSize: scaleFontSize(10),
  },
  implantFlag: {
    position: 'absolute',
    top: scaleHeight(-8),
    right: scaleWidth(-8),
    backgroundColor: '#007bff',
    borderRadius: scaleWidth(8),
    width: scaleWidth(16),
    height: scaleWidth(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  implantText: {
    fontSize: scaleFontSize(10),
  },
  toothNormal: {
    backgroundColor: '#28a745',
  },
  toothSingleImplant: {
    backgroundColor: '#007bff',
  },
  toothBridge: {
    backgroundColor: '#6f42c1',
  },
  optionsCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: scaleWidth(12),
    padding: scaleWidth(16),
    width: '100%',
    marginBottom: scaleHeight(16),
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleHeight(16),
  },
  optionLabel: {
    fontSize: scaleFontSize(14),
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  optionToggle: {
    backgroundColor: '#e9ecef',
    borderRadius: scaleWidth(20),
    paddingVertical: scaleHeight(8),
    paddingHorizontal: scaleWidth(16),
    minWidth: scaleWidth(50),
    alignItems: 'center',
  },
  optionToggleActive: {
    backgroundColor: '#28a745',
  },
  optionToggleText: {
    fontSize: scaleFontSize(12),
    fontWeight: '600',
    color: '#6c757d',
  },
  optionToggleTextActive: {
    color: 'white',
  },
  timingSelector: {
    flexDirection: 'row',
    backgroundColor: '#e9ecef',
    borderRadius: scaleWidth(20),
    padding: scaleWidth(2),
  },
  timingSelectorButton: {
    paddingVertical: scaleHeight(6),
    paddingHorizontal: scaleWidth(12),
    borderRadius: scaleWidth(18),
  },
  timingSelectorButtonActive: {
    backgroundColor: '#ffc107',
  },
  timingSelectorText: {
    fontSize: scaleFontSize(12),
    fontWeight: '600',
    color: '#6c757d',
  },
  timingSelectorTextActive: {
    color: '#212529',
  },
  legend: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: scaleHeight(20),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: scaleHeight(3),
    width: '100%',
  },
  legendCircle: {
    width: scaleWidth(18),
    height: scaleWidth(18),
    borderRadius: scaleWidth(9),
    marginRight: scaleWidth(12),
  },
  legendLabel: {
    fontSize: scaleFontSize(13),
    color: '#333',
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