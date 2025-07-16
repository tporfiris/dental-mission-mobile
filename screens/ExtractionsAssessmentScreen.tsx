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

const EXTRACTION_REASONS = ['none', 'loose', 'root-tip', 'non-restorable'] as const;
type ExtractionReason = typeof EXTRACTION_REASONS[number];

const UPPER_RIGHT = ['11', '12', '13', '14', '15', '16', '17', '18'];
const UPPER_LEFT = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_RIGHT = ['41', '42', '43', '44', '45', '46', '47', '48'];
const LOWER_LEFT = ['31', '32', '33', '34', '35', '36', '37', '38'];

const initialExtractions: Record<string, ExtractionReason> = {};
[
  ...UPPER_RIGHT, ...UPPER_LEFT,
  ...LOWER_RIGHT, ...LOWER_LEFT,
].forEach(id => {
  initialExtractions[id] = 'none';
});

const REASON_LABELS = {
  'none': 'No Extraction',
  'loose': 'Loose',
  'root-tip': 'Root Tip',
  'non-restorable': 'Non-Restorable'
};

const REASON_ABBREVIATIONS = {
  'none': '',
  'loose': 'L',
  'root-tip': 'RT',
  'non-restorable': 'NR'
};

const ExtractionTreatmentPlanningScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  const [extractions, setExtractions] = useState(initialExtractions);
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

  const setExtractionReason = (reason: ExtractionReason) => {
    if (!selectedTooth) return;
    
    setExtractions(prev => ({
      ...prev,
      [selectedTooth]: reason
    }));
    closeToothEditor();
  };

  const quickToggleExtraction = (toothId: string) => {
    setExtractions(prev => ({
      ...prev,
      [toothId]: prev[toothId] === 'none' ? 'non-restorable' : 'none'
    }));
  };

  const getToothStyle = (reason: ExtractionReason) => {
    switch (reason) {
      case 'none':
        return styles.toothNormal;
      case 'loose':
        return styles.toothLoose;
      case 'root-tip':
        return styles.toothRootTip;
      case 'non-restorable':
        return styles.toothNonRestorable;
    }
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
    const reason = extractions[toothId];
    
    return (
      <Pressable
        key={toothId}
        onPress={() => openToothEditor(toothId)}
        onLongPress={() => quickToggleExtraction(toothId)}
        style={[
          styles.toothCircle,
          getToothStyle(reason),
          {
            position: 'absolute',
            left: position.left,
            top: position.top,
          }
        ]}
      >
        <Text style={styles.toothLabel}>{toothId}</Text>
        {reason !== 'none' && (
          <View style={styles.reasonIndicator}>
            <Text style={styles.reasonText}>
              {REASON_ABBREVIATIONS[reason]}
            </Text>
          </View>
        )}
        {reason !== 'none' && (
          <View style={styles.extractionFlag}>
            <Text style={styles.extractionText}>✖</Text>
          </View>
        )}
      </Pressable>
    );
  };

  // Calculate extraction summary
  const extractionSummary = useMemo(() => {
    const extractionList = Object.entries(extractions).filter(([_, reason]) => reason !== 'none');
    
    const byReason = {
      loose: extractionList.filter(([_, reason]) => reason === 'loose'),
      'root-tip': extractionList.filter(([_, reason]) => reason === 'root-tip'),
      'non-restorable': extractionList.filter(([_, reason]) => reason === 'non-restorable'),
    };

    return {
      totalExtractions: extractionList.length,
      byReason,
      extractionList: extractionList.map(([toothId, reason]) => ({
        toothId,
        reason: REASON_LABELS[reason]
      })).sort((a, b) => parseInt(a.toothId) - parseInt(b.toothId))
    };
  }, [extractions]);

  const showExtractionList = () => {
    if (extractionSummary.totalExtractions === 0) {
      Alert.alert('Extraction List', 'No teeth currently marked for extraction.');
      return;
    }

    const report = `
Extraction Treatment Plan
Patient ID: ${patientId}

Total Extractions Planned: ${extractionSummary.totalExtractions}

Breakdown by Reason:
• Loose Teeth: ${extractionSummary.byReason.loose.length}
• Root Tips: ${extractionSummary.byReason['root-tip'].length}
• Non-Restorable: ${extractionSummary.byReason['non-restorable'].length}

Detailed Extraction List:
${extractionSummary.extractionList.map(item => 
  `• Tooth ${item.toothId}: ${item.reason}`
).join('\n')}

Priority Notes:
${extractionSummary.byReason['root-tip'].length > 0 ? '⚠️ Root tips should be prioritized to prevent infection.\n' : ''}${extractionSummary.byReason.loose.length > 0 ? '🦷 Loose teeth may be easily extracted.\n' : ''}${extractionSummary.byReason['non-restorable'].length > 0 ? '🔧 Non-restorable teeth require careful assessment.' : ''}
    `;
    
    Alert.alert('Extraction Treatment Plan', report.trim());
  };

  const clearAllExtractions = () => {
    Alert.alert(
      'Clear All Extractions',
      'Are you sure you want to clear all extraction markings?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: () => setExtractions(initialExtractions)
        }
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>🦷 Treatment Planning - Extractions</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

      {/* Extraction Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Extraction Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Extractions:</Text>
          <Text style={styles.summaryValue}>{extractionSummary.totalExtractions}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Loose Teeth:</Text>
          <Text style={styles.summaryValue}>{extractionSummary.byReason.loose.length}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Root Tips:</Text>
          <Text style={styles.summaryValue}>{extractionSummary.byReason['root-tip'].length}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Non-Restorable:</Text>
          <Text style={styles.summaryValue}>{extractionSummary.byReason['non-restorable'].length}</Text>
        </View>
        
        <View style={styles.buttonRow}>
          {extractionSummary.totalExtractions > 0 && (
            <Pressable style={styles.reportButton} onPress={showExtractionList}>
              <Text style={styles.reportButtonText}>View Extraction List</Text>
            </Pressable>
          )}
          {extractionSummary.totalExtractions > 0 && (
            <Pressable style={styles.clearButton} onPress={clearAllExtractions}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Dental Chart Container */}
      <View style={styles.dentalChart}>
        {/* Upper Arch Label */}
        <Text style={[styles.archLabel, styles.upperArchLabel]}>Upper{'\n'}Arch</Text>
        
        {/* Lower Arch Label */}
        <Text style={[styles.archLabel, styles.lowerArchLabel]}>Lower{'\n'}Arch</Text>
        
        {/* Center Instructions */}
        <Text style={styles.centerInstructions}>Tap to mark{'\n'}for extraction{'\n'}Long press for{'\n'}quick toggle</Text>
        
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
          <Text style={styles.legendLabel}>No Extraction Needed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothLoose]} />
          <Text style={styles.legendLabel}>Loose (L)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothRootTip]} />
          <Text style={styles.legendLabel}>Root Tip (RT)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothNonRestorable]} />
          <Text style={styles.legendLabel}>Non-Restorable (NR)</Text>
        </View>
      </View>

      <Text style={styles.instructionNote}>
        Tap: Select extraction reason • Long press: Quick toggle non-restorable
      </Text>

      {/* Extraction Reason Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeToothEditor}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Tooth {selectedTooth} - Extraction Assessment
            </Text>
            
            <Text style={styles.sectionTitle}>Select Extraction Reason:</Text>
            
            {EXTRACTION_REASONS.map(reason => (
              <Pressable
                key={reason}
                style={[
                  styles.reasonButton,
                  reason === 'none' && styles.reasonButtonNone,
                  reason === 'loose' && styles.reasonButtonLoose,
                  reason === 'root-tip' && styles.reasonButtonRootTip,
                  reason === 'non-restorable' && styles.reasonButtonNonRestorable,
                ]}
                onPress={() => setExtractionReason(reason)}
              >
                <Text style={styles.reasonButtonText}>
                  {reason === 'none' ? '✓ ' : '✖ '}{REASON_LABELS[reason]}
                </Text>
                {reason !== 'none' && (
                  <Text style={styles.reasonDescription}>
                    {reason === 'loose' && 'Tooth is mobile and easily extractable'}
                    {reason === 'root-tip' && 'Only root fragment remains'}
                    {reason === 'non-restorable' && 'Too damaged to restore'}
                  </Text>
                )}
              </Pressable>
            ))}

            <Pressable style={styles.cancelButton} onPress={closeToothEditor}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default ExtractionTreatmentPlanningScreen;

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
    color: '#666',
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
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  reportButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flex: 1,
    marginRight: 8,
  },
  reportButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  clearButton: {
    backgroundColor: '#dc3545',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flex: 1,
    marginLeft: 8,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
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
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    position: 'absolute',
    top: 185,
    left: 105,
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
  reasonIndicator: {
    position: 'absolute',
    bottom: -12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  reasonText: {
    color: 'white',
    fontSize: 7,
    fontWeight: '600',
  },
  extractionFlag: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#dc3545',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  extractionText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  toothNormal: {
    backgroundColor: '#28a745',
  },
  toothLoose: {
    backgroundColor: '#ffc107',
  },
  toothRootTip: {
    backgroundColor: '#6f42c1',
  },
  toothNonRestorable: {
    backgroundColor: '#dc3545',
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
  instructionNote: {
    fontSize: 12,
    color: '#666',
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
    marginBottom: 16,
    color: '#333',
  },
  reasonButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 2,
  },
  reasonButtonNone: {
    backgroundColor: '#f8f9fa',
    borderColor: '#28a745',
  },
  reasonButtonLoose: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
  },
  reasonButtonRootTip: {
    backgroundColor: '#f3e5f5',
    borderColor: '#6f42c1',
  },
  reasonButtonNonRestorable: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
  },
  reasonButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reasonDescription: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});