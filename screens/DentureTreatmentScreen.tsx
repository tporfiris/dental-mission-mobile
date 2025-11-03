import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useDentureTreatment } from '../contexts/DentureTreatmentContext';
import { useAuth } from '../contexts/AuthContext';
import { database } from '../db';
import Treatment from '../db/models/Treatment';
import uuid from 'react-native-uuid';

const DENTURE_TYPES = [
  'Upper partial acrylic denture',
  'Upper partial cast denture',
  'Lower partial acrylic denture',
  'Lower partial cast denture',
  'Upper complete denture',
  'Lower complete denture'
];

// ODA Fee Structure for Denture Treatments
const ODA_FEES = {
  'Upper partial acrylic denture': { code: '52301', price: 794 },
  'Upper partial cast denture': { code: '53201', price: 1351 },
  'Lower partial acrylic denture': { code: '52302', price: 794 },
  'Lower partial cast denture': { code: '53202', price: 1351 },
  'Upper complete denture': { code: '51101', price: 1142 },
  'Lower complete denture': { code: '51102', price: 1454 },
};

interface DenturePlacement {
  id: string;
  placement: string; // e.g., "maxillary partial acrylic denture placed"
  type: string;
}

const DentureTreatmentScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  const { user } = useAuth();
  
  const [placements, setPlacements] = useState<DenturePlacement[]>([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [completedAt, setCompletedAt] = useState<Date | null>(null);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentPlacement, setCurrentPlacement] = useState('');
  const [selectedDentureType, setSelectedDentureType] = useState('');

  // Calculate ODA codes and total cost
  const calculateODABilling = useMemo(() => {
    const billingCodes: Array<{
      code: string;
      description: string;
      price: number;
      category: string;
      placement: DenturePlacement;
    }> = [];

    let totalCost = 0;

    placements.forEach(placement => {
      const odaInfo = ODA_FEES[placement.type as keyof typeof ODA_FEES];
      if (odaInfo) {
        billingCodes.push({
          code: odaInfo.code,
          description: placement.type,
          price: odaInfo.price,
          category: 'Prosthodontics',
          placement
        });
        totalCost += odaInfo.price;
      }
    });

    return { billingCodes, totalCost };
  }, [placements]);

  const { billingCodes, totalCost } = calculateODABilling;

  const openPlacementModal = (index: number | null = null) => {
    if (index !== null) {
      setEditingIndex(index);
      const placement = placements[index];
      setCurrentPlacement(placement.placement);
      setSelectedDentureType(placement.type);
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
      id: uuid.v4() as string,
      placement: currentPlacement.trim(),
      type: selectedDentureType
    };

    if (editingIndex !== null) {
      const updatedPlacements = [...placements];
      updatedPlacements[editingIndex] = newPlacement;
      setPlacements(updatedPlacements);
    } else {
      setPlacements(prev => [...prev, newPlacement]);
    }
    
    closePlacementModal();
  };

  const removePlacement = (index: number) => {
    Alert.alert(
      'Remove Placement',
      'Are you sure you want to remove this denture placement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedPlacements = placements.filter((_, i) => i !== index);
            setPlacements(updatedPlacements);
          }
        }
      ]
    );
  };
  
  // ✅ OPTIMIZED: Single treatment record with all dentures grouped
  const saveTreatmentToDatabase = async () => {
    try {
      const treatmentId = uuid.v4();
      const completedDate = new Date();
      const clinicianName = user?.email || 'Unknown Clinician';

      // ✅ OPTIMIZATION: Create compact treatment data structure
      const treatmentData = {
        placements: placements.map(p => ({
          type: p.type,
          description: p.placement
        })),
        codes: billingCodes.map(c => ({
          code: c.code,
          price: c.price
        }))
      };

      // ✅ OPTIMIZATION: Combine all denture notes efficiently
      const placementDescriptions = placements.map(p => p.placement).join('; ');
      const combinedNotes = generalNotes 
        ? `${placementDescriptions}. ${generalNotes}` 
        : placementDescriptions;

      await database.write(async () => {
        await database.get<Treatment>('treatments').create(treatment => {
          treatment._raw.id = treatmentId;
          treatment.patientId = patientId;
          // ✅ OPTIMIZATION: Omit empty fields
          // treatment.visitId = ''; // ❌ Don't save empty strings
          treatment.type = 'denture';
          // treatment.tooth = 'N/A'; // ❌ Don't save placeholders
          // treatment.surface = 'N/A'; // ❌ Don't save placeholders
          treatment.units = placements.length; // ✅ Number of dentures placed
          treatment.value = totalCost; // ✅ Total cost
          treatment.billingCodes = JSON.stringify(billingCodes);
          treatment.notes = combinedNotes; // ✅ Clean notes without duplication
          treatment.clinicianName = clinicianName;
          treatment.completedAt = completedDate;
        });
      });

      console.log('✅ Denture treatment saved to database:', {
        treatmentId,
        patientId,
        placementsCount: placements.length,
        codesGenerated: billingCodes.length,
        odaCodes: billingCodes.map(code => `${code.code}: $${code.price}`),
        totalCost: `$${totalCost}`,
        completedAt: completedDate.toISOString()
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to save denture treatment:', error);
      Alert.alert('Save Error', 'Failed to save treatment to database. Please try again.');
      return false;
    }
  };

  const handleCompleteTreatment = async () => {
    if (placements.length === 0) {
      Alert.alert('No Dentures Placed', 'Please add at least one denture placement before completing treatment.');
      return;
    }

    const odaCodesText = billingCodes.map(code => `${code.code}: ${code.description} - $${code.price}`).join('\n• ');

    Alert.alert(
      'Complete Treatment',
      `Complete denture placement for this patient?\n\nTreatment Summary:\n• Dentures Placed: ${placements.length}\n• Billing Codes: ${billingCodes.length}\n\nODA Billing Codes:\n• ${odaCodesText}\n\nTotal Cost: $${totalCost.toFixed(2)}\n\nThis will save the treatment to the database.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete & Save',
          onPress: async () => {
            const saved = await saveTreatmentToDatabase();
            if (saved) {
              setCompletedAt(new Date());
              Alert.alert(
                'Success', 
                `✅ Denture treatment completed and saved to database!\n\nTotal ODA Billing: $${totalCost.toFixed(2)}`
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
        { 
          text: 'Reset', 
          style: 'destructive', 
          onPress: () => {
            setPlacements([]);
            setGeneralNotes('');
            setCompletedAt(null);
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>🦷 Denture Treatment</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

      {/* Treatment Summary Indicator */}
      {placements.length > 0 && !completedAt && (
        <View style={styles.summaryIndicator}>
          <Text style={styles.summaryIndicatorText}>
            ✅ {placements.length} denture{placements.length > 1 ? 's' : ''} recorded • Total: ${totalCost.toFixed(2)}
          </Text>
        </View>
      )}

      {completedAt && (
        <View style={styles.completedBanner}>
          <Text style={styles.completedText}>✅ Treatment Completed</Text>
          <Text style={styles.completedDate}>
            {completedAt.toLocaleDateString()} at {completedAt.toLocaleTimeString()}
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
          placements.map((placement, index) => {
            const odaInfo = ODA_FEES[placement.type as keyof typeof ODA_FEES];
            return (
              <View key={placement.id} style={styles.placementCard}>
                <View style={styles.placementHeader}>
                  <View style={styles.placementInfo}>
                    <Text style={styles.placementText}>{placement.placement}</Text>
                    <Text style={styles.dentureType}>{placement.type}</Text>
                    {odaInfo && (
                      <Text style={styles.odaInfo}>
                        💰 ODA Code: {odaInfo.code} - ${odaInfo.price}
                      </Text>
                    )}
                  </View>
                  <View style={styles.placementActions}>
                    <Pressable onPress={() => openPlacementModal(index)} style={styles.editButton}>
                      <Text style={styles.editButtonText}>Edit</Text>
                    </Pressable>
                    <Pressable onPress={() => removePlacement(index)} style={styles.removeButton}>
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })
        )}

        <Pressable style={styles.addButton} onPress={() => openPlacementModal()}>
          <Text style={styles.addButtonText}>+ Add Denture Placement</Text>
        </Pressable>
      </View>

      {/* ODA Billing Summary */}
      {billingCodes.length > 0 && (
        <View style={styles.billingSection}>
          <Text style={styles.sectionTitle}>ODA Billing Summary</Text>
          
          {billingCodes.map((code, index) => (
            <View key={index} style={styles.billingCard}>
              <View style={styles.billingHeader}>
                <Text style={styles.billingCode}>{code.code}</Text>
                <Text style={styles.billingPrice}>${code.price}</Text>
              </View>
              <Text style={styles.billingDescription}>{code.description}</Text>
            </View>
          ))}
          
          <View style={styles.totalSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total ODA Billing:</Text>
              <Text style={styles.totalAmount}>${totalCost.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* General Notes */}
      <View style={styles.notesSection}>
        <Text style={styles.sectionTitle}>Treatment Notes</Text>
        <TextInput
          style={styles.notesInput}
          value={generalNotes}
          onChangeText={setGeneralNotes}
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
              {DENTURE_TYPES.map((type, index) => {
                const odaInfo = ODA_FEES[type as keyof typeof ODA_FEES];
                return (
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
                    {odaInfo && (
                      <Text style={[
                        styles.typeButtonODA,
                        selectedDentureType === type && styles.typeButtonODASelected
                      ]}>
                        {odaInfo.code} - ${odaInfo.price}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
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

            {/* Selected Type Summary */}
            {selectedDentureType && (
              <View style={styles.selectionSummary}>
                <Text style={styles.selectionSummaryTitle}>Selected:</Text>
                <Text style={styles.selectionSummaryText}>{selectedDentureType}</Text>
                {ODA_FEES[selectedDentureType as keyof typeof ODA_FEES] && (
                  <Text style={styles.selectionSummaryODA}>
                    ODA Code: {ODA_FEES[selectedDentureType as keyof typeof ODA_FEES].code} - ${ODA_FEES[selectedDentureType as keyof typeof ODA_FEES].price}
                  </Text>
                )}
              </View>
            )}

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
  summaryIndicator: {
    backgroundColor: '#d4edda',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  summaryIndicatorText: {
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
  dentureType: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '500',
    marginBottom: 4,
  },
  odaInfo: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '600',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
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
  billingCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  billingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  billingCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
  },
  billingPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  billingDescription: {
    fontSize: 14,
    color: '#495057',
  },
  totalSection: {
    borderTopWidth: 2,
    borderTopColor: '#e9ecef',
    paddingTop: 12,
    marginTop: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#28a745',
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
    maxHeight: 300,
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
    marginBottom: 4,
  },
  typeButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  typeButtonODA: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    fontWeight: '500',
  },
  typeButtonODASelected: {
    color: '#e3f2fd',
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
    marginBottom: 16,
  },
  selectionSummary: {
    backgroundColor: '#e7f3ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  selectionSummaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007bff',
    marginBottom: 4,
  },
  selectionSummaryText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
  },
  selectionSummaryODA: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '600',
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