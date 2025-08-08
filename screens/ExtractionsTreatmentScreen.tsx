import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useExtractionsTreatment } from '../contexts/ExtractionsTreatmentContext';
import { useAuth } from '../contexts/AuthContext';
import { database } from '../db';
import Treatment from '../db/models/Treatment';
import uuid from 'react-native-uuid';

const UPPER_RIGHT = ['11', '12', '13', '14', '15', '16', '17', '18'];
const UPPER_LEFT = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_RIGHT = ['41', '42', '43', '44', '45', '46', '47', '48'];
const LOWER_LEFT = ['31', '32', '33', '34', '35', '36', '37', '38'];

type ExtractionType = 'none' | 'tooth' | 'root-tip';

const ExtractionsTreatmentScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  const { user } = useAuth();
  const { 
    treatmentState, 
    toggleExtraction, 
    updateNotes,
    markCompleted,
    resetTreatment 
  } = useExtractionsTreatment();

  const { extractionsPerformed, notes, completedAt } = treatmentState;
  const [selectedTooth, setSelectedTooth] = React.useState<string | null>(null);
  const [modalVisible, setModalVisible] = React.useState(false);

  // Calculate billing codes based on extractions performed
  const billingCodes = useMemo(() => {
    const codes = [];
    const extractedTeeth = Object.entries(extractionsPerformed).filter(([_, type]) => type !== 'none');

    extractedTeeth.forEach(([toothId, type]) => {
      if (type === 'tooth') {
        // Determine if it's a simple or surgical extraction based on tooth type
        const toothNumber = parseInt(toothId);
        const isWisdomTooth = [18, 28, 38, 48].includes(toothNumber);
        const isMolar = toothNumber % 10 >= 6; // 6, 7, 8 are molars
        
        if (isWisdomTooth) {
          codes.push({
            code: 'D7240',
            description: `Removal of impacted tooth - completely bony (Tooth ${toothId})`,
            tooth: toothId,
            category: 'Oral Surgery'
          });
        } else if (isMolar) {
          codes.push({
            code: 'D7210',
            description: `Extraction, erupted tooth requiring removal of bone/sectioning (Tooth ${toothId})`,
            tooth: toothId,
            category: 'Oral Surgery'
          });
        } else {
          codes.push({
            code: 'D7140',
            description: `Extraction, erupted tooth or exposed root (Tooth ${toothId})`,
            tooth: toothId,
            category: 'Oral Surgery'
          });
        }
      } else if (type === 'root-tip') {
        codes.push({
          code: 'D7250',
          description: `Removal of residual tooth roots (Root tip ${toothId})`,
          tooth: toothId,
          category: 'Oral Surgery'
        });
      }
    });

    return codes;
  }, [extractionsPerformed]);

  const openToothSelector = (toothId: string) => {
    setSelectedTooth(toothId);
    setModalVisible(true);
  };

  const closeToothSelector = () => {
    setSelectedTooth(null);
    setModalVisible(false);
  };

  const selectExtractionType = (type: ExtractionType) => {
    if (selectedTooth) {
      toggleExtraction(selectedTooth, type);
    }
    closeToothSelector();
  };

  const getToothStyle = (toothId: string) => {
    const extractionType = extractionsPerformed[toothId];
    switch (extractionType) {
      case 'tooth':
        return styles.toothExtracted;
      case 'root-tip':
        return styles.rootTipExtracted;
      default:
        return styles.toothPresent;
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
    const extractionType = extractionsPerformed[toothId];
    
    return (
      <Pressable
        key={toothId}
        onPress={() => openToothSelector(toothId)}
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
        {extractionType !== 'none' && (
          <View style={styles.extractionIndicator}>
            <Text style={styles.extractionText}>
              {extractionType === 'tooth' ? '🦷' : 'RT'}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  const saveTreatmentToDatabase = async () => {
    try {
      const extractedTeeth = Object.entries(extractionsPerformed).filter(([_, type]) => type !== 'none');
      const clinicianName = user?.email || 'Unknown Clinician';
      const completedDate = new Date();

      // Save each extraction as a separate treatment record
      await database.write(async () => {
        for (const [toothId, extractionType] of extractedTeeth) {
          const treatmentId = uuid.v4();
          
          await database.get<Treatment>('treatments').create(treatment => {
            treatment._raw.id = treatmentId;
            treatment.patientId = patientId;
            treatment.visitId = '';
            treatment.type = 'extraction';
            treatment.tooth = toothId;
            treatment.surface = 'N/A';
            treatment.units = 1; // One extraction per tooth
            treatment.value = 0; // Can be calculated later
            
            // Find the billing code for this specific tooth
            const code = billingCodes.find(c => c.tooth === toothId);
            treatment.billingCodes = JSON.stringify(code ? [code] : []);
            
            treatment.notes = `${extractionType === 'tooth' ? 'Full tooth extraction' : 'Root tip removal'}: ${toothId}. ${notes}`.trim();
            treatment.clinicianName = clinicianName;
            treatment.completedAt = completedDate;
          });
        }
      });

      console.log('✅ Extractions treatment saved to database:', {
        patientId,
        extractionsCount: extractedTeeth.length,
        teeth: extractedTeeth.map(([tooth, type]) => `${tooth}(${type})`),
        billingCodes: billingCodes.length,
        clinician: clinicianName,
        completedAt: completedDate.toISOString()
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to save extractions treatment:', error);
      Alert.alert(
        'Save Error', 
        'Failed to save treatment to database. Please try again.',
        [{ text: 'OK' }]
      );
      return false;
    }
  };

  const handleCompleteTreatment = async () => {
    const extractedCount = Object.values(extractionsPerformed).filter(type => type !== 'none').length;
    
    if (extractedCount === 0) {
      Alert.alert(
        'No Extractions Recorded',
        'Please select teeth/root tips that were extracted before completing the treatment.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Complete Treatment',
      `Complete extractions treatment for this patient?\n\nTreatment Summary:\n• Extractions Performed: ${extractedCount}\n• Billing Codes Generated: ${billingCodes.length}\n\nThis will save each extraction to the database.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Complete & Save', 
          onPress: async () => {
            const saved = await saveTreatmentToDatabase();
            
            if (saved) {
              markCompleted();
              Alert.alert(
                'Success', 
                `✅ Extractions treatment completed and saved!\n\n` +
                `Treatment Details:\n` +
                `• Patient ID: ${patientId}\n` +
                `• Extractions: ${extractedCount}\n` +
                `• Billing Codes: ${billingCodes.length}\n` +
                `• Completed: ${new Date().toLocaleString()}`
              );
            }
          }
        }
      ]
    );
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Treatment',
      'Are you sure you want to reset all extraction data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: resetTreatment }
      ]
    );
  };

  const extractionSummary = useMemo(() => {
    const extractedTeeth = Object.entries(extractionsPerformed).filter(([_, type]) => type !== 'none');
    const toothExtractions = extractedTeeth.filter(([_, type]) => type === 'tooth').length;
    const rootTipExtractions = extractedTeeth.filter(([_, type]) => type === 'root-tip').length;

    return {
      total: extractedTeeth.length,
      teeth: toothExtractions,
      rootTips: rootTipExtractions,
      extractedList: extractedTeeth
    };
  }, [extractionsPerformed]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>🛠️ Extractions Treatment</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

      {completedAt && (
        <View style={styles.completedBanner}>
          <Text style={styles.completedText}>✅ Treatment Completed</Text>
          <Text style={styles.completedDate}>
            {new Date(completedAt).toLocaleDateString()} at{' '}
            {new Date(completedAt).toLocaleTimeString()}
          </Text>
        </View>
      )}

      {/* Treatment Summary */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Treatment Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Extractions:</Text>
            <Text style={styles.summaryValue}>{extractionSummary.total}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Full Tooth Extractions:</Text>
            <Text style={styles.summaryValue}>{extractionSummary.teeth}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Root Tip Removals:</Text>
            <Text style={styles.summaryValue}>{extractionSummary.rootTips}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Billing Codes:</Text>
            <Text style={styles.summaryValue}>{billingCodes.length}</Text>
          </View>
        </View>
      </View>

      {/* Dental Chart */}
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Dental Chart - Tap to Extract</Text>
        <View style={styles.dentalChart}>
          <Text style={[styles.archLabel, styles.upperArchLabel]}>Upper{'\n'}Arch</Text>
          <Text style={[styles.archLabel, styles.lowerArchLabel]}>Lower{'\n'}Arch</Text>
          <Text style={styles.centerInstructions}>Tap teeth to{'\n'}mark extractions</Text>
          
          {UPPER_RIGHT.map((toothId, index) => renderTooth(toothId, index, 'upper-right'))}
          {UPPER_LEFT.map((toothId, index) => renderTooth(toothId, index, 'upper-left'))}
          {LOWER_RIGHT.map((toothId, index) => renderTooth(toothId, index, 'lower-right'))}
          {LOWER_LEFT.map((toothId, index) => renderTooth(toothId, index, 'lower-left'))}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothPresent]} />
          <Text style={styles.legendLabel}>Present (Not Extracted)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothExtracted]} />
          <Text style={styles.legendLabel}>🦷 Full Tooth Extracted</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.rootTipExtracted]} />
          <Text style={styles.legendLabel}>RT Root Tip Removed</Text>
        </View>
      </View>

      {/* Generated Billing Codes */}
      <View style={styles.billingSection}>
        <Text style={styles.sectionTitle}>Generated Billing Codes</Text>
        
        {billingCodes.length === 0 ? (
          <Text style={styles.noCodesText}>
            Select extracted teeth to generate billing codes
          </Text>
        ) : (
          billingCodes.map((code, index) => (
            <View key={index} style={styles.codeCard}>
              <View style={styles.codeHeader}>
                <Text style={styles.codeNumber}>{code.code}</Text>
                <Text style={styles.codeCategory}>{code.category}</Text>
              </View>
              <Text style={styles.codeDescription}>{code.description}</Text>
              <Text style={styles.codeUnits}>Tooth: {code.tooth}</Text>
            </View>
          ))
        )}
      </View>

      {/* Notes */}
      <View style={styles.notesSection}>
        <Text style={styles.sectionTitle}>Treatment Notes (Optional)</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={updateNotes}
          placeholder="Additional notes about the extractions performed..."
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <Pressable 
          style={[styles.actionButton, styles.completeButton]} 
          onPress={handleCompleteTreatment}
        >
          <Text style={styles.actionButtonText}>
            {completedAt ? '✅ Treatment Completed' : '🏁 Complete Treatment'}
          </Text>
        </Pressable>
        
        <Pressable 
          style={[styles.actionButton, styles.resetButton]} 
          onPress={handleReset}
        >
          <Text style={[styles.actionButtonText, styles.resetButtonText]}>
            🔄 Reset Treatment
          </Text>
        </Pressable>
      </View>

      {/* Extraction Type Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeToothSelector}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Tooth {selectedTooth} - Select Extraction Type
            </Text>
            
            <Pressable
              style={[styles.extractionOptionButton, styles.toothExtractionOption]}
              onPress={() => selectExtractionType('tooth')}
            >
              <Text style={styles.optionText}>🦷 Full Tooth Extraction</Text>
              <Text style={styles.optionDescription}>
                Complete removal of tooth
              </Text>
            </Pressable>

            <Pressable
              style={[styles.extractionOptionButton, styles.rootTipOption]}
              onPress={() => selectExtractionType('root-tip')}
            >
              <Text style={styles.optionText}>🔧 Root Tip Removal</Text>
              <Text style={styles.optionDescription}>
                Removal of remaining root fragment
              </Text>
            </Pressable>

            <Pressable
              style={[styles.extractionOptionButton, styles.noneOption]}
              onPress={() => selectExtractionType('none')}
            >
              <Text style={styles.optionText}>❌ No Extraction</Text>
              <Text style={styles.optionDescription}>
                Remove extraction marking
              </Text>
            </Pressable>

            <Pressable style={styles.cancelButton} onPress={closeToothSelector}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default ExtractionsTreatmentScreen;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  completedBanner: {
    backgroundColor: '#d4edda',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  completedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#155724',
  },
  completedDate: {
    fontSize: 14,
    color: '#155724',
    marginTop: 4,
  },
  summarySection: {
    backgroundColor: '#e7f3ff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#b3d9ff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  summaryGrid: {
    gap: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: 'bold',
  },
  chartSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dentalChart: {
    width: 360,
    height: 460,
    position: 'relative',
    alignSelf: 'center',
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
    position: 'relative',
  },
  toothLabel: {
    color: 'white',
    fontWeight: '600',
    fontSize: 10,
  },
  toothPresent: {
    backgroundColor: '#28a745', // Green - not extracted
  },
  toothExtracted: {
    backgroundColor: '#dc3545', // Red - tooth extracted
  },
  rootTipExtracted: {
    backgroundColor: '#6f42c1', // Purple - root tip extracted
  },
  extractionIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  extractionText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#333',
  },
  legend: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  legendCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
  },
  legendLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  billingSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noCodesText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  codeCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  codeNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc3545',
  },
  codeCategory: {
    fontSize: 12,
    color: '#6c757d',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeDescription: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
  },
  codeUnits: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  notesSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notesInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 80,
  },
  actionSection: {
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#28a745',
  },
  resetButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#dc3545',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  resetButtonText: {
    color: '#dc3545',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  extractionOptionButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 2,
  },
  toothExtractionOption: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
  },
  rootTipOption: {
    backgroundColor: '#f3e5f5',
    borderColor: '#6f42c1',
  },
  noneOption: {
    backgroundColor: '#f8f9fa',
    borderColor: '#28a745',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    color: '#665',
    fontStyle: 'italic',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 