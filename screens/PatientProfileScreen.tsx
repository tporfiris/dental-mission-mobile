// screens/PatientProfileScreen.tsx - UPDATED VERSION WITH SMALLER QR AT BOTTOM
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
// ✅ NEW: Import centralized parsing utilities
import { parseAssessmentData, parseTreatmentDetails } from '../utils/parseAssessmentData';
import { SmartImage } from '../components/SmartImage';

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

// ✅ NEW: Simple wrapper to convert Treatment model to parseable format
const convertTreatmentForParsing = (treatment: Treatment): TreatmentDetail => {
  const details = parseTreatmentDetails({
    id: treatment.id,
    type: treatment.type,
    tooth: treatment.tooth,
    surface: treatment.surface,
    units: treatment.units,
    value: treatment.value,
    notes: treatment.notes,
    billingCodes: treatment.billingCodes,
    clinicianName: treatment.clinicianName,
    completedAt: treatment.completedAt,
  });
  
  let billingCodes: any[] = [];
  try {
    billingCodes = typeof treatment.billingCodes === 'string' 
      ? JSON.parse(treatment.billingCodes) 
      : treatment.billingCodes || [];
  } catch (e) {
    // Handle parsing error
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

      // ✅ NEW: Use the wrapper function to convert treatments
      const parsedTreatments = patientTreatments.map(t => convertTreatmentForParsing(t));

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
          <SmartImage 
            localUri={patient.photoUri}
            cloudUri={patient.photoCloudUri}
            style={styles.profilePhoto} 
          />
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
                // ✅ NEW: Use centralized parsing function
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

      {/* QR Code Section - Moved to Bottom */}
      <View style={styles.qrSection}>
        <Text style={styles.qrSectionTitle}>Patient QR Code</Text>
        <View style={styles.qrContainer}>
          <QRCode value={patient.id} size={100} />
        </View>
        <Text style={styles.qrIdText}>ID: {patient.id.slice(0, 8)}...</Text>
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
    marginTop: 20,
    marginBottom: 20,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  qrSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 16,
  },
  qrContainer: {
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 12,
  },
  qrIdText: {
    fontSize: 11,
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
  treatmentDateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  treatmentDateCount: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
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