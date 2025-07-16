import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import Camera from 'expo-camera'
import { BarCodeScannerResult } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import Patient from '../db/models/Patient';

const ScanQRCodeScreen = ({ navigation }: any) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const isFocused = useIsFocused();
  const db = useDatabase();

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }: BarCodeScannerResult) => {
    if (scanned) return;

    setScanned(true);
    console.log('📸 QR Code Scanned:', data);

    try {
      const patient = await db.get<Patient>('patients').find(data);
      console.log('✅ Patient Found:', patient.firstName, patient.lastName);

      Alert.alert('Patient Found', `${patient.firstName} ${patient.lastName}`);
      // Later: navigate to a Visit screen here

      navigation.goBack();
    } catch (err) {
      console.error('❌ Patient not found:', err);
      Alert.alert('Error', 'Patient not found in local database.');
      navigation.goBack();
    }
  };

  if (hasPermission === null) return <Text>Requesting camera permission...</Text>;
  if (hasPermission === false) return <Text>No access to camera</Text>;

  return (
    <View style={styles.container}>
      {isFocused && (
        <Camera
          style={StyleSheet.absoluteFillObject}
          onBarCodeScanned={handleBarCodeScanned}
          barCodeScannerSettings={{ barCodeTypes: ['qr'] }}
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
