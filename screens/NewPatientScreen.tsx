import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Platform } from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Picker } from '@react-native-picker/picker';
import { Q } from '@nozbe/watermelondb';
import uuid from 'react-native-uuid';
import { database } from '../db';
import Patient from '../db/models/Patient';

const NewPatientScreen = ({ navigation }: any) => {
    const db = useDatabase();
  
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('Male');
    const [location, setLocation] = useState('');
  
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
            patient.photoUri = '';
          });
        });
  
        console.log('✅ Patient saved with ID:', id);
  
        Alert.alert('Success', 'Patient saved!');
        navigation.goBack();
  
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
  
        <Button title="Save Patient" onPress={handleSave} />
      </View>
    );
  }; // 👈 make sure this closes the component function
  
  export default NewPatientScreen; // 👈 outside of the component
  
  const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 },
    label: { marginTop: 10 },
    picker: { height: Platform.OS === 'ios' ? 200 : 50, marginBottom: 20 },
  });