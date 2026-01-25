// screens/FacialRecognitionSearchScreen.tsx - WITH DEBUGGING
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { useIsFocused } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import Patient from '../db/models/Patient';
import { facialRecognitionService } from '../services/FacialRecognitionService';
import { SmartImage } from '../components/SmartImage';

interface MatchResult {
  patientId: string;
  firstName: string;
  lastName: string;
  confidence: number;
  distance: number;
  patient?: Patient;
}

interface DebugInfo {
  totalPatients: number;
  patientsWithPhotos: number;
  patientsWithEmbeddings: number;
  capturedPhotoExists: boolean;
  capturedPhotoSize: number;
  extractedEmbedding: boolean;
  searchTime: number;
}

const FacialRecognitionSearchScreen = ({ navigation }: any) => {
  const db = useDatabase();
  const isFocused = useIsFocused();
  const cameraRef = useRef<any>(null);
  
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(true);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [showDebug, setShowDebug] = useState(true); // Show debug by default

  // Initialize facial recognition service when screen loads
  useEffect(() => {
    const init = async () => {
      try {
        console.log('🚀 Initializing facial recognition for search...');
        await facialRecognitionService.initialize();
        setIsInitializing(false);
        console.log('✅ Facial recognition ready');
      } catch (error) {
        console.error('❌ Failed to initialize facial recognition:', error);
        Alert.alert(
          'Initialization Error',
          'Failed to initialize facial recognition. Please restart the app.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    };

    if (isFocused) {
      init();
    }
  }, [isFocused]);

  // Request camera permission
  useEffect(() => {
    if (!permission?.granted && isFocused) {
      requestPermission();
    }
  }, [isFocused]);

  const takePicture = async () => {
    if (!cameraRef.current || isProcessing) return;

    setIsProcessing(true);
    setMatches([]);
    setCapturedImage(null);
    setDebugInfo(null);

    const startTime = Date.now();

    try {
      console.log('📸 Taking photo for facial recognition...');
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      console.log('✅ Photo captured:', photo.uri);
      setCapturedImage(photo.uri);
      setShowCamera(false);

      // Check if photo file exists
      const photoInfo = await FileSystem.getInfoAsync(photo.uri);
      console.log('📁 Photo file info:', {
        exists: photoInfo.exists,
        size: photoInfo.size,
        uri: photo.uri,
      });

      // Extract face embedding from captured photo
      console.log('🔍 Extracting face embedding...');
      const faceEmbedding = await facialRecognitionService.extractFaceEmbedding(photo.uri);

      if (!faceEmbedding) {
        Alert.alert(
          'No Face Detected',
          'Could not detect a face in the photo. Please try again with better lighting and positioning.',
          [{ text: 'Retry', onPress: resetSearch }]
        );
        setIsProcessing(false);
        return;
      }

      console.log('✅ Face embedding extracted, searching database...');

      // Load all patients from database
      const allPatients = await db.get<Patient>('patients').query().fetch();
      console.log(`📊 Total patients in database: ${allPatients.length}`);

      // Count patients with photos and embeddings
      const patientsWithPhotos = allPatients.filter(p => p.photoUri && p.photoUri !== '');
      const patientsWithEmbeddings = allPatients.filter(p => p.faceEmbedding && p.faceEmbedding !== '');
      
      console.log(`📸 Patients with photos: ${patientsWithPhotos.length}`);
      console.log(`🧬 Patients with face embeddings: ${patientsWithEmbeddings.length}`);

      // Show some sample data
      if (patientsWithEmbeddings.length > 0) {
        const sample = patientsWithEmbeddings[0];
        console.log('📋 Sample patient with embedding:', {
          id: sample.id,
          name: `${sample.firstName} ${sample.lastName}`,
          hasPhoto: !!sample.photoUri,
          embeddingLength: sample.faceEmbedding?.length || 0,
        });
      }

      if (patientsWithEmbeddings.length === 0) {
        const endTime = Date.now();
        setDebugInfo({
          totalPatients: allPatients.length,
          patientsWithPhotos: patientsWithPhotos.length,
          patientsWithEmbeddings: 0,
          capturedPhotoExists: photoInfo.exists,
          capturedPhotoSize: photoInfo.size || 0,
          extractedEmbedding: true,
          searchTime: endTime - startTime,
        });
        
        Alert.alert(
          'No Patients Found',
          `Found ${allPatients.length} total patients, but none have facial recognition data yet.\n\n` +
          `Patients with photos: ${patientsWithPhotos.length}\n` +
          `Patients with face embeddings: 0\n\n` +
          `Make sure to register patients using the updated NewPatientScreen that extracts face embeddings.`,
          [{ text: 'OK', onPress: resetSearch }]
        );
        setIsProcessing(false);
        return;
      }

      // Prepare patients with embeddings for matching
      const patientsForMatching = patientsWithEmbeddings.map(p => {
        try {
          const embedding = JSON.parse(p.faceEmbedding);
          return {
            id: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            embedding: embedding,
          };
        } catch (error) {
          console.error(`❌ Failed to parse embedding for patient ${p.id}:`, error);
          return null;
        }
      }).filter(p => p !== null) as Array<{ id: string; embedding: number[]; firstName: string; lastName: string }>;

      console.log(`🔍 Searching ${patientsForMatching.length} patients with valid embeddings...`);

      // Find matching patients
      const matchResults = facialRecognitionService.findMatches(
        faceEmbedding,
        patientsForMatching,
        5.0 // Threshold - adjust based on testing (higher = more lenient)
      );

      console.log(`✅ Found ${matchResults.length} potential matches`);

      // Log top 3 matches for debugging
      matchResults.slice(0, 3).forEach((match, index) => {
        console.log(`Match #${index + 1}:`, {
          name: `${match.firstName} ${match.lastName}`,
          confidence: `${match.confidence.toFixed(1)}%`,
          distance: match.distance.toFixed(3),
        });
      });

      // Load full patient objects for matches
      const matchesWithPatients: MatchResult[] = await Promise.all(
        matchResults.map(async (match) => {
          const patient = await db.get<Patient>('patients').find(match.patientId);
          return {
            ...match,
            patient,
          };
        })
      );

      const endTime = Date.now();

      setDebugInfo({
        totalPatients: allPatients.length,
        patientsWithPhotos: patientsWithPhotos.length,
        patientsWithEmbeddings: patientsWithEmbeddings.length,
        capturedPhotoExists: photoInfo.exists,
        capturedPhotoSize: photoInfo.size || 0,
        extractedEmbedding: true,
        searchTime: endTime - startTime,
      });

      setMatches(matchesWithPatients);

      if (matchesWithPatients.length === 0) {
        Alert.alert(
          'No Matches Found',
          `Searched ${patientsWithEmbeddings.length} patients but found no matches.\n\n` +
          `This could mean:\n` +
          `• The person is not registered\n` +
          `• Photo quality is too different\n` +
          `• Simple hashing has low accuracy\n\n` +
          `Try:\n` +
          `• Better lighting\n` +
          `• Similar angle to original photo\n` +
          `• Or use name search instead`,
          [{ text: 'Retry', onPress: resetSearch }]
        );
      }

    } catch (error) {
      console.error('❌ Error during facial recognition:', error);
      Alert.alert(
        'Error',
        'An error occurred during facial recognition. Please try again.',
        [{ text: 'OK', onPress: resetSearch }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const resetSearch = () => {
    setMatches([]);
    setCapturedImage(null);
    setShowCamera(true);
    setIsProcessing(false);
    setDebugInfo(null);
  };

  const handleSelectPatient = (patientId: string) => {
    navigation.navigate('Treatment', { patientId });
  };

  const renderDebugInfo = () => {
    if (!debugInfo || !showDebug) return null;

    return (
      <View style={styles.debugContainer}>

       

      </View>
    );
  };

  const renderMatchItem = ({ item }: { item: MatchResult }) => {
    if (!item.patient) return null;

    const confidenceColor = 
      item.confidence > 70 ? '#28a745' : // Green - High confidence
      item.confidence > 50 ? '#ffc107' : // Yellow - Medium confidence
      '#ff9800'; // Orange - Low confidence

    return (
      <TouchableOpacity
        style={styles.matchCard}
        onPress={() => handleSelectPatient(item.patientId)}
        activeOpacity={0.7}
      >
        <View style={styles.matchCardContent}>
          {item.patient.photoUri ? (
            <SmartImage
              localUri={item.patient.photoUri}
              cloudUri={item.patient.photoCloudUri}
              style={styles.matchPhoto}
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>
                {item.patient.firstName[0]}{item.patient.lastName[0]}
              </Text>
            </View>
          )}

          <View style={styles.matchInfo}>
            <Text style={styles.matchName}>
              {item.firstName} {item.lastName}
            </Text>
            <Text style={styles.matchDetails}>
              Age: {item.patient.age} • {item.patient.gender}
            </Text>
            <Text style={styles.matchLocation}>
              📍 {item.patient.location}
            </Text>
            
            <View style={styles.matchMetrics}>
              <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor }]}>
                <Text style={styles.confidenceText}>
                  {item.confidence.toFixed(0)}% Match
                </Text>
              </View>
              <Text style={styles.distanceText}>
                Distance: {item.distance.toFixed(3)}
              </Text>
            </View>
          </View>

          <Text style={styles.chevron}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Initializing facial recognition...</Text>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionText}>
          Facial recognition requires camera access to identify patients.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera View or Captured Image */}
      {showCamera && isFocused ? (
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
          >
            <View style={styles.cameraOverlay}>
              <View style={styles.faceGuide}>
                <Text style={styles.guideText}>Position face in frame</Text>
              </View>
            </View>
          </CameraView>

          <View style={styles.instructions}>
            <Text style={styles.instructionTitle}>📸 Facial Recognition Search</Text>

            <Text style={styles.instructionText}>
              • Position patient's face in center
            </Text>
            <Text style={styles.instructionText}>
              • Ensure good lighting
            </Text>
            <Text style={styles.instructionText}>
              • Look directly at camera
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
            onPress={takePicture}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.captureButtonText}>Capture & Search</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : capturedImage ? (
        <ScrollView style={styles.resultsContainer}>
          <View style={styles.capturedImageContainer}>
            <Image source={{ uri: capturedImage }} style={styles.capturedImage} />
            <TouchableOpacity style={styles.retryButton} onPress={resetSearch}>
              <Text style={styles.retryButtonText}>↻ Retry</Text>
            </TouchableOpacity>
          </View>

          {renderDebugInfo()}

          {isProcessing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#007bff" />
              <Text style={styles.processingText}>Analyzing face...</Text>
            </View>
          ) : matches.length > 0 ? (
            <>
              <Text style={styles.resultsTitle}>
                Found {matches.length} potential match{matches.length !== 1 ? 'es' : ''}
              </Text>
              <FlatList
                data={matches}
                renderItem={renderMatchItem}
                keyExtractor={(item) => item.patientId}
                contentContainerStyle={styles.matchList}
                scrollEnabled={false}
              />
            </>
          ) : null}
        </ScrollView>
      ) : null}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.navButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default FacialRecognitionSearchScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 40,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 40,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  backButtonText: {
    color: '#007bff',
    fontSize: 16,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceGuide: {
    width: 250,
    height: 300,
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  instructions: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
    borderRadius: 12,
  },
  instructionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  instructionText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 6,
  },
  captureButton: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    minWidth: 200,
    alignItems: 'center',
  },
  captureButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  capturedImageContainer: {
    position: 'relative',
  },
  capturedImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#000',
  },
  retryButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  debugContainer: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff3cd',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
  },
  debugToggle: {
    fontSize: 16,
    color: '#856404',
  },
  debugContent: {
    padding: 12,
    backgroundColor: '#fffbf0',
  },
  debugText: {
    fontSize: 13,
    color: '#856404',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  debugWarning: {
    fontWeight: 'bold',
    marginTop: 8,
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  processingText: {
    marginTop: 20,
    fontSize: 18,
    color: '#333',
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  matchList: {
    padding: 16,
  },
  matchCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  matchCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  matchPhoto: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 16,
  },
  photoPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  photoPlaceholderText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  matchDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  matchLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  matchMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  distanceText: {
    fontSize: 11,
    color: '#999',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  chevron: {
    fontSize: 32,
    color: '#ccc',
    marginLeft: 8,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  navButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});