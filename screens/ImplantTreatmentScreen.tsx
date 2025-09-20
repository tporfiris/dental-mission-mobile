import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useImplantTreatment } from '../contexts/ImplantTreatmentContext';
import { useAuth } from '../contexts/AuthContext';
import { database } from '../db';
import Treatment from '../db/models/Treatment';
import uuid from 'react-native-uuid';
import type { TreatmentType, ImplantRecord } from '../contexts/ImplantTreatmentContext';

const ImplantTreatmentScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  const { user } = useAuth();
  
  const {
    treatmentState,
    updateImplantRecords,
    updateGeneralNotes,
    updateModalState,
    setTreatmentCompleted,
    resetTreatment
  } = useImplantTreatment();

  const {
    implantRecords,
    generalNotes,
    treatmentCompleted,
    completedAt,
    modalVisible,
    selectedType,
    toothNumber,
    implantLocations,
    ponticLocations,
    notes,
    editingId
  } = treatmentState;

  const openNewImplantModal = () => {
    updateModalState({
      editingId: null,
      selectedType: 'single-implant',
      toothNumber: '',
      implantLocations: '',
      ponticLocations: '',
      notes: '',
      modalVisible: true
    });
  };

  const openEditImplantModal = (record: ImplantRecord) => {
    updateModalState({
      editingId: record.id,
      selectedType: record.type,
      toothNumber: record.toothNumber || '',
      implantLocations: record.implantLocations || '',
      ponticLocations: record.ponticLocations || '',
      notes: record.notes,
      modalVisible: true
    });
  };

  const handleSaveImplant = () => {
    // Validation
    if (selectedType === 'single-implant' && !toothNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter the tooth number for the single implant.');
      return;
    }
    
    if (selectedType === 'implant-bridge') {
      if (!implantLocations.trim()) {
        Alert.alert('Validation Error', 'Please enter the implant locations for the bridge.');
        return;
      }
      if (!ponticLocations.trim()) {
        Alert.alert('Validation Error', 'Please enter the pontic locations for the bridge.');
        return;
      }
    }

    const recordData: ImplantRecord = {
      id: editingId || uuid.v4() as string,
      type: selectedType,
      toothNumber: selectedType === 'single-implant' ? toothNumber.trim() : undefined,
      implantLocations: selectedType === 'implant-bridge' ? implantLocations.trim() : undefined,
      ponticLocations: selectedType === 'implant-bridge' ? ponticLocations.trim() : undefined,
      notes: notes.trim(),
      placedAt: new Date(),
    };

    let updatedRecords: ImplantRecord[];
    if (editingId) {
      // Update existing record
      updatedRecords = implantRecords.map(record => 
        record.id === editingId ? recordData : record
      );
    } else {
      // Add new record
      updatedRecords = [...implantRecords, recordData];
    }

    updateImplantRecords(updatedRecords);
    updateModalState({ modalVisible: false });
  };

  const removeImplantRecord = (id: string) => {
    Alert.alert(
      'Remove Record',
      'Are you sure you want to remove this implant record?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            const updatedRecords = implantRecords.filter(record => record.id !== id);
            updateImplantRecords(updatedRecords);
          }
        }
      ]
    );
  };

  const saveTreatmentToDatabase = async () => {
    try {
      const completedDate = new Date();
      const clinicianName = user?.email || 'Unknown Clinician';

      await database.write(async () => {
        for (const record of implantRecords) {
          const treatmentId = uuid.v4();
          
          await database.get<Treatment>('treatments').create(treatment => {
            treatment._raw.id = treatmentId;
            treatment.patientId = patientId;
            treatment.visitId = '';
            treatment.type = 'implant';
            
            if (record.type === 'single-implant') {
              treatment.tooth = record.toothNumber || '';
              treatment.notes = `Single implant placed at tooth ${record.toothNumber}. ${record.notes}`;
            } else {
              treatment.tooth = record.implantLocations || '';
              treatment.notes = `Implant-supported bridge: Implants placed at ${record.implantLocations}, pontic(s) at ${record.ponticLocations}. ${record.notes}`;
            }
            
            treatment.surface = 'N/A';
            treatment.units = 1;
            treatment.value = 0;
            treatment.billingCodes = JSON.stringify([]);
            treatment.clinicianName = clinicianName;
            treatment.completedAt = completedDate;
          });
        }
      });

      console.log('✅ Implant treatment saved to database:', {
        patientId,
        totalRecords: implantRecords.length,
        clinician: clinicianName,
        completedAt: completedDate.toISOString()
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to save implant treatment:', error);
      Alert.alert(
        'Save Error', 
        'Failed to save treatment to database. Please try again.',
        [{ text: 'OK' }]
      );
      return false;
    }
  };

  const handleCompleteTreatment = async () => {
    if ((implantRecords || []).length === 0) {
      Alert.alert(
        'No Records',
        'Please add at least one implant record before completing the treatment.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Complete Treatment',
      `Complete implant treatment for this patient?\n\nTreatment Summary:\n• Records: ${(implantRecords || []).length}\n\nThis will save the treatment to the database.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Complete & Save', 
          onPress: async () => {
            const saved = await saveTreatmentToDatabase();
            
            if (saved) {
              setTreatmentCompleted(true, new Date());
              Alert.alert(
                'Success', 
                '✅ Implant treatment completed and saved to database!'
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
            resetTreatment();
          }
        }
      ]
    );
  };

  const formatRecordTitle = (record: ImplantRecord) => {
    if (record.type === 'single-implant') {
      return `Single Implant - Tooth ${record.toothNumber}`;
    } else {
      return `Implant Bridge - Implants: ${record.implantLocations}, Pontics: ${record.ponticLocations}`;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>🦷 Implant Treatment</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

      {/* State Preservation Indicator */}
      {(implantRecords.length > 0 || generalNotes.trim() !== '') && !treatmentCompleted && (
        <View style={styles.stateIndicator}>
          <Text style={styles.stateIndicatorText}>
            ✅ State preserved: {implantRecords.length} records, {generalNotes.trim() ? 'notes saved' : 'no notes'}
          </Text>
        </View>
      )}

      {treatmentCompleted && completedAt && (
        <View style={styles.completedBanner}>
          <Text style={styles.completedText}>✅ Treatment Completed</Text>
          <Text style={styles.completedDate}>
            {completedAt.toLocaleDateString()} at {completedAt.toLocaleTimeString()}
          </Text>
        </View>
      )}

      {/* Implant Records Section */}
      <View style={styles.recordsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Implant Records ({implantRecords.length})</Text>
          <Pressable style={styles.addButton} onPress={openNewImplantModal}>
            <Text style={styles.addButtonText}>+ Add Record</Text>
          </Pressable>
        </View>

        {implantRecords.length === 0 ? (
          <Text style={styles.noRecordsText}>
            No implant records yet. Tap "Add Record" to record implant placement.
          </Text>
        ) : (
          implantRecords.map((record) => (
            <View key={record.id} style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <Text style={styles.recordTitle}>
                  {formatRecordTitle(record)}
                </Text>
                <View style={styles.recordActions}>
                  <Pressable 
                    style={styles.editButton} 
                    onPress={() => openEditImplantModal(record)}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </Pressable>
                  <Pressable 
                    style={styles.deleteButton} 
                    onPress={() => removeImplantRecord(record.id)}
                  >
                    <Text style={styles.deleteButtonText}>×</Text>
                  </Pressable>
                </View>
              </View>
              
              {record.notes && (
                <Text style={styles.recordNotesText}>Notes: {record.notes}</Text>
              )}
              
              <Text style={styles.placedAtText}>
                Recorded: {record.placedAt.toLocaleString()}
              </Text>
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
          placeholder="General notes about the implant treatment session..."
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Treatment Summary */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Treatment Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Records:</Text>
            <Text style={styles.summaryValue}>{implantRecords.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Single Implants:</Text>
            <Text style={styles.summaryValue}>
              {implantRecords.filter(r => r.type === 'single-implant').length}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Implant Bridges:</Text>
            <Text style={styles.summaryValue}>
              {implantRecords.filter(r => r.type === 'implant-bridge').length}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <Pressable 
          style={[styles.actionButton, styles.completeButton]} 
          onPress={handleCompleteTreatment}
        >
          <Text style={styles.actionButtonText}>
            {treatmentCompleted ? '✅ Treatment Completed' : '🏁 Complete Treatment'}
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

      {/* Add/Edit Record Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => updateModalState({ modalVisible: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingId ? 'Edit Record' : 'Add Implant Record'}
            </Text>

            {/* Treatment Type Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Treatment Type</Text>
              <View style={styles.typeButtons}>
                <Pressable
                  style={[
                    styles.typeButton,
                    selectedType === 'single-implant' && styles.typeButtonSelected
                  ]}
                  onPress={() => updateModalState({ selectedType: 'single-implant' })}
                >
                  <Text style={[
                    styles.typeButtonText,
                    selectedType === 'single-implant' && styles.typeButtonTextSelected
                  ]}>
                    Single Implant
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.typeButton,
                    selectedType === 'implant-bridge' && styles.typeButtonSelected
                  ]}
                  onPress={() => updateModalState({ selectedType: 'implant-bridge' })}
                >
                  <Text style={[
                    styles.typeButtonText,
                    selectedType === 'implant-bridge' && styles.typeButtonTextSelected
                  ]}>
                    Implant Bridge
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Conditional Inputs Based on Type */}
            {selectedType === 'single-implant' ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tooth Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={toothNumber}
                  onChangeText={(text) => updateModalState({ toothNumber: text })}
                  placeholder="e.g., 11, 24, 36"
                  autoCapitalize="none"
                />
              </View>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Implant Locations</Text>
                  <TextInput
                    style={styles.textInput}
                    value={implantLocations}
                    onChangeText={(text) => updateModalState({ implantLocations: text })}
                    placeholder="e.g., 24, 26"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Pontic Locations</Text>
                  <TextInput
                    style={styles.textInput}
                    value={ponticLocations}
                    onChangeText={(text) => updateModalState({ ponticLocations: text })}
                    placeholder="e.g., 25"
                    autoCapitalize="none"
                  />
                </View>
              </>
            )}

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {selectedType === 'single-implant' 
                  ? 'Notes (Brand, placement details, etc.)' 
                  : 'Notes (Details about the bridge)'}
              </Text>
              <TextInput
                style={styles.modalNotesInput}
                value={notes}
                onChangeText={(text) => updateModalState({ notes: text })}
                placeholder={
                  selectedType === 'single-implant'
                    ? "e.g., Nobel Biocare 4.3x10mm, torque 35Ncm, primary stability excellent..."
                    : "e.g., 3-unit bridge, temporary placed, healing abutments..."
                }
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <Pressable 
                style={styles.modalCancelButton} 
                onPress={() => updateModalState({ modalVisible: false })}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={styles.modalSaveButton} 
                onPress={handleSaveImplant}
              >
                <Text style={styles.modalSaveButtonText}>
                  {editingId ? 'Update' : 'Add'} Record
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default ImplantTreatmentScreen;

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
  stateIndicator: {
    backgroundColor: '#d1ecf1',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0c5460',
  },
  stateIndicatorText: {
    fontSize: 12,
    color: '#0c5460',
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
  recordsSection: {
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  noRecordsText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  recordCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  recordActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  recordNotesText: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  placedAtText: {
    fontSize: 12,
    color: '#6c757d',
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
  summarySection: {
    backgroundColor: '#e7f3ff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#b3d9ff',
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#495057',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  typeButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  typeButtonTextSelected: {
    color: '#fff',
  },
  textInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 44,
  },
  modalNotesInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  modalCancelButton: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flex: 1,
    marginRight: 8,
  },
  modalCancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalSaveButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flex: 1,
    marginLeft: 8,
  },
  modalSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});