import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert } from 'react-native';
import { useHygieneTreatment } from '../contexts/HygieneTreatmentContext';
import { useAuth } from '../contexts/AuthContext';
import { database } from '../db';
import Treatment from '../db/models/Treatment';
import uuid from 'react-native-uuid';
import AudioRecorder from '../components/AudioRecorder';

const HygieneTreatmentScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  const { user } = useAuth(); // Get current clinician info
  const { 
    treatmentState, 
    updateScalingUnits, 
    updateRootPlaningUnits, 
    updateNotes,
    markCompleted,
    resetTreatment 
  } = useHygieneTreatment();

  const { scalingUnits, rootPlaningUnits, notes, completedAt } = treatmentState;

  // Calculate billing codes based on units performed
  const billingCodes = useMemo(() => {
    const codes = [];
    const totalUnits = scalingUnits + rootPlaningUnits;

    // Basic prophylaxis if no scaling/root planing
    if (totalUnits === 0) {
      codes.push({
        code: 'D1110',
        description: 'Prophylaxis - Adult',
        units: 1,
        category: 'Preventive'
      });
    } else {
      // Scaling and root planing codes
      if (scalingUnits > 0) {
        if (scalingUnits <= 3) {
          codes.push({
            code: 'D4341',
            description: 'Periodontal scaling/root planing (1-3 teeth)',
            units: scalingUnits,
            category: 'Periodontics'
          });
        } else {
          codes.push({
            code: 'D4342',
            description: 'Periodontal scaling/root planing (4+ teeth)',
            units: scalingUnits,
            category: 'Periodontics'
          });
        }
      }

      // Root planing specific codes
      if (rootPlaningUnits > 0) {
        codes.push({
          code: 'D4381',
          description: 'Root planing per quadrant',
          units: rootPlaningUnits,
          category: 'Periodontics'
        });
      }

      // Full mouth debridement for extensive treatment
      if (totalUnits >= 16) {
        codes.push({
          code: 'D4355',
          description: 'Full mouth debridement',
          units: 1,
          category: 'Periodontics'
        });
      }
    }

    return codes;
  }, [scalingUnits, rootPlaningUnits]);

  const saveTreatmentToDatabase = async () => {
    try {
      const treatmentId = uuid.v4();
      const completedDate = new Date();
      const clinicianName = user?.email || 'Unknown Clinician';

      await database.write(async () => {
        await database.get<Treatment>('treatments').create(treatment => {
          treatment._raw.id = treatmentId;
          treatment.patientId = patientId;
          treatment.visitId = ''; // No specific visit for direct treatments
          treatment.type = 'hygiene';
          treatment.tooth = 'N/A'; // Full mouth hygiene treatment
          treatment.surface = 'N/A'; // Not applicable for hygiene
          treatment.units = scalingUnits + rootPlaningUnits; // Total units
          treatment.value = 0; // Can be calculated later based on fee guide
          treatment.billingCodes = JSON.stringify(billingCodes);
          treatment.notes = notes || '';
          treatment.clinicianName = clinicianName;
          treatment.completedAt = completedDate;
        });
      });

      console.log('✅ Hygiene treatment saved to database:', {
        treatmentId,
        patientId,
        type: 'hygiene',
        scalingUnits,
        rootPlaningUnits,
        totalUnits: scalingUnits + rootPlaningUnits,
        billingCodes: billingCodes.length,
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

  const handleCompletetreatment = async () => {
    if (scalingUnits === 0 && rootPlaningUnits === 0) {
      Alert.alert(
        'No Treatment Recorded',
        'Please enter the units of scaling and/or root planing performed before completing the treatment.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Complete Treatment',
      `Complete hygiene treatment for this patient?\n\nTreatment Summary:\n• Scaling Units: ${scalingUnits}\n• Root Planing Units: ${rootPlaningUnits}\n• Total Codes: ${billingCodes.length}\n\nThis will save the treatment to the database.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Complete & Save', 
          onPress: async () => {
            // Save to database first
            const saved = await saveTreatmentToDatabase();
            
            if (saved) {
              // Mark as completed in context
              markCompleted();
              Alert.alert(
                'Success', 
                '✅ Hygiene treatment completed and saved to database!\n\n' +
                `Treatment Details:\n` +
                `• Patient ID: ${patientId}\n` +
                `• Scaling Units: ${scalingUnits}\n` +
                `• Root Planing Units: ${rootPlaningUnits}\n` +
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
      'Are you sure you want to reset all treatment data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: resetTreatment }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>🪥 Hygiene Treatment</Text>
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

      {/* Treatment Input Section */}
      <View style={styles.inputSection}>
        <Text style={styles.sectionTitle}>Treatment Performed</Text>
        
        {/* Scaling Units */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Scaling Units Performed</Text>
          <View style={styles.unitInputContainer}>
            <Pressable 
              style={styles.unitButton} 
              onPress={() => updateScalingUnits(scalingUnits - 1)}
            >
              <Text style={styles.unitButtonText}>−</Text>
            </Pressable>
            
            <TextInput
              style={styles.unitInput}
              value={scalingUnits.toString()}
              onChangeText={(text) => {
                const num = parseInt(text) || 0;
                updateScalingUnits(num);
              }}
              keyboardType="numeric"
              selectTextOnFocus
            />
            
            <Pressable 
              style={styles.unitButton} 
              onPress={() => updateScalingUnits(scalingUnits + 1)}
            >
              <Text style={styles.unitButtonText}>+</Text>
            </Pressable>
          </View>
          <Text style={styles.inputHint}>
            Number of scaling units performed on patient
          </Text>
        </View>

        {/* Root Planing Units */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Root Planing Units Performed</Text>
          <View style={styles.unitInputContainer}>
            <Pressable 
              style={styles.unitButton} 
              onPress={() => updateRootPlaningUnits(rootPlaningUnits - 1)}
            >
              <Text style={styles.unitButtonText}>−</Text>
            </Pressable>
            
            <TextInput
              style={styles.unitInput}
              value={rootPlaningUnits.toString()}
              onChangeText={(text) => {
                const num = parseInt(text) || 0;
                updateRootPlaningUnits(num);
              }}
              keyboardType="numeric"
              selectTextOnFocus
            />
            
            <Pressable 
              style={styles.unitButton} 
              onPress={() => updateRootPlaningUnits(rootPlaningUnits + 1)}
            >
              <Text style={styles.unitButtonText}>+</Text>
            </Pressable>
          </View>
          <Text style={styles.inputHint}>
            Number of root planing units performed on patient
          </Text>
        </View>

        {/* Notes */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Treatment Notes (Optional)</Text>
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

      {/* Generated Billing Codes */}
      <View style={styles.billingSection}>
        <Text style={styles.sectionTitle}>Generated Billing Codes</Text>
        
        {billingCodes.length === 0 ? (
          <Text style={styles.noCodesText}>
            Enter treatment units to generate billing codes
          </Text>
        ) : (
          billingCodes.map((code, index) => (
            <View key={index} style={styles.codeCard}>
              <View style={styles.codeHeader}>
                <Text style={styles.codeNumber}>{code.code}</Text>
                <Text style={styles.codeCategory}>{code.category}</Text>
              </View>
              <Text style={styles.codeDescription}>{code.description}</Text>
              <Text style={styles.codeUnits}>Units: {code.units}</Text>
            </View>
          ))
        )}
      </View>

      {/* Treatment Summary */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Treatment Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Scaling Units:</Text>
            <Text style={styles.summaryValue}>{scalingUnits}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Root Planing Units:</Text>
            <Text style={styles.summaryValue}>{rootPlaningUnits}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Billing Codes Generated:</Text>
            <Text style={styles.summaryValue}>{billingCodes.length}</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <Pressable 
          style={[styles.actionButton, styles.completeButton]} 
          onPress={handleCompletetreatment}
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
  unitInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  unitButton: {
    backgroundColor: '#007bff',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unitButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  unitInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 16,
    minWidth: 80,
  },
  inputHint: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
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
    marginBottom: 4,
  },
  codeUnits: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
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
});