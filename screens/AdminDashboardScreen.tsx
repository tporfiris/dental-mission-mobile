// screens/AdminDashboardScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Share,
  Dimensions
} from 'react-native';
import { db } from '../firebaseConfig';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';

const { width } = Dimensions.get('window');

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  location: string;
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

interface DashboardFilters {
  dateRange: 'day' | 'week' | 'month' | 'all';
  location: string;
  currency: 'USD' | 'CAD';
}

const AdminDashboardScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: 'week',
    location: 'all',
    currency: 'USD'
  });

  // Get unique locations from patients
  const locations = useMemo(() => {
    const uniqueLocations = [...new Set(patients.map(p => p.location))];
    return ['all', ...uniqueLocations];
  }, [patients]);

  // Helper function to safely convert Firestore timestamps to Date
  const safeToDate = (timestamp: any): Date => {
    if (!timestamp) {
      return new Date(); // Default to current date if no timestamp
    }
    
    // If it's already a Date object
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    // If it's a Firestore Timestamp with toDate method
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    // If it's a string, try to parse it
    if (typeof timestamp === 'string') {
      const parsed = new Date(timestamp);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    
    // If it's a number (Unix timestamp)
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    
    // Default fallback
    return new Date();
  };

  // Load data from Firestore
  const loadDashboardData = async () => {
    try {
      console.log('📊 Loading dashboard data from Firestore...');

      // Load patients
      const patientsSnapshot = await getDocs(collection(db, 'patients'));
      const patientsData = patientsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          firstName: data.firstName || 'Unknown',
          lastName: data.lastName || 'Patient',
          age: data.age || 0,
          gender: data.gender || 'Unknown',
          location: data.location || 'Unknown',
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
          clinicianEmail: data.clinicianEmail || 'Unknown',
          createdAt: safeToDate(data.createdAt || data.syncedAt)
        };
      });

      setPatients(patientsData);
      setTreatments(treatmentsData);
      setAssessments(assessmentsData);

      console.log('✅ Dashboard data loaded successfully:', {
        patients: patientsData.length,
        treatments: treatmentsData.length,
        assessments: assessmentsData.length
      });

      // Log sample data for debugging
      if (patientsData.length > 0) {
        console.log('📋 Sample patient data:', {
          id: patientsData[0].id,
          name: `${patientsData[0].firstName} ${patientsData[0].lastName}`,
          location: patientsData[0].location,
          createdAt: patientsData[0].createdAt.toISOString()
        });
      }

      if (treatmentsData.length > 0) {
        console.log('📋 Sample treatment data:', {
          id: treatmentsData[0].id,
          type: treatmentsData[0].type,
          value: treatmentsData[0].value,
          completedAt: treatmentsData[0].completedAt.toISOString()
        });
      }

    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      
      // More detailed error logging
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      Alert.alert(
        'Error Loading Data', 
        `Failed to load dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your internet connection and try again.`,
        [
          { text: 'Retry', onPress: () => loadDashboardData() },
          { text: 'OK' }
        ]
      );
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await loadDashboardData();
      setLoading(false);
    };
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // Filter data based on selected filters
  const filteredData = useMemo(() => {
    const now = new Date();
    let dateThreshold: Date;
    
    switch (filters.dateRange) {
      case 'day':
        dateThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateThreshold = new Date(0);
    }

    const filteredPatients = patients.filter(p => 
      p.createdAt >= dateThreshold && 
      (filters.location === 'all' || p.location === filters.location)
    );

    const patientIds = new Set(filteredPatients.map(p => p.id));
    
    const filteredTreatments = treatments.filter(t => 
      patientIds.has(t.patientId) && t.completedAt >= dateThreshold
    );

    const filteredAssessments = assessments.filter(a => 
      patientIds.has(a.patientId) && a.createdAt >= dateThreshold
    );

    return { 
      patients: filteredPatients, 
      treatments: filteredTreatments, 
      assessments: filteredAssessments 
    };
  }, [patients, treatments, assessments, filters]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const currencyMultiplier = filters.currency === 'CAD' ? 1.35 : 1;
    
    const totalPatients = filteredData.patients.length;
    const totalProcedures = filteredData.treatments.length;
    const totalValue = filteredData.treatments.reduce((sum, t) => sum + (t.value * t.units), 0) * currencyMultiplier;
    
    // Procedure breakdown
    const procedureBreakdown = filteredData.treatments.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Location breakdown
    const locationBreakdown = filteredData.patients.reduce((acc, p) => {
      acc[p.location] = (acc[p.location] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPatients,
      totalProcedures,
      totalValue: Math.round(totalValue),
      procedureBreakdown,
      locationBreakdown,
      avgValuePerPatient: totalPatients > 0 ? Math.round(totalValue / totalPatients) : 0
    };
  }, [filteredData, filters.currency]);

  // Export data function
  const exportData = async () => {
    try {
      const csvData = [
        'Patient ID,Patient Name,Location,Procedure Type,Tooth,Value,Date,Clinician',
        ...filteredData.treatments.map(t => {
          const patient = patients.find(p => p.id === t.patientId);
          const value = (t.value * t.units * (filters.currency === 'CAD' ? 1.35 : 1)).toFixed(2);
          return [
            t.patientId,
            patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
            patient?.location || 'Unknown',
            t.type,
            t.tooth,
            `${filters.currency} ${value}`,
            t.completedAt.toLocaleDateString(),
            t.clinicianName
          ].join(',');
        })
      ].join('\n');

      await Share.share({
        message: csvData,
        title: `Dental Mission Data - ${new Date().toLocaleDateString()}`
      });
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export data');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading dashboard data...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 Mission Dashboard</Text>
        <Text style={styles.headerSubtitle}>Real-time analytics and insights</Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersCard}>
        <Text style={styles.filtersTitle}>Filters</Text>
        
        {/* Time Period Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>📅 Time Period</Text>
          <View style={styles.buttonRow}>
            {[
              { value: 'day', label: '24h' },
              { value: 'week', label: '7d' },
              { value: 'month', label: '30d' },
              { value: 'all', label: 'All' }
            ].map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterButton,
                  filters.dateRange === option.value && styles.filterButtonActive
                ]}
                onPress={() => setFilters(prev => ({ ...prev, dateRange: option.value as any }))}
              >
                <Text style={[
                  styles.filterButtonText,
                  filters.dateRange === option.value && styles.filterButtonTextActive
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Location Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>📍 Location</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            <View style={styles.buttonRow}>
              {locations.map(location => (
                <TouchableOpacity
                  key={location}
                  style={[
                    styles.filterButton,
                    styles.locationButton,
                    filters.location === location && styles.filterButtonActive
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, location }))}
                >
                  <Text style={[
                    styles.filterButtonText,
                    filters.location === location && styles.filterButtonTextActive
                  ]}>
                    {location === 'all' ? 'All' : location}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Currency Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>💰 Currency</Text>
          <View style={styles.buttonRow}>
            {[
              { value: 'USD', label: 'USD ($)' },
              { value: 'CAD', label: 'CAD ($)' }
            ].map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterButton,
                  styles.currencyButton,
                  filters.currency === option.value && styles.filterButtonActive
                ]}
                onPress={() => setFilters(prev => ({ ...prev, currency: option.value as any }))}
              >
                <Text style={[
                  styles.filterButtonText,
                  filters.currency === option.value && styles.filterButtonTextActive
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{kpis.totalPatients.toLocaleString()}</Text>
          <Text style={styles.kpiLabel}>👥 Total Patients</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{kpis.totalProcedures.toLocaleString()}</Text>
          <Text style={styles.kpiLabel}>🏥 Total Procedures</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>
            {filters.currency} {kpis.totalValue.toLocaleString()}
          </Text>
          <Text style={styles.kpiLabel}>💰 Total Value</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>
            {filters.currency} {kpis.avgValuePerPatient.toLocaleString()}
          </Text>
          <Text style={styles.kpiLabel}>📊 Avg/Patient</Text>
        </View>
      </View>

      {/* Procedure Breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🦷 Procedure Breakdown</Text>
        {Object.entries(kpis.procedureBreakdown).length === 0 ? (
          <Text style={styles.noDataText}>No procedures found for selected filters</Text>
        ) : (
          Object.entries(kpis.procedureBreakdown).map(([procedure, count]) => {
            const percentage = ((count / kpis.totalProcedures) * 100).toFixed(1);
            return (
              <View key={procedure} style={styles.procedureRow}>
                <View style={styles.procedureInfo}>
                  <Text style={styles.procedureName}>
                    {procedure.charAt(0).toUpperCase() + procedure.slice(1)}
                  </Text>
                  <Text style={styles.procedureCount}>{count} procedures</Text>
                </View>
                <Text style={styles.procedurePercentage}>{percentage}%</Text>
              </View>
            );
          })
        )}
      </View>

      {/* Location Breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌍 Location Performance</Text>
        {Object.entries(kpis.locationBreakdown).length === 0 ? (
          <Text style={styles.noDataText}>No location data found</Text>
        ) : (
          Object.entries(kpis.locationBreakdown).map(([location, patientCount]) => {
            const locationTreatments = filteredData.treatments.filter(t => {
              const patient = patients.find(p => p.id === t.patientId);
              return patient?.location === location;
            }).length;

            const locationValue = filteredData.treatments
              .filter(t => {
                const patient = patients.find(p => p.id === t.patientId);
                return patient?.location === location;
              })
              .reduce((sum, t) => sum + (t.value * t.units), 0) * (filters.currency === 'CAD' ? 1.35 : 1);

            return (
              <View key={location} style={styles.locationRow}>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationName}>{location}</Text>
                  <Text style={styles.locationStats}>
                    {patientCount} patients • {locationTreatments} procedures
                  </Text>
                </View>
                <Text style={styles.locationValue}>
                  {filters.currency} {Math.round(locationValue).toLocaleString()}
                </Text>
              </View>
            );
          })
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.patientListButton} 
          onPress={() => navigation.navigate('PatientList')}
        >
          <Text style={styles.patientListButtonText}>👥 View All Patients</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.exportButton} onPress={exportData}>
          <Text style={styles.exportButtonText}>📤 Export Data</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Text style={styles.refreshButtonText}>
            {refreshing ? '🔄 Refreshing...' : '🔄 Refresh Data'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>📋 Summary Report</Text>
        <Text style={styles.summaryText}>
          In the selected time period, our dental mission has served{' '}
          <Text style={styles.summaryHighlight}>{kpis.totalPatients} patients</Text> across{' '}
          <Text style={styles.summaryHighlight}>{Object.keys(kpis.locationBreakdown).length} locations</Text>,
          performing a total of{' '}
          <Text style={styles.summaryHighlight}>{kpis.totalProcedures} procedures</Text>{' '}
          with a combined value of{' '}
          <Text style={styles.summaryHighlight}>
            {filters.currency} {kpis.totalValue.toLocaleString()}
          </Text>.
        </Text>
        
        {kpis.totalPatients > 0 && (
          <Text style={styles.summaryText}>
            This represents an average treatment value of{' '}
            <Text style={styles.summaryHighlight}>
              {filters.currency} {kpis.avgValuePerPatient}
            </Text> per patient served.
          </Text>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Last updated: {new Date().toLocaleString()}
        </Text>
        <Text style={styles.footerText}>
          Data synced from {patients.length} total patients in database
        </Text>
      </View>
    </ScrollView>
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
  filtersCard: {
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
  filtersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  horizontalScroll: {
    flexGrow: 0,
  },
  filterButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  filterButtonActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  locationButton: {
    minWidth: 80,
  },
  currencyButton: {
    flex: 1,
    maxWidth: 120,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: 16,
    gap: 12,
  },
  kpiCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    width: (width - 44) / 2, // Two cards per row with margins
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  card: {
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  procedureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  procedureInfo: {
    flex: 1,
  },
  procedureName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  procedureCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  procedurePercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007bff',
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  locationStats: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  locationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#28a745',
  },
  actionButtons: {
    flexDirection: 'column',
    margin: 16,
    gap: 12,
  },
  patientListButton: {
    backgroundColor: '#6f42c1',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  patientListButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  exportButton: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#e7f3ff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#b3d9ff',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
    marginBottom: 8,
  },
  summaryHighlight: {
    fontWeight: '600',
    color: '#007bff',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 4,
  },
});

export default AdminDashboardScreen;