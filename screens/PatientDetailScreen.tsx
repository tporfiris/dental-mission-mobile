// screens/PatientDetailScreen.tsx - Enhanced with Excel export
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
  Dimensions,
  Platform
} from 'react-native';
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

const PatientDetailScreen = ({ route, navigation }: any) => {
  const { patient, treatments, assessments } = route.params as {
    patient: Patient;
    treatments: Treatment[];
    assessments: Assessment[];
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'assessments' | 'treatments'>('overview');
  const [expandedAssessment, setExpandedAssessment] = useState<string | null>(null);
  const [expandedTreatment, setExpandedTreatment] = useState<string | null>(null);

  const patientStats = useMemo(() => {
    const totalValue = treatments.reduce((sum, t) => sum + (t.value * t.units), 0);
    
    const treatmentsByType = treatments.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const assessmentsByType = assessments.reduce((acc, a) => {
      acc[a.assessmentType] = (acc[a.assessmentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

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

  // Export to Excel function - COMPREHENSIVE VERSION
  const exportToExcel = async () => {
    try {
      console.log('📊 Starting comprehensive Excel export...');

      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // SHEET 1: Patient Information & Summary
      const patientInfoData = [
        ['PATIENT COMPREHENSIVE REPORT'],
        ['Generated on:', new Date().toLocaleString()],
        [''],
        ['PATIENT INFORMATION'],
        ['Patient ID', patient.id],
        ['First Name', patient.firstName],
        ['Last Name', patient.lastName],
        ['Full Name', `${patient.firstName} ${patient.lastName}`],
        ['Age', patient.age],
        ['Gender', patient.gender],
        ['Location', patient.location],
        ['Registration Date', patient.createdAt.toLocaleDateString()],
        ['Registration Time', patient.createdAt.toLocaleTimeString()],
        ['Photo URI', patient.photoUri || 'No photo'],
        [''],
        ['OVERALL SUMMARY STATISTICS'],
        ['Total Assessments Completed', assessments.length],
        ['Total Treatments Performed', treatments.length],
        ['Total Treatment Value (USD)', `${patientStats.totalValue.toFixed(2)}`],
        ['Average Value Per Treatment', treatments.length > 0 ? `${(patientStats.totalValue / treatments.length).toFixed(2)}` : '$0.00'],
        ['Last Assessment Date', patientStats.latestAssessment ? patientStats.latestAssessment.createdAt.toLocaleDateString() : 'N/A'],
        ['Last Treatment Date', patientStats.latestTreatment ? patientStats.latestTreatment.completedAt.toLocaleDateString() : 'N/A'],
        [''],
        ['ASSESSMENT BREAKDOWN BY TYPE'],
        ...Object.entries(patientStats.assessmentsByType).map(([type, count]) => [
          type.charAt(0).toUpperCase() + type.slice(1),
          count
        ]),
        [''],
        ['TREATMENT BREAKDOWN BY TYPE'],
        ...Object.entries(patientStats.treatmentsByType).map(([type, count]) => {
          const typeValue = treatments
            .filter(t => t.type === type)
            .reduce((sum, t) => sum + (t.value * t.units), 0);
          return [
            type.charAt(0).toUpperCase() + type.slice(1),
            count,
            `${typeValue.toFixed(2)}`
          ];
        }),
      ];

      const patientInfoSheet = XLSX.utils.aoa_to_sheet(patientInfoData);
      
      // Set column widths for better readability
      patientInfoSheet['!cols'] = [
        { wch: 30 },
        { wch: 40 },
        { wch: 15 }
      ];
      
      XLSX.utils.book_append_sheet(workbook, patientInfoSheet, 'Patient Summary');

      // SHEET 2: Detailed Assessments
      const assessmentRows = assessments
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map(a => {
          const parsedData = parseAssessmentData(a.data, a.assessmentType);
          return {
            'Assessment ID': a.id,
            'Patient ID': a.patientId,
            'Date': a.createdAt.toLocaleDateString(),
            'Time': a.createdAt.toLocaleTimeString(),
            'Day of Week': a.createdAt.toLocaleDateString('en-US', { weekday: 'long' }),
            'Assessment Type': a.assessmentType.charAt(0).toUpperCase() + a.assessmentType.slice(1),
            'Clinician Email': a.clinicianEmail,
            'Summary': parsedData.summary,
            'Detailed Findings': parsedData.details.join(' | '),
            'Raw Data': a.data
          };
        });

      if (assessmentRows.length > 0) {
        const assessmentSheet = XLSX.utils.json_to_sheet(assessmentRows);
        assessmentSheet['!cols'] = [
          { wch: 25 }, // Assessment ID
          { wch: 25 }, // Patient ID
          { wch: 12 }, // Date
          { wch: 12 }, // Time
          { wch: 12 }, // Day of Week
          { wch: 15 }, // Assessment Type
          { wch: 30 }, // Clinician Email
          { wch: 40 }, // Summary
          { wch: 60 }, // Detailed Findings
          { wch: 50 }  // Raw Data
        ];
        XLSX.utils.book_append_sheet(workbook, assessmentSheet, 'Assessments Details');
      }

      // SHEET 3: Comprehensive Treatments
      const treatmentRows = treatments
        .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
        .map(t => {
          const treatmentDetailsList = parseTreatmentDetails(t);
          let billingCodes = [];
          try {
            billingCodes = JSON.parse(t.billingCodes);
          } catch (e) {
            // Handle legacy format
          }

          return {
            'Treatment ID': t.id,
            'Patient ID': t.patientId,
            'Visit ID': t.visitId || 'N/A',
            'Date': t.completedAt.toLocaleDateString(),
            'Time': t.completedAt.toLocaleTimeString(),
            'Day of Week': t.completedAt.toLocaleDateString('en-US', { weekday: 'long' }),
            'Treatment Type': t.type.charAt(0).toUpperCase() + t.type.slice(1),
            'Tooth Number': t.tooth,
            'Surface': t.surface,
            'Units': t.units,
            'Unit Value (USD)': `${t.value.toFixed(2)}`,
            'Total Value (USD)': `${(t.value * t.units).toFixed(2)}`,
            'Clinician Name': t.clinicianName,
            'Treatment Details': treatmentDetailsList.join(' | '),
            'Billing Codes': billingCodes.map((c: any) => 
              typeof c === 'string' ? c : c.code || ''
            ).join(', '),
            'Billing Descriptions': billingCodes.map((c: any) => 
              typeof c === 'object' ? c.description || '' : ''
            ).join(' | '),
            'Notes': t.notes || 'N/A'
          };
        });

      if (treatmentRows.length > 0) {
        const treatmentSheet = XLSX.utils.json_to_sheet(treatmentRows);
        treatmentSheet['!cols'] = [
          { wch: 25 }, // Treatment ID
          { wch: 25 }, // Patient ID
          { wch: 25 }, // Visit ID
          { wch: 12 }, // Date
          { wch: 12 }, // Time
          { wch: 12 }, // Day of Week
          { wch: 15 }, // Treatment Type
          { wch: 12 }, // Tooth Number
          { wch: 10 }, // Surface
          { wch: 8 },  // Units
          { wch: 12 }, // Unit Value
          { wch: 12 }, // Total Value
          { wch: 25 }, // Clinician Name
          { wch: 40 }, // Treatment Details
          { wch: 30 }, // Billing Codes
          { wch: 50 }, // Billing Descriptions
          { wch: 40 }  // Notes
        ];
        XLSX.utils.book_append_sheet(workbook, treatmentSheet, 'Treatments Details');
      }

      // SHEET 4: Financial Summary & Analysis
      const financialData = [
        ['FINANCIAL ANALYSIS REPORT'],
        ['Patient:', `${patient.firstName} ${patient.lastName}`],
        ['Report Date:', new Date().toLocaleDateString()],
        [''],
        ['TREATMENT VALUE BY TYPE'],
        ['Treatment Type', 'Count', 'Total Value (USD)', 'Average Value', 'Percentage of Total'],
      ];

      Object.entries(patientStats.treatmentsByType).forEach(([type, count]) => {
        const typeValue = treatments
          .filter(t => t.type === type)
          .reduce((sum, t) => sum + (t.value * t.units), 0);
        const avgValue = count > 0 ? typeValue / count : 0;
        const percentage = patientStats.totalValue > 0 ? (typeValue / patientStats.totalValue * 100) : 0;
        
        financialData.push([
          type.charAt(0).toUpperCase() + type.slice(1),
          count,
          `${typeValue.toFixed(2)}`,
          `${avgValue.toFixed(2)}`,
          `${percentage.toFixed(1)}%`
        ]);
      });

      financialData.push(['']);
      financialData.push(['TOTAL', patientStats.totalTreatments, `${patientStats.totalValue.toFixed(2)}`, '', '100.0%']);
      financialData.push(['']);
      financialData.push(['TREATMENT TIMELINE ANALYSIS']);
      financialData.push(['First Treatment:', treatments.length > 0 ? 
        treatments.sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime())[0].completedAt.toLocaleDateString() : 'N/A']);
      financialData.push(['Last Treatment:', treatments.length > 0 ? 
        treatments.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())[0].completedAt.toLocaleDateString() : 'N/A']);
      
      if (treatments.length > 1) {
        const firstTreatment = treatments.sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime())[0];
        const lastTreatment = treatments.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())[0];
        const daysBetween = Math.floor((lastTreatment.completedAt.getTime() - firstTreatment.completedAt.getTime()) / (1000 * 60 * 60 * 24));
        financialData.push(['Treatment Span (days):', daysBetween]);
      }

      const financialSheet = XLSX.utils.aoa_to_sheet(financialData);
      financialSheet['!cols'] = [
        { wch: 25 },
        { wch: 12 },
        { wch: 18 },
        { wch: 15 },
        { wch: 18 }
      ];
      XLSX.utils.book_append_sheet(workbook, financialSheet, 'Financial Summary');

      // Write the workbook to binary
      const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

      // Create file path
      const fileName = `Patient_${patient.lastName}_${patient.firstName}_Complete_${Date.now()}.xlsx`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      // Write file
      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('✅ Comprehensive Excel file created:', fileUri);

      // Check if we have expo-sharing available
      try {
        // Try to use expo-sharing if available (after rebuild)
        const Sharing = require('expo-sharing');
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: `Comprehensive Patient Report - ${patient.firstName} ${patient.lastName}`,
            UTI: 'com.microsoft.excel.xlsx'
          });
        } else {
          Alert.alert(
            'File Saved',
            `Excel file has been saved to:\n\n${fileUri}\n\nYou can find it in your file manager.`,
            [{ text: 'OK' }]
          );
        }
      } catch (sharingError) {
        // expo-sharing not available, try native Share with file:// URL
        console.log('expo-sharing not available, using alternative method');
        
        if (Platform.OS === 'ios') {
          // iOS can share file:// URLs directly
          await Share.share({
            url: fileUri,
            title: `Comprehensive Patient Report - ${patient.firstName} ${patient.lastName}`,
          });
        } else if (Platform.OS === 'android') {
          // Android might need content:// URL, but file:// often works
          try {
            await Share.share({
              message: `Complete medical report for ${patient.firstName} ${patient.lastName}. File saved to: ${fileUri}`,
              title: `Comprehensive Patient Report - ${patient.firstName} ${patient.lastName}`,
            });
            
            Alert.alert(
              'File Saved',
              `Excel file has been saved to:\n\n${fileUri}\n\nNote: To share the actual file, you need to rebuild the app with expo-sharing. For now, you can access the file in your device's file manager.`,
              [
                { text: 'OK' },
                { 
                  text: 'Copy Path', 
                  onPress: () => {
                    // This would copy to clipboard if you have expo-clipboard
                    console.log('File path:', fileUri);
                  }
                }
              ]
            );
          } catch (shareError) {
            Alert.alert(
              'File Saved',
              `Excel file has been saved to:\n\n${fileUri}\n\nYou can access it through your file manager app.`,
              [{ text: 'OK' }]
            );
          }
        } else {
          Alert.alert(
            'Success',
            `Comprehensive Excel file saved to:\n\n${fileUri}`,
            [{ text: 'OK' }]
          );
        }
      }

    } catch (error) {
      console.error('❌ Excel export error:', error);
      Alert.alert('Error', 'Failed to export to Excel. Please try again.');
    }
  };

  const toggleAssessmentExpansion = (id: string) => {
    setExpandedAssessment(expandedAssessment === id ? null : id);
  };

  const toggleTreatmentExpansion = (id: string) => {
    setExpandedTreatment(expandedTreatment === id ? null : id);
  };

  const renderOverview = () => (
    <View style={styles.tabContent}>
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
          .map((assessment) => {
            const parsedData = parseAssessmentData(assessment.data, assessment.assessmentType);
            const isExpanded = expandedAssessment === assessment.id;
            
            return (
              <TouchableOpacity
                key={assessment.id}
                style={styles.itemCard}
                onPress={() => toggleAssessmentExpansion(assessment.id)}
              >
                <View style={styles.itemHeader}>
                  <View style={styles.itemHeaderLeft}>
                    <Text style={styles.itemType}>
                      📋 {assessment.assessmentType.charAt(0).toUpperCase() + assessment.assessmentType.slice(1)} Assessment
                    </Text>
                    <Text style={styles.itemSummary}>{parsedData.summary}</Text>
                  </View>
                  <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                </View>
                
                <View style={styles.itemMetadata}>
                  <Text style={styles.itemClinician}>
                    By: {assessment.clinicianEmail}
                  </Text>
                  <Text style={styles.itemDate}>
                    {assessment.createdAt.toLocaleDateString()} at {assessment.createdAt.toLocaleTimeString()}
                  </Text>
                </View>
                
                {isExpanded && (
                  <View style={styles.expandedDetails}>
                    <Text style={styles.detailsTitle}>Assessment Details:</Text>
                    {parsedData.details.map((detail, index) => (
                      <Text key={index} style={styles.detailItem}>• {detail}</Text>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
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
            const treatmentDetailsList = parseTreatmentDetails(treatment);
            const isExpanded = expandedTreatment === treatment.id;
            
            let billingCodes = [];
            try {
              billingCodes = JSON.parse(treatment.billingCodes);
            } catch (e) {
              // Handle legacy format
            }

            return (
              <TouchableOpacity
                key={treatment.id}
                style={styles.itemCard}
                onPress={() => toggleTreatmentExpansion(treatment.id)}
              >
                <View style={styles.itemHeader}>
                  <View style={styles.itemHeaderLeft}>
                    <Text style={styles.itemType}>
                      🦷 {treatment.type.charAt(0).toUpperCase() + treatment.type.slice(1)} Treatment
                    </Text>
                    <Text style={styles.treatmentSummary}>
                      {treatmentDetailsList.slice(0, 2).join(' • ')}
                    </Text>
                  </View>
                  <View style={styles.itemHeaderRight}>
                    <Text style={styles.itemValue}>
                      ${(treatment.value * treatment.units).toFixed(2)}
                    </Text>
                    <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                  </View>
                </View>
                
                <View style={styles.itemMetadata}>
                  <Text style={styles.itemClinician}>
                    By: {treatment.clinicianName}
                  </Text>
                  <Text style={styles.itemDate}>
                    {treatment.completedAt.toLocaleDateString()} at {treatment.completedAt.toLocaleTimeString()}
                  </Text>
                </View>

                {isExpanded && (
                  <View style={styles.expandedDetails}>
                    <Text style={styles.detailsTitle}>Treatment Details:</Text>
                    {treatmentDetailsList.map((detail, index) => (
                      <Text key={index} style={styles.detailItem}>• {detail}</Text>
                    ))}
                    
                    {billingCodes.length > 0 && (
                      <View style={styles.billingCodes}>
                        <Text style={styles.billingTitle}>Billing Codes:</Text>
                        {billingCodes.map((code: any, index: number) => (
                          <View key={index} style={styles.billingCodeItem}>
                            <Text style={styles.billingCode}>
                              {typeof code === 'string' ? code : code.code || 'N/A'}
                            </Text>
                            {code.price && (
                              <Text style={styles.billingPrice}>${code.price}</Text>
                            )}
                            {code.description && (
                              <Text style={styles.billingDescription}>{code.description}</Text>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Patient Details</Text>
          <TouchableOpacity style={styles.exportButton} onPress={exportToExcel}>
            <Text style={styles.exportButtonText}>📊 Export Excel</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabNavigation}>
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'assessments', label: `📋 Assessments (${assessments.length})` },
          { key: 'treatments', label: `🦷 Treatments (${treatments.length})` }
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
    fontSize: 12,
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
    width: (width - 44) / 2,
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
  itemHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  itemHeaderRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
  },
  itemType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemSummary: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '500',
  },
  treatmentSummary: {
    fontSize: 13,
    color: '#666',
  },
  expandIcon: {
    fontSize: 14,
    color: '#999',
    fontWeight: 'bold',
  },
  itemMetadata: {
    marginBottom: 8,
  },
  itemDate: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  itemValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  itemClinician: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  expandedDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f8f9fa',
    paddingTop: 12,
    marginTop: 8,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  detailItem: {
    fontSize: 13,
    color: '#495057',
    marginBottom: 4,
    paddingLeft: 8,
  },
  billingCodes: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f8f9fa',
  },
  billingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  billingCodeItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#007bff',
  },
  billingCode: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007bff',
    marginBottom: 2,
  },
  billingPrice: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 2,
  },
  billingDescription: {
    fontSize: 12,
    color: '#666',
  },
});

export default PatientDetailScreen;