// components/SyncStatusIndicator.tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useSyncStatus } from '../hooks/useSyncStatus';

interface SyncStatusIndicatorProps {
  showDetails?: boolean;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ showDetails = false }) => {
  const { syncStatus, forceSync } = useSyncStatus();

  const getSyncStatusColor = () => {
    if (!syncStatus.isOnline) return '#dc3545'; // Red for offline
    if (syncStatus.isSyncing) return '#ffc107'; // Yellow for syncing
    if (syncStatus.syncError) return '#dc3545'; // Red for error
    if (syncStatus.pendingSyncCount === 0) return '#28a745'; // Green for synced
    return '#fd7e14'; // Orange for pending
  };

  const getSyncStatusText = () => {
    if (!syncStatus.isAuthenticated) return 'Not authenticated';
    if (!syncStatus.isOnline) return 'Offline';
    if (syncStatus.isSyncing) return 'Syncing...';
    if (syncStatus.syncError) return 'Sync Error';
    if (syncStatus.pendingSyncCount === 0) return 'All data synced';
    return `${syncStatus.pendingSyncCount} items pending sync`;
  };

  const getSyncStatusIcon = () => {
    if (!syncStatus.isOnline) return '📵';
    if (syncStatus.isSyncing) return '🔄';
    if (syncStatus.syncError) return '❌';
    if (syncStatus.pendingSyncCount === 0) return '✅';
    return '⏳';
  };

  const handleSyncPress = () => {
    if (syncStatus.isOnline && !syncStatus.isSyncing) {
      forceSync();
    }
  };

  if (!showDetails) {
    // Compact version for home screen
    return (
      <Pressable 
        style={[styles.compactContainer, { backgroundColor: getSyncStatusColor() }]}
        onPress={handleSyncPress}
        disabled={!syncStatus.isOnline || syncStatus.isSyncing}
      >
        <View style={styles.compactContent}>
          {syncStatus.isSyncing ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.compactIcon}>{getSyncStatusIcon()}</Text>
          )}
          <Text style={styles.compactText}>{getSyncStatusText()}</Text>
        </View>
      </Pressable>
    );
  }

  // Detailed version
  return (
    <View style={styles.detailedContainer}>
      <View style={[styles.statusHeader, { backgroundColor: getSyncStatusColor() }]}>
        <View style={styles.statusTitleRow}>
          {syncStatus.isSyncing ? (
            <ActivityIndicator size="small" color="white" style={styles.statusIcon} />
          ) : (
            <Text style={styles.statusIcon}>{getSyncStatusIcon()}</Text>
          )}
          <Text style={styles.statusTitle}>Cloud Sync Status</Text>
        </View>
        <Text style={styles.statusSubtitle}>{getSyncStatusText()}</Text>
      </View>

      <View style={styles.statusDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Authentication:</Text>
          <Text style={[styles.detailValue, { color: syncStatus.isAuthenticated ? '#28a745' : '#dc3545' }]}>
            {syncStatus.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Connection:</Text>
          <Text style={[styles.detailValue, { color: syncStatus.isOnline ? '#28a745' : '#dc3545' }]}>
            {syncStatus.isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>

        {syncStatus.lastSyncTime && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last Sync:</Text>
            <Text style={styles.detailValue}>
              {syncStatus.lastSyncTime.toLocaleString()}
            </Text>
          </View>
        )}

        {syncStatus.pendingSyncCount > 0 && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Pending Items:</Text>
            <Text style={[styles.detailValue, { color: '#fd7e14', fontWeight: 'bold' }]}>
              {syncStatus.pendingSyncCount}
            </Text>
          </View>
        )}

        {syncStatus.syncError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorLabel}>Error:</Text>
            <Text style={styles.errorText}>{syncStatus.syncError}</Text>
          </View>
        )}

        {syncStatus.isOnline && !syncStatus.isSyncing && (
          <Pressable style={styles.syncButton} onPress={handleSyncPress}>
            <Text style={styles.syncButtonText}>🔄 Force Sync Now</Text>
          </Pressable>
        )}

        {!syncStatus.isOnline && (
          <View style={styles.offlineNotice}>
            <Text style={styles.offlineText}>
              📵 Data will sync automatically when internet connection is restored
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default SyncStatusIndicator;

const styles = StyleSheet.create({
  // Compact styles for home screen
  compactContainer: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 8,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactIcon: {
    fontSize: 16,
    marginRight: 8,
    color: 'white',
  },
  compactText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  // Detailed styles
  detailedContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  statusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusIcon: {
    fontSize: 18,
    marginRight: 8,
    color: 'white',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  statusSubtitle: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
  },
  statusDetails: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    borderRadius: 6,
    padding: 12,
    marginTop: 8,
  },
  errorLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#721c24',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#721c24',
  },
  syncButton: {
    backgroundColor: '#007bff',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  syncButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  offlineNotice: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 12,
    marginTop: 8,
  },
  offlineText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});