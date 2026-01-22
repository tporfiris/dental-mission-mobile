import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { localHubSyncService, LocalHubSyncStatus } from '../services/LocalHubSync';

export const HubStatusIndicator = () => {
  const [status, setStatus] = useState<LocalHubSyncStatus>(
    localHubSyncService.getStatus()
  );

  useEffect(() => {
    const unsubscribe = localHubSyncService.subscribe(setStatus);
    return unsubscribe;
  }, []);

  if (!status.isConnected) {
    return (
      <View style={styles.container}>
        <View style={[styles.dot, styles.offline]} />
        <Text style={styles.text}>Hub: Offline</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.dot, styles.online]} />
      <Text style={styles.text}>
        Hub: Connected ({status.hubIP})
      </Text>
      {status.lastSyncTime && (
        <Text style={styles.subtext}>
          Last sync: {status.lastSyncTime.toLocaleTimeString()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  online: {
    backgroundColor: '#28a745',
  },
  offline: {
    backgroundColor: '#dc3545',
  },
  text: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  subtext: {
    fontSize: 10,
    color: '#666',
    marginLeft: 8,
  },
});