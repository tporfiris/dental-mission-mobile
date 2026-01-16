// screens/ViewAssessmentScreen.tsx - UPDATED to show "Needs" data from Fillings assessments
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import { db as firebaseDb } from '../firebaseConfig';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import DentitionAssessment from '../db/models/DentitionAssessment';
import HygieneAssessment from '../db/models/HygieneAssessment';
import ExtractionsAssessment from '../db/models/ExtractionsAssessment';
import FillingsAssessment from '../db/models/FillingsAssessment';
import DentureAssessment from '../db/models/DentureAssessment';
import ImplantAssessment from '../db/models/ImplantAssessment';
import { parseAssessmentData } from '../utils/parseAssessmentData';

interface Office {
  id: string;
  name: string;
  location: string;
}

interface Assessment {
  id: string;
  type: string;
  emoji: string;
  data: string;
  createdAt: Date;
  updatedAt: Date;
  officeId?: string;
  officeName?: string;
  clinicianEmail?: string;
}

interface GroupedAssessment {
  date: string;
  assessments: Assessment[];
}

const ViewAssessmentScreen = ({ route }: any) => {
  const { patientId } = route.params;
  const db = useDatabase();
  const [loading, setLoading] = useState(true);
  const [groupedAssessments, setGroupedAssessments] = useState<GroupedAssessment[]>([]);
  const [expandedAssessment, setExpandedAssessment] = useState<string | null>(null);
  const [offices, setOffices] = useState<Map<string, Office>>(new Map());

  // Load offices from Firestore
  const loadOffices = async (): Promise<Map<string, Office>> => {
    try {
      const officesSnapshot = await getDocs(collection(firebaseDb, 'offices'));
      const officesMap = new Map<string, Office>();
      
      officesSnapshot.forEach((doc) => {
        officesMap.set(doc.id, {
          id: doc.id,
          name: doc.data().name,
          location: doc.data().location
        });
      });
      
      console.log('Loaded ' + officesMap.size + ' offices for assessment view');
      return officesMap;
    } catch (error) {
      console.error('Error loading offices:', error);
      return new Map();
    }
  };

  // Load assessment office info from Firestore
  const loadAssessmentOfficeInfo = async (assessmentId: string, officesMap: Map<string, Office>) => {
    try {
      const assessmentDoc = await getDoc(doc(firebaseDb, 'assessments', assessmentId));
      if (assessmentDoc.exists()) {
        const data = assessmentDoc.data();
        const officeId = data.officeId || 'unknown';
        const office = officesMap.get(officeId);
        
        return {
          officeId,
          officeName: office?.name || (officeId === 'legacy' ? 'Legacy' : 'Unknown Office'),
          clinicianEmail: data.clinicianEmail || 'Unknown'
        };
      }
    } catch (error) {
      // Silent fail - assessment not synced yet
    }
    return { officeId: 'local', officeName: 'Not synced yet', clinicianEmail: 'Unknown' };
  };

  useEffect(() => {
    const loadAssessments = async () => {
      try {
        console.log('Loading assessments for patient:', patientId);

        // Load offices first
        const officesMap = await loadOffices();
        setOffices(officesMap);

        const [dentition, hygiene, extractions, fillings, denture, implant] = await Promise.all([
          db.get<DentitionAssessment>('dentition_assessments').query(Q.where('patient_id', Q.eq(patientId))).fetch(),
          db.get<HygieneAssessment>('hygiene_assessments').query(Q.where('patient_id', Q.eq(patientId))).fetch(),
          db.get<ExtractionsAssessment>('extractions_assessments').query(Q.where('patient_id', Q.eq(patientId))).fetch(),
          db.get<FillingsAssessment>('fillings_assessments').query(Q.where('patient_id', Q.eq(patientId))).fetch(),
          db.get<DentureAssessment>('denture_assessments').query(Q.where('patient_id', Q.eq(patientId))).fetch(),
          db.get<ImplantAssessment>('implant_assessments').query(Q.where('patient_id', Q.eq(patientId))).fetch(),
        ]);

        // Combine all assessments with their types and load office info
        const allAssessmentsPromises = [
          ...dentition.map(async a => {
            const officeInfo = await loadAssessmentOfficeInfo(a.id, officesMap);
            return { 
              id: a.id, 
              type: 'Dentition', 
              emoji: '🦷', 
              data: a.data, 
              createdAt: a.createdAt,
              updatedAt: a.updatedAt,
              ...officeInfo
            };
          }),
          ...hygiene.map(async a => {
            const officeInfo = await loadAssessmentOfficeInfo(a.id, officesMap);
            return { 
              id: a.id, 
              type: 'Hygiene', 
              emoji: '🪥', 
              data: a.data, 
              createdAt: a.createdAt,
              updatedAt: a.updatedAt,
              ...officeInfo
            };
          }),
          ...extractions.map(async a => {
            const officeInfo = await loadAssessmentOfficeInfo(a.id, officesMap);
            return { 
              id: a.id, 
              type: 'Extractions', 
              emoji: '🛠️', 
              data: a.data, 
              createdAt: a.createdAt,
              updatedAt: a.updatedAt,
              ...officeInfo
            };
          }),
          ...fillings.map(async a => {
            const officeInfo = await loadAssessmentOfficeInfo(a.id, officesMap);
            return { 
              id: a.id, 
              type: 'Fillings', 
              emoji: '🧱', 
              data: a.data, 
              createdAt: a.createdAt,
              updatedAt: a.updatedAt,
              ...officeInfo
            };
          }),
          ...denture.map(async a => {
            const officeInfo = await loadAssessmentOfficeInfo(a.id, officesMap);
            return { 
              id: a.id, 
              type: 'Denture', 
              emoji: '🦷', 
              data: a.data, 
              createdAt: a.createdAt,
              updatedAt: a.updatedAt,
              ...officeInfo
            };
          }),
          ...implant.map(async a => {
            const officeInfo = await loadAssessmentOfficeInfo(a.id, officesMap);
            return { 
              id: a.id, 
              type: 'Implant', 
              emoji: '🧲', 
              data: a.data, 
              createdAt: a.createdAt,
              updatedAt: a.updatedAt,
              ...officeInfo
            };
          }),
        ];

        const allAssessments = await Promise.all(allAssessmentsPromises);

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
        console.log('Assessments loaded and grouped by date');
      } catch (err) {
        console.error('Failed to load assessments:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAssessments();
  }, [patientId]);

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  const toggleExpansion = (id: string) => {
    setExpandedAssessment(expandedAssessment === id ? null : id);
  };

  const renderAssessmentCard = (assessment: Assessment) => {
    const parsedData = parseAssessmentData(assessment.data, assessment.type.toLowerCase());
    const isExpanded = expandedAssessment === assessment.id;

    // Extract "Needs" data for Fillings assessments
    let needsData = null;
    if (assessment.type === 'Fillings') {
      try {
        const assessmentJson = JSON.parse(assessment.data);
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
            {needsData && (
              <View style={styles.needsBadge}>
                <Text style={styles.needsBadgeText}>⚠️ Treatment Needs</Text>
              </View>
            )}
            <Text style={styles.assessmentTime}>
              {assessment.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
        </View>
        
        {isExpanded && (
          <>
            <View style={styles.detailsContainer}>
              <View style={styles.divider} />
              <Text style={styles.detailsTitle}>Assessment Details:</Text>
              {parsedData.details.map((detail, index) => (
                <Text key={index} style={styles.detailText}>{detail}</Text>
              ))}
            </View>

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

            <View style={styles.assessmentFooter}>
              <Text style={styles.assessmentClinician}>
                👤 {assessment.clinicianEmail || 'Unknown'}
              </Text>
              <Text style={styles.assessmentOffice}>
                🏥 {assessment.officeName || 'Not synced'}
              </Text>
            </View>
          </>
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
  needsBadge: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginVertical: 6,
  },
  needsBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
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
  needsSection: {
    marginTop: 12,
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  needsSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e65100',
    marginBottom: 12,
  },
  needsCategory: {
    marginBottom: 8,
  },
  needsCategoryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f57c00',
    marginBottom: 4,
  },
  needsText: {
    fontSize: 12,
    color: '#5d4037',
    lineHeight: 18,
    marginBottom: 2,
    marginLeft: 8,
  },
  assessmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  assessmentClinician: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  assessmentOffice: {
    fontSize: 11,
    color: '#007bff',
    fontWeight: '500',
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
  assessmentTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});