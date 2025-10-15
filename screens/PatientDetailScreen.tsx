// screens/PatientDetailScreen.tsx - Enhanced with Excel export
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
  Dimensions,
  Platform
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';

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
            `Present teeth (${present.length}): ${present.map(([t]) => getCurrentToothId(t)).join(', ') || 'None'}`,
            `Crown missing (${crownMissing.length}): ${crownMissing.map(([t]) => getCurrentToothId(t)).join(', ') || 'None'}`,
            `Roots only (${rootsOnly.length}): ${rootsOnly.map(([t]) => getCurrentToothId(t)).join(', ') || 'None'}`,
            `Fully missing (${missing.length}): ${missing.map(([t]) => getCurrentToothId(t)).join(', ') || 'None'}`,
          ];
          
          if (primaryTeeth.length > 0) {
            const primaryToothNumbers = primaryTeeth.map((t: string) => getCurrentToothId(t));
            dentitionDetails.push(`Primary teeth (${primaryTeeth.length}): ${primaryToothNumbers.join(', ')}`);
          }
          
          return {
            summary: `${present.length} present, ${missing.length} missing, ${crownMissing.length} crown missing`,
            details: dentitionDetails
          };
        }
        return { summary: 'Dentition assessed', details: ['Legacy format - basic data available'] };
      }
        
      case 'hygiene': {
        if (parsed.calculusLevel !== undefined || parsed.plaqueLevel !== undefined || parsed.probingDepths !== undefined) {
          const assessment = parsed;
          const hygieneDetails = [];
          
          const calculusLevel = assessment.calculusLevel || 'none';
          const CALCULUS_LABELS: Record<string, string> = {
            'none': 'No Calculus',
            'light': 'Light Calculus',
            'moderate': 'Moderate Calculus',
            'heavy': 'Heavy Calculus'
          };
          
          hygieneDetails.push(`CALCULUS ASSESSMENT:`);
          hygieneDetails.push(`Level: ${CALCULUS_LABELS[calculusLevel] || calculusLevel}`);
          
          if (calculusLevel !== 'none') {
            const distribution = assessment.calculusDistribution || 'none';
            hygieneDetails.push(`Distribution: ${distribution === 'generalized' ? 'Generalized (throughout mouth)' : 'Localized'}`);
            
            if (distribution === 'localized' && assessment.calculusQuadrants?.length > 0) {
              const QUADRANT_LABELS: Record<string, string> = {
                'upper-right': 'Upper Right',
                'upper-left': 'Upper Left',
                'lower-left': 'Lower Left',
                'lower-right': 'Lower Right'
              };
              const quadrants = assessment.calculusQuadrants.map((q: string) => QUADRANT_LABELS[q] || q);
              hygieneDetails.push(`Affected quadrants: ${quadrants.join(', ')}`);
            }
          }
          
          const plaqueLevel = assessment.plaqueLevel || 'none';
          const PLAQUE_LABELS: Record<string, string> = {
            'none': 'No Plaque',
            'light': 'Light Plaque',
            'moderate': 'Moderate Plaque',
            'heavy': 'Heavy Plaque'
          };
          
          hygieneDetails.push(`PLAQUE ASSESSMENT:`);
          hygieneDetails.push(`Level: ${PLAQUE_LABELS[plaqueLevel] || plaqueLevel}`);
          
          if (plaqueLevel !== 'none') {
            const distribution = assessment.plaqueDistribution || 'none';
            hygieneDetails.push(`Distribution: ${distribution === 'generalized' ? 'Generalized (throughout mouth)' : 'Localized'}`);
            
            if (distribution === 'localized' && assessment.plaqueQuadrants?.length > 0) {
              const QUADRANT_LABELS: Record<string, string> = {
                'upper-right': 'Upper Right',
                'upper-left': 'Upper Left',
                'lower-left': 'Lower Left',
                'lower-right': 'Lower Right'
              };
              const quadrants = assessment.plaqueQuadrants.map((q: string) => QUADRANT_LABELS[q] || q);
              hygieneDetails.push(`Affected quadrants: ${quadrants.join(', ')}`);
            }
          }
          
          if (assessment.probingDepths) {
            const depths = Object.entries(assessment.probingDepths);
            const depthGroups: Record<string, string[]> = {
              '7+': [],
              '5-6': [],
              '4': [],
              '≤3': []
            };
            
            depths.forEach(([tooth, depth]: any) => {
              if (depth >= 7) {
                depthGroups['7+'].push(tooth);
              } else if (depth >= 5) {
                depthGroups['5-6'].push(tooth);
              } else if (depth === 4) {
                depthGroups['4'].push(tooth);
              } else {
                depthGroups['≤3'].push(tooth);
              }
            });
            
            hygieneDetails.push(`PROBING DEPTH:`);
            
            if (depthGroups['7+'].length > 0) {
              hygieneDetails.push(`Teeth ${depthGroups['7+'].join(', ')}: 7+mm (severe)`);
            }
            if (depthGroups['5-6'].length > 0) {
              hygieneDetails.push(`Teeth ${depthGroups['5-6'].join(', ')}: 5-6mm (moderate)`);
            }
            if (depthGroups['4'].length > 0) {
              hygieneDetails.push(`Teeth ${depthGroups['4'].join(', ')}: 4mm (mild)`);
            }
            if (depthGroups['≤3'].length > 0) {
              hygieneDetails.push(`Teeth ${depthGroups['≤3'].join(', ')}: ≤3mm (healthy)`);
            }
          }

          if (assessment.bleedingOnProbing) {
            const bleeding = assessment.bleedingOnProbing;
            const bleedingTeeth = Object.entries(bleeding)
              .filter(([_, bleeds]: any) => bleeds)
              .map(([tooth, _]: any) => tooth);
            
            hygieneDetails.push(`BLEEDING:`);
            if (bleedingTeeth.length > 0) {
              hygieneDetails.push(`Bleeding? Yes - teeth ${bleedingTeeth.join(', ')}`);
            } else {
              hygieneDetails.push(`Bleeding? No`);
            }
          }
          
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
            
            hygieneDetails.push(`AAP PERIODONTAL CLASSIFICATION:`);
            if (assessment.aapStage) {
              hygieneDetails.push(`${AAP_STAGE_LABELS[assessment.aapStage] || `Stage ${assessment.aapStage}`}`);
            }
            if (assessment.aapGrade) {
              hygieneDetails.push(`${AAP_GRADE_LABELS[assessment.aapGrade] || `Grade ${assessment.aapGrade}`}`);
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
          `Total extractions needed: ${extractions.length}`,
          `Loose teeth (${loose.length}): ${loose.length > 0 ? loose.map(([t]) => t).join(', ') : 'None'}`,
          `Root tips (${rootTip.length}): ${rootTip.length > 0 ? rootTip.map(([t]) => t).join(', ') : 'None'}`,
          `Non-restorable (${nonRestorable.length}): ${nonRestorable.length > 0 ? nonRestorable.map(([t]) => t).join(', ') : 'None'}`,
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
            fillingsDetails.push('No restorative issues found');
          } else {
            fillingsDetails.push(`${teethWithFindings.length} teeth with findings`);
            
            teethWithFindings.forEach(([toothId, state]: any) => {
              const displayToothId = getCurrentToothId(toothId);
              const toothDetails = [`Tooth ${displayToothId}:`];
              
              if (state.hasFillings && state.fillingSurfaces?.length > 0) {
                const material = state.fillingType || 'unknown';
                const surfaces = state.fillingSurfaces.join('');
                toothDetails.push(`Has existing filling: Yes (${material}, surfaces: ${surfaces})`);
              }
              
              if (state.hasCrowns) {
                const material = state.crownMaterial || 'unknown';
                toothDetails.push(`Has existing crown: Yes (${material})`);
              }
              
              if (state.hasExistingRootCanal) {
                toothDetails.push(`Has existing root canal: Yes`);
              }
              
              if (state.hasCavities && state.cavitySurfaces?.length > 0) {
                const surfaces = state.cavitySurfaces.join('');
                toothDetails.push(`Cavities: Yes (locations: ${surfaces})`);
              }
              
              if (state.isBroken && state.brokenSurfaces?.length > 0) {
                const surfaces = state.brokenSurfaces.join('');
                toothDetails.push(`Broken/cracked: Yes (surfaces: ${surfaces})`);
              }
              
              if (state.needsRootCanal) {
                const diagnoses = [];
                if (state.pulpDiagnosis) diagnoses.push(state.pulpDiagnosis);
                if (state.apicalDiagnosis) diagnoses.push(state.apicalDiagnosis);
                const diagnosisText = diagnoses.length > 0 ? ` (${diagnoses.join(', ')})` : '';
                toothDetails.push(`Root canal needed: Yes${diagnosisText}`);
              }
              
              fillingsDetails.push(toothDetails.join(' | '));
            });
          }
          
          if (primaryTeeth.length > 0) {
            const primaryToothNumbers = primaryTeeth.map((t: string) => getCurrentToothId(t));
            fillingsDetails.push(`Primary teeth recorded (${primaryTeeth.length}): ${primaryToothNumbers.join(', ')}`);
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
          dentureDetails.push(`Denture recommended: ${dentureType}`);
        } else {
          dentureDetails.push('No denture needed');
        }
        
        const relineServices = Object.entries(relineOptions).filter(([_, v]) => v);
        if (relineServices.length > 0) {
          const relineTypes = relineServices.map(([service]) => {
            return service.split('-').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
          });
          dentureDetails.push(`Reline services (${relineServices.length}): ${relineTypes.join(', ')}`);
        } else {
          dentureDetails.push('Reline services: None');
        }
        
        if (parsed.notes) {
          dentureDetails.push(`Notes: ${parsed.notes}`);
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
          implantDetails.push(`Single implants planned (${singleImplants.length}): ${singleImplants.join(', ')}`);
        } else {
          implantDetails.push(`Single implants planned (0): None`);
        }
        
        if (bridgeImplants.length > 0) {
          implantDetails.push(`Bridge implants planned (${bridgeImplants.length}): ${bridgeImplants.join(', ')}`);
        } else {
          implantDetails.push(`Bridge implants planned (0): None`);
        }
        
        if (boneGrafting) {
          implantDetails.push('Bone grafting: Planned');
        } else {
          implantDetails.push('Bone grafting: Not needed');
        }
        
        if (timing) {
          implantDetails.push(`Timing: ${timing.charAt(0).toUpperCase() + timing.slice(1)} placement`);
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

  // Export to Excel function - COMPREHENSIVE VERSION
  const exportToExcel = async () => {
    try {
      console.log('📊 Starting comprehensive Excel export...');

      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // SHEET 1: Patient Information & Summary
      const patientInfoData = [
        ['PATIENT COMPREHENSIVE REPORT'],
        ['Generated on:', new Date().toLocaleString()],
        [''],
        ['PATIENT INFORMATION'],
        ['Patient ID', patient.id],
        ['First Name', patient.firstName],
        ['Last Name', patient.lastName],
        ['Full Name', `${patient.firstName} ${patient.lastName}`],
        ['Age', patient.age],
        ['Gender', patient.gender],
        ['Location', patient.location],
        ['Registration Date', patient.createdAt.toLocaleDateString()],
        ['Registration Time', patient.createdAt.toLocaleTimeString()],
        ['Photo URI', patient.photoUri || 'No photo'],
        [''],
        ['OVERALL SUMMARY STATISTICS'],
        ['Total Assessments Completed', assessments.length],
        ['Total Treatments Performed', treatments.length],
        ['Total Treatment Value (USD)', `${patientStats.totalValue.toFixed(2)}`],
        ['Average Value Per Treatment', treatments.length > 0 ? `${(patientStats.totalValue / treatments.length).toFixed(2)}` : '$0.00'],
        ['Last Assessment Date', patientStats.latestAssessment ? patientStats.latestAssessment.createdAt.toLocaleDateString() : 'N/A'],
        ['Last Treatment Date', patientStats.latestTreatment ? patientStats.latestTreatment.completedAt.toLocaleDateString() : 'N/A'],
        [''],
        ['ASSESSMENT BREAKDOWN BY TYPE'],
        ...Object.entries(patientStats.assessmentsByType).map(([type, count]) => [
          type.charAt(0).toUpperCase() + type.slice(1),
          count
        ]),
        [''],
        ['TREATMENT BREAKDOWN BY TYPE'],
        ...Object.entries(patientStats.treatmentsByType).map(([type, count]) => {
          const typeValue = treatments
            .filter(t => t.type === type)
            .reduce((sum, t) => sum + (t.value * t.units), 0);
          return [
            type.charAt(0).toUpperCase() + type.slice(1),
            count,
            `${typeValue.toFixed(2)}`
          ];
        }),
      ];

      const patientInfoSheet = XLSX.utils.aoa_to_sheet(patientInfoData);
      
      // Set column widths for better readability
      patientInfoSheet['!cols'] = [
        { wch: 30 },
        { wch: 40 },
        { wch: 15 }
      ];
      
      XLSX.utils.book_append_sheet(workbook, patientInfoSheet, 'Patient Summary');

      // SHEET 2: Detailed Assessments
      const assessmentRows = assessments
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map(a => {
          const parsedData = parseAssessmentData(a.data, a.assessmentType);
          return {
            'Assessment ID': a.id,
            'Patient ID': a.patientId,
            'Date': a.createdAt.toLocaleDateString(),
            'Time': a.createdAt.toLocaleTimeString(),
            'Day of Week': a.createdAt.toLocaleDateString('en-US', { weekday: 'long' }),
            'Assessment Type': a.assessmentType.charAt(0).toUpperCase() + a.assessmentType.slice(1),
            'Clinician Email': a.clinicianEmail,
            'Summary': parsedData.summary,
            'Detailed Findings': parsedData.details.join(' | '),
            'Raw Data': a.data
          };
        });

      if (assessmentRows.length > 0) {
        const assessmentSheet = XLSX.utils.json_to_sheet(assessmentRows);
        assessmentSheet['!cols'] = [
          { wch: 25 }, // Assessment ID
          { wch: 25 }, // Patient ID
          { wch: 12 }, // Date
          { wch: 12 }, // Time
          { wch: 12 }, // Day of Week
          { wch: 15 }, // Assessment Type
          { wch: 30 }, // Clinician Email
          { wch: 40 }, // Summary
          { wch: 60 }, // Detailed Findings
          { wch: 50 }  // Raw Data
        ];
        XLSX.utils.book_append_sheet(workbook, assessmentSheet, 'Assessments Details');
      }

      // SHEET 3: Dentition Assessment Breakdown (if exists)
      const dentitionAssessments = assessments.filter(a => a.assessmentType === 'dentition');
      if (dentitionAssessments.length > 0) {
        const dentitionRows: any[] = [];
        
        dentitionAssessments.forEach(a => {
          try {
            const parsed = JSON.parse(a.data);
            if (parsed.originalToothStates) {
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
              
              Object.entries(toothStates).forEach(([toothId, status]) => {
                dentitionRows.push({
                  'Assessment Date': a.createdAt.toLocaleDateString(),
                  'Clinician': a.clinicianEmail,
                  'Original Tooth Number': toothId,
                  'Display Tooth Number': getCurrentToothId(toothId),
                  'Is Primary Tooth': primaryTeeth.includes(toothId) ? 'Yes' : 'No',
                  'Tooth Status': status,
                  'Status Category': status === 'present' ? 'Present' : 
                                   status === 'fully-missing' ? 'Missing' :
                                   status === 'crown-missing' ? 'Crown Missing' :
                                   status === 'roots-only' ? 'Roots Only' : 'Unknown'
                });
              });
            }
          } catch (e) {
            console.error('Error parsing dentition data:', e);
          }
        });
        
        if (dentitionRows.length > 0) {
          const dentitionSheet = XLSX.utils.json_to_sheet(dentitionRows);
          dentitionSheet['!cols'] = [
            { wch: 15 },
            { wch: 30 },
            { wch: 20 },
            { wch: 20 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 }
          ];
          XLSX.utils.book_append_sheet(workbook, dentitionSheet, 'Dentition Details');
        }
      }

      // SHEET 4: Hygiene Assessment Breakdown (if exists)
      const hygieneAssessments = assessments.filter(a => a.assessmentType === 'hygiene');
      if (hygieneAssessments.length > 0) {
        const hygieneRows: any[] = [];
        
        hygieneAssessments.forEach(a => {
          try {
            const parsed = JSON.parse(a.data);
            
            // Main hygiene assessment data
            hygieneRows.push({
              'Assessment Date': a.createdAt.toLocaleDateString(),
              'Assessment Time': a.createdAt.toLocaleTimeString(),
              'Clinician': a.clinicianEmail,
              'Calculus Level': parsed.calculusLevel || 'N/A',
              'Calculus Distribution': parsed.calculusDistribution || 'N/A',
              'Calculus Quadrants': parsed.calculusQuadrants?.join(', ') || 'N/A',
              'Plaque Level': parsed.plaqueLevel || 'N/A',
              'Plaque Distribution': parsed.plaqueDistribution || 'N/A',
              'Plaque Quadrants': parsed.plaqueQuadrants?.join(', ') || 'N/A',
              'AAP Stage': parsed.aapStage || 'N/A',
              'AAP Grade': parsed.aapGrade || 'N/A',
              'Notes': parsed.notes || 'N/A'
            });
            
            // If there are probing depths, create separate rows for each tooth
            if (parsed.probingDepths) {
              Object.entries(parsed.probingDepths).forEach(([tooth, depth]: any) => {
                const bleeding = parsed.bleedingOnProbing?.[tooth] || false;
                hygieneRows.push({
                  'Assessment Date': a.createdAt.toLocaleDateString(),
                  'Type': 'Probing Depth',
                  'Tooth Number': tooth,
                  'Probing Depth (mm)': depth,
                  'Bleeding on Probing': bleeding ? 'Yes' : 'No',
                  'Severity': depth >= 7 ? 'Severe (7+mm)' :
                             depth >= 5 ? 'Moderate (5-6mm)' :
                             depth === 4 ? 'Mild (4mm)' :
                             'Healthy (≤3mm)'
                });
              });
            }
          } catch (e) {
            console.error('Error parsing hygiene data:', e);
          }
        });
        
        if (hygieneRows.length > 0) {
          const hygieneSheet = XLSX.utils.json_to_sheet(hygieneRows);
          hygieneSheet['!cols'] = Array(15).fill({ wch: 18 });
          XLSX.utils.book_append_sheet(workbook, hygieneSheet, 'Hygiene Details');
        }
      }

      // SHEET 5: Extractions Assessment Breakdown (if exists)
      const extractionsAssessments = assessments.filter(a => a.assessmentType === 'extractions');
      if (extractionsAssessments.length > 0) {
        const extractionRows: any[] = [];
        
        extractionsAssessments.forEach(a => {
          try {
            const parsed = JSON.parse(a.data);
            const extractionStates = parsed.extractionStates || parsed;
            
            Object.entries(extractionStates).forEach(([tooth, status]: any) => {
              if (status !== 'none') {
                extractionRows.push({
                  'Assessment Date': a.createdAt.toLocaleDateString(),
                  'Clinician': a.clinicianEmail,
                  'Tooth Number': tooth,
                  'Extraction Status': status,
                  'Status Description': status === 'loose' ? 'Loose - needs extraction' :
                                      status === 'root-tip' ? 'Root tip - surgical extraction' :
                                      status === 'non-restorable' ? 'Non-restorable - extraction needed' :
                                      'Unknown',
                  'Priority': status === 'root-tip' ? 'High' :
                            status === 'loose' ? 'Medium' :
                            'Standard'
                });
              }
            });
          } catch (e) {
            console.error('Error parsing extractions data:', e);
          }
        });
        
        if (extractionRows.length > 0) {
          const extractionSheet = XLSX.utils.json_to_sheet(extractionRows);
          extractionSheet['!cols'] = [
            { wch: 15 },
            { wch: 30 },
            { wch: 15 },
            { wch: 20 },
            { wch: 40 },
            { wch: 12 }
          ];
          XLSX.utils.book_append_sheet(workbook, extractionSheet, 'Extractions Details');
        }
      }

      // SHEET 6: Fillings Assessment Breakdown (if exists)
      const fillingsAssessments = assessments.filter(a => a.assessmentType === 'fillings');
      if (fillingsAssessments.length > 0) {
        const fillingsRows: any[] = [];
        
        fillingsAssessments.forEach(a => {
          try {
            const parsed = JSON.parse(a.data);
            if (parsed.originalTeethStates) {
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
              
              Object.entries(teethStates).forEach(([toothId, state]: any) => {
                fillingsRows.push({
                  'Assessment Date': a.createdAt.toLocaleDateString(),
                  'Clinician': a.clinicianEmail,
                  'Original Tooth Number': toothId,
                  'Display Tooth Number': getCurrentToothId(toothId),
                  'Is Primary': primaryTeeth.includes(toothId) ? 'Yes' : 'No',
                  'Has Existing Filling': state.hasFillings ? 'Yes' : 'No',
                  'Filling Type': state.fillingType || 'N/A',
                  'Filling Surfaces': state.fillingSurfaces?.join('') || 'N/A',
                  'Has Crown': state.hasCrowns ? 'Yes' : 'No',
                  'Crown Material': state.crownMaterial || 'N/A',
                  'Has Root Canal': state.hasExistingRootCanal ? 'Yes' : 'No',
                  'Has Cavities': state.hasCavities ? 'Yes' : 'No',
                  'Cavity Surfaces': state.cavitySurfaces?.join('') || 'N/A',
                  'Is Broken': state.isBroken ? 'Yes' : 'No',
                  'Broken Surfaces': state.brokenSurfaces?.join('') || 'N/A',
                  'Needs Root Canal': state.needsRootCanal ? 'Yes' : 'No',
                  'Pulp Diagnosis': state.pulpDiagnosis || 'N/A',
                  'Apical Diagnosis': state.apicalDiagnosis || 'N/A'
                });
              });
            }
          } catch (e) {
            console.error('Error parsing fillings data:', e);
          }
        });
        
        if (fillingsRows.length > 0) {
          const fillingsSheet = XLSX.utils.json_to_sheet(fillingsRows);
          fillingsSheet['!cols'] = Array(18).fill({ wch: 18 });
          XLSX.utils.book_append_sheet(workbook, fillingsSheet, 'Fillings Details');
        }
      }

      // SHEET 7: Comprehensive Treatments
      const treatmentRows = treatments
        .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
        .map(t => {
          const treatmentDetailsList = parseTreatmentDetails(t);
          let billingCodes = [];
          try {
            billingCodes = JSON.parse(t.billingCodes);
          } catch (e) {
            // Handle legacy format
          }

          return {
            'Treatment ID': t.id,
            'Patient ID': t.patientId,
            'Visit ID': t.visitId || 'N/A',
            'Date': t.completedAt.toLocaleDateString(),
            'Time': t.completedAt.toLocaleTimeString(),
            'Day of Week': t.completedAt.toLocaleDateString('en-US', { weekday: 'long' }),
            'Treatment Type': t.type.charAt(0).toUpperCase() + t.type.slice(1),
            'Tooth Number': t.tooth,
            'Surface': t.surface,
            'Units': t.units,
            'Unit Value (USD)': `${t.value.toFixed(2)}`,
            'Total Value (USD)': `${(t.value * t.units).toFixed(2)}`,
            'Clinician Name': t.clinicianName,
            'Treatment Details': treatmentDetailsList.join(' | '),
            'Billing Codes': billingCodes.map((c: any) => 
              typeof c === 'string' ? c : c.code || ''
            ).join(', '),
            'Billing Descriptions': billingCodes.map((c: any) => 
              typeof c === 'object' ? c.description || '' : ''
            ).join(' | '),
            'Notes': t.notes || 'N/A'
          };
        });

      if (treatmentRows.length > 0) {
        const treatmentSheet = XLSX.utils.json_to_sheet(treatmentRows);
        treatmentSheet['!cols'] = [
          { wch: 25 }, // Treatment ID
          { wch: 25 }, // Patient ID
          { wch: 25 }, // Visit ID
          { wch: 12 }, // Date
          { wch: 12 }, // Time
          { wch: 12 }, // Day of Week
          { wch: 15 }, // Treatment Type
          { wch: 12 }, // Tooth Number
          { wch: 10 }, // Surface
          { wch: 8 },  // Units
          { wch: 12 }, // Unit Value
          { wch: 12 }, // Total Value
          { wch: 25 }, // Clinician Name
          { wch: 40 }, // Treatment Details
          { wch: 30 }, // Billing Codes
          { wch: 50 }, // Billing Descriptions
          { wch: 40 }  // Notes
        ];
        XLSX.utils.book_append_sheet(workbook, treatmentSheet, 'Treatments Details');
      }

      // SHEET 8: Financial Summary & Analysis
      const financialData = [
        ['FINANCIAL ANALYSIS REPORT'],
        ['Patient:', `${patient.firstName} ${patient.lastName}`],
        ['Report Date:', new Date().toLocaleDateString()],
        [''],
        ['TREATMENT VALUE BY TYPE'],
        ['Treatment Type', 'Count', 'Total Value (USD)', 'Average Value', 'Percentage of Total'],
      ];

      Object.entries(patientStats.treatmentsByType).forEach(([type, count]) => {
        const typeValue = treatments
          .filter(t => t.type === type)
          .reduce((sum, t) => sum + (t.value * t.units), 0);
        const avgValue = count > 0 ? typeValue / count : 0;
        const percentage = patientStats.totalValue > 0 ? (typeValue / patientStats.totalValue * 100) : 0;
        
        financialData.push([
          type.charAt(0).toUpperCase() + type.slice(1),
          count,
          `${typeValue.toFixed(2)}`,
          `${avgValue.toFixed(2)}`,
          `${percentage.toFixed(1)}%`
        ]);
      });

      financialData.push(['']);
      financialData.push(['TOTAL', patientStats.totalTreatments, `${patientStats.totalValue.toFixed(2)}`, '', '100.0%']);
      financialData.push(['']);
      financialData.push(['TREATMENT TIMELINE ANALYSIS']);
      financialData.push(['First Treatment:', treatments.length > 0 ? 
        treatments.sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime())[0].completedAt.toLocaleDateString() : 'N/A']);
      financialData.push(['Last Treatment:', treatments.length > 0 ? 
        treatments.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())[0].completedAt.toLocaleDateString() : 'N/A']);
      
      if (treatments.length > 1) {
        const firstTreatment = treatments.sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime())[0];
        const lastTreatment = treatments.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())[0];
        const daysBetween = Math.floor((lastTreatment.completedAt.getTime() - firstTreatment.completedAt.getTime()) / (1000 * 60 * 60 * 24));
        financialData.push(['Treatment Span (days):', daysBetween]);
      }

      const financialSheet = XLSX.utils.aoa_to_sheet(financialData);
      financialSheet['!cols'] = [
        { wch: 25 },
        { wch: 12 },
        { wch: 18 },
        { wch: 15 },
        { wch: 18 }
      ];
      XLSX.utils.book_append_sheet(workbook, financialSheet, 'Financial Summary');

      // Write the workbook to binary
      const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

      // Create file path
      const fileName = `Patient_${patient.lastName}_${patient.firstName}_Complete_${Date.now()}.xlsx`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      // Write file
      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('✅ Comprehensive Excel file created:', fileUri);

      // Check if we have expo-sharing available
      try {
        // Try to use expo-sharing if available (after rebuild)
        const Sharing = require('expo-sharing');
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: `Comprehensive Patient Report - ${patient.firstName} ${patient.lastName}`,
            UTI: 'com.microsoft.excel.xlsx'
          });
        } else {
          Alert.alert(
            'File Saved',
            `Excel file has been saved to:\n\n${fileUri}\n\nYou can find it in your file manager.`,
            [{ text: 'OK' }]
          );
        }
      } catch (sharingError) {
        // expo-sharing not available, try native Share with file:// URL
        console.log('expo-sharing not available, using alternative method');
        
        if (Platform.OS === 'ios') {
          // iOS can share file:// URLs directly
          await Share.share({
            url: fileUri,
            title: `Comprehensive Patient Report - ${patient.firstName} ${patient.lastName}`,
          });
        } else if (Platform.OS === 'android') {
          // Android might need content:// URL, but file:// often works
          try {
            await Share.share({
              message: `Complete medical report for ${patient.firstName} ${patient.lastName}. File saved to: ${fileUri}`,
              title: `Comprehensive Patient Report - ${patient.firstName} ${patient.lastName}`,
            });
            
            Alert.alert(
              'File Saved',
              `Excel file has been saved to:\n\n${fileUri}\n\nNote: To share the actual file, you need to rebuild the app with expo-sharing. For now, you can access the file in your device's file manager.`,
              [
                { text: 'OK' },
                { 
                  text: 'Copy Path', 
                  onPress: () => {
                    // This would copy to clipboard if you have expo-clipboard
                    console.log('File path:', fileUri);
                  }
                }
              ]
            );
          } catch (shareError) {
            Alert.alert(
              'File Saved',
              `Excel file has been saved to:\n\n${fileUri}\n\nYou can access it through your file manager app.`,
              [{ text: 'OK' }]
            );
          }
        } else {
          Alert.alert(
            'Success',
            `Comprehensive Excel file saved to:\n\n${fileUri}`,
            [{ text: 'OK' }]
          );
        }
      }

    } catch (error) {
      console.error('❌ Excel export error:', error);
      Alert.alert('Error', 'Failed to export to Excel. Please try again.');
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
          <TouchableOpacity style={styles.exportButton} onPress={exportToExcel}>
            <Text style={styles.exportButtonText}>📊 Export Excel</Text>
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