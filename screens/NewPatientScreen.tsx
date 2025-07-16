import React, { useState } from 'react';
import {
  View, Text, TextInput, Button, StyleSheet, Alert, Platform,
  Image, TouchableOpacity,
} from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Picker } from '@react-native-picker/picker';
import uuid from 'react-native-uuid';
import * as ImagePicker from 'expo-image-picker';
import Patient from '../db/models/Patient';

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
        });
      });
  
      console.log('✅ Patient saved with ID:', id);
  
      // Instead of going back, navigate to QR code screen
      navigation.navigate('Assessments', { patientId: id });
  
    } catch (err) {
      console.error('❌ Failed to save patient:', err);
      Alert.alert('Error', 'Something went wrong while saving.');
    }
  };
  

  return (
    <View style={styles.container}>
      <Text style={styles.header}>New Patient</Text>
      <TextInput placeholder="First Name" value={firstName} onChangeText={setFirstName} style={styles.input} />
      <TextInput placeholder="Last Name" value={lastName} onChangeText={setLastName} style={styles.input} />
      <TextInput placeholder="Age" value={age} onChangeText={setAge} keyboardType="numeric" style={styles.input} />
      <TextInput placeholder="Location/Village" value={location} onChangeText={setLocation} style={styles.input} />

      <Text style={styles.label}>Gender</Text>
      <Picker selectedValue={gender} onValueChange={(itemValue) => setGender(itemValue)} style={styles.picker}>
        <Picker.Item label="Male" value="Male" />
        <Picker.Item label="Female" value="Female" />
        <Picker.Item label="Other" value="Other" />
      </Picker>

      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.image} />
      ) : (
        <TouchableOpacity style={styles.imagePlaceholder} onPress={pickImage}>
          <Text style={{ textAlign: 'center' }}>Tap to Take Patient Photo</Text>
        </TouchableOpacity>
      )}

      <Button title="Save Patient" onPress={handleSave} />
    </View>
  );
};

export default NewPatientScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 },
  label: { marginTop: 10 },
  picker: { height: Platform.OS === 'ios' ? 200 : 50, marginBottom: 20 },
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 20,
  },
  imagePlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 10,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
});
