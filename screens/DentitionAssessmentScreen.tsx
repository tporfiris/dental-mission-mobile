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
  const { toothStates, setToothStates } = useDentitionAssessment();

  // Updated tooth positions - centered around origin with offset applied
  const toothOffsets: Record<string, { x: number; y: number }> = {
    // Upper arch - symmetric pairs
    '21': { x: 20, y: -120 },   // Upper right central
    '11': { x: -20, y: -120 },  // Upper left central (mirrored)
    '22': { x: 55, y: -110 },   // Upper right lateral  
    '12': { x: -55, y: -110 },  // Upper left lateral (mirrored)
    '23': { x: 90, y: -90 },    // Upper right canine
    '13': { x: -90, y: -90 },   // Upper left canine (mirrored)
    '24': { x: 110, y: -60 },   // Upper right first premolar
    '14': { x: -110, y: -60 },  // Upper left first premolar (mirrored)
    '25': { x: 120, y: -25 },   // Upper right second premolar
    '15': { x: -120, y: -25 },  // Upper left second premolar (mirrored)
    '26': { x: 125, y: 10 },    // Upper right first molar
    '16': { x: -125, y: 10 },   // Upper left first molar (mirrored)
    '27': { x: 125, y: 45 },    // Upper right second molar
    '17': { x: -125, y: 45 },   // Upper left second molar (mirrored)
    '28': { x: 125, y: 80 },    // Upper right third molar (wisdom)
    '18': { x: -125, y: 80 },   // Upper left third molar (mirrored)
    
    // Lower arch - symmetric pairs
    '31': { x: 20, y: 330 },    // Lower right central
    '41': { x: -20, y: 330 },   // Lower left central (mirrored)
    '32': { x: 55, y: 320 },    // Lower right lateral
    '42': { x: -55, y: 320 },   // Lower left lateral (mirrored)
    '33': { x: 90, y: 300 },    // Lower right canine
    '43': { x: -90, y: 300 },   // Lower left canine (mirrored)
    '34': { x: 110, y: 270 },   // Lower right first premolar
    '44': { x: -110, y: 270 },  // Lower left first premolar (mirrored)
    '35': { x: 120, y: 235 },   // Lower right second premolar
    '45': { x: -120, y: 235 },  // Lower left second premolar (mirrored)
    '36': { x: 125, y: 200 },   // Lower right first molar
    '46': { x: -125, y: 200 },  // Lower left first molar (mirrored)
    '37': { x: 125, y: 165 },   // Lower right second molar
    '47': { x: -125, y: 165 },  // Lower left second molar (mirrored)
    '38': { x: 125, y: 130 },   // Lower right third molar (wisdom)
    '48': { x: -125, y: 130 },  // Lower left third molar (mirrored)
  };

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

  const getToothPosition = (toothId: string) => {
    const chartCenter = { x: 180, y: 135 }; // Center of the chart container
    const offset = toothOffsets[toothId];
    
    return {
      left: chartCenter.x + offset.x - 15, // -15 to center the 30px circle
      top: chartCenter.y + offset.y - 15
    };
  };

  const renderTooth = (toothId: string) => {
    const position = getToothPosition(toothId);
    
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
        <Text style={styles.upperArchLabel}>Upper Arch</Text>
        
        {/* Lower Arch Label */}
        <Text style={styles.lowerArchLabel}>Lower Arch</Text>
        
        {/* Center Instructions */}
        <Text style={styles.centerInstructions}>Tap to change{'\n'}tooth status</Text>
        
        {/* Render all teeth */}
        {[...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_RIGHT, ...LOWER_LEFT].map(toothId => 
          renderTooth(toothId)
        )}
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
    height: 480,
    position: 'relative',
    marginBottom: 30,
  },
  upperArchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    position: 'absolute',
    top: 50,
    left: 150,
    width: 60,
  },
  lowerArchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    position: 'absolute',
    top: 390,
    left: 150,
    width: 60,
  },
  centerInstructions: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    position: 'absolute',
    top: 200,
    left: 130,
    width: 100,
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
    backgroundColor: 'rgba(108, 117, 125, 0.3)', // Transparent gray
    borderWidth: 2,
    borderColor: '#6c757d', // Gray border for definition
  },
  legend: {
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 20,
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