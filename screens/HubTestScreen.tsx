// screens/HubTestScreen.tsx
// Place this file in: dental-mission-mobile/screens/HubTestScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Button,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { localHubSyncService, LocalHubSyncStatus } from '../services/LocalHubSync';

const HubTestScreen = () => {
  const [hubIP, setHubIP] = useState('192.168.1.45'); // REPLACE with your MacBook IP
  const [status, setStatus] = useState<LocalHubSyncStatus>(localHubSyncService.getStatus());
  const [autoSync, setAutoSync] = useState(false);

  useEffect(() => {
    // Subscribe to sync status updates
    const unsubscribe = localHubSyncService.subscribe(setStatus);
    return unsubscribe;
  }, []);

  const handleSetHubIP = () => {
    localHubSyncService.setHubIP(hubIP);
    Alert.alert('Success', `Hub IP set to ${hubIP}\n\nTrying to connect...`);
  };

  const handleDiscoverHub = async () => {
    Alert.alert('Searching...', 'Looking for hub device on network. This may take 10-15 seconds.');
    const foundIP = await localHubSyncService.discoverHub();
    
    if (foundIP) {
      Alert.alert('Hub Found! 🎉', `Successfully connected to hub at ${foundIP}`);
      setHubIP(foundIP);
    } else {
      Alert.alert('Not Found', 'Could not find hub device.\n\nMake sure:\n1. MacBook server is running\n2. Both devices on same WiFi\n3. Mac firewall allows connections');
    }
  };

  const handleManualSync = async () => {
    try {
      await localHubSyncService.forceSync();
      Alert.alert('Sync Complete ✅', 'Data has been synchronized with hub');
    } catch (error) {
      Alert.alert('Sync Failed ❌', 'Could not sync with hub. Check connection.');
    }
  };

  const handleToggleAutoSync = () => {
    if (autoSync) {
      localHubSyncService.stopPeriodicSync();
      setAutoSync(false);
      Alert.alert('Auto-Sync Disabled', 'Periodic sync has been stopped');
    } else {
      localHubSyncService.startPeriodicSync(30); // Sync every 30 seconds for testing
      setAutoSync(true);
      Alert.alert('Auto-Sync Enabled ✅', 'Syncing every 30 seconds\n\nIn production, this would be 2-3 minutes');
    }
  };

  const getStatusColor = () => {
    if (status.isSyncing) return '#ffc107'; // Yellow
    if (!status.isConnected) return '#dc3545'; // Red
    if (status.syncError) return '#dc3545'; // Red
    return '#28a745'; // Green
  };

  const getStatusIcon = () => {
    if (status.isSyncing) return '🔄';
    if (!status.isConnected) return '📵';
    if (status.syncError) return '❌';
    return '✅';
  };

  const getStatusText = () => {
    if (status.isSyncing) return 'Syncing with hub...';
    if (!status.isConnected) return 'Not Connected to Hub';
    if (status.syncError) return `Error: ${status.syncError}`;
    return 'Connected to Hub';
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🧪 Hub Sync Test</Text>
      <Text style={styles.subtitle}>Test Local Network Synchronization</Text>

      {/* Connection Status Card */}
      <View style={[styles.statusCard, { backgroundColor: getStatusColor() }]}>
        <Text style={styles.statusIcon}>{getStatusIcon()}</Text>
        <Text style={styles.statusText}>{getStatusText()}</Text>
        {status.hubIP && (
          <Text style={styles.statusDetail}>Hub IP: {status.hubIP}:3000</Text>
        )}
        {autoSync && (
          <View style={styles.autoBadge}>
            <Text style={styles.autoBadgeText}>⚡ AUTO-SYNC ACTIVE</Text>
          </View>
        )}
      </View>

      {/* Instructions Box */}
      <View style={styles.instructionsBox}>
        <Text style={styles.instructionsTitle}>📖 Quick Start</Text>
        <Text style={styles.instructionsText}>
          1️⃣ Make sure hub server is running on MacBook{'\n'}
          2️⃣ Both devices must be on same WiFi{'\n'}
          3️⃣ Enter MacBook IP or use Auto-Discover{'\n'}
          4️⃣ Enable Auto-Sync to test periodic sync
        </Text>
      </View>

      {/* Hub IP Configuration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Hub Configuration</Text>
        <TextInput
          style={styles.input}
          value={hubIP}
          onChangeText={setHubIP}
          placeholder="Enter MacBook IP (e.g., 192.168.1.45)"
          placeholderTextColor="#999"
          keyboardType="decimal-pad"
        />
        <Button title="Connect to This IP" onPress={handleSetHubIP} />
        <View style={styles.spacer} />
        <Button 
          title="🔍 Auto-Discover Hub" 
          onPress={handleDiscoverHub} 
          color="#17a2b8" 
        />
      </View>

      {/* Sync Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔄 Sync Controls</Text>
        
        <Button
          title="📤 Sync Now (Manual)"
          onPress={handleManualSync}
          disabled={!status.isConnected || status.isSyncing}
          color="#007bff"
        />
        
        <View style={styles.spacer} />
        
        <Button
          title={autoSync ? '⏹️ Stop Auto-Sync' : '▶️ Start Auto-Sync (30s)'}
          onPress={handleToggleAutoSync}
          color={autoSync ? '#dc3545' : '#28a745'}
          disabled={!status.isConnected}
        />
        
        {autoSync && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚡ Auto-sync is running every 30 seconds for testing.{'\n'}
              In production, this would be 2-3 minutes.
            </Text>
          </View>
        )}
      </View>

      {/* Sync Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Sync Statistics</Text>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Last Sync:</Text>
          <Text style={styles.statValue}>
            {status.lastSyncTime 
              ? status.lastSyncTime.toLocaleTimeString() 
              : 'Never'}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Connection:</Text>
          <Text style={[styles.statValue, { color: status.isConnected ? '#28a745' : '#dc3545' }]}>
            {status.isConnected ? 'Online' : 'Offline'}
          </Text>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.detailTitle}>Last Sync Items:</Text>
          <Text style={styles.detailText}>
            👥 Patients: {status.itemsSynced.patients}
          </Text>
          <Text style={styles.detailText}>
            💉 Treatments: {status.itemsSynced.treatments}
          </Text>
          <Text style={styles.detailText}>
            📋 Assessments: {status.itemsSynced.assessments}
          </Text>
        </View>
      </View>

      {/* Next Steps */}
      <View style={styles.nextStepsBox}>
        <Text style={styles.nextStepsTitle}>✨ Next Steps</Text>
        <Text style={styles.nextStepsText}>
          After connecting:{'\n'}
          • Go back to home screen{'\n'}
          • Create a new patient{'\n'}
          • Watch MacBook terminal for sync activity{'\n'}
          • Data will appear in hub database!
        </Text>
      </View>

      {status.isSyncing && (
        <View style={styles.syncingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.syncingText}>Syncing with hub...</Text>
        </View>
      )}
    </ScrollView>
  );
};

export default HubTestScreen;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  statusCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  statusDetail: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
  },
  autoBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  autoBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  instructionsBox: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: '#333',
  },
  spacer: {
    height: 12,
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
  },
  warningText: {
    fontSize: 12,
    color: '#856404',
    lineHeight: 18,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  nextStepsBox: {
    backgroundColor: '#d4edda',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 8,
  },
  nextStepsText: {
    fontSize: 13,
    color: '#155724',
    lineHeight: 20,
  },
  syncingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  syncingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '600',
  },
});