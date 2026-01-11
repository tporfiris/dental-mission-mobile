// screens/OfficeManagementScreen.tsx
// Admin screen to view and manage dental offices
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface Office {
  id: string;
  name: string;
  location: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
}

const OfficeManagementScreen = () => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingOffice, setAddingOffice] = useState(false);
  
  // New office form fields
  const [newOfficeName, setNewOfficeName] = useState('');
  const [newOfficeLocation, setNewOfficeLocation] = useState('');
  const [newOfficeAddress, setNewOfficeAddress] = useState('');
  const [newOfficePhone, setNewOfficePhone] = useState('');
  const [newOfficeEmail, setNewOfficeEmail] = useState('');

  useEffect(() => {
    loadOffices();
  }, []);

  const loadOffices = async () => {
    try {
      setLoading(true);
      const officesSnapshot = await getDocs(collection(db, 'offices'));
      const officesList: Office[] = [];
      
      officesSnapshot.forEach((doc) => {
        officesList.push({
          id: doc.id,
          ...doc.data()
        } as Office);
      });
      
      // Sort by name
      officesList.sort((a, b) => a.name.localeCompare(b.name));
      
      setOffices(officesList);
      console.log(`✅ Loaded ${officesList.length} offices`);
    } catch (error) {
      console.error('❌ Error loading offices:', error);
      Alert.alert('Error', 'Failed to load offices');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOffice = async () => {
    if (!newOfficeName.trim() || !newOfficeLocation.trim()) {
      Alert.alert('Missing Information', 'Please enter office name and location');
      return;
    }

    try {
      const officeId = newOfficeName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      // Check if office ID already exists
      const existingOffice = offices.find(o => o.id === officeId);
      if (existingOffice) {
        Alert.alert('Duplicate Office', 'An office with this name already exists');
        return;
      }

      const officeData = {
        name: newOfficeName.trim(),
        location: newOfficeLocation.trim(),
        address: newOfficeAddress.trim() || '',
        phone: newOfficePhone.trim() || '',
        email: newOfficeEmail.trim() || '',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'offices', officeId), officeData);

      console.log(`✅ Added office: ${newOfficeName}`);
      Alert.alert('Success', 'Office added successfully');

      // Clear form
      setNewOfficeName('');
      setNewOfficeLocation('');
      setNewOfficeAddress('');
      setNewOfficePhone('');
      setNewOfficeEmail('');
      setAddingOffice(false);

      // Reload offices
      loadOffices();
    } catch (error) {
      console.error('❌ Error adding office:', error);
      Alert.alert('Error', 'Failed to add office');
    }
  };

  const handleToggleOfficeStatus = async (office: Office) => {
    try {
      const newStatus = !office.isActive;
      
      await setDoc(doc(db, 'offices', office.id), {
        ...office,
        isActive: newStatus,
        updatedAt: new Date().toISOString(),
      });

      console.log(`✅ Updated office status: ${office.name} -> ${newStatus ? 'Active' : 'Inactive'}`);
      loadOffices();
    } catch (error) {
      console.error('❌ Error updating office:', error);
      Alert.alert('Error', 'Failed to update office status');
    }
  };

  const handleDeleteOffice = async (office: Office) => {
    Alert.alert(
      'Delete Office',
      `Are you sure you want to delete ${office.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'offices', office.id));
              console.log(`✅ Deleted office: ${office.name}`);
              Alert.alert('Success', 'Office deleted successfully');
              loadOffices();
            } catch (error) {
              console.error('❌ Error deleting office:', error);
              Alert.alert('Error', 'Failed to delete office');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading offices...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏥 Office Management</Text>
        <Text style={styles.subtitle}>{offices.length} Dental Offices</Text>
      </View>

      {/* Add Office Button */}
      {!addingOffice && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setAddingOffice(true)}
        >
          <Text style={styles.addButtonText}>+ Add New Office</Text>
        </TouchableOpacity>
      )}

      {/* Add Office Form */}
      {addingOffice && (
        <View style={styles.addOfficeForm}>
          <Text style={styles.formTitle}>Add New Office</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Office Name *"
            value={newOfficeName}
            onChangeText={setNewOfficeName}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Location (City, State) *"
            value={newOfficeLocation}
            onChangeText={setNewOfficeLocation}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Full Address (optional)"
            value={newOfficeAddress}
            onChangeText={setNewOfficeAddress}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Phone (optional)"
            value={newOfficePhone}
            onChangeText={setNewOfficePhone}
            keyboardType="phone-pad"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Email (optional)"
            value={newOfficeEmail}
            onChangeText={setNewOfficeEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View style={styles.formButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setAddingOffice(false);
                setNewOfficeName('');
                setNewOfficeLocation('');
                setNewOfficeAddress('');
                setNewOfficePhone('');
                setNewOfficeEmail('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleAddOffice}
            >
              <Text style={styles.saveButtonText}>Add Office</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Office List */}
      <View style={styles.officeList}>
        {offices.map((office) => (
          <View
            key={office.id}
            style={[
              styles.officeCard,
              !office.isActive && styles.inactiveOfficeCard
            ]}
          >
            <View style={styles.officeHeader}>
              <Text style={styles.officeName}>{office.name}</Text>
              <View style={[
                styles.statusBadge,
                office.isActive ? styles.activeBadge : styles.inactiveBadge
              ]}>
                <Text style={styles.statusText}>
                  {office.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>

            <Text style={styles.officeLocation}>📍 {office.location}</Text>
            
            {office.address && (
              <Text style={styles.officeDetail}>🏠 {office.address}</Text>
            )}
            
            {office.phone && (
              <Text style={styles.officeDetail}>📞 {office.phone}</Text>
            )}
            
            {office.email && (
              <Text style={styles.officeDetail}>✉️ {office.email}</Text>
            )}

            <View style={styles.officeActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.toggleButton]}
                onPress={() => handleToggleOfficeStatus(office)}
              >
                <Text style={styles.actionButtonText}>
                  {office.isActive ? 'Deactivate' : 'Activate'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteOffice(office)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {offices.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No offices added yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Click "Add New Office" to get started
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

export default OfficeManagementScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  addButton: {
    backgroundColor: '#007bff',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addOfficeForm: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 12,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#28a745',
    marginLeft: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  officeList: {
    padding: 20,
    paddingTop: 0,
  },
  officeCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inactiveOfficeCard: {
    opacity: 0.6,
  },
  officeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  officeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#d4edda',
  },
  inactiveBadge: {
    backgroundColor: '#f8d7da',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  officeLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  officeDetail: {
    fontSize: 13,
    color: '#888',
    marginBottom: 2,
  },
  officeActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleButton: {
    backgroundColor: '#17a2b8',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  deleteButtonText: {
    color: '#dc3545',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
  },
});