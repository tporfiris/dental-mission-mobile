// screens/NewPatientScreen.tsx - UPDATED with facial recognition embedding extraction
import React, { useState } from 'react';
import {
  View, Text, TextInput, Button, StyleSheet, Alert, Platform,
  Image, TouchableOpacity, ScrollView, KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Picker } from '@react-native-picker/picker';
import uuid from 'react-native-uuid';
import * as ImagePicker from 'expo-image-picker';
import Patient from '../db/models/Patient';
import { mediaUploadService } from '../services/MediaUploadService';
import { facialRecognitionService } from '../services/FacialRecognitionService';

const NewPatientScreen = ({ navigation }: any) => {
  const db = useDatabase();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [location, setLocation] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isProcessingFace, setIsProcessingFace] = useState(false);
  const [faceDetected, setFaceDetected] = useState<boolean | null>(null);

  const pickImage = async () => {
    console.log('📸 Requesting camera permission...');
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    console.log('🎯 Permission granted:', permissionResult.granted);
  
    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Camera access is needed to take patient photos.');
      return;
    }
  
    console.log('🚀 Launching camera...');
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.5,
      allowsEditing: true,
      base64: false,
    });
  
    console.log('📸 Camera result:', result);
  
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const capturedUri = result.assets[0].uri;
      setPhotoUri(capturedUri);
      setFaceDetected(null); // Reset face detection status
      console.log('✅ Photo selected:', capturedUri);
      
      // Process face embedding in background
      processFaceEmbedding(capturedUri);
    } else {
      console.log('❌ Camera was cancelled or no result');
    }
  };

  const processFaceEmbedding = async (imageUri: string) => {
    setIsProcessingFace(true);
    
    try {
      console.log('🔍 Extracting facial features for future recognition...');
      
      // Initialize facial recognition service if needed
      await facialRecognitionService.initialize();
      
      // Extract face embedding
      const embedding = await facialRecognitionService.extractFaceEmbedding(imageUri);
      
      if (!embedding) {
        console.warn('⚠️ Could not detect face in photo - facial recognition will not be available for this patient');
        setFaceDetected(false);
        Alert.alert(
          'Face Not Detected',
          'Could not detect a face in the photo. The patient will still be saved, but facial recognition search will not be available for them.\n\nFor best results:\n• Ensure good lighting\n• Face the camera directly\n• Avoid sunglasses or face coverings',
          [{ text: 'OK' }]
        );
      } else {
        console.log('✅ Facial features extracted successfully');
        setFaceDetected(true);
      }
      
    } catch (error) {
      console.error('❌ Error processing face embedding:', error);
      setFaceDetected(false);
      Alert.alert(
        'Facial Recognition Warning',
        'Could not process facial features. The patient will still be saved, but facial recognition search will not work for them.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessingFace(false);
    }
  };

  const handleSave = async () => {
    if (!firstName || !lastName || !age || !location) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }

    // Optional: Recommend taking a photo for facial recognition
    if (!photoUri) {
      Alert.alert(
        'No Photo Taken',
        'Taking a patient photo enables faster facial recognition search. Continue without photo?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue Anyway', onPress: () => savePatient() }
        ]
      );
      return;
    }

    await savePatient();
  };

  const savePatient = async () => {
    try {
      const id = uuid.v4();
      
      // Extract face embedding if photo exists
      let faceEmbeddingJson = '';
      if (photoUri) {
        try {
          console.log('🔍 Extracting facial embedding before saving...');
          
          await facialRecognitionService.initialize();
          const embedding = await facialRecognitionService.extractFaceEmbedding(photoUri);
          
          if (embedding) {
            const embeddingArray = facialRecognitionService.embeddingToArray(embedding);
            faceEmbeddingJson = JSON.stringify(embeddingArray);
            console.log('✅ Face embedding extracted and will be saved with patient');
          } else {
            console.warn('⚠️ No face detected - patient will be saved without facial recognition');
          }
        } catch (error) {
          console.error('❌ Error extracting face embedding:', error);
          // Continue saving patient even if face extraction fails
        }
      }
  
      await db.write(async () => {
        await db.get<Patient>('patients').create(patient => {
          patient._raw.id = id;
          patient.firstName = firstName;
          patient.lastName = lastName;
          patient.age = parseInt(age);
          patient.gender = gender;
          patient.location = location;
          patient.photoUri = photoUri || '';
          patient.photoCloudUri = ''; // Empty initially
          patient.faceEmbedding = faceEmbeddingJson; // ✅ NEW: Save face embedding
        });
      });

      // Queue photo for upload when WiFi is available
      if (photoUri) {
        mediaUploadService.queueForUpload(photoUri, 'photo', id);
      }
  
      console.log('✅ Patient saved with ID:', id);
      console.log('✅ Face embedding saved:', faceEmbeddingJson ? 'Yes' : 'No');

      // Navigate to PatientActionSelection
      navigation.navigate('PatientActionSelection', { 
        patientId: id,
        patientName: firstName + ' ' + lastName
      });
  
    } catch (err) {
      console.error('❌ Failed to save patient:', err);
      Alert.alert('Error', 'Something went wrong while saving.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
      <Text style={styles.label}>First Name *</Text>
      <TextInput 
        placeholder="Enter first name" 
        placeholderTextColor="#999"
        value={firstName} 
        onChangeText={setFirstName} 
        style={styles.input} 
      />
      
      <Text style={styles.label}>Last Name *</Text>
      <TextInput 
        placeholder="Enter last name" 
        placeholderTextColor="#999"
        value={lastName} 
        onChangeText={setLastName} 
        style={styles.input} 
      />
      
      <Text style={styles.label}>Age *</Text>
      <TextInput 
        placeholder="Enter age" 
        placeholderTextColor="#999"
        value={age} 
        onChangeText={setAge} 
        keyboardType="numeric" 
        style={styles.input} 
      />
      
      <Text style={styles.label}>Location/Village *</Text>
      <TextInput 
        placeholder="Enter location or village" 
        placeholderTextColor="#999"
        value={location} 
        onChangeText={setLocation} 
        style={styles.input} 
      />

      <Text style={styles.label}>Gender *</Text>
      <View style={styles.pickerContainer}>
        <Picker 
          selectedValue={gender} 
          onValueChange={(itemValue) => setGender(itemValue)} 
          style={styles.picker}
        >
          <Picker.Item label="Male" value="Male" />
          <Picker.Item label="Female" value="Female" />
          <Picker.Item label="Other" value="Other" />
        </Picker>
      </View>

      {/* ✅ ENHANCED: Photo section with facial recognition indicator */}
      <View style={styles.photoSection}>
        <Text style={styles.label}>Patient Photo</Text>
        <Text style={styles.photoHint}>
          📸 Photo enables facial recognition for faster patient lookup
        </Text>
        
        {photoUri ? (
          <View>
            <View style={styles.imageContainer}>
              <Image source={{ uri: photoUri }} style={styles.image} />
              
              {/* Processing overlay */}
              {isProcessingFace && (
                <View style={styles.processingOverlay}>
                  <ActivityIndicator color="#007bff" size="large" />
                  <Text style={styles.processingText}>Analyzing face...</Text>
                </View>
              )}

              {/* Face detection status badge */}
              {!isProcessingFace && faceDetected !== null && (
                <View style={[
                  styles.faceStatusBadge,
                  faceDetected ? styles.faceDetectedBadge : styles.faceNotDetectedBadge
                ]}>
                  <Text style={styles.faceStatusText}>
                    {faceDetected ? '✓ Face Detected' : '✗ No Face'}
                  </Text>
                </View>
              )}
            </View>
            
            <TouchableOpacity style={styles.changePhotoButton} onPress={pickImage}>
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>

            {faceDetected === false && (
              <View style={styles.faceHintBox}>
                <Text style={styles.faceHintText}>
                  💡 Tip: For best face detection, ensure good lighting and face the camera directly
                </Text>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity style={styles.imagePlaceholder} onPress={pickImage}>
            <Text style={styles.cameraIcon}>📷</Text>
            <Text style={styles.imagePlaceholderText}>Tap to Take Patient Photo</Text>
            <Text style={styles.imagePlaceholderSubtext}>
              Face will be analyzed for recognition
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Save Patient" onPress={handleSave} />
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default NewPatientScreen;

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  label: { 
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: { 
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    fontSize: 16,
    color: '#333',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  picker: { 
    height: Platform.OS === 'ios' ? 200 : 50,
    color: '#333',
  },
  photoSection: {
    marginTop: 12,
    marginBottom: 20,
  },
  photoHint: {
    fontSize: 13,
    color: '#007bff',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  imageContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 12,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  processingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#007bff',
    fontWeight: '600',
  },
  faceStatusBadge: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  faceDetectedBadge: {
    backgroundColor: '#28a745',
  },
  faceNotDetectedBadge: {
    backgroundColor: '#dc3545',
  },
  faceStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  faceHintBox: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  faceHintText: {
    fontSize: 12,
    color: '#856404',
    lineHeight: 18,
  },
  imagePlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 10,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#ccc',
    borderStyle: 'dashed',
  },
  cameraIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  imagePlaceholderText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  imagePlaceholderSubtext: {
    textAlign: 'center',
    color: '#999',
    fontSize: 11,
    fontStyle: 'italic',
  },
  changePhotoButton: {
    alignSelf: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  changePhotoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: 20,
  },
});