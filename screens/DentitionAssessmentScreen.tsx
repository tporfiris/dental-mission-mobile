import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { database } from '../db'; // adjust path if needed
import DentitionAssessment from '../models/DentitionAssessment';
import { Q } from '@nozbe/watermelondb';
import uuid from 'react-native-uuid';
import { useDentitionAssessment } from '../contexts/DentitionAssessmentContext';

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

// Helper function to check if a tooth is primary
const isPrimaryTooth = (toothId: string): boolean => {
  return toothId.startsWith('5') || toothId.startsWith('6') || toothId.startsWith('7') || toothId.startsWith('8');
};

// Helper function to load saved assessment data
const loadSavedAssessment = async (patientId: string, setToothStates: any, setPrimaryTeeth: any) => {
  try {
    const collection = database.get<DentitionAssessment>('dentition_assessments');
    const existing = await collection
      .query(Q.where('patient_id', Q.eq(patientId)))
      .fetch();

    if (existing.length > 0) {
      try {
        const savedData = JSON.parse(existing[0].data);
        
        if (savedData.savedWithPrimaryNumbers && savedData.originalToothStates) {
          // New format - data was saved with primary numbers, restore original mappings
          console.log('📋 Loading assessment with primary number format');
          setToothStates(savedData.originalToothStates);
          setPrimaryTeeth(new Set(savedData.primaryTeeth || []));
        } else if (savedData.toothStates && savedData.primaryTeeth) {
          // Intermediate format - has primary teeth data but uses original numbering
          console.log('📋 Loading assessment with primary teeth tracking');
          setToothStates(savedData.toothStates);
          setPrimaryTeeth(new Set(savedData.primaryTeeth));
        } else {
          // Old format - just tooth states
          console.log('📋 Loading legacy assessment format');
          setToothStates(savedData);
          setPrimaryTeeth(new Set());
        }
        
        console.log('✅ Loaded existing assessment');
      } catch (parseError) {
        console.warn('⚠️ Could not parse saved assessment data, using defaults');
        setToothStates(initialToothStates);
        setPrimaryTeeth(new Set());
      }
    }
  } catch (error) {
    console.error('❌ Error loading saved assessment:', error);
  }
};

const initialToothStates: Record<string, ToothState> = {};
[
  ...UPPER_RIGHT, ...UPPER_LEFT,
  ...LOWER_RIGHT, ...LOWER_LEFT,
].forEach(id => {
  initialToothStates[id] = 'present';
});

const DentitionAssessmentScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  const { toothStates, setToothStates } = useDentitionAssessment();
  
  // Track which teeth are currently showing as primary
  const [primaryTeeth, setPrimaryTeeth] = useState<Set<string>>(new Set());

  // Load saved assessment data on component mount
  useEffect(() => {
    loadSavedAssessment(patientId, setToothStates, setPrimaryTeeth);
  }, [patientId, setToothStates]);

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

  const saveAssessment = async () => {
    try {
      const collection = database.get<DentitionAssessment>('dentition_assessments');
      console.log('🔎 Looking for existing assessment for patient:', patientId);
      const existing = await collection
      .query(Q.where('patient_id', Q.eq(patientId)))
      .fetch();

      console.log('🔍 Matched existing assessment:', existing);
  
      // Transform tooth states to use current display tooth numbers (primary/permanent)
      const transformedToothStates: Record<string, ToothState> = {};
      
      Object.entries(toothStates).forEach(([originalToothId, state]) => {
        const currentToothId = getCurrentToothId(originalToothId);
        transformedToothStates[currentToothId] = state;
        
        if (currentToothId !== originalToothId) {
          console.log(`💾 Saving tooth ${originalToothId} as primary tooth ${currentToothId} with state: ${state}`);
        }
      });

      // Include primary teeth information in the saved data
      const assessmentData = {
        toothStates: transformedToothStates, // Now uses display tooth numbers
        primaryTeeth: Array.from(primaryTeeth),
        originalToothStates: toothStates, // Keep original mapping for reference
        savedWithPrimaryNumbers: true // Flag to indicate this data format
      };
      const jsonData = JSON.stringify(assessmentData);
      
      console.log('💾 Saving assessment data:', {
        transformedToothStates,
        primaryTeethCount: primaryTeeth.size,
        primaryTeeth: Array.from(primaryTeeth)
      });
  
      await database.write(async () => {
        console.log("existing:")
        console.log(existing)
        console.log("existing length:")
        console.log(existing.length)
        if (existing.length > 0) {
          console.log('🔍 Existing assessments for patient', patientId, ':', existing);
          // Update existing record
          await existing[0].update(record => {
            record.data = jsonData;
            record.updatedAt = new Date();
          });
          console.log('✅ Dentition assessment updated with primary teeth saved as primary numbers');
          alert('✅ Dentition assessment updated with primary teeth saved as primary numbers');
        } else {
          // Create new record
          await collection.create(record => {
            const id = uuid.v4();
            record._raw.id = id;
            record.patientId = patientId;// must match schema!
            record.data = jsonData;
            record.createdAt = new Date();
            record.updatedAt = new Date();
            // record.patient.set(patientId);
            console.log('✅ Dentition assessment created with primary teeth saved as primary numbers');
            alert('✅ Dentition assessment created with primary teeth saved as primary numbers')
            console.log('🔧 Created assessment record:', {
              id,
              patient_id: patientId,
              data: jsonData,
            });
          });
        }
      });
    } catch (err) {
      console.error('❌ Failed to save dentition assessment:', err);
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
    
    console.log(`Rendering tooth ${toothId}: canSwitch=${canSwitch}, isCurrentlyPrimary=${isCurrentlyPrimary}, currentToothId=${currentToothId}`);
    
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
      
      <Pressable style={styles.saveButton} onPress={saveAssessment}>
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