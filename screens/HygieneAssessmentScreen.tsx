import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { database } from '../db'; // adjust path if needed
import HygieneAssessment from '../db/models/HygieneAssessment';
import { Q } from '@nozbe/watermelondb';
import uuid from 'react-native-uuid';
import { useHygieneAssessment } from '../contexts/HygieneAssessmentContext';
// import AudioRecordingButton from '../components/AudioRecordingButton';

const HYGIENE_STATES = ['normal', 'light-plaque', 'moderate-plaque', 'heavy-plaque', 'calculus'] as const;
type HygieneState = typeof HYGIENE_STATES[number];

const UPPER_RIGHT = ['11', '12', '13', '14', '15', '16', '17', '18'];
const UPPER_LEFT = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_RIGHT = ['41', '42', '43', '44', '45', '46', '47', '48'];
const LOWER_LEFT = ['31', '32', '33', '34', '35', '36', '37', '38'];

// Scaling unit values per tooth based on severity
const SCALING_UNITS = {
  'normal': 0,
  'light-plaque': 0.5,
  'moderate-plaque': 1,
  'heavy-plaque': 1.5,
  'calculus': 2,
};

const HygieneAssessmentScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  const { hygieneStates, setHygieneStates } = useHygieneAssessment();

  // Updated tooth positions - same as DentitionAssessmentScreen
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

  const cycleHygieneState = (toothId: string) => {
    setHygieneStates(prev => {
      const currentIndex = HYGIENE_STATES.indexOf(prev[toothId]);
      const nextState = HYGIENE_STATES[(currentIndex + 1) % HYGIENE_STATES.length];
      return { ...prev, [toothId]: nextState };
    });
  };

  const saveAssessment = async () => {
    try {
      const collection = database.get<HygieneAssessment>('hygiene_assessments');
      console.log('🔎 Looking for existing hygiene assessment for patient:', patientId);
      const existing = await collection
        .query(Q.where('patient_id', Q.eq(patientId)))
        .fetch();

      console.log('🔍 Matched existing hygiene assessment:', existing);
  
      const jsonData = JSON.stringify(hygieneStates);
  
      await database.write(async () => {
        console.log("existing hygiene assessments:")
        console.log(existing)
        console.log("existing length:")
        console.log(existing.length)
        if (existing.length > 0) {
          console.log('🔍 Existing hygiene assessments for patient', patientId, ':', existing);
          // Update existing record
          await existing[0].update(record => {
            record.data = jsonData;
            record.updatedAt = new Date();
          });
          console.log('✅ Hygiene assessment updated');
          Alert.alert('✅ Hygiene assessment updated');
        } else {
          // Create new record
          await collection.create(record => {
            const id = uuid.v4();
            record._raw.id = id;
            record.patientId = patientId; // must match schema!
            record.data = jsonData;
            record.createdAt = new Date();
            record.updatedAt = new Date();
            Alert.alert('✅ Hygiene assessment created')
            console.log('🔧 Created hygiene assessment record:', {
              id,
              patient_id: patientId,
              data: jsonData,
            });
          });
        }
      });
    } catch (err) {
      console.error('❌ Failed to save hygiene assessment:', err);
      Alert.alert('❌ Failed to save hygiene assessment');
    }
  };

  const getToothStyle = (state: HygieneState) => {
    switch (state) {
      case 'normal':
        return styles.toothNormal;
      case 'light-plaque':
        return styles.toothLightPlaque;
      case 'moderate-plaque':
        return styles.toothModeratePlaque;
      case 'heavy-plaque':
        return styles.toothHeavyPlaque;
      case 'calculus':
        return styles.toothCalculus;
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
    
    return (
      <Pressable
        key={toothId}
        onPress={() => cycleHygieneState(toothId)}
        style={[
          styles.toothCircle,
          getToothStyle(hygieneStates[toothId]),
          {
            position: 'absolute',
            left: position.left,
            top: position.top,
          }
        ]}
      >
        <Text style={styles.toothLabel}>{toothId}</Text>
      </Pressable>
    );
  };

  // Calculate total scaling units and generate hygiene codes
  const calculatedData = useMemo(() => {
    const totalUnits = Object.values(hygieneStates).reduce((sum, state) => {
      return sum + SCALING_UNITS[state];
    }, 0);

    const teethWithIssues = Object.entries(hygieneStates).filter(([_, state]) => state !== 'normal').length;
    const calculusTeeth = Object.values(hygieneStates).filter(state => state === 'calculus').length;
    
    let primaryCode = '';
    let additionalCodes = [];
    
    if (totalUnits === 0) {
      primaryCode = 'D1110 - Prophylaxis';
    } else if (totalUnits <= 8) {
      primaryCode = 'D4341 - Periodontal scaling/root planing (1-3 teeth)';
    } else if (totalUnits <= 16) {
      primaryCode = 'D4342 - Periodontal scaling/root planing (4+ teeth)';
    } else {
      primaryCode = 'D4355 - Full mouth debridement';
      additionalCodes.push('D4341/D4342 - Follow-up scaling may be needed');
    }

    if (calculusTeeth > 0) {
      additionalCodes.push('D4346 - Scaling in presence of generalized moderate/severe gingival inflammation');
    }

    return {
      totalUnits: totalUnits.toFixed(1),
      teethWithIssues,
      calculusTeeth,
      primaryCode,
      additionalCodes,
    };
  }, [hygieneStates]);

  const showDetailedReport = () => {
    const report = `
Hygiene Assessment Report
Patient ID: ${patientId}

Summary:
• Total Scaling Units: ${calculatedData.totalUnits}
• Teeth with Issues: ${calculatedData.teethWithIssues}/32
• Teeth with Calculus: ${calculatedData.calculusTeeth}

Primary Treatment Code:
${calculatedData.primaryCode}

${calculatedData.additionalCodes.length > 0 ? 
  'Additional Considerations:\n' + calculatedData.additionalCodes.map(code => `• ${code}`).join('\n') 
  : ''}
    `;
    
    Alert.alert('Hygiene Assessment Report', report.trim());
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>🧼 Hygiene Assessment</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

      {/* Results Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Assessment Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Scaling Units:</Text>
          <Text style={styles.summaryValue}>{calculatedData.totalUnits}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Teeth Affected:</Text>
          <Text style={styles.summaryValue}>{calculatedData.teethWithIssues}/32</Text>
        </View>
        <Text style={styles.primaryCode}>{calculatedData.primaryCode}</Text>
        <Pressable style={styles.reportButton} onPress={showDetailedReport}>
          <Text style={styles.reportButtonText}>View Full Report</Text>
        </Pressable>
      </View>

      {/* Dental Chart Container */}
      <View style={styles.dentalChart}>
        {/* Upper Arch Label */}
        <Text style={styles.upperArchLabel}>Upper Arch</Text>
        
        {/* Lower Arch Label */}
        <Text style={styles.lowerArchLabel}>Lower Arch</Text>
        
        {/* Center Instructions */}
        <Text style={styles.centerInstructions}>Tap to assess{'\n'}plaque/calculus{'\n'}severity</Text>
        
        {/* Render all teeth */}
        {[...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_RIGHT, ...LOWER_LEFT].map(toothId => 
          renderTooth(toothId)
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothNormal]} />
          <Text style={styles.legendLabel}>Normal (0 units)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothLightPlaque]} />
          <Text style={styles.legendLabel}>Light Plaque (0.5)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothModeratePlaque]} />
          <Text style={styles.legendLabel}>Moderate Plaque (1.0)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothHeavyPlaque]} />
          <Text style={styles.legendLabel}>Heavy Plaque (1.5)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothCalculus]} />
          <Text style={styles.legendLabel}>Calculus (2.0)</Text>
        </View>
      </View>

      {/* Save Button */}
      <Pressable style={styles.saveButton} onPress={saveAssessment}>
        <Text style={styles.saveButtonText}>Save Assessment</Text>
      </Pressable>

    </ScrollView>
  );
};

export default HygieneAssessmentScreen;

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
    color: '#666',
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  primaryCode: {
    fontSize: 12,
    color: '#007bff',
    marginTop: 8,
    fontWeight: '500',
  },
  reportButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  reportButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
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
  centerInstructions: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    position: 'absolute',
    top: 230,
    left: 130,
    width: 100,
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
  toothNormal: {
    backgroundColor: '#28a745', // Green - healthy
  },
  toothLightPlaque: {
    backgroundColor: '#ffc107', // Yellow - light plaque
  },
  toothModeratePlaque: {
    backgroundColor: '#fd7e14', // Orange - moderate plaque
  },
  toothHeavyPlaque: {
    backgroundColor: '#dc3545', // Red - heavy plaque
  },
  toothCalculus: {
    backgroundColor: '#6f42c1', // Purple - calculus
  },
  legend: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
    width: '100%',
  },
  legendCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 12,
  },
  legendLabel: {
    fontSize: 13,
    color: '#333',
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