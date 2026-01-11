// utils/officeSetup.ts
// This file contains utilities to set up initial dental offices in Firestore
// Run this once to populate your offices collection

import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface OfficeData {
  name: string;
  location: string;
  address?: string;
  phone?: string;
  email?: string;
}

// Sample offices - replace with your actual offices
export const INITIAL_OFFICES: OfficeData[] = [
  {
    name: 'Downtown Dental Clinic',
    location: 'New York, NY',
    address: '123 Main St, New York, NY 10001',
    phone: '(555) 123-4567',
    email: 'downtown@example.com'
  },
  {
    name: 'Westside Family Dentistry',
    location: 'Los Angeles, CA',
    address: '456 West Ave, Los Angeles, CA 90001',
    phone: '(555) 987-6543',
    email: 'westside@example.com'
  },
  {
    name: 'Northshore Dental Care',
    location: 'Chicago, IL',
    address: '789 North Blvd, Chicago, IL 60601',
    phone: '(555) 456-7890',
    email: 'northshore@example.com'
  },
];

/**
 * Initialize dental offices in Firestore
 * Run this function once to set up your offices
 */
export const initializeOffices = async (): Promise<void> => {
  try {
    console.log('🏥 Initializing dental offices in Firestore...');
    
    for (const office of INITIAL_OFFICES) {
      // Generate a clean ID from the office name
      const officeId = office.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      const officeDoc = doc(db, 'offices', officeId);
      await setDoc(officeDoc, {
        ...office,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      });
      
      console.log(`✅ Created office: ${office.name}`);
    }
    
    console.log('✅ All offices initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing offices:', error);
    throw error;
  }
};

/**
 * Add a new office to Firestore
 */
export const addOffice = async (officeData: OfficeData): Promise<string> => {
  try {
    const officeId = officeData.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const officeDoc = doc(db, 'offices', officeId);
    
    await setDoc(officeDoc, {
      ...officeData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    });
    
    console.log(`✅ Added office: ${officeData.name}`);
    return officeId;
  } catch (error) {
    console.error('❌ Error adding office:', error);
    throw error;
  }
};