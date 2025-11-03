// screens/ExtractionsTreatmentScreen.tsx - OPTIMIZED VERSION
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useExtractionsTreatment } from '../contexts/ExtractionsTreatmentContext';
import { useAuth } from '../contexts/AuthContext';
import { database } from '../db';
import Treatment from '../db/models/Treatment';
import uuid from 'react-native-uuid';

// ODA Fee Structure for Extractions
const ODA_FEES = {
  simple: { code: '71101', price: 218 },
  complicated: { code: '71201', price: 314 },
};

const ExtractionsTreatmentScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  const { user } = useAuth();
  
  const {
    treatmentState,
    addExtraction,
    updateExtraction,
    removeExtraction,
    updateToothNumber,
    updateSelectedComplexity,
    updateExtractionNotes,
    setEditingExtraction,
    setModalVisible,
    markCompleted,
    resetTreatment,
    validateToothNumber,
    getExtractionById
  } = useExtractionsTreatment();

  const {
    extractions,
    completedAt,
    toothNumber,
    selectedComplexity,
    extractionNotes,
    editingExtraction,
    modalVisible
  } = treatmentState;

  // Calculate ODA billing codes and total cost
  const billingCalculation = useMemo(() => {
    // ✅ OPTIMIZED: Store minimal billing info
    const billingCodes: Array<{
      code: string;
      price: number;
      tooth: string;
      complexity: string;
    }> = [];

    let totalCost = 0;

    extractions.forEach(extraction => {
      const odaInfo = ODA_FEES[extraction.complexity];
      if (odaInfo) {
        billingCodes.push({
          code: odaInfo.code,
          price: odaInfo.price,
          tooth: extraction.toothNumber,
          complexity: extraction.complexity,
        });
        totalCost += odaInfo.price;
      }
    });

    return { billingCodes, totalCost };
  }, [extractions]);

  const { billingCodes, totalCost } = billingCalculation;

  // ✅ HELPER: Generate description on-the-fly (not stored)
  const getExtractionDescription = (tooth: string, complexity: string): string => {
    return `${complexity === 'simple' ? 'Simple' : 'Complicated'} extraction - Tooth ${tooth}`;
  };

  const handleAddExtraction = () => {
    if (!toothNumber.trim()) {
      Alert.alert('Error', 'Please enter a tooth number');
      return;
    }
    
    if (!validateToothNumber(toothNumber)) {
      Alert.alert(
        'Invalid Tooth Number', 
        'Please enter a valid tooth number (11-18, 21-28, 31-38, 41-48)'
      );
      return;
    }
    
    const existingExtraction = extractions.find(e => e.toothNumber === toothNumber);
    if (existingExtraction) {
      Alert.alert(
        'Tooth Already Recorded', 
        `Tooth ${toothNumber} has already been recorded for extraction. Would you like to edit it?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Edit', onPress: () => handleEditExtraction(existingExtraction) }
        ]
      );
      return;
    }
    
    const newExtraction = {
      toothNumber,
      complexity: selectedComplexity,
      notes: extractionNotes.trim()
    };
    
    addExtraction(newExtraction);
    
    updateToothNumber('');
    updateSelectedComplexity('simple');
    updateExtractionNotes('');
    
    const odaInfo = ODA_FEES[selectedComplexity];
    Alert.alert(
      'Success', 
      `Tooth ${toothNumber} extraction recorded successfully\n\nODA Code: ${odaInfo.code} - $${odaInfo.price}`
    );
  };

  const handleEditExtraction = (extraction: any) => {
    setEditingExtraction(extraction);
    setModalVisible(true);
  };

  const handleUpdateExtraction = (updatedExtraction: any) => {
    if (editingExtraction) {
      updateExtraction(editingExtraction.id, updatedExtraction);
      setModalVisible(false);
      setEditingExtraction(null);
    }
  };

  const handleRemoveExtraction = (extractionId: string) => {
    const extraction = getExtractionById(extractionId);
    if (!extraction) return;
    
    Alert.alert(
      'Remove Extraction',
      `Remove extraction record for tooth ${extraction.toothNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => removeExtraction(extractionId)
        }
      ]
    );
  };

  const saveTreatmentToDatabase = async () => {
    try {
      const clinicianName = user?.email || 'Unknown Clinician';
      const completedDate = new Date();

      await database.write(async () => {
        for (const extraction of extractions) {
          const treatmentId = uuid.v4();
          const code = billingCodes.find(c => c.tooth === extraction.toothNumber);
          
          // ✅ OPTIMIZED: Build notes once, store minimal billing data
          const notesText = extraction.notes 
            ? `${extraction.complexity === 'simple' ? 'Simple' : 'Complicated'} extraction. ${extraction.notes}`
            : `${extraction.complexity === 'simple' ? 'Simple' : 'Complicated'} extraction`;

          await database.get<Treatment>('treatments').create(treatment => {
            treatment._raw.id = treatmentId;
            treatment.patientId = patientId;
            // ❌ REMOVED: visitId (empty string - not needed)
            treatment.type = 'extraction';
            treatment.tooth = extraction.toothNumber;
            // ❌ REMOVED: surface (N/A - not applicable)
            treatment.units = 1;
            treatment.value = code ? code.price : 0;
            // ✅ OPTIMIZED: Minimal billing code (no descriptions)
            treatment.billingCodes = JSON.stringify(code ? [{
              code: code.code,
              price: code.price,
              complexity: code.complexity
            }] : []);
            treatment.notes = notesText;
            treatment.clinicianName = clinicianName;
            treatment.completedAt = completedDate;
          });
        }
      });

      console.log('✅ Extractions treatment saved to database:', {
        patientId,
        extractionsCount: extractions.length,
        teeth: extractions.map(e => `${e.toothNumber}(${e.complexity})`),
        totalCost: `$${totalCost}`,
        clinician: clinicianName,
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
    if (extractions.length === 0) {
      Alert.alert(
        'No Extractions Recorded',
        'Please record at least one extraction before completing the treatment.',
        [{ text: 'OK' }]
      );
      return;
    }

    const simpleExtractions = extractions.filter(e => e.complexity === 'simple').length;
    const complicatedExtractions = extractions.filter(e => e.complexity === 'complicated').length;
    const odaCodesText = billingCodes.map(code => 
      `${code.code}: $${code.price} (Tooth ${code.tooth})`
    ).join('\n• ');

    Alert.alert(
      'Complete Treatment',
      `Complete extractions treatment for this patient?\n\nTreatment Summary:\n• Total Extractions: ${extractions.length}\n• Simple: ${simpleExtractions}\n• Complicated: ${complicatedExtractions}\n\nODA Billing Codes:\n• ${odaCodesText}\n\nTotal Cost: $${totalCost.toFixed(2)}\n\nThis will save all extractions to the database.`,
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
                `✅ Extractions treatment completed and saved!\n\nTotal ODA Billing: $${totalCost.toFixed(2)}\n\nTreatment Details:\n• Patient ID: ${patientId}\n• Total Extractions: ${extractions.length}\n• Billing Codes: ${billingCodes.length}\n• Completed: ${new Date().toLocaleString()}`
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
      <Text style={styles.header}>🛠️ Extractions Treatment</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

      {completedAt && (
        <View style={styles.completedBanner}>
          <Text style={styles.completedText}>✅ Treatment Completed</Text>
          <Text style={styles.completedDate}>
            {completedAt.toLocaleDateString()} at {completedAt.toLocaleTimeString()}
          </Text>
        </View>
      )}

      {/* Add New Extraction Form */}
      {!completedAt && (
        <View style={styles.addExtractionSection}>
          <Text style={styles.sectionTitle}>Add New Extraction</Text>
          
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Tooth Number:</Text>
            <TextInput
              style={styles.toothNumberInput}
              value={toothNumber}
              onChangeText={updateToothNumber}
              placeholder="e.g., 11, 26, 48"
              keyboardType="numeric"
              maxLength={2}
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Extraction Type:</Text>
            <View style={styles.complexitySelector}>
              <Pressable
                style={[
                  styles.complexityButton,
                  selectedComplexity === 'simple' && styles.complexityButtonSelected
                ]}
                onPress={() => updateSelectedComplexity('simple')}
              >
                <Text style={[
                  styles.complexityButtonText,
                  selectedComplexity === 'simple' && styles.complexityButtonTextSelected
                ]}>
                  Simple
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.complexityButton,
                  selectedComplexity === 'complicated' && styles.complexityButtonSelected
                ]}
                onPress={() => updateSelectedComplexity('complicated')}
              >
                <Text style={[
                  styles.complexityButtonText,
                  selectedComplexity === 'complicated' && styles.complexityButtonTextSelected
                ]}>
                  Complicated
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.odaInfo}>
            <Text style={styles.odaInfoText}>
              💰 ODA Code: {ODA_FEES[selectedComplexity].code} - ${ODA_FEES[selectedComplexity].price}
            </Text>
          </View>

          <View style={styles.formColumn}>
            <Text style={styles.formLabel}>Notes (optional):</Text>
            <TextInput
              style={styles.notesInput}
              value={extractionNotes}
              onChangeText={updateExtractionNotes}
              placeholder="Details about the extraction procedure..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <Pressable style={styles.addButton} onPress={handleAddExtraction}>
            <Text style={styles.addButtonText}>➕ Add Extraction</Text>
          </Pressable>
        </View>
      )}

      {/* Recorded Extractions */}
      <View style={styles.extractionsListSection}>
        <Text style={styles.sectionTitle}>
          Recorded Extractions ({extractions.length})
        </Text>
        
        {extractions.length === 0 ? (
          <Text style={styles.noExtractionsText}>
            No extractions recorded yet
          </Text>
        ) : (
          extractions.map((extraction) => {
            const odaInfo = ODA_FEES[extraction.complexity];
            return (
              <View key={extraction.id} style={styles.extractionCard}>
                <View style={styles.extractionHeader}>
                  <Text style={styles.toothNumberText}>Tooth {extraction.toothNumber}</Text>
                  <View style={styles.extractionActions}>
                    <Text style={[
                      styles.complexityBadge,
                      extraction.complexity === 'simple' ? styles.simpleBadge : styles.complicatedBadge
                    ]}>
                      {extraction.complexity === 'simple' ? 'Simple' : 'Complicated'}
                    </Text>
                    {!completedAt && (
                      <View style={styles.actionButtons}>
                        <Pressable
                          style={styles.editButton}
                          onPress={() => handleEditExtraction(extraction)}
                        >
                          <Text style={styles.editButtonText}>✏️</Text>
                        </Pressable>
                        <Pressable
                          style={styles.deleteButton}
                          onPress={() => handleRemoveExtraction(extraction.id)}
                        >
                          <Text style={styles.deleteButtonText}>🗑️</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
                
                <View style={styles.odaRow}>
                  <Text style={styles.odaCode}>ODA: {odaInfo.code}</Text>
                  <Text style={styles.odaPrice}>${odaInfo.price}</Text>
                </View>
                
                {extraction.notes && (
                  <Text style={styles.extractionNotes}>
                    Notes: {extraction.notes}
                  </Text>
                )}
              </View>
            );
          })
        )}
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
              <Text style={styles.billingDescription}>
                {getExtractionDescription(code.tooth, code.complexity)}
              </Text>
              <Text style={styles.billingDetails}>
                Complexity: {code.complexity} • Tooth: {code.tooth}
              </Text>
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
            🔄 Reset Treatment
          </Text>
        </Pressable>
      </View>

      {/* Edit Extraction Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Edit Extraction - Tooth {editingExtraction?.toothNumber}
            </Text>
            
            {editingExtraction && (
              <EditExtractionForm
                extraction={editingExtraction}
                onUpdate={handleUpdateExtraction}
                onCancel={() => setModalVisible(false)}
              />
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

// Edit Extraction Form Component
const EditExtractionForm = ({ extraction, onUpdate, onCancel }: {
  extraction: any;
  onUpdate: (extraction: any) => void;
  onCancel: () => void;
}) => {
  const [complexity, setComplexity] = React.useState(extraction.complexity);
  const [notes, setNotes] = React.useState(extraction.notes);

  const handleUpdate = () => {
    const updatedExtraction = {
      toothNumber: extraction.toothNumber,
      complexity,
      notes: notes.trim()
    };
    onUpdate(updatedExtraction);
  };

  const currentOdaInfo = ODA_FEES[complexity];

  return (
    <View>
      <View style={styles.formRow}>
        <Text style={styles.formLabel}>Extraction Type:</Text>
        <View style={styles.complexitySelector}>
          <Pressable
            style={[
              styles.complexityButton,
              complexity === 'simple' && styles.complexityButtonSelected
            ]}
            onPress={() => setComplexity('simple')}
          >
            <Text style={[
              styles.complexityButtonText,
              complexity === 'simple' && styles.complexityButtonTextSelected
            ]}>
              Simple
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.complexityButton,
              complexity === 'complicated' && styles.complexityButtonSelected
            ]}
            onPress={() => setComplexity('complicated')}
          >
            <Text style={[
              styles.complexityButtonText,
              complexity === 'complicated' && styles.complexityButtonTextSelected
            ]}>
              Complicated
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.odaInfo}>
        <Text style={styles.odaInfoText}>
          💰 ODA Code: {currentOdaInfo.code} - ${currentOdaInfo.price}
        </Text>
      </View>

      <View style={styles.formColumn}>
        <Text style={styles.formLabel}>Notes:</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Details about the extraction procedure..."
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

export default ExtractionsTreatmentScreen;

// Styles remain the same
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
  addExtractionSection: {
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
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  formColumn: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    minWidth: 100,
    marginRight: 12,
  },
  toothNumberInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minWidth: 80,
    textAlign: 'center',
  },
  complexitySelector: {
    flexDirection: 'row',
    flex: 1,
    gap: 8,
  },
  complexityButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  complexityButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  complexityButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  complexityButtonTextSelected: {
    color: '#fff',
  },
  odaInfo: {
    backgroundColor: '#fff3cd',
    borderRadius: 6,
    padding: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
  },
  odaInfoText: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '600',
    textAlign: 'center',
  },
  notesInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 80,
  },
  addButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  extractionsListSection: {
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
  noExtractionsText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  extractionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  extractionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toothNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  extractionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  complexityBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  simpleBadge: {
    backgroundColor: '#d1ecf1',
    color: '#0c5460',
  },
  complicatedBadge: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  editButton: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#007bff',
  },
  editButtonText: {
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  deleteButtonText: {
    fontSize: 14,
  },
  odaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  odaCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007bff',
  },
  odaPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#28a745',
  },
  extractionNotes: {
    fontSize: 14,
    color: '#495057',
    fontStyle: 'italic',
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
    borderLeftColor: '#dc3545',
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
    color: '#dc3545',
  },
  billingPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  billingDescription: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
  },
  billingDetails: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  updateButton: {
    flex: 1,
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  updateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});