// Fresh Enhanced Filling Treatment Screen

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { database } from '../db';
import Treatment from '../db/models/Treatment';
import uuid from 'react-native-uuid';

const SURFACES = ['M', 'O', 'D', 'B', 'L'] as const;
type Surface = typeof SURFACES[number];

const FILLING_MATERIALS = ['amalgam', 'composite', 'resin', 'glass ionomer'] as const;
type FillingMaterial = typeof FILLING_MATERIALS[number];

const CROWN_MATERIALS = ['metal', 'porcelain', 'PFM'] as const;
type CrownMaterial = typeof CROWN_MATERIALS[number];

const PREP_DEPTHS = ['shallow', 'medium', 'deep'] as const;
type PrepDepth = typeof PREP_DEPTHS[number];

const CANAL_COUNTS = [1, 2, 3, 4] as const;
type CanalCount = typeof CANAL_COUNTS[number];

const UPPER_RIGHT = ['11', '12', '13', '14', '15', '16', '17', '18'];
const UPPER_LEFT = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_RIGHT = ['41', '42', '43', '44', '45', '46', '47', '48'];
const LOWER_LEFT = ['31', '32', '33', '34', '35', '36', '37', '38'];

interface ToothTreatment {
  surfaces: Surface[];
  fillingMaterial: FillingMaterial | null;
  prepDepth: PrepDepth | null;
  hasCracks: boolean | null;
  crownIndicated: boolean | null;
  crownMaterial: CrownMaterial | null;
  rootCanalDone: boolean;
  canalCount: CanalCount | null;
  completed: boolean;
}

const defaultToothTreatment: ToothTreatment = {
  surfaces: [],
  fillingMaterial: null,
  prepDepth: null,
  hasCracks: null,
  crownIndicated: null,
  crownMaterial: null,
  rootCanalDone: false,
  canalCount: null,
  completed: false,
};

const EnhancedFillingTreatmentScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  const { user } = useAuth();

  // Initialize all teeth with default treatment state
  const initializeTeethStates = () => {
    const initialStates: Record<string, ToothTreatment> = {};
    [...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_RIGHT, ...LOWER_LEFT].forEach(toothId => {
      initialStates[toothId] = { ...defaultToothTreatment };
    });
    return initialStates;
  };

  const [treatments, setTreatments] = useState<Record<string, ToothTreatment>>(initializeTeethStates);
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [notes, setNotes] = useState('');
  const [allCompleted, setAllCompleted] = useState(false);
  const [completedAt, setCompletedAt] = useState<Date | null>(null);

  // Tooth positions for dental chart
  const toothOffsets: Record<string, { x: number; y: number }> = {
    // Upper arch
    '21': { x: 20, y: -120 }, '11': { x: -20, y: -120 },
    '22': { x: 55, y: -110 }, '12': { x: -55, y: -110 },
    '23': { x: 90, y: -90 }, '13': { x: -90, y: -90 },
    '24': { x: 110, y: -60 }, '14': { x: -110, y: -60 },
    '25': { x: 120, y: -25 }, '15': { x: -120, y: -25 },
    '26': { x: 125, y: 10 }, '16': { x: -125, y: 10 },
    '27': { x: 125, y: 45 }, '17': { x: -125, y: 45 },
    '28': { x: 125, y: 80 }, '18': { x: -125, y: 80 },
    // Lower arch
    '31': { x: 20, y: 330 }, '41': { x: -20, y: 330 },
    '32': { x: 55, y: 320 }, '42': { x: -55, y: 320 },
    '33': { x: 90, y: 300 }, '43': { x: -90, y: 300 },
    '34': { x: 110, y: 270 }, '44': { x: -110, y: 270 },
    '35': { x: 120, y: 235 }, '45': { x: -120, y: 235 },
    '36': { x: 125, y: 200 }, '46': { x: -125, y: 200 },
    '37': { x: 125, y: 165 }, '47': { x: -125, y: 165 },
    '38': { x: 125, y: 130 }, '48': { x: -125, y: 130 },
  };

  const getToothPosition = (toothId: string) => {
    const chartCenter = { x: 180, y: 135 };
    const offset = toothOffsets[toothId];
    return {
      left: chartCenter.x + offset.x - 15,
      top: chartCenter.y + offset.y - 15
    };
  };

  const toggleSurface = (toothId: string, surface: Surface) => {
    setTreatments(prev => {
      const treatment = prev[toothId];
      const newSurfaces = treatment.surfaces.includes(surface)
        ? treatment.surfaces.filter(s => s !== surface)
        : [...treatment.surfaces, surface].sort();
      
      return {
        ...prev,
        [toothId]: { ...treatment, surfaces: newSurfaces }
      };
    });
  };

  const updateTreatment = (toothId: string, updates: Partial<ToothTreatment>) => {
    setTreatments(prev => ({
      ...prev,
      [toothId]: { ...prev[toothId], ...updates }
    }));
  };

  const clearTooth = (toothId: string) => {
    setTreatments(prev => ({
      ...prev,
      [toothId]: { ...defaultToothTreatment }
    }));
  };

  const getToothStyle = (toothId: string) => {
    const treatment = treatments[toothId];
    if (treatment.completed) return styles.toothCompleted;
    if (treatment.surfaces.length > 0 || treatment.rootCanalDone) return styles.toothTreated;
    return styles.toothNormal;
  };

  const getToothStatusText = (toothId: string) => {
    const treatment = treatments[toothId];
    const indicators = [];
    
    if (treatment.surfaces.length > 0) {
      indicators.push(treatment.surfaces.join(''));
      if (treatment.fillingMaterial) {
        const materialAbbrev = {
          'amalgam': 'A',
          'composite': 'C',
          'resin': 'R',
          'glass ionomer': 'GI'
        };
        indicators.push(materialAbbrev[treatment.fillingMaterial]);
      }
    }
    if (treatment.rootCanalDone && treatment.canalCount) {
      indicators.push(`RC${treatment.canalCount}`);
    }
    if (treatment.crownIndicated) {
      const crownText = treatment.crownMaterial ? `CR-${treatment.crownMaterial.charAt(0).toUpperCase()}` : 'CR!';
      indicators.push(crownText);
    }
    
    return indicators.join(' ');
  };

  const renderTooth = (toothId: string) => {
    const position = getToothPosition(toothId);
    const statusText = getToothStatusText(toothId);
    const treatment = treatments[toothId];
    
    return (
      <Pressable
        key={toothId}
        onPress={() => { setSelectedTooth(toothId); setModalVisible(true); }}
        style={[styles.toothCircle, getToothStyle(toothId), {
          position: 'absolute', left: position.left, top: position.top,
        }]}
      >
        <Text style={styles.toothLabel}>{toothId}</Text>
        {statusText && (
          <View style={styles.statusIndicator}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        )}
        {treatment.completed && (
          <View style={styles.completedFlag}>
            <Text style={styles.completedText}>✓</Text>
          </View>
        )}
      </Pressable>
    );
  };

  // Calculate summaries
  const getCompletedTreatments = () => {
    return Object.entries(treatments).filter(([_, treatment]) => 
      treatment.surfaces.length > 0 || treatment.rootCanalDone
    );
  };

  const getTotalSurfaceCount = () => {
    return Object.values(treatments).reduce((total, treatment) => 
      total + treatment.surfaces.length, 0
    );
  };

  // Generate billing codes
  const billingCodes = useMemo(() => {
    const codes: Array<{ toothId: string; code: string; description: string; }> = [];

    Object.entries(treatments).forEach(([toothId, treatment]) => {
      if (treatment.surfaces.length > 0 && treatment.fillingMaterial) {
        const material = treatment.fillingMaterial;
        let code = '';
        let description = '';

        switch (treatment.surfaces.length) {
          case 1:
            code = material === 'amalgam' ? 'D2140' : 'D2330';
            description = `${material} - one surface`;
            break;
          case 2:
            code = material === 'amalgam' ? 'D2150' : 'D2331';
            description = `${material} - two surfaces`;
            break;
          case 3:
            code = material === 'amalgam' ? 'D2160' : 'D2332';
            description = `${material} - three surfaces`;
            break;
          default:
            code = material === 'amalgam' ? 'D2161' : 'D2335';
            description = `${material} - four or more surfaces`;
        }

        codes.push({ toothId, code, description });
      }

      if (treatment.rootCanalDone && treatment.canalCount) {
        const toothNum = parseInt(toothId);
        const isAnterior = [1, 2, 3].includes(toothNum % 10);
        const isPremolar = [4, 5].includes(toothNum % 10);
        
        let code = '';
        if (isAnterior) code = 'D3310';
        else if (isPremolar) code = 'D3320';
        else code = 'D3330';

        codes.push({
          toothId,
          code,
          description: `Root canal therapy (${treatment.canalCount} canals)`
        });
      }

      if (treatment.crownIndicated && treatment.crownMaterial) {
        let code = '';
        let description = '';
        
        switch (treatment.crownMaterial) {
          case 'metal':
            code = 'D2790';
            description = 'Crown - full cast high noble metal';
            break;
          case 'porcelain':
            code = 'D2740';
            description = 'Crown - porcelain/ceramic';
            break;
          case 'PFM':
            code = 'D2750';
            description = 'Crown - porcelain fused to high noble metal';
            break;
        }

        codes.push({ toothId, code, description });
      }
    });

    return codes;
  }, [treatments]);

  const handleCompleteTreatment = async () => {
    const completedTreatments = getCompletedTreatments();
    
    if (completedTreatments.length === 0) {
      Alert.alert('No Treatments', 'Please record at least one treatment.');
      return;
    }

    Alert.alert(
      'Complete Treatment',
      `Save ${completedTreatments.length} treatments?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', onPress: saveTreatmentToDatabase }
      ]
    );
  };

  const saveTreatmentToDatabase = async () => {
    try {
      const completedTreatments = getCompletedTreatments();
      const clinicianName = user?.email || 'Unknown Clinician';
      const completedDate = new Date();

      await database.write(async () => {
        for (const [toothId, treatment] of completedTreatments) {
          const treatmentId = uuid.v4();
          
          await database.get<Treatment>('treatments').create(treatmentRecord => {
            treatmentRecord._raw.id = treatmentId;
            treatmentRecord.patientId = patientId;
            treatmentRecord.visitId = '';
            treatmentRecord.type = treatment.rootCanalDone ? 'endodontic' : 'filling';
            treatmentRecord.tooth = toothId;
            treatmentRecord.surface = treatment.surfaces.join('');
            treatmentRecord.units = treatment.surfaces.length || (treatment.rootCanalDone ? 1 : 0);
            treatmentRecord.value = 0;
            treatmentRecord.billingCodes = JSON.stringify(
              billingCodes.filter(c => c.toothId === toothId)
            );
            treatmentRecord.notes = JSON.stringify(treatment);
            treatmentRecord.clinicianName = clinicianName;
            treatmentRecord.completedAt = completedDate;
          });
        }
      });

      setAllCompleted(true);
      setCompletedAt(completedDate);
      Alert.alert('Success', 'Treatment saved successfully!');

    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save treatment.');
    }
  };

  const resetTreatment = () => {
    Alert.alert(
      'Reset Treatment',
      'Reset all data?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            setTreatments(initializeTeethStates());
            setNotes('');
            setAllCompleted(false);
            setCompletedAt(null);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.header}>Enhanced Filling Treatment</Text>
        <Text style={styles.subtext}>Patient ID: {patientId}</Text>

        {allCompleted && completedAt && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedBannerText}>✅ Treatment Completed</Text>
            <Text style={styles.completedDate}>
              {completedAt.toLocaleDateString()} at {completedAt.toLocaleTimeString()}
            </Text>
          </View>
        )}

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Treatment Summary</Text>
          <Text style={styles.summaryText}>
            Teeth Treated: {getCompletedTreatments().length} | 
            Surfaces: {getTotalSurfaceCount()} | 
            Root Canals: {Object.values(treatments).filter(t => t.rootCanalDone).length}
          </Text>
        </View>

        {/* Dental Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Dental Chart</Text>
          <View style={styles.dentalChart}>
            <Text style={styles.upperArchLabel}>Upper Arch</Text>
            <Text style={styles.lowerArchLabel}>Lower Arch</Text>
            <Text style={styles.centerInstructions}>Tap teeth to record treatment</Text>
            
            {[...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_RIGHT, ...LOWER_LEFT].map(toothId => 
              renderTooth(toothId)
            )}
          </View>
        </View>

        {/* Billing Codes */}
        {billingCodes.length > 0 && (
          <View style={styles.billingSection}>
            <Text style={styles.sectionTitle}>Billing Codes ({billingCodes.length})</Text>
            {billingCodes.map((code, index) => (
              <View key={index} style={styles.codeCard}>
                <Text style={styles.codeNumber}>
                  {code.code} - Tooth {code.toothId}
                </Text>
                <Text style={styles.codeDescription}>{code.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Treatment notes..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <Pressable style={styles.completeButton} onPress={handleCompleteTreatment}>
            <Text style={styles.actionButtonText}>
              {allCompleted ? '✅ Completed' : 'Complete Treatment'}
            </Text>
          </Pressable>
          
          <Pressable style={styles.resetButton} onPress={resetTreatment}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Simple Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tooth {selectedTooth}</Text>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
              {selectedTooth && (
                <>
                  {/* Surfaces */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Surfaces (MODBL):</Text>
                    <View style={styles.surfaceRow}>
                      {SURFACES.map(surface => (
                        <Pressable
                          key={surface}
                          style={[
                            styles.surfaceBtn,
                            treatments[selectedTooth]?.surfaces.includes(surface) && styles.surfaceBtnActive
                          ]}
                          onPress={() => toggleSurface(selectedTooth, surface)}
                        >
                          <Text style={[
                            styles.surfaceBtnText,
                            treatments[selectedTooth]?.surfaces.includes(surface) && styles.surfaceBtnTextActive
                          ]}>
                            {surface}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Material */}
                  {treatments[selectedTooth]?.surfaces.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Filling Material:</Text>
                      <View style={styles.materialGrid}>
                        {FILLING_MATERIALS.map(material => (
                          <Pressable
                            key={material}
                            style={[
                              styles.materialBtn,
                              treatments[selectedTooth]?.fillingMaterial === material && styles.materialBtnActive
                            ]}
                            onPress={() => updateTreatment(selectedTooth, { fillingMaterial: material })}
                          >
                            <Text style={[
                              styles.materialBtnText,
                              treatments[selectedTooth]?.fillingMaterial === material && styles.materialBtnTextActive
                            ]}>
                              {material}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Prep Depth */}
                  {treatments[selectedTooth]?.surfaces.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Prep Depth:</Text>
                      <View style={styles.optionRow}>
                        {PREP_DEPTHS.map(depth => (
                          <Pressable
                            key={depth}
                            style={[
                              styles.optionBtn,
                              treatments[selectedTooth]?.prepDepth === depth && styles.optionBtnActive
                            ]}
                            onPress={() => updateTreatment(selectedTooth, { prepDepth: depth })}
                          >
                            <Text style={[
                              styles.optionBtnText,
                              treatments[selectedTooth]?.prepDepth === depth && styles.optionBtnTextActive
                            ]}>
                              {depth}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Cracks */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Cracks:</Text>
                    <View style={styles.yesNoRow}>
                      <Pressable
                        style={[
                          styles.yesNoBtn,
                          treatments[selectedTooth]?.hasCracks === true && styles.yesBtn
                        ]}
                        onPress={() => updateTreatment(selectedTooth, { hasCracks: true })}
                      >
                        <Text style={[
                          styles.yesNoBtnText,
                          treatments[selectedTooth]?.hasCracks === true && styles.yesBtnText
                        ]}>Yes</Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.yesNoBtn,
                          treatments[selectedTooth]?.hasCracks === false && styles.noBtn
                        ]}
                        onPress={() => updateTreatment(selectedTooth, { hasCracks: false })}
                      >
                        <Text style={[
                          styles.yesNoBtnText,
                          treatments[selectedTooth]?.hasCracks === false && styles.noBtnText
                        ]}>No</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Crown */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Crown Indicated:</Text>
                    <View style={styles.yesNoRow}>
                      <Pressable
                        style={[
                          styles.yesNoBtn,
                          treatments[selectedTooth]?.crownIndicated === true && styles.yesBtn
                        ]}
                        onPress={() => updateTreatment(selectedTooth, { 
                          crownIndicated: true,
                          crownMaterial: treatments[selectedTooth]?.crownMaterial || null
                        })}
                      >
                        <Text style={[
                          styles.yesNoBtnText,
                          treatments[selectedTooth]?.crownIndicated === true && styles.yesBtnText
                        ]}>Yes</Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.yesNoBtn,
                          treatments[selectedTooth]?.crownIndicated === false && styles.noBtn
                        ]}
                        onPress={() => updateTreatment(selectedTooth, { 
                          crownIndicated: false, 
                          crownMaterial: null 
                        })}
                      >
                        <Text style={[
                          styles.yesNoBtnText,
                          treatments[selectedTooth]?.crownIndicated === false && styles.noBtnText
                        ]}>No</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Crown Material */}
                  {treatments[selectedTooth]?.crownIndicated && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Crown Material:</Text>
                      <View style={styles.crownMaterialRow}>
                        {CROWN_MATERIALS.map(material => (
                          <Pressable
                            key={material}
                            style={[
                              styles.crownMaterialBtn,
                              treatments[selectedTooth]?.crownMaterial === material && styles.crownMaterialBtnActive
                            ]}
                            onPress={() => updateTreatment(selectedTooth, { crownMaterial: material })}
                          >
                            <Text style={[
                              styles.crownMaterialBtnText,
                              treatments[selectedTooth]?.crownMaterial === material && styles.crownMaterialBtnTextActive
                            ]}>
                              {material}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Root Canal */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Root Canal:</Text>
                    <Pressable
                      style={[
                        styles.toggleBtn,
                        treatments[selectedTooth]?.rootCanalDone && styles.toggleBtnActive
                      ]}
                      onPress={() => updateTreatment(selectedTooth, { 
                        rootCanalDone: !treatments[selectedTooth]?.rootCanalDone,
                        canalCount: !treatments[selectedTooth]?.rootCanalDone ? null : treatments[selectedTooth]?.canalCount
                      })}
                    >
                      <Text style={[
                        styles.toggleBtnText,
                        treatments[selectedTooth]?.rootCanalDone && styles.toggleBtnTextActive
                      ]}>
                        {treatments[selectedTooth]?.rootCanalDone ? 'RCT Done' : 'No RCT'}
                      </Text>
                    </Pressable>

                    {/* Canal Count */}
                    {treatments[selectedTooth]?.rootCanalDone && (
                      <View style={styles.canalSection}>
                        <Text style={styles.modalLabel}>Canals:</Text>
                        <View style={styles.canalRow}>
                          {CANAL_COUNTS.map(count => (
                            <Pressable
                              key={count}
                              style={[
                                styles.canalBtn,
                                treatments[selectedTooth]?.canalCount === count && styles.canalBtnActive
                              ]}
                              onPress={() => updateTreatment(selectedTooth, { canalCount: count })}
                            >
                              <Text style={[
                                styles.canalBtnText,
                                treatments[selectedTooth]?.canalCount === count && styles.canalBtnTextActive
                              ]}>
                                {count}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Summary */}
                  {(treatments[selectedTooth]?.surfaces.length > 0 || treatments[selectedTooth]?.rootCanalDone) && (
                    <View style={styles.treatmentSummary}>
                      <Text style={styles.summaryTitle}>Summary:</Text>
                      <Text style={styles.summaryFormat}>
                        #{selectedTooth}
                        {treatments[selectedTooth]?.surfaces.join('')}
                        {treatments[selectedTooth]?.fillingMaterial && ` ${treatments[selectedTooth]?.fillingMaterial}`}
                        {treatments[selectedTooth]?.rootCanalDone && treatments[selectedTooth]?.canalCount && 
                          ` RCT(${treatments[selectedTooth]?.canalCount})`
                        }
                        {treatments[selectedTooth]?.crownIndicated && treatments[selectedTooth]?.crownMaterial && 
                          ` Crown(${treatments[selectedTooth]?.crownMaterial})`
                        }
                      </Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable 
                style={styles.clearBtn} 
                onPress={() => selectedTooth && clearTooth(selectedTooth)}
              >
                <Text style={styles.clearBtnText}>Clear</Text>
              </Pressable>
              <Pressable 
                style={styles.doneBtn} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default EnhancedFillingTreatmentScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  completedBanner: {
    backgroundColor: '#d4edda',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  completedBannerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#155724',
  },
  completedDate: {
    fontSize: 14,
    color: '#155724',
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  summaryText: {
    fontSize: 14,
    color: '#495057',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  statusIndicator: {
    position: 'absolute',
    bottom: -16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 6,
    paddingHorizontal: 2,
    paddingVertical: 1,
    maxWidth: 60,
  },
  statusText: {
    color: 'white',
    fontSize: 7,
    fontWeight: '600',
  },
  completedFlag: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#28a745',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  toothNormal: {
    backgroundColor: '#6c757d',
  },
  toothTreated: {
    backgroundColor: '#007bff',
  },
  toothCompleted: {
    backgroundColor: '#28a745',
  },
  billingSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  codeCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  codeNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 4,
  },
  codeDescription: {
    fontSize: 13,
    color: '#495057',
  },
  notesSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  actionSection: {
    gap: 12,
    marginBottom: 20,
  },
  completeButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#dc3545',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc3545',
  },
  
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '50%',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  
  // Surface Buttons
  surfaceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  surfaceBtn: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 50,
    alignItems: 'center',
  },
  surfaceBtnActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  surfaceBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  surfaceBtnTextActive: {
    color: 'white',
  },
  
  // Material Buttons (2x2 grid for 4 materials)
  materialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  materialBtn: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    width: '48%',
  },
  materialBtnActive: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  materialBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#495057',
    textAlign: 'center',
  },
  materialBtnTextActive: {
    color: 'white',
  },
  
  // Option Buttons
  optionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionBtn: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  optionBtnActive: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  optionBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#495057',
  },
  optionBtnTextActive: {
    color: 'white',
  },
  
  // Yes/No Buttons
  yesNoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  yesNoBtn: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  yesBtn: {
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
  },
  noBtn: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  yesNoBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#495057',
  },
  yesBtnText: {
    color: 'white',
  },
  noBtnText: {
    color: 'white',
  },
  
  // Crown Material Buttons
  crownMaterialRow: {
    flexDirection: 'row',
    gap: 8,
  },
  crownMaterialBtn: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  crownMaterialBtnActive: {
    backgroundColor: '#6f42c1',
    borderColor: '#6f42c1',
  },
  crownMaterialBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#495057',
    textAlign: 'center',
  },
  crownMaterialBtnTextActive: {
    color: 'white',
  },
  
  // Toggle Button
  toggleBtn: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  toggleBtnActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  toggleBtnTextActive: {
    color: 'white',
  },
  
  // Canal Section
  canalSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  canalRow: {
    flexDirection: 'row',
    gap: 10,
  },
  canalBtn: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 50,
  },
  canalBtnActive: {
    backgroundColor: '#6f42c1',
    borderColor: '#6f42c1',
  },
  canalBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  canalBtnTextActive: {
    color: 'white',
  },
  
  // Treatment Summary
  treatmentSummary: {
    backgroundColor: '#e7f3ff',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007bff',
    marginBottom: 4,
  },
  summaryFormat: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007bff',
  },
  
  // Modal Footer
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  clearBtn: {
    flex: 1,
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  doneBtn: {
    flex: 2,
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});