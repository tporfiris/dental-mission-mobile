// screens/AdminDashboardScreen.tsx - Enhanced with comprehensive Excel export
// ✅ UPDATED to use new parseAssessmentData utility
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
      return new Date();
    }
    
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    if (typeof timestamp === 'string') {
      const parsed = new Date(timestamp);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    
    return new Date();
  };

  // Load data from Firestore
  const loadDashboardData = async () => {
    try {
      console.log('📊 Loading dashboard data from Firestore...');

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
          completedAt: safeToDate(data.completedAt || data.createdAt || data.syncedAt)
        };
      });

      const assessmentsSnapshot = await getDocs(collection(db, 'assessments'));
      const assessmentsData = assessmentsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          patientId: data.patientId || '',
          assessmentType: data.assessmentType || 'unknown',
          data: typeof data.data === 'string' ? data.data : JSON.stringify(data.data || {}),
          clinicianEmail: data.clinicianEmail || data.clinicianId || 'Unknown',
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
    
    const procedureBreakdown = filteredData.treatments.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

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

  // Comprehensive Excel Export
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
        ['Currency:', currencySymbol],
        [''],
        ['EXECUTIVE SUMMARY'],
        ['Total Patients Served', kpis.totalPatients],
        ['Total Procedures Performed', kpis.totalProcedures],
        ['Total Treatment Value', `${currencySymbol} ${kpis.totalValue.toLocaleString()}`],
        ['Average Value Per Patient', `${currencySymbol} ${kpis.avgValuePerPatient.toLocaleString()}`],
        ['Average Procedures Per Patient', kpis.totalPatients > 0 ? (kpis.totalProcedures / kpis.totalPatients).toFixed(2) : '0'],
        ['Number of Locations', Object.keys(kpis.locationBreakdown).length],
        ['Number of Clinicians', new Set(filteredData.treatments.map(t => t.clinicianName)).size],
        [''],
        ['PROCEDURE BREAKDOWN'],
        ['Procedure Type', 'Count', 'Percentage'],
        ...Object.entries(kpis.procedureBreakdown).map(([type, count]) => [
          type.charAt(0).toUpperCase() + type.slice(1),
          count,
          `${((count / kpis.totalProcedures) * 100).toFixed(1)}%`
        ]),
        [''],
        ['LOCATION BREAKDOWN'],
        ['Location', 'Patients', 'Procedures', 'Total Value'],
        ...Object.entries(kpis.locationBreakdown).map(([location, patientCount]) => {
          const locationTreatments = filteredData.treatments.filter(t => {
            const patient = filteredData.patients.find(p => p.id === t.patientId);
            return patient?.location === location;
          });
          const locationValue = locationTreatments.reduce((sum, t) => 
            sum + (t.value * t.units * currencyMultiplier), 0
          );
          return [
            location,
            patientCount,
            locationTreatments.length,
            `${currencySymbol} ${Math.round(locationValue).toLocaleString()}`
          ];
        }),
      ];

      const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
      overviewSheet['!cols'] = [
        { wch: 30 },
        { wch: 20 },
        { wch: 15 },
        { wch: 20 }
      ];
      XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Mission Overview');

      // SHEET 2: All Patients Directory
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
        patientSheet['!cols'] = Array(15).fill({ wch: 18 });
        XLSX.utils.book_append_sheet(workbook, patientSheet, 'Patients Directory');
      }

      // SHEET 3: All Treatments Detailed
      const treatmentRows = filteredData.treatments
        .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
        .map(t => {
          const patient = filteredData.patients.find(p => p.id === t.patientId);
          let billingCodes = [];
          try {
            billingCodes = JSON.parse(t.billingCodes);
          } catch (e) {
            // Handle legacy format
          }

          // ✅ Use new parsing utility
          const treatmentDetails = parseTreatmentDetails(t);

          return {
            'Treatment ID': t.id,
            'Patient ID': t.patientId,
            'Patient Name': patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
            'Patient Age': patient?.age || 'N/A',
            'Patient Gender': patient?.gender || 'N/A',
            'Patient Location': patient?.location || 'Unknown',
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
        treatmentSheet['!cols'] = Array(19).fill({ wch: 18 });
        XLSX.utils.book_append_sheet(workbook, treatmentSheet, 'All Treatments');
      }

      // SHEET 4: All Assessments
      const assessmentRows = filteredData.assessments
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map(a => {
          const patient = filteredData.patients.find(p => p.id === a.patientId);
          
          // ✅ Use new parsing utility
          const parsed = parseAssessmentData(a.data, a.assessmentType);
          
          return {
            'Assessment ID': a.id,
            'Patient ID': a.patientId,
            'Patient Name': patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
            'Patient Age': patient?.age || 'N/A',
            'Patient Gender': patient?.gender || 'N/A',
            'Patient Location': patient?.location || 'Unknown',
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
        assessmentSheet['!cols'] = Array(13).fill({ wch: 18 });
        XLSX.utils.book_append_sheet(workbook, assessmentSheet, 'All Assessments');
      }

      // SHEET 5: Financial Analysis by Location
      const locationFinancialData = [
        ['FINANCIAL ANALYSIS BY LOCATION'],
        ['Currency:', currencySymbol],
        [''],
        ['Location', 'Patients', 'Treatments', 'Total Value', 'Avg Value/Patient', 'Avg Value/Treatment', '% of Total Value'],
      ];

      const totalMissionValue = filteredData.treatments.reduce((sum, t) => 
        sum + (t.value * t.units * currencyMultiplier), 0
      );

      Object.entries(kpis.locationBreakdown).forEach(([location, patientCount]) => {
        const locationTreatments = filteredData.treatments.filter(t => {
          const patient = filteredData.patients.find(p => p.id === t.patientId);
          return patient?.location === location;
        });
        const locationValue = locationTreatments.reduce((sum, t) => 
          sum + (t.value * t.units * currencyMultiplier), 0
        );
        const avgPerPatient = patientCount > 0 ? locationValue / patientCount : 0;
        const avgPerTreatment = locationTreatments.length > 0 ? locationValue / locationTreatments.length : 0;
        const percentOfTotal = totalMissionValue > 0 ? (locationValue / totalMissionValue * 100) : 0;

        locationFinancialData.push([
          location,
          patientCount,
          locationTreatments.length,
          `${currencySymbol} ${Math.round(locationValue).toLocaleString()}`,
          `${currencySymbol} ${Math.round(avgPerPatient).toLocaleString()}`,
          `${currencySymbol} ${Math.round(avgPerTreatment).toLocaleString()}`,
          `${percentOfTotal.toFixed(1)}%`
        ]);
      });

      locationFinancialData.push(['']);
      locationFinancialData.push([
        'TOTAL',
        kpis.totalPatients,
        kpis.totalProcedures,
        `${currencySymbol} ${Math.round(totalMissionValue).toLocaleString()}`,
        `${currencySymbol} ${kpis.avgValuePerPatient.toLocaleString()}`,
        kpis.totalProcedures > 0 ? `${currencySymbol} ${Math.round(totalMissionValue / kpis.totalProcedures).toLocaleString()}` : 'N/A',
        '100.0%'
      ]);

      const locationFinancialSheet = XLSX.utils.aoa_to_sheet(locationFinancialData);
      locationFinancialSheet['!cols'] = [
        { wch: 20 },
        { wch: 12 },
        { wch: 12 },
        { wch: 18 },
        { wch: 20 },
        { wch: 20 },
        { wch: 18 }
      ];
      XLSX.utils.book_append_sheet(workbook, locationFinancialSheet, 'Financial by Location');

      // SHEET 6: Financial Analysis by Procedure Type
      const procedureFinancialData = [
        ['FINANCIAL ANALYSIS BY PROCEDURE TYPE'],
        ['Currency:', currencySymbol],
        [''],
        ['Procedure Type', 'Count', 'Total Value', 'Avg Value/Procedure', '% of Procedures', '% of Total Value'],
      ];

      Object.entries(kpis.procedureBreakdown).forEach(([type, count]) => {
        const typeTreatments = filteredData.treatments.filter(t => t.type === type);
        const typeValue = typeTreatments.reduce((sum, t) => 
          sum + (t.value * t.units * currencyMultiplier), 0
        );
        const avgValue = count > 0 ? typeValue / count : 0;
        const percentOfProcedures = kpis.totalProcedures > 0 ? (count / kpis.totalProcedures * 100) : 0;
        const percentOfValue = totalMissionValue > 0 ? (typeValue / totalMissionValue * 100) : 0;

        procedureFinancialData.push([
          type.charAt(0).toUpperCase() + type.slice(1),
          count,
          `${currencySymbol} ${Math.round(typeValue).toLocaleString()}`,
          `${currencySymbol} ${Math.round(avgValue).toLocaleString()}`,
          `${percentOfProcedures.toFixed(1)}%`,
          `${percentOfValue.toFixed(1)}%`
        ]);
      });

      procedureFinancialData.push(['']);
      procedureFinancialData.push([
        'TOTAL',
        kpis.totalProcedures,
        `${currencySymbol} ${Math.round(totalMissionValue).toLocaleString()}`,
        kpis.totalProcedures > 0 ? `${currencySymbol} ${Math.round(totalMissionValue / kpis.totalProcedures).toLocaleString()}` : 'N/A',
        '100.0%',
        '100.0%'
      ]);

      const procedureFinancialSheet = XLSX.utils.aoa_to_sheet(procedureFinancialData);
      procedureFinancialSheet['!cols'] = [
        { wch: 20 },
        { wch: 12 },
        { wch: 18 },
        { wch: 22 },
        { wch: 18 },
        { wch: 18 }
      ];
      XLSX.utils.book_append_sheet(workbook, procedureFinancialSheet, 'Financial by Procedure');

      // SHEET 7: Clinician Performance
      const clinicianStats = new Map<string, {
        treatmentCount: number;
        totalValue: number;
        treatmentTypes: Set<string>;
        patientCount: Set<string>;
      }>();

      filteredData.treatments.forEach(t => {
        if (!clinicianStats.has(t.clinicianName)) {
          clinicianStats.set(t.clinicianName, {
            treatmentCount: 0,
            totalValue: 0,
            treatmentTypes: new Set(),
            patientCount: new Set()
          });
        }
        const stats = clinicianStats.get(t.clinicianName)!;
        stats.treatmentCount++;
        stats.totalValue += t.value * t.units * currencyMultiplier;
        stats.treatmentTypes.add(t.type);
        stats.patientCount.add(t.patientId);
      });

      const clinicianRows = Array.from(clinicianStats.entries()).map(([name, stats]) => ({
        'Clinician Name': name,
        'Total Treatments': stats.treatmentCount,
        'Patients Treated': stats.patientCount.size,
        'Total Value': `${currencySymbol} ${Math.round(stats.totalValue).toLocaleString()}`,
        'Avg Value/Treatment': `${currencySymbol} ${Math.round(stats.totalValue / stats.treatmentCount).toLocaleString()}`,
        'Avg Value/Patient': `${currencySymbol} ${Math.round(stats.totalValue / stats.patientCount.size).toLocaleString()}`,
        'Treatment Types': Array.from(stats.treatmentTypes).join(', '),
        '% of Total Treatments': `${((stats.treatmentCount / kpis.totalProcedures) * 100).toFixed(1)}%`,
        '% of Total Value': `${((stats.totalValue / totalMissionValue) * 100).toFixed(1)}%`
      })).sort((a, b) => b['Total Treatments'] - a['Total Treatments']);

      if (clinicianRows.length > 0) {
        const clinicianSheet = XLSX.utils.json_to_sheet(clinicianRows);
        clinicianSheet['!cols'] = Array(9).fill({ wch: 20 });
        XLSX.utils.book_append_sheet(workbook, clinicianSheet, 'Clinician Performance');
      }

      // SHEET 8: Daily Activity Timeline
      const dailyStats = new Map<string, {
        patients: Set<string>;
        treatments: number;
        assessments: number;
        value: number;
      }>();

      filteredData.patients.forEach(p => {
        const dateKey = p.createdAt.toLocaleDateString();
        if (!dailyStats.has(dateKey)) {
          dailyStats.set(dateKey, {
            patients: new Set(),
            treatments: 0,
            assessments: 0,
            value: 0
          });
        }
        dailyStats.get(dateKey)!.patients.add(p.id);
      });

      filteredData.treatments.forEach(t => {
        const dateKey = t.completedAt.toLocaleDateString();
        if (!dailyStats.has(dateKey)) {
          dailyStats.set(dateKey, {
            patients: new Set(),
            treatments: 0,
            assessments: 0,
            value: 0
          });
        }
        const stats = dailyStats.get(dateKey)!;
        stats.treatments++;
        stats.value += t.value * t.units * currencyMultiplier;
      });

      filteredData.assessments.forEach(a => {
        const dateKey = a.createdAt.toLocaleDateString();
        if (!dailyStats.has(dateKey)) {
          dailyStats.set(dateKey, {
            patients: new Set(),
            treatments: 0,
            assessments: 0,
            value: 0
          });
        }
        dailyStats.get(dateKey)!.assessments++;
      });

      const dailyRows = Array.from(dailyStats.entries())
        .map(([date, stats]) => ({
          'Date': date,
          'Day of Week': new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
          'New Patients': stats.patients.size,
          'Treatments': stats.treatments,
          'Assessments': stats.assessments,
          'Total Value': `${currencySymbol} ${Math.round(stats.value).toLocaleString()}`,
          'Avg Value/Treatment': stats.treatments > 0 ? 
            `${currencySymbol} ${Math.round(stats.value / stats.treatments).toLocaleString()}` : 'N/A'
        }))
        .sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());

      if (dailyRows.length > 0) {
        const dailySheet = XLSX.utils.json_to_sheet(dailyRows);
        dailySheet['!cols'] = [
          { wch: 15 },
          { wch: 15 },
          { wch: 15 },
          { wch: 12 },
          { wch: 12 },
          { wch: 18 },
          { wch: 22 }
        ];
        XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Timeline');
      }

      // SHEET 9: Demographics Analysis
      const ageGroups = {
        '0-12': 0,
        '13-17': 0,
        '18-30': 0,
        '31-50': 0,
        '51-70': 0,
        '71+': 0
      };

      const genderBreakdown = {
        'Male': 0,
        'Female': 0,
        'Other': 0,
        'Unknown': 0
      };

      filteredData.patients.forEach(p => {
        // Age groups
        if (p.age <= 12) ageGroups['0-12']++;
        else if (p.age <= 17) ageGroups['13-17']++;
        else if (p.age <= 30) ageGroups['18-30']++;
        else if (p.age <= 50) ageGroups['31-50']++;
        else if (p.age <= 70) ageGroups['51-70']++;
        else ageGroups['71+']++;

        // Gender
        if (p.gender.toLowerCase().includes('male') && !p.gender.toLowerCase().includes('female')) {
          genderBreakdown['Male']++;
        } else if (p.gender.toLowerCase().includes('female')) {
          genderBreakdown['Female']++;
        } else if (p.gender.toLowerCase() === 'unknown') {
          genderBreakdown['Unknown']++;
        } else {
          genderBreakdown['Other']++;
        }
      });

      const demographicsData = [
        ['DEMOGRAPHICS ANALYSIS'],
        ['Total Patients:', kpis.totalPatients],
        [''],
        ['AGE DISTRIBUTION'],
        ['Age Group', 'Count', 'Percentage'],
        ...Object.entries(ageGroups).map(([group, count]) => [
          group,
          count,
          kpis.totalPatients > 0 ? `${((count / kpis.totalPatients) * 100).toFixed(1)}%` : '0%'
        ]),
        [''],
        ['GENDER DISTRIBUTION'],
        ['Gender', 'Count', 'Percentage'],
        ...Object.entries(genderBreakdown).map(([gender, count]) => [
          gender,
          count,
          kpis.totalPatients > 0 ? `${((count / kpis.totalPatients) * 100).toFixed(1)}%` : '0%'
        ]),
        [''],
        ['AGE STATISTICS'],
        ['Average Age', kpis.totalPatients > 0 ? 
          (filteredData.patients.reduce((sum, p) => sum + p.age, 0) / kpis.totalPatients).toFixed(1) : 'N/A'],
        ['Median Age', kpis.totalPatients > 0 ? 
          filteredData.patients.sort((a, b) => a.age - b.age)[Math.floor(filteredData.patients.length / 2)]?.age || 'N/A' : 'N/A'],
        ['Youngest Patient', kpis.totalPatients > 0 ? 
          Math.min(...filteredData.patients.map(p => p.age)) : 'N/A'],
        ['Oldest Patient', kpis.totalPatients > 0 ? 
          Math.max(...filteredData.patients.map(p => p.age)) : 'N/A'],
      ];

      const demographicsSheet = XLSX.utils.aoa_to_sheet(demographicsData);
      demographicsSheet['!cols'] = [
        { wch: 20 },
        { wch: 15 },
        { wch: 15 }
      ];
      XLSX.utils.book_append_sheet(workbook, demographicsSheet, 'Demographics');

      // Write the workbook to binary
      const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

      // Create file path
      const dateRangeStr = filters.dateRange === 'day' ? 'Daily' :
                           filters.dateRange === 'week' ? 'Weekly' :
                           filters.dateRange === 'month' ? 'Monthly' : 'Complete';
      const locationStr = filters.location === 'all' ? 'AllLocations' : filters.location.replace(/\s+/g, '_');
      const fileName = `Mission_Report_${dateRangeStr}_${locationStr}_${Date.now()}.xlsx`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      // Write file
      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('✅ Comprehensive mission Excel file created:', fileUri);

      // Check if we have expo-sharing available
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
              `Mission report has been saved to:\n\n${fileUri}\n\nNote: To share the actual file, rebuild the app with expo-sharing. For now, you can access the file in your device's file manager.`,
              [{ text: 'OK' }]
            );
          } catch (shareError) {
            Alert.alert(
              'File Saved',
              `Mission report has been saved to:\n\n${fileUri}\n\nYou can access it through your file manager app.`,
              [{ text: 'OK' }]
            );
          }
        } else {
          Alert.alert(
            'Success',
            `Comprehensive mission report saved to:\n\n${fileUri}`,
            [{ text: 'OK' }]
          );
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