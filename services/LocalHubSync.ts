// services/LocalHubSync.ts
// COMPLETE CORRECTED VERSION - Replace your entire file with this

import { database } from '../db';
import Patient from '../db/models/Patient';
import Treatment from '../db/models/Treatment';
import DentitionAssessment from '../db/models/DentitionAssessment';
import HygieneAssessment from '../db/models/HygieneAssessment';
import ExtractionsAssessment from '../db/models/ExtractionsAssessment';
import FillingsAssessment from '../db/models/FillingsAssessment';
import DentureAssessment from '../db/models/DentureAssessment';
import ImplantAssessment from '../db/models/ImplantAssessment';

export interface LocalHubSyncStatus {
  isConnected: boolean;
  hubIP: string | null;
  lastSyncTime: Date | null;
  isSyncing: boolean;
  syncError: string | null;
  itemsSynced: {
    patients: number;
    treatments: number;
    assessments: number;
  };
}

class LocalHubSyncService {
  private hubIP: string | null = null;
  private syncInProgress = false;
  private listeners: ((status: LocalHubSyncStatus) => void)[] = [];
  private syncInterval: NodeJS.Timeout | null = null;
  private lastPulledAt: number = 0;
  
  private currentStatus: LocalHubSyncStatus = {
    isConnected: false,
    hubIP: null,
    lastSyncTime: null,
    isSyncing: false,
    syncError: null,
    itemsSynced: {
      patients: 0,
      treatments: 0,
      assessments: 0,
    },
  };

  // Possible IPs for different hotspot configurations
  private possibleHubIPs = [
    '192.168.2.1',   // MacBook hotspot default
    '10.0.0.194',  // REPLACE THIS with your MacBook's actual IP!
    '192.168.1.1',   // Common router IP
    '192.168.43.1',  // Android hotspot
    '172.20.10.1',   // iOS hotspot
  ];

  // Set hub IP manually (for testing)
  public setHubIP(ip: string) {
    console.log(`🔧 Setting hub IP to: ${ip}`);
    this.hubIP = ip;
    this.currentStatus.hubIP = ip;
    this.checkConnection();
  }

  // Auto-discover hub device on network
  public async discoverHub(): Promise<string | null> {
    console.log('🔍 Searching for hub device on network...');
    
    for (const ip of this.possibleHubIPs) {
      try {
        console.log(`   Checking ${ip}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`http://${ip}:3000/ping`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Hub found at ${ip}!`, data);
          this.hubIP = ip;
          this.currentStatus.hubIP = ip;
          this.currentStatus.isConnected = true;
          this.currentStatus.syncError = null;
          this.notifyListeners();
          return ip;
        }
      } catch (error) {
        console.log(`   ❌ No hub at ${ip}`);
        continue;
      }
    }

    console.log('❌ Hub not found on any known IP address');
    this.currentStatus.isConnected = false;
    this.currentStatus.syncError = 'Hub not found on network';
    this.notifyListeners();
    return null;
  }

  // Check if hub is reachable
  private async checkConnection(): Promise<boolean> {
    if (!this.hubIP) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`http://${this.hubIP}:3000/ping`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const isConnected = response.ok;
      this.currentStatus.isConnected = isConnected;
      
      if (!isConnected) {
        this.currentStatus.syncError = 'Hub not responding';
      } else {
        this.currentStatus.syncError = null;
      }
      
      this.notifyListeners();
      return isConnected;
    } catch (error) {
      this.currentStatus.isConnected = false;
      this.currentStatus.syncError = 'Connection failed';
      this.notifyListeners();
      return false;
    }
  }

  // Start periodic sync
  public startPeriodicSync(intervalSeconds: number = 180) {
    this.stopPeriodicSync();
    
    console.log(`🕐 Starting periodic sync (every ${intervalSeconds} seconds)`);
    
    // Sync immediately
    this.syncWithHub();
    
    // Then sync periodically
    this.syncInterval = setInterval(() => {
      this.syncWithHub();
    }, intervalSeconds * 1000);
  }

  // Stop periodic sync
  public stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('⏹️  Stopped periodic sync');
    }
  }

  // Main sync function
  public async syncWithHub(): Promise<void> {
    if (this.syncInProgress) {
      console.log('🔄 Sync already in progress, skipping...');
      return;
    }

    // Check connection first
    const isConnected = await this.checkConnection();
    if (!isConnected) {
      console.log('📵 Not connected to hub, skipping sync');
      return;
    }

    this.syncInProgress = true;
    this.currentStatus.isSyncing = true;
    this.currentStatus.syncError = null;
    this.notifyListeners();

    try {
      console.log('🚀 Starting sync with hub...');

      // Step 1: Push local changes to hub
      await this.pushChangesToHub();

      // Step 2: Pull updates from hub
      await this.pullChangesFromHub();

      this.currentStatus.lastSyncTime = new Date();
      console.log('✅ Sync completed successfully');

    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.currentStatus.syncError = error instanceof Error ? error.message : 'Sync failed';
      this.currentStatus.isConnected = false;
    } finally {
      this.syncInProgress = false;
      this.currentStatus.isSyncing = false;
      this.notifyListeners();
    }
  }

  // Push local changes to hub
  private async pushChangesToHub() {
    try {
      console.log('📤 Collecting local data to push...');
      
      // Collect all local data from WatermelonDB
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

      // Consolidate all assessments with type field
      const allAssessments = [
        ...dentitionAssessments.map(a => ({ 
          id: a.id,
          patientId: a.patientId,
          data: a.data,
          createdAt: a.createdAt ? a.createdAt.getTime() : Date.now(),
          updatedAt: a.updatedAt ? a.updatedAt.getTime() : Date.now(),
          assessmentType: 'dentition' 
        })),
        ...hygieneAssessments.map(a => ({ 
          id: a.id,
          patientId: a.patientId,
          data: a.data,
          createdAt: a.createdAt ? a.createdAt.getTime() : Date.now(),
          updatedAt: a.updatedAt ? a.updatedAt.getTime() : Date.now(),
          assessmentType: 'hygiene' 
        })),
        ...extractionsAssessments.map(a => ({ 
          id: a.id,
          patientId: a.patientId,
          data: a.data,
          createdAt: a.createdAt ? a.createdAt.getTime() : Date.now(),
          updatedAt: a.updatedAt ? a.updatedAt.getTime() : Date.now(),
          assessmentType: 'extractions' 
        })),
        ...fillingsAssessments.map(a => ({ 
          id: a.id,
          patientId: a.patientId,
          data: a.data,
          createdAt: a.createdAt ? a.createdAt.getTime() : Date.now(),
          updatedAt: a.updatedAt ? a.updatedAt.getTime() : Date.now(),
          assessmentType: 'fillings' 
        })),
        ...dentureAssessments.map(a => ({ 
          id: a.id,
          patientId: a.patientId,
          data: a.data,
          createdAt: a.createdAt ? a.createdAt.getTime() : Date.now(),
          updatedAt: a.updatedAt ? a.updatedAt.getTime() : Date.now(),
          assessmentType: 'denture' 
        })),
        ...implantAssessments.map(a => ({ 
          id: a.id,
          patientId: a.patientId,
          data: a.data,
          createdAt: a.createdAt ? a.createdAt.getTime() : Date.now(),
          updatedAt: a.updatedAt ? a.updatedAt.getTime() : Date.now(),
          assessmentType: 'implant' 
        })),
      ];

      const changes = {
        patients: patients.map(p => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          age: p.age,
          gender: p.gender,
          location: p.location,
          photoUri: p.photoUri,
        })),
        treatments: treatments.map(t => ({
          id: t.id,
          patientId: t.patientId,
          visitId: t.visitId,
          type: t.type,
          tooth: t.tooth,
          surface: t.surface,
          units: t.units,
          value: t.value,
          billingCodes: t.billingCodes,
          notes: t.notes,
          clinicianName: t.clinicianName,
          completedAt: t.completedAt ? t.completedAt.toISOString() : null,
        })),
        assessments: allAssessments,
      };

      console.log(`📤 Pushing to hub:`, {
        patients: changes.patients.length,
        treatments: changes.treatments.length,
        assessments: changes.assessments.length,
      });

      const response = await fetch(`http://${this.hubIP}:3000/sync/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes }),
      });

      if (!response.ok) {
        throw new Error(`Push failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Push successful:', result.summary);

    } catch (error) {
      console.error('❌ Push failed:', error);
      throw error;
    }
  }

  // Pull updates from hub
  private async pullChangesFromHub() {
    try {
      console.log(`📥 Pulling from hub (lastPulledAt: ${this.lastPulledAt})`);

      const response = await fetch(
        `http://${this.hubIP}:3000/sync/pull?lastPulledAt=${this.lastPulledAt}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error(`Pull failed: ${response.statusText}`);
      }

      const changes = await response.json();
      
      console.log(`📥 Received from hub:`, {
        patients: changes.patients?.length || 0,
        treatments: changes.treatments?.length || 0,
        assessments: changes.assessments?.length || 0,
      });

      // Filter out items we already have locally
      const newChanges = await this.filterNewChanges(changes);
      
      console.log(`📥 New items to merge:`, {
        patients: newChanges.patients?.length || 0,
        treatments: newChanges.treatments?.length || 0,
        assessments: newChanges.assessments?.length || 0,
      });

      // Update local database with NEW changes from hub only
      if (newChanges.patients?.length > 0 || newChanges.treatments?.length > 0 || newChanges.assessments?.length > 0) {
        await this.mergeChangesIntoLocal(newChanges);
      } else {
        console.log('ℹ️ No new changes to merge');
      }

      // Update lastPulledAt timestamp
      this.lastPulledAt = changes.timestamp || Date.now();

      this.currentStatus.itemsSynced = {
        patients: newChanges.patients?.length || 0,
        treatments: newChanges.treatments?.length || 0,
        assessments: newChanges.assessments?.length || 0,
      };

    } catch (error) {
      console.error('❌ Pull failed:', error);
      throw error;
    }
  }

  // ✅ NEW FUNCTION: Filter out items we already have
  private async filterNewChanges(changes: any): Promise<any> {
    const newPatients = [];
    const newTreatments = [];
    const newAssessments = [];

    // Check patients
    if (changes.patients) {
      for (const patient of changes.patients) {
        try {
          await database.get<Patient>('patients').find(patient.id);
          // Patient exists, skip it
        } catch {
          // Patient doesn't exist, add to list
          newPatients.push(patient);
        }
      }
    }

    // Check treatments
    if (changes.treatments) {
      for (const treatment of changes.treatments) {
        try {
          await database.get<Treatment>('treatments').find(treatment.id);
          // Treatment exists, skip it
        } catch {
          // Treatment doesn't exist, add to list
          newTreatments.push(treatment);
        }
      }
    }

    // Check assessments
    if (changes.assessments) {
      for (const assessment of changes.assessments) {
        const tableName = `${assessment.assessmentType}_assessments`;
        try {
          await database.get(tableName).find(assessment.id);
          // Assessment exists, skip it
        } catch {
          // Assessment doesn't exist, add to list
          newAssessments.push(assessment);
        }
      }
    }

    return {
      patients: newPatients,
      treatments: newTreatments,
      assessments: newAssessments,
      timestamp: changes.timestamp,
    };
  }

  // Merge changes from hub into local WatermelonDB
  private async mergeChangesIntoLocal(changes: any) {
    try {
      await database.write(async () => {
        // Merge patients
        if (changes.patients && changes.patients.length > 0) {
          for (const patientData of changes.patients) {
            try {
              const existing = await database.get<Patient>('patients').find(patientData.id);
              // Patient exists, update it
              await existing.update((patient) => {
                patient.firstName = patientData.firstName;
                patient.lastName = patientData.lastName;
                patient.age = patientData.age;
                patient.gender = patientData.gender;
                patient.location = patientData.location;
                patient.photoUri = patientData.photoUri || '';
              });
            } catch {
              // Patient doesn't exist, create it
              await database.get<Patient>('patients').create((patient) => {
                (patient as any)._raw.id = patientData.id;
                patient.firstName = patientData.firstName;
                patient.lastName = patientData.lastName;
                patient.age = patientData.age;
                patient.gender = patientData.gender;
                patient.location = patientData.location;
                patient.photoUri = patientData.photoUri || '';
              });
              console.log(`   ➕ Added patient from hub: ${patientData.firstName} ${patientData.lastName}`);
            }
          }
        }

        // Merge treatments
        if (changes.treatments && changes.treatments.length > 0) {
          for (const treatmentData of changes.treatments) {
            try {
              const existing = await database.get<Treatment>('treatments').find(treatmentData.id);
              await existing.update((treatment) => {
                treatment.patientId = treatmentData.patientId;
                treatment.visitId = treatmentData.visitId;
                treatment.type = treatmentData.type;
                treatment.tooth = treatmentData.tooth;
                treatment.surface = treatmentData.surface;
                treatment.units = treatmentData.units;
                treatment.value = treatmentData.value;
                treatment.billingCodes = treatmentData.billingCodes;
                treatment.notes = treatmentData.notes;
                treatment.clinicianName = treatmentData.clinicianName;
                if (treatmentData.completedAt) {
                  treatment.completedAt = new Date(treatmentData.completedAt);
                }
              });
            } catch {
              await database.get<Treatment>('treatments').create((treatment) => {
                (treatment as any)._raw.id = treatmentData.id;
                treatment.patientId = treatmentData.patientId;
                treatment.visitId = treatmentData.visitId;
                treatment.type = treatmentData.type;
                treatment.tooth = treatmentData.tooth;
                treatment.surface = treatmentData.surface;
                treatment.units = treatmentData.units;
                treatment.value = treatmentData.value;
                treatment.billingCodes = treatmentData.billingCodes;
                treatment.notes = treatmentData.notes;
                treatment.clinicianName = treatmentData.clinicianName;
                if (treatmentData.completedAt) {
                  treatment.completedAt = new Date(treatmentData.completedAt);
                }
              });
              console.log(`   ➕ Added treatment from hub: ${treatmentData.type}`);
            }
          }
        }

        // Merge assessments (distribute to correct tables)
        if (changes.assessments && changes.assessments.length > 0) {
          for (const assessmentData of changes.assessments) {
            const tableName = `${assessmentData.assessmentType}_assessments`;
            
            try {
              const existing = await database.get(tableName).find(assessmentData.id);
              await existing.update((assessment: any) => {
                assessment.patientId = assessmentData.patientId;
                assessment.data = assessmentData.data;
                assessment.createdAt = new Date(assessmentData.createdAt);
                assessment.updatedAt = new Date(assessmentData.updatedAt);
              });
            } catch {
              await database.get(tableName).create((assessment: any) => {
                (assessment as any)._raw.id = assessmentData.id;
                assessment.patientId = assessmentData.patientId;
                assessment.data = assessmentData.data;
                assessment.createdAt = new Date(assessmentData.createdAt);
                assessment.updatedAt = new Date(assessmentData.updatedAt);
              });
              console.log(`   ➕ Added assessment from hub: ${assessmentData.assessmentType}`);
            }
          }
        }
      });

      console.log('✅ Changes merged into local database');
    } catch (error) {
      console.error('❌ Failed to merge changes:', error);
      throw error;
    }
  }

  // Subscribe to status updates
  public subscribe(listener: (status: LocalHubSyncStatus) => void): () => void {
    this.listeners.push(listener);
    listener(this.currentStatus);
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify listeners
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentStatus));
  }

  // Get current status
  public getStatus(): LocalHubSyncStatus {
    return { ...this.currentStatus };
  }

  // Force sync now
  public async forceSync(): Promise<void> {
    await this.syncWithHub();
  }
}

// Export singleton
export const localHubSyncService = new LocalHubSyncService();