// services/SimpleFirestoreSync.ts
// ✅ SIMPLIFIED VERSION - Detects offline during operations, not upfront
import { database } from '../db';
import { db, auth } from '../firebaseConfig';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import Patient from '../db/models/Patient';
import Treatment from '../db/models/Treatment';
import DentitionAssessment from '../db/models/DentitionAssessment';
import HygieneAssessment from '../db/models/HygieneAssessment';
import ExtractionsAssessment from '../db/models/ExtractionsAssessment';
import FillingsAssessment from '../db/models/FillingsAssessment';
import DentureAssessment from '../db/models/DentureAssessment';
import ImplantAssessment from '../db/models/ImplantAssessment';

export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: Date | null;
  pendingSyncCount: number;
  isSyncing: boolean;
  syncError: string | null;
  isAuthenticated: boolean;
}

class SimpleFirestoreSyncService {
  private syncInProgress = false;
  private listeners: ((status: SyncStatus) => void)[] = [];
  private syncInterval: NodeJS.Timeout | null = null;
  private currentStatus: SyncStatus = {
    isOnline: true,
    lastSyncTime: null,
    pendingSyncCount: 0,
    isSyncing: false,
    syncError: null,
    isAuthenticated: false,
  };

  constructor() {
    this.checkAuthStatus();
    
    // Listen to Firebase Auth state changes
    auth.onAuthStateChanged((user) => {
      console.log('🔐 Firebase Auth state changed in sync service:', user?.email || 'logged out');
      
      if (user) {
        // User logged in - enable sync
        console.log('✅ User logged in, enabling Firestore sync');
        this.currentStatus.isAuthenticated = true;
        this.currentStatus.syncError = null;
        this.notifyListeners();
        
        // Start periodic sync
        this.startPeriodicSync();
        
      } else {
        // User logged out - disable sync
        console.log('⏹️ User logged out, disabling Firestore sync');
        this.stopPeriodicSync();
        this.currentStatus.isAuthenticated = false;
        this.currentStatus.syncError = null;
        this.currentStatus.pendingSyncCount = 0;
        this.syncInProgress = false;
        this.notifyListeners();
      }
    });
  }

  // Start checking every 45 seconds for unsaved data
  private startPeriodicSync() {
    // Always stop first to prevent multiple timers
    this.stopPeriodicSync();
    
    console.log('🕐 Started periodic sync check (every 45 seconds)');
    
    // Check immediately
    this.checkForUnsyncedData();
    
    // Then check every 45 seconds
    this.syncInterval = setInterval(() => {
      console.log('⏰ Periodic sync check triggered');
      this.checkForUnsyncedData();
    }, 45000);
  }

  // Stop periodic sync
  public stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('⏹️ Stopped periodic Firestore sync');
    }
  }

  // Check authentication status
  private checkAuthStatus() {
    this.currentStatus.isAuthenticated = !!auth.currentUser;
    
    if (this.currentStatus.isAuthenticated) {
      console.log('🔐 User authenticated:', auth.currentUser?.email);
      this.currentStatus.isOnline = true;
      this.currentStatus.syncError = null;
    } else {
      console.log('🔐 User not authenticated');
      this.currentStatus.isOnline = false;
      this.currentStatus.syncError = 'User not authenticated';
    }
    
    this.notifyListeners();
  }

  // ✅ SIMPLIFIED: Just try to sync, catch offline errors gracefully
  private async checkForUnsyncedData() {
    // Check auth first
    if (!this.currentStatus.isAuthenticated) {
      console.log('⏭️ Skipping sync check - not authenticated');
      return;
    }

    if (this.syncInProgress) {
      console.log('⏭️ Skipping sync check - sync already in progress');
      return;
    }

    try {
      // Try to count unsynced items
      // If offline, this will throw an error and we'll catch it
      const unsyncedCount = await this.countUnsyncedItems();
      
      // If we got here, we're online
      this.currentStatus.isOnline = true;
      this.currentStatus.syncError = null;
      this.currentStatus.pendingSyncCount = unsyncedCount;
      
      if (unsyncedCount > 0) {
        console.log(`🔍 Found ${unsyncedCount} unsynced items, starting sync...`);
        await this.syncUnsyncedData();
      } else {
        console.log('✅ All data is synced');
      }
      
      this.notifyListeners();
      
    } catch (error) {
      // ✅ Check if it's an offline error OR logout error
      const errorMessage = error instanceof Error ? error.message : '';
      const isOfflineError = 
        errorMessage.includes('client is offline') ||
        errorMessage.includes('network') ||
        errorMessage.includes('Failed to get document');
      
      const isLogoutError = 
        errorMessage.includes('User logged out') ||
        errorMessage.includes('permissions');
      
      if (isLogoutError) {
        // User logged out during sync - stop everything
        console.log('🔐 User logged out during sync - stopping');
        this.stopPeriodicSync();
        this.currentStatus.isAuthenticated = false;
        this.currentStatus.isOnline = false;
        this.currentStatus.syncError = null;
        this.currentStatus.pendingSyncCount = 0;
        this.notifyListeners();
        return;
      }
      
      if (isOfflineError) {
        // Silently handle offline - don't spam console
        if (this.currentStatus.isOnline) {
          // Only log once when going offline
          console.log('📵 Device appears to be offline - will retry when online');
        }
        this.currentStatus.isOnline = false;
        this.currentStatus.syncError = null; // Don't show error for offline state
        
        // Count local items for display
        const localCount = await this.countLocalItemsOnly();
        this.currentStatus.pendingSyncCount = localCount;
      } else {
        // Real error (not offline, not logout)
        console.error('❌ Sync error:', error);
        this.currentStatus.syncError = errorMessage || 'Unknown error';
      }
      
      this.notifyListeners();
    }
  }

  // ✅ Count local items without touching Firestore (for offline display)
  private async countLocalItemsOnly(): Promise<number> {
    try {
      const [
        patients,
        treatments,
        dentitionAssessments,
        hygieneAssessments,
        extractionsAssessments,
        fillingsAssessments,
        dentureAssessments,
        implantAssessments
      ] = await Promise.all([
        database.get<Patient>('patients').query().fetch(),
        database.get<Treatment>('treatments').query().fetch(),
        database.get<DentitionAssessment>('dentition_assessments').query().fetch(),
        database.get<HygieneAssessment>('hygiene_assessments').query().fetch(),
        database.get<ExtractionsAssessment>('extractions_assessments').query().fetch(),
        database.get<FillingsAssessment>('fillings_assessments').query().fetch(),
        database.get<DentureAssessment>('denture_assessments').query().fetch(),
        database.get<ImplantAssessment>('implant_assessments').query().fetch(),
      ]);

      const totalLocal = 
        patients.length +
        treatments.length +
        dentitionAssessments.length +
        hygieneAssessments.length +
        extractionsAssessments.length +
        fillingsAssessments.length +
        dentureAssessments.length +
        implantAssessments.length;

      return totalLocal;
    } catch (error) {
      console.error('Error counting local items:', error);
      return 0;
    }
  }

  // Count items that don't exist in Firestore yet (throws if offline)
  private async countUnsyncedItems(): Promise<number> {
    if (!auth.currentUser) {
      console.log('⚠️ No authenticated user, cannot count items');
      return 0;
    }

    const [
      patients,
      treatments,
      dentitionAssessments,
      hygieneAssessments,
      extractionsAssessments,
      fillingsAssessments,
      dentureAssessments,
      implantAssessments
    ] = await Promise.all([
      database.get<Patient>('patients').query().fetch(),
      database.get<Treatment>('treatments').query().fetch(),
      database.get<DentitionAssessment>('dentition_assessments').query().fetch(),
      database.get<HygieneAssessment>('hygiene_assessments').query().fetch(),
      database.get<ExtractionsAssessment>('extractions_assessments').query().fetch(),
      database.get<FillingsAssessment>('fillings_assessments').query().fetch(),
      database.get<DentureAssessment>('denture_assessments').query().fetch(),
      database.get<ImplantAssessment>('implant_assessments').query().fetch(),
    ]);

    let unsyncedCount = 0;

    // Check each patient (will throw if offline)
    for (const patient of patients) {
      if (!auth.currentUser) break;
      
      const exists = await this.checkIfExistsInFirestore('patients', patient.id);
      if (!exists) unsyncedCount++;
    }

    // Check each treatment
    for (const treatment of treatments) {
      if (!auth.currentUser) break;
      
      const exists = await this.checkIfExistsInFirestore('treatments', treatment.id);
      if (!exists) unsyncedCount++;
    }

    // Check assessments
    const allAssessments = [
      ...dentitionAssessments,
      ...hygieneAssessments,
      ...extractionsAssessments,
      ...fillingsAssessments,
      ...dentureAssessments,
      ...implantAssessments,
    ];

    for (const assessment of allAssessments) {
      if (!auth.currentUser) break;
      
      const exists = await this.checkIfExistsInFirestore('assessments', assessment.id);
      if (!exists) unsyncedCount++;
    }

    return unsyncedCount;
  }

  // Check if a document exists in Firestore (throws if offline)
  private async checkIfExistsInFirestore(collection: string, id: string): Promise<boolean> {
    // ✅ CRITICAL: Double-check auth before EVERY Firestore call
    if (!auth.currentUser) {
      console.log('⚠️ Auth lost during sync - aborting check');
      throw new Error('User logged out');
    }

    // This will throw if offline - that's intentional
    const docRef = doc(db, collection, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  }

  // Sync only the data that doesn't exist in Firestore
  private async syncUnsyncedData() {
    if (this.syncInProgress) {
      console.log('⏭️ Sync already in progress, skipping');
      return;
    }

    if (!auth.currentUser) {
      console.log('⚠️ User logged out during sync, aborting');
      return;
    }

    this.syncInProgress = true;
    this.currentStatus.isSyncing = true;
    this.currentStatus.syncError = null;
    this.notifyListeners();

    try {
      console.log('🚀 Starting sync of unsynced data...');

      await this.syncUnsyncedPatients();
      await this.syncUnsyncedTreatments();
      await this.syncUnsyncedAssessments();

      this.currentStatus.lastSyncTime = new Date();
      this.currentStatus.pendingSyncCount = 0;
      this.currentStatus.isOnline = true;
      
      console.log('✅ Sync completed successfully');
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      
      // Check if offline error
      const isOfflineError = 
        errorMessage.includes('client is offline') ||
        errorMessage.includes('network') ||
        errorMessage.includes('Failed to get document');
      
      if (isOfflineError) {
        this.currentStatus.isOnline = false;
        this.currentStatus.syncError = null; // Don't show error for offline
      } else {
        this.currentStatus.syncError = errorMessage;
      }
    } finally {
      this.syncInProgress = false;
      this.currentStatus.isSyncing = false;
      this.notifyListeners();
    }
  }

  // Sync only patients that don't exist in Firestore
  private async syncUnsyncedPatients() {
    if (!auth.currentUser) return;

    const patients = await database.get<Patient>('patients').query().fetch();
    const unsyncedPatients = [];

    for (const patient of patients) {
      if (!auth.currentUser) break;
      
      const exists = await this.checkIfExistsInFirestore('patients', patient.id);
      if (!exists) {
        unsyncedPatients.push(patient);
      }
    }

    if (unsyncedPatients.length === 0) {
      return;
    }

    console.log(`🔄 Syncing ${unsyncedPatients.length} new patients...`);
    const batch = writeBatch(db);

    for (const patient of unsyncedPatients) {
      const patientRef = doc(db, 'patients', patient.id);
      batch.set(patientRef, {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        age: patient.age,
        gender: patient.gender,
        location: patient.location,
        photoUri: patient.photoUri,
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
    console.log(`✅ Synced ${unsyncedPatients.length} new patients`);
  }

  // Sync only treatments that don't exist in Firestore
  private async syncUnsyncedTreatments() {
    if (!auth.currentUser) return;
  
    const treatments = await database.get<Treatment>('treatments').query().fetch();
    const unsyncedTreatments = [];
  
    for (const treatment of treatments) {
      if (!auth.currentUser) break;
      
      const exists = await this.checkIfExistsInFirestore('treatments', treatment.id);
      if (!exists) {
        unsyncedTreatments.push(treatment);
      }
    }
  
    if (unsyncedTreatments.length === 0) return;
  
    console.log(`🔄 Syncing ${unsyncedTreatments.length} new treatments...`);
    const batch = writeBatch(db);
  
    for (const treatment of unsyncedTreatments) {
      const treatmentRef = doc(db, 'treatments', treatment.id);
      
      let parsedNotes = treatment.notes;
      try {
        if (treatment.notes && treatment.notes.startsWith('{')) {
          parsedNotes = JSON.parse(treatment.notes);
        }
      } catch (e) {
        parsedNotes = treatment.notes;
      }
      
      let parsedBillingCodes = [];
      try {
        if (treatment.billingCodes) {
          parsedBillingCodes = JSON.parse(treatment.billingCodes);
        }
      } catch (e) {
        console.warn('Failed to parse billing codes');
      }
      
      const treatmentData = {
        patientId: treatment.patientId,
        type: treatment.type,
        tooth: treatment.tooth,
        surface: treatment.surface,
        units: treatment.units,
        value: treatment.value,
        billingCodes: parsedBillingCodes,
        notes: parsedNotes,
        clinicianName: treatment.clinicianName,
        completedAt: treatment.completedAt ? 
          Timestamp.fromDate(treatment.completedAt) : null,
        createdAt: serverTimestamp(),
        syncedAt: serverTimestamp(),
        ...(treatment.visitId && { visitId: treatment.visitId }),
      };
  
      batch.set(treatmentRef, treatmentData);
    }
  
    await batch.commit();
    console.log(`✅ Synced ${unsyncedTreatments.length} treatments`);
  }

  // Sync only assessments that don't exist in Firestore
  private async syncUnsyncedAssessments() {
    if (!auth.currentUser) return;

    const assessmentTypes = [
      { collection: 'dentition_assessments', name: 'dentition' },
      { collection: 'hygiene_assessments', name: 'hygiene' },
      { collection: 'extractions_assessments', name: 'extractions' },
      { collection: 'fillings_assessments', name: 'fillings' },
      { collection: 'denture_assessments', name: 'denture' },
      { collection: 'implant_assessments', name: 'implant' },
    ];

    const allUnsyncedAssessments = [];

    for (const { collection: localCollection, name: assessmentType } of assessmentTypes) {
      if (!auth.currentUser) break;
      
      const assessments = await database.get(localCollection).query().fetch();

      for (const assessment of assessments) {
        if (!auth.currentUser) break;
        
        const exists = await this.checkIfExistsInFirestore('assessments', assessment.id);
        if (!exists) {
          allUnsyncedAssessments.push({
            assessment,
            type: assessmentType
          });
        }
      }
    }

    if (allUnsyncedAssessments.length === 0) {
      return;
    }

    console.log(`🔄 Syncing ${allUnsyncedAssessments.length} assessments...`);
    
    const batch = writeBatch(db);

    for (const { assessment, type } of allUnsyncedAssessments) {
      const assessmentRef = doc(db, 'assessments', assessment.id);
      
      let parsedData;
      try {
        parsedData = JSON.parse(assessment.data);
      } catch (error) {
        console.error('Failed to parse assessment data:', error);
        parsedData = { raw: assessment.data };
      }
      
      batch.set(assessmentRef, {
        patientId: assessment.patientId,
        assessmentType: type,
        data: parsedData,
        createdAt: assessment.createdAt ? 
          Timestamp.fromDate(assessment.createdAt) : 
          serverTimestamp(),
        updatedAt: assessment.updatedAt ? 
          Timestamp.fromDate(assessment.updatedAt) : 
          serverTimestamp(),
        clinicianId: auth.currentUser?.uid || null,
      });
    }

    await batch.commit();
    console.log(`✅ Synced ${allUnsyncedAssessments.length} assessments`);
  }

  // Subscribe to sync status updates
  public subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);
    listener(this.currentStatus);
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners of status changes
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentStatus));
  }

  // Manual sync trigger
  public async forceSync(): Promise<void> {
    await this.checkForUnsyncedData();
  }

  // Get current sync status
  public getSyncStatus(): SyncStatus {
    return { ...this.currentStatus };
  }

  // Trigger auth status check
  public updateAuthStatus(): void {
    this.checkAuthStatus();
  }
}

// Export singleton instance
export const simpleFirestoreSyncService = new SimpleFirestoreSyncService();