import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useHygieneTreatment, FluorideType } from '../contexts/HygieneTreatmentContext';
import { database } from '../db';
import Treatment from '../db/models/Treatment';
import uuid from 'react-native-uuid';

// ODA Fee Structure for Hygiene Treatments
const ODA_FEES = {
  scaling: {
    1: { code: '11111', price: 74 },
    2: { code: '11112', price: 142 },
    3: { code: '11113', price: 200 },
    4: { code: '11114', price: 261 },
  },
  polishing: {
    0.5: { code: '11107', price: 29 },
    1: { code: '11101', price: 36 },
  },
  fluoride: {
    rinse: { code: '12111', price: 9 },
    varnish: { code: '12113', price: 38 },
  },
};

const HygieneTreatmentScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  const { user } = useAuth();
  
  // Use context for state management
  const {
    treatmentState,
    updateScalingUnits,
    updatePolishingUnits,
    updateFluorideType,
    updatePrescribedMedication,
    updateNotes,
    markCompleted,
    resetTreatment,
  } = useHygieneTreatment();

  const {
    scalingUnits,
    polishingUnits,
    fluorideType,
    prescribedMedication,
    notes,
    completedAt,
  } = treatmentState;

  // Calculate ODA codes and total cost
  const calculateODABilling = () => {
    const billingCodes: Array<{
      code: string;
      description: string;
      price: number;
      category: string;
    }> = [];

    let totalCost = 0;

    // Scaling codes
    if (scalingUnits > 0 && scalingUnits <= 4) {
      const scalingInfo = ODA_FEES.scaling[scalingUnits as keyof typeof ODA_FEES.scaling];
      if (scalingInfo) {
        billingCodes.push({
          code: scalingInfo.code,
          description: `Scaling - ${scalingUnits} unit${scalingUnits > 1 ? 's' : ''}`,
          price: scalingInfo.price,
          category: 'Hygiene'
        });
        totalCost += scalingInfo.price;
      }
    }

    // Polishing codes
    if (polishingUnits > 0) {
      const polishingInfo = ODA_FEES.polishing[polishingUnits as keyof typeof ODA_FEES.polishing];
      if (polishingInfo) {
        billingCodes.push({
          code: polishingInfo.code,
          description: `Polishing - ${polishingUnits} unit${polishingUnits > 1 ? 's' : ''}`,
          price: polishingInfo.price,
          category: 'Hygiene'
        });
        totalCost += polishingInfo.price;
      }
    }

    // Fluoride codes
    if (fluorideType !== 'none') {
      const fluorideInfo = ODA_FEES.fluoride[fluorideType as keyof typeof ODA_FEES.fluoride];
      if (fluorideInfo) {
        billingCodes.push({
          code: fluorideInfo.code,
          description: `Fluoride ${fluorideType === 'rinse' ? 'Rinse' : 'Varnish'}`,
          price: fluorideInfo.price,
          category: 'Hygiene'
        });
        totalCost += fluorideInfo.price;
      }
    }

    return { billingCodes, totalCost };
  };

  const { billingCodes, totalCost } = calculateODABilling();

  const saveTreatmentToDatabase = async () => {
    try {
      const treatmentId = uuid.v4();
      const completedDate = new Date();
      const clinicianName = user?.email || 'Unknown Clinician';
  
      const treatmentData = {
        scalingUnits,
        polishingUnits,
        fluorideType,
        prescribedMedication,
        notes,
        odaCodes: billingCodes,
        totalCost
      };
  
      await database.write(async () => {
        await database.get<Treatment>('treatments').create(treatment => {
          treatment._raw.id = treatmentId;
          treatment.patientId = patientId;
          treatment.visitId = '';
          treatment.type = 'hygiene';
          treatment.tooth = 'N/A';
          treatment.surface = 'N/A';
          treatment.units = 1; // ← CHANGE THIS TO 1
          treatment.value = totalCost; // ← Keep this as total cost
          treatment.billingCodes = JSON.stringify(billingCodes);
          treatment.notes = JSON.stringify(treatmentData);
          treatment.clinicianName = clinicianName;
          treatment.completedAt = completedDate;
        });
      });

      console.log('✅ Hygiene treatment saved to database:', {
        treatmentId,
        patientId,
        type: 'hygiene',
        scalingUnits,
        polishingUnits,
        fluorideType,
        odaCodes: billingCodes.map(code => `${code.code}: $${code.price}`),
        totalCost: `$${totalCost}`,
        clinician: clinicianName,
        completedAt: completedDate.toISOString()
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to save hygiene treatment:', error);
      Alert.alert(
        'Save Error', 
        'Failed to save treatment to database. Please try again.',
        [{ text: 'OK' }]
      );
      return false;
    }
  };

  const handleCompleteTreatment = async () => {
    if (scalingUnits === 0 && polishingUnits === 0) {
      Alert.alert(
        'No Treatment Recorded',
        'Please enter the units of scaling and/or polishing performed before completing the treatment.',
        [{ text: 'OK' }]
      );
      return;
    }

    const fluorideText = fluorideType === 'none' ? 'None' : 
                        fluorideType === 'rinse' ? 'Fluoride Rinse' : 'Fluoride Varnish';

    const odaCodesText = billingCodes.map(code => `${code.code}: $${code.price}`).join('\n• ');

    Alert.alert(
      'Complete Treatment',
      `Complete hygiene treatment for this patient?\n\nTreatment Details:\n• Scaling Units: ${scalingUnits}\n• Polishing Units: ${polishingUnits}\n• Fluoride: ${fluorideText}\n• Medication: ${prescribedMedication || 'None'}\n\nODA Billing Codes:\n• ${odaCodesText}\n\nTotal Cost: $${totalCost.toFixed(2)}\n\nThis will save the treatment to the database.`,
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
                `✅ Hygiene treatment completed and saved to database!\n\nTotal ODA Billing: $${totalCost.toFixed(2)}`
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

  const ScalingUnitButton = ({ value, selected, onPress }: { value: string; selected: boolean; onPress: () => void }) => (
    <Pressable 
      style={[styles.unitOptionButton, selected && styles.unitOptionButtonSelected]} 
      onPress={onPress}
    >
      <Text style={[styles.unitOptionText, selected && styles.unitOptionTextSelected]}>
        {value}
      </Text>
    </Pressable>
  );

  const PolishingUnitButton = ({ value, selected, onPress }: { value: string; selected: boolean; onPress: () => void }) => (
    <Pressable 
      style={[styles.unitOptionButton, selected && styles.unitOptionButtonSelected]} 
      onPress={onPress}
    >
      <Text style={[styles.unitOptionText, selected && styles.unitOptionTextSelected]}>
        {value}
      </Text>
    </Pressable>
  );

  const FluorideButton = ({ type, selected, onPress, children }: { 
    type: FluorideType; 
    selected: boolean; 
    onPress: () => void; 
    children: React.ReactNode;
  }) => (
    <Pressable 
      style={[styles.fluorideButton, selected && styles.fluorideButtonSelected]} 
      onPress={onPress}
    >
      <Text style={[styles.fluorideButtonText, selected && styles.fluorideButtonTextSelected]}>
        {children}
      </Text>
    </Pressable>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>🪥 Hygiene Treatment</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

      {/* State Preservation Indicator */}
      {(scalingUnits > 0 || polishingUnits > 0 || fluorideType !== 'none' || prescribedMedication || notes) && !completedAt && (
        <View style={styles.stateIndicator}>
          <Text style={styles.stateIndicatorText}>
            ✅ State preserved: Scaling {scalingUnits}, Polishing {polishingUnits}
            {fluorideType !== 'none' && `, Fluoride: ${fluorideType}`}
            {totalCost > 0 && ` • Total: $${totalCost.toFixed(2)}`}
          </Text>
        </View>
      )}

      {completedAt && (
        <View style={styles.completedBanner}>
          <Text style={styles.completedText}>✅ Treatment Completed</Text>
          <Text style={styles.completedDate}>
            {completedAt.toLocaleDateString()} at{' '}
            {completedAt.toLocaleTimeString()}
          </Text>
        </View>
      )}

      {/* Treatment Input Section */}
      <View style={styles.inputSection}>
        <Text style={styles.sectionTitle}>Treatment Performed</Text>
        
        {/* Scaling Units */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Scaling Units Performed</Text>
          <View style={styles.unitOptionsContainer}>
            <ScalingUnitButton 
              value="0" 
              selected={scalingUnits === 0} 
              onPress={() => updateScalingUnits(0)} 
            />
            <ScalingUnitButton 
              value="1" 
              selected={scalingUnits === 1} 
              onPress={() => updateScalingUnits(1)} 
            />
            <ScalingUnitButton 
              value="2" 
              selected={scalingUnits === 2} 
              onPress={() => updateScalingUnits(2)} 
            />
            <ScalingUnitButton 
              value="3" 
              selected={scalingUnits === 3} 
              onPress={() => updateScalingUnits(3)} 
            />
            <ScalingUnitButton 
              value="4" 
              selected={scalingUnits === 4} 
              onPress={() => updateScalingUnits(4)} 
            />
          </View>
          <Text style={styles.inputHint}>
            Select number of scaling units performed (typically 1-4)
          </Text>
          {scalingUnits > 0 && (
            <View style={styles.odaInfo}>
              <Text style={styles.odaInfoText}>
                💰 ODA Code: {ODA_FEES.scaling[scalingUnits as keyof typeof ODA_FEES.scaling]?.code} - ${ODA_FEES.scaling[scalingUnits as keyof typeof ODA_FEES.scaling]?.price}
              </Text>
            </View>
          )}
        </View>

        {/* Polishing Units */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Polishing Units Performed</Text>
          <View style={styles.unitOptionsContainer}>
            <PolishingUnitButton 
              value="0" 
              selected={polishingUnits === 0} 
              onPress={() => updatePolishingUnits(0)} 
            />
            <PolishingUnitButton 
              value="0.5" 
              selected={polishingUnits === 0.5} 
              onPress={() => updatePolishingUnits(0.5)} 
            />
            <PolishingUnitButton 
              value="1" 
              selected={polishingUnits === 1} 
              onPress={() => updatePolishingUnits(1)} 
            />
          </View>
          <Text style={styles.inputHint}>
            Select polishing units performed (typically 0.5 or 1 unit)
          </Text>
          {polishingUnits > 0 && (
            <View style={styles.odaInfo}>
              <Text style={styles.odaInfoText}>
                💰 ODA Code: {ODA_FEES.polishing[polishingUnits as keyof typeof ODA_FEES.polishing]?.code} - ${ODA_FEES.polishing[polishingUnits as keyof typeof ODA_FEES.polishing]?.price}
              </Text>
            </View>
          )}
        </View>

        {/* Fluoride Treatment */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Fluoride Treatment</Text>
          <View style={styles.fluorideContainer}>
            <FluorideButton 
              type="none"
              selected={fluorideType === 'none'} 
              onPress={() => updateFluorideType('none')}
            >
              None
            </FluorideButton>
            <FluorideButton 
              type="rinse"
              selected={fluorideType === 'rinse'} 
              onPress={() => updateFluorideType('rinse')}
            >
              Fluoride Rinse
            </FluorideButton>
            <FluorideButton 
              type="varnish"
              selected={fluorideType === 'varnish'} 
              onPress={() => updateFluorideType('varnish')}
            >
              Fluoride Varnish
            </FluorideButton>
          </View>
          <Text style={styles.inputHint}>
            Select fluoride treatment performed (optional)
          </Text>
          
          {/* Fluoride Information */}
          {fluorideType === 'rinse' && (
            <View style={styles.fluorideInfo}>
              <Text style={styles.fluorideInfoText}>
                💧 Fluoride rinse typically contains 0.2% sodium fluoride and helps prevent cavities
              </Text>
              <Text style={styles.odaInfoText}>
                💰 ODA Code: {ODA_FEES.fluoride.rinse.code} - ${ODA_FEES.fluoride.rinse.price}
              </Text>
            </View>
          )}
          {fluorideType === 'varnish' && (
            <View style={styles.fluorideInfo}>
              <Text style={styles.fluorideInfoText}>
                🎨 Fluoride varnish provides longer-lasting protection and is applied directly to teeth
              </Text>
              <Text style={styles.odaInfoText}>
                💰 ODA Code: {ODA_FEES.fluoride.varnish.code} - ${ODA_FEES.fluoride.varnish.price}
              </Text>
            </View>
          )}
        </View>

        {/* Prescribed Medication */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Prescribed Medication</Text>
          <TextInput
            style={styles.medicationInput}
            value={prescribedMedication}
            onChangeText={updatePrescribedMedication}
            placeholder="Enter prescribed medication (if any)..."
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
          <Text style={styles.inputHint}>
            Enter any medication prescribed to the patient (optional)
          </Text>
        </View>

        {/* Notes */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Additional Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={updateNotes}
            placeholder="Additional notes about the hygiene treatment..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
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
    </ScrollView>
  );
};

export default HygieneTreatmentScreen;

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
    backgroundColor: '#d4edda',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  stateIndicatorText: {
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
  inputSection: {
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
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#495057',
  },
  unitOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  unitOptionButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  unitOptionButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  unitOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  unitOptionTextSelected: {
    color: '#fff',
  },
  fluorideContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  fluorideButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flex: 1,
    alignItems: 'center',
  },
  fluorideButtonSelected: {
    backgroundColor: '#6f42c1',
    borderColor: '#6f42c1',
  },
  fluorideButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    textAlign: 'center',
  },
  fluorideButtonTextSelected: {
    color: '#fff',
  },
  fluorideInfo: {
    backgroundColor: '#e7f3ff',
    borderRadius: 6,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6f42c1',
  },
  fluorideInfoText: {
    fontSize: 12,
    color: '#495057',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  odaInfo: {
    backgroundColor: '#fff3cd',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
  },
  odaInfoText: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '600',
  },
  inputHint: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  medicationInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 60,
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
});


