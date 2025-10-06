// screens/PatientListScreen.tsx - Enhanced with assessment/treatment previews
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions
} from 'react-native';
import { db } from '../firebaseConfig';
import { 
  collection, 
  getDocs, 
  orderBy, 
  query 
} from 'firebase/firestore';

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

const PatientListScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Helper function to safely convert Firestore timestamps to Date
  const safeToDate = (timestamp: any): Date => {
    if (!timestamp) return new Date();
    if (timestamp instanceof Date) return timestamp;
    if (timestamp && typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (typeof timestamp === 'string') {
      const parsed = new Date(timestamp);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    if (typeof timestamp === 'number') return new Date(timestamp);
    return new Date();
  };

  // Get detailed quick summary for assessment with tooth numbers
  const getAssessmentSummary = (assessment: Assessment): string => {
    try {
      const data = JSON.parse(assessment.data);
      
      switch (assessment.assessmentType) {
        case 'dentition':
          if (data.originalToothStates) {
            const missing = Object.entries(data.originalToothStates).filter(([_, s]: any) => s === 'fully-missing');
            const crownMissing = Object.entries(data.originalToothStates).filter(([_, s]: any) => s === 'crown-missing');
            if (missing.length > 0) {
              const teeth = missing.slice(0, 3).map(([t]) => t).join(', ');
              const more = missing.length > 3 ? `, +${missing.length - 3} more` : '';
              return `Missing: ${teeth}${more}`;
            }
            if (crownMissing.length > 0) {
              return `${crownMissing.length} crown missing`;
            }
            return 'All teeth present';
          }
          return 'Dentition assessed';
          
        case 'hygiene':
          if (data.enhancedAssessment) {
            const calculus = data.enhancedAssessment.calculusLevel || 'none';
            const plaque = data.enhancedAssessment.plaqueLevel || 'none';
            const aap = data.enhancedAssessment.aapStage ? ` (AAP ${data.enhancedAssessment.aapStage})` : '';
            return `${calculus} calculus, ${plaque} plaque${aap}`;
          }
          return 'Hygiene assessed';
          
        case 'extractions':
          const extractions = Object.entries(data.extractionStates || data).filter(([_, s]: any) => s !== 'none');
          if (extractions.length > 0) {
            const teeth = extractions.slice(0, 4).map(([t]) => t).join(', ');
            const more = extractions.length > 4 ? `, +${extractions.length - 4}` : '';
            return `Extract: ${teeth}${more}`;
          }
          return 'No extractions needed';
          
        case 'fillings':
          if (data.originalTeethStates) {
            const cavities = Object.entries(data.originalTeethStates).filter(([_, t]: any) => 
              t.hasCavities && t.cavitySurfaces && t.cavitySurfaces.length > 0
            );
            const rct = Object.entries(data.originalTeethStates).filter(([_, t]: any) => t.needsRootCanal);
            
            if (cavities.length > 0 || rct.length > 0) {
              const parts = [];
              if (cavities.length > 0) {
                const teeth = cavities.slice(0, 3).map(([t, s]: any) => `${t}(${s.cavitySurfaces.join('')})`).join(', ');
                const more = cavities.length > 3 ? `, +${cavities.length - 3}` : '';
                parts.push(`Cavities: ${teeth}${more}`);
              }
              if (rct.length > 0) {
                parts.push(`${rct.length} RCT needed`);
              }
              return parts.join(' • ');
            }
            return 'No cavities found';
          }
          return 'Restorative assessed';
          
        case 'denture':
          const type = data.selectedDentureType;
          if (type && type !== 'none') {
            return type.replace(/-/g, ' ');
          }
          return 'No denture needed';
          
        case 'implant':
          const single = data.singleImplantTeeth || [];
          const bridge = data.bridgeImplantTeeth || [];
          if (single.length > 0 || bridge.length > 0) {
            const parts = [];
            if (single.length > 0) {
              const teeth = single.slice(0, 3).join(', ');
              const more = single.length > 3 ? `, +${single.length - 3}` : '';
              parts.push(`Single: ${teeth}${more}`);
            }
            if (bridge.length > 0) {
              parts.push(`Bridge: ${bridge.length} teeth`);
            }
            return parts.join(' • ');
          }
          return 'No implants planned';
          
        default:
          return 'Assessed';
      }
    } catch (e) {
      return 'Assessed';
    }
  };

  // Get quick summary for treatment
  const getTreatmentSummary = (treatment: Treatment): string => {
    switch (treatment.type) {
      case 'hygiene':
        return `${treatment.units} units`;
      case 'extraction':
        return `Tooth ${treatment.tooth}`;
      case 'filling':
        return `Tooth ${treatment.tooth} (${treatment.surface})`;
      case 'denture':
        return 'Denture placed';
      case 'implant':
      case 'implant-crown':
        return `Tooth ${treatment.tooth}`;
      default:
        return `${treatment.units} units`;
    }
  };

  // Load data from Firestore
  const loadPatientData = async () => {
    try {
      console.log('👥 Loading patient data from Firestore...');

      // Load patients with ordering
      const patientsQuery = query(collection(db, 'patients'), orderBy('createdAt', 'desc'));
      const patientsSnapshot = await getDocs(patientsQuery);
      const patientsData = patientsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          firstName: data.firstName || 'Unknown',
          lastName: data.lastName || 'Patient',
          age: data.age || 0,
          gender: data.gender || 'Unknown',
          location: data.location || 'Unknown',
          photoUri: data.photoUri || '',
          createdAt: safeToDate(data.createdAt || data.syncedAt)
        };
      });

      // Load treatments
      const treatmentsSnapshot = await getDocs(collection(db, 'treatments'));
      const treatmentsData = treatmentsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          patientId: data.patientId || '',
          type: data.type || 'unknown',
          tooth: data.tooth || 'N/A',
          surface: data.surface || 'N/A',
          units: data.units || 1,
          value: data.value || 0,
          billingCodes: data.billingCodes || '[]',
          notes: data.notes || '',
          clinicianName: data.clinicianName || 'Unknown',
          completedAt: safeToDate(data.completedAt || data.createdAt || data.syncedAt)
        };
      });

      // Load assessments
      const assessmentsSnapshot = await getDocs(collection(db, 'assessments'));
      const assessmentsData = assessmentsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          patientId: data.patientId || '',
          assessmentType: data.assessmentType || 'unknown',
          data: data.data || '{}',
          clinicianEmail: data.clinicianEmail || 'Unknown',
          createdAt: safeToDate(data.createdAt || data.syncedAt)
        };
      });

      setPatients(patientsData);
      setTreatments(treatmentsData);
      setAssessments(assessmentsData);

      console.log('✅ Patient data loaded:', {
        patients: patientsData.length,
        treatments: treatmentsData.length,
        assessments: assessmentsData.length
      });

    } catch (error) {
      console.error('❌ Error loading patient data:', error);
      Alert.alert(
        'Error Loading Data', 
        `Failed to load patient data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [
          { text: 'Retry', onPress: () => loadPatientData() },
          { text: 'OK' }
        ]
      );
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await loadPatientData();
      setLoading(false);
    };
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPatientData();
    setRefreshing(false);
  };

  // Filter patients based on search query
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    
    const query = searchQuery.toLowerCase().trim();
    return patients.filter(patient => 
      patient.firstName.toLowerCase().includes(query) ||
      patient.lastName.toLowerCase().includes(query) ||
      patient.location.toLowerCase().includes(query) ||
      `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(query)
    );
  }, [patients, searchQuery]);

  // Get patient statistics with recent activity details
  const getPatientStats = (patientId: string) => {
    const patientTreatments = treatments.filter(t => t.patientId === patientId);
    const patientAssessments = assessments.filter(a => a.patientId === patientId);
    const totalValue = patientTreatments.reduce((sum, t) => sum + (t.value * t.units), 0);
    
    // Get most recent assessment and treatment with details
    const latestAssessment = patientAssessments.length > 0 
      ? patientAssessments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
      : null;
      
    const latestTreatment = patientTreatments.length > 0 
      ? patientTreatments.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())[0]
      : null;
    
    return {
      treatmentCount: patientTreatments.length,
      assessmentCount: patientAssessments.length,
      totalValue,
      latestTreatment,
      latestAssessment,
      latestAssessmentSummary: latestAssessment ? getAssessmentSummary(latestAssessment) : null,
      latestTreatmentSummary: latestTreatment ? getTreatmentSummary(latestTreatment) : null,
    };
  };

  const navigateToPatientDetail = (patient: Patient) => {
    navigation.navigate('PatientDetail', { 
      patient,
      treatments: treatments.filter(t => t.patientId === patient.id),
      assessments: assessments.filter(a => a.patientId === patient.id)
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading patients...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👥 Patient Directory</Text>
        <Text style={styles.headerSubtitle}>
          {filteredPatients.length} of {patients.length} patients
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search by name or location..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Patient List */}
      <ScrollView 
        style={styles.patientList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredPatients.length === 0 ? (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>
              {searchQuery ? 'No patients found matching your search' : 'No patients found'}
            </Text>
            {searchQuery && (
              <TouchableOpacity 
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearSearchButtonText}>Clear Search</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredPatients.map((patient) => {
            const stats = getPatientStats(patient.id);
            
            return (
              <TouchableOpacity
                key={patient.id}
                style={styles.patientCard}
                onPress={() => navigateToPatientDetail(patient)}
              >
                <View style={styles.patientCardContent}>
                  {/* Patient Photo */}
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

                  {/* Patient Info */}
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>
                      {patient.firstName} {patient.lastName}
                    </Text>
                    <Text style={styles.patientDetails}>
                      {patient.age} years • {patient.gender} • {patient.location}
                    </Text>
                    <Text style={styles.patientDate}>
                      Registered: {patient.createdAt.toLocaleDateString()}
                    </Text>
                  </View>

                  {/* Patient Stats */}
                  <View style={styles.patientStats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{stats.assessmentCount}</Text>
                      <Text style={styles.statLabel}>Assess</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{stats.treatmentCount}</Text>
                      <Text style={styles.statLabel}>Treat</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>${stats.totalValue.toFixed(0)}</Text>
                      <Text style={styles.statLabel}>Value</Text>
                    </View>
                  </View>
                </View>

                {/* Recent Activity Details */}
                <View style={styles.recentActivity}>
                  {stats.latestAssessment && (
                    <View style={styles.activityItem}>
                      <Text style={styles.activityType}>
                        📋 {stats.latestAssessment.assessmentType.charAt(0).toUpperCase() + stats.latestAssessment.assessmentType.slice(1)}
                      </Text>
                      <Text style={styles.activitySummary}>
                        {stats.latestAssessmentSummary}
                      </Text>
                      <Text style={styles.activityDate}>
                        {stats.latestAssessment.createdAt.toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                  
                  {stats.latestTreatment && (
                    <View style={styles.activityItem}>
                      <Text style={styles.activityType}>
                        🦷 {stats.latestTreatment.type.charAt(0).toUpperCase() + stats.latestTreatment.type.slice(1)}
                      </Text>
                      <Text style={styles.activitySummary}>
                        {stats.latestTreatmentSummary} • ${(stats.latestTreatment.value * stats.latestTreatment.units).toFixed(0)}
                      </Text>
                      <Text style={styles.activityDate}>
                        {stats.latestTreatment.completedAt.toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                  
                  {!stats.latestAssessment && !stats.latestTreatment && (
                    <Text style={styles.noActivityText}>No assessments or treatments yet</Text>
                  )}
                </View>

                {/* Arrow indicator */}
                <View style={styles.arrowIndicator}>
                  <Text style={styles.arrow}>›</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

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
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  clearButton: {
    marginLeft: 8,
    padding: 8,
    backgroundColor: '#6c757d',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
    height: 32,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  patientList: {
    flex: 1,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  clearSearchButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearSearchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  patientCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  patientCardContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  photoContainer: {
    marginRight: 16,
  },
  patientPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  placeholderPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  patientInfo: {
    flex: 1,
    marginRight: 12,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  patientDetails: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  patientDate: {
    fontSize: 11,
    color: '#999',
  },
  patientStats: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  recentActivity: {
    borderTopWidth: 1,
    borderTopColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
  },
  activityItem: {
    marginBottom: 8,
  },
  activityType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  activitySummary: {
    fontSize: 12,
    color: '#007bff',
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 11,
    color: '#999',
  },
  noActivityText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  arrowIndicator: {
    position: 'absolute',
    right: 16,
    top: '35%',
  },
  arrow: {
    fontSize: 24,
    color: '#ccc',
    fontWeight: 'bold',
  },
});

export default PatientListScreen;