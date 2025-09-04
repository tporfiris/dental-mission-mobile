import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { database } from '../db'; // adjust path if needed
import FillingsAssessment from '../db/models/FillingsAssessment';
import { Q } from '@nozbe/watermelondb';
import uuid from 'react-native-uuid';
import { useFillingsAssessment } from '../contexts/FillingsAssessmentContext';

const SURFACES = ['M', 'D', 'L', 'B', 'O'] as const;
type Surface = typeof SURFACES[number];

const UPPER_RIGHT = ['11', '12', '13', '14', '15', '16', '17', '18'];
const UPPER_LEFT = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_RIGHT = ['41', '42', '43', '44', '45', '46', '47', '48'];
const LOWER_LEFT = ['31', '32', '33', '34', '35', '36', '37', '38'];

interface ToothRestoration {
  surfaces: Surface[];
  tentative: boolean;
}

const TreatmentPlanningFillingsScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  const { restorationStates, setRestorationStates } = useFillingsAssessment();
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Updated tooth positions - same as other assessment screens
  const toothOffsets: Record<string, { x: number; y: number }> = {
    // Upper arch - symmetric pairs
    '21': { x: 20, y: -120 },   // Upper right central
    '11': { x: -20, y: -120 },  // Upper left central (mirrored)
    '22': { x: 55, y: -110 },   // Upper right lateral  
    '12': { x: -55, y: -110 },  // Upper left lateral (mirrored)
    '23': { x: 90, y: -90 },    // Upper right canine
    '13': { x: -90, y: -90 },   // Upper left canine (mirrored)
    '24': { x: 110, y: -60 },   // Upper right first premolar
    '14': { x: -110, y: -60 },  // Upper left first premolar (mirrored)
    '25': { x: 120, y: -25 },   // Upper right second premolar
    '15': { x: -120, y: -25 },  // Upper left second premolar (mirrored)
    '26': { x: 125, y: 10 },    // Upper right first molar
    '16': { x: -125, y: 10 },   // Upper left first molar (mirrored)
    '27': { x: 125, y: 45 },    // Upper right second molar
    '17': { x: -125, y: 45 },   // Upper left second molar (mirrored)
    '28': { x: 125, y: 80 },    // Upper right third molar (wisdom)
    '18': { x: -125, y: 80 },   // Upper left third molar (mirrored)
    
    // Lower arch - symmetric pairs
    '31': { x: 20, y: 330 },    // Lower right central
    '41': { x: -20, y: 330 },   // Lower left central (mirrored)
    '32': { x: 55, y: 320 },    // Lower right lateral
    '42': { x: -55, y: 320 },   // Lower left lateral (mirrored)
    '33': { x: 90, y: 300 },    // Lower right canine
    '43': { x: -90, y: 300 },   // Lower left canine (mirrored)
    '34': { x: 110, y: 270 },   // Lower right first premolar
    '44': { x: -110, y: 270 },  // Lower left first premolar (mirrored)
    '35': { x: 120, y: 235 },   // Lower right second premolar
    '45': { x: -120, y: 235 },  // Lower left second premolar (mirrored)
    '36': { x: 125, y: 200 },   // Lower right first molar
    '46': { x: -125, y: 200 },  // Lower left first molar (mirrored)
    '37': { x: 125, y: 165 },   // Lower right second molar
    '47': { x: -125, y: 165 },  // Lower left second molar (mirrored)
    '38': { x: 125, y: 130 },   // Lower right third molar (wisdom)
    '48': { x: -125, y: 130 },  // Lower left third molar (mirrored)
  };

  const saveAssessment = async () => {
    try {
      const collection = database.get<FillingsAssessment>('fillings_assessments');
      console.log('🔎 Looking for existing fillings assessment for patient:', patientId);
      const existing = await collection
        .query(Q.where('patient_id', Q.eq(patientId)))
        .fetch();

      console.log('🔍 Matched existing fillings assessment:', existing);
  
      const jsonData = JSON.stringify(restorationStates);
  
      await database.write(async () => {
        console.log("existing fillings assessments:")
        console.log(existing)
        console.log("existing length:")
        console.log(existing.length)
        if (existing.length > 0) {
          console.log('🔍 Existing fillings assessments for patient', patientId, ':', existing);
          // Update existing record
          await existing[0].update(record => {
            record.data = jsonData;
            record.updatedAt = new Date();
          });
          console.log('✅ Fillings assessment updated');
          Alert.alert('✅ Fillings assessment updated');
        } else {
          // Create new record
          await collection.create(record => {
            const id = uuid.v4();
            record._raw.id = id;
            record.patientId = patientId; // must match schema!
            record.data = jsonData;
            record.createdAt = new Date();
            record.updatedAt = new Date();
            Alert.alert('✅ Fillings assessment created')
            console.log('🔧 Created fillings assessment record:', {
              id,
              patient_id: patientId,
              data: jsonData,
            });
          });
        }
      });
    } catch (err) {
      console.error('❌ Failed to save fillings assessment:', err);
      Alert.alert('❌ Failed to save fillings assessment');
    }
  };

  const openToothEditor = (toothId: string) => {
    setSelectedTooth(toothId);
    setModalVisible(true);
  };

  const closeToothEditor = () => {
    setSelectedTooth(null);
    setModalVisible(false);
  };

  const toggleSurface = (surface: Surface) => {
    if (!selectedTooth) return;
    
    setRestorationStates(prev => ({
      ...prev,
      [selectedTooth]: {
        ...prev[selectedTooth],
        surfaces: prev[selectedTooth].surfaces.includes(surface)
          ? prev[selectedTooth].surfaces.filter(s => s !== surface)
          : [...prev[selectedTooth].surfaces, surface].sort()
      }
    }));
  };

  const toggleTentative = () => {
    if (!selectedTooth) return;
    
    setRestorationStates(prev => ({
      ...prev,
      [selectedTooth]: {
        ...prev[selectedTooth],
        tentative: !prev[selectedTooth].tentative
      }
    }));
  };

  const clearTooth = () => {
    if (!selectedTooth) return;
    
    setRestorationStates(prev => ({
      ...prev,
      [selectedTooth]: { surfaces: [], tentative: false }
    }));
  };

  const getToothStyle = (toothId: string) => {
    const restoration = restorationStates[toothId];
    if (restoration.surfaces.length === 0) {
      return styles.toothNormal;
    }
    if (restoration.tentative) {
      return styles.toothTentative;
    }
    return styles.toothNeedsRestoration;
  };

  const getToothPosition = (toothId: string) => {
    const chartCenter = { x: 180, y: 135 }; // Center of the chart container
    const offset = toothOffsets[toothId];
    
    return {
      left: chartCenter.x + offset.x - 15, // -15 to center the 30px circle
      top: chartCenter.y + offset.y - 15
    };
  };

  const renderTooth = (toothId: string) => {
    const position = getToothPosition(toothId);
    const restoration = restorationStates[toothId];
    
    return (
      <Pressable
        key={toothId}
        onPress={() => openToothEditor(toothId)}
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
        {restoration.surfaces.length > 0 && (
          <View style={styles.surfaceIndicator}>
            <Text style={styles.surfaceText}>
              {restoration.surfaces.join('')}
            </Text>
          </View>
        )}
        {restoration.tentative && (
          <View style={styles.tentativeFlag}>
            <Text style={styles.tentativeText}>?</Text>
          </View>
        )}
      </Pressable>
    );
  };

  // Calculate treatment summary
  const treatmentSummary = useMemo(() => {
    const teethNeedingFillings = Object.entries(restorationStates).filter(([_, restoration]) => 
      restoration.surfaces.length > 0
    );
    
    const tentativeCount = teethNeedingFillings.filter(([_, restoration]) => restoration.tentative).length;
    const confirmedCount = teethNeedingFillings.length - tentativeCount;
    
    const surfaceCount = teethNeedingFillings.reduce((total, [_, restoration]) => 
      total + restoration.surfaces.length, 0
    );

    return {
      totalTeeth: teethNeedingFillings.length,
      confirmedCount,
      tentativeCount,
      surfaceCount,
      teethDetails: teethNeedingFillings.map(([toothId, restoration]) => ({
        toothId,
        surfaces: restoration.surfaces.join(''),
        tentative: restoration.tentative
      }))
    };
  }, [restorationStates]);

  const showDetailedReport = () => {
    const report = `
Treatment Planning - Fillings Report
Patient ID: ${patientId}

Summary:
• Total Teeth Needing Restoration: ${treatmentSummary.totalTeeth}
• Confirmed Fillings: ${treatmentSummary.confirmedCount}
• Tentative (Pending X-rays): ${treatmentSummary.tentativeCount}
• Total Surfaces Affected: ${treatmentSummary.surfaceCount}

Detailed Treatment Plan:
${treatmentSummary.teethDetails.map(tooth => 
  `• Tooth ${tooth.toothId}: ${tooth.surfaces} surfaces${tooth.tentative ? ' (Tentative)' : ''}`
).join('\n')}

${treatmentSummary.tentativeCount > 0 ? 
  '\nNote: Tentative fillings require X-ray confirmation before final treatment planning.' 
  : ''}
    `;
    
    Alert.alert('Filling Treatment Plan', report.trim());
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>🦷 Treatment Planning - Fillings</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

      {/* Treatment Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Treatment Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Teeth Needing Fillings:</Text>
          <Text style={styles.summaryValue}>{treatmentSummary.totalTeeth}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Confirmed:</Text>
          <Text style={styles.summaryValue}>{treatmentSummary.confirmedCount}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tentative (X-ray needed):</Text>
          <Text style={styles.summaryValue}>{treatmentSummary.tentativeCount}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Surfaces:</Text>
          <Text style={styles.summaryValue}>{treatmentSummary.surfaceCount}</Text>
        </View>
        
        {treatmentSummary.totalTeeth > 0 && (
          <Pressable style={styles.reportButton} onPress={showDetailedReport}>
            <Text style={styles.reportButtonText}>View Treatment Plan</Text>
          </Pressable>
        )}
      </View>

      {/* Dental Chart Container */}
      <View style={styles.dentalChart}>
        {/* Upper Arch Label */}
        <Text style={styles.upperArchLabel}>Upper Arch</Text>
        
        {/* Lower Arch Label */}
        <Text style={styles.lowerArchLabel}>Lower Arch</Text>
        
        {/* Center Instructions */}
        <Text style={styles.centerInstructions}>Tap to select{'\n'}surfaces needing{'\n'}restoration</Text>
        
        {/* Render all teeth */}
        {[...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_RIGHT, ...LOWER_LEFT].map(toothId => 
          renderTooth(toothId)
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothNormal]} />
          <Text style={styles.legendLabel}>No Restoration Needed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothNeedsRestoration]} />
          <Text style={styles.legendLabel}>Needs Restoration</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothTentative]} />
          <Text style={styles.legendLabel}>Tentative (X-ray needed)</Text>
        </View>
      </View>

      <Text style={styles.surfaceNote}>
        Surfaces: M=Mesial, D=Distal, L=Lingual, B=Buccal, O=Occlusal
      </Text>

      {/* Save Button */}
      <Pressable style={styles.saveButton} onPress={saveAssessment}>
        <Text style={styles.saveButtonText}>Save Assessment</Text>
      </Pressable>

      {/* Tooth Editor Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeToothEditor}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Edit Tooth {selectedTooth}
            </Text>
            
            <Text style={styles.sectionTitle}>Select Affected Surfaces:</Text>
            <View style={styles.surfaceButtons}>
              {SURFACES.map(surface => (
                <Pressable
                  key={surface}
                  style={[
                    styles.surfaceButton,
                    selectedTooth && restorationStates[selectedTooth]?.surfaces.includes(surface) && styles.surfaceButtonSelected
                  ]}
                  onPress={() => toggleSurface(surface)}
                >
                  <Text style={[
                    styles.surfaceButtonText,
                    selectedTooth && restorationStates[selectedTooth]?.surfaces.includes(surface) && styles.surfaceButtonTextSelected
                  ]}>
                    {surface}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[
                styles.tentativeButton,
                selectedTooth && restorationStates[selectedTooth]?.tentative && styles.tentativeButtonSelected
              ]}
              onPress={toggleTentative}
            >
              <Text style={[
                styles.tentativeButtonText,
                selectedTooth && restorationStates[selectedTooth]?.tentative && styles.tentativeButtonTextSelected
              ]}>
                🔍 Tentative (Pending X-rays)
              </Text>
            </Pressable>

            <View style={styles.modalActions}>
              <Pressable style={styles.clearButton} onPress={clearTooth}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </Pressable>
              <Pressable style={styles.doneButton} onPress={closeToothEditor}>
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default TreatmentPlanningFillingsScreen;

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
  summaryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 20,
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
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  reportButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  reportButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  dentalChart: {
    width: 360,
    height: 480,
    position: 'relative',
    marginBottom: 30,
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
    left: 110,
    width: 140,
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
  surfaceIndicator: {
    position: 'absolute',
    bottom: -12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  surfaceText: {
    color: 'white',
    fontSize: 8,
    fontWeight: '600',
  },
  tentativeFlag: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ffc107',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tentativeText: {
    color: 'black',
    fontSize: 10,
    fontWeight: 'bold',
  },
  toothNormal: {
    backgroundColor: '#28a745',
  },
  toothNeedsRestoration: {
    backgroundColor: '#dc3545',
  },
  toothTentative: {
    backgroundColor: '#ffc107',
  },
  legend: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 16,
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
  surfaceNote: {
    fontSize: 12,
    color: '#665',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 20,
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  surfaceButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  surfaceButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  surfaceButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  surfaceButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  surfaceButtonTextSelected: {
    color: 'white',
  },
  tentativeButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
    marginBottom: 20,
  },
  tentativeButtonSelected: {
    backgroundColor: '#ffc107',
    borderColor: '#ffc107',
  },
  tentativeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },
  tentativeButtonTextSelected: {
    color: 'black',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clearButton: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  doneButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});