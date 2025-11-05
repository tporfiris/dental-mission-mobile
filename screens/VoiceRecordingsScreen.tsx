// screens/VoiceRecordingsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { database } from '../db';
import AudioNote from '../db/models/AudioNote';
import Patient from '../db/models/Patient';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as FileSystem from 'expo-file-system';

interface AudioNoteWithPatient {
  id: string;
  patientId: string;
  uri: string;
  cloudUri?: string; // ✅ ADD THIS
  transcription: string;
  timestamp: number;
  clinicianId: string;
  category: string;
  subcategory: string;
  patientName?: string;
  patientAge?: number;
  patientLocation?: string;
}

const VoiceRecordingsScreen = ({ navigation }: any) => {
  const [recordings, setRecordings] = useState<AudioNoteWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState<string | null>(null); // ✅ ADD THIS
  
  // Audio player for playback
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);

  // Auto-stop playback when audio finishes
  useEffect(() => {
    if (playerStatus.didJustFinish && playingId) {
      setPlayingId(null);
      player.seekTo(0);
      console.log('Playback finished automatically');
    }
  }, [playerStatus.didJustFinish, playingId]);

  // Load recordings from database
  const loadRecordings = async () => {
    try {
      console.log('Loading voice recordings from database...');
      
      const audioNotes = await database
        .get<AudioNote>('audio_notes')
        .query()
        .fetch();

      console.log(`Found ${audioNotes.length} audio notes in database`);

      // Get patient information for each recording
      const recordingsWithPatients: AudioNoteWithPatient[] = [];
      
      for (const note of audioNotes) {
        try {
          const patient = await database.get<Patient>('patients').find(note.patientId);
          
          const recording: AudioNoteWithPatient = {
            id: note.id,
            patientId: note.patientId,
            uri: note.uri,
            cloudUri: note.cloudUri || undefined, // ✅ ADD THIS
            transcription: note.transcription || '',
            timestamp: note.timestamp,
            clinicianId: note.clinicianId,
            category: note.category,
            subcategory: note.subcategory,
            patientName: `${patient.firstName} ${patient.lastName}`,
            patientAge: patient.age,
            patientLocation: patient.location,
          };
          
          recordingsWithPatients.push(recording);
          console.log(`Loaded recording: ${recording.id} for patient ${recording.patientName}`);
        } catch (patientError) {
          console.warn('Patient not found for recording:', note.id, patientError);
          // Include recording with unknown patient info
          const recording: AudioNoteWithPatient = {
            id: note.id,
            patientId: note.patientId,
            uri: note.uri,
            cloudUri: note.cloudUri || undefined, // ✅ ADD THIS
            transcription: note.transcription || '',
            timestamp: note.timestamp,
            clinicianId: note.clinicianId,
            category: note.category,
            subcategory: note.subcategory,
            patientName: 'Unknown Patient',
            patientAge: 0,
            patientLocation: 'Unknown Location',
          };
          recordingsWithPatients.push(recording);
        }
      }

      // Sort by timestamp (newest first)
      recordingsWithPatients.sort((a, b) => b.timestamp - a.timestamp);
      
      setRecordings(recordingsWithPatients);
      console.log(`Successfully loaded ${recordingsWithPatients.length} voice recordings`);
    } catch (error) {
      console.error('Error loading recordings:', error);
      Alert.alert('Error', 'Failed to load voice recordings. Please try again.');
    }
  };

  // Load recordings on screen focus
  useFocusEffect(
    useCallback(() => {
      loadRecordings();
    }, [])
  );

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await loadRecordings();
      setLoading(false);
    };
    load();
  }, []);

  // Refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecordings();
    setRefreshing(false);
  };

  // ✅ UPDATED: Play recording with cloud URI support
  const playRecording = async (recording: AudioNoteWithPatient) => {
    try {
      console.log('Attempting to play recording:', recording.id);
      setLoadingAudio(recording.id);
      
      // Stop any currently playing audio
      if (playerStatus.playing) {
        player.pause();
        setPlayingId(null);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      let audioUri = recording.uri; // Default to local URI
      
      // Try cloud URI first if available
      if (recording.cloudUri) {
        console.log('🌐 Using cloud URI for playback');
        audioUri = recording.cloudUri;
      } else {
        console.log('📱 Using local URI for playback');
        
        // Check if local file exists
        const fileInfo = await FileSystem.getInfoAsync(recording.uri);
        console.log('File check result:', { exists: fileInfo.exists, size: fileInfo.size });
        
        if (!fileInfo.exists) {
          setLoadingAudio(null);
          Alert.alert(
            'Recording Not Available',
            'This recording is not available locally and has not been uploaded to the cloud yet. Please ensure the device that created this recording is online to sync it.'
          );
          return;
        }
      }

      // Load and play the recording
      player.replace({ uri: audioUri });
      player.play();
      setPlayingId(recording.id);
      setLoadingAudio(null);

      console.log('▶️ Started playback for recording:', recording.id);
    } catch (error) {
      console.error('Error playing recording:', error);
      setLoadingAudio(null);
      
      // If cloud playback failed and we have local URI, try local
      if (recording.cloudUri && recording.uri) {
        console.log('☁️ Cloud playback failed, trying local URI...');
        try {
          const fileInfo = await FileSystem.getInfoAsync(recording.uri);
          if (fileInfo.exists) {
            player.replace({ uri: recording.uri });
            player.play();
            setPlayingId(recording.id);
            console.log('▶️ Started local playback');
            return;
          }
        } catch (localError) {
          console.error('Local playback also failed:', localError);
        }
      }
      
      Alert.alert('Error', 'Failed to play recording. The file may not be available.');
    }
  };

  // Stop playback
  const stopPlayback = async () => {
    try {
      player.pause();
      player.seekTo(0);
      setPlayingId(null);
      console.log('⏹️ Stopped playback manually');
    } catch (error) {
      console.error('Error stopping playback:', error);
    }
  };

  // Delete recording
  const deleteRecording = async (recording: AudioNoteWithPatient) => {
    Alert.alert(
      'Delete Recording',
      `Are you sure you want to delete this recording for ${recording.patientName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Deleting recording:', recording.id);
              
              // Stop playback if this recording is playing
              if (playingId === recording.id) {
                await stopPlayback();
              }

              // Delete from database
              await database.write(async () => {
                const audioNote = await database.get<AudioNote>('audio_notes').find(recording.id);
                await audioNote.destroyPermanently();
              });

              // Delete local file if exists
              try {
                const fileInfo = await FileSystem.getInfoAsync(recording.uri);
                if (fileInfo.exists) {
                  await FileSystem.deleteAsync(recording.uri);
                  console.log('Deleted local recording file:', recording.uri);
                }
              } catch (fileError) {
                console.warn('Could not delete local recording file:', fileError);
              }

              // Note: Cloud file deletion would require Firebase Admin SDK
              // For now, we just mark it as deleted in the database
              // You could add a cloud function to clean up orphaned files

              // Reload recordings
              await loadRecordings();
              
              Alert.alert('Success', 'Recording deleted successfully.');
            } catch (error) {
              console.error('Error deleting recording:', error);
              Alert.alert('Error', 'Failed to delete recording. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Filter recordings
  const filteredRecordings = recordings.filter((recording) => {
    const matchesSearch = searchQuery === '' || 
      recording.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recording.transcription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recording.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recording.subcategory.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || recording.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Get unique categories for filter
  const categories = ['all', ...new Set(recordings.map(r => r.category))];

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date helper
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading voice recordings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Voice Recordings</Text>
        <Text style={styles.headerSubtitle}>
          {filteredRecordings.length} of {recordings.length} recordings
        </Text>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search recordings..."
          clearButtonMode="while-editing"
        />
        <Pressable
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Text style={styles.filterButtonText}>Filter</Text>
        </Pressable>
      </View>

      {/* Recordings List */}
      <ScrollView
        style={styles.recordingsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredRecordings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {recordings.length === 0 
                ? 'No voice recordings yet.\nStart recording during treatments!' 
                : 'No recordings match your search.'}
            </Text>
          </View>
        ) : (
          filteredRecordings.map((recording) => (
            <View key={recording.id} style={styles.recordingCard}>
              {/* Patient Info */}
              <View style={styles.recordingHeader}>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{recording.patientName}</Text>
                  <Text style={styles.patientDetails}>
                    Age {recording.patientAge} • {recording.patientLocation}
                  </Text>
                </View>
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => deleteRecording(recording)}
                >
                  <Text style={styles.deleteButtonText}>×</Text>
                </Pressable>
              </View>

              {/* Recording Info */}
              <View style={styles.recordingInfo}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>
                    {recording.category} - {recording.subcategory}
                  </Text>
                </View>
                <Text style={styles.recordingDate}>
                  {formatDate(recording.timestamp)}
                </Text>
              </View>

              {/* ✅ ADD: Cloud/Local indicator */}
              <View style={styles.sourceIndicator}>
                {recording.cloudUri ? (
                  <View style={styles.cloudBadge}>
                    <Text style={styles.cloudBadgeText}>☁️ Cloud</Text>
                  </View>
                ) : (
                  <View style={styles.localBadge}>
                    <Text style={styles.localBadgeText}>📱 Local Only</Text>
                  </View>
                )}
              </View>

              {/* Transcription/Notes */}
              {recording.transcription && (
                <View style={styles.transcriptionContainer}>
                  <Text style={styles.transcriptionLabel}>Notes:</Text>
                  <Text style={styles.transcriptionText}>
                    {recording.transcription}
                  </Text>
                </View>
              )}

              {/* Playback Controls */}
              <View style={styles.playbackContainer}>
                <Pressable
                  style={[
                    styles.playButton,
                    playingId === recording.id && styles.playButtonActive,
                    loadingAudio === recording.id && styles.playButtonLoading,
                  ]}
                  onPress={() => {
                    if (playingId === recording.id) {
                      stopPlayback();
                    } else {
                      playRecording(recording);
                    }
                  }}
                  disabled={loadingAudio === recording.id}
                >
                  {loadingAudio === recording.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.playButtonText}>
                      {playingId === recording.id ? '⏹️ Stop' : '▶️ Play'}
                    </Text>
                  )}
                </Pressable>

                {playingId === recording.id && (
                  <View style={styles.playbackInfo}>
                    <Text style={styles.playbackTime}>
                      {formatTime(Math.floor(playerStatus.currentTime || 0))} / {formatTime(Math.floor(playerStatus.duration || 0))}
                    </Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${(playerStatus.duration || 0) > 0 
                              ? ((playerStatus.currentTime || 0) / (playerStatus.duration || 0)) * 100 
                              : 0}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter Recordings</Text>
            
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Category:</Text>
              <View style={styles.categoryButtons}>
                {categories.map((category) => (
                  <Pressable
                    key={category}
                    style={[
                      styles.categoryButton,
                      selectedCategory === category && styles.categoryButtonSelected,
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        selectedCategory === category && styles.categoryButtonTextSelected,
                      ]}
                    >
                      {category === 'all' ? 'All Categories' : category}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default VoiceRecordingsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  filterButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  recordingsList: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  recordingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  patientDetails: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  recordingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#e7f3ff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '600',
  },
  recordingDate: {
    fontSize: 12,
    color: '#666',
  },
  // ✅ NEW: Source indicator styles
  sourceIndicator: {
    marginBottom: 12,
  },
  cloudBadge: {
    backgroundColor: '#d4edda',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  cloudBadgeText: {
    fontSize: 11,
    color: '#155724',
    fontWeight: '600',
  },
  localBadge: {
    backgroundColor: '#fff3cd',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  localBadgeText: {
    fontSize: 11,
    color: '#856404',
    fontWeight: '600',
  },
  transcriptionContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  transcriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  transcriptionText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
  },
  playbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    backgroundColor: '#28a745',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  playButtonActive: {
    backgroundColor: '#dc3545',
  },
  playButtonLoading: {
    backgroundColor: '#6c757d',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  playbackInfo: {
    flex: 1,
  },
  playbackTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#28a745',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  categoryButtons: {
    gap: 8,
  },
  categoryButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  categoryButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  categoryButtonTextSelected: {
    color: '#fff',
  },
  modalActions: {
    alignItems: 'center',
  },
  modalCloseButton: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});