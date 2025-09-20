import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useExtractionsTreatment } from '../contexts/ExtractionsTreatmentContext';
import { useAuth } from '../contexts/AuthContext';
import { database } from '../db';
import Treatment from '../db/models/Treatment';
import uuid from 'react-native-uuid';

const ExtractionsTreatmentScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  const { user } = useAuth();
  
  // Use the context for all state management
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

  // Calculate billing codes based on extractions performed
  const billingCodes = useMemo(() => {
    return extractions.map(extraction => {
      const toothNum = parseInt(extraction.toothNumber);
      const isWisdomTooth = [18, 28, 38, 48].includes(toothNum);
      const isMolar = toothNum % 10 >= 6; // 6, 7, 8 are molars
      
      let code, description;
      
      if (extraction.complexity === 'complicated') {
        if (isWisdomTooth) {
          code = 'D7240';
          description = `Removal of impacted tooth - completely bony (Tooth ${extraction.toothNumber})`;
        } else {
          code = 'D7210';
          description = `Extraction, erupted tooth requiring removal of bone/sectioning (Tooth ${extraction.toothNumber})`;
        }
      } else {
        code = 'D7140';
        description = `Extraction, erupted tooth or exposed root (Tooth ${extraction.toothNumber})`;
      }
      
      return {
        code,
        description,
        tooth: extraction.toothNumber,
        category: 'Oral Surgery',
        complexity: extraction.complexity,
        extractionId: extraction.id
      };
    });
  }, [extractions]);

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
    
    // Check if tooth already extracted
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
    
    // Clear form
    updateToothNumber('');
    updateSelectedComplexity('simple');
    updateExtractionNotes('');
    
    Alert.alert('Success', `Tooth ${toothNumber} extraction recorded successfully`);
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

      // Save each extraction as a separate treatment record
      await database.write(async () => {
        for (const extraction of extractions) {
          const treatmentId = uuid.v4();
          
          await database.get<Treatment>('treatments').create(treatment => {
            treatment._raw.id = treatmentId;
            treatment.patientId = patientId;
            treatment.visitId = '';
            treatment.type = 'extraction';
            treatment.tooth = extraction.toothNumber;
            treatment.surface = 'N/A';
            treatment.units = 1;
            treatment.value = 0;
            
            // Find the billing code for this specific extraction
            const code = billingCodes.find(c => c.extractionId === extraction.id);
            treatment.billingCodes = JSON.stringify(code ? [code] : []);
            
            treatment.notes = `${extraction.complexity === 'simple' ? 'Simple' : 'Complicated'} extraction of tooth ${extraction.toothNumber}. ${extraction.notes}`.trim();
            treatment.clinicianName = clinicianName;
            treatment.completedAt = completedDate;
          });
        }
      });

      console.log('✅ Extractions treatment saved to database:', {
        patientId,
        extractionsCount: extractions.length,
        teeth: extractions.map(e => `${e.toothNumber}(${e.complexity})`),
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

    Alert.alert(
      'Complete Treatment',
      `Complete extractions treatment for this patient?\n\nTreatment Summary:\n• Total Extractions: ${extractions.length}\n• Simple: ${simpleExtractions}\n• Complicated: ${complicatedExtractions}\n• Billing Codes Generated: ${billingCodes.length}\n\nThis will save all extractions to the database.`,
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
                `• Total Extractions: ${extractions.length}\n` +
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

          <View style={styles.formColumn}>
            <Text style={styles.formLabel}>Notes (stitches, antibiotics, etc.):</Text>
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
          extractions.map((extraction) => (
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
              {extraction.notes && (
                <Text style={styles.extractionNotes}>
                  Notes: {extraction.notes}
                </Text>
              )}
            </View>
          ))
        )}
      </View>

      {/* Generated Billing Codes */}
      <View style={styles.billingSection}>
        <Text style={styles.sectionTitle}>Generated Billing Codes</Text>
        
        {billingCodes.length === 0 ? (
          <Text style={styles.noCodesText}>
            Record extractions to generate billing codes
          </Text>
        ) : (
          billingCodes.map((code, index) => (
            <View key={index} style={styles.codeCard}>
              <View style={styles.codeHeader}>
                <Text style={styles.codeNumber}>{code.code}</Text>
                <Text style={styles.codeCategory}>{code.category}</Text>
              </View>
              <Text style={styles.codeDescription}>{code.description}</Text>
              <Text style={styles.codeDetails}>
                Tooth: {code.tooth} • Type: {code.complexity}
              </Text>
            </View>
          ))
        )}
      </View>

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

// Styles remain the same as the original file
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
  codeDetails: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
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