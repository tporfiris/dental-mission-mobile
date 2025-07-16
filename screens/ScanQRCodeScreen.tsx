import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import type { BarCodeScannerResult } from 'expo-camera';
import Patient from '../db/models/Patient';

const ScanQRCodeScreen = ({ navigation }: any) => {
  const [scanned, setScanned] = useState(false);
  const isFocused = useIsFocused();
  const db = useDatabase();
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (isFocused) setScanned(false);
  }, [isFocused]);

  if (!permission) return <Text>Requesting permission...</Text>;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text>No access to camera</Text>
        <Text onPress={requestPermission}>Tap to grant permission</Text>
      </View>
    );
  }

  const handleBarcodeScanned = async ({ data }: BarCodeScannerResult) => {
    if (scanned) return;

    setScanned(true);
    console.log('📸 QR Code Scanned:', data);

    try {
      const patient = await db.get<Patient>('patients').find(data);
      console.log('✅ Patient Found:', patient.firstName, patient.lastName);
      Alert.alert('Patient Found', `${patient.firstName} ${patient.lastName}`);
      navigation.goBack();
    } catch (err) {
      console.error('❌ Patient not found:', err);
      Alert.alert('Error', 'Patient not found in local database.');
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      {isFocused && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={handleBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
      )}
      <Text style={styles.overlayText}>Scan Patient QR Code</Text>
    </View>
  );
};

export default ScanQRCodeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  overlayText: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 8,
  },
});
