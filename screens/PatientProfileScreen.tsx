// screens/PatientProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import QRCode from 'react-native-qrcode-svg';
import Patient from '../db/models/Patient';
import DentitionAssessment from '../db/models/DentitionAssessment';
import HygieneAssessment from '../db/models/HygieneAssessment';
import ExtractionsAssessment from '../db/models/ExtractionsAssessment';
import FillingsAssessment from '../db/models/FillingsAssessment';
import DentureAssessment from '../db/models/DentureAssessment';
import ImplantAssessment from '../db/models/ImplantAssessment';
import Treatment from '../db/models/Treatment';

interface Assessment {
  id: string;
  type: string;
  emoji: string;
  data: string;
  createdAt: Date;
}

interface GroupedAssessment {
  date: string;
  assessments: Assessment[];
}

interface TreatmentDetail {
  id: string;
  type: string;
  summary: string;
  details: string[];
  value: number;
  clinicianName: string;
  completedAt: Date;
  billingCodes: any[];
}

interface GroupedTreatment {
  date: string;
  treatments: TreatmentDetail[];
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
            summary: `${present.length} present, ${missing.length} missing`,
            details: dentitionDetails
          };
        }
        return { summary: 'Dentition assessed', details: [] };
      }
        
      case 'hygiene': {
        if (parsed.calculusLevel !== undefined || parsed.plaqueLevel !== undefined) {
          const hygieneDetails = [];
          
          const calculusLevel = parsed.calculusLevel || 'none';
          const plaqueLevel = parsed.plaqueLevel || 'none';
          
          hygieneDetails.push(`Calculus: ${calculusLevel}`);
          hygieneDetails.push(`Plaque: ${plaqueLevel}`);
          
          if (parsed.aapStage) {
            hygieneDetails.push(`AAP Stage: ${parsed.aapStage}`);
          }
          if (parsed.aapGrade) {
            hygieneDetails.push(`AAP Grade: ${parsed.aapGrade}`);
          }
          
          if (parsed.probingDepths) {
            const depths = Object.entries(parsed.probingDepths);
            const severeDepths = depths.filter(([_, d]: any) => d >= 7);
            if (severeDepths.length > 0) {
              hygieneDetails.push(`Severe pockets (7+mm): ${severeDepths.map(([t]) => t).join(', ')}`);
            }
          }
          
          return {
            summary: `Calculus: ${calculusLevel}, Plaque: ${plaqueLevel}`,
            details: hygieneDetails
          };
        }
        return { summary: 'Hygiene assessed', details: [] };
      }
        
      case 'extractions': {
        const extractionStates = parsed.extractionStates || parsed;
        const extractions = Object.entries(extractionStates).filter(([_, s]: any) => s !== 'none');
        
        const loose = extractions.filter(([_, s]: any) => s === 'loose');
        const rootTip = extractions.filter(([_, s]: any) => s === 'root-tip');
        const nonRestorable = extractions.filter(([_, s]: any) => s === 'non-restorable');
        
        const extractionDetails = [
          `Loose teeth: ${loose.map(([t]) => t).join(', ') || 'None'}`,
          `Root tips: ${rootTip.map(([t]) => t).join(', ') || 'None'}`,
          `Non-restorable: ${nonRestorable.map(([t]) => t).join(', ') || 'None'}`,
        ];
        
        return {
          summary: `${extractions.length} teeth marked for extraction`,
          details: extractionDetails
        };
      }
        
      case 'fillings': {
        if (parsed.savedWithPrimaryNumbers && parsed.originalTeethStates) {
          const teethStates = parsed.originalTeethStates;
          
          const fillingsCount = Object.values(teethStates).filter((t: any) => 
            t.hasFillings && t.fillingSurfaces?.length > 0
          ).length;
          const cavitiesCount = Object.values(teethStates).filter((t: any) => 
            t.hasCavities && t.cavitySurfaces?.length > 0
          ).length;
          const rctNeededCount = Object.values(teethStates).filter((t: any) => t.needsRootCanal).length;
          
          const fillingsDetails = [
            `Existing fillings: ${fillingsCount} teeth`,
            `Cavities found: ${cavitiesCount} teeth`,
            `Root canal needed: ${rctNeededCount} teeth`,
          ];
          
          return {
            summary: `${fillingsCount} fillings, ${cavitiesCount} cavities`,
            details: fillingsDetails
          };
        }
        return { summary: 'Dental assessment completed', details: [] };
      }
        
      case 'denture': {
        const dentureType = parsed.selectedDentureType;
        const dentureDetails = [];
        
        if (dentureType && dentureType !== 'none') {
          dentureDetails.push(`Denture type: ${dentureType}`);
        }
        
        const relineOptions = parsed.dentureOptions || {};
        const relineServices = Object.entries(relineOptions).filter(([_, v]) => v);
        if (relineServices.length > 0) {
          dentureDetails.push(`Reline services: ${relineServices.length}`);
        }
        
        return {
          summary: dentureType === 'none' ? 'No denture needed' : `${dentureType} recommended`,
          details: dentureDetails
        };
      }
        
      case 'implant': {
        const singleImplants = parsed.singleImplantTeeth || [];
        const bridgeImplants = parsed.bridgeImplantTeeth || [];
        const totalImplants = singleImplants.length + bridgeImplants.length;
        
        const implantDetails = [];
        
        if (singleImplants.length > 0) {
          implantDetails.push(`Single implants: ${singleImplants.join(', ')}`);
        }
        if (bridgeImplants.length > 0) {
          implantDetails.push(`Bridge implants: ${bridgeImplants.join(', ')}`);
        }
        if (parsed.boneGraftingPlanned) {
          implantDetails.push('Bone grafting planned');
        }
        
        return {
          summary: totalImplants > 0 ? `${totalImplants} implants planned` : 'No implants planned',
          details: implantDetails
        };
      }
        
      default:
        return { summary: 'Assessment completed', details: [] };
    }
  } catch (error) {
    console.error('Error parsing assessment data:', error);
    return { summary: 'Assessment completed', details: [] };
  }
};

// Helper function to parse treatment details
const parseTreatmentDetails = (treatment: Treatment): TreatmentDetail => {
  const details: string[] = [];
  let billingCodes: any[] = [];
  
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
          details.push(`Scaling: ${hygieneData.scalingUnits} units`);
        }
        if (hygieneData.polishingUnits) {
          details.push(`Polishing: ${hygieneData.polishingUnits} units`);
        }
        if (hygieneData.fluorideType && hygieneData.fluorideType !== 'none') {
          details.push(`Fluoride: ${hygieneData.fluorideType}`);
        }
        if (hygieneData.prescribedMedication) {
          details.push(`Medication: ${hygieneData.prescribedMedication}`);
        }
      } catch (e) {
        details.push(`Units: ${treatment.units}`);
      }
      break;
      
    case 'extraction':
      details.push(`Tooth: ${treatment.tooth}`);
      if (billingCodes.length > 0 && billingCodes[0].complexity) {
        details.push(`Type: ${billingCodes[0].complexity}`);
      }
      break;
      
    case 'filling':
      details.push(`Tooth: ${treatment.tooth}`);
      details.push(`Surface: ${treatment.surface}`);
      details.push(`Units: ${treatment.units}`);
      break;
      
    case 'denture':
      if (billingCodes.length > 0) {
        details.push(`Type: ${billingCodes[0].description || 'Denture placement'}`);
      }
      break;
      
    case 'implant':
    case 'implant-crown':
      details.push(`Tooth: ${treatment.tooth}`);
      if (billingCodes.length > 0) {
        details.push(`Type: ${billingCodes[0].category || treatment.type}`);
      }
      break;
      
    default:
      details.push(`Tooth: ${treatment.tooth}`);
      if (treatment.surface !== 'N/A') {
        details.push(`Surface: ${treatment.surface}`);
      }
      details.push(`Units: ${treatment.units}`);
  }
  
  return {
    id: treatment.id,
    type: treatment.type,
    summary: details.slice(0, 2).join(' • '),
    details,
    value: treatment.value * treatment.units,
    clinicianName: treatment.clinicianName,
    completedAt: treatment.completedAt,
    billingCodes,
  };
};

const PatientProfileScreen = ({ route, navigation }: any) => {
  const { patientId } = route.params;
  const db = useDatabase();
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [groupedAssessments, setGroupedAssessments] = useState<GroupedAssessment[]>([]);
  const [groupedTreatments, setGroupedTreatments] = useState<GroupedTreatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAssessment, setExpandedAssessment] = useState<string | null>(null);
  const [expandedTreatment, setExpandedTreatment] = useState<string | null>(null);

  useEffect(() => {
    loadPatientData();
  }, [patientId]);

  const loadPatientData = async () => {
    try {
      setLoading(true);

      // Load patient
      const foundPatient = await db.get<Patient>('patients').find(patientId);
      setPatient(foundPatient);

      // Load all assessments (sorted by creation date, newest first)
      const [
        dentitionAssessments,
        hygieneAssessments,
        extractionsAssessments,
        fillingsAssessments,
        dentureAssessments,
        implantAssessments,
      ] = await Promise.all([
        db.get<DentitionAssessment>('dentition_assessments')
          .query(
            Q.where('patient_id', patientId),
            Q.sortBy('created_at', Q.desc)
          )
          .fetch(),
        db.get<HygieneAssessment>('hygiene_assessments')
          .query(
            Q.where('patient_id', patientId),
            Q.sortBy('created_at', Q.desc)
          )
          .fetch(),
        db.get<ExtractionsAssessment>('extractions_assessments')
          .query(
            Q.where('patient_id', patientId),
            Q.sortBy('created_at', Q.desc)
          )
          .fetch(),
        db.get<FillingsAssessment>('fillings_assessments')
          .query(
            Q.where('patient_id', patientId),
            Q.sortBy('created_at', Q.desc)
          )
          .fetch(),
        db.get<DentureAssessment>('denture_assessments')
          .query(
            Q.where('patient_id', patientId),
            Q.sortBy('created_at', Q.desc)
          )
          .fetch(),
        db.get<ImplantAssessment>('implant_assessments')
          .query(
            Q.where('patient_id', patientId),
            Q.sortBy('created_at', Q.desc)
          )
          .fetch(),
      ]);

      // Combine all assessments with their types
      const allAssessments: Assessment[] = [
        ...dentitionAssessments.map(a => ({ id: a.id, type: 'Dentition', emoji: '🦷', data: a.data, createdAt: a.createdAt })),
        ...hygieneAssessments.map(a => ({ id: a.id, type: 'Hygiene', emoji: '🪥', data: a.data, createdAt: a.createdAt })),
        ...extractionsAssessments.map(a => ({ id: a.id, type: 'Extractions', emoji: '🛠️', data: a.data, createdAt: a.createdAt })),
        ...fillingsAssessments.map(a => ({ id: a.id, type: 'Fillings', emoji: '🧱', data: a.data, createdAt: a.createdAt })),
        ...dentureAssessments.map(a => ({ id: a.id, type: 'Denture', emoji: '🦷', data: a.data, createdAt: a.createdAt })),
        ...implantAssessments.map(a => ({ id: a.id, type: 'Implant', emoji: '🧲', data: a.data, createdAt: a.createdAt })),
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

      // Load and parse treatments
      const patientTreatments = await db
        .get<Treatment>('treatments')
        .query(
          Q.where('patient_id', patientId),
          Q.sortBy('completed_at', Q.desc)
        )
        .fetch();

      const parsedTreatments = patientTreatments.map(t => parseTreatmentDetails(t));

      // Group treatments by date
      const groupedTreatmentsByDate = parsedTreatments.reduce((acc, treatment) => {
        const dateKey = treatment.completedAt.toLocaleDateString();
        
        const existingGroup = acc.find(g => g.date === dateKey);
        if (existingGroup) {
          existingGroup.treatments.push(treatment);
        } else {
          acc.push({
            date: dateKey,
            treatments: [treatment]
          });
        }
        
        return acc;
      }, [] as GroupedTreatment[]);

      // Sort groups by date (newest first) and sort treatments within each group
      groupedTreatmentsByDate.sort((a, b) => {
        const dateA = new Date(a.treatments[0].completedAt);
        const dateB = new Date(b.treatments[0].completedAt);
        return dateB.getTime() - dateA.getTime();
      });

      groupedTreatmentsByDate.forEach(group => {
        group.treatments.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
      });

      setGroupedTreatments(groupedTreatmentsByDate);
    } catch (error) {
      console.error('Error loading patient data:', error);
      Alert.alert('Error', 'Failed to load patient information');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  const toggleAssessmentExpansion = (id: string) => {
    setExpandedAssessment(expandedAssessment === id ? null : id);
  };

  const toggleTreatmentExpansion = (id: string) => {
    setExpandedTreatment(expandedTreatment === id ? null : id);
  };

  if (loading || !patient) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading patient profile...</Text>
      </View>
    );
  }

  const totalAssessmentCount = groupedAssessments.reduce((sum, group) => sum + group.assessments.length, 0);
  const totalTreatmentCount = groupedTreatments.reduce((sum, group) => sum + group.treatments.length, 0);

  return (
    <ScrollView style={styles.container}>
      {/* Patient Header */}
      <View style={styles.header}>
        {patient.photoUri ? (
          <Image source={{ uri: patient.photoUri }} style={styles.profilePhoto} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>
              {patient.firstName[0]}{patient.lastName[0]}
            </Text>
          </View>
        )}

        <Text style={styles.patientName}>
          {patient.firstName} {patient.lastName}
        </Text>
        <Text style={styles.patientDetails}>
          {patient.age} years old • {patient.gender}
        </Text>
        <Text style={styles.patientLocation}>📍 {patient.location}</Text>
      </View>

      {/* QR Code */}
      <View style={styles.qrSection}>
        <Text style={styles.sectionTitle}>Patient QR Code</Text>
        <View style={styles.qrContainer}>
          <QRCode value={patient.id} size={200} />
        </View>
        <Text style={styles.qrIdText}>ID: {patient.id}</Text>
      </View>

      {/* New Assessment Button */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={styles.newAssessmentButton}
          onPress={() => navigation.navigate('Assessments', { patientId: patient.id })}
        >
          <Text style={styles.newAssessmentButtonText}>➕ Start New Assessment</Text>
        </TouchableOpacity>
      </View>

      {/* Assessment History Grouped by Date */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Assessment History ({totalAssessmentCount} total)
        </Text>
        {groupedAssessments.length === 0 ? (
          <Text style={styles.emptyText}>No assessments recorded yet</Text>
        ) : (
          groupedAssessments.map((group, groupIndex) => (
            <View key={groupIndex} style={styles.dateGroup}>
              <View style={styles.dateHeader}>
                <Text style={styles.dateText}>📅 {group.date}</Text>
                <Text style={styles.dateCount}>
                  {group.assessments.length} assessment{group.assessments.length !== 1 ? 's' : ''}
                </Text>
              </View>
              
              {group.assessments.map((assessment) => {
                const isExpanded = expandedAssessment === assessment.id;
                const parsed = parseAssessmentData(assessment.data, assessment.type.toLowerCase());
                
                return (
                  <TouchableOpacity
                    key={assessment.id}
                    style={styles.assessmentCard}
                    onPress={() => toggleAssessmentExpansion(assessment.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.assessmentHeader}>
                      <View style={styles.assessmentHeaderLeft}>
                        <Text style={styles.assessmentType}>
                          {assessment.emoji} {assessment.type}
                        </Text>
                        <Text style={styles.assessmentSummary}>{parsed.summary}</Text>
                        <Text style={styles.assessmentTime}>
                          {assessment.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                    </View>
                    
                    {isExpanded && parsed.details.length > 0 && (
                      <View style={styles.assessmentDetails}>
                        <View style={styles.divider} />
                        {parsed.details.map((detail, idx) => (
                          <Text key={idx} style={styles.detailText}>• {detail}</Text>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
      </View>

      {/* Treatment History Grouped by Date */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Treatment History ({totalTreatmentCount} total)
        </Text>
        {groupedTreatments.length === 0 ? (
          <Text style={styles.emptyText}>No treatments recorded yet</Text>
        ) : (
          groupedTreatments.map((group, groupIndex) => (
            <View key={groupIndex} style={styles.dateGroup}>
              <View style={styles.treatmentDateHeader}>
                <Text style={styles.treatmentDateText}>📅 {group.date}</Text>
                <Text style={styles.treatmentDateCount}>
                  {group.treatments.length} treatment{group.treatments.length !== 1 ? 's' : ''}
                </Text>
              </View>
              
              {group.treatments.map((treatment) => {
                const isExpanded = expandedTreatment === treatment.id;
                
                return (
                  <TouchableOpacity
                    key={treatment.id}
                    style={styles.treatmentCard}
                    onPress={() => toggleTreatmentExpansion(treatment.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.treatmentHeader}>
                      <View style={styles.treatmentHeaderLeft}>
                        <Text style={styles.treatmentType}>
                          {treatment.type.charAt(0).toUpperCase() + treatment.type.slice(1)}
                        </Text>
                        <Text style={styles.treatmentSummary}>{treatment.summary}</Text>
                        <Text style={styles.treatmentClinician}>
                          By: {treatment.clinicianName}
                        </Text>
                        <Text style={styles.treatmentTime}>
                          {treatment.completedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <View style={styles.treatmentHeaderRight}>
                        <Text style={styles.treatmentValue}>
                          ${treatment.value.toFixed(2)}
                        </Text>
                        <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                      </View>
                    </View>
                    
                    {isExpanded && (
                      <View style={styles.treatmentDetails}>
                        <View style={styles.divider} />
                        <Text style={styles.detailsTitle}>Treatment Details:</Text>
                        {treatment.details.map((detail, idx) => (
                          <Text key={idx} style={styles.detailText}>• {detail}</Text>
                        ))}
                        
                        {treatment.billingCodes.length > 0 && (
                          <View style={styles.billingSection}>
                            <Text style={styles.billingTitle}>Billing Codes:</Text>
                            {treatment.billingCodes.map((code: any, idx: number) => (
                              <View key={idx} style={styles.billingCodeItem}>
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
              })}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

export default PatientProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  photoPlaceholderText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  patientName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  patientDetails: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  patientLocation: {
    fontSize: 16,
    color: '#666',
  },
  qrSection: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginVertical: 16,
  },
  qrIdText: {
    fontSize: 12,
    color: '#888',
  },
  actionSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 12,
  },
  newAssessmentButton: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  newAssessmentButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 24,
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateHeader: {
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  dateCount: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  assessmentCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  assessmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  assessmentHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  assessmentType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  assessmentSummary: {
    fontSize: 14,
    color: '#007bff',
    marginBottom: 4,
    fontWeight: '500',
  },
  assessmentTime: {
    fontSize: 12,
    color: '#999',
  },
  expandIcon: {
    fontSize: 16,
    color: '#999',
    fontWeight: 'bold',
  },
  assessmentDetails: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 13,
    color: '#495057',
    lineHeight: 20,
    marginBottom: 4,
  },
  treatmentCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  treatmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  treatmentHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  treatmentHeaderRight: {
    alignItems: 'flex-end',
  },
  treatmentType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  treatmentSummary: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  treatmentClinician: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  treatmentTime: {
    fontSize: 12,
    color: '#999',
  },
  treatmentDateHeader: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  treatmentValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 4,
  },
  treatmentDetails: {
    marginTop: 12,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  billingSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  billingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  billingCodeItem: {
    backgroundColor: '#fff',
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