import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useDentureTreatment, DenturePlacement } from '../contexts/DentureTreatmentContext';
import { useAuth } from '../contexts/AuthContext';
import { database } from '../db';
import Treatment from '../db/models/Treatment';
import uuid from 'react-native-uuid';

const DENTURE_TYPES = [
  'Upper partial acrylic denture',
  'Upper partial cast denture',
  'Lower partial acrylic denture',
  'Lower partial cast denture',
  'Upper immediate complete denture',
  'Upper complete denture',
  'Lower immediate complete denture',
  'Lower complete denture'
];

const DentureTreatmentScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  const { user } = useAuth();
  
  // Use context for persistent state
  const {
    treatmentState,
    addDenturePlacement,
    updateDenturePlacement,
    removeDenturePlacement,
    updateGeneralNotes,
    markCompleted,
    resetTreatment,
  } = useDentureTreatment();

  const { placements, generalNotes, completedAt } = treatmentState;

  // Modal state (local, doesn't need to persist)
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentPlacement, setCurrentPlacement] = useState('');
  const [selectedDentureType, setSelectedDentureType] = useState('');

  // Generate billing codes based on denture placements
  const billingCodes = useMemo(() => {
    const codes: Array<{
      code: string;
      description: string;
      category: string;
      placement: any;
    }> = [];

    placements.forEach(placement => {
      let code = '';
      let description = '';

      // Map denture types to billing codes based on the placement's fitNotes field
      const placementText = placement.fitNotes || '';
      
      if (placementText.includes('Upper partial')) {
        code = 'D5213';
        description = 'Upper partial denture - cast metal framework';
      } else if (placementText.includes('Lower partial')) {
        code = 'D5214';
        description = 'Lower partial denture - cast metal framework';
      } else if (placementText.includes('Upper immediate')) {
        code = 'D5130';
        description = 'Immediate denture - upper';
      } else if (placementText.includes('Upper complete')) {
        code = 'D5110';
        description = 'Complete upper denture';
      } else if (placementText.includes('Lower immediate')) {
        code = 'D5131';
        description = 'Immediate denture - lower';
      } else if (placementText.includes('Lower complete')) {
        code = 'D5120';
        description = 'Complete lower denture';
      } else {
        code = 'D5999';
        description = 'Unspecified denture procedure';
      }

      codes.push({
        code,
        description,
        category: 'Prosthodontics',
        placement
      });
    });

    return codes;
  }, [placements]);

  const openPlacementModal = (index: number | null = null) => {
    if (index !== null) {
      setEditingIndex(index);
      const placement = placements[index];
      setCurrentPlacement(placement.fitNotes);
      setSelectedDentureType(placement.fitNotes); // Use fitNotes as the type identifier
    } else {
      setEditingIndex(null);
      setCurrentPlacement('');
      setSelectedDentureType('');
    }
    setModalVisible(true);
  };

  const closePlacementModal = () => {
    setModalVisible(false);
    setEditingIndex(null);
    setCurrentPlacement('');
    setSelectedDentureType('');
  };

  const savePlacement = () => {
    if (!selectedDentureType) {
      Alert.alert('Error', 'Please select a denture type.');
      return;
    }

    if (!currentPlacement.trim()) {
      Alert.alert('Error', 'Please enter the placement description.');
      return;
    }

    const newPlacement: DenturePlacement = {
      dentureType: 'upper-full', // Default value, we'll use fitNotes for the actual type
      options: [],
      finalFitConfirmed: false,
      fitNotes: currentPlacement.trim(),
    };

    if (editingIndex !== null) {
      updateDenturePlacement(editingIndex, newPlacement);
    } else {
      addDenturePlacement(newPlacement);
    }
    
    closePlacementModal();
  };

  const handleRemovePlacement = (index: number) => {
    Alert.alert(
      'Remove Placement',
      'Are you sure you want to remove this denture placement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removePlacementModal(index)
        }
      ]
    );
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
            treatment.notes = `${code.placement.fitNotes}. ${generalNotes}`;
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

    Alert.alert(
      'Complete Treatment',
      `Complete denture placement for this patient?\n\nTreatment Summary:\n• Dentures Placed: ${placements.length}\n• Billing Codes: ${billingCodes.length}\n\nThis will save the treatment to the database.`,
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
        { 
          text: 'Reset', 
          style: 'destructive', 
          onPress: resetTreatment
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>🦷 Denture Treatment</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

      {/* State persistence indicator */}
      {(placements.length > 0 || generalNotes.trim()) && (
        <View style={styles.persistenceIndicator}>
          <Text style={styles.persistenceText}>
            ✅ Progress saved: {placements.length} placements • Notes: {generalNotes ? 'Yes' : 'No'}
          </Text>
        </View>
      )}

      {completedAt && (
        <View style={styles.completedBanner}>
          <Text style={styles.completedText}>✅ Treatment Completed</Text>
          <Text style={styles.completedDate}>
            {new Date(completedAt).toLocaleDateString()} at {new Date(completedAt).toLocaleTimeString()}
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
                <View style={styles.placementInfo}>
                  <Text style={styles.placementText}>{placement.fitNotes}</Text>
                </View>
                <View style={styles.placementActions}>
                  <Pressable onPress={() => openPlacementModal(index)} style={styles.editButton}>
                    <Text style={styles.editButtonText}>Edit</Text>
                  </Pressable>
                  <Pressable onPress={() => handleRemovePlacement(index)} style={styles.removeButton}>
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingIndex !== null ? 'Edit' : 'Add'} Denture Placement
            </Text>

            {/* Denture Type Selection */}
            <Text style={styles.modalSectionTitle}>Select Denture Type</Text>
            <ScrollView style={styles.typeList} showsVerticalScrollIndicator={false}>
              {DENTURE_TYPES.map((type, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.typeButton,
                    selectedDentureType === type && styles.typeButtonSelected
                  ]}
                  onPress={() => setSelectedDentureType(type)}
                >
                  <Text style={[
                    styles.typeButtonText,
                    selectedDentureType === type && styles.typeButtonTextSelected
                  ]}>
                    {type}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Placement Description */}
            <Text style={styles.modalSectionTitle}>Placement Description</Text>
            <TextInput
              style={styles.placementInput}
              value={currentPlacement}
              onChangeText={setCurrentPlacement}
              placeholder={selectedDentureType ? `${selectedDentureType.toLowerCase()} placed` : "e.g., maxillary partial acrylic denture placed"}
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
  persistenceIndicator: {
    backgroundColor: '#d4edda',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  persistenceText: {
    fontSize: 12,
    color: '#155724',
    fontWeight: '600',
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
    alignItems: 'flex-start',
  },
  placementInfo: {
    flex: 1,
    marginRight: 12,
  },
  placementText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
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
  typeList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  typeButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  typeButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  typeButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  placementInput: {
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