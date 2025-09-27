import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useImplantTreatment } from '../contexts/ImplantTreatmentContext';
import { useAuth } from '../contexts/AuthContext';
import { database } from '../db';
import Treatment from '../db/models/Treatment';
import uuid from 'react-native-uuid';

interface ImplantRecord {
  id: string;
  toothNumber: string;
  notes: string;
  placedAt: Date;
}

interface ImplantCrownRecord {
  id: string;
  toothNumber: string;
  crownType: 'screw-retained' | 'cemented';
  notes: string;
  placedAt: Date;
}

const ImplantTreatmentScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  const { user } = useAuth();

  // State for implant records
  const [implantRecords, setImplantRecords] = useState<ImplantRecord[]>([]);
  const [crownRecords, setCrownRecords] = useState<ImplantCrownRecord[]>([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [treatmentCompleted, setTreatmentCompleted] = useState(false);
  const [completedAt, setCompletedAt] = useState<Date | null>(null);

  // Modal state for implants
  const [implantModalVisible, setImplantModalVisible] = useState(false);
  const [toothNumber, setToothNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Modal state for crowns
  const [crownModalVisible, setCrownModalVisible] = useState(false);
  const [crownToothNumber, setCrownToothNumber] = useState('');
  const [crownType, setCrownType] = useState<'screw-retained' | 'cemented'>('screw-retained');
  const [crownNotes, setCrownNotes] = useState('');
  const [editingCrownId, setEditingCrownId] = useState<string | null>(null);

  const openNewImplantModal = () => {
    setEditingId(null);
    setToothNumber('');
    setNotes('');
    setImplantModalVisible(true);
  };

  const openEditImplantModal = (record: ImplantRecord) => {
    setEditingId(record.id);
    setToothNumber(record.toothNumber);
    setNotes(record.notes);
    setImplantModalVisible(true);
  };

  const openNewCrownModal = () => {
    setEditingCrownId(null);
    setCrownToothNumber('');
    setCrownType('screw-retained');
    setCrownNotes('');
    setCrownModalVisible(true);
  };

  const openEditCrownModal = (record: ImplantCrownRecord) => {
    setEditingCrownId(record.id);
    setCrownToothNumber(record.toothNumber);
    setCrownType(record.crownType);
    setCrownNotes(record.notes);
    setCrownModalVisible(true);
  };

  const handleSaveImplant = () => {
    // Validation
    if (!toothNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter the tooth number for the implant.');
      return;
    }

    const recordData: ImplantRecord = {
      id: editingId || uuid.v4() as string,
      toothNumber: toothNumber.trim(),
      notes: notes.trim(),
      placedAt: new Date(),
    };

    if (editingId) {
      // Update existing record
      setImplantRecords(prev => 
        prev.map(record => record.id === editingId ? recordData : record)
      );
    } else {
      // Add new record
      setImplantRecords(prev => [...prev, recordData]);
    }

    setImplantModalVisible(false);
  };

  const handleSaveCrown = () => {
    // Validation
    if (!crownToothNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter the tooth number for the implant crown.');
      return;
    }

    const recordData: ImplantCrownRecord = {
      id: editingCrownId || uuid.v4() as string,
      toothNumber: crownToothNumber.trim(),
      crownType: crownType,
      notes: crownNotes.trim(),
      placedAt: new Date(),
    };

    if (editingCrownId) {
      // Update existing record
      setCrownRecords(prev => 
        prev.map(record => record.id === editingCrownId ? recordData : record)
      );
    } else {
      // Add new record
      setCrownRecords(prev => [...prev, recordData]);
    }

    setCrownModalVisible(false);
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
          onPress: () => setImplantRecords(prev => prev.filter(record => record.id !== id))
        }
      ]
    );
  };

  const removeCrownRecord = (id: string) => {
    Alert.alert(
      'Remove Crown Record',
      'Are you sure you want to remove this implant crown record?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => setCrownRecords(prev => prev.filter(record => record.id !== id))
        }
      ]
    );
  };

  const saveTreatmentToDatabase = async () => {
    try {
      const completedDate = new Date();
      const clinicianName = user?.email || 'Unknown Clinician';

      await database.write(async () => {
        // Save implant records
        for (const record of implantRecords) {
          const treatmentId = uuid.v4();
          
          await database.get<Treatment>('treatments').create(treatment => {
            treatment._raw.id = treatmentId;
            treatment.patientId = patientId;
            treatment.visitId = '';
            treatment.type = 'implant';
            treatment.tooth = record.toothNumber;
            treatment.surface = 'N/A';
            treatment.units = 1;
            treatment.value = 0;
            treatment.billingCodes = JSON.stringify([]);
            treatment.notes = `Single implant placed at tooth ${record.toothNumber}. ${record.notes}`;
            treatment.clinicianName = clinicianName;
            treatment.completedAt = completedDate;
          });
        }

        // Save crown records
        for (const record of crownRecords) {
          const treatmentId = uuid.v4();
          
          await database.get<Treatment>('treatments').create(treatment => {
            treatment._raw.id = treatmentId;
            treatment.patientId = patientId;
            treatment.visitId = '';
            treatment.type = 'implant-crown';
            treatment.tooth = record.toothNumber;
            treatment.surface = 'N/A';
            treatment.units = 1;
            treatment.value = 0;
            treatment.billingCodes = JSON.stringify([]);
            treatment.notes = `${record.crownType === 'screw-retained' ? 'Screw-retained' : 'Cemented'} implant crown placed at tooth ${record.toothNumber}. ${record.notes}`;
            treatment.clinicianName = clinicianName;
            treatment.completedAt = completedDate;
          });
        }
      });

      console.log('✅ Implant treatment saved to database:', {
        patientId,
        implantRecords: implantRecords.length,
        crownRecords: crownRecords.length,
        totalRecords: implantRecords.length + crownRecords.length,
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
    if (implantRecords.length === 0 && crownRecords.length === 0) {
      Alert.alert(
        'No Records',
        'Please add at least one implant or crown record before completing the treatment.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Complete Treatment',
      `Complete implant treatment for this patient?\n\nTreatment Summary:\n• Single Implants: ${implantRecords.length}\n• Implant Crowns: ${crownRecords.length}\n\nThis will save the treatment to the database.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Complete & Save', 
          onPress: async () => {
            const saved = await saveTreatmentToDatabase();
            
            if (saved) {
              setTreatmentCompleted(true);
              setCompletedAt(new Date());
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
            setImplantRecords([]);
            setCrownRecords([]);
            setGeneralNotes('');
            setTreatmentCompleted(false);
            setCompletedAt(null);
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>🦷 Implant Treatment</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

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
          <Text style={styles.sectionTitle}>Single Implants ({implantRecords.length})</Text>
          <Pressable style={styles.addButton} onPress={openNewImplantModal}>
            <Text style={styles.addButtonText}>+ Add Implant</Text>
          </Pressable>
        </View>

        {implantRecords.length === 0 ? (
          <Text style={styles.noRecordsText}>
            No implant records yet. Tap "Add Implant" to record implant placement.
          </Text>
        ) : (
          implantRecords.map((record) => (
            <View key={record.id} style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <Text style={styles.recordTitle}>
                  Single Implant - Tooth {record.toothNumber}
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

      {/* Implant Crown Records Section */}
      <View style={styles.recordsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Implant Crowns ({crownRecords.length})</Text>
          <Pressable style={styles.addButton} onPress={openNewCrownModal}>
            <Text style={styles.addButtonText}>+ Add Crown</Text>
          </Pressable>
        </View>

        {crownRecords.length === 0 ? (
          <Text style={styles.noRecordsText}>
            No implant crown records yet. Tap "Add Crown" to record crown placement.
          </Text>
        ) : (
          crownRecords.map((record) => (
            <View key={record.id} style={styles.crownCard}>
              <View style={styles.recordHeader}>
                <Text style={styles.recordTitle}>
                  {record.crownType === 'screw-retained' ? 'Screw-Retained' : 'Cemented'} Crown - Tooth {record.toothNumber}
                </Text>
                <View style={styles.recordActions}>
                  <Pressable 
                    style={styles.editButton} 
                    onPress={() => openEditCrownModal(record)}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </Pressable>
                  <Pressable 
                    style={styles.deleteButton} 
                    onPress={() => removeCrownRecord(record.id)}
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
          onChangeText={setGeneralNotes}
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
            <Text style={styles.summaryLabel}>Total Implants:</Text>
            <Text style={styles.summaryValue}>{implantRecords.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Implant Crowns:</Text>
            <Text style={styles.summaryValue}>{crownRecords.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Procedures:</Text>
            <Text style={styles.summaryValue}>{implantRecords.length + crownRecords.length}</Text>
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

      {/* Add/Edit Implant Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={implantModalVisible}
        onRequestClose={() => setImplantModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingId ? 'Edit Implant' : 'Add Single Implant'}
            </Text>

            {/* Tooth Number Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tooth Number</Text>
              <TextInput
                style={styles.textInput}
                value={toothNumber}
                onChangeText={setToothNumber}
                placeholder="e.g., 11, 24, 36"
                autoCapitalize="none"
              />
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes (Brand, placement details, etc.)</Text>
              <TextInput
                style={styles.modalNotesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g., Nobel Biocare 4.3x10mm, torque 35Ncm, primary stability excellent..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <Pressable 
                style={styles.modalCancelButton} 
                onPress={() => setImplantModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={styles.modalSaveButton} 
                onPress={handleSaveImplant}
              >
                <Text style={styles.modalSaveButtonText}>
                  {editingId ? 'Update' : 'Add'} Implant
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Crown Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={crownModalVisible}
        onRequestClose={() => setCrownModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingCrownId ? 'Edit Crown' : 'Add Implant Crown'}
            </Text>

            {/* Tooth Number Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tooth Number</Text>
              <TextInput
                style={styles.textInput}
                value={crownToothNumber}
                onChangeText={setCrownToothNumber}
                placeholder="e.g., 11, 24, 36"
                autoCapitalize="none"
              />
            </View>

            {/* Crown Type Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Crown Type</Text>
              <View style={styles.crownTypeButtons}>
                <Pressable
                  style={[
                    styles.crownTypeButton,
                    crownType === 'screw-retained' && styles.crownTypeButtonSelected
                  ]}
                  onPress={() => setCrownType('screw-retained')}
                >
                  <Text style={[
                    styles.crownTypeButtonText,
                    crownType === 'screw-retained' && styles.crownTypeButtonTextSelected
                  ]}>
                    Screw-Retained
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.crownTypeButton,
                    crownType === 'cemented' && styles.crownTypeButtonSelected
                  ]}
                  onPress={() => setCrownType('cemented')}
                >
                  <Text style={[
                    styles.crownTypeButtonText,
                    crownType === 'cemented' && styles.crownTypeButtonTextSelected
                  ]}>
                    Cemented
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes (Material, fit details, etc.)</Text>
              <TextInput
                style={styles.modalNotesInput}
                value={crownNotes}
                onChangeText={setCrownNotes}
                placeholder="e.g., Zirconia crown, excellent fit, torqued to 15Ncm..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <Pressable 
                style={styles.modalCancelButton} 
                onPress={() => setCrownModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={styles.modalSaveButton} 
                onPress={handleSaveCrown}
              >
                <Text style={styles.modalSaveButtonText}>
                  {editingCrownId ? 'Update' : 'Add'} Crown
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
  crownCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
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
  crownTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  crownTypeButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  crownTypeButtonSelected: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  crownTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  crownTypeButtonTextSelected: {
    color: '#fff',
  },
});