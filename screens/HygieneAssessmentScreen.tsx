import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { useHygieneAssessment } from '../contexts/HygieneAssessmentContext';
import VoiceRecorder from '../components/VoiceRecorder';

const HYGIENE_LEVELS = ['none', 'light', 'moderate', 'heavy'] as const;
type HygieneLevel = typeof HYGIENE_LEVELS[number];

const DISTRIBUTION_TYPES = ['none', 'generalized', 'localized'] as const;
type DistributionType = typeof DISTRIBUTION_TYPES[number];

const QUADRANTS = ['upper-right', 'upper-left', 'lower-left', 'lower-right'] as const;
type Quadrant = typeof QUADRANTS[number];

const PROBING_DEPTHS = [2, 3, 4, 5, 6, 7, 8, 9] as const;
type ProbingDepth = typeof PROBING_DEPTHS[number];

// AAP Classification Types
const AAP_STAGES = ['1', '2', '3', '4'] as const;
type AAPStage = typeof AAP_STAGES[number];

const AAP_GRADES = ['A', 'B', 'C', 'D'] as const;
type AAPGrade = typeof AAP_GRADES[number];

const QUADRANT_LABELS = {
  'upper-right': 'Upper Right',
  'upper-left': 'Upper Left', 
  'lower-left': 'Lower Left',
  'lower-right': 'Lower Right'
};

const ALL_TEETH = [
  '11','12','13','14','15','16','17','18',
  '21','22','23','24','25','26','27','28',
  '31','32','33','34','35','36','37','38',
  '41','42','43','44','45','46','47','48',
];

const CALCULUS_LABELS = {
  'none': 'No Calculus',
  'light': 'Light Calculus',
  'moderate': 'Moderate Calculus',
  'heavy': 'Heavy Calculus'
};

const PLAQUE_LABELS = {
  'none': 'No Plaque',
  'light': 'Light Plaque',
  'moderate': 'Moderate Plaque',
  'heavy': 'Heavy Plaque'
};

// AAP Classification Labels
const AAP_STAGE_LABELS = {
  '1': 'Stage I: Initial Periodontitis',
  '2': 'Stage II: Moderate Periodontitis',
  '3': 'Stage III: Severe Periodontitis',
  '4': 'Stage IV: Advanced Periodontitis'
};

const AAP_GRADE_LABELS = {
  'A': 'Grade A: Slow Rate of Progression',
  'B': 'Grade B: Moderate Rate of Progression',
  'C': 'Grade C: Rapid Rate of Progression',
  'D': 'Grade D: Necrotizing Periodontal Disease'
};

const AAP_STAGE_DESCRIPTIONS = {
  '1': 'CAL 1-2mm, RBL <15%, No tooth loss',
  '2': 'CAL 3-4mm, RBL 15-33%, No tooth loss',
  '3': 'CAL ≥5mm, RBL >33%, Tooth loss ≤4 teeth',
  '4': 'CAL ≥5mm, RBL >33%, Tooth loss ≥5 teeth'
};

const AAP_GRADE_DESCRIPTIONS = {
  'A': 'BL/Age <0.25, Non-smoker, No diabetes',
  'B': 'BL/Age 0.25-1.0, Smoker <10 cig/day, HbA1c <7%',
  'C': 'BL/Age >1.0, Heavy smoker, HbA1c ≥7%',
  'D': 'Necrotizing gingivitis/periodontitis'
};

// Enhanced Hygiene Assessment State Interface
interface EnhancedHygieneState {
  // Assessment mode
  assessmentMode: 'calculus' | 'plaque' | 'probing' | 'bleeding' | 'aap';
  
  // Calculus assessment
  calculusLevel: HygieneLevel;
  calculusDistribution: DistributionType;
  calculusQuadrants: Quadrant[];
  
  // Plaque assessment
  plaqueLevel: HygieneLevel;
  plaqueDistribution: DistributionType;
  plaqueQuadrants: Quadrant[];
  
  // Probing depths
  probingDepths: Record<string, ProbingDepth>;
  
  // Bleeding on probing
  bleedingOnProbing: Record<string, boolean>;
  
  // AAP Classification
  aapStage: AAPStage | null;
  aapGrade: AAPGrade | null;
  
  // UI state
  selectedTooth: string | null;
  showDepthSelector: boolean;
}

const HygieneAssessmentScreen = ({ route, navigation }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  
  // ✅ Get saveAssessment and other functions from context
  const { 
    hygieneStates, 
    setHygieneStates,
    saveAssessment,
    loadLatestAssessment,
  } = useHygieneAssessment();

  // Create a comprehensive state object that gets preserved in the context
  const getInitialState = (): EnhancedHygieneState => {
    const initialProbingDepths: Record<string, ProbingDepth> = {};
    const initialBleedingOnProbing: Record<string, boolean> = {};
    ALL_TEETH.forEach(toothId => {
      initialProbingDepths[toothId] = 2;
      initialBleedingOnProbing[toothId] = false;
    });

    return {
      assessmentMode: 'calculus',
      calculusLevel: 'none',
      calculusDistribution: 'none',
      calculusQuadrants: [],
      plaqueLevel: 'none',
      plaqueDistribution: 'none',
      plaqueQuadrants: [],
      probingDepths: initialProbingDepths,
      bleedingOnProbing: initialBleedingOnProbing,
      aapStage: null,
      aapGrade: null,
      selectedTooth: null,
      showDepthSelector: false,
    };
  };

  // Initialize state from context or defaults
  const [enhancedState, setEnhancedState] = useState<EnhancedHygieneState>(() => {
    // Try to get saved state from hygieneStates context
    if (hygieneStates && typeof hygieneStates === 'object' && 'enhancedAssessment' in hygieneStates) {
      return { ...getInitialState(), ...hygieneStates.enhancedAssessment };
    }
    return getInitialState();
  });

  // Load previous assessment on mount (optional - for pre-filling)
  useEffect(() => {
    const loadPrevious = async () => {
      await loadLatestAssessment(patientId);
    };
    
    loadPrevious();
    
    // Reset on unmount
    return () => {
    };
  }, [patientId]);

  // Save state to context whenever it changes
  useEffect(() => {
    setHygieneStates({
      ...hygieneStates,
      enhancedAssessment: enhancedState
    });
  }, [enhancedState]);

  // Helper function to update state
  const updateState = (updates: Partial<EnhancedHygieneState>) => {
    setEnhancedState(prev => ({ ...prev, ...updates }));
  };

  // Tooth positions for diagram
  const toothOffsets: Record<string, { x: number; y: number }> = {
    '21': { x: 20, y: -120 },   '11': { x: -20, y: -120 },
    '22': { x: 55, y: -110 },   '12': { x: -55, y: -110 },
    '23': { x: 90, y: -90 },    '13': { x: -90, y: -90 },
    '24': { x: 110, y: -60 },   '14': { x: -110, y: -60 },
    '25': { x: 120, y: -25 },   '15': { x: -120, y: -25 },
    '26': { x: 125, y: 10 },    '16': { x: -125, y: 10 },
    '27': { x: 125, y: 45 },    '17': { x: -125, y: 45 },
    '28': { x: 125, y: 80 },    '18': { x: -125, y: 80 },
    '31': { x: 20, y: 330 },    '41': { x: -20, y: 330 },
    '32': { x: 55, y: 320 },    '42': { x: -55, y: 320 },
    '33': { x: 90, y: 300 },    '43': { x: -90, y: 300 },
    '34': { x: 110, y: 270 },   '44': { x: -110, y: 270 },
    '35': { x: 120, y: 235 },   '45': { x: -120, y: 235 },
    '36': { x: 125, y: 200 },   '46': { x: -125, y: 200 },
    '37': { x: 125, y: 165 },   '47': { x: -125, y: 165 },
    '38': { x: 125, y: 130 },   '48': { x: -125, y: 130 },
  };

  // ✅ UPDATED: Use context's saveAssessment function
  const handleSaveAssessment = async () => {
    try {
      // ✅ OPTIMIZED: Transform data before saving
      const optimizedData = optimizeHygieneData(enhancedState);
      
      console.log('💾 Saving optimized hygiene assessment:', optimizedData);
      console.log('📊 Size reduction:', 
        `${JSON.stringify(buildLegacyData(enhancedState)).length} bytes -> ${JSON.stringify(optimizedData).length} bytes`
      );
      
      await saveAssessment(patientId, optimizedData);
      Alert.alert('Success', 'Hygiene assessment saved successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving hygiene assessment:', error);
      Alert.alert('Error', 'Failed to save hygiene assessment. Please try again.');
    }
  };
  
  // ✅ NEW: Helper function to build legacy format (for comparison)
  const buildLegacyData = (state: EnhancedHygieneState) => {
    return {
      calculusLevel: state.calculusLevel,
      calculusDistribution: state.calculusDistribution,
      calculusQuadrants: state.calculusQuadrants,
      plaqueLevel: state.plaqueLevel,
      plaqueDistribution: state.plaqueDistribution,
      plaqueQuadrants: state.plaqueQuadrants,
      probingDepths: state.probingDepths,
      bleedingOnProbing: state.bleedingOnProbing,
      aapStage: state.aapStage,
      aapGrade: state.aapGrade,
    };
  };
  
  // ✅ NEW: Optimization function
  const optimizeHygieneData = (state: EnhancedHygieneState) => {
    // Find the most common probing depth (usually 2mm)
    const depthCounts = new Map<ProbingDepth, number>();
    Object.values(state.probingDepths).forEach(depth => {
      depthCounts.set(depth, (depthCounts.get(depth) || 0) + 1);
    });
    
    let defaultDepth: ProbingDepth = 2;
    let maxCount = 0;
    depthCounts.forEach((count, depth) => {
      if (count > maxCount) {
        maxCount = count;
        defaultDepth = depth;
      }
    });
    
    // Build exceptions object (only teeth that differ from default)
    const depthExceptions: Record<string, ProbingDepth> = {};
    Object.entries(state.probingDepths).forEach(([toothId, depth]) => {
      if (depth !== defaultDepth) {
        depthExceptions[toothId] = depth;
      }
    });
    
    // Get only teeth that DO bleed (instead of all teeth with boolean)
    const bleedingTeeth = Object.entries(state.bleedingOnProbing)
      .filter(([_, bleeds]) => bleeds)
      .map(([toothId, _]) => toothId);
    
    // Shorten quadrant names
    const shortenQuadrant = (q: string) => {
      const map: Record<string, string> = {
        'upper-right': 'UR',
        'upper-left': 'UL',
        'lower-left': 'LL',
        'lower-right': 'LR'
      };
      return map[q] || q;
    };
    
    return {
      // Calculus (optimized structure)
      calculus: {
        level: state.calculusLevel,
        distribution: state.calculusDistribution,
        ...(state.calculusDistribution === 'localized' && state.calculusQuadrants.length > 0
          ? { quadrants: state.calculusQuadrants.map(shortenQuadrant) }
          : {}
        )
      },
      
      // Plaque (optimized structure)
      plaque: {
        level: state.plaqueLevel,
        distribution: state.plaqueDistribution,
        ...(state.plaqueDistribution === 'localized' && state.plaqueQuadrants.length > 0
          ? { quadrants: state.plaqueQuadrants.map(shortenQuadrant) }
          : {}
        )
      },
      
      // ✅ OPTIMIZED: Probing depths with exceptions
      probingDepths: {
        default: defaultDepth,
        ...(Object.keys(depthExceptions).length > 0
          ? { exceptions: depthExceptions }
          : {}
        )
      },
      
      // ✅ OPTIMIZED: Only bleeding teeth (not booleans for all)
      ...(bleedingTeeth.length > 0
        ? { bleedingTeeth }
        : {}
      ),
      
      // AAP Classification (compact structure)
      ...(state.aapStage || state.aapGrade
        ? {
            aap: {
              ...(state.aapStage ? { stage: state.aapStage } : {}),
              ...(state.aapGrade ? { grade: state.aapGrade } : {})
            }
          }
        : {}
      )
    };
  };

  // Assessment handler functions
  const handleCalculusLevelChange = (level: HygieneLevel) => {
    const updates: Partial<EnhancedHygieneState> = { calculusLevel: level };
    if (level === 'none') {
      updates.calculusDistribution = 'none';
      updates.calculusQuadrants = [];
    }
    updateState(updates);
  };

  const handleCalculusDistributionChange = (distribution: DistributionType) => {
    const updates: Partial<EnhancedHygieneState> = { calculusDistribution: distribution };
    if (distribution === 'generalized') {
      updates.calculusQuadrants = ['upper-right', 'upper-left', 'lower-left', 'lower-right'];
    } else if (distribution === 'none') {
      updates.calculusQuadrants = [];
    }
    updateState(updates);
  };

  const toggleCalculusQuadrant = (quadrant: Quadrant) => {
    const newQuadrants = enhancedState.calculusQuadrants.includes(quadrant) 
      ? enhancedState.calculusQuadrants.filter(q => q !== quadrant)
      : [...enhancedState.calculusQuadrants, quadrant];
    updateState({ calculusQuadrants: newQuadrants });
  };

  const handlePlaqueLevelChange = (level: HygieneLevel) => {
    const updates: Partial<EnhancedHygieneState> = { plaqueLevel: level };
    if (level === 'none') {
      updates.plaqueDistribution = 'none';
      updates.plaqueQuadrants = [];
    }
    updateState(updates);
  };

  const handlePlaqueDistributionChange = (distribution: DistributionType) => {
    const updates: Partial<EnhancedHygieneState> = { plaqueDistribution: distribution };
    if (distribution === 'generalized') {
      updates.plaqueQuadrants = ['upper-right', 'upper-left', 'lower-left', 'lower-right'];
    } else if (distribution === 'none') {
      updates.plaqueQuadrants = [];
    }
    updateState(updates);
  };

  const togglePlaqueQuadrant = (quadrant: Quadrant) => {
    const newQuadrants = enhancedState.plaqueQuadrants.includes(quadrant) 
      ? enhancedState.plaqueQuadrants.filter(q => q !== quadrant)
      : [...enhancedState.plaqueQuadrants, quadrant];
    updateState({ plaqueQuadrants: newQuadrants });
  };

  // AAP Classification handlers
  const handleAAPStageChange = (stage: AAPStage) => {
    updateState({ aapStage: stage });
  };

  const handleAAPGradeChange = (grade: AAPGrade) => {
    updateState({ aapGrade: grade });
  };

  // Probing and bleeding handler functions
  const onToothPress = (toothId: string) => {
    if (enhancedState.assessmentMode === 'probing') {
      updateState({ selectedTooth: toothId, showDepthSelector: true });
    } else if (enhancedState.assessmentMode === 'bleeding') {
      toggleBleedingOnProbing(toothId);
    }
  };

  const setProbingDepth = (toothId: string, depth: ProbingDepth) => {
    const newDepths = { ...enhancedState.probingDepths, [toothId]: depth };
    updateState({ 
      probingDepths: newDepths,
      showDepthSelector: false,
      selectedTooth: null 
    });
  };

  const toggleBleedingOnProbing = (toothId: string) => {
    const newBleeding = { 
      ...enhancedState.bleedingOnProbing, 
      [toothId]: !enhancedState.bleedingOnProbing[toothId] 
    };
    updateState({ bleedingOnProbing: newBleeding });
  };

  const quickSetAllProbing = (depth: ProbingDepth) => {
    const newDepths: Record<string, ProbingDepth> = {};
    ALL_TEETH.forEach(toothId => {
      newDepths[toothId] = depth;
    });
    updateState({ probingDepths: newDepths });
  };

  const quickSetAllBleeding = (bleeding: boolean) => {
    const newBleeding: Record<string, boolean> = {};
    ALL_TEETH.forEach(toothId => {
      newBleeding[toothId] = bleeding;
    });
    updateState({ bleedingOnProbing: newBleeding });
  };

  // Utility functions for tooth rendering
  const getProbingToothStyle = (depth: ProbingDepth) => {
    if (depth <= 3) return styles.probingHealthy;
    if (depth === 4) return styles.probingMild;
    if (depth <= 6) return styles.probingModerate;
    return styles.probingSevere;
  };

  const getBleedingToothStyle = (bleeding: boolean) => {
    return bleeding ? styles.bleedingPresent : styles.bleedingAbsent;
  };

  const getToothPosition = (toothId: string) => {
    const chartCenter = { x: 180, y: 135 };
    const offset = toothOffsets[toothId];
    return {
      left: chartCenter.x + offset.x - 18,
      top: chartCenter.y + offset.y - 18
    };
  };

  const renderTooth = (toothId: string) => {
    const position = getToothPosition(toothId);
    const depth = enhancedState.probingDepths[toothId];
    const bleeding = enhancedState.bleedingOnProbing[toothId];
    
    let toothStyle = styles.toothDefault;
    let displayText = toothId;
    
    if (enhancedState.assessmentMode === 'probing') {
      toothStyle = getProbingToothStyle(depth);
      displayText = `${toothId}\n${depth}mm`;
    } else if (enhancedState.assessmentMode === 'bleeding') {
      toothStyle = getBleedingToothStyle(bleeding);
      displayText = `${toothId}\n${bleeding ? 'YES' : 'NO'}`;
    }
    
    return (
      <Pressable
        key={toothId}
        onPress={() => onToothPress(toothId)}
        style={[
          styles.toothCircle,
          toothStyle,
          enhancedState.selectedTooth === toothId && styles.toothSelected,
          {
            position: 'absolute',
            left: position.left,
            top: position.top,
          }
        ]}
        disabled={enhancedState.assessmentMode === 'calculus' || enhancedState.assessmentMode === 'plaque' || enhancedState.assessmentMode === 'aap'}
      >
        <Text style={styles.toothLabel}>{displayText}</Text>
      </Pressable>
    );
  };

  const showDetailedReport = () => {
    const bleedingCount = ALL_TEETH.filter(toothId => enhancedState.bleedingOnProbing[toothId]).length;
    const bleedingPercentage = (bleedingCount / ALL_TEETH.length) * 100;
    
    const report = `
Full Mouth Hygiene Assessment Report
Patient ID: ${patientId}

AAP PERIODONTAL CLASSIFICATION:
• Stage: ${enhancedState.aapStage ? AAP_STAGE_LABELS[enhancedState.aapStage] : 'Not assessed'}
• Grade: ${enhancedState.aapGrade ? AAP_GRADE_LABELS[enhancedState.aapGrade] : 'Not assessed'}

CALCULUS ASSESSMENT:
• Level: ${CALCULUS_LABELS[enhancedState.calculusLevel]}
• Distribution: ${enhancedState.calculusDistribution}

PLAQUE ASSESSMENT:
• Level: ${PLAQUE_LABELS[enhancedState.plaqueLevel]}
• Distribution: ${enhancedState.plaqueDistribution}

PROBING DEPTHS:
• Average: ${(ALL_TEETH.reduce((sum, toothId) => sum + enhancedState.probingDepths[toothId], 0) / ALL_TEETH.length).toFixed(1)}mm
• Healthy (≤3mm): ${ALL_TEETH.filter(toothId => enhancedState.probingDepths[toothId] <= 3).length} teeth
• Severe (≥7mm): ${ALL_TEETH.filter(toothId => enhancedState.probingDepths[toothId] >= 7).length} teeth

BLEEDING ON PROBING:
• Bleeding Sites: ${bleedingCount} teeth (${bleedingPercentage.toFixed(1)}%)
    `;
    
    Alert.alert('Hygiene Assessment Report', report.trim());
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>🧼 Full Mouth Hygiene Assessment</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

      {/* Voice Recording Section */}
      <View style={styles.voiceRecordingSection}>
        <Text style={styles.voiceRecordingTitle}>📝 Voice Notes</Text>
        <Text style={styles.voiceRecordingSubtitle}>
          Record voice notes during hygiene assessment for later reference
        </Text>
        <VoiceRecorder
          patientId={patientId}
          category="Assessment"
          subcategory="Hygiene"
          buttonStyle={styles.voiceRecorderButton}
        />
      </View>

      {/* Assessment Mode Toggle */}
      <View style={styles.modeToggleContainer}>
        <Text style={styles.modeToggleTitle}>Assessment Mode:</Text>
        <View style={styles.modeToggleButtons}>
          <Pressable 
            style={[
              styles.modeToggleButton, 
              enhancedState.assessmentMode === 'calculus' && styles.modeToggleButtonActive
            ]} 
            onPress={() => updateState({ assessmentMode: 'calculus' })}
          >
            <Text style={[
              styles.modeToggleButtonText,
              enhancedState.assessmentMode === 'calculus' && styles.modeToggleButtonTextActive
            ]}>
              🦷 Calculus
            </Text>
          </Pressable>
          <Pressable 
            style={[
              styles.modeToggleButton, 
              enhancedState.assessmentMode === 'plaque' && styles.modeToggleButtonActive
            ]} 
            onPress={() => updateState({ assessmentMode: 'plaque' })}
          >
            <Text style={[
              styles.modeToggleButtonText,
              enhancedState.assessmentMode === 'plaque' && styles.modeToggleButtonTextActive
            ]}>
              🧽 Plaque
            </Text>
          </Pressable>
          <Pressable 
            style={[
              styles.modeToggleButton, 
              enhancedState.assessmentMode === 'probing' && styles.modeToggleButtonActive
            ]} 
            onPress={() => updateState({ assessmentMode: 'probing' })}
          >
            <Text style={[
              styles.modeToggleButtonText,
              enhancedState.assessmentMode === 'probing' && styles.modeToggleButtonTextActive
            ]}>
              🔍 Probing
            </Text>
          </Pressable>
          <Pressable 
            style={[
              styles.modeToggleButton, 
              enhancedState.assessmentMode === 'bleeding' && styles.modeToggleButtonActive
            ]} 
            onPress={() => updateState({ assessmentMode: 'bleeding' })}
          >
            <Text style={[
              styles.modeToggleButtonText,
              enhancedState.assessmentMode === 'bleeding' && styles.modeToggleButtonTextActive
            ]}>
              🩸 Bleeding
            </Text>
          </Pressable>
          <Pressable 
            style={[
              styles.modeToggleButton, 
              enhancedState.assessmentMode === 'aap' && styles.modeToggleButtonActive
            ]} 
            onPress={() => updateState({ assessmentMode: 'aap' })}
          >
            <Text style={[
              styles.modeToggleButtonText,
              enhancedState.assessmentMode === 'aap' && styles.modeToggleButtonTextActive
            ]}>
              📋 AAP
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Current Assessment Display */}
      <View style={styles.currentAssessmentCard}>
        <Text style={styles.currentTitle}>Current Assessment</Text>
        
        {enhancedState.assessmentMode === 'calculus' && (
          <View style={styles.currentLevelContainer}>
            <Text style={styles.currentLevel}>{CALCULUS_LABELS[enhancedState.calculusLevel]}</Text>
          </View>
        )}

        {enhancedState.assessmentMode === 'plaque' && (
          <View style={styles.currentLevelContainer}>
            <Text style={styles.currentLevel}>{PLAQUE_LABELS[enhancedState.plaqueLevel]}</Text>
          </View>
        )}

        {enhancedState.assessmentMode === 'probing' && (
          <View style={styles.currentLevelContainer}>
            <Text style={styles.currentLevel}>Probing Depth Summary</Text>
            <Text style={styles.currentDescription}>
              Average: {(ALL_TEETH.reduce((sum, toothId) => sum + enhancedState.probingDepths[toothId], 0) / ALL_TEETH.length).toFixed(1)}mm
            </Text>
          </View>
        )}

        {enhancedState.assessmentMode === 'bleeding' && (
          <View style={styles.currentLevelContainer}>
            <Text style={styles.currentLevel}>Bleeding Summary</Text>
            <Text style={styles.currentDescription}>
              {((ALL_TEETH.filter(toothId => enhancedState.bleedingOnProbing[toothId]).length / ALL_TEETH.length) * 100).toFixed(1)}% bleeding sites
            </Text>
          </View>
        )}

        {enhancedState.assessmentMode === 'aap' && (
          <View style={styles.currentLevelContainer}>
            <Text style={styles.currentLevel}>AAP Classification</Text>
            <Text style={styles.currentDescription}>
              Stage: {enhancedState.aapStage || 'Not Set'} | Grade: {enhancedState.aapGrade || 'Not Set'}
            </Text>
          </View>
        )}
      </View>

      {/* AAP Classification Content */}
      {enhancedState.assessmentMode === 'aap' && (
        <View style={styles.selectionCard}>
          <Text style={styles.selectionTitle}>AAP Periodontal Classification</Text>
          
          {/* AAP Stage Selection */}
          <View style={styles.aapSection}>
            <Text style={styles.aapSectionTitle}>🏥 Periodontal Stage</Text>
            <Text style={styles.aapSectionSubtitle}>Based on severity and complexity</Text>
            
            <View style={styles.aapOptions}>
              {AAP_STAGES.map(stage => (
                <Pressable
                  key={stage}
                  style={[
                    styles.aapOption,
                    enhancedState.aapStage === stage && styles.aapOptionSelected,
                    styles.aapStageOption
                  ]}
                  onPress={() => handleAAPStageChange(stage)}
                >
                  <View style={styles.aapOptionHeader}>
                    <Text style={styles.aapOptionTitle}>
                      Stage {stage}
                    </Text>
                    <Text style={styles.aapOptionLabel}>
                      {AAP_STAGE_LABELS[stage].replace(`Stage ${stage}: `, '')}
                    </Text>
                  </View>
                  <Text style={styles.aapOptionDescription}>
                    {AAP_STAGE_DESCRIPTIONS[stage]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* AAP Grade Selection */}
          <View style={styles.aapSection}>
            <Text style={styles.aapSectionTitle}>📈 Periodontal Grade</Text>
            <Text style={styles.aapSectionSubtitle}>Based on rate of progression and risk factors</Text>
            
            <View style={styles.aapOptions}>
              {AAP_GRADES.map(grade => (
                <Pressable
                  key={grade}
                  style={[
                    styles.aapOption,
                    enhancedState.aapGrade === grade && styles.aapOptionSelected,
                    styles.aapGradeOption
                  ]}
                  onPress={() => handleAAPGradeChange(grade)}
                >
                  <View style={styles.aapOptionHeader}>
                    <Text style={styles.aapOptionTitle}>
                      Grade {grade}
                    </Text>
                    <Text style={styles.aapOptionLabel}>
                      {AAP_GRADE_LABELS[grade].replace(`Grade ${grade}: `, '')}
                    </Text>
                  </View>
                  <Text style={styles.aapOptionDescription}>
                    {AAP_GRADE_DESCRIPTIONS[grade]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Current Selection Summary */}
          {(enhancedState.aapStage || enhancedState.aapGrade) && (
            <View style={styles.aapSummary}>
              <Text style={styles.aapSummaryTitle}>Current Classification</Text>
              {enhancedState.aapStage && (
                <View style={styles.aapSummaryItem}>
                  <Text style={styles.aapSummaryLabel}>Stage:</Text>
                  <Text style={styles.aapSummaryValue}>{AAP_STAGE_LABELS[enhancedState.aapStage]}</Text>
                </View>
              )}
              {enhancedState.aapGrade && (
                <View style={styles.aapSummaryItem}>
                  <Text style={styles.aapSummaryLabel}>Grade:</Text>
                  <Text style={styles.aapSummaryValue}>{AAP_GRADE_LABELS[enhancedState.aapGrade]}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Calculus Assessment Content */}
      {enhancedState.assessmentMode === 'calculus' && (
        <View style={styles.selectionCard}>
          <Text style={styles.selectionTitle}>Select Calculus Level</Text>
          
          <View style={styles.levelOptions}>
            {HYGIENE_LEVELS.map(level => (
              <Pressable
                key={level}
                style={[
                  styles.levelOption,
                  enhancedState.calculusLevel === level && styles.levelOptionSelected,
                ]}
                onPress={() => handleCalculusLevelChange(level)}
              >
                <Text style={styles.levelOptionTitle}>
                  {CALCULUS_LABELS[level]}
                </Text>
              </Pressable>
            ))}
          </View>

          {enhancedState.calculusLevel !== 'none' && (
            <>
              <Text style={styles.distributionTitle}>Calculus Distribution</Text>
              <View style={styles.distributionOptions}>
                {['generalized', 'localized'].map(distribution => (
                  <Pressable
                    key={distribution}
                    style={[
                      styles.distributionOption,
                      enhancedState.calculusDistribution === distribution && styles.distributionOptionSelected,
                    ]}
                    onPress={() => handleCalculusDistributionChange(distribution as DistributionType)}
                  >
                    <Text style={styles.distributionOptionTitle}>
                      {distribution === 'generalized' ? '🌐 Generalized' : '📍 Localized'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {enhancedState.calculusDistribution === 'localized' && (
                <View style={styles.quadrantSection}>
                  <Text style={styles.quadrantTitle}>Select Affected Quadrants</Text>
                  <View style={styles.quadrantSelector}>
                    {QUADRANTS.map(quadrant => (
                      <Pressable
                        key={quadrant}
                        style={[
                          styles.quadrantButton,
                          enhancedState.calculusQuadrants.includes(quadrant) && styles.quadrantButtonSelected,
                        ]}
                        onPress={() => toggleCalculusQuadrant(quadrant)}
                      >
                        <Text style={styles.quadrantButtonText}>
                          {QUADRANT_LABELS[quadrant]}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* Plaque Assessment Content */}
      {enhancedState.assessmentMode === 'plaque' && (
        <View style={styles.selectionCard}>
          <Text style={styles.selectionTitle}>Select Plaque Level</Text>
          
          <View style={styles.levelOptions}>
            {HYGIENE_LEVELS.map(level => (
              <Pressable
                key={level}
                style={[
                  styles.levelOption,
                  enhancedState.plaqueLevel === level && styles.levelOptionSelected,
                ]}
                onPress={() => handlePlaqueLevelChange(level)}
              >
                <Text style={styles.levelOptionTitle}>
                  {PLAQUE_LABELS[level]}
                </Text>
              </Pressable>
            ))}
          </View>

          {enhancedState.plaqueLevel !== 'none' && (
            <>
              <Text style={styles.distributionTitle}>Plaque Distribution</Text>
              <View style={styles.distributionOptions}>
                {['generalized', 'localized'].map(distribution => (
                  <Pressable
                    key={distribution}
                    style={[
                      styles.distributionOption,
                      enhancedState.plaqueDistribution === distribution && styles.distributionOptionSelected,
                    ]}
                    onPress={() => handlePlaqueDistributionChange(distribution as DistributionType)}
                  >
                    <Text style={styles.distributionOptionTitle}>
                      {distribution === 'generalized' ? '🌐 Generalized' : '📍 Localized'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {enhancedState.plaqueDistribution === 'localized' && (
                <View style={styles.quadrantSection}>
                  <Text style={styles.quadrantTitle}>Select Affected Quadrants</Text>
                  <View style={styles.quadrantSelector}>
                    {QUADRANTS.map(quadrant => (
                      <Pressable
                        key={quadrant}
                        style={[
                          styles.quadrantButton,
                          enhancedState.plaqueQuadrants.includes(quadrant) && styles.quadrantButtonSelected,
                        ]}
                        onPress={() => togglePlaqueQuadrant(quadrant)}
                      >
                        <Text style={styles.quadrantButtonText}>
                          {QUADRANT_LABELS[quadrant]}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* Probing Assessment Content */}
      {enhancedState.assessmentMode === 'probing' && (
        <View style={styles.selectionCard}>
          <Text style={styles.selectionTitle}>Probing Depth Assessment</Text>
          
          <View style={styles.quickSetContainer}>
            <Text style={styles.quickSetTitle}>Quick Set All Teeth:</Text>
            <View style={styles.quickSetButtons}>
              <Pressable style={[styles.quickSetButton, styles.quickSetHealthy]} onPress={() => quickSetAllProbing(2)}>
                <Text style={styles.quickSetButtonText}>2mm</Text>
              </Pressable>
              <Pressable style={[styles.quickSetButton, styles.quickSetMild]} onPress={() => quickSetAllProbing(4)}>
                <Text style={styles.quickSetButtonText}>4mm</Text>
              </Pressable>
              <Pressable style={[styles.quickSetButton, styles.quickSetModerate]} onPress={() => quickSetAllProbing(6)}>
                <Text style={styles.quickSetButtonText}>6mm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Bleeding Assessment Content */}
      {enhancedState.assessmentMode === 'bleeding' && (
        <View style={styles.selectionCard}>
          <Text style={styles.selectionTitle}>Bleeding on Probing Assessment</Text>
          
          <View style={styles.quickSetContainer}>
            <Text style={styles.quickSetTitle}>Quick Set All Teeth:</Text>
            <View style={styles.quickSetButtons}>
              <Pressable style={[styles.quickSetButton, styles.quickSetNoBleed]} onPress={() => quickSetAllBleeding(false)}>
                <Text style={styles.quickSetButtonText}>No Bleeding</Text>
              </Pressable>
              <Pressable style={[styles.quickSetButton, styles.quickSetBleed]} onPress={() => quickSetAllBleeding(true)}>
                <Text style={styles.quickSetButtonText}>Bleeding</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Dental Chart - Only for probing and bleeding modes */}
      {(enhancedState.assessmentMode === 'probing' || enhancedState.assessmentMode === 'bleeding') && (
        <View style={styles.dentalChart}>
          <Text style={styles.upperArchLabel}>Upper Arch</Text>
          <Text style={styles.lowerArchLabel}>Lower Arch</Text>
          <Text style={styles.centerInstructions}>
            {enhancedState.assessmentMode === 'probing' ? 'Tap to set\nprobing depth' : 'Tap to toggle\nbleeding status'}
          </Text>
          
          {ALL_TEETH.map(toothId => renderTooth(toothId))}
        </View>
      )}

      {/* Depth Selector Modal */}
      {enhancedState.showDepthSelector && enhancedState.selectedTooth && (
        <View style={styles.depthSelectorOverlay}>
          <View style={styles.depthSelectorContainer}>
            <Text style={styles.depthSelectorTitle}>
              Probing Depth for Tooth {enhancedState.selectedTooth}
            </Text>
            <Text style={styles.depthSelectorSubtitle}>
              Current: {enhancedState.probingDepths[enhancedState.selectedTooth]}mm
            </Text>
            
            <View style={styles.depthGrid}>
              {PROBING_DEPTHS.map(depth => (
                <Pressable
                  key={depth}
                  style={[
                    styles.depthOption,
                    getProbingToothStyle(depth),
                    enhancedState.probingDepths[enhancedState.selectedTooth] === depth && styles.depthOptionSelected
                  ]}
                  onPress={() => setProbingDepth(enhancedState.selectedTooth!, depth)}
                >
                  <Text style={styles.depthOptionText}>{depth}mm</Text>
                </Pressable>
              ))}
            </View>
            
            <Pressable 
              style={styles.cancelButton} 
              onPress={() => updateState({ showDepthSelector: false, selectedTooth: null })}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Legends */}
      {enhancedState.assessmentMode === 'probing' && (
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Probing Depth Legend</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendCircle, styles.probingHealthy]} />
              <Text style={styles.legendLabel}>Healthy (≤3mm)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendCircle, styles.probingMild]} />
              <Text style={styles.legendLabel}>Mild (4mm)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendCircle, styles.probingModerate]} />
              <Text style={styles.legendLabel}>Moderate (5-6mm)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendCircle, styles.probingSevere]} />
              <Text style={styles.legendLabel}>Severe (≥7mm)</Text>
            </View>
          </View>
        </View>
      )}

      {enhancedState.assessmentMode === 'bleeding' && (
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Bleeding on Probing Legend</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendCircle, styles.bleedingAbsent]} />
              <Text style={styles.legendLabel}>No Bleeding</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendCircle, styles.bleedingPresent]} />
              <Text style={styles.legendLabel}>Bleeding Present</Text>
            </View>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Pressable style={styles.saveButton} onPress={handleSaveAssessment}>
          <Text style={styles.saveButtonText}>Save Assessment</Text>
        </Pressable>
        
        <Pressable style={styles.reportButton} onPress={showDetailedReport}>
          <Text style={styles.reportButtonText}>View Report</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

export default HygieneAssessmentScreen;

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
    color: '#666',
    marginBottom: 20,
  },
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
    width: '100%',
  },
  voiceRecordingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  voiceRecordingSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  voiceRecorderButton: {
    backgroundColor: '#6f42c1',
  },
  modeToggleContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  modeToggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  modeToggleButtons: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  modeToggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  modeToggleButtonActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  modeToggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  modeToggleButtonTextActive: {
    color: '#fff',
  },
  currentAssessmentCard: {
    backgroundColor: '#e7f3ff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#b3d9ff',
    alignItems: 'center',
  },
  currentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0056b3',
    marginBottom: 12,
  },
  currentLevelContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  currentLevel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0056b3',
    marginBottom: 4,
  },
  currentDescription: {
    fontSize: 14,
    color: '#0056b3',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  selectionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  aapSection: {
    marginBottom: 24,
  },
  aapSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  aapSectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  aapOptions: {
    gap: 12,
  },
  aapOption: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  aapOptionSelected: {
    borderColor: '#007bff',
    backgroundColor: '#f8f9ff',
  },
  aapStageOption: {},
  aapGradeOption: {},
  aapOptionHeader: {
    marginBottom: 8,
  },
  aapOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  aapOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007bff',
    marginBottom: 4,
  },
  aapOptionDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  aapSummary: {
    backgroundColor: '#e7f3ff',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#b3d9ff',
  },
  aapSummaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0056b3',
    marginBottom: 12,
    textAlign: 'center',
  },
  aapSummaryItem: {
    marginBottom: 8,
  },
  aapSummaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0056b3',
    marginBottom: 2,
  },
  aapSummaryValue: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  levelOptions: {
    gap: 12,
  },
  levelOption: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  levelOptionSelected: {
    borderColor: '#007bff',
    backgroundColor: '#f8f9ff',
  },
  levelOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  distributionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  distributionOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  distributionOption: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
    flex: 1,
  },
  distributionOptionSelected: {
    borderColor: '#28a745',
    backgroundColor: '#f8fff8',
  },
  distributionOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  quadrantSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  quadrantTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  quadrantSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  quadrantButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    minWidth: 80,
    alignItems: 'center',
  },
  quadrantButtonSelected: {
    borderColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  quadrantButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  quickSetContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  quickSetTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  quickSetButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  quickSetButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  quickSetHealthy: {
    backgroundColor: '#4CAF50',
  },
  quickSetMild: {
    backgroundColor: '#FFC107',
  },
  quickSetModerate: {
    backgroundColor: '#FF9800',
  },
  quickSetNoBleed: {
    backgroundColor: '#28a745',
  },
  quickSetBleed: {
    backgroundColor: '#dc3545',
  },
  quickSetButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
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
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    position: 'absolute',
    top: 200,
    left: 130,
    width: 100,
  },
  toothCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  toothSelected: {
    borderColor: '#007bff',
    borderWidth: 3,
  },
  toothDefault: {
    backgroundColor: '#6c757d',
  },
  toothLabel: {
    color: 'white',
    fontWeight: '600',
    fontSize: 8,
    textAlign: 'center',
    lineHeight: 10,
  },
  probingHealthy: {
    backgroundColor: '#4CAF50',
  },
  probingMild: {
    backgroundColor: '#FFC107',
  },
  probingModerate: {
    backgroundColor: '#FF9800',
  },
  probingSevere: {
    backgroundColor: '#F44336',
  },
  bleedingPresent: {
    backgroundColor: '#dc3545',
  },
  bleedingAbsent: {
    backgroundColor: '#28a745',
  },
  depthSelectorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  depthSelectorContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxWidth: 400,
    width: '90%',
  },
  depthSelectorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  depthSelectorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  depthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 20,
  },
  depthOption: {
    width: 80,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  depthOptionSelected: {
    borderColor: '#007bff',
    borderWidth: 3,
  },
  depthOptionText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  legend: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    color: '#333',
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  legendCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 8,
  },
  legendLabel: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#28a745',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    flex: 1,
    maxWidth: 150,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  reportButton: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    flex: 1,
    maxWidth: 150,
  },
  reportButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
});