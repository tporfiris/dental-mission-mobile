// components/VoiceRecorder.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Animated,
} from 'react-native';
import { useVoiceRecording } from '../hooks/useVoiceRecording';
import { useAuth } from '../contexts/AuthContext';

interface VoiceRecorderProps {
  patientId: string;
  category: string;
  subcategory: string;
  buttonStyle?: any;
  buttonTextStyle?: any;
  compact?: boolean;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  patientId,
  category,
  subcategory,
  buttonStyle,
  buttonTextStyle,
  compact = false,
}) => {
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [pulseAnim] = useState(new Animated.Value(1));

  const {
    state,
    startRecording,
    stopRecording,
    saveRecording,
    playRecording,
    stopPlayback,
    cancelRecording,
    cleanup,
    formatTime,
    getDebugInfo,
  } = useVoiceRecording(
    patientId,
    user?.uid || 'unknown',
    category,
    subcategory
  );

  // Cleanup on unmount - let the hooks handle cleanup automatically
  useEffect(() => {
    return () => {
      // The useAudioPlayer and useAudioRecorder hooks handle cleanup automatically
      // No manual cleanup needed
    };
  }, []);

  // Pulse animation for recording
  useEffect(() => {
    if (state.isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state.isRecording]);

  const handleSaveRecording = async () => {
    console.log('💾 Attempting to save recording...');
    const recordingId = await saveRecording(transcription.trim());
    if (recordingId) {
      Alert.alert(
        'Success',
        'Voice recording saved successfully!',
        [{ text: 'OK', onPress: () => setModalVisible(false) }]
      );
      setTranscription('');
    }
  };

  const handleCancelRecording = () => {
    Alert.alert(
      'Cancel Recording',
      'Are you sure you want to discard this recording?',
      [
        { text: 'Keep Recording', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            await cancelRecording();
            setModalVisible(false);
            setTranscription('');
          },
        },
      ]
    );
  };

  const openRecordingModal = () => {
    const debugInfo = getDebugInfo();
    console.log('🎤 Opening recording modal - Debug info:', debugInfo);

    if (!state.isInitialized) {
      Alert.alert(
        'Initializing...',
        'Audio is still initializing. Please wait a moment and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!state.canRecord) {
      // Show debug info in development
      const debugText = __DEV__ 
        ? `\n\nDebug Info:\n• Initialized: ${debugInfo.isInitialized}\n• Has Permission: ${debugInfo.hasPermission}\n• Recorder Can Record: ${debugInfo.recorderCanRecord}`
        : '';
        
      Alert.alert(
        'Cannot Record',
        `Recording is not available. This could be due to:\n\n• Microphone permission not granted\n• Audio session not properly initialized\n• Device microphone in use by another app\n\nPlease check your device settings and try again.${debugText}`,
        [
          { 
            text: 'Check Settings', 
            onPress: () => {
              Alert.alert('Settings', 'Please go to your device Settings > Apps > [Your App] > Permissions and enable Microphone access.');
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }
    
    setModalVisible(true);
    setTranscription('');
  };

  const renderModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => {
        if (state.isRecording) {
          handleCancelRecording();
        } else {
          setModalVisible(false);
        }
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Voice Recording</Text>
          <Text style={styles.modalSubtitle}>
            {category} - {subcategory}
          </Text>

          {/* Recording Status */}
          <View style={styles.recordingStatus}>
            {state.isRecording ? (
              <Animated.View
                style={[
                  styles.recordingIndicator,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <Text style={styles.recordingText}>🔴 RECORDING</Text>
              </Animated.View>
            ) : state.recordingDuration > 0 ? (
              <View style={styles.readyIndicator}>
                <Text style={styles.readyText}>Recording Complete</Text>
              </View>
            ) : (
              <View style={styles.readyIndicator}>
                <Text style={styles.readyText}>Ready to Record</Text>
              </View>
            )}
            
            <Text style={styles.durationText}>
              Duration: {formatTime(state.recordingDuration)}
            </Text>
            
            {state.recordingDuration > 0 && !state.isRecording && (
              <Text style={styles.statusText}>
                Recording ready for playback and saving
              </Text>
            )}
          </View>

          {/* Recording Controls */}
          <View style={styles.controlsContainer}>
            {!state.isRecording && state.recordingDuration === 0 ? (
              <Pressable 
                style={[styles.recordButton, !state.canRecord && styles.disabledButton]} 
                onPress={startRecording}
                disabled={!state.canRecord}
              >
                <Text style={styles.recordButtonText}>🎤 Start Recording</Text>
              </Pressable>
            ) : state.isRecording ? (
              <Pressable
                style={[styles.controlButton, styles.stopButton]}
                onPress={stopRecording}
              >
                <Text style={styles.controlButtonText}>⏹️ Stop Recording</Text>
              </Pressable>
            ) : (
              <View style={styles.recordingControls}>
                <Pressable
                  style={styles.controlButton}
                  onPress={startRecording}
                >
                  <Text style={styles.controlButtonText}>🎤 Record Again</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Playback Controls (when recording is stopped) */}
          {!state.isRecording && state.recordingDuration > 0 && (
            <View style={styles.playbackContainer}>
              <Text style={styles.playbackLabel}>Preview Recording:</Text>
              <View style={styles.playbackControls}>
                <Pressable
                  style={styles.playButton}
                  onPress={state.isPlaying ? stopPlayback : playRecording}
                >
                  <Text style={styles.playButtonText}>
                    {state.isPlaying ? '⏹️ Stop' : '▶️ Play'}
                  </Text>
                </Pressable>
                
                {state.isPlaying && (
                  <Text style={styles.playbackTime}>
                    {formatTime(state.playbackPosition)} / {formatTime(state.playbackDuration)}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Transcription Input */}
          {!state.isRecording && state.recordingDuration > 0 && (
            <View style={styles.transcriptionContainer}>
              <Text style={styles.transcriptionLabel}>
                Notes (Optional):
              </Text>
              <TextInput
                style={styles.transcriptionInput}
                value={transcription}
                onChangeText={setTranscription}
                placeholder="Add notes about this recording..."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {!state.isRecording && state.recordingDuration > 0 ? (
              // Show Save/Discard buttons when recording is complete
              <>
                <Pressable
                  style={styles.cancelButton}
                  onPress={handleCancelRecording}
                >
                  <Text style={styles.cancelButtonText}>Discard</Text>
                </Pressable>
                <Pressable
                  style={styles.saveButton}
                  onPress={handleSaveRecording}
                >
                  <Text style={styles.saveButtonText}>Save Recording</Text>
                </Pressable>
              </>
            ) : (
              // Show Close/Cancel button when recording or no recording
              <Pressable
                style={styles.closeButton}
                onPress={() => {
                  if (state.isRecording) {
                    handleCancelRecording();
                  } else {
                    setModalVisible(false);
                  }
                }}
              >
                <Text style={styles.closeButtonText}>
                  {state.isRecording ? 'Cancel Recording' : 'Close'}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Debug Info in Development */}
          {__DEV__ && (
            <View style={styles.debugInfo}>
              <Text style={styles.debugText}>
                Debug: Recording={state.isRecording}, Duration={state.recordingDuration}
              </Text>
            </View>
          )}

          {/* Permission Notice */}
          {state.isInitialized && !state.canRecord && (
            <View style={styles.permissionNotice}>
              <Text style={styles.permissionNoticeText}>
                ⚠️ Recording unavailable. Please check microphone permissions in device settings.
              </Text>
            </View>
          )}

          {/* Initialization Notice */}
          {!state.isInitialized && (
            <View style={styles.initializingNotice}>
              <Text style={styles.initializingNoticeText}>
                🔄 Initializing audio system...
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  if (compact) {
    return (
      <>
        <Pressable
          style={[styles.compactButton, buttonStyle]}
          onPress={openRecordingModal}
        >
          <Text style={[styles.compactButtonText, buttonTextStyle]}>🎤</Text>
        </Pressable>
        {renderModal()}
      </>
    );
  }

  return (
    <>
      <Pressable
        style={[styles.recordingButton, buttonStyle]}
        onPress={openRecordingModal}
      >
        <Text style={[styles.recordingButtonText, buttonTextStyle]}>
          🎤 Voice Recording
        </Text>
      </Pressable>
      {renderModal()}
    </>
  );
};

export default VoiceRecorder;

const styles = StyleSheet.create({
  recordingButton: {
    backgroundColor: '#6f42c1',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginVertical: 8,
  },
  recordingButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  compactButton: {
    backgroundColor: '#6f42c1',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactButtonText: {
    fontSize: 18,
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  recordingStatus: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recordingIndicator: {
    backgroundColor: '#dc3545',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  recordingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  readyIndicator: {
    backgroundColor: '#28a745',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  readyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  durationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  controlsContainer: {
    marginBottom: 20,
  },
  recordButton: {
    backgroundColor: '#dc3545',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#6c757d',
    opacity: 0.6,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  recordingControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  controlButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 120,
  },
  stopButton: {
    backgroundColor: '#dc3545',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  playbackContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  playbackLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    backgroundColor: '#28a745',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  playButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  playbackTime: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  transcriptionContainer: {
    marginBottom: 20,
  },
  transcriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  transcriptionInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 80,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 1,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 1,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 1,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  permissionNotice: {
    backgroundColor: '#fff3cd',
    borderRadius: 6,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
  },
  permissionNoticeText: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '500',
    textAlign: 'center',
  },
  initializingNotice: {
    backgroundColor: '#e7f3ff',
    borderRadius: 6,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#007bff',
  },
  initializingNoticeText: {
    fontSize: 12,
    color: '#004085',
    fontWeight: '500',
    textAlign: 'center',
  },
  debugInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  debugText: {
    fontSize: 10,
    color: '#6c757d',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
});