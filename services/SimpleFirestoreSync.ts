// services/SimpleFirestoreSync.ts
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
        this.syncInProgress = false; // ✅ RESET THIS TOO
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
      console.log('⏰ Periodic sync check triggered'); // ✅ DEBUG LOG
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

  // Check for data that hasn't been synced yet
  private async checkForUnsyncedData() {
    // ✅ CRITICAL FIX: Check auth first, but don't block if already syncing
    if (!this.currentStatus.isAuthenticated) {
      console.log('⏭️ Skipping sync check - not authenticated');
      return;
    }

    if (this.syncInProgress) {
      console.log('⏭️ Skipping sync check - sync already in progress');
      return;
    }

    try {
      const unsyncedCount = await this.countUnsyncedItems();
      this.currentStatus.pendingSyncCount = unsyncedCount;
      
      if (unsyncedCount > 0) {
        console.log(`🔍 Found ${unsyncedCount} unsynced items, starting sync...`);
        await this.syncUnsyncedData();
      } else {
        console.log('✅ All data is synced');
      }
      
      this.notifyListeners();
    } catch (error) {
      console.error('❌ Error checking for unsynced data:', error);
      this.currentStatus.syncError = error instanceof Error ? error.message : 'Unknown error';
      this.notifyListeners();
    }
  }

  // Count items that don't exist in Firestore yet
  private async countUnsyncedItems(): Promise<number> {
    // ✅ DOUBLE CHECK AUTH HERE TOO
    if (!auth.currentUser) {
      console.log('⚠️ No authenticated user, cannot count items');
      return 0;
    }

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

      let unsyncedCount = 0;

      // Check each patient
      for (const patient of patients) {
        // ✅ CHECK AUTH BEFORE EACH FIRESTORE CALL
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
    } catch (error) {
      console.error('Error counting unsynced items:', error);
      return 0;
    }
  }

  // Check if a document exists in Firestore
  private async checkIfExistsInFirestore(collection: string, id: string): Promise<boolean> {
    // ✅ CHECK AUTH BEFORE FIRESTORE CALL
    if (!auth.currentUser) {
      console.log('⚠️ No authenticated user, skipping Firestore check');
      return true; // Assume exists to skip syncing
    }

    try {
      const docRef = doc(db, collection, id);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      // ✅ DON'T LOG PERMISSION ERRORS - THEY'RE EXPECTED AFTER LOGOUT
      if (error instanceof Error && error.message.includes('permissions')) {
        return true; // Assume exists to avoid retry
      }
      console.error(`Error checking if ${collection}/${id} exists:`, error);
      return false;
    }
  }

  // Sync only the data that doesn't exist in Firestore
  private async syncUnsyncedData() {
    if (this.syncInProgress) {
      console.log('⏭️ Sync already in progress, skipping');
      return;
    }

    // ✅ CHECK AUTH ONE MORE TIME
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
      
      console.log('✅ Sync completed successfully');
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.currentStatus.syncError = error instanceof Error ? error.message : 'Unknown sync error';
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
        // syncedAt: serverTimestamp(),
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
      
      // ✅ Parse notes if it's JSON (optimized format)
      let parsedNotes = treatment.notes;
      try {
        if (treatment.notes && treatment.notes.startsWith('{')) {
          parsedNotes = JSON.parse(treatment.notes);
        }
      } catch (e) {
        parsedNotes = treatment.notes;
      }
      
      // ✅ Parse billing codes to array
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
        billingCodes: parsedBillingCodes, // ✅ Array, not string
        notes: parsedNotes, // ✅ Object, not string
        clinicianName: treatment.clinicianName,
        completedAt: treatment.completedAt ? 
          Timestamp.fromDate(treatment.completedAt) : null, // ✅ Timestamp
        createdAt: serverTimestamp(),
        syncedAt: serverTimestamp(),
        // ✅ Omit empty visitId
        ...(treatment.visitId && { visitId: treatment.visitId }),
      };
  
      batch.set(treatmentRef, treatmentData);
    }
  
    await batch.commit();
    console.log(`✅ Synced ${unsyncedTreatments.length} treatments (optimized)`);
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

    console.log(`🔄 Syncing ${allUnsyncedAssessments.length} assessments to consolidated collection...`);
    
    const batch = writeBatch(db);

    for (const { assessment, type } of allUnsyncedAssessments) {
      const assessmentRef = doc(db, 'assessments', assessment.id);
      
      // ✅ Parse the JSON string to object
      let parsedData;
      try {
        parsedData = JSON.parse(assessment.data);
      } catch (error) {
        console.error('Failed to parse assessment data:', error);
        parsedData = { raw: assessment.data };
      }
      
      batch.set(assessmentRef, {
        // ✅ Removed: id field (redundant)
        patientId: assessment.patientId,
        assessmentType: type,
        data: parsedData,  // ✅ Store as actual object, not string
        createdAt: assessment.createdAt ? 
          Timestamp.fromDate(assessment.createdAt) : 
          serverTimestamp(),  // ✅ Use Firestore Timestamp
        updatedAt: assessment.updatedAt ? 
          Timestamp.fromDate(assessment.updatedAt) : 
          serverTimestamp(),  // ✅ Use Firestore Timestamp
        clinicianId: auth.currentUser?.uid || null,
        // ✅ Removed: clinicianEmail (redundant)
      });
    }

    await batch.commit();
    console.log(`✅ Synced ${allUnsyncedAssessments.length} assessments to consolidated collection`);
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