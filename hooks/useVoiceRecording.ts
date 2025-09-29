// hooks/useVoiceRecording.ts
import { useState, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { 
  useAudioRecorder, 
  useAudioRecorderState,
  useAudioPlayer,
  useAudioPlayerStatus,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync 
} from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { database } from '../db';
import AudioNote from '../db/models/AudioNote';
import uuid from 'react-native-uuid';

export interface VoiceRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  recordingDuration: number;
  isPlaying: boolean;
  playbackPosition: number;
  playbackDuration: number;
  canRecord: boolean;
  isInitialized: boolean;
}

export const useVoiceRecording = (patientId: string, clinicianId: string, category: string, subcategory: string) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [savedDuration, setSavedDuration] = useState(0); // Track duration independently
  
  // Create audio recorder with high quality preset
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, (status) => {
    console.log('Recording status:', status);
  });
  
  // Get recorder state
  const recorderState = useAudioRecorderState(recorder);
  
  // Create audio player for playback (initially null)
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);

  // Initialize audio permissions and mode
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        console.log('🎤 Initializing audio...');
        
        // Request recording permissions
        const { granted } = await requestRecordingPermissionsAsync();
        console.log('🎤 Permission granted:', granted);
        setHasPermission(granted);
        
        if (!granted) {
          console.warn('⚠️ Microphone permission denied');
          setIsInitialized(true);
          return;
        }

        // Configure audio mode for recording
        try {
          await setAudioModeAsync({
            playsInSilentMode: true,
            allowsRecording: true,
          });
          console.log('✅ Audio mode configured successfully');
        } catch (audioModeError) {
          console.warn('⚠️ Failed to set audio mode:', audioModeError);
          // Continue anyway - some devices may have restrictions
        }

        // Prepare the recorder to enable canRecord
        try {
          await recorder.prepareToRecordAsync();
          console.log('✅ Recorder prepared successfully');
        } catch (prepareError) {
          console.warn('⚠️ Failed to prepare recorder:', prepareError);
        }

        console.log('✅ Audio initialized successfully');
        setIsInitialized(true);
      } catch (error) {
        console.error('❌ Error initializing audio:', error);
        setIsInitialized(true);
        Alert.alert('Error', 'Failed to initialize audio recording.');
      }
    };

    initializeAudio();
  }, []);

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get current state
  const state: VoiceRecordingState = {
    isRecording: recorderState.isRecording,
    isPaused: false, // expo-audio doesn't support pause/resume for recording
    recordingDuration: recorderState.isRecording ? Math.floor(recorderState.durationMillis / 1000) : savedDuration,
    isPlaying: playerStatus.playing || false,
    playbackPosition: Math.floor(playerStatus.currentTime || 0),
    playbackDuration: Math.floor(playerStatus.duration || 0),
    // More permissive canRecord - if we have permission and are initialized, allow recording
    canRecord: isInitialized && hasPermission, // Remove dependency on recorderState.canRecord
    isInitialized,
  };

  // Start recording
  const startRecording = async () => {
    try {
      if (!hasPermission) {
        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted) {
          Alert.alert('Permission Required', 'Microphone permission is required for voice recording.');
          return;
        }
        setHasPermission(true);
      }

      // Stop any existing playback
      if (playerStatus.playing) {
        player.pause();
      }

      // Prepare if not already prepared (though we should be prepared from initialization)
      if (!recorderState.canRecord) {
        console.log('🎤 Preparing recorder for recording...');
        await recorder.prepareToRecordAsync();
      }

      // Start recording
      recorder.record();
      
      console.log('🎤 Started recording');
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  // Stop recording
  const stopRecording = async () => {
    try {
      if (recorderState.isRecording) {
        // Save the current duration before stopping
        const currentDuration = Math.floor(recorderState.durationMillis / 1000);
        setSavedDuration(currentDuration);
        console.log('Saving duration before stop:', currentDuration);
        
        await recorder.stop();
        
        // Give a small delay for the recorder to finalize the file
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Get the URI from the recorder
        const recordingUri = recorder.uri;
        console.log('Stopped recording, URI from recorder:', recordingUri);
        
        if (recordingUri) {
          setRecordingUri(recordingUri);
          
          // Verify the file exists
          try {
            const fileInfo = await FileSystem.getInfoAsync(recordingUri);
            console.log('Recording file info:', { 
              exists: fileInfo.exists, 
              size: fileInfo.size,
              uri: recordingUri 
            });
            
            if (!fileInfo.exists) {
              console.error('Recording file does not exist at path:', recordingUri);
              Alert.alert('Error', 'Recording file was not created properly. Please try again.');
              return;
            }
          } catch (fileCheckError) {
            console.error('Error checking file:', fileCheckError);
          }
        } else {
          console.error('No recording URI available after stopping');
          Alert.alert('Error', 'Recording was not saved properly. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to stop recording.');
    }
  };

  // Play recording
  const playRecording = async () => {
    try {
      const uri = recordingUri || recorder.uri;
      console.log('▶️ Attempting to play recording:', { 
        recordingUri, 
        recorderUri: recorder.uri, 
        finalUri: uri 
      });
      
      if (!uri) {
        Alert.alert('Error', 'No recording to play.');
        return;
      }

      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(uri);
      console.log('📁 File check for playback:', { exists: fileInfo.exists, size: fileInfo.size, uri });
      
      if (!fileInfo.exists) {
        Alert.alert('Error', 'Recording file not found.');
        return;
      }

      // Load and play the recording
      player.replace({ uri });
      player.play();
      
      console.log('▶️ Started playback:', uri);
    } catch (error) {
      console.error('❌ Error playing recording:', error);
      Alert.alert('Error', 'Failed to play recording.');
    }
  };

  // Stop playback
  const stopPlayback = async () => {
    try {
      player.pause();
      player.seekTo(0);
      console.log('⏹️ Stopped playback');
    } catch (error) {
      console.error('❌ Error stopping playback:', error);
    }
  };

  // Save recording to database
  const saveRecording = async (transcription: string = '') => {
    try {
      const uri = recordingUri || recorder.uri;
      if (!uri) {
        Alert.alert('Error', 'No recording to save.');
        return null;
      }

      // Verify the file exists before saving
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        Alert.alert('Error', 'Recording file not found. Please try recording again.');
        return null;
      }

      console.log('💾 Saving recording:', { uri, size: fileInfo.size });

      // Create a permanent file path
      const fileName = `recording_${Date.now()}.m4a`;
      const permanentUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // Copy the recording to permanent storage
      await FileSystem.copyAsync({
        from: uri,
        to: permanentUri,
      });

      console.log('📁 Copied to permanent storage:', permanentUri);

      // Save to database
      let savedAudioNote: AudioNote;
      
      await database.write(async () => {
        savedAudioNote = await database.get<AudioNote>('audio_notes').create(audioNote => {
          // Let WatermelonDB auto-generate the ID
          audioNote.patientId = patientId;
          audioNote.uri = permanentUri;
          audioNote.transcription = transcription;
          audioNote.timestamp = Date.now();
          audioNote.clinicianId = clinicianId;
          audioNote.category = category;
          audioNote.subcategory = subcategory;
        });
      });

      const audioNoteId = savedAudioNote!.id;

      console.log('💾 Saved recording to database:', {
        id: audioNoteId,
        patientId,
        category,
        subcategory,
        uri: permanentUri,
        duration: state.recordingDuration
      });

      // Clear recording reference
      setRecordingUri(null);
      setSavedDuration(0); // Reset saved duration

      return audioNoteId;
    } catch (error) {
      console.error('❌ Error saving recording:', error);
      Alert.alert('Error', 'Failed to save recording. Please try again.');
      return null;
    }
  };

  // Cancel recording (discard without saving)
  const cancelRecording = async () => {
    try {
      if (recorderState.isRecording) {
        await recorder.stop();
      }
      
      const uri = recordingUri || recorder.uri;
      if (uri) {
        // Delete the temporary file
        try {
          await FileSystem.deleteAsync(uri);
        } catch (deleteError) {
          console.warn('Could not delete temporary recording file:', deleteError);
        }
      }
      
      setRecordingUri(null);
      setSavedDuration(0); // Reset saved duration
      console.log('Cancelled recording');
    } catch (error) {
      console.error('Error cancelling recording:', error);
    }
  };

  // Cleanup function
  const cleanup = async () => {
    try {
      if (recorderState.isRecording) {
        await recorder.stop();
      }
      if (playerStatus.playing) {
        player.pause();
      }
      // Don't call player.remove() as it can cause crashes
      // The useAudioPlayer hook will handle cleanup automatically
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  };

  // Note: expo-audio doesn't support pause/resume for recording
  // These are kept for API compatibility but will show alerts
  const pauseRecording = async () => {
    Alert.alert('Not Supported', 'Pause/resume is not supported in the current audio library. Please stop and start a new recording if needed.');
  };

  const resumeRecording = async () => {
    Alert.alert('Not Supported', 'Pause/resume is not supported in the current audio library. Please stop and start a new recording if needed.');
  };

  // Debug helper function
  const getDebugInfo = () => {
    return {
      isInitialized,
      hasPermission,
      recorderCanRecord: recorderState.canRecord,
      recorderIsRecording: recorderState.isRecording,
      recorderDuration: recorderState.durationMillis,
      finalCanRecord: state.canRecord,
      recorderState: {
        isRecording: recorderState.isRecording,
        durationMillis: recorderState.durationMillis,
        canRecord: recorderState.canRecord,
        url: recorderState.url,
        mediaServicesDidReset: recorderState.mediaServicesDidReset,
      }
    };
  };

  return {
    state,
    startRecording,
    pauseRecording, // Shows alert - not supported
    resumeRecording, // Shows alert - not supported  
    stopRecording,
    saveRecording,
    playRecording,
    stopPlayback,
    cancelRecording,
    cleanup,
    formatTime,
    getDebugInfo, // Add debug function
  };
};