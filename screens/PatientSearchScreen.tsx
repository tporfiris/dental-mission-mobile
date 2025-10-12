// screens/PatientSearchScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Button,
  Platform,
} from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import { Picker } from '@react-native-picker/picker';
import Patient from '../db/models/Patient';

const PatientSearchScreen = ({ navigation }: any) => {
  const db = useDatabase();
  
  // Search form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [location, setLocation] = useState('');
  
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    // Check if at least one field has input
    const hasInput = firstName.trim() || lastName.trim() || age.trim() || gender || location.trim();
    
    if (!hasInput) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      // Build query conditions dynamically
      const conditions: any[] = [];

      if (firstName.trim()) {
        conditions.push(
          Q.where('first_name', Q.like(`%${Q.sanitizeLikeString(firstName.trim())}%`))
        );
      }

      if (lastName.trim()) {
        conditions.push(
          Q.where('last_name', Q.like(`%${Q.sanitizeLikeString(lastName.trim())}%`))
        );
      }

      if (location.trim()) {
        conditions.push(
          Q.where('location', Q.like(`%${Q.sanitizeLikeString(location.trim())}%`))
        );
      }

      if (age.trim()) {
        const ageNum = parseInt(age.trim());
        if (!isNaN(ageNum)) {
          conditions.push(Q.where('age', ageNum));
        }
      }

      if (gender && gender !== 'Any') {
        conditions.push(Q.where('gender', gender));
      }

      // Execute query with all conditions
      let patients: Patient[] = [];
      
      if (conditions.length > 0) {
        patients = await db
          .get<Patient>('patients')
          .query(...conditions)
          .fetch();
      } else {
        // If only gender filter is "Any" or no valid conditions, fetch all
        patients = await db.get<Patient>('patients').query().fetch();
      }

      setSearchResults(patients);
    } catch (error) {
      console.error('Error searching patients:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setFirstName('');
    setLastName('');
    setAge('');
    setGender('');
    setLocation('');
    setSearchResults([]);
    setHasSearched(false);
  };

  const renderPatientItem = ({ item }: { item: Patient }) => (
    <TouchableOpacity
      style={styles.patientCard}
      onPress={() => navigation.navigate('PatientProfile', { patientId: item.id })}
    >
      <View style={styles.patientCardContent}>
        {item.photoUri ? (
          <Image source={{ uri: item.photoUri }} style={styles.patientPhoto} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>
              {item.firstName[0]}{item.lastName[0]}
            </Text>
          </View>
        )}

        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={styles.patientDetails}>
            Age: {item.age} • {item.gender}
          </Text>
          <Text style={styles.patientLocation}>📍 {item.location}</Text>
        </View>

        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchForm}>
        <Text style={styles.formTitle}>Search Patient Records</Text>
        
        <TextInput
          placeholder="First Name"
          value={firstName}
          onChangeText={setFirstName}
          style={styles.input}
        />
        
        <TextInput
          placeholder="Last Name"
          value={lastName}
          onChangeText={setLastName}
          style={styles.input}
        />
        
        <TextInput
          placeholder="Age"
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
          style={styles.input}
        />

        <Text style={styles.label}>Gender</Text>
        <Picker
          selectedValue={gender}
          onValueChange={(itemValue) => setGender(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Any" value="" />
          <Picker.Item label="Male" value="Male" />
          <Picker.Item label="Female" value="Female" />
          <Picker.Item label="Other" value="Other" />
        </Picker>

        <TextInput
          placeholder="Location/Village"
          value={location}
          onChangeText={setLocation}
          style={styles.input}
        />

        <View style={styles.buttonRow}>
          <View style={styles.button}>
            <Button title="Search" onPress={handleSearch} />
          </View>
          <View style={styles.button}>
            <Button title="Clear" onPress={handleClear} color="#6c757d" />
          </View>
        </View>
      </View>

      <View style={styles.resultsContainer}>
        {isSearching ? (
          <Text style={styles.statusText}>Searching...</Text>
        ) : !hasSearched ? (
          <Text style={styles.statusText}>Fill in search criteria above</Text>
        ) : searchResults.length === 0 ? (
          <Text style={styles.statusText}>No patients found</Text>
        ) : (
          <FlatList
            data={searchResults}
            renderItem={renderPatientItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            ListHeaderComponent={
              <Text style={styles.resultsCount}>
                {searchResults.length} patient{searchResults.length !== 1 ? 's' : ''} found
              </Text>
            }
          />
        )}
      </View>
    </View>
  );
};

export default PatientSearchScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchForm: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    marginTop: 4,
  },
  picker: {
    height: Platform.OS === 'ios' ? 150 : 50,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
  },
  resultsContainer: {
    flex: 1,
  },
  statusText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontWeight: '600',
  },
  patientCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  patientCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  patientPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  photoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  photoPlaceholderText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  patientDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  patientLocation: {
    fontSize: 14,
    color: '#666',
  },
  chevron: {
    fontSize: 32,
    color: '#ccc',
    marginLeft: 8,
  },
});