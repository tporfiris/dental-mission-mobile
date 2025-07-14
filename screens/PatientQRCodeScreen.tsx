// This screen will:
//- Accept a patientId via navigation params
//- Generate a scannable QR code from it

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

const PatientQRCodeScreen = ({ route }: any) => {
  const { patientId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Patient QR Code</Text>
      <Text style={styles.idText}>{patientId}</Text>
      <QRCode value={patientId} size={250} />
    </View>
  );
};

export default PatientQRCodeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  idText: { fontSize: 14, marginBottom: 20, color: '#555' },
});