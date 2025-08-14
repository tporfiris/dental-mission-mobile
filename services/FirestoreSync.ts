// services/FirestoreSync.ts
import { database } from '../db';
import { db, auth } from '../firebaseConfig';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
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

class FirestoreSyncService {
  private syncInProgress = false;
  private listeners: ((status: SyncStatus) => void)[] = [];
  private syncedItemIds = new Set<string>(); // Track what's been synced
  private currentStatus: SyncStatus = {
    isOnline: true,
    lastSyncTime: null,
    pendingSyncCount: 0,
    isSyncing: false,
    syncError: null,
    isAuthenticated: false,
  };

  constructor() {
    this.loadSyncedItems();
    this.checkAuthStatus();
  }

  // Load previously synced item IDs from local storage or memory
  private async loadSyncedItems() {
    try {
      // For now, we'll track in memory. In a production app, you might want to 
      // store this in WatermelonDB or AsyncStorage for persistence
      this.syncedItemIds = new Set<string>();
    } catch (error) {
      console.error('Error loading synced items:', error);
    }
  }

  // Check authentication status without testing connectivity
  private async checkAuthStatus() {
    this.currentStatus.isAuthenticated = !!auth.currentUser;
    
    if (this.currentStatus.isAuthenticated) {
      console.log('🔐 User authenticated:', auth.currentUser?.email);
      this.currentStatus.isOnline = true; // Assume online if authenticated
      this.currentStatus.syncError = null;
    } else {
      console.log('🔐 User not authenticated');
      this.currentStatus.isOnline = false;
      this.currentStatus.syncError = 'User not authenticated';
    }
    
    this.updatePendingSyncCount();
    this.notifyListeners();
  }

  // Load last sync time from local storage (or implement in WatermelonDB)
  private async loadLastSyncTime() {
    try {
      this.updatePendingSyncCount();
    } catch (error) {
      console.error('Error loading last sync time:', error);
    }
  }

  // Subscribe to sync status updates
  public subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);
    
    // Immediately notify with current status
    listener(this.currentStatus);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners of status changes
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentStatus));
  }

  // Update pending sync count
  private async updatePendingSyncCount() {
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

      // Count all items that need to be synced
      const totalPending = 
        patients.length +
        treatments.length +
        dentitionAssessments.length +
        hygieneAssessments.length +
        extractionsAssessments.length +
        fillingsAssessments.length +
        dentureAssessments.length +
        implantAssessments.length;

      this.currentStatus.pendingSyncCount = totalPending;
      
      console.log('📊 Sync count breakdown:', {
        patients: patients.length,
        treatments: treatments.length,
        dentitionAssessments: dentitionAssessments.length,
        hygieneAssessments: hygieneAssessments.length,
        extractionsAssessments: extractionsAssessments.length,
        fillingsAssessments: fillingsAssessments.length,
        dentureAssessments: dentureAssessments.length,
        implantAssessments: implantAssessments.length,
        total: totalPending
      });
      
      this.notifyListeners();
    } catch (error) {
      console.error('Error updating pending sync count:', error);
    }
  }

  // Main sync function - only sync when there's new data
  public async syncToFirestore(): Promise<void> {
    if (this.syncInProgress) {
      console.log('🔄 Sync already in progress, skipping...');
      return;
    }

    // Check auth status first
    this.checkAuthStatus();
    
    if (!this.currentStatus.isAuthenticated) {
      console.log('🔐 User not authenticated, skipping sync');
      return;
    }

    // Check if there's anything to sync
    await this.updatePendingSyncCount();
    if (this.currentStatus.pendingSyncCount === 0) {
      console.log('ℹ️ No new data to sync');
      return;
    }

    this.syncInProgress = true;
    this.currentStatus.isSyncing = true;
    this.currentStatus.syncError = null;
    this.notifyListeners();

    try {
      console.log('🚀 Starting Firestore sync for new data...');

      // Sync all data types (only new items)
      await this.syncPatients();
      await this.syncTreatments();
      await this.syncAssessments();

      this.currentStatus.lastSyncTime = new Date();
      await this.updatePendingSyncCount(); // Recalculate after sync
      
      console.log('✅ Firestore sync completed successfully');
      
    } catch (error) {
      console.error('❌ Firestore sync failed:', error);
      this.currentStatus.syncError = error instanceof Error ? error.message : 'Unknown sync error';
      this.currentStatus.isOnline = false; // Mark as offline if sync fails
    } finally {
      this.syncInProgress = false;
      this.currentStatus.isSyncing = false;
      this.notifyListeners();
    }
  }

  // Sync patients to Firestore
  private async syncPatients() {
    try {
      const patients = await database.get<Patient>('patients').query().fetch();
      const batch = writeBatch(db);

      for (const patient of patients) {
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
        }, { merge: true });
      }

      await batch.commit();
      console.log(`✅ Synced ${patients.length} patients to Firestore`);
    } catch (error) {
      console.error('❌ Error syncing patients:', error);
      throw error;
    }
  }

  // Sync treatments to Firestore - only new ones
  private async syncTreatments() {
    try {
      const treatments = await database.get<Treatment>('treatments').query().fetch();
      const unsyncedTreatments = treatments.filter(t => !this.syncedItemIds.has(t.id));
      
      if (unsyncedTreatments.length === 0) {
        console.log('ℹ️ No new treatments to sync');
        return;
      }

      console.log(`🔄 Syncing ${unsyncedTreatments.length} new treatments...`);
      const batch = writeBatch(db);

      for (const treatment of unsyncedTreatments) {
        const treatmentRef = doc(db, 'treatments', treatment.id);
        
        const treatmentData = {
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
        };

        batch.set(treatmentRef, treatmentData, { merge: true });
        
        // Mark as synced
        this.syncedItemIds.add(treatment.id);
      }

      await batch.commit();
      console.log(`✅ Synced ${unsyncedTreatments.length} new treatments to Firestore`);
    } catch (error) {
      console.error('❌ Error syncing treatments:', error);
      throw error;
    }
  }

  // Sync all assessment types to Firestore - only new ones
  private async syncAssessments() {
    const assessmentTypes = [
      { collection: 'dentition_assessments', model: DentitionAssessment, name: 'Dentition' },
      { collection: 'hygiene_assessments', model: HygieneAssessment, name: 'Hygiene' },
      { collection: 'extractions_assessments', model: ExtractionsAssessment, name: 'Extractions' },
      { collection: 'fillings_assessments', model: FillingsAssessment, name: 'Fillings' },
      { collection: 'denture_assessments', model: DentureAssessment, name: 'Denture' },
      { collection: 'implant_assessments', model: ImplantAssessment, name: 'Implant' },
    ];

    for (const { collection: collectionName, model, name } of assessmentTypes) {
      try {
        const assessments = await database.get(collectionName).query().fetch();
        const unsyncedAssessments = assessments.filter(a => !this.syncedItemIds.has(a.id));
        
        if (unsyncedAssessments.length === 0) {
          console.log(`ℹ️ No new ${name} assessments to sync`);
          continue;
        }

        console.log(`🔄 Syncing ${unsyncedAssessments.length} new ${name} assessments...`);
        const batch = writeBatch(db);

        for (const assessment of unsyncedAssessments) {
          const assessmentRef = doc(db, collectionName, assessment.id);
          
          const assessmentData = {
            id: assessment.id,
            patientId: assessment.patientId,
            data: assessment.data,
            createdAt: assessment.createdAt ? assessment.createdAt.toISOString() : null,
            updatedAt: assessment.updatedAt ? assessment.updatedAt.toISOString() : null,
            syncedAt: serverTimestamp(),
            assessmentType: name.toLowerCase(),
          };

          batch.set(assessmentRef, assessmentData, { merge: true });
          
          // Mark as synced
          this.syncedItemIds.add(assessment.id);
        }

        await batch.commit();
        console.log(`✅ Synced ${unsyncedAssessments.length} new ${name} assessments to Firestore`);
        
      } catch (error) {
        console.error(`❌ Error syncing ${name} assessments:`, error);
        throw error;
      }
    }
  }

  // Manual sync trigger
  public async forceSync(): Promise<void> {
    await this.syncToFirestore();
  }

  // Get current sync status
  public getSyncStatus(): SyncStatus {
    return { ...this.currentStatus };
  }

  // Check if there's pending data to sync
  public async hasPendingSync(): Promise<boolean> {
    await this.updatePendingSyncCount();
    return this.currentStatus.pendingSyncCount > 0;
  }
}

// Export singleton instance
export const firestoreSyncService = new FirestoreSyncService();