import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { database } from '../db';
import HygieneAssessment from '../db/models/HygieneAssessment';
import { Q } from '@nozbe/watermelondb';
import uuid from 'react-native-uuid';
import { useHygieneAssessment } from '../contexts/HygieneAssessmentContext';

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

const HygieneAssessmentScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  const { hygieneStates, setHygieneStates } = useHygieneAssessment();

  // Assessment mode state
  const [assessmentMode, setAssessmentMode] = useState<'calculus' | 'plaque' | 'probing' | 'bleeding' | 'aap'>('calculus');

  // Calculus assessment state
  const [calculusLevel, setCalculusLevel] = useState<HygieneLevel>('none');
  const [calculusDistribution, setCalculusDistribution] = useState<DistributionType>('none');
  const [calculusQuadrants, setCalculusQuadrants] = useState<Quadrant[]>([]);

  // Plaque assessment state
  const [plaqueLevel, setPlaqueLevel] = useState<HygieneLevel>('none');
  const [plaqueDistribution, setPlaqueDistribution] = useState<DistributionType>('none');
  const [plaqueQuadrants, setPlaqueQuadrants] = useState<Quadrant[]>([]);
  
  // Probing depths state
  const [probingDepths, setProbingDepths] = useState<Record<string, ProbingDepth>>(() => {
    const initialDepths: Record<string, ProbingDepth> = {};
    ALL_TEETH.forEach(toothId => {
      initialDepths[toothId] = 2;
    });
    return initialDepths;
  });

  // Bleeding on probing state
  const [bleedingOnProbing, setBleedingOnProbing] = useState<Record<string, boolean>>(() => {
    const initialBleeding: Record<string, boolean> = {};
    ALL_TEETH.forEach(toothId => {
      initialBleeding[toothId] = false;
    });
    return initialBleeding;
  });

  // AAP Classification state
  const [aapStage, setAapStage] = useState<AAPStage | null>(null);
  const [aapGrade, setAapGrade] = useState<AAPGrade | null>(null);
  
  // UI state for probing depth selector
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [showDepthSelector, setShowDepthSelector] = useState(false);

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

  // Logging functions
  const logCalculusAssessment = () => {
    console.log('🦷 CALCULUS ASSESSMENT LOG:');
    console.log(`📊 Calculus Level: ${CALCULUS_LABELS[calculusLevel]}`);
    console.log(`📍 Distribution: ${calculusDistribution}`);
    
    if (calculusLevel !== 'none' && calculusDistribution === 'localized' && calculusQuadrants.length > 0) {
      console.log(`📋 Affected Quadrants (${calculusQuadrants.length}/4):`);
      calculusQuadrants.forEach(quadrant => {
        console.log(`   • ${QUADRANT_LABELS[quadrant]}`);
      });
    }
    console.log('---');
  };

  const logPlaqueAssessment = () => {
    console.log('🧽 PLAQUE ASSESSMENT LOG:');
    console.log(`📊 Plaque Level: ${PLAQUE_LABELS[plaqueLevel]}`);
    console.log(`📍 Distribution: ${plaqueDistribution}`);
    
    if (plaqueLevel !== 'none' && plaqueDistribution === 'localized' && plaqueQuadrants.length > 0) {
      console.log(`📋 Affected Quadrants (${plaqueQuadrants.length}/4):`);
      plaqueQuadrants.forEach(quadrant => {
        console.log(`   • ${QUADRANT_LABELS[quadrant]}`);
      });
    }
    console.log('---');
  };

  const logProbingDepthAssessment = () => {
    console.log('🔍 PROBING DEPTH ASSESSMENT LOG:');
    
    const healthyTeeth = ALL_TEETH.filter(toothId => probingDepths[toothId] <= 3);
    const severeTeeth = ALL_TEETH.filter(toothId => probingDepths[toothId] >= 7);
    const averageDepth = (ALL_TEETH.reduce((sum, toothId) => sum + probingDepths[toothId], 0) / ALL_TEETH.length).toFixed(1);
    
    console.log(`🦷 HEALTHY (≤3mm): ${healthyTeeth.length} teeth`);
    console.log(`🔴 SEVERE (≥7mm): ${severeTeeth.length} teeth`);
    console.log(`📊 Average Probing Depth: ${averageDepth}mm`);
    console.log('---');
  };

  const logBleedingOnProbingAssessment = () => {
    console.log('🩸 BLEEDING ON PROBING ASSESSMENT LOG:');
    
    const bleedingTeeth = ALL_TEETH.filter(toothId => bleedingOnProbing[toothId]);
    const bleedingPercentage = (bleedingTeeth.length / ALL_TEETH.length) * 100;
    
    console.log(`🩸 BLEEDING: ${bleedingTeeth.length} teeth (${bleedingPercentage.toFixed(1)}%)`);
    
    let status = 'Excellent';
    if (bleedingPercentage > 50) status = 'Severe Inflammation';
    else if (bleedingPercentage > 30) status = 'Moderate Inflammation';
    else if (bleedingPercentage > 10) status = 'Mild Inflammation';
    
    console.log(`🏥 Gingival Health Status: ${status}`);
    console.log('---');
  };

  const logAAPClassification = () => {
    console.log('📋 AAP CLASSIFICATION LOG:');
    console.log(`🏥 AAP Stage: ${aapStage ? AAP_STAGE_LABELS[aapStage] : 'Not Set'}`);
    console.log(`📈 AAP Grade: ${aapGrade ? AAP_GRADE_LABELS[aapGrade] : 'Not Set'}`);
    console.log('---');
  };

  // Assessment handler functions
  const handleCalculusLevelChange = (level: HygieneLevel) => {
    setCalculusLevel(level);
    if (level === 'none') {
      setCalculusDistribution('none');
      setCalculusQuadrants([]);
    }
    logCalculusAssessment();
  };

  const handleCalculusDistributionChange = (distribution: DistributionType) => {
    setCalculusDistribution(distribution);
    if (distribution === 'generalized') {
      setCalculusQuadrants(['upper-right', 'upper-left', 'lower-left', 'lower-right']);
    } else if (distribution === 'none') {
      setCalculusQuadrants([]);
    }
    logCalculusAssessment();
  };

  const toggleCalculusQuadrant = (quadrant: Quadrant) => {
    setCalculusQuadrants(prev => {
      const newQuadrants = prev.includes(quadrant) 
        ? prev.filter(q => q !== quadrant)
        : [...prev, quadrant];
      return newQuadrants;
    });
  };

  const handlePlaqueLevelChange = (level: HygieneLevel) => {
    setPlaqueLevel(level);
    if (level === 'none') {
      setPlaqueDistribution('none');
      setPlaqueQuadrants([]);
    }
    logPlaqueAssessment();
  };

  const handlePlaqueDistributionChange = (distribution: DistributionType) => {
    setPlaqueDistribution(distribution);
    if (distribution === 'generalized') {
      setPlaqueQuadrants(['upper-right', 'upper-left', 'lower-left', 'lower-right']);
    } else if (distribution === 'none') {
      setPlaqueQuadrants([]);
    }
    logPlaqueAssessment();
  };

  const togglePlaqueQuadrant = (quadrant: Quadrant) => {
    setPlaqueQuadrants(prev => {
      const newQuadrants = prev.includes(quadrant) 
        ? prev.filter(q => q !== quadrant)
        : [...prev, quadrant];
      return newQuadrants;
    });
  };

  // AAP Classification handlers
  const handleAAPStageChange = (stage: AAPStage) => {
    setAapStage(stage);
    logAAPClassification();
  };

  const handleAAPGradeChange = (grade: AAPGrade) => {
    setAapGrade(grade);
    logAAPClassification();
  };

  // Probing and bleeding handler functions
  const onToothPress = (toothId: string) => {
    if (assessmentMode === 'probing') {
      setSelectedTooth(toothId);
      setShowDepthSelector(true);
    } else if (assessmentMode === 'bleeding') {
      toggleBleedingOnProbing(toothId);
    }
  };

  const setProbingDepth = (toothId: string, depth: ProbingDepth) => {
    setProbingDepths(prev => ({ ...prev, [toothId]: depth }));
    console.log(`🔍 Probing Depth Updated: Tooth ${toothId} = ${depth}mm`);
    setShowDepthSelector(false);
    setSelectedTooth(null);
  };

  const toggleBleedingOnProbing = (toothId: string) => {
    setBleedingOnProbing(prev => {
      const newBleeding = { ...prev, [toothId]: !prev[toothId] };
      console.log(`🩸 Bleeding Updated: Tooth ${toothId} = ${newBleeding[toothId] ? 'YES' : 'NO'}`);
      return newBleeding;
    });
  };

  const quickSetAllProbing = (depth: ProbingDepth) => {
    const newDepths: Record<string, ProbingDepth> = {};
    ALL_TEETH.forEach(toothId => {
      newDepths[toothId] = depth;
    });
    setProbingDepths(newDepths);
    console.log(`🔍 Quick Set All Teeth to ${depth}mm`);
  };

  const quickSetAllBleeding = (bleeding: boolean) => {
    const newBleeding: Record<string, boolean> = {};
    ALL_TEETH.forEach(toothId => {
      newBleeding[toothId] = bleeding;
    });
    setBleedingOnProbing(newBleeding);
    console.log(`🩸 Quick Set All Teeth Bleeding: ${bleeding ? 'YES' : 'NO'}`);
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
    const depth = probingDepths[toothId];
    const bleeding = bleedingOnProbing[toothId];
    
    let toothStyle = styles.toothDefault;
    let displayText = toothId;
    
    if (assessmentMode === 'probing') {
      toothStyle = getProbingToothStyle(depth);
      displayText = `${toothId}\n${depth}mm`;
    } else if (assessmentMode === 'bleeding') {
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
          selectedTooth === toothId && styles.toothSelected,
          {
            position: 'absolute',
            left: position.left,
            top: position.top,
          }
        ]}
        disabled={assessmentMode === 'calculus' || assessmentMode === 'plaque' || assessmentMode === 'aap'}
      >
        <Text style={styles.toothLabel}>{displayText}</Text>
      </Pressable>
    );
  };

  // Save and report functions
  const saveAssessment = async () => {
    try {
      const collection = database.get<HygieneAssessment>('hygiene_assessments');
      const existing = await collection
        .query(Q.where('patient_id', Q.eq(patientId)))
        .fetch();

      const assessmentData = {
        calculusLevel,
        calculusDistribution,
        calculusQuadrants,
        plaqueLevel,
        plaqueDistribution,
        plaqueQuadrants,
        probingDepths,
        bleedingOnProbing,
        aapStage,
        aapGrade,
        timestamp: new Date().toISOString(),
        hygieneStates
      };
      
      const jsonData = JSON.stringify(assessmentData);
      
      console.log('💾 SAVING COMPLETE HYGIENE ASSESSMENT:');
      logCalculusAssessment();
      logPlaqueAssessment();
      logProbingDepthAssessment();
      logBleedingOnProbingAssessment();
      logAAPClassification();
  
      await database.write(async () => {
        if (existing.length > 0) {
          await existing[0].update(record => {
            record.data = jsonData;
            record.updatedAt = new Date();
          });
          Alert.alert('✅ Hygiene assessment updated');
        } else {
          await collection.create(record => {
            const id = uuid.v4();
            record._raw.id = id;
            record.patientId = patientId;
            record.data = jsonData;
            record.createdAt = new Date();
            record.updatedAt = new Date();
          });
          Alert.alert('✅ Hygiene assessment created');
        }
      });
    } catch (err) {
      console.error('❌ Failed to save hygiene assessment:', err);
      Alert.alert('❌ Failed to save hygiene assessment');
    }
  };

  const showDetailedReport = () => {
    const bleedingCount = ALL_TEETH.filter(toothId => bleedingOnProbing[toothId]).length;
    const bleedingPercentage = (bleedingCount / ALL_TEETH.length) * 100;
    
    const report = `
Full Mouth Hygiene Assessment Report
Patient ID: ${patientId}

AAP PERIODONTAL CLASSIFICATION:
• Stage: ${aapStage ? AAP_STAGE_LABELS[aapStage] : 'Not assessed'}
• Grade: ${aapGrade ? AAP_GRADE_LABELS[aapGrade] : 'Not assessed'}

CALCULUS ASSESSMENT:
• Level: ${CALCULUS_LABELS[calculusLevel]}
• Distribution: ${calculusDistribution}

PLAQUE ASSESSMENT:
• Level: ${PLAQUE_LABELS[plaqueLevel]}
• Distribution: ${plaqueDistribution}

PROBING DEPTHS:
• Average: ${(ALL_TEETH.reduce((sum, toothId) => sum + probingDepths[toothId], 0) / ALL_TEETH.length).toFixed(1)}mm
• Healthy (≤3mm): ${ALL_TEETH.filter(toothId => probingDepths[toothId] <= 3).length} teeth
• Severe (≥7mm): ${ALL_TEETH.filter(toothId => probingDepths[toothId] >= 7).length} teeth

BLEEDING ON PROBING:
• Bleeding Sites: ${bleedingCount} teeth (${bleedingPercentage.toFixed(1)}%)
    `;
    
    Alert.alert('Hygiene Assessment Report', report.trim());
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>🧼 Full Mouth Hygiene Assessment</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

      {/* Assessment Mode Toggle */}
      <View style={styles.modeToggleContainer}>
        <Text style={styles.modeToggleTitle}>Assessment Mode:</Text>
        <View style={styles.modeToggleButtons}>
          <Pressable 
            style={[
              styles.modeToggleButton, 
              assessmentMode === 'calculus' && styles.modeToggleButtonActive
            ]} 
            onPress={() => setAssessmentMode('calculus')}
          >
            <Text style={[
              styles.modeToggleButtonText,
              assessmentMode === 'calculus' && styles.modeToggleButtonTextActive
            ]}>
              🦷 Calculus
            </Text>
          </Pressable>
          <Pressable 
            style={[
              styles.modeToggleButton, 
              assessmentMode === 'plaque' && styles.modeToggleButtonActive
            ]} 
            onPress={() => setAssessmentMode('plaque')}
          >
            <Text style={[
              styles.modeToggleButtonText,
              assessmentMode === 'plaque' && styles.modeToggleButtonTextActive
            ]}>
              🧽 Plaque
            </Text>
          </Pressable>
          <Pressable 
            style={[
              styles.modeToggleButton, 
              assessmentMode === 'probing' && styles.modeToggleButtonActive
            ]} 
            onPress={() => setAssessmentMode('probing')}
          >
            <Text style={[
              styles.modeToggleButtonText,
              assessmentMode === 'probing' && styles.modeToggleButtonTextActive
            ]}>
              🔍 Probing
            </Text>
          </Pressable>
          <Pressable 
            style={[
              styles.modeToggleButton, 
              assessmentMode === 'bleeding' && styles.modeToggleButtonActive
            ]} 
            onPress={() => setAssessmentMode('bleeding')}
          >
            <Text style={[
              styles.modeToggleButtonText,
              assessmentMode === 'bleeding' && styles.modeToggleButtonTextActive
            ]}>
              🩸 Bleeding
            </Text>
          </Pressable>
          <Pressable 
            style={[
              styles.modeToggleButton, 
              assessmentMode === 'aap' && styles.modeToggleButtonActive
            ]} 
            onPress={() => setAssessmentMode('aap')}
          >
            <Text style={[
              styles.modeToggleButtonText,
              assessmentMode === 'aap' && styles.modeToggleButtonTextActive
            ]}>
              📋 AAP
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Current Assessment Display */}
      <View style={styles.currentAssessmentCard}>
        <Text style={styles.currentTitle}>Current Assessment</Text>
        
        {assessmentMode === 'calculus' && (
          <View style={styles.currentLevelContainer}>
            <Text style={styles.currentLevel}>{CALCULUS_LABELS[calculusLevel]}</Text>
          </View>
        )}

        {assessmentMode === 'plaque' && (
          <View style={styles.currentLevelContainer}>
            <Text style={styles.currentLevel}>{PLAQUE_LABELS[plaqueLevel]}</Text>
          </View>
        )}

        {assessmentMode === 'probing' && (
          <View style={styles.currentLevelContainer}>
            <Text style={styles.currentLevel}>Probing Depth Summary</Text>
            <Text style={styles.currentDescription}>
              Average: {(ALL_TEETH.reduce((sum, toothId) => sum + probingDepths[toothId], 0) / ALL_TEETH.length).toFixed(1)}mm
            </Text>
          </View>
        )}

        {assessmentMode === 'bleeding' && (
          <View style={styles.currentLevelContainer}>
            <Text style={styles.currentLevel}>Bleeding Summary</Text>
            <Text style={styles.currentDescription}>
              {((ALL_TEETH.filter(toothId => bleedingOnProbing[toothId]).length / ALL_TEETH.length) * 100).toFixed(1)}% bleeding sites
            </Text>
          </View>
        )}

        {assessmentMode === 'aap' && (
          <View style={styles.currentLevelContainer}>
            <Text style={styles.currentLevel}>AAP Classification</Text>
            <Text style={styles.currentDescription}>
              Stage: {aapStage || 'Not Set'} | Grade: {aapGrade || 'Not Set'}
            </Text>
          </View>
        )}
      </View>

      {/* AAP Classification Content */}
      {assessmentMode === 'aap' && (
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
                    aapStage === stage && styles.aapOptionSelected,
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
                    aapGrade === grade && styles.aapOptionSelected,
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
          {(aapStage || aapGrade) && (
            <View style={styles.aapSummary}>
              <Text style={styles.aapSummaryTitle}>Current Classification</Text>
              {aapStage && (
                <View style={styles.aapSummaryItem}>
                  <Text style={styles.aapSummaryLabel}>Stage:</Text>
                  <Text style={styles.aapSummaryValue}>{AAP_STAGE_LABELS[aapStage]}</Text>
                </View>
              )}
              {aapGrade && (
                <View style={styles.aapSummaryItem}>
                  <Text style={styles.aapSummaryLabel}>Grade:</Text>
                  <Text style={styles.aapSummaryValue}>{AAP_GRADE_LABELS[aapGrade]}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Calculus Assessment Content */}
      {assessmentMode === 'calculus' && (
        <View style={styles.selectionCard}>
          <Text style={styles.selectionTitle}>Select Calculus Level</Text>
          
          <View style={styles.levelOptions}>
            {HYGIENE_LEVELS.map(level => (
              <Pressable
                key={level}
                style={[
                  styles.levelOption,
                  calculusLevel === level && styles.levelOptionSelected,
                ]}
                onPress={() => handleCalculusLevelChange(level)}
              >
                <Text style={styles.levelOptionTitle}>
                  {CALCULUS_LABELS[level]}
                </Text>
              </Pressable>
            ))}
          </View>

          {calculusLevel !== 'none' && (
            <>
              <Text style={styles.distributionTitle}>Calculus Distribution</Text>
              <View style={styles.distributionOptions}>
                {['generalized', 'localized'].map(distribution => (
                  <Pressable
                    key={distribution}
                    style={[
                      styles.distributionOption,
                      calculusDistribution === distribution && styles.distributionOptionSelected,
                    ]}
                    onPress={() => handleCalculusDistributionChange(distribution as DistributionType)}
                  >
                    <Text style={styles.distributionOptionTitle}>
                      {distribution === 'generalized' ? '🌐 Generalized' : '📍 Localized'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {calculusDistribution === 'localized' && (
                <View style={styles.quadrantSection}>
                  <Text style={styles.quadrantTitle}>Select Affected Quadrants</Text>
                  <View style={styles.quadrantSelector}>
                    {QUADRANTS.map(quadrant => (
                      <Pressable
                        key={quadrant}
                        style={[
                          styles.quadrantButton,
                          calculusQuadrants.includes(quadrant) && styles.quadrantButtonSelected,
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
      {assessmentMode === 'plaque' && (
        <View style={styles.selectionCard}>
          <Text style={styles.selectionTitle}>Select Plaque Level</Text>
          
          <View style={styles.levelOptions}>
            {HYGIENE_LEVELS.map(level => (
              <Pressable
                key={level}
                style={[
                  styles.levelOption,
                  plaqueLevel === level && styles.levelOptionSelected,
                ]}
                onPress={() => handlePlaqueLevelChange(level)}
              >
                <Text style={styles.levelOptionTitle}>
                  {PLAQUE_LABELS[level]}
                </Text>
              </Pressable>
            ))}
          </View>

          {plaqueLevel !== 'none' && (
            <>
              <Text style={styles.distributionTitle}>Plaque Distribution</Text>
              <View style={styles.distributionOptions}>
                {['generalized', 'localized'].map(distribution => (
                  <Pressable
                    key={distribution}
                    style={[
                      styles.distributionOption,
                      plaqueDistribution === distribution && styles.distributionOptionSelected,
                    ]}
                    onPress={() => handlePlaqueDistributionChange(distribution as DistributionType)}
                  >
                    <Text style={styles.distributionOptionTitle}>
                      {distribution === 'generalized' ? '🌐 Generalized' : '📍 Localized'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {plaqueDistribution === 'localized' && (
                <View style={styles.quadrantSection}>
                  <Text style={styles.quadrantTitle}>Select Affected Quadrants</Text>
                  <View style={styles.quadrantSelector}>
                    {QUADRANTS.map(quadrant => (
                      <Pressable
                        key={quadrant}
                        style={[
                          styles.quadrantButton,
                          plaqueQuadrants.includes(quadrant) && styles.quadrantButtonSelected,
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
      {assessmentMode === 'probing' && (
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
      {assessmentMode === 'bleeding' && (
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
      {(assessmentMode === 'probing' || assessmentMode === 'bleeding') && (
        <View style={styles.dentalChart}>
          <Text style={styles.upperArchLabel}>Upper Arch</Text>
          <Text style={styles.lowerArchLabel}>Lower Arch</Text>
          <Text style={styles.centerInstructions}>
            {assessmentMode === 'probing' ? 'Tap to set\nprobing depth' : 'Tap to toggle\nbleeding status'}
          </Text>
          
          {ALL_TEETH.map(toothId => renderTooth(toothId))}
        </View>
      )}

      {/* Depth Selector Modal */}
      {showDepthSelector && selectedTooth && (
        <View style={styles.depthSelectorOverlay}>
          <View style={styles.depthSelectorContainer}>
            <Text style={styles.depthSelectorTitle}>
              Probing Depth for Tooth {selectedTooth}
            </Text>
            <Text style={styles.depthSelectorSubtitle}>
              Current: {probingDepths[selectedTooth]}mm
            </Text>
            
            <View style={styles.depthGrid}>
              {PROBING_DEPTHS.map(depth => (
                <Pressable
                  key={depth}
                  style={[
                    styles.depthOption,
                    getProbingToothStyle(depth),
                    probingDepths[selectedTooth] === depth && styles.depthOptionSelected
                  ]}
                  onPress={() => setProbingDepth(selectedTooth, depth)}
                >
                  <Text style={styles.depthOptionText}>{depth}mm</Text>
                </Pressable>
              ))}
            </View>
            
            <Pressable 
              style={styles.cancelButton} 
              onPress={() => {
                setShowDepthSelector(false);
                setSelectedTooth(null);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Legends */}
      {assessmentMode === 'probing' && (
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

      {assessmentMode === 'bleeding' && (
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
        <Pressable style={styles.saveButton} onPress={saveAssessment}>
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
  // AAP Classification Styles
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
  aapStageOption: {
    // Additional styling for stage options if needed
  },
  aapGradeOption: {
    // Additional styling for grade options if needed
  },
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