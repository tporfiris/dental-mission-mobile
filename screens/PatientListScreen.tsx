// screens/PatientListScreen.tsx - UPDATED with office and clinician tracking
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
  Dimensions
} from 'react-native';
import { db } from '../firebaseConfig';
import { 
  collection, 
  getDocs, 
  orderBy, 
  query,
  doc,
  getDoc
} from 'firebase/firestore';
import { parseAssessmentData, parseTreatmentDetails } from '../utils/parseAssessmentData';
import { SmartImage } from '../components/SmartImage';

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

interface Office {
  id: string;
  name: string;
  location: string;
}

const PatientListScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [offices, setOffices] = useState<Map<string, Office>>(new Map());
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

  // Load offices data
  const loadOffices = async (): Promise<Map<string, Office>> => {
    try {
      const officesSnapshot = await getDocs(collection(db, 'offices'));
      const officesMap = new Map<string, Office>();
      
      officesSnapshot.forEach((doc) => {
        officesMap.set(doc.id, {
          id: doc.id,
          name: doc.data().name,
          location: doc.data().location
        });
      });
      
      console.log(`✅ Loaded ${officesMap.size} offices`);
      return officesMap;
    } catch (error) {
      console.error('❌ Error loading offices:', error);
      return new Map();
    }
  };

  // Get office name by ID
  const getOfficeName = (officeId?: string): string => {
    if (!officeId) return 'Unknown Office';
    const office = offices.get(officeId);
    return office ? office.name : officeId === 'legacy' ? 'Legacy' : 'Unknown Office';
  };

  // Get detailed quick summary for assessment
  const getAssessmentSummary = (assessment: Assessment): string => {
    try {
      const dataObj = typeof assessment.data === 'string' 
        ? JSON.parse(assessment.data) 
        : assessment.data;
      
      const parsed = parseAssessmentData(dataObj, assessment.assessmentType);
      return parsed.summary;
    } catch (e) {
      console.error('Error parsing assessment summary:', e);
      return 'Assessment completed';
    }
  };

  // Get quick summary for treatment
  const getTreatmentSummary = (treatment: Treatment): string => {
    try {
      const details = parseTreatmentDetails(treatment);
      return details.slice(0, 2).join(' • ');
    } catch (e) {
      console.error('Error parsing treatment summary:', e);
      return `${treatment.type} treatment`;
    }
  };

  // Load data from Firestore
  const loadPatientData = async () => {
    try {
      console.log('👥 Loading patient data from Firestore...');

      // Load offices first
      const officesMap = await loadOffices();
      setOffices(officesMap);

      // Load patients with ordering
      const patientsQuery = query(collection(db, 'patients'), orderBy('createdAt', 'desc'));
      const patientsSnapshot = await getDocs(patientsQuery);
      const patientsData = patientsSnapshot.docs.map(doc => {
        const data = doc.data();
        const officeId = data.officeId || 'unknown';
        
        return {
          id: doc.id,
          firstName: data.firstName || 'Unknown',
          lastName: data.lastName || 'Patient',
          age: data.age || 0,
          gender: data.gender || 'Unknown',
          location: data.location || 'Unknown',
          photoUri: data.photoUri || '',
          photoCloudUri: data.photoCloudUri || '',
          createdAt: safeToDate(data.createdAt || data.syncedAt),
          officeId: officeId,
          officeName: officesMap.get(officeId)?.name || (officeId === 'legacy' ? 'Legacy' : 'Unknown'),
          registeredBy: data.registeredBy || 'Unknown'
        };
      });

      // Load treatments
      const treatmentsSnapshot = await getDocs(collection(db, 'treatments'));
      const treatmentsData = treatmentsSnapshot.docs.map(doc => {
        const data = doc.data();
        const officeId = data.officeId || 'unknown';
        
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
          completedAt: safeToDate(data.completedAt || data.createdAt || data.syncedAt),
          officeId: officeId,
          officeName: officesMap.get(officeId)?.name || (officeId === 'legacy' ? 'Legacy' : 'Unknown'),
          performedBy: data.performedBy || 'Unknown'
        };
      });

      // Load assessments
      const assessmentsSnapshot = await getDocs(collection(db, 'assessments'));
      const assessmentsData = assessmentsSnapshot.docs.map(doc => {
        const data = doc.data();
        const officeId = data.officeId || 'unknown';
        
        return {
          id: doc.id,
          patientId: data.patientId || '',
          assessmentType: data.assessmentType || 'unknown',
          data: data.data || '{}',
          clinicianEmail: data.clinicianEmail || 'Unknown',
          createdAt: safeToDate(data.createdAt || data.syncedAt),
          officeId: officeId,
          officeName: officesMap.get(officeId)?.name || (officeId === 'legacy' ? 'Legacy' : 'Unknown'),
          clinicianId: data.clinicianId || 'Unknown'
        };
      });

      setPatients(patientsData);
      setTreatments(treatmentsData);
      setAssessments(assessmentsData);

      console.log('✅ Patient data loaded:', {
        patients: patientsData.length,
        treatments: treatmentsData.length,
        assessments: assessmentsData.length,
        offices: officesMap.size
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
      patient.officeName?.toLowerCase().includes(query) ||
      `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(query)
    );
  }, [patients, searchQuery]);

  // Get patient statistics with recent activity details
  const getPatientStats = (patientId: string) => {
    const patientTreatments = treatments.filter(t => t.patientId === patientId);
    const patientAssessments = assessments.filter(a => a.patientId === patientId);
    const totalValue = patientTreatments.reduce((sum, t) => sum + (t.value * t.units), 0);
    
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
          placeholder="🔍 Search by name, location, or office..."
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
                      <SmartImage
                        localUri={patient.photoUri}
                        cloudUri={patient.photoCloudUri}
                        placeholderInitials={`${patient.firstName.charAt(0)}${patient.lastName.charAt(0)}`}
                        style={styles.patientPhoto}
                      />
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
                    {/* ✅ NEW: Show office info */}
                    <Text style={styles.patientOffice}>
                      🏥 {patient.officeName || 'Unknown Office'}
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
                      <View style={styles.activityHeader}>
                        <Text style={styles.activityType}>
                          📋 {stats.latestAssessment.assessmentType.charAt(0).toUpperCase() + stats.latestAssessment.assessmentType.slice(1)}
                        </Text>
                        {/* ✅ NEW: Show office for assessment */}
                        <Text style={styles.activityOffice}>
                          {stats.latestAssessment.officeName}
                        </Text>
                      </View>
                      <Text style={styles.activitySummary}>
                        {stats.latestAssessmentSummary}
                      </Text>
                      <Text style={styles.activityDate}>
                        {stats.latestAssessment.createdAt.toLocaleDateString()} • {stats.latestAssessment.clinicianEmail}
                      </Text>
                    </View>
                  )}
                  
                  {stats.latestTreatment && (
                    <View style={styles.activityItem}>
                      <View style={styles.activityHeader}>
                        <Text style={styles.activityType}>
                          🦷 {stats.latestTreatment.type.charAt(0).toUpperCase() + stats.latestTreatment.type.slice(1)}
                        </Text>
                        {/* ✅ NEW: Show office for treatment */}
                        <Text style={styles.activityOffice}>
                          {stats.latestTreatment.officeName}
                        </Text>
                      </View>
                      <Text style={styles.activitySummary}>
                        {stats.latestTreatmentSummary} • ${(stats.latestTreatment.value * stats.latestTreatment.units).toFixed(0)}
                      </Text>
                      <Text style={styles.activityDate}>
                        {stats.latestTreatment.completedAt.toLocaleDateString()} • {stats.latestTreatment.clinicianName}
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
  patientOffice: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '600',
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
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  activityType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  activityOffice: {
    fontSize: 11,
    color: '#6c757d',
    fontWeight: '500',
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