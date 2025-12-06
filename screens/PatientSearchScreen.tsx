// screens/PatientSearchScreen.tsx - ENHANCED VERSION
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Button,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import Patient from '../db/models/Patient';
import { SmartImage } from '../components/SmartImage';
import { searchHistoryManager, SearchHistoryItem } from '../utils/SearchHistoryManager';

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
  
  // Smart search features
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [frequentlySearched, setFrequentlySearched] = useState<SearchHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const [activeSearch, setActiveSearch] = useState(false);

  // Load search history and frequently searched when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadSearchData();
    }, [])
  );

  const loadSearchData = async () => {
    const history = await searchHistoryManager.loadHistory();
    const frequent = await searchHistoryManager.getFrequentlySearched();
    setSearchHistory(history);
    setFrequentlySearched(frequent);
  };

  // Track if user is actively typing
  useEffect(() => {
    const hasInput = firstName.trim() || lastName.trim() || age.trim() || gender || location.trim();
    setActiveSearch(hasInput);
    
    // Hide history when user starts typing
    if (hasInput) {
      setShowHistory(false);
    }
  }, [firstName, lastName, age, gender, location]);

  const handleSearch = async () => {
    // Check if at least one field has input
    const hasInput = firstName.trim() || lastName.trim() || age.trim() || gender || location.trim();
    
    if (!hasInput) {
      setSearchResults([]);
      setHasSearched(false);
      setShowHistory(true);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setShowHistory(false);

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
    setShowHistory(true);
    setActiveSearch(false);
  };

  const handlePatientSelect = async (patient: Patient) => {
    // Add to search history
    await searchHistoryManager.addToHistory({
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      age: patient.age,
      gender: patient.gender,
      location: patient.location,
    });

    navigation.navigate('PatientProfile', { patientId: patient.id });
  };

  const handleHistoryItemSelect = async (item: SearchHistoryItem) => {
    // Add to history again (updates timestamp and count)
    await searchHistoryManager.addToHistory(item);
    navigation.navigate('PatientProfile', { patientId: item.id });
  };

  const handleRemoveFromHistory = async (patientId: string) => {
    Alert.alert(
      'Remove from History',
      'Remove this patient from search history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await searchHistoryManager.removeFromHistory(patientId);
            await loadSearchData();
          },
        },
      ]
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Search History',
      'Are you sure you want to clear all search history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await searchHistoryManager.clearHistory();
            await loadSearchData();
          },
        },
      ]
    );
  };

  const renderHistoryItem = ({ item }: { item: SearchHistoryItem }) => (
    <TouchableOpacity
      style={styles.historyCard}
      onPress={() => handleHistoryItemSelect(item)}
    >
      <View style={styles.historyCardContent}>
        <View style={styles.historyInfo}>
          <Text style={styles.historyName}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={styles.historyDetails}>
            Age: {item.age} • {item.gender}
          </Text>
          <Text style={styles.historyLocation}>📍 {item.location}</Text>
          {item.searchCount > 1 && (
            <Text style={styles.searchCount}>
              🔍 Searched {item.searchCount} times
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.removeButton}
          onPress={(e) => {
            e.stopPropagation();
            handleRemoveFromHistory(item.id);
          }}
        >
          <Text style={styles.removeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderPatientItem = ({ item }: { item: Patient }) => (
    <TouchableOpacity
      style={styles.patientCard}
      onPress={() => handlePatientSelect(item)}
    >
      <View style={styles.patientCardContent}>
        {item.photoUri ? (
          <SmartImage
            localUri={item.photoUri}
            cloudUri={item.photoCloudUri}
            style={styles.patientPhoto}
          />
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
      {/* Search Form */}
      <View style={styles.searchForm}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>Search Patient Records</Text>
          {activeSearch && (
            <View style={styles.activeSearchBadge}>
              <Text style={styles.activeSearchText}>🔴 Active Search</Text>
            </View>
          )}
        </View>
        
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

      {/* Results or History */}
      <View style={styles.resultsContainer}>
        {isSearching ? (
          <Text style={styles.statusText}>Searching...</Text>
        ) : showHistory && !hasSearched ? (
          <ScrollView style={styles.historyContainer}>
            {/* Frequently Searched Section */}
            {frequentlySearched.length > 0 && (
              <View style={styles.historySection}>
                <View style={styles.historySectionHeader}>
                  <Text style={styles.historySectionTitle}>⭐ Frequently Searched</Text>
                </View>
                {frequentlySearched.map((item) => (
                  <View key={item.id}>
                    {renderHistoryItem({ item })}
                  </View>
                ))}
              </View>
            )}

            {/* Recent Searches Section */}
            {searchHistory.length > 0 && (
              <View style={styles.historySection}>
                <View style={styles.historySectionHeader}>
                  <Text style={styles.historySectionTitle}>🕐 Recent Searches</Text>
                  <TouchableOpacity onPress={handleClearHistory}>
                    <Text style={styles.clearHistoryButton}>Clear All</Text>
                  </TouchableOpacity>
                </View>
                {searchHistory.slice(0, 5).map((item) => (
                  <View key={item.id}>
                    {renderHistoryItem({ item })}
                  </View>
                ))}
              </View>
            )}

            {searchHistory.length === 0 && frequentlySearched.length === 0 && (
              <View style={styles.emptyHistoryContainer}>
                <Text style={styles.emptyHistoryText}>No search history yet</Text>
                <Text style={styles.emptyHistorySubtext}>
                  Search for patients to see them here
                </Text>
              </View>
            )}
          </ScrollView>
        ) : hasSearched && searchResults.length === 0 ? (
          <Text style={styles.statusText}>No patients found</Text>
        ) : hasSearched ? (
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
        ) : (
          <Text style={styles.statusText}>Fill in search criteria above</Text>
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
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  activeSearchBadge: {
    backgroundColor: '#fff3cd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  activeSearchText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#856404',
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
  historyContainer: {
    flex: 1,
  },
  historySection: {
    marginBottom: 20,
  },
  historySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  historySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  clearHistoryButton: {
    fontSize: 14,
    color: '#dc3545',
    fontWeight: '500',
  },
  historyCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  historyCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  historyDetails: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  historyLocation: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  searchCount: {
    fontSize: 11,
    color: '#007bff',
    fontWeight: '500',
    marginTop: 4,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  removeButtonText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: 'bold',
  },
  emptyHistoryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 8,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: '#bbb',
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