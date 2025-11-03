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
import { parseAssessmentData } from '../utils/parseAssessmentData';

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
  assessmentTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});