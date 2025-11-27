// screens/ImplantTreatmentScreen.tsx - COMPLETE VERSION with Clear All
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { database } from '../db';
import Treatment from '../db/models/Treatment';
import uuid from 'react-native-uuid';

// ODA Fee Structure for Implants
const ODA_FEES = {
  'single-implant': { code: '75101', price: 2500, description: 'Single Tooth Implant' },
  'implant-crown': { code: '75201', price: 1800, description: 'Implant Crown' },
  'bone-grafting': { code: '75301', price: 850, description: 'Bone Grafting Procedure' },
  'sinus-lift': { code: '75401', price: 1200, description: 'Sinus Lift Procedure' },
};

interface ImplantRecord {
  id: string;
  toothNumber: string;
  implantType: 'single-implant' | 'bone-grafting' | 'sinus-lift';
  notes: string;
  addedAt: Date;
}

interface CrownRecord {
  id: string;
  toothNumber: string;
  notes: string;
  addedAt: Date;
}

const ImplantTreatmentScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  const { user } = useAuth();

  // Treatment state
  const [implantRecords, setImplantRecords] = useState<ImplantRecord[]>([]);
  const [crownRecords, setCrownRecords] = useState<CrownRecord[]>([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [treatmentCompleted, setTreatmentCompleted] = useState(false);
  const [completedAt, setCompletedAt] = useState<Date | null>(null);

  // Form state for implants
  const [implantToothNumber, setImplantToothNumber] = useState('');
  const [selectedImplantType, setSelectedImplantType] = useState<'single-implant' | 'bone-grafting' | 'sinus-lift'>('single-implant');
  const [implantNotes, setImplantNotes] = useState('');

  // Form state for crowns
  const [crownToothNumber, setCrownToothNumber] = useState('');
  const [crownNotes, setCrownNotes] = useState('');

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<{ type: 'implant' | 'crown'; data: any } | null>(null);

  // Calculate ODA billing codes and total cost
  const billingCalculation = useMemo(() => {
    const billingCodes: Array<{
      code: string;
      price: number;
      description: string;
      tooth?: string;
      type: string;
    }> = [];

    let totalCost = 0;

    // Add implant records
    implantRecords.forEach(record => {
      const odaInfo = ODA_FEES[record.implantType];
      if (odaInfo) {
        billingCodes.push({
          code: odaInfo.code,
          price: odaInfo.price,
          description: odaInfo.description,
          tooth: record.toothNumber,
          type: 'implant',
        });
        totalCost += odaInfo.price;
      }
    });

    // Add crown records
    crownRecords.forEach(record => {
      const odaInfo = ODA_FEES['implant-crown'];
      billingCodes.push({
        code: odaInfo.code,
        price: odaInfo.price,
        description: odaInfo.description,
        tooth: record.toothNumber,
        type: 'crown',
      });
      totalCost += odaInfo.price;
    });

    return { billingCodes, totalCost };
  }, [implantRecords, crownRecords]);

  const { billingCodes, totalCost } = billingCalculation;

  const validateToothNumber = (tooth: string): boolean => {
    const num = parseInt(tooth);
    if (isNaN(num)) return false;
    
    const validRanges = [
      [11, 18], [21, 28],
      [31, 38], [41, 48]
    ];
    
    return validRanges.some(([min, max]) => num >= min && num <= max);
  };

  const handleAddImplant = () => {
    if (!implantToothNumber.trim()) {
      Alert.alert('Error', 'Please enter a tooth number');
      return;
    }

    if (!validateToothNumber(implantToothNumber)) {
      Alert.alert(
        'Invalid Tooth Number',
        'Please enter a valid tooth number (11-18, 21-28, 31-38, 41-48)'
      );
      return;
    }

    const existingImplant = implantRecords.find(r => r.toothNumber === implantToothNumber);
    if (existingImplant) {
      Alert.alert(
        'Tooth Already Recorded',
        `Tooth ${implantToothNumber} already has an implant record. Would you like to edit it?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Edit', onPress: () => handleEditImplant(existingImplant) }
        ]
      );
      return;
    }

    const newRecord: ImplantRecord = {
      id: uuid.v4() as string,
      toothNumber: implantToothNumber,
      implantType: selectedImplantType,
      notes: implantNotes.trim(),
      addedAt: new Date(),
    };

    setImplantRecords([...implantRecords, newRecord]);

    // Reset form
    setImplantToothNumber('');
    setSelectedImplantType('single-implant');
    setImplantNotes('');

    const odaInfo = ODA_FEES[selectedImplantType];
    Alert.alert(
      'Success',
      `Implant recorded successfully\n\n${odaInfo.description}\nTooth: ${implantToothNumber}\nODA Code: ${odaInfo.code} - $${odaInfo.price}`
    );
  };

  const handleAddCrown = () => {
    if (!crownToothNumber.trim()) {
      Alert.alert('Error', 'Please enter a tooth number');
      return;
    }

    if (!validateToothNumber(crownToothNumber)) {
      Alert.alert(
        'Invalid Tooth Number',
        'Please enter a valid tooth number (11-18, 21-28, 31-38, 41-48)'
      );
      return;
    }

    const existingCrown = crownRecords.find(r => r.toothNumber === crownToothNumber);
    if (existingCrown) {
      Alert.alert(
        'Tooth Already Recorded',
        `Tooth ${crownToothNumber} already has a crown record. Would you like to edit it?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Edit', onPress: () => handleEditCrown(existingCrown) }
        ]
      );
      return;
    }

    const newRecord: CrownRecord = {
      id: uuid.v4() as string,
      toothNumber: crownToothNumber,
      notes: crownNotes.trim(),
      addedAt: new Date(),
    };

    setCrownRecords([...crownRecords, newRecord]);

    // Reset form
    setCrownToothNumber('');
    setCrownNotes('');

    const odaInfo = ODA_FEES['implant-crown'];
    Alert.alert(
      'Success',
      `Crown recorded successfully\n\nTooth: ${crownToothNumber}\nODA Code: ${odaInfo.code} - $${odaInfo.price}`
    );
  };

  const handleEditImplant = (record: ImplantRecord) => {
    setEditingItem({ type: 'implant', data: record });
    setModalVisible(true);
  };

  const handleEditCrown = (record: CrownRecord) => {
    setEditingItem({ type: 'crown', data: record });
    setModalVisible(true);
  };

  const handleUpdateItem = (updatedData: any) => {
    if (!editingItem) return;

    if (editingItem.type === 'implant') {
      setImplantRecords(implantRecords.map(r =>
        r.id === editingItem.data.id ? { ...r, ...updatedData } : r
      ));
    } else {
      setCrownRecords(crownRecords.map(r =>
        r.id === editingItem.data.id ? { ...r, ...updatedData } : r
      ));
    }

    setModalVisible(false);
    setEditingItem(null);
  };

  const handleRemoveImplant = (recordId: string) => {
    const record = implantRecords.find(r => r.id === recordId);
    if (!record) return;

    Alert.alert(
      'Remove Implant',
      `Remove implant record for tooth ${record.toothNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => setImplantRecords(implantRecords.filter(r => r.id !== recordId))
        }
      ]
    );
  };

  const handleRemoveCrown = (recordId: string) => {
    const record = crownRecords.find(r => r.id === recordId);
    if (!record) return;

    Alert.alert(
      'Remove Crown',
      `Remove crown record for tooth ${record.toothNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => setCrownRecords(crownRecords.filter(r => r.id !== recordId))
        }
      ]
    );
  };

  const saveTreatmentToDatabase = async () => {
    try {
      const clinicianName = user?.email || 'Unknown Clinician';
      const completedDate = new Date();

      await database.write(async () => {
        // Save implant records
        for (const record of implantRecords) {
          const treatmentId = uuid.v4();
          const odaInfo = ODA_FEES[record.implantType];

          const notesText = record.notes
            ? `${odaInfo.description} - Tooth ${record.toothNumber}. ${record.notes}`
            : `${odaInfo.description} - Tooth ${record.toothNumber}`;

          await database.get<Treatment>('treatments').create(treatment => {
            treatment._raw.id = treatmentId;
            treatment.patientId = patientId;
            treatment.type = 'implant';
            treatment.tooth = record.toothNumber;
            treatment.units = 1;
            treatment.value = odaInfo.price;
            treatment.billingCodes = JSON.stringify([{
              code: odaInfo.code,
              price: odaInfo.price,
              description: odaInfo.description,
              implantType: record.implantType
            }]);
            treatment.notes = notesText;
            treatment.clinicianName = clinicianName;
            treatment.completedAt = completedDate;
          });
        }

        // Save crown records
        for (const record of crownRecords) {
          const treatmentId = uuid.v4();
          const odaInfo = ODA_FEES['implant-crown'];

          const notesText = record.notes
            ? `${odaInfo.description} - Tooth ${record.toothNumber}. ${record.notes}`
            : `${odaInfo.description} - Tooth ${record.toothNumber}`;

          await database.get<Treatment>('treatments').create(treatment => {
            treatment._raw.id = treatmentId;
            treatment.patientId = patientId;
            treatment.type = 'implant';
            treatment.tooth = record.toothNumber;
            treatment.units = 1;
            treatment.value = odaInfo.price;
            treatment.billingCodes = JSON.stringify([{
              code: odaInfo.code,
              price: odaInfo.price,
              description: odaInfo.description
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
            treatment.type = 'implant';
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

      console.log('✅ Implant treatment saved to database:', {
        patientId,
        implantsCount: implantRecords.length,
        crownsCount: crownRecords.length,
        totalCost: `$${totalCost}`,
        clinician: clinicianName,
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
        'Please record at least one implant or crown before completing the treatment.',
        [{ text: 'OK' }]
      );
      return;
    }

    const odaCodesText = billingCodes.map(code =>
      `${code.code}: $${code.price} (${code.description}${code.tooth ? ` - Tooth ${code.tooth}` : ''})`
    ).join('\n• ');

    Alert.alert(
      'Complete Treatment',
      `Complete implant treatment for this patient?\n\nTreatment Summary:\n• Total Implants: ${implantRecords.length}\n• Total Crowns: ${crownRecords.length}\n\nODA Billing Codes:\n• ${odaCodesText}\n\nTotal Cost: $${totalCost.toFixed(2)}\n\nThis will save all records to the database.`,
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
                `✅ Implant treatment completed and saved!\n\nTotal ODA Billing: $${totalCost.toFixed(2)}\n\nTreatment Details:\n• Patient ID: ${patientId}\n• Total Implants: ${implantRecords.length}\n• Total Crowns: ${crownRecords.length}\n• Billing Codes: ${billingCodes.length}\n• Completed: ${new Date().toLocaleString()}`
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
            setImplantRecords([]);
            setCrownRecords([]);
            setGeneralNotes('');
            setTreatmentCompleted(false);
            setCompletedAt(null);
            Alert.alert('Cleared', 'All treatment data has been cleared.');
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>🦷 Implant Treatment</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

      {completedAt && (
        <View style={styles.completedBanner}>
          <Text style={styles.completedText}>✅ Treatment Completed</Text>
          <Text style={styles.completedDate}>
            {completedAt.toLocaleDateString()} at {completedAt.toLocaleTimeString()}
          </Text>
        </View>
      )}

      {/* Add Implant Form */}
      {!treatmentCompleted && (
        <View style={styles.addImplantSection}>
          <Text style={styles.sectionTitle}>Add Implant</Text>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Tooth Number:</Text>
            <TextInput
              style={styles.toothNumberInput}
              value={implantToothNumber}
              onChangeText={setImplantToothNumber}
              placeholder="e.g., 11, 26, 48"
              keyboardType="numeric"
              maxLength={2}
            />
          </View>

          <View style={styles.formColumn}>
            <Text style={styles.formLabel}>Implant Type:</Text>
            <View style={styles.implantTypeSelector}>
              <Pressable
                style={[
                  styles.implantTypeButton,
                  selectedImplantType === 'single-implant' && styles.implantTypeButtonSelected
                ]}
                onPress={() => setSelectedImplantType('single-implant')}
              >
                <Text style={[
                  styles.implantTypeButtonText,
                  selectedImplantType === 'single-implant' && styles.implantTypeButtonTextSelected
                ]}>
                  Single Implant
                </Text>
                <Text style={[
                  styles.implantTypePrice,
                  selectedImplantType === 'single-implant' && styles.implantTypePriceSelected
                ]}>
                  ${ODA_FEES['single-implant'].price}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.implantTypeButton,
                  selectedImplantType === 'bone-grafting' && styles.implantTypeButtonSelected
                ]}
                onPress={() => setSelectedImplantType('bone-grafting')}
              >
                <Text style={[
                  styles.implantTypeButtonText,
                  selectedImplantType === 'bone-grafting' && styles.implantTypeButtonTextSelected
                ]}>
                  Bone Grafting
                </Text>
                <Text style={[
                  styles.implantTypePrice,
                  selectedImplantType === 'bone-grafting' && styles.implantTypePriceSelected
                ]}>
                  ${ODA_FEES['bone-grafting'].price}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.implantTypeButton,
                  selectedImplantType === 'sinus-lift' && styles.implantTypeButtonSelected
                ]}
                onPress={() => setSelectedImplantType('sinus-lift')}
              >
                <Text style={[
                  styles.implantTypeButtonText,
                  selectedImplantType === 'sinus-lift' && styles.implantTypeButtonTextSelected
                ]}>
                  Sinus Lift
                </Text>
                <Text style={[
                  styles.implantTypePrice,
                  selectedImplantType === 'sinus-lift' && styles.implantTypePriceSelected
                ]}>
                  ${ODA_FEES['sinus-lift'].price}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.odaInfo}>
            <Text style={styles.odaInfoText}>
              💰 ODA Code: {ODA_FEES[selectedImplantType].code} - ${ODA_FEES[selectedImplantType].price}
            </Text>
          </View>

          <View style={styles.formColumn}>
            <Text style={styles.formLabel}>Notes (optional):</Text>
            <TextInput
              style={styles.notesInput}
              value={implantNotes}
              onChangeText={setImplantNotes}
              placeholder="Details about the implant procedure..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <Pressable style={styles.addButton} onPress={handleAddImplant}>
            <Text style={styles.addButtonText}>➕ Add Implant</Text>
          </Pressable>
        </View>
      )}

      {/* Add Crown Form */}
      {!treatmentCompleted && (
        <View style={styles.addCrownSection}>
          <Text style={styles.sectionTitle}>Add Implant Crown</Text>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Tooth Number:</Text>
            <TextInput
              style={styles.toothNumberInput}
              value={crownToothNumber}
              onChangeText={setCrownToothNumber}
              placeholder="e.g., 11, 26, 48"
              keyboardType="numeric"
              maxLength={2}
            />
          </View>

          <View style={styles.odaInfo}>
            <Text style={styles.odaInfoText}>
              💰 ODA Code: {ODA_FEES['implant-crown'].code} - ${ODA_FEES['implant-crown'].price}
            </Text>
          </View>

          <View style={styles.formColumn}>
            <Text style={styles.formLabel}>Notes (optional):</Text>
            <TextInput
              style={styles.notesInput}
              value={crownNotes}
              onChangeText={setCrownNotes}
              placeholder="Details about the crown placement..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <Pressable style={styles.addButton} onPress={handleAddCrown}>
            <Text style={styles.addButtonText}>➕ Add Crown</Text>
          </Pressable>
        </View>
      )}

      {/* Recorded Implants */}
      {implantRecords.length > 0 && (
        <View style={styles.recordsListSection}>
          <Text style={styles.sectionTitle}>
            Recorded Implants ({implantRecords.length})
          </Text>

          {implantRecords.map((record) => {
            const odaInfo = ODA_FEES[record.implantType];
            return (
              <View key={record.id} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <Text style={styles.toothNumberText}>Tooth {record.toothNumber}</Text>
                  {!treatmentCompleted && (
                    <View style={styles.actionButtons}>
                      <Pressable
                        style={styles.editButton}
                        onPress={() => handleEditImplant(record)}
                      >
                        <Text style={styles.editButtonText}>✏️</Text>
                      </Pressable>
                      <Pressable
                        style={styles.deleteButton}
                        onPress={() => handleRemoveImplant(record.id)}
                      >
                        <Text style={styles.deleteButtonText}>🗑️</Text>
                      </Pressable>
                    </View>
                  )}
                </View>

                <Text style={styles.implantTypeLabel}>{odaInfo.description}</Text>

                <View style={styles.odaRow}>
                  <Text style={styles.odaCode}>ODA: {odaInfo.code}</Text>
                  <Text style={styles.odaPrice}>${odaInfo.price}</Text>
                </View>

                {record.notes && (
                  <Text style={styles.recordNotes}>
                    Notes: {record.notes}
                  </Text>
                )}

                <Text style={styles.recordDate}>
                  Added: {record.addedAt.toLocaleString()}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Recorded Crowns */}
      {crownRecords.length > 0 && (
        <View style={styles.recordsListSection}>
          <Text style={styles.sectionTitle}>
            Recorded Crowns ({crownRecords.length})
          </Text>

          {crownRecords.map((record) => {
            const odaInfo = ODA_FEES['implant-crown'];
            return (
              <View key={record.id} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <Text style={styles.toothNumberText}>Tooth {record.toothNumber}</Text>
                  {!treatmentCompleted && (
                    <View style={styles.actionButtons}>
                      <Pressable
                        style={styles.editButton}
                        onPress={() => handleEditCrown(record)}
                      >
                        <Text style={styles.editButtonText}>✏️</Text>
                      </Pressable>
                      <Pressable
                        style={styles.deleteButton}
                        onPress={() => handleRemoveCrown(record.id)}
                      >
                        <Text style={styles.deleteButtonText}>🗑️</Text>
                      </Pressable>
                    </View>
                  )}
                </View>

                <Text style={styles.implantTypeLabel}>{odaInfo.description}</Text>

                <View style={styles.odaRow}>
                  <Text style={styles.odaCode}>ODA: {odaInfo.code}</Text>
                  <Text style={styles.odaPrice}>${odaInfo.price}</Text>
                </View>

                {record.notes && (
                  <Text style={styles.recordNotes}>
                    Notes: {record.notes}
                  </Text>
                )}

                <Text style={styles.recordDate}>
                  Added: {record.addedAt.toLocaleString()}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* General Treatment Notes */}
      {!treatmentCompleted && (
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

      {treatmentCompleted && generalNotes && (
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
              <Text style={styles.billingDescription}>
                {code.description}{code.tooth ? ` - Tooth ${code.tooth}` : ''}
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
          disabled={treatmentCompleted}
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
            Clear All
          </Text>
        </Pressable>
      </View>

      {/* Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingItem?.type === 'implant' ? 'Edit Implant' : 'Edit Crown'}
            </Text>

            {editingItem && (
              <EditForm
                item={editingItem}
                onUpdate={handleUpdateItem}
                onCancel={() => setModalVisible(false)}
              />
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

// Edit Form Component
const EditForm = ({ item, onUpdate, onCancel }: {
  item: { type: 'implant' | 'crown'; data: any };
  onUpdate: (data: any) => void;
  onCancel: () => void;
}) => {
  const [implantType, setImplantType] = useState<'single-implant' | 'bone-grafting' | 'sinus-lift'>(
    item.type === 'implant' ? item.data.implantType : 'single-implant'
  );
  const [notes, setNotes] = useState(item.data.notes);

  const handleUpdate = () => {
    if (item.type === 'implant') {
      onUpdate({ implantType, notes: notes.trim() });
    } else {
      onUpdate({ notes: notes.trim() });
    }
  };

  return (
    <View>
      {item.type === 'implant' && (
        <>
          <View style={styles.formColumn}>
            <Text style={styles.formLabel}>Implant Type:</Text>
            <View style={styles.implantTypeSelector}>
              <Pressable
                style={[
                  styles.implantTypeButton,
                  implantType === 'single-implant' && styles.implantTypeButtonSelected
                ]}
                onPress={() => setImplantType('single-implant')}
              >
                <Text style={[
                  styles.implantTypeButtonText,
                  implantType === 'single-implant' && styles.implantTypeButtonTextSelected
                ]}>
                  Single Implant
                </Text>
                <Text style={[
                  styles.implantTypePrice,
                  implantType === 'single-implant' && styles.implantTypePriceSelected
                ]}>
                  ${ODA_FEES['single-implant'].price}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.implantTypeButton,
                  implantType === 'bone-grafting' && styles.implantTypeButtonSelected
                ]}
                onPress={() => setImplantType('bone-grafting')}
              >
                <Text style={[
                  styles.implantTypeButtonText,
                  implantType === 'bone-grafting' && styles.implantTypeButtonTextSelected
                ]}>
                  Bone Grafting
                </Text>
                <Text style={[
                  styles.implantTypePrice,
                  implantType === 'bone-grafting' && styles.implantTypePriceSelected
                ]}>
                  ${ODA_FEES['bone-grafting'].price}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.implantTypeButton,
                  implantType === 'sinus-lift' && styles.implantTypeButtonSelected
                ]}
                onPress={() => setImplantType('sinus-lift')}
              >
                <Text style={[
                  styles.implantTypeButtonText,
                  implantType === 'sinus-lift' && styles.implantTypeButtonTextSelected
                ]}>
                  Sinus Lift
                </Text>
                <Text style={[
                  styles.implantTypePrice,
                  implantType === 'sinus-lift' && styles.implantTypePriceSelected
                ]}>
                  ${ODA_FEES['sinus-lift'].price}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.odaInfo}>
            <Text style={styles.odaInfoText}>
              💰 ODA Code: {ODA_FEES[implantType].code} - ${ODA_FEES[implantType].price}
            </Text>
          </View>
        </>
      )}

      <View style={styles.formColumn}>
        <Text style={styles.formLabel}>Notes:</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Details about the procedure..."
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
  addImplantSection: {
    backgroundColor: '#e7f3ff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#b3d9ff',
  },
  addCrownSection: {
    backgroundColor: '#fff3e0',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffe0b2',
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
    marginBottom: 8,
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
  implantTypeSelector: {
    gap: 8,
  },
  implantTypeButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  implantTypeButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  implantTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  implantTypeButtonTextSelected: {
    color: '#fff',
  },
  implantTypePrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#28a745',
  },
  implantTypePriceSelected: {
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
  recordsListSection: {
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
  recordCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#17a2b8',
  },
  recordHeader: {
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
  implantTypeLabel: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 8,
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
  recordNotes: {
    fontSize: 14,
    color: '#495057',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 12,
    color: '#6c757d',
  },
  generalNotesSection: {
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
  generalNotesInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 100,
  },
  generalNotesDisplay: {
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
  generalNotesText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
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
    borderLeftColor: '#17a2b8',
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
    color: '#17a2b8',
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