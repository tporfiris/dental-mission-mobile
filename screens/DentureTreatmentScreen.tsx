// screens/DentureTreatmentScreen.tsx - COMPLETE VERSION with Clear All
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, Modal, Dimensions } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { database } from '../db';
import Treatment from '../db/models/Treatment';
import uuid from 'react-native-uuid';

// Get screen dimensions for responsive scaling
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive scaling functions
const scaleWidth = (size: number) => (SCREEN_WIDTH / 390) * size;
const scaleHeight = (size: number) => (SCREEN_HEIGHT / 844) * size;
const scaleFontSize = (size: number) => Math.round(scaleWidth(size));

// ODA Fee Structure for Dentures
const ODA_FEES = {
  'upper-complete': { code: '73101', price: 1850, description: 'Upper Complete Denture' },
  'lower-complete': { code: '73102', price: 1850, description: 'Lower Complete Denture' },
  'upper-partial': { code: '73201', price: 1450, description: 'Upper Partial Denture' },
  'lower-partial': { code: '73202', price: 1450, description: 'Lower Partial Denture' },
  'upper-immediate': { code: '73301', price: 2050, description: 'Upper Immediate Denture' },
  'lower-immediate': { code: '73302', price: 2050, description: 'Lower Immediate Denture' },
  'upper-soft-reline': { code: '73401', price: 385, description: 'Upper Soft Reline' },
  'lower-soft-reline': { code: '73402', price: 385, description: 'Lower Soft Reline' },
};

type DentureType = keyof typeof ODA_FEES;

interface Placement {
  id: string;
  dentureType: DentureType;
  notes: string;
  addedAt: Date;
}

const DentureTreatmentScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  const { user } = useAuth();

  // Treatment state
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [completedAt, setCompletedAt] = useState<Date | null>(null);

  // Form state
  const [selectedDentureType, setSelectedDentureType] = useState<DentureType>('upper-complete');
  const [placementNotes, setPlacementNotes] = useState('');

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlacement, setEditingPlacement] = useState<Placement | null>(null);

  // Calculate ODA billing codes and total cost
  const billingCalculation = useMemo(() => {
    const billingCodes: Array<{
      code: string;
      price: number;
      description: string;
      dentureType: string;
    }> = [];

    let totalCost = 0;

    placements.forEach(placement => {
      const odaInfo = ODA_FEES[placement.dentureType];
      if (odaInfo) {
        billingCodes.push({
          code: odaInfo.code,
          price: odaInfo.price,
          description: odaInfo.description,
          dentureType: placement.dentureType,
        });
        totalCost += odaInfo.price;
      }
    });

    return { billingCodes, totalCost };
  }, [placements]);

  const { billingCodes, totalCost } = billingCalculation;

  const getDentureTypeLabel = (type: DentureType): string => {
    return ODA_FEES[type].description;
  };

  const handleAddPlacement = () => {
    const newPlacement: Placement = {
      id: uuid.v4() as string,
      dentureType: selectedDentureType,
      notes: placementNotes.trim(),
      addedAt: new Date(),
    };

    setPlacements([...placements, newPlacement]);

    // Reset form
    setSelectedDentureType('upper-complete');
    setPlacementNotes('');

    const odaInfo = ODA_FEES[selectedDentureType];
    Alert.alert(
      'Success',
      `Denture placement recorded successfully\n\n${odaInfo.description}\nODA Code: ${odaInfo.code} - $${odaInfo.price}`
    );
  };

  const handleEditPlacement = (placement: Placement) => {
    setEditingPlacement(placement);
    setModalVisible(true);
  };

  const handleUpdatePlacement = (updatedPlacement: Placement) => {
    setPlacements(placements.map(p => 
      p.id === updatedPlacement.id ? updatedPlacement : p
    ));
    setModalVisible(false);
    setEditingPlacement(null);
  };

  const handleRemovePlacement = (placementId: string) => {
    const placement = placements.find(p => p.id === placementId);
    if (!placement) return;

    Alert.alert(
      'Remove Placement',
      `Remove ${getDentureTypeLabel(placement.dentureType)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => setPlacements(placements.filter(p => p.id !== placementId))
        }
      ]
    );
  };

  const saveTreatmentToDatabase = async () => {
    try {
      const clinicianName = user?.email || 'Unknown Clinician';
      const completedDate = new Date();

      await database.write(async () => {
        for (const placement of placements) {
          const treatmentId = uuid.v4();
          const odaInfo = ODA_FEES[placement.dentureType];

          const notesText = placement.notes
            ? `${odaInfo.description}. ${placement.notes}`
            : odaInfo.description;

          await database.get<Treatment>('treatments').create(treatment => {
            treatment._raw.id = treatmentId;
            treatment.patientId = patientId;
            treatment.type = 'denture';
            treatment.tooth = ''; // Dentures don't apply to specific teeth
            treatment.units = 1;
            treatment.value = odaInfo.price;
            treatment.billingCodes = JSON.stringify([{
              code: odaInfo.code,
              price: odaInfo.price,
              description: odaInfo.description,
              dentureType: placement.dentureType
            }]);
            treatment.notes = notesText;
            treatment.clinicianName = clinicianName;
            treatment.completedAt = completedDate;
          });
        }

        // Save general notes if provided
        if (generalNotes.trim()) {
          const generalNotesId = uuid.v4();
          await database.get<Treatment>('treatments').create(treatment => {
            treatment._raw.id = generalNotesId;
            treatment.patientId = patientId;
            treatment.type = 'denture';
            treatment.tooth = '';
            treatment.units = 0;
            treatment.value = 0;
            treatment.billingCodes = JSON.stringify([]);
            treatment.notes = `General Treatment Notes: ${generalNotes}`;
            treatment.clinicianName = clinicianName;
            treatment.completedAt = completedDate;
          });
        }
      });

      console.log('✅ Denture treatment saved to database:', {
        patientId,
        placementsCount: placements.length,
        dentures: placements.map(p => p.dentureType),
        totalCost: `$${totalCost}`,
        clinician: clinicianName,
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to save denture treatment:', error);
      Alert.alert(
        'Save Error',
        'Failed to save treatment to database. Please try again.',
        [{ text: 'OK' }]
      );
      return false;
    }
  };

  const handleCompleteTreatment = async () => {
    if (placements.length === 0) {
      Alert.alert(
        'No Placements Recorded',
        'Please record at least one denture placement before completing the treatment.',
        [{ text: 'OK' }]
      );
      return;
    }

    const odaCodesText = billingCodes.map(code =>
      `${code.code}: $${code.price} (${code.description})`
    ).join('\n• ');

    Alert.alert(
      'Complete Treatment',
      `Complete denture treatment for this patient?\n\nTreatment Summary:\n• Total Placements: ${placements.length}\n\nODA Billing Codes:\n• ${odaCodesText}\n\nTotal Cost: $${totalCost.toFixed(2)}\n\nThis will save all placements to the database.`,
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
                `✅ Denture treatment completed and saved!\n\nTotal ODA Billing: $${totalCost.toFixed(2)}\n\nTreatment Details:\n• Patient ID: ${patientId}\n• Total Placements: ${placements.length}\n• Billing Codes: ${billingCodes.length}\n• Completed: ${new Date().toLocaleString()}`
              );
            }
          }
        }
      ]
    );
  };

  const handleReset = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to clear all treatment data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            setPlacements([]);
            setGeneralNotes('');
            setCompletedAt(null);
            Alert.alert('Cleared', 'All treatment data has been cleared.');
          }
        }
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
            {completedAt.toLocaleDateString()} at {completedAt.toLocaleTimeString()}
          </Text>
        </View>
      )}

      {/* Add New Placement Form */}
      {!completedAt && (
        <View style={styles.addPlacementSection}>
          <Text style={styles.sectionTitle}>Add Denture Placement</Text>

          <View style={styles.formColumn}>
            <Text style={styles.formLabel}>Denture Type:</Text>
            <View style={styles.dentureTypeSelector}>
              {(Object.keys(ODA_FEES) as DentureType[]).map((type) => {
                const odaInfo = ODA_FEES[type];
                return (
                  <Pressable
                    key={type}
                    style={[
                      styles.dentureTypeButton,
                      selectedDentureType === type && styles.dentureTypeButtonSelected
                    ]}
                    onPress={() => setSelectedDentureType(type)}
                  >
                    <View style={styles.dentureTypeContent}>
                      <Text style={[
                        styles.dentureTypeButtonText,
                        selectedDentureType === type && styles.dentureTypeButtonTextSelected
                      ]}>
                        {odaInfo.description}
                      </Text>
                      <Text style={[
                        styles.dentureTypePrice,
                        selectedDentureType === type && styles.dentureTyriceSelected
                      ]}>
                        ${odaInfo.price}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.odaInfo}>
            <Text style={styles.odaInfoText}>
              💰 ODA Code: {ODA_FEES[selectedDentureType].code} - ${ODA_FEES[selectedDentureType].price}
            </Text>
          </View>

          <View style={styles.formColumn}>
            <Text style={styles.formLabel}>Placement Notes (optional):</Text>
            <TextInput
              style={styles.notesInput}
              value={placementNotes}
              onChangeText={setPlacementNotes}
              placeholder="Details about the denture placement..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <Pressable style={styles.addButton} onPress={handleAddPlacement}>
            <Text style={styles.addButtonText}>➕ Add Placement</Text>
          </Pressable>
        </View>
      )}

      {/* Recorded Placements */}
      <View style={styles.placementsListSection}>
        <Text style={styles.sectionTitle}>
          Recorded Placements ({placements.length})
        </Text>

        {placements.length === 0 ? (
          <Text style={styles.noPlacementsText}>
            No denture placements recorded yet
          </Text>
        ) : (
          placements.map((placement) => {
            const odaInfo = ODA_FEES[placement.dentureType];
            return (
              <View key={placement.id} style={styles.placementCard}>
                <View style={styles.placementHeader}>
                  <Text style={styles.dentureTypeText}>{odaInfo.description}</Text>
                  {!completedAt && (
                    <View style={styles.actionButtons}>
                      <Pressable
                        style={styles.editButton}
                        onPress={() => handleEditPlacement(placement)}
                      >
                        <Text style={styles.editButtonText}>✏️</Text>
                      </Pressable>
                      <Pressable
                        style={styles.deleteButton}
                        onPress={() => handleRemovePlacement(placement.id)}
                      >
                        <Text style={styles.deleteButtonText}>🗑️</Text>
                      </Pressable>
                    </View>
                  )}
                </View>

                <View style={styles.odaRow}>
                  <Text style={styles.odaCode}>ODA: {odaInfo.code}</Text>
                  <Text style={styles.odaPrice}>${odaInfo.price}</Text>
                </View>

                {placement.notes && (
                  <Text style={styles.placementNotes}>
                    Notes: {placement.notes}
                  </Text>
                )}

                <Text style={styles.placementDate}>
                  Added: {placement.addedAt.toLocaleString()}
                </Text>
              </View>
            );
          })
        )}
      </View>

      {/* General Treatment Notes */}
      {!completedAt && (
        <View style={styles.generalNotesSection}>
          <Text style={styles.sectionTitle}>General Treatment Notes</Text>
          <TextInput
            style={styles.generalNotesInput}
            value={generalNotes}
            onChangeText={setGeneralNotes}
            placeholder="Overall observations, follow-up instructions, or additional details..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      )}

      {completedAt && generalNotes && (
        <View style={styles.generalNotesDisplay}>
          <Text style={styles.sectionTitle}>General Treatment Notes</Text>
          <Text style={styles.generalNotesText}>{generalNotes}</Text>
        </View>
      )}

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

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <Pressable
          style={[styles.actionButton, styles.completeButton]}
          onPress={handleCompleteTreatment}
          disabled={completedAt !== null}
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
            Clear All
          </Text>
        </Pressable>
      </View>

      {/* Edit Placement Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Edit Denture Placement
            </Text>

            {editingPlacement && (
              <EditPlacementForm
                placement={editingPlacement}
                onUpdate={handleUpdatePlacement}
                onCancel={() => setModalVisible(false)}
              />
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

// Edit Placement Form Component
const EditPlacementForm = ({ placement, onUpdate, onCancel }: {
  placement: Placement;
  onUpdate: (placement: Placement) => void;
  onCancel: () => void;
}) => {
  const [dentureType, setDentureType] = useState<DentureType>(placement.dentureType);
  const [notes, setNotes] = useState(placement.notes);

  const handleUpdate = () => {
    const updatedPlacement: Placement = {
      ...placement,
      dentureType,
      notes: notes.trim()
    };
    onUpdate(updatedPlacement);
  };

  return (
    <View>
      <View style={styles.formColumn}>
        <Text style={styles.formLabel}>Denture Type:</Text>
        <View style={styles.dentureTypeSelector}>
          {(Object.keys(ODA_FEES) as DentureType[]).map((type) => {
            const odaInfo = ODA_FEES[type];
            return (
              <Pressable
                key={type}
                style={[
                  styles.dentureTypeButton,
                  dentureType === type && styles.dentureTypeButtonSelected
                ]}
                onPress={() => setDentureType(type)}
              >
                <View style={styles.dentureTypeContent}>
                  <Text style={[
                    styles.dentureTypeButtonText,
                    dentureType === type && styles.dentureTypeButtonTextSelected
                  ]}>
                    {odaInfo.description}
                  </Text>
                  <Text style={[
                    styles.dentureTypePrice,
                    dentureType === type && styles.dentureTypePriceSelected
                  ]}>
                    ${odaInfo.price}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.odaInfo}>
        <Text style={styles.odaInfoText}>
          💰 ODA Code: {ODA_FEES[dentureType].code} - ${ODA_FEES[dentureType].price}
        </Text>
      </View>

      <View style={styles.formColumn}>
        <Text style={styles.formLabel}>Notes:</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Details about the denture placement..."
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.modalActions}>
        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.updateButton} onPress={handleUpdate}>
          <Text style={styles.updateButtonText}>Update</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default DentureTreatmentScreen;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: scaleWidth(20),
  },
  header: {
    fontSize: scaleFontSize(24),
    fontWeight: 'bold',
    marginBottom: scaleHeight(8),
    color: '#333',
    textAlign: 'center',
  },
  subtext: {
    fontSize: scaleFontSize(14),
    color: '#666',
    marginBottom: scaleHeight(20),
    textAlign: 'center',
  },
  completedBanner: {
    backgroundColor: '#d4edda',
    borderRadius: scaleWidth(8),
    padding: scaleWidth(12),
    marginBottom: scaleHeight(20),
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  completedText: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: '#155724',
  },
  completedDate: {
    fontSize: scaleFontSize(14),
    color: '#155724',
    marginTop: scaleHeight(4),
  },
  addPlacementSection: {
    backgroundColor: '#e7f3ff',
    borderRadius: scaleWidth(12),
    padding: scaleWidth(20),
    marginBottom: scaleHeight(20),
    borderWidth: 1,
    borderColor: '#b3d9ff',
  },
  sectionTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '600',
    marginBottom: scaleHeight(16),
    color: '#333',
  },
  formColumn: {
    marginBottom: scaleHeight(16),
  },
  formLabel: {
    fontSize: scaleFontSize(14),
    fontWeight: '500',
    color: '#495057',
    marginBottom: scaleHeight(8),
  },
  dentureTypeSelector: {
    gap: scaleHeight(8),
  },
  dentureTypeButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: scaleWidth(8),
    padding: scaleWidth(12),
  },
  dentureTypeButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  dentureTypeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dentureTypeButtonText: {
    fontSize: scaleFontSize(14),
    fontWeight: '500',
    color: '#495057',
  },
  dentureTypeButtonTextSelected: {
    color: '#fff',
  },
  dentureTypePrice: {
    fontSize: scaleFontSize(14),
    fontWeight: 'bold',
    color: '#28a745',
  },
  dentureTypePriceSelected: {
    color: '#fff',
  },
  odaInfo: {
    backgroundColor: '#fff3cd',
    borderRadius: scaleWidth(6),
    padding: scaleWidth(8),
    marginBottom: scaleHeight(16),
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
  },
  odaInfoText: {
    fontSize: scaleFontSize(12),
    color: '#856404',
    fontWeight: '600',
    textAlign: 'center',
  },
  notesInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: scaleWidth(8),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(10),
    fontSize: scaleFontSize(14),
    minHeight: scaleHeight(80),
  },
  addButton: {
    backgroundColor: '#28a745',
    borderRadius: scaleWidth(8),
    paddingVertical: scaleHeight(14),
    paddingHorizontal: scaleWidth(20),
    alignItems: 'center',
    marginTop: scaleHeight(8),
  },
  addButtonText: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: '#fff',
  },
  placementsListSection: {
    backgroundColor: '#fff',
    borderRadius: scaleWidth(12),
    padding: scaleWidth(20),
    marginBottom: scaleHeight(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noPlacementsText: {
    fontSize: scaleFontSize(14),
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: scaleWidth(20),
  },
  placementCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: scaleWidth(8),
    padding: scaleWidth(16),
    marginBottom: scaleHeight(12),
    borderLeftWidth: 4,
    borderLeftColor: '#6f42c1',
  },
  placementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleHeight(8),
  },
  dentureTypeText: {
    fontSize: scaleFontSize(16),
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: scaleWidth(4),
  },
  editButton: {
    backgroundColor: '#fff',
    borderRadius: scaleWidth(6),
    paddingHorizontal: scaleWidth(8),
    paddingVertical: scaleHeight(4),
    borderWidth: 1,
    borderColor: '#007bff',
  },
  editButtonText: {
    fontSize: scaleFontSize(14),
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderRadius: scaleWidth(6),
    paddingHorizontal: scaleWidth(8),
    paddingVertical: scaleHeight(4),
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  deleteButtonText: {
    fontSize: scaleFontSize(14),
  },
  odaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleHeight(8),
    paddingTop: scaleHeight(8),
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  odaCode: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: '#007bff',
  },
  odaPrice: {
    fontSize: scaleFontSize(14),
    fontWeight: 'bold',
    color: '#28a745',
  },
  placementNotes: {
    fontSize: scaleFontSize(14),
    color: '#495057',
    fontStyle: 'italic',
    marginBottom: scaleHeight(4),
  },
  placementDate: {
    fontSize: scaleFontSize(12),
    color: '#6c757d',
  },
  generalNotesSection: {
    backgroundColor: '#fff',
    borderRadius: scaleWidth(12),
    padding: scaleWidth(20),
    marginBottom: scaleHeight(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  generalNotesInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: scaleWidth(8),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(10),
    fontSize: scaleFontSize(14),
    minHeight: scaleHeight(100),
  },
  generalNotesDisplay: {
    backgroundColor: '#fff',
    borderRadius: scaleWidth(12),
    padding: scaleWidth(20),
    marginBottom: scaleHeight(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  generalNotesText: {
    fontSize: scaleFontSize(14),
    color: '#495057',
    lineHeight: scaleFontSize(20),
  },
  billingSection: {
    backgroundColor: '#fff',
    borderRadius: scaleWidth(12),
    padding: scaleWidth(20),
    marginBottom: scaleHeight(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  billingCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: scaleWidth(8),
    padding: scaleWidth(12),
    marginBottom: scaleHeight(8),
    borderLeftWidth: 4,
    borderLeftColor: '#6f42c1',
  },
  billingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleHeight(4),
  },
  billingCode: {
    fontSize: scaleFontSize(16),
    fontWeight: 'bold',
    color: '#6f42c1',
  },
  billingPrice: {
    fontSize: scaleFontSize(16),
    fontWeight: 'bold',
    color: '#28a745',
  },
  billingDescription: {
    fontSize: scaleFontSize(14),
    color: '#495057',
  },
  totalSection: {
    borderTopWidth: 2,
    borderTopColor: '#e9ecef',
    paddingTop: scaleHeight(12),
    marginTop: scaleHeight(8),
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: scaleFontSize(18),
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: scaleFontSize(20),
    fontWeight: 'bold',
    color: '#28a745',
  },
  actionSection: {
    gap: scaleHeight(12),
    marginBottom: scaleHeight(20),
  },
  actionButton: {
    borderRadius: scaleWidth(8),
    paddingVertical: scaleHeight(14),
    paddingHorizontal: scaleWidth(20),
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
    fontSize: scaleFontSize(16),
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
    borderRadius: scaleWidth(16),
    padding: scaleWidth(24),
    width: '90%',
    maxWidth: scaleWidth(400),
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: scaleHeight(20),
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: scaleWidth(12),
    marginTop: scaleHeight(16),
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    borderRadius: scaleWidth(8),
    paddingVertical: scaleHeight(12),
    paddingHorizontal: scaleWidth(24),
  },
  cancelButtonText: {
    color: 'white',
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    textAlign: 'center',
  },
  updateButton: {
    flex: 1,
    backgroundColor: '#007bff',
    borderRadius: scaleWidth(8),
    paddingVertical: scaleHeight(12),
    paddingHorizontal: scaleWidth(24),
  },
  updateButtonText: {
    color: 'white',
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    textAlign: 'center',
  },
});