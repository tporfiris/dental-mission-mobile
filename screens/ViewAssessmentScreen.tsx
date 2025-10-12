// screens/ViewAssessmentScreen.tsx - Enhanced with date grouping
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import DentitionAssessment from '../db/models/DentitionAssessment';
import HygieneAssessment from '../db/models/HygieneAssessment';
import ExtractionsAssessment from '../db/models/ExtractionsAssessment';
import FillingsAssessment from '../db/models/FillingsAssessment';
import DentureAssessment from '../db/models/DentureAssessment';
import ImplantAssessment from '../db/models/ImplantAssessment';

interface Assessment {
  id: string;
  type: string;
  emoji: string;
  data: string;
  createdAt: Date;
  updatedAt: Date;
}

interface GroupedAssessment {
  date: string;
  assessments: Assessment[];
}

// Helper function to parse assessment data with detailed formatting
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
            
            hygieneDetails.push(`\n📏 PROBING DEPTH:`);
            
            if (depthGroups['7+'].length > 0) {
              hygieneDetails.push(`   • Teeth ${depthGroups['7+'].join(', ')}: 7+mm (severe)`);
            }
            if (depthGroups['5-6'].length > 0) {
              hygieneDetails.push(`   • Teeth ${depthGroups['5-6'].join(', ')}: 5-6mm (moderate)`);
            }
            if (depthGroups['4'].length > 0) {
              hygieneDetails.push(`   • Teeth ${depthGroups['4'].join(', ')}: 4mm (mild)`);
            }
            if (depthGroups['≤3'].length > 0) {
              hygieneDetails.push(`   • Teeth ${depthGroups['≤3'].join(', ')}: ≤3mm (healthy)`);
            }
          }

          if (assessment.bleedingOnProbing) {
            const bleeding = assessment.bleedingOnProbing;
            const bleedingTeeth = Object.entries(bleeding)
              .filter(([_, bleeds]: any) => bleeds)
              .map(([tooth, _]: any) => tooth);
            
            hygieneDetails.push(`\n🩸 BLEEDING:`);
            if (bleedingTeeth.length > 0) {
              hygieneDetails.push(`   • Bleeding? Yes - teeth ${bleedingTeeth.join(', ')}`);
            } else {
              hygieneDetails.push(`   • Bleeding? No`);
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
                toothDetails.push(`   • Existing filling: ${material}, surfaces: ${surfaces}`);
              }
              
              if (state.hasCrowns) {
                const material = state.crownMaterial || 'unknown';
                toothDetails.push(`   • Existing crown: ${material}`);
              }
              
              if (state.hasExistingRootCanal) {
                toothDetails.push(`   • Existing root canal: Yes`);
              }
              
              if (state.hasCavities && state.cavitySurfaces?.length > 0) {
                const surfaces = state.cavitySurfaces.join('');
                toothDetails.push(`   • Cavities: ${surfaces} surfaces`);
              }
              
              if (state.isBroken && state.brokenSurfaces?.length > 0) {
                const surfaces = state.brokenSurfaces.join('');
                toothDetails.push(`   • Broken/cracked: ${surfaces} surfaces`);
              }
              
              if (state.needsRootCanal) {
                const diagnoses = [];
                if (state.pulpDiagnosis) diagnoses.push(state.pulpDiagnosis);
                if (state.apicalDiagnosis) diagnoses.push(state.apicalDiagnosis);
                const diagnosisText = diagnoses.length > 0 ? ` (${diagnoses.join(', ')})` : '';
                toothDetails.push(`   • Root canal needed${diagnosisText}`);
              }
              
              fillingsDetails.push(toothDetails.join('\n'));
            });
          }
          
          if (primaryTeeth.length > 0) {
            const primaryToothNumbers = primaryTeeth.map((t: string) => getCurrentToothId(t));
            fillingsDetails.push(`\n🦷 Primary teeth: ${primaryToothNumbers.join(', ')}`);
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
          dentureDetails.push(`🔧 Reline services: ${relineTypes.join(', ')}`);
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
          implantDetails.push(`🔩 Single implants: ${singleImplants.join(', ')}`);
        }
        
        if (bridgeImplants.length > 0) {
          implantDetails.push(`🌉 Bridge implants: ${bridgeImplants.join(', ')}`);
        }
        
        if (boneGrafting) {
          implantDetails.push('🦴 Bone grafting: Planned');
        }
        
        if (timing) {
          implantDetails.push(`⏱️ Timing: ${timing.charAt(0).toUpperCase() + timing.slice(1)} placement`);
        }
        
        const totalImplants = singleImplants.length + bridgeImplants.length;
        
        if (totalImplants === 0) {
          implantDetails.unshift('✓ No implants planned');
        }
        
        return {
          summary: totalImplants > 0 ? `${totalImplants} implants planned` : 'No implants planned',
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

const ViewAssessmentScreen = ({ route }: any) => {
  const { patientId } = route.params;
  const db = useDatabase();
  const [loading, setLoading] = useState(true);
  const [groupedAssessments, setGroupedAssessments] = useState<GroupedAssessment[]>([]);
  const [expandedAssessment, setExpandedAssessment] = useState<string | null>(null);

  useEffect(() => {
    const loadAssessments = async () => {
      try {
        console.log('🔍 Loading assessments for patient:', patientId);

        const [dentition, hygiene, extractions, fillings, denture, implant] = await Promise.all([
          db.get<DentitionAssessment>('dentition_assessments').query(Q.where('patient_id', Q.eq(patientId))).fetch(),
          db.get<HygieneAssessment>('hygiene_assessments').query(Q.where('patient_id', Q.eq(patientId))).fetch(),
          db.get<ExtractionsAssessment>('extractions_assessments').query(Q.where('patient_id', Q.eq(patientId))).fetch(),
          db.get<FillingsAssessment>('fillings_assessments').query(Q.where('patient_id', Q.eq(patientId))).fetch(),
          db.get<DentureAssessment>('denture_assessments').query(Q.where('patient_id', Q.eq(patientId))).fetch(),
          db.get<ImplantAssessment>('implant_assessments').query(Q.where('patient_id', Q.eq(patientId))).fetch(),
        ]);

        // Combine all assessments with their types
        const allAssessments: Assessment[] = [
          ...dentition.map(a => ({ id: a.id, type: 'Dentition', emoji: '🦷', data: a.data, createdAt: a.createdAt })),
          ...hygiene.map(a => ({ id: a.id, type: 'Hygiene', emoji: '🪥', data: a.data, createdAt: a.createdAt })),
          ...extractions.map(a => ({ id: a.id, type: 'Extractions', emoji: '🛠️', data: a.data, createdAt: a.createdAt })),
          ...fillings.map(a => ({ id: a.id, type: 'Fillings', emoji: '🧱', data: a.data, createdAt: a.createdAt })),
          ...denture.map(a => ({ id: a.id, type: 'Denture', emoji: '🦷', data: a.data, createdAt: a.createdAt })),
          ...implant.map(a => ({ id: a.id, type: 'Implant', emoji: '🧲', data: a.data, createdAt: a.createdAt })),
        ];

        // Group assessments by date
        const grouped = allAssessments.reduce((acc, assessment) => {
          const dateKey = assessment.createdAt.toLocaleDateString();
          
          const existingGroup = acc.find(g => g.date === dateKey);
          if (existingGroup) {
            existingGroup.assessments.push(assessment);
          } else {
            acc.push({
              date: dateKey,
              assessments: [assessment]
            });
          }
          
          return acc;
        }, [] as GroupedAssessment[]);

        // Sort groups by date (newest first) and sort assessments within each group
        grouped.sort((a, b) => {
          const dateA = new Date(a.assessments[0].createdAt);
          const dateB = new Date(b.assessments[0].createdAt);
          return dateB.getTime() - dateA.getTime();
        });

        grouped.forEach(group => {
          group.assessments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        });

        setGroupedAssessments(grouped);
        console.log('✅ Assessments loaded and grouped by date');
      } catch (err) {
        console.error('❌ Failed to load assessments:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAssessments();
  }, [patientId]);

  const toggleExpansion = (id: string) => {
    setExpandedAssessment(expandedAssessment === id ? null : id);
  };

  const renderAssessmentCard = (assessment: Assessment) => {
    const parsedData = parseAssessmentData(assessment.data, assessment.type.toLowerCase());
    const isExpanded = expandedAssessment === assessment.id;

    return (
      <TouchableOpacity 
        key={assessment.id}
        style={styles.assessmentCard}
        onPress={() => toggleExpansion(assessment.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.assessmentTitle}>{assessment.emoji} {assessment.type} Assessment</Text>
            <Text style={styles.summaryText}>{parsedData.summary}</Text>
            <Text style={styles.assessmentTime}>
              {assessment.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
        </View>
        
        {isExpanded && (
          <View style={styles.detailsContainer}>
            <View style={styles.divider} />
            <Text style={styles.detailsTitle}>Assessment Details:</Text>
            {parsedData.details.map((detail, index) => (
              <Text key={index} style={styles.detailText}>{detail}</Text>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading assessments...</Text>
      </View>
    );
  }

  const totalAssessmentCount = groupedAssessments.reduce((sum, group) => sum + group.assessments.length, 0);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Patient Assessment Summary</Text>
        <Text style={styles.headerSubtitle}>
          {totalAssessmentCount} assessment{totalAssessmentCount !== 1 ? 's' : ''} across {groupedAssessments.length} date{groupedAssessments.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {groupedAssessments.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No assessments found for this patient.{'\n'}
            Complete assessments before starting treatment.
          </Text>
        </View>
      ) : (
        groupedAssessments.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.dateGroup}>
            <View style={styles.dateHeader}>
              <Text style={styles.dateText}>📅 {group.date}</Text>
              <Text style={styles.dateCount}>
                {group.assessments.length} assessment{group.assessments.length !== 1 ? 's' : ''}
              </Text>
            </View>
            {group.assessments.map(assessment => renderAssessmentCard(assessment))}
          </View>
        ))
      )}
    </ScrollView>
  );
};

export default ViewAssessmentScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  dateGroup: {
    marginTop: 16,
  },
  dateHeader: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  dateCount: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  assessmentCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  assessmentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '500',
  },
  expandIcon: {
    fontSize: 16,
    color: '#999',
    fontWeight: 'bold',
    marginTop: 2,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
  detailsContainer: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginBottom: 12,
  },
  detailsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 13,
    color: '#495057',
    lineHeight: 20,
    marginBottom: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});