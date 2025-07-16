import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';

const SURFACES = ['M', 'D', 'L', 'B', 'O'] as const;
type Surface = typeof SURFACES[number];

const UPPER_RIGHT = ['11', '12', '13', '14', '15', '16', '17', '18'];
const UPPER_LEFT = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_RIGHT = ['41', '42', '43', '44', '45', '46', '47', '48'];
const LOWER_LEFT = ['31', '32', '33', '34', '35', '36', '37', '38'];

interface ToothRestoration {
  surfaces: Surface[];
  tentative: boolean;
}

const initialRestorations: Record<string, ToothRestoration> = {};
[
  ...UPPER_RIGHT, ...UPPER_LEFT,
  ...LOWER_RIGHT, ...LOWER_LEFT,
].forEach(id => {
  initialRestorations[id] = { surfaces: [], tentative: false };
});

const TreatmentPlanningFillingsScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  const [restorations, setRestorations] = useState(initialRestorations);
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const openToothEditor = (toothId: string) => {
    setSelectedTooth(toothId);
    setModalVisible(true);
  };

  const closeToothEditor = () => {
    setSelectedTooth(null);
    setModalVisible(false);
  };

  const toggleSurface = (surface: Surface) => {
    if (!selectedTooth) return;
    
    setRestorations(prev => ({
      ...prev,
      [selectedTooth]: {
        ...prev[selectedTooth],
        surfaces: prev[selectedTooth].surfaces.includes(surface)
          ? prev[selectedTooth].surfaces.filter(s => s !== surface)
          : [...prev[selectedTooth].surfaces, surface].sort()
      }
    }));
  };

  const toggleTentative = () => {
    if (!selectedTooth) return;
    
    setRestorations(prev => ({
      ...prev,
      [selectedTooth]: {
        ...prev[selectedTooth],
        tentative: !prev[selectedTooth].tentative
      }
    }));
  };

  const clearTooth = () => {
    if (!selectedTooth) return;
    
    setRestorations(prev => ({
      ...prev,
      [selectedTooth]: { surfaces: [], tentative: false }
    }));
  };

  const getToothStyle = (toothId: string) => {
    const restoration = restorations[toothId];
    if (restoration.surfaces.length === 0) {
      return styles.toothNormal;
    }
    if (restoration.tentative) {
      return styles.toothTentative;
    }
    return styles.toothNeedsRestoration;
  };

  const getToothPosition = (toothId: string, index: number, section: 'upper-right' | 'upper-left' | 'lower-right' | 'lower-left') => {
    const centerX = 160;
    const centerY = 210;
    const radiusX = 140;
    const radiusY = 200;
    
    let angle = 0;
    
    switch (section) {
      case 'upper-right':
        angle = (index * Math.PI / 14);
        break;
      case 'upper-left':
        angle = Math.PI - (index * Math.PI / 14);
        break;
      case 'lower-right':
        angle = (Math.PI * 2) - (index * Math.PI / 14);
        break;
      case 'lower-left':
        angle = Math.PI + (index * Math.PI / 14);
        break;
    }
    
    const x = centerX + radiusX * Math.cos(angle);
    const y = centerY + radiusY * Math.sin(angle);
    
    return { left: x - 15, top: y - 15 };
  };

  const renderTooth = (toothId: string, index: number, section: 'upper-right' | 'upper-left' | 'lower-right' | 'lower-left') => {
    const position = getToothPosition(toothId, index, section);
    const restoration = restorations[toothId];
    
    return (
      <Pressable
        key={toothId}
        onPress={() => openToothEditor(toothId)}
        style={[
          styles.toothCircle,
          getToothStyle(toothId),
          {
            position: 'absolute',
            left: position.left,
            top: position.top,
          }
        ]}
      >
        <Text style={styles.toothLabel}>{toothId}</Text>
        {restoration.surfaces.length > 0 && (
          <View style={styles.surfaceIndicator}>
            <Text style={styles.surfaceText}>
              {restoration.surfaces.join('')}
            </Text>
          </View>
        )}
        {restoration.tentative && (
          <View style={styles.tentativeFlag}>
            <Text style={styles.tentativeText}>?</Text>
          </View>
        )}
      </Pressable>
    );
  };

  // Calculate treatment summary
  const treatmentSummary = useMemo(() => {
    const teethNeedingFillings = Object.entries(restorations).filter(([_, restoration]) => 
      restoration.surfaces.length > 0
    );
    
    const tentativeCount = teethNeedingFillings.filter(([_, restoration]) => restoration.tentative).length;
    const confirmedCount = teethNeedingFillings.length - tentativeCount;
    
    const surfaceCount = teethNeedingFillings.reduce((total, [_, restoration]) => 
      total + restoration.surfaces.length, 0
    );

    return {
      totalTeeth: teethNeedingFillings.length,
      confirmedCount,
      tentativeCount,
      surfaceCount,
      teethDetails: teethNeedingFillings.map(([toothId, restoration]) => ({
        toothId,
        surfaces: restoration.surfaces.join(''),
        tentative: restoration.tentative
      }))
    };
  }, [restorations]);

  const showDetailedReport = () => {
    const report = `
Treatment Planning - Fillings Report
Patient ID: ${patientId}

Summary:
• Total Teeth Needing Restoration: ${treatmentSummary.totalTeeth}
• Confirmed Fillings: ${treatmentSummary.confirmedCount}
• Tentative (Pending X-rays): ${treatmentSummary.tentativeCount}
• Total Surfaces Affected: ${treatmentSummary.surfaceCount}

Detailed Treatment Plan:
${treatmentSummary.teethDetails.map(tooth => 
  `• Tooth ${tooth.toothId}: ${tooth.surfaces} surfaces${tooth.tentative ? ' (Tentative)' : ''}`
).join('\n')}

${treatmentSummary.tentativeCount > 0 ? 
  '\nNote: Tentative fillings require X-ray confirmation before final treatment planning.' 
  : ''}
    `;
    
    Alert.alert('Filling Treatment Plan', report.trim());
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>🦷 Treatment Planning - Fillings</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

      {/* Treatment Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Treatment Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Teeth Needing Fillings:</Text>
          <Text style={styles.summaryValue}>{treatmentSummary.totalTeeth}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Confirmed:</Text>
          <Text style={styles.summaryValue}>{treatmentSummary.confirmedCount}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tentative (X-ray needed):</Text>
          <Text style={styles.summaryValue}>{treatmentSummary.tentativeCount}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Surfaces:</Text>
          <Text style={styles.summaryValue}>{treatmentSummary.surfaceCount}</Text>
        </View>
        
        {treatmentSummary.totalTeeth > 0 && (
          <Pressable style={styles.reportButton} onPress={showDetailedReport}>
            <Text style={styles.reportButtonText}>View Treatment Plan</Text>
          </Pressable>
        )}
      </View>

      {/* Dental Chart Container */}
      <View style={styles.dentalChart}>
        {/* Upper Arch Label */}
        <Text style={[styles.archLabel, styles.upperArchLabel]}>Upper{'\n'}Arch</Text>
        
        {/* Lower Arch Label */}
        <Text style={[styles.archLabel, styles.lowerArchLabel]}>Lower{'\n'}Arch</Text>
        
        {/* Center Instructions */}
        <Text style={styles.centerInstructions}>Tap to select{'\n'}surfaces needing{'\n'}restoration</Text>
        
        {/* Render all teeth */}
        {UPPER_RIGHT.map((toothId, index) => renderTooth(toothId, index, 'upper-right'))}
        {UPPER_LEFT.map((toothId, index) => renderTooth(toothId, index, 'upper-left'))}
        {LOWER_RIGHT.map((toothId, index) => renderTooth(toothId, index, 'lower-right'))}
        {LOWER_LEFT.map((toothId, index) => renderTooth(toothId, index, 'lower-left'))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothNormal]} />
          <Text style={styles.legendLabel}>No Restoration Needed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothNeedsRestoration]} />
          <Text style={styles.legendLabel}>Needs Restoration</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothTentative]} />
          <Text style={styles.legendLabel}>Tentative (X-ray needed)</Text>
        </View>
      </View>

      <Text style={styles.surfaceNote}>
        Surfaces: M=Mesial, D=Distal, L=Lingual, B=Buccal, O=Occlusal
      </Text>

      {/* Tooth Editor Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeToothEditor}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Edit Tooth {selectedTooth}
            </Text>
            
            <Text style={styles.sectionTitle}>Select Affected Surfaces:</Text>
            <View style={styles.surfaceButtons}>
              {SURFACES.map(surface => (
                <Pressable
                  key={surface}
                  style={[
                    styles.surfaceButton,
                    selectedTooth && restorations[selectedTooth]?.surfaces.includes(surface) && styles.surfaceButtonSelected
                  ]}
                  onPress={() => toggleSurface(surface)}
                >
                  <Text style={[
                    styles.surfaceButtonText,
                    selectedTooth && restorations[selectedTooth]?.surfaces.includes(surface) && styles.surfaceButtonTextSelected
                  ]}>
                    {surface}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[
                styles.tentativeButton,
                selectedTooth && restorations[selectedTooth]?.tentative && styles.tentativeButtonSelected
              ]}
              onPress={toggleTentative}
            >
              <Text style={[
                styles.tentativeButtonText,
                selectedTooth && restorations[selectedTooth]?.tentative && styles.tentativeButtonTextSelected
              ]}>
                🔍 Tentative (Pending X-rays)
              </Text>
            </Pressable>

            <View style={styles.modalActions}>
              <Pressable style={styles.clearButton} onPress={clearTooth}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </Pressable>
              <Pressable style={styles.doneButton} onPress={closeToothEditor}>
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default TreatmentPlanningFillingsScreen;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtext: {
    fontSize: 12,
    color: '#665',
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#665',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  reportButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  reportButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  dentalChart: {
    width: 360,
    height: 460,
    position: 'relative',
    marginBottom: 30,
  },
  archLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    position: 'absolute',
  },
  upperArchLabel: {
    top: 90,
    left: 140,
  },
  lowerArchLabel: {
    top: 300,
    left: 140,
  },
  centerInstructions: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    position: 'absolute',
    top: 190,
    left: 110,
  },
  toothCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  toothLabel: {
    color: 'white',
    fontWeight: '600',
    fontSize: 10,
  },
  surfaceIndicator: {
    position: 'absolute',
    bottom: -12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  surfaceText: {
    color: 'white',
    fontSize: 8,
    fontWeight: '600',
  },
  tentativeFlag: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ffc107',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tentativeText: {
    color: 'black',
    fontSize: 10,
    fontWeight: 'bold',
  },
  toothNormal: {
    backgroundColor: '#28a745',
  },
  toothNeedsRestoration: {
    backgroundColor: '#dc3545',
  },
  toothTentative: {
    backgroundColor: '#ffc107',
  },
  legend: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
    width: '100%',
  },
  legendCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 12,
  },
  legendLabel: {
    fontSize: 13,
    color: '#333',
  },
  surfaceNote: {
    fontSize: 12,
    color: '#665',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  surfaceButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  surfaceButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  surfaceButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  surfaceButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  surfaceButtonTextSelected: {
    color: 'white',
  },
  tentativeButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
    marginBottom: 20,
  },
  tentativeButtonSelected: {
    backgroundColor: '#ffc107',
    borderColor: '#ffc107',
  },
  tentativeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },
  tentativeButtonTextSelected: {
    color: 'black',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clearButton: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  doneButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});