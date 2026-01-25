// components/ManualSyncButton.tsx
// Add this to HomeScreen or any screen where you want a manual sync button
import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { localHubSyncService } from '../services/LocalHubSync';

interface ManualSyncButtonProps {
  style?: any;
}

export const ManualSyncButton: React.FC<ManualSyncButtonProps> = ({ style }) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      console.log('🔄 Manual sync triggered by user');
      
      await localHubSyncService.forceSync();
      
      const status = localHubSyncService.getStatus();
      
      Alert.alert(
        '✅ Sync Complete',
        `Successfully synced with hub!\n\n` +
        `Items synced:\n` +
        `• Patients: ${status.itemsSynced.patients}\n` +
        `• Treatments: ${status.itemsSynced.treatments}\n` +
        `• Assessments: ${status.itemsSynced.assessments}\n\n` +
        `Last sync: ${status.lastSyncTime?.toLocaleTimeString()}`
      );
    } catch (error) {
      console.error('❌ Manual sync failed:', error);
      Alert.alert(
        '❌ Sync Failed',
        'Could not sync with hub. Make sure you are connected to the mission network and hub is running.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handleManualSync}
      disabled={isSyncing}
      activeOpacity={0.7}
    >
      {isSyncing ? (
        <>
          <ActivityIndicator size="small" color="#fff" style={styles.spinner} />
          <Text style={styles.buttonText}>Syncing...</Text>
        </>
      ) : (
        <>
          <Text style={styles.buttonIcon}>🔄</Text>
          <Text style={styles.buttonText}>Sync Now</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6f42c1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  spinner: {
    marginRight: 8,
  },
});