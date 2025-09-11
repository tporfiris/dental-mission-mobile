// Filloing assessment screen

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

const FILLING_TYPES = ['amalgam', 'composite', 'crown'] as const;
type FillingType = typeof FILLING_TYPES[number];

const CROWN_MATERIALS = ['porcelain', 'metal', 'PFM'] as const;
type CrownMaterial = typeof CROWN_MATERIALS[number];

const PULP_DIAGNOSES = [
  'REVERSIBLE PULPITIS',
  'SYMPTOMATIC IRREVERSIBLE PULPITIS',
  'ASYMPTOMATIC IRREVERSIBLE PULPITIS',
  'PULP NECROSIS'
] as const;
type PulpDiagnosis = typeof PULP_DIAGNOSES[number];

const APICAL_DIAGNOSES = [
  'NORMAL APICAL TISSUES',
  'SYMPTOMATIC APICAL PERIODONTITIS',
  'ASYMPTOMATIC APICAL PERIODONTITIS',
  'CHRONIC APICAL ABSCESS',
  'ACUTE APICAL ABSCESS'
] as const;
type ApicalDiagnosis = typeof APICAL_DIAGNOSES[number];

const UPPER_RIGHT = ['11', '12', '13', '14', '15', '16', '17', '18'];
const UPPER_LEFT = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_RIGHT = ['41', '42', '43', '44', '45', '46', '47', '48'];
const LOWER_LEFT = ['31', '32', '33', '34', '35', '36', '37', '38'];

interface ToothAssessment {
  // Existing fillings
  hasFillings: boolean;
  fillingType: FillingType | null;
  fillingSurfaces: Surface[];
  
  // Crowns
  hasCrowns: boolean;
  crownMaterial: CrownMaterial | null;
  
  // Existing root canals
  hasExistingRootCanal: boolean;
  
  // Cavities
  hasCavities: boolean;
  cavitySurfaces: Surface[];
  
  // Cracks/breaks
  isBroken: boolean;
  brokenSurfaces: Surface[];
  
  // Root canal assessment
  needsRootCanal: boolean;
  pulpDiagnosis: PulpDiagnosis | null;
  apicalDiagnosis: ApicalDiagnosis | null;
}

const defaultToothState: ToothAssessment = {
  hasFillings: false,
  fillingType: null,
  fillingSurfaces: [],
  hasCrowns: false,
  crownMaterial: null,
  hasExistingRootCanal: false,
  hasCavities: false,
  cavitySurfaces: [],
  isBroken: false,
  brokenSurfaces: [],
  needsRootCanal: false,
  pulpDiagnosis: null,
  apicalDiagnosis: null,
};

const ComprehensiveDentalAssessmentScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  
  // Initialize all teeth with default state
  const initializeTeethStates = () => {
    const initialStates: Record<string, ToothAssessment> = {};
    [...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_RIGHT, ...LOWER_LEFT].forEach(toothId => {
      initialStates[toothId] = { ...defaultToothState };
    });
    return initialStates;
  };

  const [teethStates, setTeethStates] = useState<Record<string, ToothAssessment>>(initializeTeethStates);
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'fillings' | 'crowns' | 'existing_rc' | 'cavities' | 'broken' | 'rootcanal'>('fillings');

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
      console.log('🔎 Looking for existing dental assessment for patient:', patientId);
      const existing = await collection
        .query(Q.where('patient_id', Q.eq(patientId)))
        .fetch();

      console.log('🔍 Matched existing dental assessment:', existing);
  
      const jsonData = JSON.stringify(teethStates);
  
      await database.write(async () => {
        if (existing.length > 0) {
          console.log('🔍 Existing dental assessments for patient', patientId, ':', existing);
          // Update existing record
          await existing[0].update(record => {
            record.data = jsonData;
            record.updatedAt = new Date();
          });
          console.log('✅ Dental assessment updated');
          Alert.alert('✅ Dental assessment updated');
        } else {
          // Create new record
          await collection.create(record => {
            const id = uuid.v4();
            record._raw.id = id;
            record.patientId = patientId;
            record.data = jsonData;
            record.createdAt = new Date();
            record.updatedAt = new Date();
            Alert.alert('✅ Dental assessment created')
            console.log('🔧 Created dental assessment record:', {
              id,
              patient_id: patientId,
              data: jsonData,
            });
          });
        }
      });
    } catch (err) {
      console.error('❌ Failed to save dental assessment:', err);
      Alert.alert('❌ Failed to save dental assessment');
    }
  };

  const openToothEditor = (toothId: string) => {
    setSelectedTooth(toothId);
    setModalVisible(true);
    setActiveTab('fillings');
  };

  const closeToothEditor = () => {
    setSelectedTooth(null);
    setModalVisible(false);
  };

  const updateToothState = (toothId: string, updates: Partial<ToothAssessment>) => {
    setTeethStates(prev => ({
      ...prev,
      [toothId]: {
        ...prev[toothId],
        ...updates
      }
    }));
  };

  const toggleSurface = (toothId: string, category: 'fillingSurfaces' | 'cavitySurfaces' | 'brokenSurfaces', surface: Surface) => {
    const currentSurfaces = teethStates[toothId][category];
    const newSurfaces = currentSurfaces.includes(surface)
      ? currentSurfaces.filter(s => s !== surface)
      : [...currentSurfaces, surface].sort();
    
    updateToothState(toothId, { [category]: newSurfaces });
  };

  const clearTooth = () => {
    if (!selectedTooth) return;
    updateToothState(selectedTooth, { ...defaultToothState });
  };

  const getToothStyle = (toothId: string) => {
    const tooth = teethStates[toothId];
    
    // Priority order: Root canal needed (red) > Existing RC (purple) > Broken (orange) > Cavities (yellow) > Crowns (gold) > Fillings (blue) > Normal (green)
    if (tooth.needsRootCanal) return styles.toothRootCanal;
    if (tooth.hasExistingRootCanal) return styles.toothExistingRootCanal;
    if (tooth.isBroken && tooth.brokenSurfaces.length > 0) return styles.toothBroken;
    if (tooth.hasCavities && tooth.cavitySurfaces.length > 0) return styles.toothCavities;
    if (tooth.hasCrowns) return styles.toothCrowns;
    if (tooth.hasFillings && tooth.fillingSurfaces.length > 0) return styles.toothFillings;
    
    return styles.toothNormal;
  };

  const getToothPosition = (toothId: string) => {
    const chartCenter = { x: 180, y: 135 };
    const offset = toothOffsets[toothId];
    
    return {
      left: chartCenter.x + offset.x - 15,
      top: chartCenter.y + offset.y - 15
    };
  };

  const getToothStatusIndicators = (toothId: string) => {
    const tooth = teethStates[toothId];
    const indicators = [];
    
    if (tooth.hasFillings && tooth.fillingSurfaces.length > 0) {
      indicators.push(`F:${tooth.fillingSurfaces.join('')}`);
    }
    if (tooth.hasCrowns) {
      indicators.push(`CR:${tooth.crownMaterial?.charAt(0).toUpperCase() || ''}`);
    }
    if (tooth.hasExistingRootCanal) {
      indicators.push('RCT');
    }
    if (tooth.hasCavities && tooth.cavitySurfaces.length > 0) {
      indicators.push(`C:${tooth.cavitySurfaces.join('')}`);
    }
    if (tooth.isBroken && tooth.brokenSurfaces.length > 0) {
      indicators.push(`B:${tooth.brokenSurfaces.join('')}`);
    }
    if (tooth.needsRootCanal) {
      indicators.push('RC!');
    }
    
    return indicators.join(' ');
  };

  const renderTooth = (toothId: string) => {
    const position = getToothPosition(toothId);
    const statusText = getToothStatusIndicators(toothId);
    
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
        {statusText && (
          <View style={styles.statusIndicator}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  // Calculate assessment summary
  const assessmentSummary = useMemo(() => {
    const teeth = Object.entries(teethStates);
    
    return {
      totalFillings: teeth.filter(([_, tooth]) => tooth.hasFillings && tooth.fillingSurfaces.length > 0).length,
      totalCrowns: teeth.filter(([_, tooth]) => tooth.hasCrowns).length,
      totalExistingRootCanals: teeth.filter(([_, tooth]) => tooth.hasExistingRootCanal).length,
      totalCavities: teeth.filter(([_, tooth]) => tooth.hasCavities && tooth.cavitySurfaces.length > 0).length,
      totalBroken: teeth.filter(([_, tooth]) => tooth.isBroken && tooth.brokenSurfaces.length > 0).length,
      totalRootCanals: teeth.filter(([_, tooth]) => tooth.needsRootCanal).length,
      amalgamFillings: teeth.filter(([_, tooth]) => tooth.fillingType === 'amalgam').length,
      compositeFillings: teeth.filter(([_, tooth]) => tooth.fillingType === 'composite').length,
      porcelainCrowns: teeth.filter(([_, tooth]) => tooth.crownMaterial === 'porcelain').length,
      metalCrowns: teeth.filter(([_, tooth]) => tooth.crownMaterial === 'metal').length,
      pfmCrowns: teeth.filter(([_, tooth]) => tooth.crownMaterial === 'PFM').length,
    };
  }, [teethStates]);

  const showDetailedReport = () => {
    const teeth = Object.entries(teethStates).filter(([_, tooth]) => 
      tooth.hasFillings || tooth.hasCrowns || tooth.hasExistingRootCanal || tooth.hasCavities || tooth.isBroken || tooth.needsRootCanal
    );

    const report = `
Comprehensive Dental Assessment Report
Patient ID: ${patientId}

Summary:
• Existing Fillings: ${assessmentSummary.totalFillings}
  - Amalgam: ${assessmentSummary.amalgamFillings}
  - Composite: ${assessmentSummary.compositeFillings}
• Existing Crowns: ${assessmentSummary.totalCrowns}
  - Porcelain: ${assessmentSummary.porcelainCrowns}
  - Metal: ${assessmentSummary.metalCrowns}
  - PFM: ${assessmentSummary.pfmCrowns}
• Existing Root Canals: ${assessmentSummary.totalExistingRootCanals}
• Cavities Found: ${assessmentSummary.totalCavities}
• Broken/Cracked Teeth: ${assessmentSummary.totalBroken}
• Root Canals Needed: ${assessmentSummary.totalRootCanals}

Detailed Findings:
${teeth.map(([toothId, tooth]) => {
  const findings = [];
  if (tooth.hasFillings && tooth.fillingSurfaces.length > 0) {
    findings.push(`${tooth.fillingType} filling on ${tooth.fillingSurfaces.join('')} surfaces`);
  }
  if (tooth.hasCrowns) {
    findings.push(`${tooth.crownMaterial} crown`);
  }
  if (tooth.hasExistingRootCanal) {
    findings.push(`existing root canal treatment`);
  }
  if (tooth.hasCavities && tooth.cavitySurfaces.length > 0) {
    findings.push(`cavities on ${tooth.cavitySurfaces.join('')} surfaces`);
  }
  if (tooth.isBroken && tooth.brokenSurfaces.length > 0) {
    findings.push(`broken/cracked on ${tooth.brokenSurfaces.join('')} surfaces`);
  }
  if (tooth.needsRootCanal) {
    const diagnoses = [];
    if (tooth.pulpDiagnosis) diagnoses.push(tooth.pulpDiagnosis);
    if (tooth.apicalDiagnosis) diagnoses.push(tooth.apicalDiagnosis);
    findings.push(`root canal needed (${diagnoses.join(', ')})`);
  }
  return `• Tooth ${toothId}: ${findings.join(', ')}`;
}).join('\n')}
    `;
    
    Alert.alert('Dental Assessment Report', report.trim());
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>🦷 Comprehensive Dental Assessment</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

      {/* Assessment Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Assessment Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{assessmentSummary.totalFillings}</Text>
            <Text style={styles.summaryLabel}>Fillings</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{assessmentSummary.totalCrowns}</Text>
            <Text style={styles.summaryLabel}>Crowns</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{assessmentSummary.totalExistingRootCanals}</Text>
            <Text style={styles.summaryLabel}>Existing RCT</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{assessmentSummary.totalCavities}</Text>
            <Text style={styles.summaryLabel}>Cavities</Text>
          </View>
        </View>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{assessmentSummary.totalBroken}</Text>
            <Text style={styles.summaryLabel}>Broken</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{assessmentSummary.totalRootCanals}</Text>
            <Text style={styles.summaryLabel}>RCT Needed</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}></Text>
            <Text style={styles.summaryLabel}></Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}></Text>
            <Text style={styles.summaryLabel}></Text>
          </View>
        </View>
        
        {(assessmentSummary.totalFillings + assessmentSummary.totalCrowns + assessmentSummary.totalExistingRootCanals + assessmentSummary.totalCavities + assessmentSummary.totalBroken + assessmentSummary.totalRootCanals) > 0 && (
          <Pressable style={styles.reportButton} onPress={showDetailedReport}>
            <Text style={styles.reportButtonText}>View Detailed Report</Text>
          </Pressable>
        )}
      </View>

      {/* Dental Chart Container */}
      <View style={styles.dentalChart}>
        <Text style={styles.upperArchLabel}>Upper Arch</Text>
        <Text style={styles.lowerArchLabel}>Lower Arch</Text>
        <Text style={styles.centerInstructions}>Tap to assess{'\n'}each tooth</Text>
        
        {[...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_RIGHT, ...LOWER_LEFT].map(toothId => 
          renderTooth(toothId)
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothNormal]} />
          <Text style={styles.legendLabel}>Normal</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothFillings]} />
          <Text style={styles.legendLabel}>Has Fillings</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothCrowns]} />
          <Text style={styles.legendLabel}>Has Crowns</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothExistingRootCanal]} />
          <Text style={styles.legendLabel}>Existing Root Canal</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothCavities]} />
          <Text style={styles.legendLabel}>Has Cavities</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothBroken]} />
          <Text style={styles.legendLabel}>Broken/Cracked</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothRootCanal]} />
          <Text style={styles.legendLabel}>Needs Root Canal</Text>
        </View>
      </View>

      <Text style={styles.surfaceNote}>
        Surfaces: M=Mesial, D=Distal, L=Lingual, B=Buccal, O=Occlusal{'\n'}
        Status: F=Filling, CR=Crown, RCT=Root Canal Treatment, C=Cavity, B=Broken, RC!=Root Canal Needed
      </Text>

      {/* Save Button */}
      <Pressable style={styles.saveButton} onPress={saveAssessment}>
        <Text style={styles.saveButtonText}>Save Assessment</Text>
      </Pressable>

      {/* Tooth Assessment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeToothEditor}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Assess Tooth {selectedTooth}
            </Text>
            
            {/* Tab Navigation */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScrollContainer}>
              <View style={styles.tabContainer}>
                <Pressable
                  style={[styles.tab, activeTab === 'fillings' && styles.activeTab]}
                  onPress={() => setActiveTab('fillings')}
                >
                  <Text style={[styles.tabText, activeTab === 'fillings' && styles.activeTabText]}>
                    Fillings
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.tab, activeTab === 'crowns' && styles.activeTab]}
                  onPress={() => setActiveTab('crowns')}
                >
                  <Text style={[styles.tabText, activeTab === 'crowns' && styles.activeTabText]}>
                    Crowns
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.tab, activeTab === 'existing_rc' && styles.activeTab]}
                  onPress={() => setActiveTab('existing_rc')}
                >
                  <Text style={[styles.tabText, activeTab === 'existing_rc' && styles.activeTabText]}>
                    Existing RCT
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.tab, activeTab === 'cavities' && styles.activeTab]}
                  onPress={() => setActiveTab('cavities')}
                >
                  <Text style={[styles.tabText, activeTab === 'cavities' && styles.activeTabText]}>
                    Cavities
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.tab, activeTab === 'broken' && styles.activeTab]}
                  onPress={() => setActiveTab('broken')}
                >
                  <Text style={[styles.tabText, activeTab === 'broken' && styles.activeTabText]}>
                    Broken
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.tab, activeTab === 'rootcanal' && styles.activeTab]}
                  onPress={() => setActiveTab('rootcanal')}
                >
                  <Text style={[styles.tabText, activeTab === 'rootcanal' && styles.activeTabText]}>
                    RCT Needed
                  </Text>
                </Pressable>
              </View>
            </ScrollView>

            {/* Tab Content */}
            {selectedTooth && (
              <ScrollView style={styles.tabContent}>
                {activeTab === 'fillings' && (
                  <View>
                    <Pressable
                      style={[
                        styles.toggleButton,
                        teethStates[selectedTooth]?.hasFillings && styles.toggleButtonActive
                      ]}
                      onPress={() => updateToothState(selectedTooth, { 
                        hasFillings: !teethStates[selectedTooth]?.hasFillings,
                        fillingType: !teethStates[selectedTooth]?.hasFillings ? null : teethStates[selectedTooth]?.fillingType,
                        fillingSurfaces: !teethStates[selectedTooth]?.hasFillings ? [] : teethStates[selectedTooth]?.fillingSurfaces
                      })}
                    >
                      <Text style={[
                        styles.toggleButtonText,
                        teethStates[selectedTooth]?.hasFillings && styles.toggleButtonActiveText
                      ]}>
                        Has Existing Fillings
                      </Text>
                    </Pressable>

                    {teethStates[selectedTooth]?.hasFillings && (
                      <>
                        <Text style={styles.sectionTitle}>Filling Type:</Text>
                        <View style={styles.fillingTypeButtons}>
                          {FILLING_TYPES.filter(type => type !== 'crown').map(type => (
                            <Pressable
                              key={type}
                              style={[
                                styles.fillingTypeButton,
                                teethStates[selectedTooth]?.fillingType === type && styles.fillingTypeButtonSelected
                              ]}
                              onPress={() => updateToothState(selectedTooth, { fillingType: type })}
                            >
                              <Text style={[
                                styles.fillingTypeButtonText,
                                teethStates[selectedTooth]?.fillingType === type && styles.fillingTypeButtonTextSelected
                              ]}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </Text>
                            </Pressable>
                          ))}
                        </View>

                        <Text style={styles.sectionTitle}>Affected Surfaces:</Text>
                        <View style={styles.surfaceButtons}>
                          {SURFACES.map(surface => (
                            <Pressable
                              key={surface}
                              style={[
                                styles.surfaceButton,
                                teethStates[selectedTooth]?.fillingSurfaces.includes(surface) && styles.surfaceButtonSelected
                              ]}
                              onPress={() => toggleSurface(selectedTooth, 'fillingSurfaces', surface)}
                            >
                              <Text style={[
                                styles.surfaceButtonText,
                                teethStates[selectedTooth]?.fillingSurfaces.includes(surface) && styles.surfaceButtonTextSelected
                              ]}>
                                {surface}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </>
                    )}
                  </View>
                )}

                {activeTab === 'crowns' && (
                  <View>
                    <Pressable
                      style={[
                        styles.toggleButton,
                        teethStates[selectedTooth]?.hasCrowns && styles.toggleButtonActive
                      ]}
                      onPress={() => updateToothState(selectedTooth, { 
                        hasCrowns: !teethStates[selectedTooth]?.hasCrowns,
                        crownMaterial: !teethStates[selectedTooth]?.hasCrowns ? null : teethStates[selectedTooth]?.crownMaterial
                      })}
                    >
                      <Text style={[
                        styles.toggleButtonText,
                        teethStates[selectedTooth]?.hasCrowns && styles.toggleButtonActiveText
                      ]}>
                        Has Existing Crown
                      </Text>
                    </Pressable>

                    {teethStates[selectedTooth]?.hasCrowns && (
                      <>
                        <Text style={styles.sectionTitle}>Crown Material:</Text>
                        <View style={styles.fillingTypeButtons}>
                          {CROWN_MATERIALS.map(material => (
                            <Pressable
                              key={material}
                              style={[
                                styles.fillingTypeButton,
                                teethStates[selectedTooth]?.crownMaterial === material && styles.fillingTypeButtonSelected
                              ]}
                              onPress={() => updateToothState(selectedTooth, { crownMaterial: material })}
                            >
                              <Text style={[
                                styles.fillingTypeButtonText,
                                teethStates[selectedTooth]?.crownMaterial === material && styles.fillingTypeButtonTextSelected
                              ]}>
                                {material.toUpperCase()}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </>
                    )}
                  </View>
                )}

                {activeTab === 'existing_rc' && (
                  <View>
                    <Text style={styles.sectionTitle}>Root Canal Treatment History:</Text>
                    <Pressable
                      style={[
                        styles.toggleButton,
                        teethStates[selectedTooth]?.hasExistingRootCanal && styles.toggleButtonActive
                      ]}
                      onPress={() => updateToothState(selectedTooth, { 
                        hasExistingRootCanal: !teethStates[selectedTooth]?.hasExistingRootCanal
                      })}
                    >
                      <Text style={[
                        styles.toggleButtonText,
                        teethStates[selectedTooth]?.hasExistingRootCanal && styles.toggleButtonActiveText
                      ]}>
                        Has Existing Root Canal Treatment
                      </Text>
                    </Pressable>
                  </View>
                )}

                {activeTab === 'cavities' && (
                  <View>
                    <Pressable
                      style={[
                        styles.toggleButton,
                        teethStates[selectedTooth]?.hasCavities && styles.toggleButtonActive
                      ]}
                      onPress={() => updateToothState(selectedTooth, { 
                        hasCavities: !teethStates[selectedTooth]?.hasCavities,
                        cavitySurfaces: !teethStates[selectedTooth]?.hasCavities ? [] : teethStates[selectedTooth]?.cavitySurfaces
                      })}
                    >
                      <Text style={[
                        styles.toggleButtonText,
                        teethStates[selectedTooth]?.hasCavities && styles.toggleButtonActiveText
                      ]}>
                        Has Cavities
                      </Text>
                    </Pressable>

                    {teethStates[selectedTooth]?.hasCavities && (
                      <>
                        <Text style={styles.sectionTitle}>Cavity Locations:</Text>
                        <View style={styles.surfaceButtons}>
                          {SURFACES.map(surface => (
                            <Pressable
                              key={surface}
                              style={[
                                styles.surfaceButton,
                                teethStates[selectedTooth]?.cavitySurfaces.includes(surface) && styles.surfaceButtonSelected
                              ]}
                              onPress={() => toggleSurface(selectedTooth, 'cavitySurfaces', surface)}
                            >
                              <Text style={[
                                styles.surfaceButtonText,
                                teethStates[selectedTooth]?.cavitySurfaces.includes(surface) && styles.surfaceButtonTextSelected
                              ]}>
                                {surface}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </>
                    )}
                  </View>
                )}

                {activeTab === 'broken' && (
                  <View>
                    <Pressable
                      style={[
                        styles.toggleButton,
                        teethStates[selectedTooth]?.isBroken && styles.toggleButtonActive
                      ]}
                      onPress={() => updateToothState(selectedTooth, { 
                        isBroken: !teethStates[selectedTooth]?.isBroken,
                        brokenSurfaces: !teethStates[selectedTooth]?.isBroken ? [] : teethStates[selectedTooth]?.brokenSurfaces
                      })}
                    >
                      <Text style={[
                        styles.toggleButtonText,
                        teethStates[selectedTooth]?.isBroken && styles.toggleButtonActiveText
                      ]}>
                        Is Broken/Cracked
                      </Text>
                    </Pressable>

                    {teethStates[selectedTooth]?.isBroken && (
                      <>
                        <Text style={styles.sectionTitle}>Affected Areas:</Text>
                        <View style={styles.surfaceButtons}>
                          {SURFACES.map(surface => (
                            <Pressable
                              key={surface}
                              style={[
                                styles.surfaceButton,
                                teethStates[selectedTooth]?.brokenSurfaces.includes(surface) && styles.surfaceButtonSelected
                              ]}
                              onPress={() => toggleSurface(selectedTooth, 'brokenSurfaces', surface)}
                            >
                              <Text style={[
                                styles.surfaceButtonText,
                                teethStates[selectedTooth]?.brokenSurfaces.includes(surface) && styles.surfaceButtonTextSelected
                              ]}>
                                {surface}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </>
                    )}
                  </View>
                )}

                {activeTab === 'rootcanal' && (
                  <View>
                    <Pressable
                      style={[
                        styles.toggleButton,
                        teethStates[selectedTooth]?.needsRootCanal && styles.toggleButtonActive
                      ]}
                      onPress={() => updateToothState(selectedTooth, { 
                        needsRootCanal: !teethStates[selectedTooth]?.needsRootCanal,
                        pulpDiagnosis: !teethStates[selectedTooth]?.needsRootCanal ? null : teethStates[selectedTooth]?.pulpDiagnosis,
                        apicalDiagnosis: !teethStates[selectedTooth]?.needsRootCanal ? null : teethStates[selectedTooth]?.apicalDiagnosis
                      })}
                    >
                      <Text style={[
                        styles.toggleButtonText,
                        teethStates[selectedTooth]?.needsRootCanal && styles.toggleButtonActiveText
                      ]}>
                        Needs Root Canal Treatment
                      </Text>
                    </Pressable>

                    {teethStates[selectedTooth]?.needsRootCanal && (
                      <>
                        <Text style={styles.sectionTitle}>Pulp Diagnosis:</Text>
                        {PULP_DIAGNOSES.map(diagnosis => (
                          <Pressable
                            key={diagnosis}
                            style={[
                              styles.diagnosisButton,
                              teethStates[selectedTooth]?.pulpDiagnosis === diagnosis && styles.diagnosisButtonSelected
                            ]}
                            onPress={() => updateToothState(selectedTooth, { pulpDiagnosis: diagnosis })}
                          >
                            <Text style={[
                              styles.diagnosisButtonText,
                              teethStates[selectedTooth]?.pulpDiagnosis === diagnosis && styles.diagnosisButtonTextSelected
                            ]}>
                              {diagnosis}
                            </Text>
                          </Pressable>
                        ))}

                        <Text style={styles.sectionTitle}>Apical Diagnosis:</Text>
                        {APICAL_DIAGNOSES.map(diagnosis => (
                          <Pressable
                            key={diagnosis}
                            style={[
                              styles.diagnosisButton,
                              teethStates[selectedTooth]?.apicalDiagnosis === diagnosis && styles.diagnosisButtonSelected
                            ]}
                            onPress={() => updateToothState(selectedTooth, { apicalDiagnosis: diagnosis })}
                          >
                            <Text style={[
                              styles.diagnosisButtonText,
                              teethStates[selectedTooth]?.apicalDiagnosis === diagnosis && styles.diagnosisButtonTextSelected
                            ]}>
                              {diagnosis}
                            </Text>
                          </Pressable>
                        ))}
                      </>
                    )}
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <Pressable style={styles.clearButton} onPress={clearTooth}>
                <Text style={styles.clearButtonText}>Clear All</Text>
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

export default ComprehensiveDentalAssessmentScreen;

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
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#665',
    textAlign: 'center',
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
  statusIndicator: {
    position: 'absolute',
    bottom: -16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 6,
    paddingHorizontal: 2,
    paddingVertical: 1,
    maxWidth: 50,
  },
  statusText: {
    color: 'white',
    fontSize: 7,
    fontWeight: '600',
  },
  toothNormal: {
    backgroundColor: '#28a745',
  },
  toothFillings: {
    backgroundColor: '#007bff',
  },
  toothCrowns: {
    backgroundColor: '#ffc107',
  },
  toothExistingRootCanal: {
    backgroundColor: '#6f42c1',
  },
  toothCavities: {
    backgroundColor: '#fd7e14',
  },
  toothBroken: {
    backgroundColor: '#e83e8c',
  },
  toothRootCanal: {
    backgroundColor: '#dc3545',
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
    width: '95%',
    maxWidth: 450,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  tabScrollContainer: {
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 2,
    minWidth: 480,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    minWidth: 75,
  },
  activeTab: {
    backgroundColor: '#007bff',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  tabContent: {
    maxHeight: 300,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 16,
    color: '#333',
  },
  toggleButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
    marginBottom: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },
  toggleButtonActiveText: {
    color: 'white',
  },
  fillingTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  fillingTypeButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    flex: 1,
    marginHorizontal: 2,
  },
  fillingTypeButtonSelected: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  fillingTypeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },
  fillingTypeButtonTextSelected: {
    color: 'white',
  },
  surfaceButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
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
  diagnosisButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    marginBottom: 8,
  },
  diagnosisButtonSelected: {
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
  },
  diagnosisButtonText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },
  diagnosisButtonTextSelected: {
    color: 'white',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
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

// End of filling assessment screen