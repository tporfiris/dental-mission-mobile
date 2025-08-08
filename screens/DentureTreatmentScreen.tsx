import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useDentureTreatment, DentureType, DentureOption, DenturePlacement } from '../contexts/DentureTreatmentContext';
import { useAuth } from '../contexts/AuthContext';
import { database } from '../db';
import Treatment from '../db/models/Treatment';
import uuid from 'react-native-uuid';

const DENTURE_TYPES: { value: DentureType; label: string }[] = [
  { value: 'upper-full', label: 'Upper Full Denture' },
  { value: 'lower-full', label: 'Lower Full Denture' },
  { value: 'upper-lower-full', label: 'Upper & Lower Full Dentures' },
  { value: 'upper-partial', label: 'Upper Partial Denture' },
  { value: 'lower-partial', label: 'Lower Partial Denture' },
  { value: 'upper-lower-partial', label: 'Upper & Lower Partial Dentures' },
  { value: 'upper-full-lower-partial', label: 'Upper Full + Lower Partial' },
  { value: 'upper-partial-lower-full', label: 'Upper Partial + Lower Full' },
];

const DENTURE_OPTIONS: { value: DentureOption; label: string; description: string }[] = [
  { value: 'immediate', label: 'Immediate', description: 'Placed immediately after extractions' },
  { value: 'conventional', label: 'Conventional', description: 'Standard denture placement' },
  { value: 'temporary', label: 'Temporary', description: 'Temporary denture while healing' },
  { value: 'reline', label: 'Reline', description: 'Existing denture reline' },
  { value: 'repair', label: 'Repair', description: 'Denture repair performed' },
  { value: 'adjustment', label: 'Adjustment', description: 'Denture adjustment for fit' },
];

const DentureTreatmentScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  const { user } = useAuth();
  const { 
    treatmentState, 
    addDenturePlacement,
    updateDenturePlacement,
    removeDenturePlacement,
    updateGeneralNotes,
    markCompleted,
    resetTreatment 
  } = useDentureTreatment();

  const { placements, generalNotes, completedAt } = treatmentState;
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentPlacement, setCurrentPlacement] = useState<DenturePlacement>({
    dentureType: 'none',
    options: [],
    finalFitConfirmed: false,
    fitNotes: '',
  });

  // Generate billing codes based on denture placements
  const billingCodes = useMemo(() => {
    const codes: Array<{
      code: string;
      description: string;
      category: string;
      placement: DenturePlacement;
    }> = [];

    placements.forEach(placement => {
      if (placement.dentureType === 'none') return;

      // Base denture codes
      switch (placement.dentureType) {
        case 'upper-full':
          codes.push({
            code: 'D5110',
            description: 'Complete upper denture',
            category: 'Prosthodontics',
            placement
          });
          break;
        case 'lower-full':
          codes.push({
            code: 'D5120',
            description: 'Complete lower denture',
            category: 'Prosthodontics',
            placement
          });
          break;
        case 'upper-lower-full':
          codes.push(
            {
              code: 'D5110',
              description: 'Complete upper denture',
              category: 'Prosthodontics',
              placement
            },
            {
              code: 'D5120',
              description: 'Complete lower denture',
              category: 'Prosthodontics',
              placement
            }
          );
          break;
        case 'upper-partial':
          codes.push({
            code: 'D5213',
            description: 'Upper partial denture - cast metal framework',
            category: 'Prosthodontics',
            placement
          });
          break;
        case 'lower-partial':
          codes.push({
            code: 'D5214',
            description: 'Lower partial denture - cast metal framework',
            category: 'Prosthodontics',
            placement
          });
          break;
        case 'upper-lower-partial':
          codes.push(
            {
              code: 'D5213',
              description: 'Upper partial denture - cast metal framework',
              category: 'Prosthodontics',
              placement
            },
            {
              code: 'D5214',
              description: 'Lower partial denture - cast metal framework',
              category: 'Prosthodontics',
              placement
            }
          );
          break;
        case 'upper-full-lower-partial':
          codes.push(
            {
              code: 'D5110',
              description: 'Complete upper denture',
              category: 'Prosthodontics',
              placement
            },
            {
              code: 'D5214',
              description: 'Lower partial denture - cast metal framework',
              category: 'Prosthodontics',
              placement
            }
          );
          break;
        case 'upper-partial-lower-full':
          codes.push(
            {
              code: 'D5213',
              description: 'Upper partial denture - cast metal framework',
              category: 'Prosthodontics',
              placement
            },
            {
              code: 'D5120',
              description: 'Complete lower denture',
              category: 'Prosthodontics',
              placement
            }
          );
          break;
      }

      // Additional codes based on options
      placement.options.forEach(option => {
        switch (option) {
          case 'immediate':
            codes.push({
              code: 'D5130',
              description: 'Immediate denture',
              category: 'Prosthodontics',
              placement
            });
            break;
          case 'reline':
            codes.push({
              code: 'D5750',
              description: 'Reline complete denture',
              category: 'Prosthodontics',
              placement
            });
            break;
          case 'repair':
            codes.push({
              code: 'D5610',
              description: 'Repair broken complete denture base',
              category: 'Prosthodontics',
              placement
            });
            break;
          case 'adjustment':
            codes.push({
              code: 'D5410',
              description: 'Adjust complete denture',
              category: 'Prosthodontics',
              placement
            });
            break;
        }
      });
    });

    return codes;
  }, [placements]);

  const openPlacementModal = (index: number | null = null) => {
    if (index !== null) {
      setEditingIndex(index);
      setCurrentPlacement(placements[index]);
    } else {
      setEditingIndex(null);
      setCurrentPlacement({
        dentureType: 'none',
        options: [],
        finalFitConfirmed: false,
        fitNotes: '',
      });
    }
    setModalVisible(true);
  };

  const closePlacementModal = () => {
    setModalVisible(false);
    setEditingIndex(null);
  };

  const savePlacement = () => {
    if (currentPlacement.dentureType === 'none') {
      Alert.alert('Error', 'Please select a denture type before saving.');
      return;
    }

    if (editingIndex !== null) {
      updateDenturePlacement(editingIndex, currentPlacement);
    } else {
      addDenturePlacement(currentPlacement);
    }
    closePlacementModal();
  };

  const toggleOption = (option: DentureOption) => {
    setCurrentPlacement(prev => ({
      ...prev,
      options: prev.options.includes(option)
        ? prev.options.filter(o => o !== option)
        : [...prev.options, option]
    }));
  };

  const saveTreatmentToDatabase = async () => {
    try {
      const treatmentPromises = billingCodes.map(async (code) => {
        const treatmentId = uuid.v4();
        const completedDate = new Date();
        const clinicianName = user?.email || 'Unknown Clinician';

        return database.write(async () => {
          await database.get<Treatment>('treatments').create(treatment => {
            treatment._raw.id = treatmentId;
            treatment.patientId = patientId;
            treatment.visitId = '';
            treatment.type = 'denture';
            treatment.tooth = 'N/A';
            treatment.surface = 'N/A';
            treatment.units = 1;
            treatment.value = 0;
            treatment.billingCodes = JSON.stringify([code]);
            treatment.notes = `${code.placement.fitNotes ? `Fit Notes: ${code.placement.fitNotes}. ` : ''}${generalNotes}`;
            treatment.clinicianName = clinicianName;
            treatment.completedAt = completedDate;
          });
        });
      });

      await Promise.all(treatmentPromises);

      console.log('✅ Denture treatments saved to database:', {
        patientId,
        placementsCount: placements.length,
        codesGenerated: billingCodes.length,
        completedAt: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to save denture treatments:', error);
      Alert.alert('Save Error', 'Failed to save treatments to database. Please try again.');
      return false;
    }
  };

  const handleCompleteTreatment = async () => {
    if (placements.length === 0) {
      Alert.alert('No Dentures Placed', 'Please add at least one denture placement before completing treatment.');
      return;
    }

    const unconfirmedFits = placements.filter(p => !p.finalFitConfirmed);
    if (unconfirmedFits.length > 0) {
      Alert.alert(
        'Unconfirmed Fits',
        `${unconfirmedFits.length} denture(s) have not had their final fit confirmed. Please confirm all fits before completing treatment.`
      );
      return;
    }

    Alert.alert(
      'Complete Treatment',
      `Complete denture placement for this patient?\n\nTreatment Summary:\n• Dentures Placed: ${placements.length}\n• Billing Codes: ${billingCodes.length}\n• All Fits Confirmed: ✅\n\nThis will save the treatment to the database.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete & Save',
          onPress: async () => {
            const saved = await saveTreatmentToDatabase();
            if (saved) {
              markCompleted();
              Alert.alert('Success', '✅ Denture treatment completed and saved to database!');
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
      <Text style={styles.header}>🦷 Denture Treatment</Text>
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

      {/* Denture Placements Section */}
      <View style={styles.placementsSection}>
        <Text style={styles.sectionTitle}>Denture Placements</Text>
        
        {placements.length === 0 ? (
          <Text style={styles.noPlacementsText}>
            No dentures placed yet. Tap "Add Denture Placement" to begin.
          </Text>
        ) : (
          placements.map((placement, index) => (
            <View key={index} style={styles.placementCard}>
              <View style={styles.placementHeader}>
                <Text style={styles.placementTitle}>
                  {DENTURE_TYPES.find(t => t.value === placement.dentureType)?.label}
                </Text>
                <View style={styles.placementActions}>
                  <Pressable onPress={() => openPlacementModal(index)} style={styles.editButton}>
                    <Text style={styles.editButtonText}>Edit</Text>
                  </Pressable>
                  <Pressable onPress={() => removeDenturePlacement(index)} style={styles.removeButton}>
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
              
              {placement.options.length > 0 && (
                <Text style={styles.placementOptions}>
                  Options: {placement.options.map(opt => 
                    DENTURE_OPTIONS.find(o => o.value === opt)?.label
                  ).join(', ')}
                </Text>
              )}
              
              <View style={styles.fitStatus}>
                <Text style={[
                  styles.fitText,
                  placement.finalFitConfirmed ? styles.fitConfirmed : styles.fitPending
                ]}>
                  Final Fit: {placement.finalFitConfirmed ? '✅ Confirmed' : '⏳ Pending'}
                </Text>
              </View>
              
              {placement.fitNotes && (
                <Text style={styles.fitNotes}>Notes: {placement.fitNotes}</Text>
              )}
            </View>
          ))
        )}

        <Pressable style={styles.addButton} onPress={() => openPlacementModal()}>
          <Text style={styles.addButtonText}>+ Add Denture Placement</Text>
        </Pressable>
      </View>

      {/* Generated Billing Codes */}
      <View style={styles.billingSection}>
        <Text style={styles.sectionTitle}>Generated Billing Codes</Text>
        
        {billingCodes.length === 0 ? (
          <Text style={styles.noCodesText}>Add denture placements to generate billing codes</Text>
        ) : (
          billingCodes.map((code, index) => (
            <View key={index} style={styles.codeCard}>
              <View style={styles.codeHeader}>
                <Text style={styles.codeNumber}>{code.code}</Text>
                <Text style={styles.codeCategory}>{code.category}</Text>
              </View>
              <Text style={styles.codeDescription}>{code.description}</Text>
            </View>
          ))
        )}
      </View>

      {/* General Notes */}
      <View style={styles.notesSection}>
        <Text style={styles.sectionTitle}>Treatment Notes</Text>
        <TextInput
          style={styles.notesInput}
          value={generalNotes}
          onChangeText={updateGeneralNotes}
          placeholder="General notes about the denture treatment..."
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <Pressable style={[styles.actionButton, styles.completeButton]} onPress={handleCompleteTreatment}>
          <Text style={styles.actionButtonText}>
            {completedAt ? '✅ Treatment Completed' : '🏁 Complete Treatment'}
          </Text>
        </Pressable>
        
        <Pressable style={[styles.actionButton, styles.resetButton]} onPress={handleReset}>
          <Text style={[styles.actionButtonText, styles.resetButtonText]}>
            🔄 Reset Treatment
          </Text>
        </Pressable>
      </View>

      {/* Denture Placement Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closePlacementModal}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingIndex !== null ? 'Edit' : 'Add'} Denture Placement
              </Text>

              {/* Denture Type Selection */}
              <Text style={styles.modalSectionTitle}>Denture Type</Text>
              <View style={styles.typeGrid}>
                {DENTURE_TYPES.map(type => (
                  <Pressable
                    key={type.value}
                    style={[
                      styles.typeButton,
                      currentPlacement.dentureType === type.value && styles.typeButtonSelected
                    ]}
                    onPress={() => setCurrentPlacement(prev => ({ ...prev, dentureType: type.value }))}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      currentPlacement.dentureType === type.value && styles.typeButtonTextSelected
                    ]}>
                      {type.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Denture Options */}
              <Text style={styles.modalSectionTitle}>Denture Options</Text>
              <View style={styles.optionsGrid}>
                {DENTURE_OPTIONS.map(option => (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.optionButton,
                      currentPlacement.options.includes(option.value) && styles.optionButtonSelected
                    ]}
                    onPress={() => toggleOption(option.value)}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      currentPlacement.options.includes(option.value) && styles.optionButtonTextSelected
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Final Fit Confirmation */}
              <Text style={styles.modalSectionTitle}>Final Fit</Text>
              <Pressable
                style={[
                  styles.fitButton,
                  currentPlacement.finalFitConfirmed && styles.fitButtonConfirmed
                ]}
                onPress={() => setCurrentPlacement(prev => ({ 
                  ...prev, 
                  finalFitConfirmed: !prev.finalFitConfirmed 
                }))}
              >
                <Text style={[
                  styles.fitButtonText,
                  currentPlacement.finalFitConfirmed && styles.fitButtonTextConfirmed
                ]}>
                  {currentPlacement.finalFitConfirmed ? '✅ Final Fit Confirmed' : '⏳ Confirm Final Fit'}
                </Text>
              </Pressable>

              {/* Fit Notes */}
              <Text style={styles.modalSectionTitle}>Fit Notes (Optional)</Text>
              <TextInput
                style={styles.fitNotesInput}
                value={currentPlacement.fitNotes}
                onChangeText={(text) => setCurrentPlacement(prev => ({ ...prev, fitNotes: text }))}
                placeholder="Notes about denture fit, adjustments needed, etc..."
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />

              {/* Modal Actions */}
              <View style={styles.modalActions}>
                <Pressable style={styles.cancelButton} onPress={closePlacementModal}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveButton} onPress={savePlacement}>
                  <Text style={styles.saveButtonText}>
                    {editingIndex !== null ? 'Update' : 'Add'} Placement
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default DentureTreatmentScreen;

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
  placementsSection: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  noPlacementsText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  placementCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  placementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  placementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  placementActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  removeButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  placementOptions: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 8,
  },
  fitStatus: {
    marginBottom: 8,
  },
  fitText: {
    fontSize: 14,
    fontWeight: '500',
  },
  fitConfirmed: {
    color: '#28a745',
  },
  fitPending: {
    color: '#ffc107',
  },
  fitNotes: {
    fontSize: 13,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  addButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  },
  modalScrollContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 16,
    color: '#333',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  typeButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    width: '48%',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  typeButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  typeButtonTextSelected: {
    color: '#fff',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  optionButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    width: '48%',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  optionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  optionButtonTextSelected: {
    color: '#fff',
  },
  optionDescription: {
    fontSize: 10,
    color: '#6c757d',
    textAlign: 'center',
  },
  fitButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#ffc107',
    alignItems: 'center',
    marginBottom: 16,
  },
  fitButtonConfirmed: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  fitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
  },
  fitButtonTextConfirmed: {
    color: '#fff',
  },
  fitNotesInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 60,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});