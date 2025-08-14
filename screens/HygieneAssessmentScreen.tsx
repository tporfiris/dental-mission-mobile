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

  const getToothPosition = (toothId: string, index: number, section: 'upper-right' | 'upper-left' | 'lower-right' | 'lower-left') => {
    const centerX = 160;
    const centerY = 210;
    const radiusX = 140;
    const radiusY = 200;
    
    let angle = 0;
    
    switch (section) {
      case 'upper-right':
        angle = (index * Math.PI / 14);
        break;
      case 'upper-left':
        angle = Math.PI - (index * Math.PI / 14);
        break;
      case 'lower-right':
        angle = (Math.PI * 2) - (index * Math.PI / 14);
        break;
      case 'lower-left':
        angle = Math.PI + (index * Math.PI / 14);
        break;
    }
    
    const x = centerX + radiusX * Math.cos(angle);
    const y = centerY + radiusY * Math.sin(angle);
    
    return { left: x - 15, top: y - 15 };
  };

  const renderTooth = (toothId: string, index: number, section: 'upper-right' | 'upper-left' | 'lower-right' | 'lower-left') => {
    const position = getToothPosition(toothId, index, section);
    
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
        <Text style={[styles.archLabel, styles.upperArchLabel]}>Upper{'\n'}Arch</Text>
        
        {/* Lower Arch Label */}
        <Text style={[styles.archLabel, styles.lowerArchLabel]}>Lower{'\n'}Arch</Text>
        
        {/* Center Instructions */}
        <Text style={styles.centerInstructions}>Tap to assess{'\n'}plaque/calculus{'\n'}severity</Text>
        
        {/* Render all teeth */}
        {UPPER_RIGHT.map((toothId, index) => renderTooth(toothId, index, 'upper-right'))}
        {UPPER_LEFT.map((toothId, index) => renderTooth(toothId, index, 'upper-left'))}
        {LOWER_RIGHT.map((toothId, index) => renderTooth(toothId, index, 'lower-right'))}
        {LOWER_LEFT.map((toothId, index) => renderTooth(toothId, index, 'lower-left'))}
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
    height: 460,
    position: 'relative',
    marginBottom: 30,
  },
  archLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    position: 'absolute',
  },
  upperArchLabel: {
    top: 90,
    left: 140,
  },
  lowerArchLabel: {
    top: 300,
    left: 140,
  },
  centerInstructions: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    position: 'absolute',
    top: 190,
    left: 115,
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