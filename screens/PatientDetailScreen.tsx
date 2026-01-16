// screens/PatientDetailScreen.tsx - UPDATED to show "Needs" data from Fillings assessments
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { parseAssessmentData, parseTreatmentDetails } from '../utils/parseAssessmentData';
import { SmartImage } from '../components/SmartImage';
import { dataDeletionService } from '../services/DataDeletionService';

const { width } = Dimensions.get('window');

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  location: string;
  photoUri?: string;
  photoCloudUri?: string;
  createdAt: Date;
  officeId?: string;
  officeName?: string;
  registeredBy?: string;
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
  officeId?: string;
  officeName?: string;
  performedBy?: string;
}

interface Assessment {
  id: string;
  patientId: string;
  assessmentType: string;
  data: string;
  clinicianEmail: string;
  createdAt: Date;
  officeId?: string;
  officeName?: string;
  clinicianId?: string;
}

const PatientDetailScreen = ({ route, navigation }: any) => {
  const { patient, treatments: initialTreatments, assessments: initialAssessments } = route.params;
  
  const [treatments, setTreatments] = useState<Treatment[]>(initialTreatments || []);
  const [assessments, setAssessments] = useState<Assessment[]>(initialAssessments || []);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Calculate total treatment value
  const totalValue = treatments.reduce((sum, t) => sum + (t.value * t.units), 0);

  // Delete treatment with confirmation
  const handleDeleteTreatment = (treatment: Treatment) => {
    Alert.alert(
      'Delete Treatment',
      'Are you sure you want to delete this ' + treatment.type + ' treatment?\n\nThis will permanently remove it from both the cloud and local databases.\n\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(treatment.id);
            try {
              console.log('Deleting treatment: ' + treatment.id);
              const result = await dataDeletionService.deleteTreatment(treatment.id);

              if (result.isLocked) {
                Alert.alert(
                  '🔒 Item Locked',
                  result.lockReason || 'This item can no longer be deleted because it was synced more than 24 hours ago.',
                  [{ text: 'OK' }]
                );
              } else if (result.success) {
                setTreatments(prev => prev.filter(t => t.id !== treatment.id));
                
                const deletedFrom = [];
                if (result.deletedFrom.cloud) deletedFrom.push('cloud');
                if (result.deletedFrom.local) deletedFrom.push('local');
                
                Alert.alert(
                  'Success',
                  'Treatment deleted successfully from ' + deletedFrom.join(' and ') + ' database' + (deletedFrom.length > 1 ? 's' : '') + '.'
                );
              } else {
                Alert.alert(
                  'Deletion Failed',
                  result.error || 'Failed to delete treatment. Please try again.',
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              console.error('Error deleting treatment:', error);
              Alert.alert(
                'Error',
                'An unexpected error occurred while deleting the treatment.',
                [{ text: 'OK' }]
              );
            } finally {
              setDeletingId(null);
            }
          }
        }
      ]
    );
  };

  // Delete assessment with confirmation
  const handleDeleteAssessment = (assessment: Assessment) => {
    Alert.alert(
      'Delete Assessment',
      'Are you sure you want to delete this ' + assessment.assessmentType + ' assessment?\n\nThis will permanently remove it from both the cloud and local databases.\n\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(assessment.id);
            try {
              console.log('Deleting assessment: ' + assessment.id);
              const result = await dataDeletionService.deleteAssessment(
                assessment.id,
                assessment.assessmentType as any
              );

              if (result.isLocked) {
                Alert.alert(
                  '🔒 Item Locked',
                  result.lockReason || 'This item can no longer be deleted because it was synced more than 24 hours ago.',
                  [{ text: 'OK' }]
                );
              } else if (result.success) {
                setAssessments(prev => prev.filter(a => a.id !== assessment.id));
                
                const deletedFrom = [];
                if (result.deletedFrom.cloud) deletedFrom.push('cloud');
                if (result.deletedFrom.local) deletedFrom.push('local');
                
                Alert.alert(
                  'Success',
                  'Assessment deleted successfully from ' + deletedFrom.join(' and ') + ' database' + (deletedFrom.length > 1 ? 's' : '') + '.'
                );
              } else {
                Alert.alert(
                  'Deletion Failed',
                  result.error || 'Failed to delete assessment. Please try again.',
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              console.error('Error deleting assessment:', error);
              Alert.alert(
                'Error',
                'An unexpected error occurred while deleting the assessment.',
                [{ text: 'OK' }]
              );
            } finally {
              setDeletingId(null);
            }
          }
        }
      ]
    );
  };

  // Expand/collapse state for assessments and treatments
  const [expandedSections, setExpandedSections] = useState({
    assessments: true,
    treatments: true,
  });

  const toggleSection = (section: 'assessments' | 'treatments') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <ScrollView style={styles.container}>
      {/* Patient Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerContent}>
          {patient.photoUri ? (
            <SmartImage
              localUri={patient.photoUri}
              cloudUri={patient.photoCloudUri}
              placeholderInitials={patient.firstName.charAt(0) + patient.lastName.charAt(0)}
              style={styles.patientPhoto}
            />
          ) : (
            <View style={styles.placeholderPhoto}>
              <Text style={styles.placeholderText}>
                {patient.firstName.charAt(0)}{patient.lastName.charAt(0)}
              </Text>
            </View>
          )}

          <View style={styles.headerInfo}>
            <Text style={styles.patientName}>
              {patient.firstName} {patient.lastName}
            </Text>
            <Text style={styles.patientDetails}>
              {patient.age} years • {patient.gender}
            </Text>
            <Text style={styles.patientDetails}>
              📍 {patient.location}
            </Text>
            <Text style={styles.patientOffice}>
              🏥 {patient.officeName || 'Unknown Office'}
            </Text>
            <Text style={styles.patientDate}>
              Registered: {patient.createdAt.toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Summary</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{assessments.length}</Text>
            <Text style={styles.statLabel}>Assessments</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{treatments.length}</Text>
            <Text style={styles.statLabel}>Treatments</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>${totalValue.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Total Value</Text>
          </View>
        </View>
      </View>

      {/* Assessments Section */}
      <View style={styles.sectionCard}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('assessments')}
        >
          <Text style={styles.sectionTitle}>
            📋 Assessments ({assessments.length})
          </Text>
          <Text style={styles.expandIcon}>
            {expandedSections.assessments ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {expandedSections.assessments && (
          <View style={styles.sectionContent}>
            {assessments.length === 0 ? (
              <Text style={styles.emptyText}>No assessments recorded</Text>
            ) : (
              assessments
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .map((assessment) => {
                  const parsed = parseAssessmentData(
                    typeof assessment.data === 'string' 
                      ? JSON.parse(assessment.data) 
                      : assessment.data,
                    assessment.assessmentType
                  );

                  // ✅ NEW: Extract "Needs" data for Fillings assessments
                  let needsData = null;
                  if (assessment.assessmentType.toLowerCase() === 'fillings') {
                    try {
                      const assessmentJson = typeof assessment.data === 'string' 
                        ? JSON.parse(assessment.data) 
                        : assessment.data;
                      
                      if (assessmentJson.teethWithIssues) {
                        const needs = {
                          needsFillings: [] as string[],
                          needsCrowns: [] as string[],
                          needsNewRootCanals: [] as string[],
                        };
                        
                        Object.entries(assessmentJson.teethWithIssues).forEach(([toothId, toothData]: [string, any]) => {
                          if (toothData.neededFillings) {
                            needs.needsFillings.push(
                              'Tooth ' + toothId + ': ' + toothData.neededFillings.type + ' filling on ' + toothData.neededFillings.surfaces.join('') + ' surfaces'
                            );
                          }
                          if (toothData.neededCrown) {
                            needs.needsCrowns.push(
                              'Tooth ' + toothId + ': ' + toothData.neededCrown.material + ' crown'
                            );
                          }
                          if (toothData.needsNewRootCanal) {
                            needs.needsNewRootCanals.push('Tooth ' + toothId);
                          }
                        });
                        
                        if (needs.needsFillings.length > 0 || needs.needsCrowns.length > 0 || needs.needsNewRootCanals.length > 0) {
                          needsData = needs;
                        }
                      }
                    } catch (e) {
                      console.log('Could not parse needs data from assessment');
                    }
                  }

                  return (
                    <View key={assessment.id} style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <View style={styles.itemHeaderLeft}>
                          <Text style={styles.itemType}>
                            {assessment.assessmentType.charAt(0).toUpperCase() + 
                             assessment.assessmentType.slice(1)}
                          </Text>
                          {/* ✅ NEW: Show badge if there are treatment needs */}
                          {needsData && (
                            <View style={styles.needsBadge}>
                              <Text style={styles.needsBadgeText}>⚠️ Treatment Needs</Text>
                            </View>
                          )}
                          <Text style={styles.itemDate}>
                            {assessment.createdAt.toLocaleDateString()} at{' '}
                            {assessment.createdAt.toLocaleTimeString()}
                          </Text>
                        </View>
                        
                        {/* Delete Button */}
                        <TouchableOpacity
                          style={[
                            styles.deleteButton,
                            deletingId === assessment.id && styles.deleteButtonDisabled
                          ]}
                          onPress={() => handleDeleteAssessment(assessment)}
                          disabled={deletingId === assessment.id}
                        >
                          {deletingId === assessment.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.deleteButtonText}>🗑️</Text>
                          )}
                        </TouchableOpacity>
                      </View>

                      <View style={styles.itemDetails}>
                        <Text style={styles.itemSummary}>{parsed.summary}</Text>
                        {parsed.details.length > 0 && (
                          <View style={styles.detailsList}>
                            {parsed.details.map((detail, index) => (
                              <Text key={index} style={styles.detailItem}>
                                • {detail}
                              </Text>
                            ))}
                          </View>
                        )}
                      </View>

                      {/* ✅ NEW: Show "Needs" section for Fillings assessments */}
                      {needsData && (
                        <View style={styles.needsSection}>
                          <View style={styles.divider} />
                          <Text style={styles.needsSectionTitle}>🔔 Treatment Needs:</Text>
                          
                          {needsData.needsFillings.length > 0 && (
                            <View style={styles.needsCategory}>
                              <Text style={styles.needsCategoryTitle}>Needs Fillings:</Text>
                              {needsData.needsFillings.map((need, idx) => (
                                <Text key={idx} style={styles.needsText}>• {need}</Text>
                              ))}
                            </View>
                          )}
                          
                          {needsData.needsCrowns.length > 0 && (
                            <View style={styles.needsCategory}>
                              <Text style={styles.needsCategoryTitle}>Needs Crowns:</Text>
                              {needsData.needsCrowns.map((need, idx) => (
                                <Text key={idx} style={styles.needsText}>• {need}</Text>
                              ))}
                            </View>
                          )}
                          
                          {needsData.needsNewRootCanals.length > 0 && (
                            <View style={styles.needsCategory}>
                              <Text style={styles.needsCategoryTitle}>Needs Root Canals:</Text>
                              {needsData.needsNewRootCanals.map((need, idx) => (
                                <Text key={idx} style={styles.needsText}>• {need}</Text>
                              ))}
                            </View>
                          )}
                        </View>
                      )}

                      {/* Show office and clinician */}
                      <View style={styles.itemFooter}>
                        <Text style={styles.itemClinician}>
                          👤 {assessment.clinicianEmail}
                        </Text>
                        <Text style={styles.itemOffice}>
                          🏥 {assessment.officeName || 'Unknown Office'}
                        </Text>
                      </View>
                    </View>
                  );
                })
            )}
          </View>
        )}
      </View>

      {/* Treatments Section */}
      <View style={styles.sectionCard}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('treatments')}
        >
          <Text style={styles.sectionTitle}>
            🦷 Treatments ({treatments.length})
          </Text>
          <Text style={styles.expandIcon}>
            {expandedSections.treatments ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {expandedSections.treatments && (
          <View style={styles.sectionContent}>
            {treatments.length === 0 ? (
              <Text style={styles.emptyText}>No treatments recorded</Text>
            ) : (
              treatments
                .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
                .map((treatment) => {
                  const details = parseTreatmentDetails(treatment);
                  const treatmentValue = treatment.value * treatment.units;

                  return (
                    <View key={treatment.id} style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <View style={styles.itemHeaderLeft}>
                          <Text style={styles.itemType}>
                            {treatment.type.charAt(0).toUpperCase() + treatment.type.slice(1)}
                          </Text>
                          <Text style={styles.itemDate}>
                            {treatment.completedAt.toLocaleDateString()} at{' '}
                            {treatment.completedAt.toLocaleTimeString()}
                          </Text>
                        </View>

                        {/* Delete Button */}
                        <TouchableOpacity
                          style={[
                            styles.deleteButton,
                            deletingId === treatment.id && styles.deleteButtonDisabled
                          ]}
                          onPress={() => handleDeleteTreatment(treatment)}
                          disabled={deletingId === treatment.id}
                        >
                          {deletingId === treatment.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.deleteButtonText}>🗑️</Text>
                          )}
                        </TouchableOpacity>
                      </View>

                      <View style={styles.itemDetails}>
                        <View style={styles.treatmentBasics}>
                          <Text style={styles.treatmentBasicItem}>
                            Tooth: {treatment.tooth}
                          </Text>
                          {treatment.surface !== 'N/A' && (
                            <Text style={styles.treatmentBasicItem}>
                              Surface: {treatment.surface}
                            </Text>
                          )}
                          <Text style={styles.treatmentBasicItem}>
                            Units: {treatment.units}
                          </Text>
                        </View>

                        {details.length > 0 && (
                          <View style={styles.detailsList}>
                            {details.map((detail, index) => (
                              <Text key={index} style={styles.detailItem}>
                                • {detail}
                              </Text>
                            ))}
                          </View>
                        )}

                        <Text style={styles.treatmentValue}>
                          Value: ${treatmentValue.toFixed(2)}
                        </Text>
                      </View>

                      {/* Show office and clinician */}
                      <View style={styles.itemFooter}>
                        <Text style={styles.itemClinician}>
                          👤 {treatment.clinicianName}
                        </Text>
                        <Text style={styles.itemOffice}>
                          🏥 {treatment.officeName || 'Unknown Office'}
                        </Text>
                      </View>
                    </View>
                  );
                })
            )}
          </View>
        )}
      </View>

      {/* Footer spacer */}
      <View style={styles.footer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  placeholderPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  placeholderText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  patientDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  patientOffice: {
    fontSize: 13,
    color: '#007bff',
    fontWeight: '600',
    marginTop: 4,
  },
  patientDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statsCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  sectionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  expandIcon: {
    fontSize: 14,
    color: '#666',
  },
  sectionContent: {
    padding: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  itemCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemHeaderLeft: {
    flex: 1,
  },
  itemType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  // ✅ NEW: Badge for treatment needs
  needsBadge: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  needsBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  itemDate: {
    fontSize: 12,
    color: '#666',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
    minWidth: 36,
    alignItems: 'center',
  },
  deleteButtonDisabled: {
    backgroundColor: '#999',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  itemDetails: {
    marginBottom: 8,
  },
  itemSummary: {
    fontSize: 14,
    color: '#007bff',
    marginBottom: 8,
    fontWeight: '500',
  },
  detailsList: {
    marginTop: 4,
  },
  detailItem: {
    fontSize: 13,
    color: '#495057',
    marginBottom: 4,
  },
  // ✅ NEW: Needs section styles
  needsSection: {
    marginTop: 12,
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  divider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginBottom: 12,
  },
  needsSectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#e65100',
    marginBottom: 12,
  },
  needsCategory: {
    marginBottom: 8,
  },
  needsCategoryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f57c00',
    marginBottom: 4,
  },
  needsText: {
    fontSize: 11,
    color: '#5d4037',
    lineHeight: 16,
    marginBottom: 2,
    marginLeft: 8,
  },
  treatmentBasics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 12,
  },
  treatmentBasicItem: {
    fontSize: 13,
    color: '#495057',
    fontWeight: '500',
  },
  treatmentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#28a745',
    marginTop: 4,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  itemClinician: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  itemOffice: {
    fontSize: 11,
    color: '#007bff',
    fontWeight: '500',
  },
  footer: {
    height: 20,
  },
});

export default PatientDetailScreen;