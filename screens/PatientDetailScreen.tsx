// screens/PatientDetailScreen.tsx
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
  clinicianName: string;
  completedAt: Date;
}

interface Assessment {
  id: string;
  patientId: string;
  assessmentType: string;
  clinicianEmail: string;
  createdAt: Date;
}

const PatientDetailScreen = ({ route, navigation }: any) => {
  const { patient, treatments, assessments } = route.params as {
    patient: Patient;
    treatments: Treatment[];
    assessments: Assessment[];
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'assessments' | 'treatments'>('overview');

  // Calculate patient statistics
  const patientStats = useMemo(() => {
    const totalValue = treatments.reduce((sum, t) => sum + (t.value * t.units), 0);
    
    // Group treatments by type
    const treatmentsByType = treatments.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group assessments by type
    const assessmentsByType = assessments.reduce((acc, a) => {
      acc[a.assessmentType] = (acc[a.assessmentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get latest activity
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

  // Export patient data
  const exportPatientData = async () => {
    try {
      const patientInfo = `
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

ASSESSMENTS:
${assessments.map(a => 
  `- ${a.assessmentType} (${a.createdAt.toLocaleDateString()}) by ${a.clinicianEmail}`
).join('\n')}

TREATMENTS:
${treatments.map(t => 
  `- ${t.type} on tooth ${t.tooth} (${t.completedAt.toLocaleDateString()}) - $${(t.value * t.units).toFixed(2)} by ${t.clinicianName}`
).join('\n')}

Generated on: ${new Date().toLocaleString()}
      `;

      await Share.share({
        message: patientInfo,
        title: `Patient Report - ${patient.firstName} ${patient.lastName}`
      });
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export patient data');
    }
  };

  const renderOverview = () => (
    <View style={styles.tabContent}>
      {/* Patient Info Card */}
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

      {/* Statistics Grid */}
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

      {/* Treatment Breakdown */}
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

      {/* Assessment Breakdown */}
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
          .map((assessment) => (
            <View key={assessment.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemType}>
                  📋 {assessment.assessmentType.charAt(0).toUpperCase() + assessment.assessmentType.slice(1)} Assessment
                </Text>
                <Text style={styles.itemDate}>
                  {assessment.createdAt.toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.itemClinician}>
                Performed by: {assessment.clinicianEmail}
              </Text>
              <Text style={styles.itemTime}>
                {assessment.createdAt.toLocaleTimeString()}
              </Text>
            </View>
          ))
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
            let billingCodes = [];
            try {
              billingCodes = JSON.parse(treatment.billingCodes);
            } catch (e) {
              // Handle legacy format or parsing errors
            }

            return (
              <View key={treatment.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemType}>
                    🦷 {treatment.type.charAt(0).toUpperCase() + treatment.type.slice(1)} Treatment
                  </Text>
                  <Text style={styles.itemValue}>
                    ${(treatment.value * treatment.units).toFixed(2)}
                  </Text>
                </View>
                
                <View style={styles.treatmentDetails}>
                  <Text style={styles.treatmentInfo}>
                    Tooth: {treatment.tooth} • Surface: {treatment.surface} • Units: {treatment.units}
                  </Text>
                  <Text style={styles.itemClinician}>
                    Performed by: {treatment.clinicianName}
                  </Text>
                  <Text style={styles.itemDate}>
                    {treatment.completedAt.toLocaleDateString()} at {treatment.completedAt.toLocaleTimeString()}
                  </Text>
                </View>

                {billingCodes.length > 0 && (
                  <View style={styles.billingCodes}>
                    <Text style={styles.billingTitle}>Billing Codes:</Text>
                    {billingCodes.map((code: any, index: number) => (
                      <Text key={index} style={styles.billingCode}>
                        {typeof code === 'string' ? code : code.code || 'Unknown'}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            );
          })
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header with Export Button */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Patient Details</Text>
          <TouchableOpacity style={styles.exportButton} onPress={exportPatientData}>
            <Text style={styles.exportButtonText}>📤 Export</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'assessments', label: '📋 Assessments' },
          { key: 'treatments', label: '🦷 Treatments' }
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

      {/* Tab Content */}
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
    fontSize: 14,
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
    width: (width - 44) / 2, // Two cards per row with margins
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
  itemType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  itemDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  itemValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  itemClinician: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  itemTime: {
    fontSize: 12,
    color: '#999',
  },
  treatmentDetails: {
    marginBottom: 8,
  },
  treatmentInfo: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
  },
  billingCodes: {
    borderTopWidth: 1,
    borderTopColor: '#f8f9fa',
    paddingTop: 8,
  },
  billingTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  billingCode: {
    fontSize: 12,
    color: '#007bff',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 4,
  },
});

export default PatientDetailScreen;