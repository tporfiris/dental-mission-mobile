import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { useDentitionAssessment } from '../contexts/DentitionAssessmentContext';
import VoiceRecorder from '../components/VoiceRecorder';
import { Timestamp } from 'firebase/firestore';

// Get screen dimensions for responsive scaling
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive scaling functions
const scaleWidth = (size: number) => (SCREEN_WIDTH / 390) * size; // Base width: iPhone 12/13/14 (390px)
const scaleHeight = (size: number) => (SCREEN_HEIGHT / 844) * size; // Base height: iPhone 12/13/14 (844px)
const scaleFontSize = (size: number) => Math.round(scaleWidth(size));

// Chart dimensions that scale with screen size
const CHART_WIDTH = Math.min(SCREEN_WIDTH * 0.92, 360);
const CHART_HEIGHT = CHART_WIDTH * 1.33; // Maintain aspect ratio

// ✅ EXPANDED TOOTH STATES - Added new options
const TOOTH_STATES = [
  'present',           // Normal healthy tooth
  'has-fillings',      // NEW: Tooth has existing fillings
  'has-crowns',        // NEW: Tooth has crown
  'existing-rc',       // NEW: Tooth has existing root canal
  'has-cavities',      // NEW: Tooth has cavities that need treatment
  'broken-crack',      // NEW: Tooth is broken or cracked
  'crown-missing',     // Original: Crown portion missing
  'roots-only',        // Original: Only roots remain
  'fully-missing'      // Original: Tooth completely missing
] as const;
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

  // Updated tooth positions - scaled proportionally to chart size
  const toothOffsets: Record<string, { x: number; y: number }> = {
    // Upper arch - symmetric pairs (scaled to chart width/height)
    '21': { x: 20, y: -120 },   '11': { x: -20, y: -120 },
    '22': { x: 55, y: -110 },   '12': { x: -55, y: -110 },
    '23': { x: 90, y: -90 },    '13': { x: -90, y: -90 },
    '24': { x: 110, y: -60 },   '14': { x: -110, y: -60 },
    '25': { x: 120, y: -25 },   '15': { x: -120, y: -25 },
    '26': { x: 125, y: 10 },    '16': { x: -125, y: 10 },
    '27': { x: 125, y: 45 },    '17': { x: -125, y: 45 },
    '28': { x: 125, y: 80 },    '18': { x: -125, y: 80 },
    
    // Lower arch - symmetric pairs
    '31': { x: 20, y: 330 },    '41': { x: -20, y: 330 },
    '32': { x: 55, y: 320 },    '42': { x: -55, y: 320 },
    '33': { x: 90, y: 300 },    '43': { x: -90, y: 300 },
    '34': { x: 110, y: 270 },   '44': { x: -110, y: 270 },
    '35': { x: 120, y: 235 },   '45': { x: -120, y: 235 },
    '36': { x: 125, y: 200 },   '46': { x: -125, y: 200 },
    '37': { x: 125, y: 165 },   '47': { x: -125, y: 165 },
    '38': { x: 125, y: 130 },   '48': { x: -125, y: 130 },
  };

  const cycleToothState = (toothId: string) => {
    setToothStates(prev => {
      const currentIndex = TOOTH_STATES.indexOf(prev[toothId]);
      const nextState = TOOTH_STATES[(currentIndex + 1) % TOOTH_STATES.length];
      return { ...prev, [toothId]: nextState };
    });
  };

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

  // ✅ UPDATED: Color coding for all tooth states
  const getToothStyle = (state: ToothState) => {
    switch (state) {
      case 'present':
        return styles.toothPresent;
      case 'has-fillings':
        return styles.toothHasFillings;
      case 'has-crowns':
        return styles.toothHasCrowns;
      case 'existing-rc':
        return styles.toothExistingRC;
      case 'has-cavities':
        return styles.toothHasCavities;
      case 'broken-crack':
        return styles.toothBrokenCrack;
      case 'crown-missing':
        return styles.toothCrownMissing;
      case 'roots-only':
        return styles.toothRootsOnly;
      case 'fully-missing':
        return styles.toothFullyMissing;
    }
  };

  // Scale tooth positions based on chart size
  const getToothPosition = (toothId: string) => {
    const chartCenter = { x: CHART_WIDTH / 2, y: CHART_HEIGHT / 2.85 };
    const offset = toothOffsets[toothId];
    const scale = CHART_WIDTH / 360; // Scale based on original 360px width
    
    const toothSize = scaleWidth(30);
    
    return {
      left: chartCenter.x + (offset.x * scale) - (toothSize / 2),
      top: chartCenter.y + (offset.y * scale) - (toothSize / 2)
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
          delayLongPress={500}
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
          <View style={[
            styles.switchIndicator,
            isCurrentlyPrimary ? styles.switchIndicatorPrimary : styles.switchIndicatorAdult
          ]}>
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

      {/* Dental Chart Container */}
      <View style={[styles.dentalChart, { width: CHART_WIDTH, height: CHART_HEIGHT }]}>

        
        {/* Render all teeth */}
        {[...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_RIGHT, ...LOWER_LEFT].map(toothId => 
          renderTooth(toothId)
        )}
      </View>

      {/* ✅ UPDATED LEGEND - All tooth states */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothPresent]} />
          <Text style={styles.legendLabel}>Present</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothHasFillings]} />
          <Text style={styles.legendLabel}>Has Fillings</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothHasCrowns]} />
          <Text style={styles.legendLabel}>Has Crowns</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothExistingRC]} />
          <Text style={styles.legendLabel}>Existing Root Canal</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothHasCavities]} />
          <Text style={styles.legendLabel}>Has Cavities</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothBrokenCrack]} />
          <Text style={styles.legendLabel}>Broken/Crack</Text>
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
          <View style={styles.switchIndicatorAdult}>
            <Text style={styles.switchText}>A</Text>
          </View>
          <Text style={styles.legendLabel}>Adult Tooth</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.switchIndicatorPrimary}>
            <Text style={styles.switchText}>P</Text>
          </View>
          <Text style={styles.legendLabel}>Primary Tooth</Text>
        </View>
      </View>
      
      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Assessment</Text>
      </Pressable>

      {/* Clear All Button */}
      <Pressable 
        style={styles.clearAllButton} 
        onPress={() => {
          Alert.alert(
            'Clear All Data',
            'Are you sure you want to clear all assessment data? This cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Clear All', 
                style: 'destructive',
                onPress: () => {
                  setToothStates(initialToothStates);
                  setPrimaryTeeth(new Set());
                  Alert.alert('Cleared', 'All assessment data has been cleared.');
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

export default DentitionAssessmentScreen;

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
    marginBottom: scaleHeight(20),
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
  },
  voiceRecorderButton: {
    backgroundColor: '#6f42c1',
  },
  chartInstructions: {
    fontSize: scaleFontSize(11),
    color: '#666',
    textAlign: 'center',
    marginBottom: scaleHeight(20),
    fontStyle: 'italic',
    paddingHorizontal: scaleWidth(20),
    lineHeight: scaleFontSize(16),
  },
  dentalChart: {
    position: 'relative',
    marginBottom: scaleHeight(70),
  },
  upperArchLabel: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    position: 'absolute',
    width: scaleWidth(60),
  },
  lowerArchLabel: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    position: 'absolute',
    width: scaleWidth(60),
  },
  toothCircle: {
    width: scaleWidth(30),
    height: scaleWidth(30),
    borderRadius: scaleWidth(15),
    justifyContent: 'center',
    alignItems: 'center',
  },
  toothLabel: {
    color: 'white',
    fontWeight: '700',
    fontSize: scaleFontSize(11),
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  primaryToothLabel: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: scaleFontSize(11),
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  switchIndicator: {
    position: 'absolute',
    top: scaleWidth(-8),
    left: scaleWidth(-8),
    borderRadius: scaleWidth(7),
    width: scaleWidth(14),
    height: scaleWidth(14),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'white',
  },
  switchIndicatorAdult: {
    backgroundColor: '#007bff',
  },
  switchIndicatorPrimary: {
    backgroundColor: '#ff6b35',
  },
  switchText: {
    color: 'white',
    fontSize: scaleFontSize(9),
    fontWeight: 'bold',
  },
  // ✅ UPDATED: Styles for all tooth states
  toothPresent: {
    backgroundColor: '#4CAF50', // Green - healthy
  },
  toothHasFillings: {
    backgroundColor: '#2196F3', // Blue - has fillings
  },
  toothHasCrowns: {
    backgroundColor: '#FFC107', // Amber - has crowns
  },
  toothExistingRC: {
    backgroundColor: '#9C27B0', // Purple - existing root canal
  },
  toothHasCavities: {
    backgroundColor: '#FF9800', // Orange - has cavities
  },
  toothBrokenCrack: {
    backgroundColor: '#E91E63', // Pink - broken/cracked
  },
  toothCrownMissing: {
    backgroundColor: '#FF5722', // Deep Orange - crown missing
  },
  toothRootsOnly: {
    backgroundColor: '#795548', // Brown - roots only
  },
  toothFullyMissing: {
    backgroundColor: 'rgba(108, 117, 125, 0.3)', // Gray transparent
    borderWidth: 2,
    borderColor: '#6c757d',
  },
  legend: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: scaleHeight(20),
    paddingHorizontal: scaleWidth(10),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: scaleHeight(4),
    marginHorizontal: scaleWidth(4),
  },
  legendCircle: {
    width: scaleWidth(18),
    height: scaleWidth(18),
    borderRadius: scaleWidth(9),
    marginRight: scaleWidth(8),
  },
  legendLabel: {
    fontSize: scaleFontSize(12),
    color: '#333',
  },
  typeIndicatorLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scaleHeight(20),
    gap: scaleWidth(20),
  },
  saveButton: {
    backgroundColor: '#007bff',
    paddingVertical: scaleHeight(12),
    paddingHorizontal: scaleWidth(24),
    borderRadius: scaleWidth(8),
    marginTop: scaleHeight(20),
    width: '90%',
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
    marginTop: scaleHeight(12),
    marginBottom: scaleHeight(20),
    width: '90%',
  },
  clearAllButtonText: { 
    color: '#dc3545', 
    fontWeight: 'bold', 
    fontSize: scaleFontSize(16), 
    textAlign: 'center' 
  },
});