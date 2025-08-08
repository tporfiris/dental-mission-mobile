import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useImplantTreatment, IMPLANT_TYPES, IMPLANT_PROCEDURES, TOOTH_OPTIONS, type ImplantType, type ImplantProcedure, type PlacedImplant } from '../contexts/ImplantTreatmentContext';
import { useAuth } from '../contexts/AuthContext';
import { database } from '../db';
import Treatment from '../db/models/Treatment';
import uuid from 'react-native-uuid';

const ImplantTreatmentScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  const { user } = useAuth();
  const { 
    treatmentState, 
    addPlacedImplant,
    removePlacedImplant,
    updatePlacedImplant,
    updateGeneralNotes,
    markCompleted,
    resetTreatment 
  } = useImplantTreatment();

  const { placedImplants, generalNotes, completedAt } = treatmentState;

  // Modal state for adding new implants
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('11');
  const [selectedType, setSelectedType] = useState<ImplantType>('single-implant');
  const [selectedProcedures, setSelectedProcedures] = useState<ImplantProcedure[]>([]);
  const [implantNotes, setImplantNotes] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Dropdown state
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  // Generate billing codes based on placed implants
  const billingCodes = useMemo(() => {
    const codes: Array<{
      code: string;
      description: string;
      quantity: number;
      category: string;
      estimatedValue: number;
    }> = [];

    placedImplants.forEach(implant => {
      // Base implant placement codes
      switch (implant.implantType) {
        case 'single-implant':
          codes.push({
            code: 'D6010',
            description: 'Surgical placement of implant body: endosteal implant',
            quantity: 1,
            category: 'Implant Surgery',
            estimatedValue: 1200
          });
          break;
        case 'multiple-implants':
          codes.push({
            code: 'D6010',
            description: 'Surgical placement of implant body: endosteal implant',
            quantity: 1,
            category: 'Implant Surgery',
            estimatedValue: 1200
          });
          break;
        case 'implant-bridge':
          codes.push({
            code: 'D6010',
            description: 'Surgical placement of implant body: endosteal implant',
            quantity: 1,
            category: 'Implant Surgery',
            estimatedValue: 1200
          });
          codes.push({
            code: 'D6245',
            description: 'Pontic - porcelain fused to metal',
            quantity: 1,
            category: 'Implant Prosthetics',
            estimatedValue: 800
          });
          break;
        case 'all-on-4':
          codes.push({
            code: 'D6010',
            description: 'Surgical placement of implant body: endosteal implant',
            quantity: 4,
            category: 'Implant Surgery',
            estimatedValue: 4800
          });
          codes.push({
            code: 'D5110',
            description: 'Complete denture - maxillary (implant retained)',
            quantity: 1,
            category: 'Implant Prosthetics',
            estimatedValue: 3000
          });
          break;
        case 'all-on-6':
          codes.push({
            code: 'D6010',
            description: 'Surgical placement of implant body: endosteal implant',
            quantity: 6,
            category: 'Implant Surgery',
            estimatedValue: 7200
          });
          codes.push({
            code: 'D5110',
            description: 'Complete denture - maxillary (implant retained)',
            quantity: 1,
            category: 'Implant Prosthetics',
            estimatedValue: 3500
          });
          break;
        case 'mini-implants':
          codes.push({
            code: 'D6013',
            description: 'Surgical placement of mini implant',
            quantity: 1,
            category: 'Implant Surgery',
            estimatedValue: 600
          });
          break;
        case 'zygomatic-implants':
          codes.push({
            code: 'D6040',
            description: 'Surgical placement of zygomatic implant',
            quantity: 1,
            category: 'Implant Surgery',
            estimatedValue: 2500
          });
          break;
      }

      // Additional procedure codes
      implant.additionalProcedures.forEach(procedure => {
        switch (procedure) {
          case 'bone-grafting':
            codes.push({
              code: 'D7953',
              description: 'Bone replacement graft for ridge preservation',
              quantity: 1,
              category: 'Oral Surgery',
              estimatedValue: 800
            });
            break;
          case 'sinus-lift':
            codes.push({
              code: 'D7951',
              description: 'Sinus augmentation with bone or bone substitutes',
              quantity: 1,
              category: 'Oral Surgery',
              estimatedValue: 1500
            });
            break;
          case 'guided-surgery':
            codes.push({
              code: 'D6190',
              description: 'Radiographic/surgical implant index',
              quantity: 1,
              category: 'Implant Surgery',
              estimatedValue: 400
            });
            break;
          case 'immediate-loading':
            codes.push({
              code: 'D6056',
              description: 'Prefabricated abutment - includes modification',
              quantity: 1,
              category: 'Implant Prosthetics',
              estimatedValue: 300
            });
            break;
          case 'membrane-placement':
            codes.push({
              code: 'D4266',
              description: 'Guided tissue regeneration - resorbable barrier',
              quantity: 1,
              category: 'Periodontics',
              estimatedValue: 600
            });
            break;
          case 'socket-preservation':
            codes.push({
              code: 'D7953',
              description: 'Bone replacement graft for ridge preservation',
              quantity: 1,
              category: 'Oral Surgery',
              estimatedValue: 500
            });
            break;
        }
      });
    });

    return codes;
  }, [placedImplants]);

  const toggleProcedure = (procedure: ImplantProcedure) => {
    setSelectedProcedures(prev => 
      prev.includes(procedure)
        ? prev.filter(p => p !== procedure)
        : [...prev, procedure]
    );
  };

  const openNewImplantModal = () => {
    setEditingIndex(null);
    setSelectedLocation('11');
    setSelectedType('single-implant');
    setSelectedProcedures([]);
    setImplantNotes('');
    setShowLocationDropdown(false);
    setShowTypeDropdown(false);
    setModalVisible(true);
  };

  const openEditImplantModal = (index: number) => {
    const implant = placedImplants[index];
    setEditingIndex(index);
    setSelectedLocation(implant.toothLocation);
    setSelectedType(implant.implantType);
    setSelectedProcedures(implant.additionalProcedures);
    setImplantNotes(implant.notes);
    setShowLocationDropdown(false);
    setShowTypeDropdown(false);
    setModalVisible(true);
  };

  const handleSaveImplant = () => {
    const implantData = {
      toothLocation: selectedLocation,
      implantType: selectedType,
      additionalProcedures: selectedProcedures,
      notes: implantNotes,
    };

    if (editingIndex !== null) {
      updatePlacedImplant(editingIndex, implantData);
    } else {
      addPlacedImplant(implantData);
    }

    setModalVisible(false);
  };

  const saveTreatmentToDatabase = async () => {
    try {
      const completedDate = new Date();
      const clinicianName = user?.email || 'Unknown Clinician';

      // Create a treatment record for each placed implant
      await database.write(async () => {
        for (const implant of placedImplants) {
          const treatmentId = uuid.v4();
          
          await database.get<Treatment>('treatments').create(treatment => {
            treatment._raw.id = treatmentId;
            treatment.patientId = patientId;
            treatment.visitId = '';
            treatment.type = 'implant';
            treatment.tooth = implant.toothLocation;
            treatment.surface = 'N/A';
            treatment.units = 1; // One implant placed
            treatment.value = 0; // Can be calculated from billing codes
            treatment.billingCodes = JSON.stringify(billingCodes.filter(code => 
              // Filter codes relevant to this specific implant
              code.category.includes('Implant') || implant.additionalProcedures.length > 0
            ));
            treatment.notes = `${IMPLANT_TYPES[implant.implantType]} placed at tooth ${implant.toothLocation}. ${implant.notes ? `Notes: ${implant.notes}` : ''}`;
            treatment.clinicianName = clinicianName;
            treatment.completedAt = completedDate;
          });
        }
      });

      console.log('✅ Implant treatment saved to database:', {
        patientId,
        totalImplants: placedImplants.length,
        billingCodes: billingCodes.length,
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
    if (placedImplants.length === 0) {
      Alert.alert(
        'No Implants Recorded',
        'Please add at least one implant placement before completing the treatment.',
        [{ text: 'OK' }]
      );
      return;
    }

    const totalValue = billingCodes.reduce((sum, code) => sum + (code.estimatedValue * code.quantity), 0);

    Alert.alert(
      'Complete Treatment',
      `Complete implant treatment for this patient?\n\nTreatment Summary:\n• Implants Placed: ${placedImplants.length}\n• Billing Codes: ${billingCodes.length}\n• Estimated Value: $${totalValue.toLocaleString()}\n\nThis will save the treatment to the database.`,
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
                '✅ Implant treatment completed and saved to database!\n\n' +
                `Treatment Details:\n` +
                `• Patient ID: ${patientId}\n` +
                `• Implants Placed: ${placedImplants.length}\n` +
                `• Billing Codes: ${billingCodes.length}\n` +
                `• Estimated Value: $${totalValue.toLocaleString()}\n` +
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
      <Text style={styles.header}>🧲 Implant Treatment</Text>
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

      {/* Placed Implants Section */}
      <View style={styles.implantsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Placed Implants ({placedImplants.length})</Text>
          <Pressable style={styles.addButton} onPress={openNewImplantModal}>
            <Text style={styles.addButtonText}>+ Add Implant</Text>
          </Pressable>
        </View>

        {placedImplants.length === 0 ? (
          <Text style={styles.noImplantsText}>
            No implants recorded yet. Tap "Add Implant" to record placed implants.
          </Text>
        ) : (
          placedImplants.map((implant, index) => (
            <View key={index} style={styles.implantCard}>
              <View style={styles.implantHeader}>
                <Text style={styles.implantTitle}>
                  {IMPLANT_TYPES[implant.implantType]} - Tooth {implant.toothLocation}
                </Text>
                <View style={styles.implantActions}>
                  <Pressable 
                    style={styles.editButton} 
                    onPress={() => openEditImplantModal(index)}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </Pressable>
                  <Pressable 
                    style={styles.deleteButton} 
                    onPress={() => removePlacedImplant(index)}
                  >
                    <Text style={styles.deleteButtonText}>×</Text>
                  </Pressable>
                </View>
              </View>
              
              {implant.additionalProcedures.length > 0 && (
                <Text style={styles.proceduresText}>
                  Additional: {implant.additionalProcedures.map(p => IMPLANT_PROCEDURES[p]).join(', ')}
                </Text>
              )}
              
              {implant.notes && (
                <Text style={styles.implantNotesText}>Notes: {implant.notes}</Text>
              )}
              
              <Text style={styles.placedAtText}>
                Placed: {new Date(implant.placedAt).toLocaleString()}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Generated Billing Codes */}
      <View style={styles.billingSection}>
        <Text style={styles.sectionTitle}>Generated Billing Codes</Text>
        
        {billingCodes.length === 0 ? (
          <Text style={styles.noCodesText}>
            Add implant placements to generate billing codes
          </Text>
        ) : (
          billingCodes.map((code, index) => (
            <View key={index} style={styles.codeCard}>
              <View style={styles.codeHeader}>
                <Text style={styles.codeNumber}>{code.code}</Text>
                <Text style={styles.codeCategory}>{code.category}</Text>
              </View>
              <Text style={styles.codeDescription}>{code.description}</Text>
              <View style={styles.codeDetails}>
                <Text style={styles.codeQuantity}>Qty: {code.quantity}</Text>
                <Text style={styles.codeValue}>${code.estimatedValue * code.quantity}</Text>
              </View>
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
            <Text style={styles.summaryLabel}>Total Implants Placed:</Text>
            <Text style={styles.summaryValue}>{placedImplants.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Billing Codes Generated:</Text>
            <Text style={styles.summaryValue}>{billingCodes.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Estimated Total Value:</Text>
            <Text style={styles.summaryValue}>
              ${billingCodes.reduce((sum, code) => sum + (code.estimatedValue * code.quantity), 0).toLocaleString()}
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

      {/* Add/Edit Implant Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingIndex !== null ? 'Edit Implant' : 'Add New Implant'}
              </Text>

              {/* Tooth Location Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tooth Location</Text>
                <Pressable 
                  style={styles.dropdownButton}
                  onPress={() => {
                    setShowLocationDropdown(!showLocationDropdown);
                    setShowTypeDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownButtonText}>Tooth {selectedLocation}</Text>
                  <Text style={styles.dropdownArrow}>{showLocationDropdown ? '▲' : '▼'}</Text>
                </Pressable>
                
                {showLocationDropdown && (
                  <View style={styles.dropdownList}>
                    <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                      {TOOTH_OPTIONS.map(tooth => (
                        <Pressable
                          key={tooth}
                          style={[
                            styles.dropdownItem,
                            selectedLocation === tooth && styles.dropdownItemSelected
                          ]}
                          onPress={() => {
                            setSelectedLocation(tooth);
                            setShowLocationDropdown(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            selectedLocation === tooth && styles.dropdownItemTextSelected
                          ]}>
                            Tooth {tooth}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Implant Type Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Implant Type</Text>
                <Pressable 
                  style={styles.dropdownButton}
                  onPress={() => {
                    setShowTypeDropdown(!showTypeDropdown);
                    setShowLocationDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownButtonText}>{IMPLANT_TYPES[selectedType]}</Text>
                  <Text style={styles.dropdownArrow}>{showTypeDropdown ? '▲' : '▼'}</Text>
                </Pressable>
                
                {showTypeDropdown && (
                  <View style={styles.dropdownList}>
                    <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                      {Object.entries(IMPLANT_TYPES).map(([key, label]) => (
                        <Pressable
                          key={key}
                          style={[
                            styles.dropdownItem,
                            selectedType === key && styles.dropdownItemSelected
                          ]}
                          onPress={() => {
                            setSelectedType(key as ImplantType);
                            setShowTypeDropdown(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            selectedType === key && styles.dropdownItemTextSelected
                          ]}>
                            {label}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Additional Procedures */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Additional Procedures</Text>
                <View style={styles.procedureGrid}>
                  {Object.entries(IMPLANT_PROCEDURES).map(([key, label]) => (
                    <Pressable
                      key={key}
                      style={[
                        styles.procedureButton,
                        selectedProcedures.includes(key as ImplantProcedure) && styles.procedureButtonSelected
                      ]}
                      onPress={() => toggleProcedure(key as ImplantProcedure)}
                    >
                      <Text style={[
                        styles.procedureButtonText,
                        selectedProcedures.includes(key as ImplantProcedure) && styles.procedureButtonTextSelected
                      ]}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes (Optional)</Text>
                <TextInput
                  style={styles.modalNotesInput}
                  value={implantNotes}
                  onChangeText={setImplantNotes}
                  placeholder="Specific notes about this implant placement..."
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Modal Actions */}
              <View style={styles.modalActions}>
                <Pressable 
                  style={styles.modalCancelButton} 
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable 
                  style={styles.modalSaveButton} 
                  onPress={handleSaveImplant}
                >
                  <Text style={styles.modalSaveButtonText}>
                    {editingIndex !== null ? 'Update' : 'Add'} Implant
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
  implantsSection: {
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
  noImplantsText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  implantCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  implantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  implantTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  implantActions: {
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
  proceduresText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
  },
  implantNotesText: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  placedAtText: {
    fontSize: 12,
    color: '#6c757d',
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
    marginBottom: 8,
  },
  codeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeQuantity: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  codeValue: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: 'bold',
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
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
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
  dropdownButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#007bff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 50,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: 'bold',
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007bff',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    maxHeight: 200,
    position: 'absolute',
    top: 58, // Position below the button
    left: 0,
    right: 0,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  dropdownItemSelected: {
    backgroundColor: '#007bff',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownItemTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  procedureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  procedureButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  procedureButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  procedureButtonText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
  procedureButtonTextSelected: {
    color: '#fff',
  },
  modalNotesInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 80,
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