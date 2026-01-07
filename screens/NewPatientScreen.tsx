// screens/NewPatientScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, Button, StyleSheet, Alert, Platform,
  Image, TouchableOpacity, ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Picker } from '@react-native-picker/picker';
import uuid from 'react-native-uuid';
import * as ImagePicker from 'expo-image-picker';
import Patient from '../db/models/Patient';
import { mediaUploadService } from '../services/MediaUploadService';

const NewPatientScreen = ({ navigation }: any) => {
  const db = useDatabase();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [location, setLocation] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

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
      setPhotoUri(result.assets[0].uri);
      console.log('✅ Photo selected:', result.assets[0].uri);
    } else {
      console.log('❌ Camera was cancelled or no result');
    }
  };

  const handleSave = async () => {
    if (!firstName || !lastName || !age || !location) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
  
    try {
      const id = uuid.v4(); // returns a UUID string
  
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
        });
      });

      // Queue photo for upload when WiFi is available
      if (photoUri) {
        mediaUploadService.queueForUpload(photoUri, 'photo', id);
      }
  
      console.log('✅ Patient saved with ID:', id);

  
      // Instead of going back, navigate to QR code screen
      navigation.navigate('Assessments', { patientId: id });
  
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

      <Text style={styles.label}>Patient Photo</Text>
      {photoUri ? (
        <View>
          <Image source={{ uri: photoUri }} style={styles.image} />
          <TouchableOpacity style={styles.changePhotoButton} onPress={pickImage}>
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.imagePlaceholder} onPress={pickImage}>
          <Text style={styles.cameraIcon}>📷</Text>
          <Text style={styles.imagePlaceholderText}>Tap to Take Patient Photo</Text>
        </TouchableOpacity>
      )}

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
    paddingBottom: 40, // Extra padding at bottom for scrolling
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
    color: '#333', // Explicit text color for Android
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
    color: '#333', // Explicit text color for Android picker
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 12,
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
  },
  changePhotoButton: {
    alignSelf: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 20,
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