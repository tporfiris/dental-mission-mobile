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
import DentureAssessment from '../db/models/DentureAssessment';
import { Q } from '@nozbe/watermelondb';
import uuid from 'react-native-uuid';
import { useDentureAssessment } from '../contexts/DentureAssessmentContext';

const ASSESSMENT_TYPES = ['initial-visit', 'post-extraction'] as const;
type AssessmentType = typeof ASSESSMENT_TYPES[number];

const DENTURE_TYPES = [
  'none',
  'upper-full',
  'lower-full',
  'upper-lower-full',
  'upper-partial',
  'lower-partial',
  'upper-lower-partial',
  'upper-full-lower-partial',
  'upper-partial-lower-full'
] as const;
type DentureType = typeof DENTURE_TYPES[number];

const DENTURE_LABELS = {
  'none': 'No Denture Needed',
  'upper-full': 'Upper Full Denture',
  'lower-full': 'Lower Full Denture',
  'upper-lower-full': 'Upper & Lower Full Dentures',
  'upper-partial': 'Upper Partial Denture',
  'lower-partial': 'Lower Partial Denture',
  'upper-lower-partial': 'Upper & Lower Partial Dentures',
  'upper-full-lower-partial': 'Upper Full + Lower Partial',
  'upper-partial-lower-full': 'Upper Partial + Lower Full',
};

const UPPER_RIGHT = ['11', '12', '13', '14', '15', '16', '17', '18'];
const UPPER_LEFT = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_RIGHT = ['41', '42', '43', '44', '45', '46', '47', '48'];
const LOWER_LEFT = ['31', '32', '33', '34', '35', '36', '37', '38'];

const DentureAssessmentScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  const { 
    dentureState, 
    updateAssessmentType, 
    updateDentureType, 
    updateDentureOptions, 
    updateNotes 
  } = useDentureAssessment();

  const { assessmentType, selectedDentureType, dentureOptions, notes } = dentureState;

  // Updated tooth positions - same as other assessment screens
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
        assessmentType,
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

  const toggleDentureOption = (option: keyof typeof dentureOptions) => {
    const updatedOptions = {
      ...dentureOptions,
      [option]: !dentureOptions[option]
    };
    updateDentureOptions(updatedOptions);
  };

  const getToothPosition = (toothId: string) => {
    const chartCenter = { x: 180, y: 135 }; // Center of the chart container
    const offset = toothOffsets[toothId];
    
    return {
      left: chartCenter.x + offset.x - 12, // -12 to center the 24px circle
      top: chartCenter.y + offset.y - 12
    };
  };

  const getToothStyle = (toothId: string) => {
    // Show different colors based on denture type selection
    const isUpper = toothId.startsWith('1') || toothId.startsWith('2');
    const isLower = toothId.startsWith('3') || toothId.startsWith('4');
    
    if (selectedDentureType === 'none') {
      return styles.toothPresent;
    }
    
    if ((selectedDentureType.includes('upper-full') && isUpper) ||
        (selectedDentureType.includes('lower-full') && isLower) ||
        (selectedDentureType === 'upper-lower-full')) {
      return styles.toothFullDenture;
    }
    
    if ((selectedDentureType.includes('upper-partial') && isUpper) ||
        (selectedDentureType.includes('lower-partial') && isLower) ||
        (selectedDentureType === 'upper-lower-partial')) {
      return styles.toothPartialDenture;
    }
    
    if (selectedDentureType === 'upper-full-lower-partial') {
      return isUpper ? styles.toothFullDenture : styles.toothPartialDenture;
    }
    
    if (selectedDentureType === 'upper-partial-lower-full') {
      return isUpper ? styles.toothPartialDenture : styles.toothFullDenture;
    }
    
    return styles.toothPresent;
  };

  const renderTooth = (toothId: string) => {
    const position = getToothPosition(toothId);
    
    return (
      <View
        key={toothId}
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
      </View>
    );
  };

  const assessmentSummary = useMemo(() => {
    const hasAnyDenture = selectedDentureType !== 'none';
    const selectedOptions = Object.entries(dentureOptions)
      .filter(([_, selected]) => selected)
      .map(([option, _]) => option);

    let treatmentCode = '';
    let estimatedCost = '';
    
    if (hasAnyDenture) {
      if (selectedDentureType.includes('full')) {
        treatmentCode = 'D5110-D5140 - Complete Dentures';
        estimatedCost = '$800-1200';
      } else if (selectedDentureType.includes('partial')) {
        treatmentCode = 'D5213-D5214 - Partial Dentures';
        estimatedCost = '$600-900';
      }
      
      if (dentureOptions.immediate) {
        treatmentCode += ' (Immediate)';
        estimatedCost = '$1000-1500';
      }
    }

    return {
      hasAnyDenture,
      selectedOptions,
      treatmentCode,
      estimatedCost,
      dentureLabel: DENTURE_LABELS[selectedDentureType]
    };
  }, [selectedDentureType, dentureOptions]);

  const generateDentureReport = () => {
    if (!assessmentSummary.hasAnyDenture) {
      Alert.alert('Denture Assessment', 'No denture treatment planned for this patient.');
      return;
    }

    const selectedOptions = assessmentSummary.selectedOptions
      .map(option => option.replace('-', ' '))
      .map(option => option.charAt(0).toUpperCase() + option.slice(1))
      .join(', ');

    const report = `
Denture Assessment Report
Patient ID: ${patientId}
Assessment Type: ${assessmentType === 'initial-visit' ? 'Initial Visit' : 'Post-Extraction'}

Recommended Treatment:
${assessmentSummary.dentureLabel}

Treatment Options:
${selectedOptions || 'Standard denture'}

Treatment Code: ${assessmentSummary.treatmentCode}
Estimated Cost: ${assessmentSummary.estimatedCost}

${assessmentType === 'initial-visit' ? 
  'Note: This is a preliminary assessment. Final denture plan may change after extractions and healing period.' :
  'Note: This assessment is based on post-extraction oral condition. Patient is ready for denture fabrication.'}

${notes ? `Additional Notes:\n${notes}` : ''}
    `;
    
    Alert.alert('Denture Treatment Plan', report.trim());
  };

  const resetAssessment = () => {
    updateDentureType('none');
    updateDentureOptions({
      immediate: false,
      temporary: false,
      conventional: false,
      reline: false,
      repair: false,
      adjustment: false,
    });
    updateNotes('');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>🦷 Denture Assessment</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

      {/* Assessment Type Selection */}
      <View style={styles.assessmentTypeCard}>
        <Text style={styles.cardTitle}>Assessment Type</Text>
        <View style={styles.typeButtons}>
          <Pressable
            style={[
              styles.typeButton,
              assessmentType === 'initial-visit' && styles.typeButtonSelected
            ]}
            onPress={() => updateAssessmentType('initial-visit')}
          >
            <Text style={[
              styles.typeButtonText,
              assessmentType === 'initial-visit' && styles.typeButtonTextSelected
            ]}>
              📋 Initial Visit
            </Text>
            <Text style={styles.typeDescription}>
              First assessment for denture needs
            </Text>
          </Pressable>
          
          <Pressable
            style={[
              styles.typeButton,
              assessmentType === 'post-extraction' && styles.typeButtonSelected
            ]}
            onPress={() => updateAssessmentType('post-extraction')}
          >
            <Text style={[
              styles.typeButtonText,
              assessmentType === 'post-extraction' && styles.typeButtonTextSelected
            ]}>
              🦷 Post-Extraction
            </Text>
            <Text style={styles.typeDescription}>
              Assessment after tooth removal
            </Text>
          </Pressable>
        </View>
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
                selectedDentureType === type && styles.dentureOptionTextSelected
              ]}>
                {DENTURE_LABELS[type]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Visual Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>Denture Visualization</Text>
        <View style={styles.dentalChart}>
          {/* Upper Arch Label */}
          <Text style={styles.upperArchLabel}>Upper Arch</Text>
          
          {/* Lower Arch Label */}
          <Text style={styles.lowerArchLabel}>Lower Arch</Text>
          
          {/* Center Label */}
          <Text style={styles.centerLabel}>
            {assessmentSummary.dentureLabel}
          </Text>
          
          {/* Render all teeth */}
          {[...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_RIGHT, ...LOWER_LEFT].map(toothId => 
            renderTooth(toothId)
          )}
        </View>
      </View>

      {/* Denture Options */}
      {selectedDentureType !== 'none' && (
        <View style={styles.optionsCard}>
          <Text style={styles.cardTitle}>Denture Options</Text>
          <View style={styles.optionsGrid}>
            {Object.entries(dentureOptions).map(([option, selected]) => (
              <Pressable
                key={option}
                style={[
                  styles.optionToggle,
                  selected && styles.optionToggleSelected
                ]}
                onPress={() => toggleDentureOption(option as keyof typeof dentureOptions)}
              >
                <Text style={[
                  styles.optionToggleText,
                  selected && styles.optionToggleTextSelected
                ]}>
                  {option.charAt(0).toUpperCase() + option.slice(1).replace('-', ' ')}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Treatment Summary */}
      {assessmentSummary.hasAnyDenture && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Treatment Summary</Text>
          <Text style={styles.summaryText}>
            <Text style={styles.summaryLabel}>Recommended: </Text>
            {assessmentSummary.dentureLabel}
          </Text>
          <Text style={styles.summaryText}>
            <Text style={styles.summaryLabel}>Treatment Code: </Text>
            {assessmentSummary.treatmentCode}
          </Text>
          <Text style={styles.summaryText}>
            <Text style={styles.summaryLabel}>Estimated Cost: </Text>
            {assessmentSummary.estimatedCost}
          </Text>
          
          <View style={styles.actionButtons}>
            <Pressable style={styles.reportButton} onPress={generateDentureReport}>
              <Text style={styles.reportButtonText}>Generate Report</Text>
            </Pressable>
            <Pressable style={styles.resetButton} onPress={resetAssessment}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothPresent]} />
          <Text style={styles.legendLabel}>Natural Teeth</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothFullDenture]} />
          <Text style={styles.legendLabel}>Full Denture Area</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothPartialDenture]} />
          <Text style={styles.legendLabel}>Partial Denture Area</Text>
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
  assessmentTypeCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  typeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeButton: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  typeButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  typeButtonTextSelected: {
    color: 'white',
  },
  typeDescription: {
    fontSize: 11,
    color: '#665',
    textAlign: 'center',
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
    backgroundColor: '#28a745',
    borderColor: '#28a745',
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
  chartCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  dentalChart: {
    width: 360,
    height: 480,
    position: 'relative',
    alignSelf: 'center',
  },
  upperArchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    position: 'absolute',
    top: 50,
    left: 150,
    width: 60,
  },
  lowerArchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    position: 'absolute',
    top: 390,
    left: 150,
    width: 60,
  },
  centerLabel: {
    fontSize: 12,
    color: '#007bff',
    textAlign: 'center',
    position: 'absolute',
    top: 210,
    left: 80,
    width: 200,
    fontWeight: '600',
  },
  toothCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toothLabel: {
    color: 'white',
    fontWeight: '600',
    fontSize: 9,
  },
  toothPresent: {
    backgroundColor: '#28a745',
  },
  toothFullDenture: {
    backgroundColor: '#dc3545',
  },
  toothPartialDenture: {
    backgroundColor: '#ffc107',
  },
  optionsCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionToggle: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    width: '48%',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  optionToggleSelected: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  optionToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  optionToggleTextSelected: {
    color: 'white',
  },
  summaryCard: {
    backgroundColor: '#e7f3ff',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#b3d9ff',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  summaryText: {
    fontSize: 14,
    marginBottom: 6,
    color: '#333',
  },
  summaryLabel: {
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  reportButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flex: 1,
    marginRight: 8,
  },
  reportButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flex: 1,
    marginLeft: 8,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
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
    marginBottom: 20,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
});