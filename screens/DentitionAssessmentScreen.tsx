import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { useDentitionAssessment } from '../contexts/DentitionAssessmentContext';
import VoiceRecorder from '../components/VoiceRecorder';
import { Timestamp } from 'firebase/firestore';

const TOOTH_STATES = ['present', 'crown-missing', 'roots-only', 'fully-missing'] as const;
type ToothState = typeof TOOTH_STATES[number];

const UPPER_RIGHT = ['11', '12', '13', '14', '15', '16', '17', '18'];
const UPPER_LEFT = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_RIGHT = ['41', '42', '43', '44', '45', '46', '47', '48'];
const LOWER_LEFT = ['31', '32', '33', '34', '35', '36', '37', '38'];

// Primary tooth conversion mappings
const PRIMARY_TOOTH_MAPPINGS = {
  // Permanent to Primary
  '11': '51', '12': '52', '13': '53', '14': '54', '15': '55',
  '21': '61', '22': '62', '23': '63', '24': '64', '25': '65',
  '41': '81', '42': '82', '43': '83', '44': '84', '45': '85',
  '31': '71', '32': '72', '33': '73', '34': '74', '35': '75',
  // Primary to Permanent (reverse mapping)
  '51': '11', '52': '12', '53': '13', '54': '14', '55': '15',
  '61': '21', '62': '22', '63': '23', '64': '24', '65': '25',
  '81': '41', '82': '42', '83': '43', '84': '44', '85': '45',
  '71': '31', '72': '32', '73': '33', '74': '34', '75': '35',
};

// Helper function to check if a tooth can be switched to primary
const canSwitchToPrimary = (toothId: string): boolean => {
  const permanentTeeth = ['11', '12', '13', '14', '15', '21', '22', '23', '24', '25', 
                          '41', '42', '43', '44', '45', '31', '32', '33', '34', '35'];
  return permanentTeeth.includes(toothId);
};

const initialToothStates: Record<string, ToothState> = {};
[
  ...UPPER_RIGHT, ...UPPER_LEFT,
  ...LOWER_RIGHT, ...LOWER_LEFT,
].forEach(id => {
  initialToothStates[id] = 'present';
});

const DentitionAssessmentScreen = ({ route, navigation }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  
  // Get context functions
  const { 
    toothStates, 
    setToothStates,
    saveAssessment,
    loadLatestAssessment,
  } = useDentitionAssessment();
  
  // Track which teeth are currently showing as primary
  const [primaryTeeth, setPrimaryTeeth] = useState<Set<string>>(new Set());

  // Load saved assessment data on component mount
  useEffect(() => {
    const loadPrevious = async () => {
      try {
        const data = await loadLatestAssessment(patientId);
        
        if (data) {
          // NEW OPTIMIZED FORMAT - exceptions only
          if (data.exceptions) {
            console.log('📋 Loading optimized assessment format');
            
            // Start with all teeth as defaultState (usually "present")
            const reconstructedStates: Record<string, ToothState> = {};
            const defaultState = data.defaultState || 'present';
            
            // Set all teeth to default
            Object.keys(initialToothStates).forEach(toothId => {
              reconstructedStates[toothId] = defaultState;
            });
            
            // Apply exceptions
            Object.entries(data.exceptions).forEach(([toothId, state]) => {
              // Convert primary tooth numbers back to permanent if needed
              const permanentId = PRIMARY_TOOTH_MAPPINGS[toothId] || toothId;
              reconstructedStates[permanentId] = state as ToothState;
            });
            
            setToothStates(reconstructedStates);
            setPrimaryTeeth(new Set(data.primaryTeeth || []));
            
            console.log('✅ Loaded optimized assessment:', {
              exceptionsCount: Object.keys(data.exceptions).length,
              primaryTeethCount: data.primaryTeeth?.length || 0
            });
          }
          // LEGACY FORMAT 1 - savedWithPrimaryNumbers
          else if (data.savedWithPrimaryNumbers && data.originalToothStates) {
            console.log('📋 Loading legacy assessment (primary number format)');
            setToothStates(data.originalToothStates);
            setPrimaryTeeth(new Set(data.primaryTeeth || []));
          }
          // LEGACY FORMAT 2 - toothStates with primary teeth
          else if (data.toothStates && data.primaryTeeth) {
            console.log('📋 Loading legacy assessment (tooth states format)');
            setToothStates(data.toothStates);
            setPrimaryTeeth(new Set(data.primaryTeeth));
          }
          // LEGACY FORMAT 3 - just tooth states
          else if (data.toothStates) {
            console.log('📋 Loading legacy assessment (basic format)');
            setToothStates(data.toothStates);
            setPrimaryTeeth(new Set());
          }
          // FALLBACK - treat entire data as toothStates
          else {
            console.log('📋 Loading unknown legacy format');
            setToothStates(data);
            setPrimaryTeeth(new Set());
          }
        } else {
          console.log('ℹ️ No previous assessment found, using defaults');
          setToothStates(initialToothStates);
          setPrimaryTeeth(new Set());
        }
      } catch (error) {
        console.error('❌ Error loading assessment:', error);
        setToothStates(initialToothStates);
        setPrimaryTeeth(new Set());
      }
    };
    
    loadPrevious();
    
    return () => {};
  }, [patientId]);
  // Function to get the current display tooth ID (permanent or primary)
  const getCurrentToothId = (originalToothId: string): string => {
    if (primaryTeeth.has(originalToothId) && PRIMARY_TOOTH_MAPPINGS[originalToothId]) {
      return PRIMARY_TOOTH_MAPPINGS[originalToothId];
    }
    return originalToothId;
  };

  // Function to toggle between permanent and primary tooth
  const toggleToothType = (originalToothId: string) => {
    if (!canSwitchToPrimary(originalToothId)) return;
    
    console.log('🔄 Toggling tooth type for:', originalToothId);
    
    setPrimaryTeeth(prev => {
      const newSet = new Set(prev);
      if (newSet.has(originalToothId)) {
        newSet.delete(originalToothId);
        console.log('➡️ Switched to permanent:', originalToothId);
      } else {
        newSet.add(originalToothId);
        console.log('➡️ Switched to primary:', originalToothId, '→', PRIMARY_TOOTH_MAPPINGS[originalToothId]);
      }
      return newSet;
    });
  };

  // Updated tooth positions - centered around origin with offset applied
  const toothOffsets: Record<string, { x: number; y: number }> = {
    // Upper arch - symmetric pairs
    '21': { x: 20, y: -120 },   // Upper right central
    '11': { x: -20, y: -120 },  // Upper left central (mirrored)
    '22': { x: 55, y: -110 },   // Upper right lateral  
    '12': { x: -55, y: -110 },  // Upper left lateral (mirrored)
    '23': { x: 90, y: -90 },    // Upper right canine
    '13': { x: -90, y: -90 },   // Upper left canine (mirrored)
    '24': { x: 110, y: -60 },   // Upper right first premolar
    '14': { x: -110, y: -60 },  // Upper left first premolar (mirrored)
    '25': { x: 120, y: -25 },   // Upper right second premolar
    '15': { x: -120, y: -25 },  // Upper left second premolar (mirrored)
    '26': { x: 125, y: 10 },    // Upper right first molar
    '16': { x: -125, y: 10 },   // Upper left first molar (mirrored)
    '27': { x: 125, y: 45 },    // Upper right second molar
    '17': { x: -125, y: 45 },   // Upper left second molar (mirrored)
    '28': { x: 125, y: 80 },    // Upper right third molar (wisdom)
    '18': { x: -125, y: 80 },   // Upper left third molar (mirrored)
    
    // Lower arch - symmetric pairs
    '31': { x: 20, y: 330 },    // Lower right central
    '41': { x: -20, y: 330 },   // Lower left central (mirrored)
    '32': { x: 55, y: 320 },    // Lower right lateral
    '42': { x: -55, y: 320 },   // Lower left lateral (mirrored)
    '33': { x: 90, y: 300 },    // Lower right canine
    '43': { x: -90, y: 300 },   // Lower left canine (mirrored)
    '34': { x: 110, y: 270 },   // Lower right first premolar
    '44': { x: -110, y: 270 },  // Lower left first premolar (mirrored)
    '35': { x: 120, y: 235 },   // Lower right second premolar
    '45': { x: -120, y: 235 },  // Lower left second premolar (mirrored)
    '36': { x: 125, y: 200 },   // Lower right first molar
    '46': { x: -125, y: 200 },  // Lower left first molar (mirrored)
    '37': { x: 125, y: 165 },   // Lower right second molar
    '47': { x: -125, y: 165 },  // Lower left second molar (mirrored)
    '38': { x: 125, y: 130 },   // Lower right third molar (wisdom)
    '48': { x: -125, y: 130 },  // Lower left third molar (mirrored)
  };

  const cycleToothState = (toothId: string) => {
    setToothStates(prev => {
      const currentIndex = TOOTH_STATES.indexOf(prev[toothId]);
      const nextState = TOOTH_STATES[(currentIndex + 1) % TOOTH_STATES.length];
      return { ...prev, [toothId]: nextState };
    });
  };

  // ✅ NEW: Use context's saveAssessment function
  const handleSave = async () => {
    try {
      // Build exceptions map - only store teeth that are NOT "present"
      const exceptions: Record<string, ToothState> = {};
      
      Object.entries(toothStates).forEach(([originalToothId, state]) => {
        if (state !== 'present') {
          // Get the display tooth ID (primary or permanent)
          const currentToothId = getCurrentToothId(originalToothId);
          exceptions[currentToothId] = state;
          
          if (currentToothId !== originalToothId) {
            console.log(`💾 Saving tooth ${originalToothId} as primary tooth ${currentToothId} with state: ${state}`);
          }
        }
      });
  
      // Store only the exceptions, not all 32 teeth
      const assessmentData = {
        exceptions: exceptions,
        primaryTeeth: Array.from(primaryTeeth),
        defaultState: 'present'
      };
      
      console.log('💾 Saving optimized assessment data:', {
        exceptionsCount: Object.keys(exceptions).length,
        exceptions: exceptions,
        primaryTeethCount: primaryTeeth.size,
        primaryTeeth: Array.from(primaryTeeth)
      });
  
      await saveAssessment(patientId, assessmentData);
      
      Alert.alert('Success', 'Dentition assessment saved!');
      navigation.goBack();
    } catch (error) {
      console.error('❌ Error saving assessment:', error);
      Alert.alert('Error', 'Failed to save assessment. Please try again.');
    }
  };

  const getToothStyle = (state: ToothState) => {
    switch (state) {
      case 'present':
        return styles.toothPresent;
      case 'crown-missing':
        return styles.toothCrownMissing;
      case 'roots-only':
        return styles.toothRootsOnly;
      case 'fully-missing':
        return styles.toothFullyMissing;
    }
  };

  const getToothPosition = (toothId: string) => {
    const chartCenter = { x: 180, y: 135 }; // Center of the chart container
    const offset = toothOffsets[toothId];
    
    return {
      left: chartCenter.x + offset.x - 15, // -15 to center the 30px circle
      top: chartCenter.y + offset.y - 15
    };
  };

  const renderTooth = (toothId: string) => {
    const position = getToothPosition(toothId);
    const currentToothId = getCurrentToothId(toothId);
    const canSwitch = canSwitchToPrimary(toothId);
    const isCurrentlyPrimary = primaryTeeth.has(toothId);
    
    return (
      <View key={toothId} style={{ position: 'absolute', left: position.left, top: position.top }}>
        <Pressable
          onPress={() => {
            console.log('👆 Tap on tooth:', toothId);
            cycleToothState(toothId);
          }}
          onLongPress={() => {
            console.log('👆 Long press on tooth:', toothId, 'canSwitch:', canSwitch);
            if (canSwitch) {
              console.log('🔄 Calling toggleToothType for:', toothId);
              toggleToothType(toothId);
            } else {
              console.log('❌ Cannot switch tooth:', toothId);
            }
          }}
          delayLongPress={500} // 500ms long press delay
          style={[
            styles.toothCircle,
            getToothStyle(toothStates[toothId]),
          ]}
        >
          <Text style={[styles.toothLabel, isCurrentlyPrimary && styles.primaryToothLabel]}>
            {currentToothId}
          </Text>
        </Pressable>
        
        {/* Switch indicator for teeth that can toggle */}
        {canSwitch && (
          <View style={styles.switchIndicator}>
            <Text style={styles.switchText}>
              {isCurrentlyPrimary ? 'P' : 'A'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (    
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>🦷 Dentition Assessment</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

      {/* Voice Recording Section */}
      <View style={styles.voiceRecordingSection}>
        <Text style={styles.voiceRecordingTitle}>📝 Voice Notes</Text>
        <Text style={styles.voiceRecordingSubtitle}>
          Record voice notes during dentition assessment for later reference
        </Text>
        <VoiceRecorder
          patientId={patientId}
          category="Assessment"
          subcategory="Dentition"
          buttonStyle={styles.voiceRecorderButton}
        />
      </View>

      {/* Instructions */}
      <Text style={styles.chartInstructions}>
        Tap to cycle tooth status • Long press switchable teeth (11-15, 21-25, 31-35, 41-45) to toggle Primary/Adult
      </Text>

      {/* Debug Info - Remove this in production */}
      <Text style={styles.debugText}>
        Primary teeth: {Array.from(primaryTeeth).join(', ') || 'None'}
      </Text>

      {/* Dental Chart Container */}
      <View style={styles.dentalChart}>
        {/* Upper Arch Label */}
        <Text style={styles.upperArchLabel}>Upper Arch</Text>
        
        {/* Lower Arch Label */}
        <Text style={styles.lowerArchLabel}>Lower Arch</Text>
        
        {/* Render all teeth */}
        {[...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_RIGHT, ...LOWER_LEFT].map(toothId => 
          renderTooth(toothId)
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothPresent]} />
          <Text style={styles.legendLabel}>Present</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothCrownMissing]} />
          <Text style={styles.legendLabel}>Crown Missing</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothRootsOnly]} />
          <Text style={styles.legendLabel}>Roots Only</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothFullyMissing]} />
          <Text style={styles.legendLabel}>Fully Missing</Text>
        </View>
      </View>

      {/* Primary/Adult tooth legend */}
      <View style={styles.typeIndicatorLegend}>
        <View style={styles.legendItem}>
          <View style={styles.switchIndicator}>
            <Text style={styles.switchText}>A</Text>
          </View>
          <Text style={styles.legendLabel}>Adult Tooth</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.switchIndicator}>
            <Text style={styles.switchText}>P</Text>
          </View>
          <Text style={styles.legendLabel}>Primary Tooth</Text>
        </View>
      </View>
      
      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Assessment</Text>
      </Pressable>
    </ScrollView>
  );
};

export default DentitionAssessmentScreen;

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
    marginBottom: 20,
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
  chartInstructions: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
  debugText: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  dentalChart: {
    width: 360,
    height: 480,
    position: 'relative',
    marginBottom: 30,
  },
  upperArchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    position: 'absolute',
    top: 50,
    left: 150,
    width: 60,
  },
  lowerArchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    position: 'absolute',
    top: 390,
    left: 150,
    width: 60,
  },
  toothCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toothLabel: {
    color: 'white',
    fontWeight: '600',
    fontSize: 10,
  },
  primaryToothLabel: {
    color: '#ffd700', // Gold color for primary teeth
    fontWeight: 'bold',
  },
  switchIndicator: {
    position: 'absolute',
    top: -8,
    left: -8,
    backgroundColor: '#28a745',
    borderRadius: 6,
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  toothPresent: {
    backgroundColor: '#4CAF50',
  },
  toothCrownMissing: {
    backgroundColor: '#FFC107',
  },
  toothRootsOnly: {
    backgroundColor: '#FF5722', // Deep orange/red to indicate roots remaining
  },
  toothFullyMissing: {
    backgroundColor: 'rgba(108, 117, 125, 0.3)', // Transparent gray
    borderWidth: 2,
    borderColor: '#6c757d', // Gray border for definition
  },
  legend: {
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    marginHorizontal: 8,
  },
  legendCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 8,
  },
  legendLabel: {
    fontSize: 14,
    color: '#333',
  },
  typeIndicatorLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 20,
  },
  saveButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },  
});