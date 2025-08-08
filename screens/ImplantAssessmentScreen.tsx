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
import ImplantAssessment from '../db/models/ImplantAssessment';
import { Q } from '@nozbe/watermelondb';
import uuid from 'react-native-uuid';
import { useImplantAssessment } from '../contexts/ImplantAssessmentContext';

const IMPLANT_TYPES = [
  'none',
  'single-implant',
  'multiple-implants',
  'implant-bridge',
  'all-on-4',
  'all-on-6',
  'mini-implants',
  'zygomatic-implants'
] as const;
type ImplantType = typeof IMPLANT_TYPES[number];

const IMPLANT_TECHNIQUES = [
  'immediate-placement',
  'delayed-placement',
  'immediate-loading',
  'delayed-loading',
  'guided-surgery',
  'conventional-surgery',
  'bone-grafting',
  'sinus-lift'
] as const;
type ImplantTechnique = typeof IMPLANT_TECHNIQUES[number];

const UPPER_RIGHT = ['11', '12', '13', '14', '15', '16', '17', '18'];
const UPPER_LEFT = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_RIGHT = ['41', '42', '43', '44', '45', '46', '47', '48'];
const LOWER_LEFT = ['31', '32', '33', '34', '35', '36', '37', '38'];

interface ToothImplant {
  planned: boolean;
  implantType: ImplantType;
  techniques: ImplantTechnique[];
  prosthodontistNotes: string;
}

const IMPLANT_LABELS = {
  'none': 'No Implant',
  'single-implant': 'Single Implant',
  'multiple-implants': 'Multiple Implants',
  'implant-bridge': 'Implant-Supported Bridge',
  'all-on-4': 'All-on-4',
  'all-on-6': 'All-on-6',
  'mini-implants': 'Mini Implants',
  'zygomatic-implants': 'Zygomatic Implants'
};

const TECHNIQUE_LABELS = {
  'immediate-placement': 'Immediate Placement',
  'delayed-placement': 'Delayed Placement',
  'immediate-loading': 'Immediate Loading',
  'delayed-loading': 'Delayed Loading',
  'guided-surgery': 'Guided Surgery',
  'conventional-surgery': 'Conventional Surgery',
  'bone-grafting': 'Bone Grafting',
  'sinus-lift': 'Sinus Lift'
};

const ImplantAssessmentScreen = ({ route }: any) => {
  const { patientId, hasXrays = false } = route.params || { patientId: 'DEMO', hasXrays: false };
  const { 
    implantState, 
    updateToothImplant, 
    updateProsthodontistConsult, 
    updateGeneralNotes 
  } = useImplantAssessment();
  
  const { implants, prosthodontistConsult, generalNotes } = implantState;
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const saveAssessment = async () => {
    try {
      const collection = database.get<ImplantAssessment>('implant_assessments');
      console.log('🔎 Looking for existing implant assessment for patient:', patientId);
      const existing = await collection
        .query(Q.where('patient_id', Q.eq(patientId)))
        .fetch();

      console.log('🔍 Matched existing implant assessment:', existing);
  
      // Create comprehensive assessment data object
      const assessmentData = {
        implants,
        prosthodontistConsult,
        generalNotes,
        hasXrays,
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

  const openToothEditor = (toothId: string) => {
    if (!hasXrays) {
      Alert.alert(
        'X-rays Required',
        'Implant assessment requires X-rays to be completed first. Please complete the X-ray assessment before proceeding with implant planning.'
      );
      return;
    }
    setSelectedTooth(toothId);
    setModalVisible(true);
  };

  const closeToothEditor = () => {
    setSelectedTooth(null);
    setModalVisible(false);
  };

  const toggleImplantPlanning = () => {
    if (!selectedTooth) return;
    
    const currentImplant = implants[selectedTooth];
    const updatedImplant = {
      ...currentImplant,
      planned: !currentImplant.planned,
      implantType: currentImplant.planned ? 'none' : 'single-implant'
    };
    updateToothImplant(selectedTooth, updatedImplant);
  };

  const setImplantType = (type: ImplantType) => {
    if (!selectedTooth) return;
    
    const currentImplant = implants[selectedTooth];
    const updatedImplant = {
      ...currentImplant,
      implantType: type,
      planned: type !== 'none'
    };
    updateToothImplant(selectedTooth, updatedImplant);
  };

  const toggleTechnique = (technique: ImplantTechnique) => {
    if (!selectedTooth) return;
    
    const currentImplant = implants[selectedTooth];
    const updatedImplant = {
      ...currentImplant,
      techniques: currentImplant.techniques.includes(technique)
        ? currentImplant.techniques.filter(t => t !== technique)
        : [...currentImplant.techniques, technique]
    };
    updateToothImplant(selectedTooth, updatedImplant);
  };

  const getToothPosition = (toothId: string, index: number, section: 'upper-right' | 'upper-left' | 'lower-right' | 'lower-left') => {
    const centerX = 160;
    const centerY = 210;
    const radiusX = 140;
    const radiusY = 200;
    
    let angle = 0;
    
    switch (section) {
      case 'upper-right':
        angle = (index * Math.PI / 14);
        break;
      case 'upper-left':
        angle = Math.PI - (index * Math.PI / 14);
        break;
      case 'lower-right':
        angle = (Math.PI * 2) - (index * Math.PI / 14);
        break;
      case 'lower-left':
        angle = Math.PI + (index * Math.PI / 14);
        break;
    }
    
    const x = centerX + radiusX * Math.cos(angle);
    const y = centerY + radiusY * Math.sin(angle);
    
    return { left: x - 15, top: y - 15 };
  };

  const getToothStyle = (toothId: string) => {
    const implant = implants[toothId];
    
    if (!implant.planned) {
      return hasXrays ? styles.toothNormal : styles.toothDisabled;
    }
    
    switch (implant.implantType) {
      case 'single-implant':
        return styles.toothSingleImplant;
      case 'multiple-implants':
        return styles.toothMultipleImplants;
      case 'implant-bridge':
        return styles.toothImplantBridge;
      case 'all-on-4':
      case 'all-on-6':
        return styles.toothAllOnX;
      case 'mini-implants':
        return styles.toothMiniImplants;
      case 'zygomatic-implants':
        return styles.toothZygomaticImplants;
      default:
        return styles.toothNormal;
    }
  };

  const renderTooth = (toothId: string, index: number, section: 'upper-right' | 'upper-left' | 'lower-right' | 'lower-left') => {
    const position = getToothPosition(toothId, index, section);
    const implant = implants[toothId];
    
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
        {implant.planned && (
          <View style={styles.implantFlag}>
            <Text style={styles.implantText}>🔩</Text>
          </View>
        )}
      </Pressable>
    );
  };

  const implantSummary = useMemo(() => {
    const plannedImplants = Object.entries(implants).filter(([_, implant]) => implant.planned);
    
    const byType = Object.keys(IMPLANT_LABELS).reduce((acc, type) => {
      acc[type as ImplantType] = plannedImplants.filter(([_, implant]) => implant.implantType === type).length;
      return acc;
    }, {} as Record<ImplantType, number>);

    const totalCost = plannedImplants.reduce((total, [_, implant]) => {
      switch (implant.implantType) {
        case 'single-implant': return total + 3000;
        case 'multiple-implants': return total + 2800;
        case 'implant-bridge': return total + 4500;
        case 'all-on-4': return total + 15000;
        case 'all-on-6': return total + 20000;
        case 'mini-implants': return total + 1500;
        case 'zygomatic-implants': return total + 8000;
        default: return total;
      }
    }, 0);

    return {
      totalImplants: plannedImplants.length,
      byType,
      plannedImplants: plannedImplants.map(([toothId, implant]) => ({
        toothId,
        type: IMPLANT_LABELS[implant.implantType],
        techniques: implant.techniques.map(t => TECHNIQUE_LABELS[t]).join(', ')
      })),
      estimatedCost: totalCost
    };
  }, [implants]);

  const generateImplantReport = () => {
    if (implantSummary.totalImplants === 0) {
      Alert.alert('Implant Assessment', 'No implants currently planned for this patient.');
      return;
    }

    const report = `
Implant Treatment Plan
Patient ID: ${patientId}
Prosthodontist Consultation: ${prosthodontistConsult ? 'Completed' : 'Required'}

Total Implants Planned: ${implantSummary.totalImplants}

Breakdown by Type:
${Object.entries(implantSummary.byType)
  .filter(([_, count]) => count > 0)
  .map(([type, count]) => `• ${IMPLANT_LABELS[type as ImplantType]}: ${count}`)
  .join('\n')}

Detailed Treatment Plan:
${implantSummary.plannedImplants.map(implant => 
  `• Tooth ${implant.toothId}: ${implant.type}${implant.techniques ? ` (${implant.techniques})` : ''}`
).join('\n')}

Estimated Total Cost: $${implantSummary.estimatedCost.toLocaleString()}

${!prosthodontistConsult ? 
  '⚠️ IMPORTANT: Prosthodontist consultation required before proceeding.\n' : ''}

${generalNotes ? `General Notes:\n${generalNotes}` : ''}

Note: Final implant plan requires prosthodontist approval and may change based on bone density analysis and 3D imaging.
    `;
    
    Alert.alert('Implant Treatment Plan', report.trim());
  };

  if (!hasXrays) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>🦷 Implant Assessment</Text>
        <Text style={styles.subtext}>Patient ID: {patientId}</Text>
        
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>⚠️ X-rays Required</Text>
          <Text style={styles.warningText}>
            Implant assessment cannot proceed without completed X-rays. 
            Please complete the X-ray assessment first to enable implant planning.
          </Text>
          <Text style={styles.warningSubtext}>
            Implant placement requires detailed bone density and anatomical analysis 
            that can only be determined through radiographic examination.
          </Text>
        </View>

        {/* Save Button - even when X-rays not available, we can save the "no X-rays" state */}
        <Pressable style={styles.saveButton} onPress={saveAssessment}>
          <Text style={styles.saveButtonText}>Save Assessment</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>🦷 Implant Assessment</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

      {/* Prosthodontist Consultation Status */}
      <View style={styles.consultCard}>
        <Text style={styles.cardTitle}>Prosthodontist Consultation</Text>
        <Pressable
          style={[
            styles.consultButton,
            prosthodontistConsult && styles.consultButtonCompleted
          ]}
          onPress={() => updateProsthodontistConsult(!prosthodontistConsult)}
        >
          <Text style={[
            styles.consultButtonText,
            prosthodontistConsult && styles.consultButtonTextCompleted
          ]}>
            {prosthodontistConsult ? '✓ Consultation Completed' : '⏳ Consultation Required'}
          </Text>
        </Pressable>
        {!prosthodontistConsult && (
          <Text style={styles.consultWarning}>
            ⚠️ Prosthodontist consultation required for final implant planning
          </Text>
        )}
      </View>

      {/* Implant Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Implant Planning Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Implants Planned:</Text>
          <Text style={styles.summaryValue}>{implantSummary.totalImplants}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Estimated Cost:</Text>
          <Text style={styles.summaryValue}>${implantSummary.estimatedCost.toLocaleString()}</Text>
        </View>
        
        {implantSummary.totalImplants > 0 && (
          <Pressable style={styles.reportButton} onPress={generateImplantReport}>
            <Text style={styles.reportButtonText}>Generate Treatment Plan</Text>
          </Pressable>
        )}
      </View>

      {/* Visual Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>Implant Visualization</Text>
        <View style={styles.dentalChart}>
          {/* Upper Arch Label */}
          <Text style={[styles.archLabel, styles.upperArchLabel]}>Upper{'\n'}Arch</Text>
          
          {/* Lower Arch Label */}
          <Text style={[styles.archLabel, styles.lowerArchLabel]}>Lower{'\n'}Arch</Text>
          
          {/* Center Instructions */}
          <Text style={styles.centerInstructions}>
            Tap teeth to{'\n'}plan implants{'\n'}(X-rays required)
          </Text>
          
          {/* Render all teeth */}
          {UPPER_RIGHT.map((toothId, index) => renderTooth(toothId, index, 'upper-right'))}
          {UPPER_LEFT.map((toothId, index) => renderTooth(toothId, index, 'upper-left'))}
          {LOWER_RIGHT.map((toothId, index) => renderTooth(toothId, index, 'lower-right'))}
          {LOWER_LEFT.map((toothId, index) => renderTooth(toothId, index, 'lower-left'))}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothNormal]} />
          <Text style={styles.legendLabel}>No Implant Planned</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothSingleImplant]} />
          <Text style={styles.legendLabel}>Single Implant</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothImplantBridge]} />
          <Text style={styles.legendLabel}>Implant Bridge</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothAllOnX]} />
          <Text style={styles.legendLabel}>All-on-4/6</Text>
        </View>
      </View>

      {/* Save Button */}
      <Pressable style={styles.saveButton} onPress={saveAssessment}>
        <Text style={styles.saveButtonText}>Save Assessment</Text>
      </Pressable>

      {/* Implant Planning Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeToothEditor}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                Tooth {selectedTooth} - Implant Planning
              </Text>
              
              <Text style={styles.sectionTitle}>Implant Type:</Text>
              <View style={styles.implantTypeGrid}>
                {(Object.keys(IMPLANT_LABELS) as ImplantType[]).map(type => (
                  <Pressable
                    key={type}
                    style={[
                      styles.typeButton,
                      selectedTooth && implants[selectedTooth]?.implantType === type && styles.typeButtonSelected
                    ]}
                    onPress={() => setImplantType(type)}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      selectedTooth && implants[selectedTooth]?.implantType === type && styles.typeButtonTextSelected
                    ]}>
                      {IMPLANT_LABELS[type]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {selectedTooth && implants[selectedTooth]?.implantType !== 'none' && (
                <>
                  <Text style={styles.sectionTitle}>Techniques & Procedures:</Text>
                  <View style={styles.techniqueGrid}>
                    {IMPLANT_TECHNIQUES.map(technique => (
                      <Pressable
                        key={technique}
                        style={[
                          styles.techniqueButton,
                          selectedTooth && implants[selectedTooth]?.techniques.includes(technique) && styles.techniqueButtonSelected
                        ]}
                        onPress={() => toggleTechnique(technique)}
                      >
                        <Text style={[
                          styles.techniqueButtonText,
                          selectedTooth && implants[selectedTooth]?.techniques.includes(technique) && styles.techniqueButtonTextSelected
                        ]}>
                          {TECHNIQUE_LABELS[technique]}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              <View style={styles.modalActions}>
                <Pressable style={styles.cancelButton} onPress={closeToothEditor}>
                  <Text style={styles.cancelButtonText}>Done</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  warningCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    borderWidth: 2,
    borderColor: '#ffc107',
    alignItems: 'center',
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    marginBottom: 12,
  },
  warningSubtext: {
    fontSize: 12,
    color: '#6c5700',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  consultCard: {
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
  consultButton: {
    backgroundColor: '#ffc107',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  consultButtonCompleted: {
    backgroundColor: '#28a745',
  },
  consultButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
  consultButtonTextCompleted: {
    color: 'white',
  },
  consultWarning: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
    fontStyle: 'italic',
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
    width: 320,
    height: 400,
    position: 'relative',
    alignSelf: 'center',
  },
  archLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    position: 'absolute',
  },
  upperArchLabel: {
    top: 80,
    left: 130,
  },
  lowerArchLabel: {
    top: 280,
    left: 130,
  },
  centerInstructions: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    position: 'absolute',
    top: 180,
    left: 110,
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
  toothDisabled: {
    backgroundColor: '#6c757d',
  },
  toothSingleImplant: {
    backgroundColor: '#007bff',
  },
  toothMultipleImplants: {
    backgroundColor: '#0056b3',
  },
  toothImplantBridge: {
    backgroundColor: '#6f42c1',
  },
  toothAllOnX: {
    backgroundColor: '#dc3545',
  },
  toothMiniImplants: {
    backgroundColor: '#17a2b8',
  },
  toothZygomaticImplants: {
    backgroundColor: '#fd7e14',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalScrollContent: {
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
    marginTop: 16,
    color: '#333',
  },
  implantTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  typeButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
    width: '48%',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  typeButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  typeButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  typeButtonTextSelected: {
    color: 'white',
  },
  techniqueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  techniqueButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 6,
    width: '48%',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  techniqueButtonSelected: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  techniqueButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  techniqueButtonTextSelected: {
    color: 'white',
  },
  modalActions: {
    alignItems: 'center',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});