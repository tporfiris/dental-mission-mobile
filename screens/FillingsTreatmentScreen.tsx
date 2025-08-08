import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useFillingsTreatment } from '../contexts/FillingsTreatmentContext';
import { useAuth } from '../contexts/AuthContext';
import { database } from '../db';
import Treatment from '../db/models/Treatment';
import uuid from 'react-native-uuid';

const SURFACES = ['M', 'D', 'L', 'B', 'O'] as const;
type Surface = typeof SURFACES[number];

const UPPER_RIGHT = ['11', '12', '13', '14', '15', '16', '17', '18'];
const UPPER_LEFT = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_RIGHT = ['41', '42', '43', '44', '45', '46', '47', '48'];
const LOWER_LEFT = ['31', '32', '33', '34', '35', '36', '37', '38'];

const FillingsTreatmentScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  const { user } = useAuth();
  const {
    treatmentState,
    toggleSurface,
    clearTooth,
    updateNotes,
    markAllCompleted,
    resetTreatment,
    getCompletedTreatments,
    getTotalSurfaceCount,
  } = useFillingsTreatment();

  const { treatments, notes, allCompleted, completedAt } = treatmentState;
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Generate billing codes based on filled surfaces
  const billingCodes = useMemo(() => {
    const codes: Array<{
      toothId: string;
      code: string;
      description: string;
      surfaces: string;
      category: string;
    }> = [];

    Object.entries(treatments).forEach(([toothId, treatment]) => {
      if (treatment.surfaces.length === 0) return;

      const surfaceStr = treatment.surfaces.join('');
      let code = '';
      let description = '';

      // Generate codes based on number of surfaces
      switch (treatment.surfaces.length) {
        case 1:
          code = 'D2140';
          description = 'Amalgam - one surface, primary or permanent';
          break;
        case 2:
          code = 'D2150';
          description = 'Amalgam - two surfaces, primary or permanent';
          break;
        case 3:
          code = 'D2160';
          description = 'Amalgam - three surfaces, primary or permanent';
          break;
        case 4:
          code = 'D2161';
          description = 'Amalgam - four or more surfaces, primary or permanent';
          break;
        case 5:
          code = 'D2161';
          description = 'Amalgam - four or more surfaces, primary or permanent';
          break;
        default:
          code = 'D2140';
          description = 'Amalgam - one surface, primary or permanent';
      }

      codes.push({
        toothId,
        code,
        description,
        surfaces: surfaceStr,
        category: 'Restorative',
      });
    });

    return codes;
  }, [treatments]);

  const openToothEditor = (toothId: string) => {
    setSelectedTooth(toothId);
    setModalVisible(true);
  };

  const closeToothEditor = () => {
    setSelectedTooth(null);
    setModalVisible(false);
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

  const getToothStyle = (toothId: string) => {
    const treatment = treatments[toothId];
    if (treatment.surfaces.length === 0) {
      return styles.toothNormal;
    }
    if (treatment.completed) {
      return styles.toothCompleted;
    }
    return styles.toothHasFilling;
  };

  const renderTooth = (toothId: string, index: number, section: 'upper-right' | 'upper-left' | 'lower-right' | 'lower-left') => {
    const position = getToothPosition(toothId, index, section);
    const treatment = treatments[toothId];
    
    return (
      <Pressable
        key={toothId}
        onPress={() => openToothEditor(toothId)}
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
        {treatment.surfaces.length > 0 && (
          <View style={styles.surfaceIndicator}>
            <Text style={styles.surfaceText}>
              {treatment.surfaces.join('')}
            </Text>
          </View>
        )}
        {treatment.completed && (
          <View style={styles.completedFlag}>
            <Text style={styles.completedText}>✓</Text>
          </View>
        )}
      </Pressable>
    );
  };

  const saveTreatmentToDatabase = async () => {
    try {
      const completedTreatments = getCompletedTreatments();
      const clinicianName = user?.email || 'Unknown Clinician';
      const completedDate = new Date();

      if (completedTreatments.length === 0) {
        Alert.alert('No Treatments', 'No fillings have been recorded for this patient.');
        return false;
      }

      await database.write(async () => {
        // Save each tooth with fillings as a separate treatment record
        for (const treatment of completedTreatments) {
          const treatmentId = uuid.v4();
          
          await database.get<Treatment>('treatments').create(treatmentRecord => {
            treatmentRecord._raw.id = treatmentId;
            treatmentRecord.patientId = patientId;
            treatmentRecord.visitId = '';
            treatmentRecord.type = 'filling';
            treatmentRecord.tooth = treatment.toothId;
            treatmentRecord.surface = treatment.surfaces.join('');
            treatmentRecord.units = treatment.surfaces.length;
            treatmentRecord.value = 0; // Can be calculated later
            
            // Find the billing code for this specific tooth
            const code = billingCodes.find(c => c.toothId === treatment.toothId);
            treatmentRecord.billingCodes = JSON.stringify(code ? [code] : []);
            
            treatmentRecord.notes = notes || '';
            treatmentRecord.clinicianName = clinicianName;
            treatmentRecord.completedAt = completedDate;
          });
        }
      });

      console.log('✅ Fillings treatments saved to database:', {
        patientId,
        treatmentsCount: completedTreatments.length,
        totalSurfaces: getTotalSurfaceCount(),
        billingCodes: billingCodes.length,
        clinician: clinicianName,
        completedAt: completedDate.toISOString()
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to save fillings treatments:', error);
      Alert.alert('Save Error', 'Failed to save treatments to database. Please try again.');
      return false;
    }
  };

  const handleCompleteTreatment = async () => {
    const completedTreatments = getCompletedTreatments();
    
    if (completedTreatments.length === 0) {
      Alert.alert(
        'No Fillings Recorded',
        'Please select teeth and surfaces that received fillings before completing the treatment.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Complete Fillings Treatment',
      `Complete fillings treatment for this patient?\n\n` +
      `Treatment Summary:\n` +
      `• Teeth with fillings: ${completedTreatments.length}\n` +
      `• Total surfaces filled: ${getTotalSurfaceCount()}\n` +
      `• Billing codes generated: ${billingCodes.length}\n\n` +
      `This will save all treatments to the database.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Complete & Save', 
          onPress: async () => {
            const saved = await saveTreatmentToDatabase();
            
            if (saved) {
              markAllCompleted();
              Alert.alert(
                'Success', 
                '✅ Fillings treatment completed and saved!\n\n' +
                `Treatment Details:\n` +
                `• Patient ID: ${patientId}\n` +
                `• Teeth treated: ${completedTreatments.length}\n` +
                `• Total surfaces: ${getTotalSurfaceCount()}\n` +
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
      'Are you sure you want to reset all treatment data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: resetTreatment }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>🧱 Fillings Treatment</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

      {allCompleted && completedAt && (
        <View style={styles.completedBanner}>
          <Text style={styles.completedBannerText}>✅ Treatment Completed</Text>
          <Text style={styles.completedDate}>
            {new Date(completedAt).toLocaleDateString()} at{' '}
            {new Date(completedAt).toLocaleTimeString()}
          </Text>
        </View>
      )}

      {/* Treatment Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>Treatment Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Teeth with Fillings:</Text>
            <Text style={styles.summaryValue}>{getCompletedTreatments().length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Surfaces Filled:</Text>
            <Text style={styles.summaryValue}>{getTotalSurfaceCount()}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Billing Codes:</Text>
            <Text style={styles.summaryValue}>{billingCodes.length}</Text>
          </View>
        </View>
      </View>

      {/* Dental Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.sectionTitle}>Select Teeth for Fillings</Text>
        <View style={styles.dentalChart}>
          <Text style={[styles.archLabel, styles.upperArchLabel]}>Upper{'\n'}Arch</Text>
          <Text style={[styles.archLabel, styles.lowerArchLabel]}>Lower{'\n'}Arch</Text>
          <Text style={styles.centerInstructions}>
            Tap teeth to{'\n'}select filled{'\n'}surfaces
          </Text>
          
          {UPPER_RIGHT.map((toothId, index) => renderTooth(toothId, index, 'upper-right'))}
          {UPPER_LEFT.map((toothId, index) => renderTooth(toothId, index, 'upper-left'))}
          {LOWER_RIGHT.map((toothId, index) => renderTooth(toothId, index, 'lower-right'))}
          {LOWER_LEFT.map((toothId, index) => renderTooth(toothId, index, 'lower-left'))}
        </View>
      </View>

      {/* Generated Billing Codes */}
      {billingCodes.length > 0 && (
        <View style={styles.billingSection}>
          <Text style={styles.sectionTitle}>Generated Billing Codes</Text>
          {billingCodes.map((code, index) => (
            <View key={index} style={styles.codeCard}>
              <View style={styles.codeHeader}>
                <Text style={styles.codeNumber}>{code.code}</Text>
                <Text style={styles.toothNumber}>Tooth {code.toothId}</Text>
              </View>
              <Text style={styles.codeDescription}>{code.description}</Text>
              <Text style={styles.codeSurfaces}>Surfaces: {code.surfaces}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Notes Section */}
      <View style={styles.notesSection}>
        <Text style={styles.sectionTitle}>Treatment Notes</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={updateNotes}
          placeholder="Additional notes about fillings treatment..."
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothNormal]} />
          <Text style={styles.legendLabel}>No Fillings</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothHasFilling]} />
          <Text style={styles.legendLabel}>Has Fillings</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothCompleted]} />
          <Text style={styles.legendLabel}>Treatment Completed</Text>
        </View>
      </View>

      <Text style={styles.surfaceNote}>
        Surfaces: M=Mesial, D=Distal, L=Lingual, B=Buccal, O=Occlusal
      </Text>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <Pressable 
          style={[styles.actionButton, styles.completeButton]} 
          onPress={handleCompleteTreatment}
        >
          <Text style={styles.actionButtonText}>
            {allCompleted ? '✅ Treatment Completed' : '🏁 Complete Treatment'}
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

      {/* Surface Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeToothEditor}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Tooth {selectedTooth} - Select Filled Surfaces
            </Text>
            
            <Text style={styles.modalSubtitle}>
              Tap the surfaces that received fillings:
            </Text>
            
            <View style={styles.surfaceButtons}>
              {SURFACES.map(surface => (
                <Pressable
                  key={surface}
                  style={[
                    styles.surfaceButton,
                    selectedTooth && treatments[selectedTooth]?.surfaces.includes(surface) && styles.surfaceButtonSelected
                  ]}
                  onPress={() => selectedTooth && toggleSurface(selectedTooth, surface)}
                >
                  <Text style={[
                    styles.surfaceButtonText,
                    selectedTooth && treatments[selectedTooth]?.surfaces.includes(surface) && styles.surfaceButtonTextSelected
                  ]}>
                    {surface}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.surfaceLabels}>
              <Text style={styles.surfaceLabel}>M = Mesial</Text>
              <Text style={styles.surfaceLabel}>D = Distal</Text>
              <Text style={styles.surfaceLabel}>L = Lingual</Text>
              <Text style={styles.surfaceLabel}>B = Buccal</Text>
              <Text style={styles.surfaceLabel}>O = Occlusal</Text>
            </View>

            {selectedTooth && treatments[selectedTooth]?.surfaces.length > 0 && (
              <View style={styles.selectedSurfaces}>
                <Text style={styles.selectedSurfacesLabel}>
                  Selected: {treatments[selectedTooth].surfaces.join(', ')}
                </Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable 
                style={styles.clearToothButton} 
                onPress={() => selectedTooth && clearTooth(selectedTooth)}
              >
                <Text style={styles.clearToothButtonText}>Clear Tooth</Text>
              </Pressable>
              <Pressable style={styles.doneButton} onPress={closeToothEditor}>
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default FillingsTreatmentScreen;

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
  completedBannerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#155724',
  },
  completedDate: {
    fontSize: 14,
    color: '#155724',
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  summaryGrid: {
    gap: 8,
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
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  centerInstructions: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    position: 'absolute',
    top: 180,
    left: 110,
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
  surfaceIndicator: {
    position: 'absolute',
    bottom: -12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  surfaceText: {
    color: 'white',
    fontSize: 8,
    fontWeight: '600',
  },
  completedFlag: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#28a745',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  toothNormal: {
    backgroundColor: '#6c757d',
  },
  toothHasFilling: {
    backgroundColor: '#007bff',
  },
  toothCompleted: {
    backgroundColor: '#28a745',
  },
  billingSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  codeCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
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
    color: '#007bff',
  },
  toothNumber: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '600',
  },
  codeDescription: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
  },
  codeSurfaces: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  notesSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendItem: {
    alignItems: 'center',
  },
  legendCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginBottom: 4,
  },
  legendLabel: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  surfaceNote: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
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
    marginBottom: 8,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  surfaceButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  surfaceButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
    minWidth: 50,
    alignItems: 'center',
  },
  surfaceButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  surfaceButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  surfaceButtonTextSelected: {
    color: 'white',
  },
  surfaceLabels: {
    alignItems: 'center',
    marginBottom: 16,
  },
  surfaceLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginVertical: 1,
  },
  selectedSurfaces: {
    backgroundColor: '#e7f3ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  selectedSurfacesLabel: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '600',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clearToothButton: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  clearToothButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  doneButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});