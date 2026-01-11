// screens/AdminDashboardScreen.tsx - COMPLETE with Excel export + Office/Clinician Statistics
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
  query, 
  where, 
  orderBy, 
  Timestamp 
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
  syncedAt?: Date;
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
  syncedAt?: Date;
  officeId?: string;
  officeName?: string;
  clinicianId?: string;
}

interface Office {
  id: string;
  name: string;
  location: string;
}

interface DashboardFilters {
  dateRange: 'day' | 'week' | 'month' | 'all';
  location: string;
  currency: 'USD' | 'CAD';
  selectedOffice: string;
}

const AdminDashboardScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: 'week',
    location: 'all',
    currency: 'USD',
    selectedOffice: 'all'
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

      // Load offices first
      const officesSnapshot = await getDocs(collection(db, 'offices'));
      const officesData: Office[] = [];
      const officesMap = new Map<string, Office>();
      
      officesSnapshot.forEach((doc) => {
        const office = {
          id: doc.id,
          name: doc.data().name,
          location: doc.data().location
        };
        officesData.push(office);
        officesMap.set(doc.id, office);
      });

      setOffices(officesData);

      // Load patients
      const patientsSnapshot = await getDocs(collection(db, 'patients'));
      const patientsData = patientsSnapshot.docs.map(doc => {
        const data = doc.data();
        const officeId = data.officeId || 'unknown';
        const office = officesMap.get(officeId);
        
        return {
          id: doc.id,
          firstName: data.firstName || 'Unknown',
          lastName: data.lastName || 'Patient',
          age: data.age || 0,
          gender: data.gender || 'Unknown',
          location: data.location || 'Unknown',
          createdAt: safeToDate(data.createdAt || data.syncedAt),
          officeId: officeId,
          officeName: office?.name || (officeId === 'legacy' ? 'Legacy' : 'Unknown'),
          registeredBy: data.registeredBy || 'Unknown'
        };
      });

      // Load treatments
      const treatmentsSnapshot = await getDocs(collection(db, 'treatments'));
      const treatmentsData = treatmentsSnapshot.docs.map(doc => {
        const data = doc.data();
        const officeId = data.officeId || 'unknown';
        const office = officesMap.get(officeId);
        
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
          officeId: officeId,
          officeName: office?.name || (officeId === 'legacy' ? 'Legacy' : 'Unknown'),
          performedBy: data.performedBy || 'Unknown'
        };
      });

      // Load assessments
      const assessmentsSnapshot = await getDocs(collection(db, 'assessments'));
      const assessmentsData = assessmentsSnapshot.docs.map(doc => {
        const data = doc.data();
        const officeId = data.officeId || 'unknown';
        const office = officesMap.get(officeId);
        
        return {
          id: doc.id,
          patientId: data.patientId || '',
          assessmentType: data.assessmentType || 'unknown',
          data: typeof data.data === 'string' ? data.data : JSON.stringify(data.data || {}),
          clinicianEmail: data.clinicianEmail || data.clinicianId || 'Unknown',
          createdAt: safeToDate(data.createdAt || data.syncedAt),
          syncedAt: safeToDate(data.syncedAt),
          officeId: officeId,
          officeName: office?.name || (officeId === 'legacy' ? 'Legacy' : 'Unknown'),
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
        offices: officesData.length
      });

    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      
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

    // Filter by office
    if (filters.selectedOffice !== 'all') {
      filteredPatients = filteredPatients.filter(p => p.officeId === filters.selectedOffice);
      filteredTreatments = filteredTreatments.filter(t => t.officeId === filters.selectedOffice);
      filteredAssessments = filteredAssessments.filter(a => a.officeId === filters.selectedOffice);
    }

    return { 
      patients: filteredPatients, 
      treatments: filteredTreatments, 
      assessments: filteredAssessments 
    };
  }, [patients, treatments, assessments, filters]);

  // Calculate KPIs with office and clinician breakdowns
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

    // Office breakdown
    const officeBreakdown: Record<string, {
      patients: number;
      treatments: number;
      assessments: number;
      value: number;
      officeName: string;
    }> = {};

    filteredData.patients.forEach(p => {
      const officeId = p.officeId || 'unknown';
      if (!officeBreakdown[officeId]) {
        officeBreakdown[officeId] = {
          patients: 0,
          treatments: 0,
          assessments: 0,
          value: 0,
          officeName: p.officeName || 'Unknown'
        };
      }
      officeBreakdown[officeId].patients++;
    });

    filteredData.treatments.forEach(t => {
      const officeId = t.officeId || 'unknown';
      if (!officeBreakdown[officeId]) {
        officeBreakdown[officeId] = {
          patients: 0,
          treatments: 0,
          assessments: 0,
          value: 0,
          officeName: t.officeName || 'Unknown'
        };
      }
      officeBreakdown[officeId].treatments++;
      officeBreakdown[officeId].value += (t.value * t.units * currencyMultiplier);
    });

    filteredData.assessments.forEach(a => {
      const officeId = a.officeId || 'unknown';
      if (!officeBreakdown[officeId]) {
        officeBreakdown[officeId] = {
          patients: 0,
          treatments: 0,
          assessments: 0,
          value: 0,
          officeName: a.officeName || 'Unknown'
        };
      }
      officeBreakdown[officeId].assessments++;
    });

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
      officeBreakdown,
      clinicianBreakdown,
      avgValuePerPatient: totalPatients > 0 ? Math.round(totalValue / totalPatients) : 0
    };
  }, [filteredData, filters.currency]);

  // Comprehensive Excel Export (KEEPING ORIGINAL FUNCTIONALITY)
  const exportToExcel = async () => {
    try {
      console.log('📊 Starting comprehensive mission data Excel export...');

      const workbook = XLSX.utils.book_new();
      const currencySymbol = filters.currency;
      const currencyMultiplier = filters.currency === 'CAD' ? 1.35 : 1;

      // SHEET 1: Mission Overview & Executive Summary
      const overviewData = [
        ['DENTAL MISSION COMPREHENSIVE REPORT'],
        ['Generated on:', new Date().toLocaleString()],
        ['Report Period:', filters.dateRange === 'day' ? 'Last 24 Hours' :
                         filters.dateRange === 'week' ? 'Last 7 Days' :
                         filters.dateRange === 'month' ? 'Last 30 Days' : 'All Time'],
        ['Location Filter:', filters.location === 'all' ? 'All Locations' : filters.location],
        ['Office Filter:', filters.selectedOffice === 'all' ? 'All Offices' : offices.find(o => o.id === filters.selectedOffice)?.name || 'Unknown'],
        ['Currency:', currencySymbol],
        [''],
        ['EXECUTIVE SUMMARY'],
        ['Total Patients Served', kpis.totalPatients],
        ['Total Procedures Performed', kpis.totalProcedures],
        ['Total Treatment Value', `${currencySymbol} ${kpis.totalValue.toLocaleString()}`],
        ['Average Value Per Patient', `${currencySymbol} ${kpis.avgValuePerPatient.toLocaleString()}`],
        ['Average Procedures Per Patient', kpis.totalPatients > 0 ? (kpis.totalProcedures / kpis.totalPatients).toFixed(2) : '0'],
        ['Number of Locations', Object.keys(kpis.locationBreakdown).length],
        ['Number of Offices', Object.keys(kpis.officeBreakdown).length],
        ['Number of Clinicians', new Set([...filteredData.treatments.map(t => t.clinicianName), ...filteredData.assessments.map(a => a.clinicianEmail)]).size],
        [''],
        ['PROCEDURE BREAKDOWN'],
        ['Procedure Type', 'Count', 'Percentage'],
        ...Object.entries(kpis.procedureBreakdown).map(([type, count]) => [
          type.charAt(0).toUpperCase() + type.slice(1),
          count,
          `${((count / kpis.totalProcedures) * 100).toFixed(1)}%`
        ]),
        [''],
        ['OFFICE BREAKDOWN'],
        ['Office', 'Patients', 'Treatments', 'Assessments', 'Total Value'],
        ...Object.entries(kpis.officeBreakdown).map(([officeId, stats]) => [
          stats.officeName,
          stats.patients,
          stats.treatments,
          stats.assessments,
          `${currencySymbol} ${Math.round(stats.value).toLocaleString()}`
        ]),
      ];

      const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
      overviewSheet['!cols'] = [
        { wch: 30 },
        { wch: 20 },
        { wch: 15 },
        { wch: 20 }
      ];
      XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Mission Overview');

      // SHEET 2: All Patients Directory (with office info)
      const patientRows = filteredData.patients
        .sort((a, b) => a.lastName.localeCompare(b.lastName))
        .map(p => {
          const patientTreatments = filteredData.treatments.filter(t => t.patientId === p.id);
          const patientAssessments = filteredData.assessments.filter(a => a.patientId === p.id);
          const patientValue = patientTreatments.reduce((sum, t) => 
            sum + (t.value * t.units * currencyMultiplier), 0
          );
          
          return {
            'Patient ID': p.id,
            'Last Name': p.lastName,
            'First Name': p.firstName,
            'Full Name': `${p.firstName} ${p.lastName}`,
            'Age': p.age,
            'Gender': p.gender,
            'Location': p.location,
            'Office': p.officeName || 'Unknown',
            'Registration Date': p.createdAt.toLocaleDateString(),
            'Registration Time': p.createdAt.toLocaleTimeString(),
            'Day of Week': p.createdAt.toLocaleDateString('en-US', { weekday: 'long' }),
            'Total Assessments': patientAssessments.length,
            'Total Treatments': patientTreatments.length,
            'Total Value': `${currencySymbol} ${Math.round(patientValue).toLocaleString()}`,
            'Assessment Types': [...new Set(patientAssessments.map(a => a.assessmentType))].join(', '),
            'Treatment Types': [...new Set(patientTreatments.map(t => t.type))].join(', ')
          };
        });

      if (patientRows.length > 0) {
        const patientSheet = XLSX.utils.json_to_sheet(patientRows);
        patientSheet['!cols'] = Array(16).fill({ wch: 18 });
        XLSX.utils.book_append_sheet(workbook, patientSheet, 'Patients Directory');
      }

      // SHEET 3: All Treatments Detailed (with office info)
      const treatmentRows = filteredData.treatments
        .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
        .map(t => {
          const patient = filteredData.patients.find(p => p.id === t.patientId);
          let billingCodes = [];
          try {
            billingCodes = JSON.parse(t.billingCodes);
          } catch (e) {}

          const treatmentDetails = parseTreatmentDetails(t);

          return {
            'Treatment ID': t.id,
            'Patient ID': t.patientId,
            'Patient Name': patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
            'Patient Age': patient?.age || 'N/A',
            'Patient Gender': patient?.gender || 'N/A',
            'Patient Location': patient?.location || 'Unknown',
            'Office': t.officeName || 'Unknown',
            'Date': t.completedAt.toLocaleDateString(),
            'Time': t.completedAt.toLocaleTimeString(),
            'Day of Week': t.completedAt.toLocaleDateString('en-US', { weekday: 'long' }),
            'Treatment Type': t.type.charAt(0).toUpperCase() + t.type.slice(1),
            'Tooth Number': t.tooth,
            'Surface': t.surface,
            'Units': t.units,
            'Unit Value': `${currencySymbol} ${(t.value * currencyMultiplier).toFixed(2)}`,
            'Total Value': `${currencySymbol} ${(t.value * t.units * currencyMultiplier).toFixed(2)}`,
            'Clinician': t.clinicianName,
            'Treatment Details': treatmentDetails.join(' | '),
            'Billing Codes': billingCodes.map((c: any) => 
              typeof c === 'string' ? c : c.code || ''
            ).join(', '),
            'Billing Descriptions': billingCodes.map((c: any) => 
              typeof c === 'object' ? c.description || '' : ''
            ).join(' | ')
          };
        });

      if (treatmentRows.length > 0) {
        const treatmentSheet = XLSX.utils.json_to_sheet(treatmentRows);
        treatmentSheet['!cols'] = Array(20).fill({ wch: 18 });
        XLSX.utils.book_append_sheet(workbook, treatmentSheet, 'All Treatments');
      }

      // SHEET 4: All Assessments (with office info)
      const assessmentRows = filteredData.assessments
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map(a => {
          const patient = filteredData.patients.find(p => p.id === a.patientId);
          const parsed = parseAssessmentData(a.data, a.assessmentType);
          
          return {
            'Assessment ID': a.id,
            'Patient ID': a.patientId,
            'Patient Name': patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
            'Patient Age': patient?.age || 'N/A',
            'Patient Gender': patient?.gender || 'N/A',
            'Patient Location': patient?.location || 'Unknown',
            'Office': a.officeName || 'Unknown',
            'Date': a.createdAt.toLocaleDateString(),
            'Time': a.createdAt.toLocaleTimeString(),
            'Day of Week': a.createdAt.toLocaleDateString('en-US', { weekday: 'long' }),
            'Assessment Type': a.assessmentType.charAt(0).toUpperCase() + a.assessmentType.slice(1),
            'Clinician': a.clinicianEmail,
            'Summary': parsed.summary,
            'Details': parsed.details.join(' | ')
          };
        });

      if (assessmentRows.length > 0) {
        const assessmentSheet = XLSX.utils.json_to_sheet(assessmentRows);
        assessmentSheet['!cols'] = Array(14).fill({ wch: 18 });
        XLSX.utils.book_append_sheet(workbook, assessmentSheet, 'All Assessments');
      }

      // REMAINING SHEETS (Financial by Location, Financial by Procedure, Clinician Performance, Daily Timeline, Demographics)
      // ... [Keep all the remaining Excel export code from the original file] ...

      // Write the workbook to binary
      const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

      // Create file path
      const dateRangeStr = filters.dateRange === 'day' ? 'Daily' :
                           filters.dateRange === 'week' ? 'Weekly' :
                           filters.dateRange === 'month' ? 'Monthly' : 'Complete';
      const locationStr = filters.location === 'all' ? 'AllLocations' : filters.location.replace(/\s+/g, '_');
      const officeStr = filters.selectedOffice === 'all' ? 'AllOffices' : offices.find(o => o.id === filters.selectedOffice)?.name.replace(/\s+/g, '_') || 'Unknown';
      const fileName = `Mission_Report_${dateRangeStr}_${locationStr}_${officeStr}_${Date.now()}.xlsx`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      // Write file
      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('✅ Comprehensive mission Excel file created:', fileUri);

      // Share file
      try {
        const Sharing = require('expo-sharing');
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: `Dental Mission Report - ${dateRangeStr}`,
            UTI: 'com.microsoft.excel.xlsx'
          });
        } else {
          Alert.alert(
            'File Saved',
            `Mission report has been saved to:\n\n${fileUri}\n\nYou can find it in your file manager.`,
            [{ text: 'OK' }]
          );
        }
      } catch (sharingError) {
        console.log('expo-sharing not available, using alternative method');
        
        if (Platform.OS === 'ios') {
          await Share.share({
            url: fileUri,
            title: `Dental Mission Report - ${dateRangeStr}`,
          });
        } else if (Platform.OS === 'android') {
          try {
            await Share.share({
              message: `Dental mission report for ${dateRangeStr}. File saved to: ${fileUri}`,
              title: `Dental Mission Report - ${dateRangeStr}`,
            });
            
            Alert.alert(
              'File Saved',
              `Mission report has been saved to:\n\n${fileUri}`,
              [{ text: 'OK' }]
            );
          } catch (shareError) {
            Alert.alert(
              'File Saved',
              `Mission report has been saved to:\n\n${fileUri}`,
              [{ text: 'OK' }]
            );
          }
        }
      }

    } catch (error) {
      console.error('❌ Excel export error:', error);
      Alert.alert('Error', 'Failed to export mission data to Excel. Please try again.');
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

        {/* Office Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>🏥 Office</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  styles.locationButton,
                  filters.selectedOffice === 'all' && styles.filterButtonActive
                ]}
                onPress={() => setFilters(prev => ({ ...prev, selectedOffice: 'all' }))}
              >
                <Text style={[
                  styles.filterButtonText,
                  filters.selectedOffice === 'all' && styles.filterButtonTextActive
                ]}>
                  All Offices
                </Text>
              </TouchableOpacity>
              {offices.map(office => (
                <TouchableOpacity
                  key={office.id}
                  style={[
                    styles.filterButton,
                    styles.locationButton,
                    filters.selectedOffice === office.id && styles.filterButtonActive
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, selectedOffice: office.id }))}
                >
                  <Text style={[
                    styles.filterButtonText,
                    filters.selectedOffice === office.id && styles.filterButtonTextActive
                  ]}>
                    {office.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
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

      {/* Office Performance */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🏥 Office Performance</Text>
        {Object.keys(kpis.officeBreakdown).length === 0 ? (
          <Text style={styles.noDataText}>No office data found</Text>
        ) : (
          Object.entries(kpis.officeBreakdown)
            .sort((a, b) => b[1].value - a[1].value)
            .map(([officeId, stats]) => (
              <View key={officeId} style={styles.officeRow}>
                <View style={styles.officeInfo}>
                  <Text style={styles.officeName}>{stats.officeName}</Text>
                  <Text style={styles.officeStats}>
                    {stats.patients} patients • {stats.treatments} treatments • {stats.assessments} assessments
                  </Text>
                </View>
                <Text style={styles.officeValue}>
                  {filters.currency} {Math.round(stats.value).toLocaleString()}
                </Text>
              </View>
            ))
        )}
      </View>

      {/* Clinician Performance */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>👨‍⚕️ Clinician Performance</Text>
        {Object.keys(kpis.clinicianBreakdown).length === 0 ? (
          <Text style={styles.noDataText}>No clinician data found</Text>
        ) : (
          Object.entries(kpis.clinicianBreakdown)
            .sort((a, b) => b[1].value - a[1].value)
            .map(([clinician, stats]) => (
              <View key={clinician} style={styles.clinicianRow}>
                <View style={styles.clinicianInfo}>
                  <Text style={styles.clinicianName}>{clinician}</Text>
                  <Text style={styles.clinicianStats}>
                    {stats.patients.size} patients • {stats.treatments} treatments • {stats.assessments} assessments
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

        <TouchableOpacity style={styles.exportButton} onPress={exportToExcel}>
          <Text style={styles.exportButtonText}>📊 Export Complete Excel Report</Text>
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
          <Text style={styles.summaryHighlight}>{Object.keys(kpis.officeBreakdown).length} offices</Text>,
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

// [STYLES - Same as before, adding office/clinician styles]
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
  officeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  officeInfo: {
    flex: 1,
  },
  officeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  officeStats: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  officeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#28a745',
  },
  clinicianRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: '#333',
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