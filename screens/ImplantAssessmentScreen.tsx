import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { database } from '../db';
import ImplantAssessment from '../db/models/ImplantAssessment';
import { Q } from '@nozbe/watermelondb';
import uuid from 'react-native-uuid';
import { useImplantAssessment } from '../contexts/ImplantAssessmentContext';

const UPPER_RIGHT = ['11', '12', '13', '14', '15', '16', '17', '18'];
const UPPER_LEFT = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_RIGHT = ['41', '42', '43', '44', '45', '46', '47', '48'];
const LOWER_LEFT = ['31', '32', '33', '34', '35', '36', '37', '38'];

const ImplantAssessmentScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  
  const { 
    implantState,
    updateImplantMode,
    getSelectedTeeth,
    toggleTooth,
    updateBoneGrafting,
    updateTimingMode,
    clearCurrentSelection
  } = useImplantAssessment();

  const { implantMode, boneGraftingPlanned, timingMode } = implantState;
  const selectedTeeth = getSelectedTeeth();

  const toothOffsets: Record<string, { x: number; y: number }> = {
    '21': { x: 20, y: -120 }, '11': { x: -20, y: -120 },
    '22': { x: 55, y: -110 }, '12': { x: -55, y: -110 },
    '23': { x: 90, y: -90 }, '13': { x: -90, y: -90 },
    '24': { x: 110, y: -60 }, '14': { x: -110, y: -60 },
    '25': { x: 120, y: -25 }, '15': { x: -120, y: -25 },
    '26': { x: 125, y: 10 }, '16': { x: -125, y: 10 },
    '27': { x: 125, y: 45 }, '17': { x: -125, y: 45 },
    '28': { x: 125, y: 80 }, '18': { x: -125, y: 80 },
    '31': { x: 20, y: 330 }, '41': { x: -20, y: 330 },
    '32': { x: 55, y: 320 }, '42': { x: -55, y: 320 },
    '33': { x: 90, y: 300 }, '43': { x: -90, y: 300 },
    '34': { x: 110, y: 270 }, '44': { x: -110, y: 270 },
    '35': { x: 120, y: 235 }, '45': { x: -120, y: 235 },
    '36': { x: 125, y: 200 }, '46': { x: -125, y: 200 },
    '37': { x: 125, y: 165 }, '47': { x: -125, y: 165 },
    '38': { x: 125, y: 130 }, '48': { x: -125, y: 130 },
  };

  const saveAssessment = async () => {
    try {
      const collection = database.get<ImplantAssessment>('implant_assessments');
      console.log('🔎 Looking for existing implant assessment for patient:', patientId);
      const existing = await collection
        .query(Q.where('patient_id', Q.eq(patientId)))
        .fetch();

      console.log('🔍 Matched existing implant assessment:', existing);

      const assessmentData = {
        implantMode,
        singleImplantTeeth: implantState.singleImplantTeeth,
        bridgeImplantTeeth: implantState.bridgeImplantTeeth,
        boneGraftingPlanned,
        timingMode,
        timestamp: new Date().toISOString()
      };
      
      const jsonData = JSON.stringify(assessmentData);

      await database.write(async () => {
        console.log("existing implant assessments:")
        console.log(existing)
        console.log("existing length:")
        console.log(existing.length)
        if (existing.length > 0) {
          console.log('🔍 Existing implant assessments for patient', patientId, ':', existing);
          // Update existing record
          await existing[0].update(record => {
            record.data = jsonData;
            record.updatedAt = new Date();
          });
          console.log('✅ Implant assessment updated');
          Alert.alert('✅ Implant assessment updated');
        } else {
          // Create new record
          await collection.create(record => {
            const id = uuid.v4();
            record._raw.id = id;
            record.patientId = patientId; // must match schema!
            record.data = jsonData;
            record.createdAt = new Date();
            record.updatedAt = new Date();
            Alert.alert('✅ Implant assessment created')
            console.log('🔧 Created implant assessment record:', {
              id,
              patient_id: patientId,
              data: jsonData,
            });
          });
        }
      });
    } catch (err) {
      console.error('❌ Failed to save implant assessment:', err);
      Alert.alert('❌ Failed to save implant assessment');
    }
  };

  const handleImplantModeChange = (mode: 'single' | 'bridge') => {
    updateImplantMode(mode);
  };

  const getToothPosition = (toothId: string) => {
    const chartCenter = { x: 180, y: 135 };
    const offset = toothOffsets[toothId];
    
    return {
      left: chartCenter.x + offset.x - 15,
      top: chartCenter.y + offset.y - 15
    };
  };

  const getToothStyle = (toothId: string) => {
    if (selectedTeeth.includes(toothId)) {
      return implantMode === 'single' ? styles.toothSingleImplant : styles.toothBridge;
    }
    return styles.toothNormal;
  };

  const renderTooth = (toothId: string) => {
    const position = getToothPosition(toothId);
    
    return (
      <Pressable
        key={toothId}
        onPress={() => toggleTooth(toothId)}
        style={[
          styles.toothCircle,
          getToothStyle(toothId),
          {
            position: 'absolute',
            left: position.left,
            top: position.top,
          }
        ]}
      >
        <Text style={styles.toothLabel}>{toothId}</Text>
        {selectedTeeth.includes(toothId) && (
          <View style={styles.implantFlag}>
            <Text style={styles.implantText}>
              {implantMode === 'single' ? '🔩' : '🌉'}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>🦷 Implant Assessment</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

      {/* State Preservation Indicator */}
      {(implantState.singleImplantTeeth.length > 0 || implantState.bridgeImplantTeeth.length > 0) && (
        <View style={styles.stateIndicator}>
          <Text style={styles.stateIndicatorText}>
            ✅ State preserved: Single ({implantState.singleImplantTeeth.length}) | Bridge ({implantState.bridgeImplantTeeth.length})
          </Text>
        </View>
      )}

      {/* Implant Type Selector */}
      <View style={styles.selectorCard}>
        <Text style={styles.cardTitle}>Implant Type</Text>
        <View style={styles.typeSelector}>
          <Pressable
            style={[
              styles.typeSelectorButton,
              implantMode === 'single' && styles.typeSelectorButtonActive
            ]}
            onPress={() => handleImplantModeChange('single')}
          >
            <Text style={[
              styles.typeSelectorText,
              implantMode === 'single' && styles.typeSelectorTextActive
            ]}>
              Single Implant ({implantState.singleImplantTeeth.length})
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.typeSelectorButton,
              implantMode === 'bridge' && styles.typeSelectorButtonActive
            ]}
            onPress={() => handleImplantModeChange('bridge')}
          >
            <Text style={[
              styles.typeSelectorText,
              implantMode === 'bridge' && styles.typeSelectorTextActive
            ]}>
              Bridge ({implantState.bridgeImplantTeeth.length})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Selection Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Current Selection - {implantMode === 'single' ? 'Single Implants' : 'Implant Bridge'}</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Selected Teeth:</Text>
          <Text style={styles.summaryValue}>
            {selectedTeeth.length === 0 ? 'None' : selectedTeeth.sort().join(', ')}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Count:</Text>
          <Text style={styles.summaryValue}>{selectedTeeth.length}</Text>
        </View>
        
        {selectedTeeth.length > 0 && (
          <Pressable style={styles.clearButton} onPress={clearCurrentSelection}>
            <Text style={styles.clearButtonText}>Clear {implantMode === 'single' ? 'Single' : 'Bridge'} Selection</Text>
          </Pressable>
        )}
      </View>

      {/* Visual Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>
          Select Teeth for {implantMode === 'single' ? 'Single Implants' : 'Implant Bridge'}
        </Text>
        <View style={styles.dentalChart}>
          <Text style={styles.upperArchLabel}>Upper Arch</Text>
          <Text style={styles.lowerArchLabel}>Lower Arch</Text>
          <Text style={styles.centerInstructions}>
            Tap teeth to{'\n'}select for{'\n'}
            {implantMode === 'single' ? 'implants' : 'bridge'}
          </Text>
          
          {[...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_RIGHT, ...LOWER_LEFT].map(toothId => 
            renderTooth(toothId)
          )}
        </View>
      </View>

      {/* Treatment Options */}
      <View style={styles.optionsCard}>
        <Text style={styles.cardTitle}>Treatment Options</Text>
        
        <View style={styles.optionRow}>
          <Text style={styles.optionLabel}>Bone Grafting Planned:</Text>
          <Pressable
            style={[
              styles.optionToggle,
              boneGraftingPlanned && styles.optionToggleActive
            ]}
            onPress={() => updateBoneGrafting(!boneGraftingPlanned)}
          >
            <Text style={[
              styles.optionToggleText,
              boneGraftingPlanned && styles.optionToggleTextActive
            ]}>
              {boneGraftingPlanned ? 'Yes' : 'No'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.optionRow}>
          <Text style={styles.optionLabel}>Implant Timing:</Text>
          <View style={styles.timingSelector}>
            <Pressable
              style={[
                styles.timingSelectorButton,
                timingMode === 'immediate' && styles.timingSelectorButtonActive
              ]}
              onPress={() => updateTimingMode('immediate')}
            >
              <Text style={[
                styles.timingSelectorText,
                timingMode === 'immediate' && styles.timingSelectorTextActive
              ]}>
                Immediate
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.timingSelectorButton,
                timingMode === 'delayed' && styles.timingSelectorButtonActive
              ]}
              onPress={() => updateTimingMode('delayed')}
            >
              <Text style={[
                styles.timingSelectorText,
                timingMode === 'delayed' && styles.timingSelectorTextActive
              ]}>
                Delayed
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothNormal]} />
          <Text style={styles.legendLabel}>Available for Selection</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothSingleImplant]} />
          <Text style={styles.legendLabel}>Single Implant Selected</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothBridge]} />
          <Text style={styles.legendLabel}>Bridge Implant Selected</Text>
        </View>
      </View>

      <Pressable style={styles.saveButton} onPress={saveAssessment}>
        <Text style={styles.saveButtonText}>Save Assessment</Text>
      </Pressable>
    </ScrollView>
  );
};

export default ImplantAssessmentScreen;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtext: {
    fontSize: 12,
    color: '#665',
    marginBottom: 16,
  },
  stateIndicator: {
    backgroundColor: '#d4edda',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  stateIndicatorText: {
    fontSize: 12,
    color: '#155724',
    fontWeight: '600',
    textAlign: 'center',
  },
  selectorCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    padding: 2,
  },
  typeSelectorButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  typeSelectorButtonActive: {
    backgroundColor: '#007bff',
  },
  typeSelectorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
    textAlign: 'center',
  },
  typeSelectorTextActive: {
    color: 'white',
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#665',
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  clearButton: {
    backgroundColor: '#6c757d',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  clearButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  dentalChart: {
    width: 360,
    height: 480,
    position: 'relative',
    alignSelf: 'center',
  },
  upperArchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    position: 'absolute',
    top: 50,
    left: 150,
    width: 60,
  },
  lowerArchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    position: 'absolute',
    top: 390,
    left: 150,
    width: 60,
  },
  centerInstructions: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    position: 'absolute',
    top: 220,
    left: 130,
    width: 100,
  },
  toothCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  toothLabel: {
    color: 'white',
    fontWeight: '600',
    fontSize: 10,
  },
  implantFlag: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#007bff',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  implantText: {
    fontSize: 10,
  },
  toothNormal: {
    backgroundColor: '#28a745',
  },
  toothSingleImplant: {
    backgroundColor: '#007bff',
  },
  toothBridge: {
    backgroundColor: '#6f42c1',
  },
  optionsCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  optionToggle: {
    backgroundColor: '#e9ecef',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 50,
    alignItems: 'center',
  },
  optionToggleActive: {
    backgroundColor: '#28a745',
  },
  optionToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
  },
  optionToggleTextActive: {
    color: 'white',
  },
  timingSelector: {
    flexDirection: 'row',
    backgroundColor: '#e9ecef',
    borderRadius: 20,
    padding: 2,
  },
  timingSelectorButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
  },
  timingSelectorButtonActive: {
    backgroundColor: '#ffc107',
  },
  timingSelectorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
  },
  timingSelectorTextActive: {
    color: '#212529',
  },
  legend: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
    width: '100%',
  },
  legendCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 12,
  },
  legendLabel: {
    fontSize: 13,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 20,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
});