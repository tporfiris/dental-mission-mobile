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
    
    return { left: x - 12, top: y - 12 };
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

  const renderTooth = (toothId: string, index: number, section: 'upper-right' | 'upper-left' | 'lower-right' | 'lower-left') => {
    const position = getToothPosition(toothId, index, section);
    
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
          <Text style={[styles.archLabel, styles.upperArchLabel]}>Upper{'\n'}Arch</Text>
          
          {/* Lower Arch Label */}
          <Text style={[styles.archLabel, styles.lowerArchLabel]}>Lower{'\n'}Arch</Text>
          
          {/* Center Label */}
          <Text style={styles.centerLabel}>
            {assessmentSummary.dentureLabel}
          </Text>
          
          {/* Render all teeth */}
          {UPPER_RIGHT.map((toothId, index) => renderTooth(toothId, index, 'upper-right'))}
          {UPPER_LEFT.map((toothId, index) => renderTooth(toothId, index, 'upper-left'))}
          {LOWER_RIGHT.map((toothId, index) => renderTooth(toothId, index, 'lower-right'))}
          {LOWER_LEFT.map((toothId, index) => renderTooth(toothId, index, 'lower-left'))}
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
    width: 320,
    height: 400,
    position: 'relative',
    alignSelf: 'center',
  },
  archLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    position: 'absolute',
  },
  upperArchLabel: {
    top: 80,
    left: 130,
  },
  lowerArchLabel: {
    top: 280,
    left: 130,
  },
  centerLabel: {
    fontSize: 12,
    color: '#007bff',
    textAlign: 'center',
    position: 'absolute',
    top: 180,
    left: 80,
    width: 160,
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