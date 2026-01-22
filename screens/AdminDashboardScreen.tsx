// screens/AdminDashboardScreen.tsx - SIMPLIFIED for code-only system
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
  Dimensions,
  Platform
} from 'react-native';
import { db } from '../firebaseConfig';
import { 
  collection, 
  getDocs, 
} from 'firebase/firestore';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import { parseAssessmentData, parseTreatmentDetails } from '../utils/parseAssessmentData';

const { width } = Dimensions.get('window');

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  location: string;
  createdAt: Date;
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
  syncedAt?: Date;
  performedBy?: string;
}

interface Assessment {
  id: string;
  patientId: string;
  assessmentType: string;
  data: string;
  clinicianEmail: string;
  createdAt: Date;
  syncedAt?: Date;
  clinicianId?: string;
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
    currency: 'USD',
  });

  // Get unique locations from patients
  const locations = useMemo(() => {
    const uniqueLocations = [...new Set(patients.map(p => p.location))];
    return ['all', ...uniqueLocations];
  }, [patients]);

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
          createdAt: safeToDate(data.createdAt || data.syncedAt),
          registeredBy: data.registeredBy || 'Unknown'
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
          billingCodes: typeof data.billingCodes === 'string' ? data.billingCodes : JSON.stringify(data.billingCodes || []),
          notes: typeof data.notes === 'string' ? data.notes : JSON.stringify(data.notes || {}),
          clinicianName: data.clinicianName || 'Unknown',
          completedAt: safeToDate(data.completedAt || data.createdAt || data.syncedAt),
          syncedAt: safeToDate(data.syncedAt),
          performedBy: data.performedBy || 'Unknown'
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
          data: typeof data.data === 'string' ? data.data : JSON.stringify(data.data || {}),
          clinicianEmail: data.clinicianEmail || data.clinicianId || 'Unknown',
          createdAt: safeToDate(data.createdAt || data.syncedAt),
          syncedAt: safeToDate(data.syncedAt),
          clinicianId: data.clinicianId || 'Unknown'
        };
      });

      setPatients(patientsData);
      setTreatments(treatmentsData);
      setAssessments(assessmentsData);

      console.log('✅ Dashboard data loaded successfully:', {
        patients: patientsData.length,
        treatments: treatmentsData.length,
        assessments: assessmentsData.length,
      });

    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      
      Alert.alert(
        'Error Loading Data', 
        `Failed to load dashboard data. Please check your internet connection and try again.`,
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

    let filteredPatients = patients.filter(p => p.createdAt >= dateThreshold);
    let filteredTreatments = treatments.filter(t => t.completedAt >= dateThreshold);
    let filteredAssessments = assessments.filter(a => a.createdAt >= dateThreshold);

    // Filter by location
    if (filters.location !== 'all') {
      filteredPatients = filteredPatients.filter(p => p.location === filters.location);
      const patientIds = new Set(filteredPatients.map(p => p.id));
      filteredTreatments = filteredTreatments.filter(t => patientIds.has(t.patientId));
      filteredAssessments = filteredAssessments.filter(a => patientIds.has(a.patientId));
    }

    return { 
      patients: filteredPatients, 
      treatments: filteredTreatments, 
      assessments: filteredAssessments 
    };
  }, [patients, treatments, assessments, filters]);

  // Calculate KPIs with clinician breakdowns
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

    // Clinician breakdown
    const clinicianBreakdown: Record<string, {
      treatments: number;
      assessments: number;
      value: number;
      patients: Set<string>;
    }> = {};

    filteredData.treatments.forEach(t => {
      const clinician = t.clinicianName || 'Unknown';
      if (!clinicianBreakdown[clinician]) {
        clinicianBreakdown[clinician] = {
          treatments: 0,
          assessments: 0,
          value: 0,
          patients: new Set()
        };
      }
      clinicianBreakdown[clinician].treatments++;
      clinicianBreakdown[clinician].value += (t.value * t.units * currencyMultiplier);
      clinicianBreakdown[clinician].patients.add(t.patientId);
    });

    filteredData.assessments.forEach(a => {
      const clinician = a.clinicianEmail || 'Unknown';
      if (!clinicianBreakdown[clinician]) {
        clinicianBreakdown[clinician] = {
          treatments: 0,
          assessments: 0,
          value: 0,
          patients: new Set()
        };
      }
      clinicianBreakdown[clinician].assessments++;
      clinicianBreakdown[clinician].patients.add(a.patientId);
    });

    return {
      totalPatients,
      totalProcedures,
      totalValue: Math.round(totalValue),
      procedureBreakdown,
      locationBreakdown,
      clinicianBreakdown,
      avgValuePerPatient: totalPatients > 0 ? Math.round(totalValue / totalPatients) : 0
    };
  }, [filteredData, filters.currency]);

  // Excel Export
  const exportToExcel = async () => {
    try {
      console.log('📊 Starting Excel export...');

      const workbook = XLSX.utils.book_new();
      const currencySymbol = filters.currency;
      const currencyMultiplier = filters.currency === 'CAD' ? 1.35 : 1;

      // SHEET 1: Mission Overview
      const overviewData = [
        ['DENTAL MISSION REPORT'],
        ['Generated on:', new Date().toLocaleString()],
        ['Report Period:', filters.dateRange === 'day' ? 'Last 24 Hours' :
                         filters.dateRange === 'week' ? 'Last 7 Days' :
                         filters.dateRange === 'month' ? 'Last 30 Days' : 'All Time'],
        ['Location Filter:', filters.location === 'all' ? 'All Locations' : filters.location],
        ['Currency:', currencySymbol],
        [''],
        ['SUMMARY'],
        ['Total Patients', kpis.totalPatients],
        ['Total Procedures', kpis.totalProcedures],
        ['Total Value', `${currencySymbol} ${kpis.totalValue.toLocaleString()}`],
        ['Avg Value/Patient', `${currencySymbol} ${kpis.avgValuePerPatient.toLocaleString()}`],
        [''],
        ['PROCEDURE BREAKDOWN'],
        ['Type', 'Count', 'Percentage'],
        ...Object.entries(kpis.procedureBreakdown).map(([type, count]) => [
          type.charAt(0).toUpperCase() + type.slice(1),
          count,
          `${((count / kpis.totalProcedures) * 100).toFixed(1)}%`
        ]),
      ];

      const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

      // SHEET 2: Patients
      const patientRows = filteredData.patients
        .sort((a, b) => a.lastName.localeCompare(b.lastName))
        .map(p => {
          const patientTreatments = filteredData.treatments.filter(t => t.patientId === p.id);
          const patientValue = patientTreatments.reduce((sum, t) => 
            sum + (t.value * t.units * currencyMultiplier), 0
          );
          
          return {
            'ID': p.id,
            'Name': `${p.firstName} ${p.lastName}`,
            'Age': p.age,
            'Gender': p.gender,
            'Location': p.location,
            'Date': p.createdAt.toLocaleDateString(),
            'Treatments': patientTreatments.length,
            'Value': `${currencySymbol} ${Math.round(patientValue).toLocaleString()}`,
          };
        });

      if (patientRows.length > 0) {
        const patientSheet = XLSX.utils.json_to_sheet(patientRows);
        XLSX.utils.book_append_sheet(workbook, patientSheet, 'Patients');
      }

      // SHEET 3: Treatments
      const treatmentRows = filteredData.treatments
        .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
        .map(t => {
          const patient = filteredData.patients.find(p => p.id === t.patientId);
          
          return {
            'ID': t.id,
            'Patient': patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
            'Date': t.completedAt.toLocaleDateString(),
            'Type': t.type.charAt(0).toUpperCase() + t.type.slice(1),
            'Tooth': t.tooth,
            'Surface': t.surface,
            'Units': t.units,
            'Value': `${currencySymbol} ${(t.value * t.units * currencyMultiplier).toFixed(2)}`,
            'Clinician': t.clinicianName,
          };
        });

      if (treatmentRows.length > 0) {
        const treatmentSheet = XLSX.utils.json_to_sheet(treatmentRows);
        XLSX.utils.book_append_sheet(workbook, treatmentSheet, 'Treatments');
      }

      // SHEET 4: Clinician Performance
      const clinicianRows = Object.entries(kpis.clinicianBreakdown)
        .sort((a, b) => b[1].value - a[1].value)
        .map(([clinician, stats]) => ({
          'Clinician': clinician,
          'Patients': stats.patients.size,
          'Treatments': stats.treatments,
          'Assessments': stats.assessments,
          'Total Value': `${currencySymbol} ${Math.round(stats.value).toLocaleString()}`,
        }));

      if (clinicianRows.length > 0) {
        const clinicianSheet = XLSX.utils.json_to_sheet(clinicianRows);
        XLSX.utils.book_append_sheet(workbook, clinicianSheet, 'Clinicians');
      }

      // Write and share
      const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
      
      const fileName = `Mission_Report_${Date.now()}.xlsx`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('✅ Excel file created:', fileUri);

      // Share file
      try {
        const Sharing = require('expo-sharing');
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert('File Saved', `Report saved to: ${fileUri}`);
        }
      } catch (sharingError) {
        if (Platform.OS === 'ios') {
          await Share.share({ url: fileUri });
        } else {
          Alert.alert('File Saved', `Report saved to: ${fileUri}`);
        }
      }

    } catch (error) {
      console.error('❌ Excel export error:', error);
      Alert.alert('Error', 'Failed to export data. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
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
        <Text style={styles.headerSubtitle}>Real-time analytics</Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersCard}>
        <Text style={styles.filtersTitle}>Filters</Text>
        
        {/* Time Period */}
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

        {/* Location */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>📍 Location</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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

        {/* Currency */}
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
          <Text style={styles.kpiLabel}>👥 Patients</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{kpis.totalProcedures.toLocaleString()}</Text>
          <Text style={styles.kpiLabel}>🏥 Procedures</Text>
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

      {/* Clinician Performance */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>👨‍⚕️ Clinician Performance</Text>
        {Object.keys(kpis.clinicianBreakdown).length === 0 ? (
          <Text style={styles.noDataText}>No data found</Text>
        ) : (
          Object.entries(kpis.clinicianBreakdown)
            .sort((a, b) => b[1].value - a[1].value)
            .map(([clinician, stats]) => (
              <View key={clinician} style={styles.clinicianRow}>
                <View style={styles.clinicianInfo}>
                  <Text style={styles.clinicianName}>{clinician}</Text>
                  <Text style={styles.clinicianStats}>
                    {stats.patients.size} patients • {stats.treatments} treatments
                  </Text>
                </View>
                <Text style={styles.clinicianValue}>
                  {filters.currency} {Math.round(stats.value).toLocaleString()}
                </Text>
              </View>
            ))
        )}
      </View>

      {/* Procedure Breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🦷 Procedure Breakdown</Text>
        {Object.entries(kpis.procedureBreakdown).length === 0 ? (
          <Text style={styles.noDataText}>No procedures found</Text>
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
          <Text style={styles.noDataText}>No location data</Text>
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

        <TouchableOpacity style={styles.exportButton} onPress={exportToExcel}>
          <Text style={styles.exportButtonText}>📊 Export Excel Report</Text>
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

      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>📋 Summary</Text>
        <Text style={styles.summaryText}>
          Served <Text style={styles.highlight}>{kpis.totalPatients} patients</Text> with{' '}
          <Text style={styles.highlight}>{kpis.totalProcedures} procedures</Text>, total value{' '}
          <Text style={styles.highlight}>{filters.currency} {kpis.totalValue.toLocaleString()}</Text>.
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Last updated: {new Date().toLocaleString()}
        </Text>
        <Text style={styles.footerText}>
          {patients.length} total patients in database
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
  },
  loadingText: {
    marginTop: 16,
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
    marginBottom: 16,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
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
    width: (width - 44) / 2,
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
    marginBottom: 16,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  clinicianRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  clinicianInfo: {
    flex: 1,
  },
  clinicianName: {
    fontSize: 16,
    fontWeight: '600',
  },
  clinicianStats: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  clinicianValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007bff',
  },
  procedureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
  },
  highlight: {
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
    marginBottom: 4,
  },
});

export default AdminDashboardScreen;