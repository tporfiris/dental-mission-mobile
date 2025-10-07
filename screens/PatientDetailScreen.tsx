// screens/PatientDetailScreen.tsx - Enhanced with detailed assessment and treatment info
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Share,
  Dimensions
} from 'react-native';



const { width } = Dimensions.get('window');

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  location: string;
  photoUri?: string;
  createdAt: Date;
}

interface Treatment {
  id: string;
  patientId: string;
  type: string;
  tooth: string;
  surface: string;
  units: number;
  value: number;
  billingCodes: string;
  notes: string;
  clinicianName: string;
  completedAt: Date;
}

interface Assessment {
  id: string;
  patientId: string;
  assessmentType: string;
  data: string;
  clinicianEmail: string;
  createdAt: Date;
}

// Helper function to parse assessment data with detailed tooth information
const parseAssessmentData = (data: string, type: string) => {
  try {
    const parsed = JSON.parse(data);
    
    switch (type) {
      case 'dentition': {
        if (parsed.savedWithPrimaryNumbers && parsed.originalToothStates) {
          const toothStates = parsed.originalToothStates;
          const primaryTeeth = parsed.primaryTeeth || [];
          
          const PRIMARY_TOOTH_MAPPINGS: Record<string, string> = {
            '11': '51', '12': '52', '13': '53', '14': '54', '15': '55',
            '21': '61', '22': '62', '23': '63', '24': '64', '25': '65',
            '41': '81', '42': '82', '43': '83', '44': '84', '45': '85',
            '31': '71', '32': '72', '33': '73', '34': '74', '35': '75',
          };
          
          const getCurrentToothId = (originalToothId: string): string => {
            if (primaryTeeth.includes(originalToothId)) {
              return PRIMARY_TOOTH_MAPPINGS[originalToothId] || originalToothId;
            }
            return originalToothId;
          };
          
          const present = Object.entries(toothStates).filter(([_, s]: any) => s === 'present');
          const crownMissing = Object.entries(toothStates).filter(([_, s]: any) => s === 'crown-missing');
          const rootsOnly = Object.entries(toothStates).filter(([_, s]: any) => s === 'roots-only');
          const missing = Object.entries(toothStates).filter(([_, s]: any) => s === 'fully-missing');
          
          const dentitionDetails = [
            `✓ Present teeth (${present.length}): ${present.map(([t]) => getCurrentToothId(t)).join(', ') || 'None'}`,
            `⚠ Crown missing (${crownMissing.length}): ${crownMissing.map(([t]) => getCurrentToothId(t)).join(', ') || 'None'}`,
            `⚠ Roots only (${rootsOnly.length}): ${rootsOnly.map(([t]) => getCurrentToothId(t)).join(', ') || 'None'}`,
            `✗ Fully missing (${missing.length}): ${missing.map(([t]) => getCurrentToothId(t)).join(', ') || 'None'}`,
          ];
          
          if (primaryTeeth.length > 0) {
            const primaryToothNumbers = primaryTeeth.map((t: string) => getCurrentToothId(t));
            dentitionDetails.push(`🦷 Primary teeth (${primaryTeeth.length}): ${primaryToothNumbers.join(', ')}`);
          }
          
          return {
            summary: `${present.length} present, ${missing.length} missing, ${crownMissing.length} crown missing`,
            details: dentitionDetails
          };
        }
        return { summary: 'Dentition assessed', details: ['Legacy format - basic data available'] };
      }
        
      case 'hygiene': {
        // The data is stored at root level, not under enhancedAssessment
        // Check if this is the new format (has calculusLevel, plaqueLevel, etc.)
        if (parsed.calculusLevel !== undefined || parsed.plaqueLevel !== undefined || parsed.probingDepths !== undefined) {
          const assessment = parsed;
          const hygieneDetails = [];
          
          // CALCULUS ASSESSMENT
          const calculusLevel = assessment.calculusLevel || 'none';
          const CALCULUS_LABELS: Record<string, string> = {
            'none': 'No Calculus',
            'light': 'Light Calculus',
            'moderate': 'Moderate Calculus',
            'heavy': 'Heavy Calculus'
          };
          
          hygieneDetails.push(`\n🦠 CALCULUS ASSESSMENT:`);
          hygieneDetails.push(`   Level: ${CALCULUS_LABELS[calculusLevel] || calculusLevel}`);
          
          if (calculusLevel !== 'none') {
            const distribution = assessment.calculusDistribution || 'none';
            hygieneDetails.push(`   Distribution: ${distribution === 'generalized' ? 'Generalized (throughout mouth)' : 'Localized'}`);
            
            if (distribution === 'localized' && assessment.calculusQuadrants?.length > 0) {
              const QUADRANT_LABELS: Record<string, string> = {
                'upper-right': 'Upper Right',
                'upper-left': 'Upper Left',
                'lower-left': 'Lower Left',
                'lower-right': 'Lower Right'
              };
              const quadrants = assessment.calculusQuadrants.map((q: string) => QUADRANT_LABELS[q] || q);
              hygieneDetails.push(`   Affected quadrants: ${quadrants.join(', ')}`);
            }
          }
          
          // PLAQUE ASSESSMENT
          const plaqueLevel = assessment.plaqueLevel || 'none';
          const PLAQUE_LABELS: Record<string, string> = {
            'none': 'No Plaque',
            'light': 'Light Plaque',
            'moderate': 'Moderate Plaque',
            'heavy': 'Heavy Plaque'
          };
          
          hygieneDetails.push(`\n🧽 PLAQUE ASSESSMENT:`);
          hygieneDetails.push(`   Level: ${PLAQUE_LABELS[plaqueLevel] || plaqueLevel}`);
          
          if (plaqueLevel !== 'none') {
            const distribution = assessment.plaqueDistribution || 'none';
            hygieneDetails.push(`   Distribution: ${distribution === 'generalized' ? 'Generalized (throughout mouth)' : 'Localized'}`);
            
            if (distribution === 'localized' && assessment.plaqueQuadrants?.length > 0) {
              const QUADRANT_LABELS: Record<string, string> = {
                'upper-right': 'Upper Right',
                'upper-left': 'Upper Left',
                'lower-left': 'Lower Left',
                'lower-right': 'Lower Right'
              };
              const quadrants = assessment.plaqueQuadrants.map((q: string) => QUADRANT_LABELS[q] || q);
              hygieneDetails.push(`   Affected quadrants: ${quadrants.join(', ')}`);
            }
          }
          
          // PROBING DEPTHS & BLEEDING
          if (assessment.probingDepths && assessment.bleedingOnProbing) {
            const depths = Object.entries(assessment.probingDepths);
            const bleeding = assessment.bleedingOnProbing;
            
            // Calculate statistics
            const avgDepth = depths.reduce((sum: number, [_, d]: any) => sum + d, 0) / depths.length;
            const deepPockets = depths.filter(([_, d]: any) => d >= 5);
            const bleedingTeeth = depths.filter(([tooth, _]: any) => bleeding[tooth]);
            const bleedingPercent = (bleedingTeeth.length / depths.length * 100).toFixed(1);
            
            hygieneDetails.push(`\n📏 PROBING DEPTHS & BLEEDING:`);
            hygieneDetails.push(`   Average probing depth: ${avgDepth.toFixed(1)}mm`);
            hygieneDetails.push(`   Bleeding sites: ${bleedingTeeth.length} of ${depths.length} teeth (${bleedingPercent}%)`);
            
            if (deepPockets.length > 0) {
              hygieneDetails.push(`   ⚠ Deep pockets (≥5mm): ${deepPockets.length} teeth`);
            }
            
            // Group teeth by severity for better readability
            const healthy = depths.filter(([_, d]: any) => d <= 3);
            const mild = depths.filter(([_, d]: any) => d === 4);
            const moderate = depths.filter(([_, d]: any) => d >= 5 && d <= 6);
            const severe = depths.filter(([_, d]: any) => d >= 7);
            
            hygieneDetails.push(`\n   Breakdown by severity:`);
            hygieneDetails.push(`   • Healthy (≤3mm): ${healthy.length} teeth`);
            hygieneDetails.push(`   • Mild (4mm): ${mild.length} teeth`);
            hygieneDetails.push(`   • Moderate (5-6mm): ${moderate.length} teeth`);
            hygieneDetails.push(`   • Severe (≥7mm): ${severe.length} teeth`);
            
            // Show detailed tooth-by-tooth data for problem areas
            const problemTeeth = depths.filter(([tooth, d]: any) => d >= 5 || bleeding[tooth]);
            
            if (problemTeeth.length > 0 && problemTeeth.length <= 20) {
              hygieneDetails.push(`\n   Individual tooth data (problem areas):`);
              
              problemTeeth.forEach(([tooth, depth]: any) => {
                const isDeep = depth >= 5;
                const isBleeding = bleeding[tooth];
                const indicators = [];
                if (isDeep) indicators.push(`${depth}mm pocket`);
                if (isBleeding) indicators.push('bleeding');
                hygieneDetails.push(`   • Tooth ${tooth}: ${indicators.join(', ')}`);
              });
            } else if (problemTeeth.length > 20) {
              hygieneDetails.push(`\n   ${problemTeeth.length} teeth with pockets ≥5mm or bleeding`);
              hygieneDetails.push(`   (Too many to list individually - see full assessment)`);
            }
          }
          
          // AAP CLASSIFICATION
          if (assessment.aapStage || assessment.aapGrade) {
            const AAP_STAGE_LABELS: Record<string, string> = {
              '1': 'Stage I - Initial Periodontitis',
              '2': 'Stage II - Moderate Periodontitis',
              '3': 'Stage III - Severe Periodontitis',
              '4': 'Stage IV - Advanced Periodontitis'
            };
            
            const AAP_GRADE_LABELS: Record<string, string> = {
              'A': 'Grade A - Slow Rate of Progression',
              'B': 'Grade B - Moderate Rate of Progression',
              'C': 'Grade C - Rapid Rate of Progression',
              'D': 'Grade D - Necrotizing Periodontal Disease'
            };
            
            hygieneDetails.push(`\n📋 AAP PERIODONTAL CLASSIFICATION:`);
            if (assessment.aapStage) {
              hygieneDetails.push(`   ${AAP_STAGE_LABELS[assessment.aapStage] || `Stage ${assessment.aapStage}`}`);
            }
            if (assessment.aapGrade) {
              hygieneDetails.push(`   ${AAP_GRADE_LABELS[assessment.aapGrade] || `Grade ${assessment.aapGrade}`}`);
            }
          }
          
          return {
            summary: `Calculus: ${calculusLevel}, Plaque: ${plaqueLevel}${assessment.aapStage ? `, AAP Stage ${assessment.aapStage}` : ''}`,
            details: hygieneDetails
          };
        }
        return { summary: 'Hygiene assessed', details: ['Assessment data available'] };
      }
        
      case 'extractions': {
        const extractionStates = parsed.extractionStates || parsed;
        const extractions = Object.entries(extractionStates).filter(([_, s]: any) => s !== 'none');
        
        const loose = extractions.filter(([_, s]: any) => s === 'loose');
        const rootTip = extractions.filter(([_, s]: any) => s === 'root-tip');
        const nonRestorable = extractions.filter(([_, s]: any) => s === 'non-restorable');
        
        const extractionDetails = [
          `📊 Total extractions needed: ${extractions.length}`,
          `🔧 Loose teeth (${loose.length}): ${loose.length > 0 ? loose.map(([t]) => t).join(', ') : 'None'}`,
          `🦴 Root tips (${rootTip.length}): ${rootTip.length > 0 ? rootTip.map(([t]) => t).join(', ') : 'None'}`,
          `❌ Non-restorable (${nonRestorable.length}): ${nonRestorable.length > 0 ? nonRestorable.map(([t]) => t).join(', ') : 'None'}`,
        ];
        
        return {
          summary: `${extractions.length} teeth marked for extraction`,
          details: extractionDetails
        };
      }
        
      case 'fillings': {
        if (parsed.savedWithPrimaryNumbers && parsed.originalTeethStates) {
          const teethStates = parsed.originalTeethStates;
          const primaryTeeth = parsed.primaryTeeth || [];
          
          const PRIMARY_TOOTH_MAPPINGS: Record<string, string> = {
            '11': '51', '12': '52', '13': '53', '14': '54', '15': '55',
            '21': '61', '22': '62', '23': '63', '24': '64', '25': '65',
            '41': '81', '42': '82', '43': '83', '44': '84', '45': '85',
            '31': '71', '32': '72', '33': '73', '34': '74', '35': '75',
          };
          
          const getCurrentToothId = (originalToothId: string): string => {
            if (primaryTeeth.includes(originalToothId)) {
              return PRIMARY_TOOTH_MAPPINGS[originalToothId] || originalToothId;
            }
            return originalToothId;
          };
          
          const fillingsDetails = [];
          
          const teethWithFindings = Object.entries(teethStates).filter(([_, state]: any) => 
            (state.hasFillings && state.fillingSurfaces?.length > 0) ||
            state.hasCrowns ||
            state.hasExistingRootCanal ||
            (state.hasCavities && state.cavitySurfaces?.length > 0) ||
            (state.isBroken && state.brokenSurfaces?.length > 0) ||
            state.needsRootCanal
          );
          
          if (teethWithFindings.length === 0) {
            fillingsDetails.push('✓ No restorative issues found');
          } else {
            fillingsDetails.push(`📊 ${teethWithFindings.length} teeth with findings:\n`);
            
            teethWithFindings.forEach(([toothId, state]: any) => {
              const displayToothId = getCurrentToothId(toothId);
              const toothDetails = [`🦷 Tooth ${displayToothId}:`];
              
              if (state.hasFillings && state.fillingSurfaces?.length > 0) {
                const material = state.fillingType || 'unknown';
                const surfaces = state.fillingSurfaces.join('');
                toothDetails.push(`   • Has existing filling: Yes (${material}, surfaces: ${surfaces})`);
              } else {
                toothDetails.push(`   • Has existing filling: No`);
              }
              
              if (state.hasCrowns) {
                const material = state.crownMaterial || 'unknown';
                toothDetails.push(`   • Has existing crown: Yes (${material})`);
              } else {
                toothDetails.push(`   • Has existing crown: No`);
              }
              
              if (state.hasExistingRootCanal) {
                toothDetails.push(`   • Has existing root canal: Yes`);
              } else {
                toothDetails.push(`   • Has existing root canal: No`);
              }
              
              if (state.hasCavities && state.cavitySurfaces?.length > 0) {
                const surfaces = state.cavitySurfaces.join('');
                toothDetails.push(`   • Cavities: Yes (locations: ${surfaces})`);
              } else {
                toothDetails.push(`   • Cavities: No`);
              }
              
              if (state.isBroken && state.brokenSurfaces?.length > 0) {
                const surfaces = state.brokenSurfaces.join('');
                toothDetails.push(`   • Broken/cracked: Yes (surfaces: ${surfaces})`);
              }
              
              if (state.needsRootCanal) {
                const diagnoses = [];
                if (state.pulpDiagnosis) diagnoses.push(state.pulpDiagnosis);
                if (state.apicalDiagnosis) diagnoses.push(state.apicalDiagnosis);
                const diagnosisText = diagnoses.length > 0 ? ` (${diagnoses.join(', ')})` : '';
                toothDetails.push(`   • Root canal needed: Yes${diagnosisText}`);
              }
              
              fillingsDetails.push(toothDetails.join('\n'));
            });
          }
          
          if (primaryTeeth.length > 0) {
            const primaryToothNumbers = primaryTeeth.map((t: string) => getCurrentToothId(t));
            fillingsDetails.push(`\n🦷 Primary teeth recorded (${primaryTeeth.length}): ${primaryToothNumbers.join(', ')}`);
          }
          
          const fillingsCount = Object.values(teethStates).filter((t: any) => 
            t.hasFillings && t.fillingSurfaces?.length > 0
          ).length;
          const cavitiesCount = Object.values(teethStates).filter((t: any) => 
            t.hasCavities && t.cavitySurfaces?.length > 0
          ).length;
          const rctNeededCount = Object.values(teethStates).filter((t: any) => t.needsRootCanal).length;
          
          return {
            summary: `${fillingsCount} fillings, ${cavitiesCount} cavities, ${rctNeededCount} need RCT`,
            details: fillingsDetails
          };
        }
        return { summary: 'Dental assessment completed', details: ['Restoration data available'] };
      }
        
      case 'denture': {
        const dentureType = parsed.selectedDentureType;
        const relineOptions = parsed.dentureOptions || {};
        const dentureDetails = [];
        
        if (dentureType && dentureType !== 'none') {
          dentureDetails.push(`🦷 Denture recommended: ${dentureType}`);
        } else {
          dentureDetails.push('✓ No denture needed');
        }
        
        const relineServices = Object.entries(relineOptions).filter(([_, v]) => v);
        if (relineServices.length > 0) {
          const relineTypes = relineServices.map(([service]) => {
            return service.split('-').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
          });
          dentureDetails.push(`🔧 Reline services (${relineServices.length}): ${relineTypes.join(', ')}`);
        } else {
          dentureDetails.push('🔧 Reline services: None');
        }
        
        if (parsed.notes) {
          dentureDetails.push(`📝 Notes: ${parsed.notes}`);
        }
        
        return {
          summary: dentureType === 'none' ? 'No denture needed' : `${dentureType} recommended`,
          details: dentureDetails
        };
      }
        
      case 'implant': {
        const singleImplants = parsed.singleImplantTeeth || [];
        const bridgeImplants = parsed.bridgeImplantTeeth || [];
        const boneGrafting = parsed.boneGraftingPlanned;
        const timing = parsed.timingMode;
        
        const implantDetails = [];
        
        if (singleImplants.length > 0) {
          implantDetails.push(`🔩 Single implants planned (${singleImplants.length}): ${singleImplants.join(', ')}`);
        } else {
          implantDetails.push(`🔩 Single implants planned (0): None`);
        }
        
        if (bridgeImplants.length > 0) {
          implantDetails.push(`🌉 Bridge implants planned (${bridgeImplants.length}): ${bridgeImplants.join(', ')}`);
        } else {
          implantDetails.push(`🌉 Bridge implants planned (0): None`);
        }
        
        if (boneGrafting) {
          implantDetails.push('🦴 Bone grafting: Planned');
        } else {
          implantDetails.push('🦴 Bone grafting: Not needed');
        }
        
        if (timing) {
          implantDetails.push(`⏱️ Timing: ${timing.charAt(0).toUpperCase() + timing.slice(1)} placement`);
        }
        
        const totalImplants = singleImplants.length + bridgeImplants.length;
        return {
          summary: `${totalImplants} total implants planned (${singleImplants.length} single, ${bridgeImplants.length} bridge)`,
          details: implantDetails
        };
      }
        
      default:
        return { summary: 'Assessment completed', details: ['Data available'] };
    }
  } catch (error) {
    console.error('Error parsing assessment data:', error);
    return { summary: 'Assessment completed', details: ['Unable to parse details'] };
  }
};

// Helper function to parse treatment notes and get detailed info
const parseTreatmentDetails = (treatment: Treatment) => {
  const treatmentDetails = [];
  
  let billingCodes = [];
  try {
    billingCodes = JSON.parse(treatment.billingCodes);
  } catch (e) {
    // Handle legacy format
  }
  
  switch (treatment.type) {
    case 'hygiene':
      try {
        const hygieneData = JSON.parse(treatment.notes);
        if (hygieneData.scalingUnits) {
          treatmentDetails.push(`Scaling: ${hygieneData.scalingUnits} units`);
        }
        if (hygieneData.polishingUnits) {
          treatmentDetails.push(`Polishing: ${hygieneData.polishingUnits} units`);
        }
        if (hygieneData.fluorideType && hygieneData.fluorideType !== 'none') {
          treatmentDetails.push(`Fluoride: ${hygieneData.fluorideType}`);
        }
        if (hygieneData.prescribedMedication) {
          treatmentDetails.push(`Medication: ${hygieneData.prescribedMedication}`);
        }
      } catch (e) {
        treatmentDetails.push(`Units: ${treatment.units}`);
      }
      break;
      
    case 'extraction':
      treatmentDetails.push(`Tooth: ${treatment.tooth}`);
      if (billingCodes.length > 0 && billingCodes[0].complexity) {
        treatmentDetails.push(`Type: ${billingCodes[0].complexity}`);
      }
      break;
      
    case 'filling':
      treatmentDetails.push(`Tooth: ${treatment.tooth}`);
      treatmentDetails.push(`Surface: ${treatment.surface}`);
      treatmentDetails.push(`Units: ${treatment.units}`);
      break;
      
    case 'denture':
      if (billingCodes.length > 0) {
        treatmentDetails.push(`Type: ${billingCodes[0].description || 'Denture placement'}`);
      }
      break;
      
    case 'implant':
    case 'implant-crown':
      treatmentDetails.push(`Tooth: ${treatment.tooth}`);
      if (billingCodes.length > 0) {
        treatmentDetails.push(`Type: ${billingCodes[0].category || treatment.type}`);
      }
      break;
      
    default:
      treatmentDetails.push(`Tooth: ${treatment.tooth}`);
      if (treatment.surface !== 'N/A') {
        treatmentDetails.push(`Surface: ${treatment.surface}`);
      }
      treatmentDetails.push(`Units: ${treatment.units}`);
  }
  
  return treatmentDetails;
};

const PatientDetailScreen = ({ route, navigation }: any) => {
  const { patient, treatments, assessments } = route.params as {
    patient: Patient;
    treatments: Treatment[];
    assessments: Assessment[];
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'assessments' | 'treatments'>('overview');
  const [expandedAssessment, setExpandedAssessment] = useState<string | null>(null);
  const [expandedTreatment, setExpandedTreatment] = useState<string | null>(null);

  const patientStats = useMemo(() => {
    const totalValue = treatments.reduce((sum, t) => sum + (t.value * t.units), 0);
    
    const treatmentsByType = treatments.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const assessmentsByType = assessments.reduce((acc, a) => {
      acc[a.assessmentType] = (acc[a.assessmentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const latestTreatment = treatments.length > 0 
      ? treatments.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())[0]
      : null;

    const latestAssessment = assessments.length > 0 
      ? assessments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
      : null;

    return {
      totalValue,
      treatmentsByType,
      assessmentsByType,
      latestTreatment,
      latestAssessment,
      totalTreatments: treatments.length,
      totalAssessments: assessments.length
    };
  }, [treatments, assessments]);

  const exportPatientData = async () => {
    try {
      let patientInfo = `
Patient Report: ${patient.firstName} ${patient.lastName}

PATIENT INFORMATION:
Name: ${patient.firstName} ${patient.lastName}
Age: ${patient.age}
Gender: ${patient.gender}
Location: ${patient.location}
Registration Date: ${patient.createdAt.toLocaleDateString()}

SUMMARY:
Total Assessments: ${assessments.length}
Total Treatments: ${treatments.length}
Total Treatment Value: $${patientStats.totalValue.toFixed(2)}

DETAILED ASSESSMENTS:
`;

      assessments.forEach(a => {
        const parsedData = parseAssessmentData(a.data, a.assessmentType);
        patientInfo += `
${a.assessmentType.toUpperCase()} ASSESSMENT (${a.createdAt.toLocaleDateString()}):
By: ${a.clinicianEmail}
Summary: ${parsedData.summary}
${parsedData.details.map(d => `  - ${d}`).join('\n')}
`;
      });

      patientInfo += `

DETAILED TREATMENTS:
`;

      treatments.forEach(t => {
        const treatmentDetailsList = parseTreatmentDetails(t);
        patientInfo += `
${t.type.toUpperCase()} TREATMENT (${t.completedAt.toLocaleDateString()}):
Performed by: ${t.clinicianName}
Value: $${(t.value * t.units).toFixed(2)}
${treatmentDetailsList.map(d => `  - ${d}`).join('\n')}
`;
      });

      patientInfo += `

Generated on: ${new Date().toLocaleString()}
`;

      await Share.share({
        message: patientInfo,
        title: `Detailed Patient Report - ${patient.firstName} ${patient.lastName}`
      });
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export patient data');
    }
  };

  const toggleAssessmentExpansion = (id: string) => {
    setExpandedAssessment(expandedAssessment === id ? null : id);
  };

  const toggleTreatmentExpansion = (id: string) => {
    setExpandedTreatment(expandedTreatment === id ? null : id);
  };

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <View style={styles.infoCard}>
        <View style={styles.patientHeader}>
          <View style={styles.photoContainer}>
            {patient.photoUri ? (
              <Image source={{ uri: patient.photoUri }} style={styles.patientPhoto} />
            ) : (
              <View style={styles.placeholderPhoto}>
                <Text style={styles.placeholderText}>
                  {patient.firstName.charAt(0)}{patient.lastName.charAt(0)}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.patientBasicInfo}>
            <Text style={styles.patientName}>
              {patient.firstName} {patient.lastName}
            </Text>
            <Text style={styles.patientDetails}>
              {patient.age} years old • {patient.gender}
            </Text>
            <Text style={styles.patientLocation}>📍 {patient.location}</Text>
            <Text style={styles.registrationDate}>
              Registered: {patient.createdAt.toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{assessments.length}</Text>
          <Text style={styles.statLabel}>Assessments</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{treatments.length}</Text>
          <Text style={styles.statLabel}>Treatments</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>${patientStats.totalValue.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Total Value</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {patientStats.latestTreatment ? 
              patientStats.latestTreatment.completedAt.toLocaleDateString() : 'None'}
          </Text>
          <Text style={styles.statLabel}>Last Treatment</Text>
        </View>
      </View>

      {Object.keys(patientStats.treatmentsByType).length > 0 && (
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>🦷 Treatment Breakdown</Text>
          {Object.entries(patientStats.treatmentsByType).map(([type, count]) => (
            <View key={type} style={styles.breakdownRow}>
              <Text style={styles.breakdownType}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
              <Text style={styles.breakdownCount}>{count}</Text>
            </View>
          ))}
        </View>
      )}

      {Object.keys(patientStats.assessmentsByType).length > 0 && (
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>📋 Assessment Breakdown</Text>
          {Object.entries(patientStats.assessmentsByType).map(([type, count]) => (
            <View key={type} style={styles.breakdownRow}>
              <Text style={styles.breakdownType}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
              <Text style={styles.breakdownCount}>{count}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderAssessments = () => (
    <View style={styles.tabContent}>
      {assessments.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No assessments found for this patient</Text>
        </View>
      ) : (
        assessments
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map((assessment) => {
            const parsedData = parseAssessmentData(assessment.data, assessment.assessmentType);
            const isExpanded = expandedAssessment === assessment.id;
            
            return (
              <TouchableOpacity
                key={assessment.id}
                style={styles.itemCard}
                onPress={() => toggleAssessmentExpansion(assessment.id)}
              >
                <View style={styles.itemHeader}>
                  <View style={styles.itemHeaderLeft}>
                    <Text style={styles.itemType}>
                      📋 {assessment.assessmentType.charAt(0).toUpperCase() + assessment.assessmentType.slice(1)} Assessment
                    </Text>
                    <Text style={styles.itemSummary}>{parsedData.summary}</Text>
                  </View>
                  <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                </View>
                
                <View style={styles.itemMetadata}>
                  <Text style={styles.itemClinician}>
                    By: {assessment.clinicianEmail}
                  </Text>
                  <Text style={styles.itemDate}>
                    {assessment.createdAt.toLocaleDateString()} at {assessment.createdAt.toLocaleTimeString()}
                  </Text>
                </View>
                
                {isExpanded && (
                  <View style={styles.expandedDetails}>
                    <Text style={styles.detailsTitle}>Assessment Details:</Text>
                    {parsedData.details.map((detail, index) => (
                      <Text key={index} style={styles.detailItem}>• {detail}</Text>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
      )}
    </View>
  );

  const renderTreatments = () => (
    <View style={styles.tabContent}>
      {treatments.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No treatments found for this patient</Text>
        </View>
      ) : (
        treatments
          .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
          .map((treatment) => {
            const treatmentDetailsList = parseTreatmentDetails(treatment);
            const isExpanded = expandedTreatment === treatment.id;
            
            let billingCodes = [];
            try {
              billingCodes = JSON.parse(treatment.billingCodes);
            } catch (e) {
              // Handle legacy format
            }

            return (
              <TouchableOpacity
                key={treatment.id}
                style={styles.itemCard}
                onPress={() => toggleTreatmentExpansion(treatment.id)}
              >
                <View style={styles.itemHeader}>
                  <View style={styles.itemHeaderLeft}>
                    <Text style={styles.itemType}>
                      🦷 {treatment.type.charAt(0).toUpperCase() + treatment.type.slice(1)} Treatment
                    </Text>
                    <Text style={styles.treatmentSummary}>
                      {treatmentDetailsList.slice(0, 2).join(' • ')}
                    </Text>
                  </View>
                  <View style={styles.itemHeaderRight}>
                    <Text style={styles.itemValue}>
                      ${(treatment.value * treatment.units).toFixed(2)}
                    </Text>
                    <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                  </View>
                </View>
                
                <View style={styles.itemMetadata}>
                  <Text style={styles.itemClinician}>
                    By: {treatment.clinicianName}
                  </Text>
                  <Text style={styles.itemDate}>
                    {treatment.completedAt.toLocaleDateString()} at {treatment.completedAt.toLocaleTimeString()}
                  </Text>
                </View>

                {isExpanded && (
                  <View style={styles.expandedDetails}>
                    <Text style={styles.detailsTitle}>Treatment Details:</Text>
                    {treatmentDetailsList.map((detail, index) => (
                      <Text key={index} style={styles.detailItem}>• {detail}</Text>
                    ))}
                    
                    {billingCodes.length > 0 && (
                      <View style={styles.billingCodes}>
                        <Text style={styles.billingTitle}>Billing Codes:</Text>
                        {billingCodes.map((code: any, index: number) => (
                          <View key={index} style={styles.billingCodeItem}>
                            <Text style={styles.billingCode}>
                              {typeof code === 'string' ? code : code.code || 'N/A'}
                            </Text>
                            {code.price && (
                              <Text style={styles.billingPrice}>${code.price}</Text>
                            )}
                            {code.description && (
                              <Text style={styles.billingDescription}>{code.description}</Text>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Patient Details</Text>
          <TouchableOpacity style={styles.exportButton} onPress={exportPatientData}>
            <Text style={styles.exportButtonText}>📤 Export</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabNavigation}>
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'assessments', label: `📋 Assessments (${assessments.length})` },
          { key: 'treatments', label: `🦷 Treatments (${treatments.length})` }
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabButton,
              activeTab === tab.key && styles.tabButtonActive
            ]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Text style={[
              styles.tabButtonText,
              activeTab === tab.key && styles.tabButtonTextActive
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollContainer}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'assessments' && renderAssessments()}
        {activeTab === 'treatments' && renderTreatments()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  exportButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#007bff',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  tabButtonTextActive: {
    color: '#007bff',
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoContainer: {
    marginRight: 20,
  },
  patientPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  placeholderPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  patientBasicInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  patientDetails: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  patientLocation: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  registrationDate: {
    fontSize: 14,
    color: '#999',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: (width - 44) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  breakdownCard: {
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
  breakdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  breakdownType: {
    fontSize: 16,
    color: '#333',
  },
  breakdownCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007bff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  itemHeaderRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
  },
  itemType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemSummary: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '500',
  },
  treatmentSummary: {
    fontSize: 13,
    color: '#666',
  },
  expandIcon: {
    fontSize: 14,
    color: '#999',
    fontWeight: 'bold',
  },
  itemMetadata: {
    marginBottom: 8,
  },
  itemDate: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  itemValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  itemClinician: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  expandedDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f8f9fa',
    paddingTop: 12,
    marginTop: 8,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  detailItem: {
    fontSize: 13,
    color: '#495057',
    marginBottom: 4,
    paddingLeft: 8,
  },
  billingCodes: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f8f9fa',
  },
  billingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  billingCodeItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#007bff',
  },
  billingCode: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007bff',
    marginBottom: 2,
  },
  billingPrice: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 2,
  },
  billingDescription: {
    fontSize: 12,
    color: '#666',
  },
});

export default PatientDetailScreen;