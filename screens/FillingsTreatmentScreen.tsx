// Enhanced Filling Treatment Screen with ODA Fee Structure

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { database } from '../db';
import Treatment from '../db/models/Treatment';
import uuid from 'react-native-uuid';

import { useFillingsTreatment } from '../contexts/FillingsTreatmentContext';

// Get screen dimensions for responsive scaling
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive scaling functions
const scaleWidth = (size: number) => (SCREEN_WIDTH / 390) * size;
const scaleHeight = (size: number) => (SCREEN_HEIGHT / 844) * size;
const scaleFontSize = (size: number) => Math.round(scaleWidth(size));

// Chart dimensions that scale with screen size
const CHART_WIDTH = Math.min(SCREEN_WIDTH * 0.92, 360);
const CHART_HEIGHT = CHART_WIDTH * 1.33;


// ODA Fee Structure for Filling Treatments
const ODA_FEES = {
  amalgam: {
    primary: {
      1: { code: '21121', price: 205 },
      2: { code: '21122', price: 256 },
      3: { code: '21123', price: 308 },
      4: { code: '21124', price: 379 },
      5: { code: '21125', price: 400 },
    },
    permanent: {
      anterior: { // 11-15, 21-25, 31-35, 41-45
        1: { code: '21231', price: 205 },
        2: { code: '21232', price: 256 },
        3: { code: '21233', price: 308 },
        4: { code: '21234', price: 379 },
        5: { code: '21235', price: 400 },
      },
      posterior: { // 16-18, 26-28, 36-38, 46-48
        1: { code: '21241', price: 246 },
        2: { code: '21242', price: 308 },
        3: { code: '21243', price: 369 },
        4: { code: '21244', price: 451 },
        5: { code: '21245', price: 477 },
      },
    },
  },
  compositeResin: {
    primary: {
      anterior: { // 51-53, 61-63, 71-73, 81-83
        1: { code: '23411', price: 205 },
        2: { code: '23412', price: 256 },
        3: { code: '23413', price: 308 },
        4: { code: '23414', price: 379 },
        5: { code: '23415', price: 400 },
      },
      posterior: { // 54-55, 64-65, 74-75, 84-85
        1: { code: '23511', price: 226 },
        2: { code: '23512', price: 283 },
        3: { code: '23513', price: 339 },
        4: { code: '23514', price: 414 },
        5: { code: '23515', price: 435 },
      },
    },
    permanent: {
      anteriorIncisors: { // 11-13, 21-23, 31-33, 41-43
        1: { code: '23111', price: 205 },
        2: { code: '23112', price: 256 },
        3: { code: '23113', price: 308 },
        4: { code: '23114', price: 379 },
        5: { code: '23115', price: 400 },
      },
      premolars: { // 14-15, 24-25, 34-35, 44-45
        1: { code: '23311', price: 226 },
        2: { code: '23312', price: 283 },
        3: { code: '23313', price: 339 },
        4: { code: '23314', price: 414 },
        5: { code: '23315', price: 435 },
      },
      molars: { // 16-18, 26-28, 36-38, 46-48
        1: { code: '23321', price: 246 },
        2: { code: '23322', price: 308 },
        3: { code: '23323', price: 369 },
        4: { code: '23324', price: 451 },
        5: { code: '23325', price: 477 },
      },
    },
  },
  crown: {
    primary: {
      metal: { code: '22211', price: 285 },
    },
    permanent: {
      metal: { code: '27301', price: 1099 },
      porcelain: { code: '27201', price: 1099 },
      PFM: { code: '27211', price: 1099 },
    },
  },
  rootCanal: {
    primary: {
      1: { code: '33401', price: 261 },
      2: { code: '33402', price: 350 },
      3: { code: '33403', price: 350 },
    },
    permanent: {
      1: { code: '33111', price: 732 },
      2: { code: '33121', price: 906 },
      3: { code: '33131', price: 1209 },
      4: { code: '33141', price: 1412 },
    },
  },
};

// Helper functions
const getToothCategory = (toothId: string, isPrimary: boolean) => {
  if (isPrimary) {
    const primaryNumber = parseInt(toothId);
    if ([51, 52, 53, 61, 62, 63, 71, 72, 73, 81, 82, 83].includes(primaryNumber)) {
      return 'anterior';
    }
    return 'posterior';
  } else {
    const toothNumber = parseInt(toothId);
    const lastDigit = toothNumber % 10;
    
    if ([1, 2, 3].includes(lastDigit)) {
      return 'anteriorIncisors';
    } else if ([4, 5].includes(lastDigit)) {
      return 'premolars';
    } else if ([6, 7, 8].includes(lastDigit)) {
      return 'molars';
    }
  }
  return 'anteriorIncisors';
};

const getAmalgamToothCategory = (toothId: string) => {
  const toothNumber = parseInt(toothId);
  const lastDigit = toothNumber % 10;
  
  if ([1, 2, 3, 4, 5].includes(lastDigit)) {
    return 'anterior';
  } else if ([6, 7, 8].includes(lastDigit)) {
    return 'posterior';
  }
  return 'anterior';
};

const canSwitchToPrimary = (toothId: string): boolean => {
  const permanentTeeth = ['11', '12', '13', '14', '15', '21', '22', '23', '24', '25', 
                          '41', '42', '43', '44', '45', '31', '32', '33', '34', '35'];
  return permanentTeeth.includes(toothId);
};

// Constants and Types
const SURFACES = ['M', 'O', 'D', 'B', 'L'] as const;
type Surface = typeof SURFACES[number];

const FILLING_MATERIALS = ['amalgam', 'composite resin'] as const;
type FillingMaterial = typeof FILLING_MATERIALS[number];

const CROWN_MATERIALS = ['metal', 'porcelain', 'PFM'] as const;
type CrownMaterial = typeof CROWN_MATERIALS[number];

const PREP_DEPTHS = ['shallow', 'medium', 'deep'] as const;
type PrepDepth = typeof PREP_DEPTHS[number];

const CANAL_COUNTS = [1, 2, 3, 4] as const;
type CanalCount = typeof CANAL_COUNTS[number];

const UPPER_RIGHT = ['11', '12', '13', '14', '15', '16', '17', '18'];
const UPPER_LEFT = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_RIGHT = ['41', '42', '43', '44', '45', '46', '47', '48'];
const LOWER_LEFT = ['31', '32', '33', '34', '35', '36', '37', '38'];

// Primary tooth conversion mappings
const PRIMARY_TOOTH_MAPPINGS = {
  '11': '51', '12': '52', '13': '53', '14': '54', '15': '55',
  '21': '61', '22': '62', '23': '63', '24': '64', '25': '65',
  '41': '81', '42': '82', '43': '83', '44': '84', '45': '85',
  '31': '71', '32': '72', '33': '73', '34': '74', '35': '75',
  '51': '11', '52': '12', '53': '13', '54': '14', '55': '15',
  '61': '21', '62': '22', '63': '23', '64': '24', '65': '25',
  '81': '41', '82': '42', '83': '43', '84': '44', '85': '45',
  '71': '31', '72': '32', '73': '33', '74': '34', '75': '35',
};

interface ToothTreatment {
  surfaces: Surface[];
  fillingMaterial: FillingMaterial | null;
  prepDepth: PrepDepth | null;
  hasCracks: boolean | null;
  crownIndicated: boolean | null;
  crownMaterial: CrownMaterial | null;
  rootCanalDone: boolean;
  canalCount: CanalCount | null;
  completed: boolean;
}

const defaultToothTreatment: ToothTreatment = {
  surfaces: [],
  fillingMaterial: null,
  prepDepth: null,
  hasCracks: null,
  crownIndicated: null,
  crownMaterial: null,
  rootCanalDone: false,
  canalCount: null,
  completed: false,
};

const FillingsTreatmentScreen = ({ route }: any) => {
  const { patientId } = route.params || { patientId: 'DEMO' };
  const { user } = useAuth();
  // Inside your FillingsTreatmentScreen component:
  const { getOptimizedTreatmentData } = useFillingsTreatment(); // ✅ ADD THIS

  // Initialize all teeth with default treatment state
  const initializeTeethStates = () => {
    const initialStates: Record<string, ToothTreatment> = {};
    [...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_RIGHT, ...LOWER_LEFT].forEach(toothId => {
      initialStates[toothId] = { ...defaultToothTreatment };
    });
    return initialStates;
  };

  // State variables
  const [treatments, setTreatments] = useState<Record<string, ToothTreatment>>(initializeTeethStates);
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [notes, setNotes] = useState('');
  const [allCompleted, setAllCompleted] = useState(false);
  const [completedAt, setCompletedAt] = useState<Date | null>(null);
  const [primaryTeeth, setPrimaryTeeth] = useState<Set<string>>(new Set());
  const [toothBackup, setToothBackup] = useState<ToothTreatment | null>(null);

  // Helper functions for tooth management
  const getCurrentToothId = (originalToothId: string): string => {
    if (primaryTeeth.has(originalToothId) && PRIMARY_TOOTH_MAPPINGS[originalToothId]) {
      return PRIMARY_TOOTH_MAPPINGS[originalToothId];
    }
    return originalToothId;
  };

  const toggleToothType = (originalToothId: string) => {
    if (!canSwitchToPrimary(originalToothId)) return;
    
    setPrimaryTeeth(prev => {
      const newSet = new Set(prev);
      if (newSet.has(originalToothId)) {
        newSet.delete(originalToothId);
      } else {
        newSet.add(originalToothId);
      }
      return newSet;
    });
  };

  // Treatment management functions
  const toggleSurface = (toothId: string, surface: Surface) => {
    setTreatments(prev => {
      const treatment = prev[toothId];
      const newSurfaces = treatment.surfaces.includes(surface)
        ? treatment.surfaces.filter(s => s !== surface)
        : [...treatment.surfaces, surface].sort();
      
      return {
        ...prev,
        [toothId]: { ...treatment, surfaces: newSurfaces }
      };
    });
  };

  const updateTreatment = (toothId: string, updates: Partial<ToothTreatment>) => {
    setTreatments(prev => ({
      ...prev,
      [toothId]: { ...prev[toothId], ...updates }
    }));
  };

  const clearTooth = (toothId: string) => {
    setTreatments(prev => ({
      ...prev,
      [toothId]: { ...defaultToothTreatment }
    }));
  };

  // Modal control functions
  const openToothModal = (toothId: string) => {
    setSelectedTooth(toothId);
    // Backup current tooth state
    setToothBackup({ ...treatments[toothId] });
    setModalVisible(true);
  };

  const cancelToothModal = () => {
    // Restore backed-up tooth state
    if (selectedTooth && toothBackup) {
      setTreatments(prev => ({
        ...prev,
        [selectedTooth]: { ...toothBackup }
      }));
    }
    setModalVisible(false);
    setToothBackup(null);
  };

  const doneToothModal = () => {
    // Keep changes and close
    setModalVisible(false);
    setToothBackup(null);
  };

  // Summary calculation functions
  const getCompletedTreatments = () => {
    return Object.entries(treatments).filter(([_, treatment]) => 
      treatment.surfaces.length > 0 || treatment.rootCanalDone
    );
  };

  const getTotalSurfaceCount = () => {
    return Object.values(treatments).reduce((total, treatment) => 
      total + treatment.surfaces.length, 0
    );
  };

  // Calculate ODA billing codes and total cost
  const calculateODABilling = () => {
    const billingCodes: Array<{
      toothId: string;
      code: string;
      description: string;
      category: string;
      price: number;
    }> = [];

    let totalCost = 0;

    Object.entries(treatments).forEach(([toothId, treatment]) => {
      const isPrimary = primaryTeeth.has(toothId);
      const displayToothId = getCurrentToothId(toothId);
      
      // Filling codes
      if (treatment.surfaces.length > 0 && treatment.fillingMaterial) {
        const surfaceCount = Math.min(treatment.surfaces.length, 5);
        const material = treatment.fillingMaterial;
        
        let feeInfo = null;
        let description = '';
        
        if (material === 'amalgam') {
          if (isPrimary) {
            feeInfo = ODA_FEES.amalgam.primary[surfaceCount as keyof typeof ODA_FEES.amalgam.primary];
            description = `Amalgam filling - ${surfaceCount} surface${surfaceCount > 1 ? 's' : ''} (Primary tooth ${displayToothId})`;
          } else {
            const category = getAmalgamToothCategory(toothId);
            const categoryFees = ODA_FEES.amalgam.permanent[category as keyof typeof ODA_FEES.amalgam.permanent];
            feeInfo = categoryFees[surfaceCount as keyof typeof categoryFees];
            description = `Amalgam filling - ${surfaceCount} surface${surfaceCount > 1 ? 's' : ''} (Tooth ${displayToothId})`;
          }
        } else if (material === 'composite resin') {
          if (isPrimary) {
            const category = getToothCategory(displayToothId, true);
            const categoryFees = ODA_FEES.compositeResin.primary[category as keyof typeof ODA_FEES.compositeResin.primary];
            feeInfo = categoryFees[surfaceCount as keyof typeof categoryFees];
            description = `Composite resin filling - ${surfaceCount} surface${surfaceCount > 1 ? 's' : ''} (Primary tooth ${displayToothId})`;
          } else {
            const category = getToothCategory(toothId, false);
            const categoryFees = ODA_FEES.compositeResin.permanent[category as keyof typeof ODA_FEES.compositeResin.permanent];
            feeInfo = categoryFees[surfaceCount as keyof typeof categoryFees];
            description = `Composite resin filling - ${surfaceCount} surface${surfaceCount > 1 ? 's' : ''} (Tooth ${displayToothId})`;
          }
        }
        
        if (feeInfo) {
          billingCodes.push({ 
            toothId: displayToothId, 
            code: feeInfo.code, 
            description, 
            category: 'Restorative',
            price: feeInfo.price
          });
          totalCost += feeInfo.price;
        }
      }

      // Root canal codes
      if (treatment.rootCanalDone && treatment.canalCount) {
        let feeInfo = null;
        let description = '';
        
        if (isPrimary) {
          const canalCount = Math.min(treatment.canalCount, 3);
          feeInfo = ODA_FEES.rootCanal.primary[canalCount as keyof typeof ODA_FEES.rootCanal.primary];
          description = `Root canal therapy - ${canalCount} canal${canalCount > 1 ? 's' : ''} (Primary tooth ${displayToothId})`;
        } else {
          feeInfo = ODA_FEES.rootCanal.permanent[treatment.canalCount as keyof typeof ODA_FEES.rootCanal.permanent];
          description = `Root canal therapy - ${treatment.canalCount} canal${treatment.canalCount > 1 ? 's' : ''} (Tooth ${displayToothId})`;
        }
        
        if (feeInfo) {
          billingCodes.push({
            toothId: displayToothId,
            code: feeInfo.code,
            description,
            category: 'Endodontics',
            price: feeInfo.price
          });
          totalCost += feeInfo.price;
        }
      }

      // Crown codes
      if (treatment.crownIndicated && treatment.crownMaterial) {
        let feeInfo = null;
        let description = '';
        
        if (isPrimary) {
          feeInfo = ODA_FEES.crown.primary.metal;
          description = `Metal crown (Primary tooth ${displayToothId})`;
        } else {
          feeInfo = ODA_FEES.crown.permanent[treatment.crownMaterial as keyof typeof ODA_FEES.crown.permanent];
          description = `${treatment.crownMaterial.charAt(0).toUpperCase() + treatment.crownMaterial.slice(1)} crown (Tooth ${displayToothId})`;
        }
        
        if (feeInfo) {
          billingCodes.push({ 
            toothId: displayToothId, 
            code: feeInfo.code, 
            description, 
            category: 'Prosthodontics',
            price: feeInfo.price
          });
          totalCost += feeInfo.price;
        }
      }
    });

    return { billingCodes, totalCost };
  };

  const { billingCodes, totalCost } = calculateODABilling();

  // FillingsTreatmentScreen.tsx - PART 5 (Dental Chart & Tooth Rendering)

  // Tooth positions for dental chart
  const toothOffsets: Record<string, { x: number; y: number }> = {
    // Upper arch
    '21': { x: 20, y: -120 }, '11': { x: -20, y: -120 },
    '22': { x: 55, y: -110 }, '12': { x: -55, y: -110 },
    '23': { x: 90, y: -90 }, '13': { x: -90, y: -90 },
    '24': { x: 110, y: -60 }, '14': { x: -110, y: -60 },
    '25': { x: 120, y: -25 }, '15': { x: -120, y: -25 },
    '26': { x: 125, y: 10 }, '16': { x: -125, y: 10 },
    '27': { x: 125, y: 45 }, '17': { x: -125, y: 45 },
    '28': { x: 125, y: 80 }, '18': { x: -125, y: 80 },
    // Lower arch
    '31': { x: 20, y: 330 }, '41': { x: -20, y: 330 },
    '32': { x: 55, y: 320 }, '42': { x: -55, y: 320 },
    '33': { x: 90, y: 300 }, '43': { x: -90, y: 300 },
    '34': { x: 110, y: 270 }, '44': { x: -110, y: 270 },
    '35': { x: 120, y: 235 }, '45': { x: -120, y: 235 },
    '36': { x: 125, y: 200 }, '46': { x: -125, y: 200 },
    '37': { x: 125, y: 165 }, '47': { x: -125, y: 165 },
    '38': { x: 125, y: 130 }, '48': { x: -125, y: 130 },
  };

  const getToothPosition = (toothId: string) => {
    const chartCenter = { x: CHART_WIDTH / 2, y: CHART_HEIGHT / 2.85 };
    const offset = toothOffsets[toothId];
    const scale = CHART_WIDTH / 360;
    const toothSize = scaleWidth(30);
    
    return {
      left: chartCenter.x + (offset.x * scale) - (toothSize / 2),
      top: chartCenter.y + (offset.y * scale) - (toothSize / 2)
    };
  };
  const getToothStyle = (toothId: string) => {
    const treatment = treatments[toothId];
    if (treatment.completed) return styles.toothCompleted;
    if (treatment.surfaces.length > 0 || treatment.rootCanalDone) return styles.toothTreated;
    return styles.toothNormal;
  };

  const getToothStatusText = (toothId: string) => {
    const treatment = treatments[toothId];
    const indicators = [];
    
    if (treatment.surfaces.length > 0) {
      indicators.push(treatment.surfaces.join(''));
      if (treatment.fillingMaterial) {
        const materialAbbrev = {
          'amalgam': 'A',
          'composite resin': 'CR'
        };
        indicators.push(materialAbbrev[treatment.fillingMaterial]);
      }
    }
    if (treatment.rootCanalDone && treatment.canalCount) {
      indicators.push(`RC${treatment.canalCount}`);
    }
    if (treatment.crownIndicated) {
      const crownText = treatment.crownMaterial ? `CR-${treatment.crownMaterial.charAt(0).toUpperCase()}` : 'CR!';
      indicators.push(crownText);
    }
    
    return indicators.join(' ');
  };

  const renderTooth = (toothId: string) => {
    const position = getToothPosition(toothId);
    const statusText = getToothStatusText(toothId);
    const treatment = treatments[toothId];
    const currentToothId = getCurrentToothId(toothId);
    const canSwitch = canSwitchToPrimary(toothId);
    const isCurrentlyPrimary = primaryTeeth.has(toothId);
    
    return (
      <View key={toothId} style={{ position: 'absolute', left: position.left, top: position.top }}>
        <Pressable
          onPress={() => openToothModal(toothId)}
          onLongPress={() => canSwitch && toggleToothType(toothId)}
          style={[styles.toothCircle, getToothStyle(toothId)]}
        >
          <Text style={[styles.toothLabel, isCurrentlyPrimary && styles.primaryToothLabel]}>
            {currentToothId}
          </Text>
          {statusText && (
            <View style={styles.statusIndicator}>
              <Text style={styles.statusText}>{statusText}</Text>
            </View>
          )}
          {treatment.completed && (
            <View style={styles.completedFlag}>
              <Text style={styles.completedText}>✓</Text>
            </View>
          )}
        </Pressable>
        
        {canSwitch && (
          <View style={[
            styles.switchIndicator,
            isCurrentlyPrimary ? styles.switchIndicatorPrimary : styles.switchIndicatorAdult
          ]}>
            <Text style={styles.switchText}>
              {isCurrentlyPrimary ? 'P' : 'A'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // ✅ OPTIMIZED VERSION - Only stores teeth with treatments
  const saveTreatmentToDatabase = async () => {
    try {
      const completedTreatments = getCompletedTreatments();
      const clinicianName = user?.email || 'Unknown Clinician';
      const completedDate = new Date();

      // ✅ Get optimized treatment data (only teeth with treatments)
      const optimizedData = getOptimizedTreatmentData();
      
      console.log('💾 Optimized treatment data:', {
        teethCount: Object.keys(optimizedData.treatedTeeth).length,
        totalTeeth: 32,
        savings: `${Math.round((1 - Object.keys(optimizedData.treatedTeeth).length / 32) * 100)}% reduction`
      });

      await database.write(async () => {
        const treatmentId = uuid.v4();
        
        await database.get<Treatment>('treatments').create(treatment => {
          treatment._raw.id = treatmentId;
          treatment.patientId = patientId;
          treatment.type = 'filling';
          treatment.tooth = 'Multiple';
          treatment.surface = 'Various';
          treatment.units = 1;
          treatment.value = totalCost;
          treatment.billingCodes = JSON.stringify(billingCodes);
          
          // ✅ Store optimized treatment data (not full 32 teeth)
          treatment.notes = JSON.stringify({
            treatments: optimizedData.treatedTeeth, // Only teeth with treatments
            generalNotes: notes,
            summary: {
              teethTreated: completedTreatments.length,
              totalSurfaces: getTotalSurfaceCount(),
              rootCanals: Object.values(treatments).filter(t => t.rootCanalDone).length,
              crowns: Object.values(treatments).filter(t => t.crownIndicated).length
            }
          });
          
          treatment.clinicianName = clinicianName;
          treatment.completedAt = completedDate;
          
          // ✅ Omit empty fields
          if (notes) {
            // Notes are included in the JSON above
          }
        });
      });

      console.log('✅ Filling treatments saved to database (OPTIMIZED):', {
        patientId,
        teethWithTreatments: Object.keys(optimizedData.treatedTeeth).length,
        teethSkipped: 32 - Object.keys(optimizedData.treatedTeeth).length,
        totalCost,
        billingCodesCount: billingCodes.length,
        clinician: clinicianName,
        storageEfficiency: `${Math.round((1 - Object.keys(optimizedData.treatedTeeth).length / 32) * 100)}% smaller`,
        completedAt: completedDate.toISOString()
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to save filling treatments:', error);
      Alert.alert('Error', 'Failed to save treatment to database. Please try again.');
      return false;
    }
  };

  const handleCompleteTreatment = async () => {
    const completedTreatments = getCompletedTreatments();
    
    if (completedTreatments.length === 0) {
      Alert.alert('No Treatments', 'Please record at least one treatment.');
      return;
    }

    const rootCanals = Object.values(treatments).filter(t => t.rootCanalDone).length;
    const crowns = Object.values(treatments).filter(t => t.crownIndicated).length;

    Alert.alert(
      'Complete Treatment',
      `Complete treatment for this patient?\n\nTreatment Summary:\n• Teeth Treated: ${completedTreatments.length}\n• Total Surfaces: ${getTotalSurfaceCount()}\n• Root Canals: ${rootCanals}\n• Crowns: ${crowns}\n• ODA Billing Codes: ${billingCodes.length}\n\nTotal ODA Cost: $${totalCost.toFixed(2)}\n\nThis will save all treatments to the database.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Complete & Save', 
          onPress: async () => {
            const saved = await saveTreatmentToDatabase();
            
            if (saved) {
              setAllCompleted(true);
              setCompletedAt(new Date());
              Alert.alert('Success', `✅ Filling treatment completed and saved to database!\n\nTotal ODA Billing: $${totalCost.toFixed(2)}`);
            }
          }
        }
      ]
    );
  };

  const resetTreatment = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to clear all treatment data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: () => {
            setTreatments(initializeTeethStates());
            setNotes('');
            setAllCompleted(false);
            setCompletedAt(null);
            setPrimaryTeeth(new Set());
            Alert.alert('Cleared', 'All treatment data has been cleared.');
          }
        }
      ]
    );
  };

  // FillingsTreatmentScreen.tsx - PART 6 (Main JSX Render)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.header}>Filling Treatment</Text>
        <Text style={styles.subtext}>Patient ID: {patientId}</Text>

        {allCompleted && completedAt && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedBannerText}>✅ Treatment Completed</Text>
            <Text style={styles.completedDate}>
              {completedAt.toLocaleDateString()} at {completedAt.toLocaleTimeString()}
            </Text>
          </View>
        )}

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Treatment Summary</Text>
          <Text style={styles.summaryText}>
            Teeth Treated: {getCompletedTreatments().length} | 
            Surfaces: {getTotalSurfaceCount()} | 
            Root Canals: {Object.values(treatments).filter(t => t.rootCanalDone).length}
            {totalCost > 0 && ` | Total Cost: $${totalCost.toFixed(2)}`}
          </Text>
        </View>

        {/* Dental Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Dental Chart</Text>
          <Text style={styles.chartInstructions}>
            Tap to treat • Long press switchable teeth (11-15, 21-25, 31-35, 41-45) to toggle Primary/Adult
          </Text>
          <View style={[styles.dentalChart, { width: CHART_WIDTH, height: CHART_HEIGHT }]}>
            
            {[...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_RIGHT, ...LOWER_LEFT].map(toothId => 
              renderTooth(toothId)
            )}
          </View>
          
          {/* Legend */}
          <View style={styles.legendContainer}>
            <Text style={styles.legendTitle}>Adult/Primary Indicator:</Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.switchIndicator, styles.switchIndicatorAdult, styles.legendIndicator]}>
                  <Text style={styles.switchText}>A</Text>
                </View>
                <Text style={styles.legendText}>Adult Tooth</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.switchIndicator, styles.switchIndicatorPrimary, styles.legendIndicator]}>
                  <Text style={styles.switchText}>P</Text>
                </View>
                <Text style={styles.legendText}>Primary Tooth</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ODA Billing Codes */}
        {billingCodes.length > 0 && (
          <View style={styles.billingSection}>
            <Text style={styles.sectionTitle}>ODA Billing Codes ({billingCodes.length})</Text>
            {billingCodes.map((code, index) => (
              <View key={index} style={styles.codeCard}>
                <View style={styles.codeHeader}>
                  <Text style={styles.codeNumber}>
                    {code.code} - Tooth {code.toothId}
                  </Text>
                  <Text style={styles.codePrice}>${code.price}</Text>
                </View>
                <Text style={styles.codeDescription}>{code.description}</Text>
                <Text style={styles.codeCategory}>{code.category}</Text>
              </View>
            ))}
            
            <View style={styles.totalSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total ODA Billing:</Text>
                <Text style={styles.totalAmount}>${totalCost.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Treatment notes..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <Pressable 
            style={[styles.completeButton, allCompleted && styles.completedButton]} 
            onPress={handleCompleteTreatment}
            disabled={allCompleted}
          >
            <Text style={styles.actionButtonText}>
              {allCompleted ? '✅ Completed' : 'Complete Treatment'}
            </Text>
          </Pressable>
          
          <Pressable style={styles.resetButton} onPress={resetTreatment}>
            <Text style={styles.resetButtonText}>Clear All</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Treatment Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Tooth {getCurrentToothId(selectedTooth)} 
                {canSwitchToPrimary(selectedTooth) && (
                  <Text style={styles.toothTypeIndicator}>
                    {primaryTeeth.has(selectedTooth) ? ' (Primary)' : ' (Adult)'}
                  </Text>
                )}
              </Text>
              {canSwitchToPrimary(selectedTooth) && (
                <Pressable 
                  style={styles.switchButton}
                  onPress={() => selectedTooth && toggleToothType(selectedTooth)}
                >
                  <Text style={styles.switchButtonText}>
                    Switch to {primaryTeeth.has(selectedTooth) ? 'Adult' : 'Primary'}
                  </Text>
                </Pressable>
              )}
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
              {selectedTooth && (
                <>
                  {/* Surfaces */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Surfaces (MODBL):</Text>
                    <View style={styles.surfaceRow}>
                      {SURFACES.map(surface => (
                        <Pressable
                          key={surface}
                          style={[
                            styles.surfaceBtn,
                            treatments[selectedTooth]?.surfaces.includes(surface) && styles.surfaceBtnActive
                          ]}
                          onPress={() => toggleSurface(selectedTooth, surface)}
                        >
                          <Text style={[
                            styles.surfaceBtnText,
                            treatments[selectedTooth]?.surfaces.includes(surface) && styles.surfaceBtnTextActive
                          ]}>
                            {surface}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Material */}
                  {treatments[selectedTooth]?.surfaces.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Filling Material:</Text>
                      <View style={styles.materialGrid}>
                        {FILLING_MATERIALS.map(material => (
                          <Pressable
                            key={material}
                            style={[
                              styles.materialBtn,
                              treatments[selectedTooth]?.fillingMaterial === material && styles.materialBtnActive
                            ]}
                            onPress={() => updateTreatment(selectedTooth, { fillingMaterial: material })}
                          >
                            <Text style={[
                              styles.materialBtnText,
                              treatments[selectedTooth]?.fillingMaterial === material && styles.materialBtnTextActive
                            ]}>
                              {material}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Prep Depth */}
                  {treatments[selectedTooth]?.surfaces.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Prep Depth:</Text>
                      <View style={styles.optionRow}>
                        {PREP_DEPTHS.map(depth => (
                          <Pressable
                            key={depth}
                            style={[
                              styles.optionBtn,
                              treatments[selectedTooth]?.prepDepth === depth && styles.optionBtnActive
                            ]}
                            onPress={() => updateTreatment(selectedTooth, { prepDepth: depth })}
                          >
                            <Text style={[
                              styles.optionBtnText,
                              treatments[selectedTooth]?.prepDepth === depth && styles.optionBtnTextActive
                            ]}>
                              {depth}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Cracks */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Cracks:</Text>
                    <View style={styles.yesNoRow}>
                      <Pressable
                        style={[
                          styles.yesNoBtn,
                          treatments[selectedTooth]?.hasCracks === true && styles.yesBtn
                        ]}
                        onPress={() => updateTreatment(selectedTooth, { hasCracks: true })}
                      >
                        <Text style={[
                          styles.yesNoBtnText,
                          treatments[selectedTooth]?.hasCracks === true && styles.yesBtnText
                        ]}>Yes</Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.yesNoBtn,
                          treatments[selectedTooth]?.hasCracks === false && styles.noBtn
                        ]}
                        onPress={() => updateTreatment(selectedTooth, { hasCracks: false })}
                      >
                        <Text style={[
                          styles.yesNoBtnText,
                          treatments[selectedTooth]?.hasCracks === false && styles.noBtnText
                        ]}>No</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Crown */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Crown Indicated:</Text>
                    <View style={styles.yesNoRow}>
                      <Pressable
                        style={[
                          styles.yesNoBtn,
                          treatments[selectedTooth]?.crownIndicated === true && styles.yesBtn
                        ]}
                        onPress={() => updateTreatment(selectedTooth, { 
                          crownIndicated: true,
                          crownMaterial: treatments[selectedTooth]?.crownMaterial || null
                        })}
                      >
                        <Text style={[
                          styles.yesNoBtnText,
                          treatments[selectedTooth]?.crownIndicated === true && styles.yesBtnText
                        ]}>Yes</Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.yesNoBtn,
                          treatments[selectedTooth]?.crownIndicated === false && styles.noBtn
                        ]}
                        onPress={() => updateTreatment(selectedTooth, { 
                          crownIndicated: false, 
                          crownMaterial: null 
                        })}
                      >
                        <Text style={[
                          styles.yesNoBtnText,
                          treatments[selectedTooth]?.crownIndicated === false && styles.noBtnText
                        ]}>No</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Crown Material */}
                  {treatments[selectedTooth]?.crownIndicated && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Crown Material:</Text>
                      {primaryTeeth.has(selectedTooth) && (
                        <View style={styles.primaryToothNotice}>
                          <Text style={styles.primaryToothNoticeText}>
                            ℹ️ Primary teeth: Only metal crowns available
                          </Text>
                        </View>
                      )}
                      <View style={styles.crownMaterialRow}>
                        {(primaryTeeth.has(selectedTooth) ? ['metal'] : CROWN_MATERIALS).map(material => (
                          <Pressable
                            key={material}
                            style={[
                              styles.crownMaterialBtn,
                              treatments[selectedTooth]?.crownMaterial === material && styles.crownMaterialBtnActive
                            ]}
                            onPress={() => updateTreatment(selectedTooth, { crownMaterial: material })}
                          >
                            <Text style={[
                              styles.crownMaterialBtnText,
                              treatments[selectedTooth]?.crownMaterial === material && styles.crownMaterialBtnTextActive
                            ]}>
                              {material}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Root Canal */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Root Canal:</Text>
                    <Pressable
                      style={[
                        styles.toggleBtn,
                        treatments[selectedTooth]?.rootCanalDone && styles.toggleBtnActive
                      ]}
                      onPress={() => updateTreatment(selectedTooth, { 
                        rootCanalDone: !treatments[selectedTooth]?.rootCanalDone,
                        canalCount: !treatments[selectedTooth]?.rootCanalDone ? null : treatments[selectedTooth]?.canalCount
                      })}
                    >
                      <Text style={[
                        styles.toggleBtnText,
                        treatments[selectedTooth]?.rootCanalDone && styles.toggleBtnTextActive
                      ]}>
                        {treatments[selectedTooth]?.rootCanalDone ? 'RCT Done' : 'No RCT'}
                      </Text>
                    </Pressable>

                    {/* Canal Count */}
                    {treatments[selectedTooth]?.rootCanalDone && (
                      <View style={styles.canalSection}>
                        <Text style={styles.modalLabel}>Canals:</Text>
                        <View style={styles.canalRow}>
                          {CANAL_COUNTS.map(count => (
                            <Pressable
                              key={count}
                              style={[
                                styles.canalBtn,
                                treatments[selectedTooth]?.canalCount === count && styles.canalBtnActive
                              ]}
                              onPress={() => updateTreatment(selectedTooth, { canalCount: count })}
                            >
                              <Text style={[
                                styles.canalBtnText,
                                treatments[selectedTooth]?.canalCount === count && styles.canalBtnTextActive
                              ]}>
                                {count}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Summary */}
                  {(treatments[selectedTooth]?.surfaces.length > 0 || treatments[selectedTooth]?.rootCanalDone) && (
                    <View style={styles.treatmentSummary}>
                      <Text style={styles.summaryTitle}>Summary:</Text>
                      <Text style={styles.summaryFormat}>
                        #{getCurrentToothId(selectedTooth)}
                        {treatments[selectedTooth]?.surfaces.join('')}
                        {treatments[selectedTooth]?.fillingMaterial && ` ${treatments[selectedTooth]?.fillingMaterial}`}
                        {treatments[selectedTooth]?.rootCanalDone && treatments[selectedTooth]?.canalCount && 
                          ` RCT(${treatments[selectedTooth]?.canalCount})`
                        }
                        {treatments[selectedTooth]?.crownIndicated && treatments[selectedTooth]?.crownMaterial && 
                          ` Crown(${treatments[selectedTooth]?.crownMaterial})`
                        }
                      </Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable 
                style={styles.cancelBtn} 
                onPress={cancelToothModal}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={styles.clearBtn} 
                onPress={() => selectedTooth && clearTooth(selectedTooth)}
              >
                <Text style={styles.clearBtnText}>Clear</Text>
              </Pressable>
              <Pressable 
                style={styles.doneBtn} 
                onPress={doneToothModal}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default FillingsTreatmentScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
    padding: scaleWidth(20),
  },
  header: {
    fontSize: scaleFontSize(24),
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: scaleHeight(8),
    color: '#333',
  },
  subtext: {
    fontSize: scaleFontSize(14),
    color: '#666',
    textAlign: 'center',
    marginBottom: scaleHeight(20),
  },
  completedBanner: {
    backgroundColor: '#d4edda',
    borderRadius: scaleWidth(8),
    padding: scaleWidth(12),
    marginBottom: scaleHeight(20),
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  completedBannerText: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: '#155724',
  },
  completedDate: {
    fontSize: scaleFontSize(14),
    color: '#155724',
    marginTop: scaleHeight(4),
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: scaleWidth(12),
    padding: scaleWidth(16),
    marginBottom: scaleHeight(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '600',
    marginBottom: scaleHeight(12),
    color: '#333',
  },
  summaryText: {
    fontSize: scaleFontSize(14),
    color: '#495057',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: scaleWidth(12),
    padding: scaleWidth(16),
    marginBottom: scaleHeight(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartInstructions: {
    fontSize: scaleFontSize(12),
    color: '#666',
    textAlign: 'center',
    marginBottom: scaleHeight(12),
    fontStyle: 'italic',
    lineHeight: scaleFontSize(16),
  },
  dentalChart: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: scaleHeight(20),
  },
  upperArchLabel: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    position: 'absolute',
    width: scaleWidth(60),
  },
  lowerArchLabel: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    position: 'absolute',
    width: scaleWidth(60),
  },
  toothCircle: {
    width: scaleWidth(30),
    height: scaleWidth(30),
    borderRadius: scaleWidth(15),
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  toothLabel: {
    color: 'white',
    fontWeight: '700',
    fontSize: scaleFontSize(11),
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  primaryToothLabel: {
    color: '#000000',
    fontWeight: '700',
    fontSize: scaleFontSize(11),
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  switchIndicator: {
    position: 'absolute',
    top: scaleWidth(-10),
    left: scaleWidth(-10),
    borderRadius: scaleWidth(7),
    width: scaleWidth(14),
    height: scaleWidth(14),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'white',
  },
  switchIndicatorAdult: {
    backgroundColor: '#007bff',
  },
  switchIndicatorPrimary: {
    backgroundColor: '#ff6b35',
  },
  switchText: {
    color: 'white',
    fontSize: scaleFontSize(8),
    fontWeight: 'bold',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: scaleHeight(-16),
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: scaleWidth(6),
    paddingHorizontal: scaleWidth(2),
    paddingVertical: scaleHeight(1),
    maxWidth: scaleWidth(60),
  },
  statusText: {
    color: 'white',
    fontSize: scaleFontSize(7),
    fontWeight: '600',
  },
  completedFlag: {
    position: 'absolute',
    top: scaleWidth(-8),
    right: scaleWidth(-8),
    backgroundColor: '#28a745',
    borderRadius: scaleWidth(8),
    width: scaleWidth(16),
    height: scaleWidth(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedText: {
    color: 'white',
    fontSize: scaleFontSize(10),
    fontWeight: 'bold',
  },
  toothNormal: {
    backgroundColor: '#4CAF50',
  },
  toothTreated: {
    backgroundColor: '#007bff',
  },
  toothCompleted: {
    backgroundColor: '#28a745',
  },
  legendContainer: {
    marginTop: scaleHeight(20),
    paddingTop: scaleHeight(16),
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  legendTitle: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: '#333',
    marginBottom: scaleHeight(8),
    textAlign: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scaleWidth(24),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(8),
  },
  legendIndicator: {
    position: 'relative',
    top: 0,
    left: 0,
  },
  legendText: {
    fontSize: scaleFontSize(13),
    color: '#495057',
  },
  billingSection: {
    backgroundColor: '#fff',
    borderRadius: scaleWidth(12),
    padding: scaleWidth(16),
    marginBottom: scaleHeight(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  codeCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: scaleWidth(8),
    padding: scaleWidth(12),
    marginBottom: scaleHeight(8),
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleHeight(4),
  },
  codeNumber: {
    fontSize: scaleFontSize(14),
    fontWeight: 'bold',
    color: '#007bff',
    flex: 1,
  },
  codePrice: {
    fontSize: scaleFontSize(16),
    fontWeight: 'bold',
    color: '#28a745',
  },
  codeDescription: {
    fontSize: scaleFontSize(13),
    color: '#495057',
    marginBottom: scaleHeight(2),
  },
  codeCategory: {
    fontSize: scaleFontSize(11),
    color: '#6c757d',
    backgroundColor: '#e9ecef',
    paddingHorizontal: scaleWidth(6),
    paddingVertical: scaleHeight(2),
    borderRadius: scaleWidth(3),
    alignSelf: 'flex-start',
  },
  totalSection: {
    borderTopWidth: 2,
    borderTopColor: '#e9ecef',
    paddingTop: scaleHeight(12),
    marginTop: scaleHeight(8),
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: scaleFontSize(18),
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: scaleFontSize(20),
    fontWeight: 'bold',
    color: '#28a745',
  },
  notesSection: {
    backgroundColor: '#fff',
    borderRadius: scaleWidth(12),
    padding: scaleWidth(16),
    marginBottom: scaleHeight(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notesInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: scaleWidth(8),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(10),
    fontSize: scaleFontSize(14),
    minHeight: scaleHeight(80),
  },
  actionSection: {
    gap: scaleHeight(12),
    marginBottom: scaleHeight(20),
  },
  completeButton: {
    backgroundColor: '#28a745',
    borderRadius: scaleWidth(8),
    paddingVertical: scaleHeight(14),
    paddingHorizontal: scaleWidth(20),
    alignItems: 'center',
  },
  completedButton: {
    backgroundColor: '#6c757d',
  },
  resetButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#dc3545',
    borderRadius: scaleWidth(8),
    paddingVertical: scaleHeight(14),
    paddingHorizontal: scaleWidth(20),
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: '#fff',
  },
  resetButtonText: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: '#dc3545',
  },
  
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: 'white',
    borderTopLeftRadius: scaleWidth(20),
    borderTopRightRadius: scaleWidth(20),
    maxHeight: '90%',
    minHeight: '50%',
  },
  modalHeader: {
    padding: scaleWidth(20),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: 'bold',
    color: '#333',
  },
  toothTypeIndicator: {
    fontSize: scaleFontSize(14),
    fontWeight: 'normal',
    color: '#666',
  },
  switchButton: {
    backgroundColor: '#007bff',
    borderRadius: scaleWidth(6),
    paddingVertical: scaleHeight(6),
    paddingHorizontal: scaleWidth(12),
    marginTop: scaleHeight(8),
  },
  switchButtonText: {
    color: 'white',
    fontSize: scaleFontSize(12),
    fontWeight: '600',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: scaleWidth(20),
  },
  modalSection: {
    marginBottom: scaleHeight(20),
  },
  modalLabel: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    marginBottom: scaleHeight(8),
    color: '#333',
  },
  surfaceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  surfaceBtn: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: scaleWidth(8),
    paddingVertical: scaleHeight(10),
    paddingHorizontal: scaleWidth(14),
    minWidth: scaleWidth(50),
    alignItems: 'center',
  },
  surfaceBtnActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  surfaceBtnText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: '#495057',
  },
  surfaceBtnTextActive: {
    color: 'white',
  },
  materialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleWidth(8),
  },
  materialBtn: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: scaleWidth(8),
    paddingVertical: scaleHeight(10),
    paddingHorizontal: scaleWidth(12),
    alignItems: 'center',
    width: '48%',
  },
  materialBtnActive: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  materialBtnText: {
    fontSize: scaleFontSize(12),
    fontWeight: '500',
    color: '#495057',
    textAlign: 'center',
  },
  materialBtnTextActive: {
    color: 'white',
  },
  optionRow: {
    flexDirection: 'row',
    gap: scaleWidth(10),
  },
  optionBtn: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: scaleWidth(8),
    paddingVertical: scaleHeight(10),
    alignItems: 'center',
  },
  optionBtnActive: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  optionBtnText: {
    fontSize: scaleFontSize(13),
    fontWeight: '500',
    color: '#495057',
  },
  optionBtnTextActive: {
    color: 'white',
  },
  yesNoRow: {
    flexDirection: 'row',
    gap: scaleWidth(10),
  },
  yesNoBtn: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: scaleWidth(8),
    paddingVertical: scaleHeight(10),
    alignItems: 'center',
  },
  yesBtn: {
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
  },
  noBtn: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  yesNoBtnText: {
    fontSize: scaleFontSize(13),
    fontWeight: '500',
    color: '#495057',
  },
  yesBtnText: {
    color: 'white',
  },
  noBtnText: {
    color: 'white',
  },
  crownMaterialRow: {
    flexDirection: 'row',
    gap: scaleWidth(8),
  },
  crownMaterialBtn: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: scaleWidth(8),
    paddingVertical: scaleHeight(10),
    alignItems: 'center',
  },
  crownMaterialBtnActive: {
    backgroundColor: '#6f42c1',
    borderColor: '#6f42c1',
  },
  crownMaterialBtnText: {
    fontSize: scaleFontSize(12),
    fontWeight: '500',
    color: '#495057',
    textAlign: 'center',
  },
  crownMaterialBtnTextActive: {
    color: 'white',
  },
  primaryToothNotice: {
    backgroundColor: '#e1f5fe',
    borderRadius: scaleWidth(6),
    padding: scaleWidth(8),
    marginBottom: scaleHeight(8),
    borderLeftWidth: 3,
    borderLeftColor: '#29b6f6',
  },
  primaryToothNoticeText: {
    fontSize: scaleFontSize(12),
    color: '#0277bd',
    fontWeight: '500',
  },
  toggleBtn: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: scaleWidth(8),
    paddingVertical: scaleHeight(12),
    alignItems: 'center',
    marginBottom: scaleHeight(10),
  },
  toggleBtnActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  toggleBtnText: {
    fontSize: scaleFontSize(14),
    fontWeight: '500',
    color: '#495057',
  },
  toggleBtnTextActive: {
    color: 'white',
  },
  canalSection: {
    marginTop: scaleHeight(10),
    paddingTop: scaleHeight(10),
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  canalRow: {
    flexDirection: 'row',
    gap: scaleWidth(10),
  },
  canalBtn: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: scaleWidth(8),
    paddingVertical: scaleHeight(10),
    paddingHorizontal: scaleWidth(16),
    alignItems: 'center',
    minWidth: scaleWidth(50),
  },
  canalBtnActive: {
    backgroundColor: '#6f42c1',
    borderColor: '#6f42c1',
  },
  canalBtnText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: '#495057',
  },
  canalBtnTextActive: {
    color: 'white',
  },
  treatmentSummary: {
    backgroundColor: '#e7f3ff',
    borderRadius: scaleWidth(8),
    padding: scaleWidth(12),
    marginTop: scaleHeight(10),
  },
  summaryTitle: {
    fontSize: scaleFontSize(12),
    fontWeight: '600',
    color: '#007bff',
    marginBottom: scaleHeight(4),
  },
  summaryFormat: {
    fontSize: scaleFontSize(14),
    fontWeight: 'bold',
    color: '#007bff',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: scaleWidth(20),
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: scaleWidth(12),
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#6c757d',
    borderRadius: scaleWidth(8),
    paddingVertical: scaleHeight(12),
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: '#6c757d',
  },
  clearBtn: {
    flex: 1,
    backgroundColor: '#6c757d',
    borderRadius: scaleWidth(8),
    paddingVertical: scaleHeight(12),
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: 'white',
  },
  doneBtn: {
    flex: 2,
    backgroundColor: '#007bff',
    borderRadius: scaleWidth(8),
    paddingVertical: scaleHeight(12),
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: 'white',
  },
});