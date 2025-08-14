// services/SimpleFirestoreSync.ts
import { database } from '../db';
import { db, auth } from '../firebaseConfig';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  writeBatch,
  serverTimestamp 
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
    this.startPeriodicSync();
  }

  // Start checking every minute for unsaved data
  private startPeriodicSync() {
    // Check immediately
    this.checkForUnsyncedData();
    
    // // Then check every 60 seconds
    // this.syncInterval = setInterval(() => {
    //   this.checkForUnsyncedData();
    // }, 60000); // 1 minute

    this.syncInterval = setInterval(() => {
      this.checkForUnsyncedData();
    }, 45000); // 45 seconds
    
    console.log('🕐 Started periodic sync check (every 1 minute)');
  }

  // Stop periodic sync (for cleanup)
  public stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('⏹️ Stopped periodic sync');
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
    if (!this.currentStatus.isAuthenticated || this.syncInProgress) {
      return;
    }

    try {
      const unsyncedCount = await this.countUnsyncedItems();
      this.currentStatus.pendingSyncCount = unsyncedCount;
      
      if (unsyncedCount > 0) {
        console.log(`🔍 Found ${unsyncedCount} unsynced items, starting sync...`);
        await this.syncUnsyncedData();
      } else {
        console.log('✅ No unsynced data found');
      }
      
      this.notifyListeners();
    } catch (error) {
      console.error('❌ Error checking for unsynced data:', error);
      this.currentStatus.syncError = error instanceof Error ? error.message : 'Unknown error';
      this.notifyListeners();
    }
  }

  // Count items that don't exist in Firestore yet - UPDATED FOR CONSOLIDATED STRUCTURE
  private async countUnsyncedItems(): Promise<number> {
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
        const exists = await this.checkIfExistsInFirestore('patients', patient.id);
        if (!exists) unsyncedCount++;
      }

      // Check each treatment
      for (const treatment of treatments) {
        const exists = await this.checkIfExistsInFirestore('treatments', treatment.id);
        if (!exists) unsyncedCount++;
      }

      // Check assessments - NOW ALL CHECK THE CONSOLIDATED 'assessments' COLLECTION
      const allAssessments = [
        ...dentitionAssessments,
        ...hygieneAssessments,
        ...extractionsAssessments,
        ...fillingsAssessments,
        ...dentureAssessments,
        ...implantAssessments,
      ];

      for (const assessment of allAssessments) {
        // Check the consolidated 'assessments' collection instead of individual collections
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
    try {
      const docRef = doc(db, collection, id);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      console.error(`Error checking if ${collection}/${id} exists:`, error);
      return false; // Assume it doesn't exist if we can't check
    }
  }

  // Sync only the data that doesn't exist in Firestore
  private async syncUnsyncedData() {
    if (this.syncInProgress) {
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
    const patients = await database.get<Patient>('patients').query().fetch();
    const unsyncedPatients = [];

    for (const patient of patients) {
      const exists = await this.checkIfExistsInFirestore('patients', patient.id);
      if (!exists) {
        unsyncedPatients.push(patient);
      }
    }

    if (unsyncedPatients.length === 0) {
      console.log('ℹ️ No unsynced patients');
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
        syncedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    console.log(`✅ Synced ${unsyncedPatients.length} new patients`);
  }

  // Sync only treatments that don't exist in Firestore
  private async syncUnsyncedTreatments() {
    const treatments = await database.get<Treatment>('treatments').query().fetch();
    const unsyncedTreatments = [];

    for (const treatment of treatments) {
      const exists = await this.checkIfExistsInFirestore('treatments', treatment.id);
      if (!exists) {
        unsyncedTreatments.push(treatment);
      }
    }

    if (unsyncedTreatments.length === 0) {
      console.log('ℹ️ No unsynced treatments');
      return;
    }

    console.log(`🔄 Syncing ${unsyncedTreatments.length} new treatments...`);
    const batch = writeBatch(db);

    for (const treatment of unsyncedTreatments) {
      const treatmentRef = doc(db, 'treatments', treatment.id);
      batch.set(treatmentRef, {
        id: treatment.id,
        patientId: treatment.patientId,
        visitId: treatment.visitId,
        type: treatment.type,
        tooth: treatment.tooth,
        surface: treatment.surface,
        units: treatment.units,
        value: treatment.value,
        billingCodes: treatment.billingCodes,
        notes: treatment.notes,
        clinicianName: treatment.clinicianName,
        completedAt: treatment.completedAt ? treatment.completedAt.toISOString() : null,
        createdAt: serverTimestamp(),
        syncedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    console.log(`✅ Synced ${unsyncedTreatments.length} new treatments`);
  }

  // Sync only assessments that don't exist in Firestore - CONSOLIDATED VERSION
  private async syncUnsyncedAssessments() {
    const assessmentTypes = [
      { collection: 'dentition_assessments', name: 'dentition' },
      { collection: 'hygiene_assessments', name: 'hygiene' },
      { collection: 'extractions_assessments', name: 'extractions' },
      { collection: 'fillings_assessments', name: 'fillings' },
      { collection: 'denture_assessments', name: 'denture' },
      { collection: 'implant_assessments', name: 'implant' },
    ];

    // Process all assessment types and batch them together
    const allUnsyncedAssessments = [];

    for (const { collection: localCollection, name: assessmentType } of assessmentTypes) {
      const assessments = await database.get(localCollection).query().fetch();

      for (const assessment of assessments) {
        // Check if this assessment exists in the consolidated 'assessments' collection
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
      console.log('ℹ️ No unsynced assessments');
      return;
    }

    console.log(`🔄 Syncing ${allUnsyncedAssessments.length} assessments to consolidated collection...`);
    
    // Batch all assessments into the single 'assessments' collection
    const batch = writeBatch(db);

    for (const { assessment, type } of allUnsyncedAssessments) {
      const assessmentRef = doc(db, 'assessments', assessment.id); // Single collection!
      
      batch.set(assessmentRef, {
        id: assessment.id,
        patientId: assessment.patientId,
        assessmentType: type, // ← This is the key field that replaces separate collections
        data: assessment.data,
        createdAt: assessment.createdAt ? assessment.createdAt.toISOString() : null,
        updatedAt: assessment.updatedAt ? assessment.updatedAt.toISOString() : null,
        syncedAt: serverTimestamp(),
        clinicianId: auth.currentUser?.uid || null,
        clinicianEmail: auth.currentUser?.email || null,
      });
    }

    await batch.commit();
    console.log(`✅ Synced ${allUnsyncedAssessments.length} assessments to consolidated collection`);
    
    // Log breakdown by type
    const breakdown = allUnsyncedAssessments.reduce((acc, { type }) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📊 Assessment sync breakdown:', breakdown);
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

  // Trigger auth status check (call when user logs in/out)
  public updateAuthStatus(): void {
    this.checkAuthStatus();
  }
}

// Export singleton instance
export const simpleFirestoreSyncService = new SimpleFirestoreSyncService();