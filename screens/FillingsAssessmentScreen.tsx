import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { useFillingsAssessment } from '../contexts/FillingsAssessmentContext';
import VoiceRecorder from '../components/VoiceRecorder';

const TOOTH_IDS = [
  '11','12','13','14','15','16','17','18',
  '21','22','23','24','25','26','27','28',
  '31','32','33','34','35','36','37','38',
  '41','42','43','44','45','46','47','48',
];

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

// Primary tooth conversion mappings
const PRIMARY_TOOTH_MAPPINGS = {
  // Permanent to Primary
  '11': '51', '12': '52', '13': '53', '14': '54', '15': '55',
  '21': '61', '22': '62', '23': '63', '24': '64', '25': '65',
  '41': '81', '42': '82', '43': '83', '44': '84', '45': '85',
  '31': '71', '32': '72', '33': '73', '34': '74', '35': '75',
  // Primary to Permanent (reverse mapping)
  '51': '11', '52': '12', '53': '13', '54': '14', '55': '15',
  '61': '21', '62': '22', '63': '23', '64': '24', '65': '25',
  '81': '41', '82': '42', '83': '43', '84': '44', '85': '45',
  '71': '31', '72': '32', '73': '33', '74': '34', '75': '35',
};

// Helper function to check if a tooth can be switched to primary
const canSwitchToPrimary = (toothId: string): boolean => {
  const permanentTeeth = ['11', '12', '13', '14', '15', '21', '22', '23', '24', '25', 
                          '41', '42', '43', '44', '45', '31', '32', '33', '34', '35'];
  return permanentTeeth.includes(toothId);
};

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

// Enhanced assessment state interface
interface EnhancedFillingsAssessmentState {
  teethStates: Record<string, ToothAssessment>;
  selectedTooth: string | null;
  modalVisible: boolean;
  activeTab: 'fillings' | 'crowns' | 'existing_rc' | 'cavities' | 'broken' | 'rootcanal';
  primaryTeeth: Set<string>;
}

const ComprehensiveDentalAssessmentScreen = ({ route, navigation }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  
  // ✅ Get saveAssessment from context
  const { restorationStates, setRestorationStates, saveAssessment, loadLatestAssessment } = useFillingsAssessment();
  
  // Initialize teeth states
  const initializeTeethStates = () => {
    const initialStates: Record<string, ToothAssessment> = {};
    [...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_RIGHT, ...LOWER_LEFT].forEach(toothId => {
      initialStates[toothId] = { ...defaultToothState };
    });
    return initialStates;
  };

  // Get initial state from context or defaults
  const getInitialState = (): EnhancedFillingsAssessmentState => {
    return {
      teethStates: initializeTeethStates(),
      selectedTooth: null,
      modalVisible: false,
      activeTab: 'fillings',
      primaryTeeth: new Set()
    };
  };

  // Initialize state from context or defaults
  const [enhancedState, setEnhancedState] = useState<EnhancedFillingsAssessmentState>(() => {
    // Try to get saved state from restorationStates context
    if (restorationStates && typeof restorationStates === 'object' && 'enhancedAssessment' in restorationStates) {
      return { ...getInitialState(), ...restorationStates.enhancedAssessment };
    }
    return getInitialState();
  });

  // ✅ Load previous assessment on mount (optional - for pre-filling)
  useEffect(() => {
    const loadPrevious = async () => {
      await loadLatestAssessment(patientId);
    };
    
    loadPrevious();
    
    // ✅ Optional: Reset on unmount
    return () => {
    };
  }, [patientId]);

  // Save state to context whenever it changes
  useEffect(() => {
    setRestorationStates({
      ...restorationStates,
      enhancedAssessment: enhancedState
    });
  }, [enhancedState]);

  // Function to get the current display tooth ID (permanent or primary)
  const getCurrentToothId = (originalToothId: string): string => {
    if (enhancedState.primaryTeeth.has(originalToothId) && PRIMARY_TOOTH_MAPPINGS[originalToothId]) {
      return PRIMARY_TOOTH_MAPPINGS[originalToothId];
    }
    return originalToothId;
  };

  // Function to toggle between permanent and primary tooth
  const toggleToothType = (originalToothId: string) => {
    if (!canSwitchToPrimary(originalToothId)) return;
    
    console.log('🔄 Toggling tooth type for:', originalToothId);
    
    setEnhancedState(prev => {
      const newPrimaryTeeth = new Set(prev.primaryTeeth);
      if (newPrimaryTeeth.has(originalToothId)) {
        newPrimaryTeeth.delete(originalToothId);
        console.log('➡️ Switched to permanent:', originalToothId);
      } else {
        newPrimaryTeeth.add(originalToothId);
        console.log('➡️ Switched to primary:', originalToothId, '→', PRIMARY_TOOTH_MAPPINGS[originalToothId]);
      }
      return { ...prev, primaryTeeth: newPrimaryTeeth };
    });
  };

  // Helper function to update state
  const updateState = (updates: Partial<EnhancedFillingsAssessmentState>) => {
    setEnhancedState(prev => ({ ...prev, ...updates }));
  };

  // Updated tooth positions - same as other assessment screens
  const toothOffsets: Record<string, { x: number; y: number }> = {
    // Upper arch - symmetric pairs
    '21': { x: 20, y: -120 },   '11': { x: -20, y: -120 },
    '22': { x: 55, y: -110 },   '12': { x: -55, y: -110 },
    '23': { x: 90, y: -90 },    '13': { x: -90, y: -90 },
    '24': { x: 110, y: -60 },   '14': { x: -110, y: -60 },
    '25': { x: 120, y: -25 },   '15': { x: -120, y: -25 },
    '26': { x: 125, y: 10 },    '16': { x: -125, y: 10 },
    '27': { x: 125, y: 45 },    '17': { x: -125, y: 45 },
    '28': { x: 125, y: 80 },    '18': { x: -125, y: 80 },
    
    // Lower arch - symmetric pairs
    '31': { x: 20, y: 330 },    '41': { x: -20, y: 330 },
    '32': { x: 55, y: 320 },    '42': { x: -55, y: 320 },
    '33': { x: 90, y: 300 },    '43': { x: -90, y: 300 },
    '34': { x: 110, y: 270 },   '44': { x: -110, y: 270 },
    '35': { x: 120, y: 235 },   '45': { x: -120, y: 235 },
    '36': { x: 125, y: 200 },   '46': { x: -125, y: 200 },
    '37': { x: 125, y: 165 },   '47': { x: -125, y: 165 },
    '38': { x: 125, y: 130 },   '48': { x: -125, y: 130 },
  };

  // ✅ SIMPLIFIED SAVE - Use context function
  const handleSave = async () => {
    try {
      // Transform tooth states to use current display tooth numbers
      const transformedTeethStates: Record<string, ToothAssessment> = {};
      
      Object.entries(enhancedState.teethStates).forEach(([originalToothId, assessment]) => {
        const currentToothId = getCurrentToothId(originalToothId);
        transformedTeethStates[currentToothId] = assessment;
        
        if (currentToothId !== originalToothId) {
          console.log(`💾 Saving tooth ${originalToothId} as primary tooth ${currentToothId}`);
        }
      });

      // Create comprehensive assessment data
      const assessmentData = {
        ...enhancedState,
        teethStates: transformedTeethStates,
        primaryTeeth: Array.from(enhancedState.primaryTeeth),
        originalTeethStates: enhancedState.teethStates,
        savedWithPrimaryNumbers: true,
        timestamp: new Date().toISOString(),
        restorationStates
      };

      // ✅ Use the context's saveAssessment function
      await saveAssessment(patientId, assessmentData);
      
      Alert.alert('Success', 'Fillings assessment saved!');
      navigation.goBack();
    } catch (error) {
      console.error('❌ Error saving fillings assessment:', error);
      Alert.alert('Error', 'Failed to save assessment. Please try again.');
    }
  };

  const openToothEditor = (toothId: string) => {
    updateState({ 
      selectedTooth: toothId, 
      modalVisible: true, 
      activeTab: 'fillings' 
    });
  };

  const closeToothEditor = () => {
    updateState({ 
      selectedTooth: null, 
      modalVisible: false 
    });
  };

  const updateToothState = (toothId: string, updates: Partial<ToothAssessment>) => {
    const newTeethStates = {
      ...enhancedState.teethStates,
      [toothId]: {
        ...enhancedState.teethStates[toothId],
        ...updates
      }
    };
    updateState({ teethStates: newTeethStates });
  };

  const toggleSurface = (toothId: string, category: 'fillingSurfaces' | 'cavitySurfaces' | 'brokenSurfaces', surface: Surface) => {
    const currentSurfaces = enhancedState.teethStates[toothId][category];
    const newSurfaces = currentSurfaces.includes(surface)
      ? currentSurfaces.filter(s => s !== surface)
      : [...currentSurfaces, surface].sort();
    
    updateToothState(toothId, { [category]: newSurfaces });
  };

  const clearTooth = () => {
    if (!enhancedState.selectedTooth) return;
    updateToothState(enhancedState.selectedTooth, { ...defaultToothState });
  };

  const getToothStyle = (toothId: string) => {
    const tooth = enhancedState.teethStates[toothId];
    
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
    const tooth = enhancedState.teethStates[toothId];
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
    const currentToothId = getCurrentToothId(toothId);
    const canSwitch = canSwitchToPrimary(toothId);
    const isCurrentlyPrimary = enhancedState.primaryTeeth.has(toothId);
    
    return (
      <View key={toothId} style={{ position: 'absolute', left: position.left, top: position.top }}>
        <Pressable
          onPress={() => openToothEditor(toothId)}
          onLongPress={() => {
            if (canSwitch) toggleToothType(toothId);
          }}
          delayLongPress={500}
          style={[
            styles.toothCircle,
            getToothStyle(toothId),
          ]}
        >
          <Text style={[styles.toothLabel, isCurrentlyPrimary && styles.primaryToothLabel]}>
            {currentToothId}
          </Text>
          {statusText && (
            <View style={styles.statusIndicator}>
              <Text style={styles.statusText}>{statusText}</Text>
            </View>
          )}
        </Pressable>
        
        {canSwitch && (
          <View style={styles.switchIndicator}>
            <Text style={styles.switchText}>
              {isCurrentlyPrimary ? 'P' : 'A'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Calculate assessment summary
  const assessmentSummary = useMemo(() => {
    const teeth = Object.entries(enhancedState.teethStates);
    
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
  }, [enhancedState.teethStates]);

  const showDetailedReport = () => {
    const teeth = Object.entries(enhancedState.teethStates).filter(([_, tooth]) => 
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
  const currentToothId = getCurrentToothId(toothId);
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
  return `• Tooth ${currentToothId}: ${findings.join(', ')}`;
}).join('\n')}
    `;
    
    Alert.alert('Dental Assessment Report', report.trim());
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>🦷 Comprehensive Dental Assessment</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

      {/* Voice Recording Section */}
      <View style={styles.voiceRecordingSection}>
        <Text style={styles.voiceRecordingTitle}>📝 Voice Notes</Text>
        <Text style={styles.voiceRecordingSubtitle}>
          Record voice notes during dental assessment for later reference
        </Text>
        <VoiceRecorder
          patientId={patientId}
          category="Assessment"
          subcategory="Fillings"
          buttonStyle={styles.voiceRecorderButton}
        />
      </View>

      {/* Instructions */}
      <Text style={styles.chartInstructions}>
        Tap to assess teeth • Long press switchable teeth (11-15, 21-25, 31-35, 41-45) to toggle Primary/Adult
      </Text>

      {/* Debug Info */}
      <Text style={styles.debugText}>
        Primary teeth: {Array.from(enhancedState.primaryTeeth).join(', ') || 'None'}
      </Text>

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
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{assessmentSummary.totalBroken}</Text>
            <Text style={styles.summaryLabel}>Broken</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{assessmentSummary.totalRootCanals}</Text>
            <Text style={styles.summaryLabel}>RCT Needed</Text>
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

      {/* Primary/Adult tooth legend */}
      <View style={styles.typeIndicatorLegend}>
        <View style={styles.legendItem}>
          <View style={styles.switchIndicator}>
            <Text style={styles.switchText}>A</Text>
          </View>
          <Text style={styles.legendLabel}>Adult Tooth</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.switchIndicator}>
            <Text style={styles.switchText}>P</Text>
          </View>
          <Text style={styles.legendLabel}>Primary Tooth</Text>
        </View>
      </View>

      <Text style={styles.surfaceNote}>
        Surfaces: M=Mesial, D=Distal, L=Lingual, B=Buccal, O=Occlusal{'\n'}
        Status: F=Filling, CR=Crown, RCT=Root Canal Treatment, C=Cavity, B=Broken, RC!=Root Canal Needed
      </Text>

      {/* ✅ Updated Save Button - calls handleSave */}
      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Assessment</Text>
      </Pressable>

      {/* Tooth Assessment Modal - content truncated for brevity, keep all the modal code as-is */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={enhancedState.modalVisible}
        onRequestClose={closeToothEditor}
      >
        {/* Keep all the existing modal content - it's too long to include here but doesn't need changes */}
      </Modal>
    </ScrollView>
  );
};

export default ComprehensiveDentalAssessmentScreen;

// Keep all existing styles - no changes needed
const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  subtext: { fontSize: 12, color: '#665', marginBottom: 16 },
  voiceRecordingSection: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 20, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 3, 
    borderLeftWidth: 4, 
    borderLeftColor: '#6f42c1', 
    width: '100%' 
  },
  voiceRecordingTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  voiceRecordingSubtitle: { fontSize: 12, color: '#666', marginBottom: 12 },
  voiceRecorderButton: { backgroundColor: '#6f42c1' },
  chartInstructions: { fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 10, fontStyle: 'italic', paddingHorizontal: 20 },
  debugText: { fontSize: 10, color: '#999', textAlign: 'center', marginBottom: 16, fontStyle: 'italic' },
  summaryCard: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 16, width: '100%', marginBottom: 20, borderWidth: 1, borderColor: '#e9ecef' },
  summaryTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#333' },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  summaryLabel: { fontSize: 12, color: '#665', textAlign: 'center' },
  reportButton: { backgroundColor: '#007bff', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, marginTop: 12, alignSelf: 'flex-start' },
  reportButtonText: { color: 'white', fontSize: 12, fontWeight: '600' },
  dentalChart: { width: 360, height: 480, position: 'relative', marginBottom: 30 },
  upperArchLabel: { fontSize: 16, fontWeight: '600', color: '#333', textAlign: 'center', position: 'absolute', top: 50, left: 150, width: 60 },
  lowerArchLabel: { fontSize: 16, fontWeight: '600', color: '#333', textAlign: 'center', position: 'absolute', top: 390, left: 150, width: 60 },
  toothCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  toothLabel: { color: 'white', fontWeight: '600', fontSize: 10 },
  primaryToothLabel: { color: '#ffd700', fontWeight: 'bold' },
  switchIndicator: { position: 'absolute', top: -8, left: -8, backgroundColor: '#28a745', borderRadius: 6, width: 12, height: 12, justifyContent: 'center', alignItems: 'center' },
  switchText: { color: 'white', fontSize: 8, fontWeight: 'bold' },
  statusIndicator: { position: 'absolute', bottom: -16, backgroundColor: 'rgba(0, 0, 0, 0.8)', borderRadius: 6, paddingHorizontal: 2, paddingVertical: 1, maxWidth: 50 },
  statusText: { color: 'white', fontSize: 7, fontWeight: '600' },
  toothNormal: { backgroundColor: '#28a745' },
  toothFillings: { backgroundColor: '#007bff' },
  toothCrowns: { backgroundColor: '#ffc107' },
  toothExistingRootCanal: { backgroundColor: '#6f42c1' },
  toothCavities: { backgroundColor: '#fd7e14' },
  toothBroken: { backgroundColor: '#e83e8c' },
  toothRootCanal: { backgroundColor: '#dc3545' },
  legend: { width: '100%', alignItems: 'flex-start', marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginVertical: 3, width: '100%' },
  legendCircle: { width: 18, height: 18, borderRadius: 9, marginRight: 12 },
  legendLabel: { fontSize: 13, color: '#333' },
  typeIndicatorLegend: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 16, gap: 20 },
  surfaceNote: { fontSize: 12, color: '#665', fontStyle: 'italic', textAlign: 'center', marginBottom: 20 },
  saveButton: { backgroundColor: '#007bff', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, marginBottom: 20 },
  saveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: '95%', maxWidth: 450, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: '#333' },
  toothTypeIndicator: { fontSize: 14, fontWeight: 'normal', color: '#666' },
  switchButton: { backgroundColor: '#007bff', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12, marginBottom: 16, alignSelf: 'center' },
  switchButtonText: { color: 'white', fontSize: 12, fontWeight: '600' },
  tabScrollContainer: { marginBottom: 20 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#f8f9fa', borderRadius: 8, padding: 2, minWidth: 480 },
  tab: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, alignItems: 'center', minWidth: 75 },
  activeTab: { backgroundColor: '#007bff' },
  tabText: { fontSize: 11, fontWeight: '600', color: '#666' },
  activeTabText: { color: 'white' },
  tabContent: { maxHeight: 300, marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12, marginTop: 16, color: '#333' },
  toggleButton: { backgroundColor: '#f8f9fa', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 2, borderColor: '#e9ecef', marginBottom: 8 },
  toggleButtonActive: { backgroundColor: '#007bff', borderColor: '#007bff' },
  toggleButtonText: { fontSize: 14, fontWeight: '600', textAlign: 'center', color: '#333' },
  toggleButtonActiveText: { color: 'white' },
  fillingTypeButtons: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  fillingTypeButton: { backgroundColor: '#f8f9fa', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 2, borderColor: '#e9ecef', flex: 1, marginHorizontal: 2 },
  fillingTypeButtonSelected: { backgroundColor: '#28a745', borderColor: '#28a745' },
  fillingTypeButtonText: { fontSize: 12, fontWeight: '600', textAlign: 'center', color: '#333' },
  fillingTypeButtonTextSelected: { color: 'white' },
  surfaceButtons: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  surfaceButton: { backgroundColor: '#f8f9fa', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 2, borderColor: '#e9ecef' },
  surfaceButtonSelected: { backgroundColor: '#007bff', borderColor: '#007bff' },
  surfaceButtonText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  surfaceButtonTextSelected: { color: 'white' },
  diagnosisButton: { backgroundColor: '#f8f9fa', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 2, borderColor: '#e9ecef', marginBottom: 8 },
  diagnosisButtonSelected: { backgroundColor: '#dc3545', borderColor: '#dc3545' },
  diagnosisButtonText: { fontSize: 12, fontWeight: '600', textAlign: 'center', color: '#333' },
  diagnosisButtonTextSelected: { color: 'white' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  clearButton: { backgroundColor: '#6c757d', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 },
  clearButtonText: { color: 'white', fontSize: 14, fontWeight: '600' },
  doneButton: { backgroundColor: '#28a745', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 },
  doneButtonText: { color: 'white', fontSize: 14, fontWeight: '600' },
});