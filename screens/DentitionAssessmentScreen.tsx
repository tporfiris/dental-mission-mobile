import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { database } from '../db'; // adjust path if needed
import DentitionAssessment from '../models/DentitionAssessment';
import { Q } from '@nozbe/watermelondb';
import uuid from 'react-native-uuid';
import { useDentitionAssessment } from '../contexts/DentitionAssessmentContext';

const TOOTH_STATES = ['present', 'crown-missing', 'fully-missing'] as const;
type ToothState = typeof TOOTH_STATES[number];

const UPPER_RIGHT = ['11', '12', '13', '14', '15', '16', '17', '18'];
const UPPER_LEFT = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_RIGHT = ['41', '42', '43', '44', '45', '46', '47', '48'];
const LOWER_LEFT = ['31', '32', '33', '34', '35', '36', '37', '38'];

const initialToothStates: Record<string, ToothState> = {};
[
  ...UPPER_RIGHT, ...UPPER_LEFT,
  ...LOWER_RIGHT, ...LOWER_LEFT,
].forEach(id => {
  initialToothStates[id] = 'present';
});

const DentitionAssessmentScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  // const [toothStates, setToothStates] = useState(initialToothStates);
  const { toothStates, setToothStates } = useDentitionAssessment();

  const cycleToothState = (toothId: string) => {
    setToothStates(prev => {
      const currentIndex = TOOTH_STATES.indexOf(prev[toothId]);
      const nextState = TOOTH_STATES[(currentIndex + 1) % TOOTH_STATES.length];
      return { ...prev, [toothId]: nextState };
    });
  };

  const saveAssessment = async () => {
    try {
      const collection = database.get<DentitionAssessment>('dentition_assessments');
      console.log('🔎 Looking for existing assessment for patient:', patientId);
      const existing = await collection
      .query(Q.where('patient_id', Q.eq(patientId)))
      .fetch();

      console.log('🔍 Matched existing assessment:', existing);
  
      const jsonData = JSON.stringify(toothStates);
  
      await database.write(async () => {
        console.log("existing:")
        console.log(existing)
        console.log("existing length:")
        console.log(existing.length)
        if (existing.length > 0) {
          console.log('🔍 Existing assessments for patient', patientId, ':', existing);
          // Update existing record
          await existing[0].update(record => {
            record.data = jsonData;
            record.updatedAt = new Date();
          });
          console.log('✅ Dentition assessment updated');
          alert('✅ Dentition assessment updated');
        } else {
          // Create new record
          await collection.create(record => {
            const id = uuid.v4();
            record._raw.id = id;
            record.patientId = patientId;// must match schema!
            record.data = jsonData;
            record.createdAt = new Date();
            record.updatedAt = new Date();
            // record.patient.set(patientId);
            alert('✅ Dentition assessment created')
            console.log('🔧 Created assessment record:', {
              id,
              patient_id: patientId,
              data: jsonData,
            });
          });
        }
      });
    } catch (err) {
      console.error('❌ Failed to save dentition assessment:', err);
    }
  };
  
  

  const getToothStyle = (state: ToothState) => {
    switch (state) {
      case 'present':
        return styles.toothPresent;
      case 'crown-missing':
        return styles.toothCrownMissing;
      case 'fully-missing':
        return styles.toothFullyMissing;
    }
  };

  const getToothPosition = (toothId: string, index: number, section: 'upper-right' | 'upper-left' | 'lower-right' | 'lower-left') => {
    const centerX = 160; // Center of the oval
    const centerY = 210; // Center of the oval
    const radiusX = 140; // Horizontal radius
    const radiusY = 200; // Vertical radius
    
    let angle = 0;
    
    switch (section) {
      case 'upper-right':
        // Upper right quadrant: from center to right (teeth 11-18)
        angle = (index * Math.PI / 14); // Spacing for 8 teeth
        break;
      case 'upper-left':
        // Upper left quadrant: from center to left (teeth 21-28)
        angle = Math.PI - (index * Math.PI / 14); // Spacing for 8 teeth
        break;
      case 'lower-right':
        // Lower right quadrant: from center to right (teeth 41-48)
        angle = (Math.PI * 2) - (index * Math.PI / 14); // Spacing for 8 teeth
        break;
      case 'lower-left':
        // Lower left quadrant: from center to left (teeth 31-38)
        angle = Math.PI + (index * Math.PI / 14); // Spacing for 8 teeth
        break;
    }
    
    const x = centerX + radiusX * Math.cos(angle);
    const y = centerY + radiusY * Math.sin(angle);
    
    return { left: x - 15, top: y - 15 }; // Subtract half of tooth circle size
  };

  const renderTooth = (toothId: string, index: number, section: 'upper-right' | 'upper-left' | 'lower-right' | 'lower-left') => {
    const position = getToothPosition(toothId, index, section);
    
    return (
      <Pressable
        key={toothId}
        onPress={() => cycleToothState(toothId)}
        style={[
          styles.toothCircle,
          getToothStyle(toothStates[toothId]),
          {
            position: 'absolute',
            left: position.left,
            top: position.top,
          }
        ]}
      >
        <Text style={styles.toothLabel}>{toothId}</Text>
      </Pressable>
    );
  };

  return (    
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>🦷 Dentition Assessment</Text>
      <Text style={styles.subtext}>Patient ID: {patientId}</Text>

      {/* Dental Chart Container */}
      <View style={styles.dentalChart}>
        {/* Upper Arch Label */}
        <Text style={[styles.archLabel, styles.upperArchLabel]}>Upper{'\n'}Arch</Text>
        
        {/* Lower Arch Label */}
        <Text style={[styles.archLabel, styles.lowerArchLabel]}>Lower{'\n'}Arch</Text>
        
        {/* Center Instructions */}
        <Text style={styles.centerInstructions}>Tap to{'\n'}change tooth{'\n'}status</Text>
        
        {/* Render all teeth */}
        {UPPER_RIGHT.map((toothId, index) => renderTooth(toothId, index, 'upper-right'))}
        {UPPER_LEFT.map((toothId, index) => renderTooth(toothId, index, 'upper-left'))}
        {LOWER_RIGHT.map((toothId, index) => renderTooth(toothId, index, 'lower-right'))}
        {LOWER_LEFT.map((toothId, index) => renderTooth(toothId, index, 'lower-left'))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothPresent]} />
          <Text style={styles.legendLabel}>Present</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothCrownMissing]} />
          <Text style={styles.legendLabel}>Crown Missing</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, styles.toothFullyMissing]} />
          <Text style={styles.legendLabel}>Fully Missing</Text>
        </View>
      </View>
      <Pressable style={styles.saveButton} onPress={saveAssessment}>
        <Text style={styles.saveButtonText}>Save Assessment</Text>
      </Pressable>
    </ScrollView>
  );
};

export default DentitionAssessmentScreen;

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
    marginBottom: 20,
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
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    position: 'absolute',
    top: 195,
    left: 120,
  },
  toothCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toothLabel: {
    color: 'white',
    fontWeight: '600',
    fontSize: 10,
  },
  toothPresent: {
    backgroundColor: '#4CAF50',
  },
  toothCrownMissing: {
    backgroundColor: '#FFC107',
  },
  toothFullyMissing: {
    backgroundColor: '#F44336',
  },
  legend: {
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  legendCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 8,
  },
  legendLabel: {
    fontSize: 14,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },  
});