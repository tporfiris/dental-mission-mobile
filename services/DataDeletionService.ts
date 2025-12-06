// services/DataDeletionService.ts
import { db } from '../firebaseConfig';
import { doc, deleteDoc, getDoc } from 'firebase/firestore';
import { database } from '../db';
import Treatment from '../db/models/Treatment';
import DentitionAssessment from '../db/models/DentitionAssessment';
import HygieneAssessment from '../db/models/HygieneAssessment';
import ExtractionsAssessment from '../db/models/ExtractionsAssessment';
import FillingsAssessment from '../db/models/FillingsAssessment';
import DentureAssessment from '../db/models/DentureAssessment';
import ImplantAssessment from '../db/models/ImplantAssessment';

export interface DeleteResult {
  success: boolean;
  error?: string;
  deletedFrom: {
    cloud: boolean;
    local: boolean;
  };
  isLocked?: boolean;
  lockReason?: string;
}

class DataDeletionService {
  /**
   * Check if an item is locked for deletion based on sync time
   * Items are locked after midnight of the day they were synced
   */
  private isLockedForDeletion(syncedAt: Date | null): boolean {
    if (!syncedAt) {
      // If no sync date, allow deletion (shouldn't happen in normal flow)
      return false;
    }

    // Get midnight of the day the item was synced
    const syncDate = new Date(syncedAt);
    const midnightAfterSync = new Date(syncDate);
    midnightAfterSync.setHours(24, 0, 0, 0); // Set to midnight of the NEXT day

    // Get current time
    const now = new Date();

    // If current time is past midnight of the sync day, it's locked
    const isLocked = now >= midnightAfterSync;

    if (isLocked) {
      console.log(`🔒 Item locked for deletion:`, {
        syncedAt: syncDate.toLocaleString(),
        lockTime: midnightAfterSync.toLocaleString(),
        currentTime: now.toLocaleString(),
      });
    }

    return isLocked;
  }

  /**
   * Format the lock reason for user-friendly display
   */
  private getLockReason(syncedAt: Date): string {
    const syncDate = new Date(syncedAt);
    const midnightAfterSync = new Date(syncDate);
    midnightAfterSync.setHours(24, 0, 0, 0);

    return `This item was synced on ${syncDate.toLocaleDateString()} at ${syncDate.toLocaleTimeString()} and became locked after midnight. Items can only be deleted on the same day they are synced.`;
  }

  /**
   * Delete a treatment from both Firestore and WatermelonDB
   */
  /**
   * Delete a treatment from both Firestore and WatermelonDB
   */
  public async deleteTreatment(treatmentId: string): Promise<DeleteResult> {
    const result: DeleteResult = {
      success: false,
      deletedFrom: {
        cloud: false,
        local: false,
      },
    };

    try {
      console.log(`🗑️ Starting deletion of treatment: ${treatmentId}`);

      // Step 1: Check if treatment is locked by fetching from Firestore
      try {
        const treatmentRef = doc(db, 'treatments', treatmentId);
        const treatmentSnap = await getDoc(treatmentRef);

        if (treatmentSnap.exists()) {
          const treatmentData = treatmentSnap.data();
          
          // Check for syncedAt timestamp (Firestore Timestamp)
          let syncedAt: Date | null = null;
          
          if (treatmentData.syncedAt) {
            // Convert Firestore Timestamp to Date
            syncedAt = treatmentData.syncedAt.toDate ? 
              treatmentData.syncedAt.toDate() : 
              new Date(treatmentData.syncedAt);
          } else if (treatmentData.createdAt) {
            // Fallback to createdAt if syncedAt doesn't exist
            syncedAt = treatmentData.createdAt.toDate ? 
              treatmentData.createdAt.toDate() : 
              new Date(treatmentData.createdAt);
          }

          // Check if locked
          if (syncedAt && this.isLockedForDeletion(syncedAt)) {
            result.isLocked = true;
            result.lockReason = this.getLockReason(syncedAt);
            result.error = 'Item is locked for deletion';
            console.log(`🔒 Treatment is locked for deletion`);
            return result;
          }
        }
      } catch (fetchError) {
        console.error('⚠️ Could not check lock status (may be offline):', fetchError);
        // If we can't fetch from Firestore, don't allow deletion for safety
        result.isLocked = true;
        result.lockReason = 'Unable to verify deletion eligibility. Please ensure you have an internet connection.';
        result.error = 'Cannot verify lock status';
        return result;
      }

      // Step 2: Delete from Firestore
      try {
        const treatmentRef = doc(db, 'treatments', treatmentId);
        await deleteDoc(treatmentRef);
        result.deletedFrom.cloud = true;
        console.log(`✅ Treatment deleted from Firestore: ${treatmentId}`);
      } catch (cloudError) {
        console.error('❌ Failed to delete from Firestore:', cloudError);
        // Continue to try local deletion even if cloud fails
        result.error = `Cloud deletion failed: ${cloudError instanceof Error ? cloudError.message : 'Unknown error'}`;
      }

      // Step 3: Delete from WatermelonDB
      try {
        const treatment = await database.get<Treatment>('treatments').find(treatmentId);
        await database.write(async () => {
          await treatment.markAsDeleted();
        });
        result.deletedFrom.local = true;
        console.log(`✅ Treatment deleted from local database: ${treatmentId}`);
      } catch (localError) {
        console.error('❌ Failed to delete from local database:', localError);
        if (!result.error) {
          result.error = `Local deletion failed: ${localError instanceof Error ? localError.message : 'Unknown error'}`;
        }
      }

      // Success if deleted from at least one location
      result.success = result.deletedFrom.cloud || result.deletedFrom.local;

      return result;
    } catch (error) {
      console.error('❌ Treatment deletion failed:', error);
      result.error = error instanceof Error ? error.message : 'Unknown deletion error';
      return result;
    }
  }

  /**
   * Delete an assessment from both Firestore and WatermelonDB
   */
  public async deleteAssessment(
    assessmentId: string,
    assessmentType: 'dentition' | 'hygiene' | 'extractions' | 'fillings' | 'denture' | 'implant'
  ): Promise<DeleteResult> {
    const result: DeleteResult = {
      success: false,
      deletedFrom: {
        cloud: false,
        local: false,
      },
    };

    try {
      console.log(`🗑️ Starting deletion of ${assessmentType} assessment: ${assessmentId}`);

      // Step 1: Check if assessment is locked by fetching from Firestore
      try {
        const assessmentRef = doc(db, 'assessments', assessmentId);
        const assessmentSnap = await getDoc(assessmentRef);

        if (assessmentSnap.exists()) {
          const assessmentData = assessmentSnap.data();
          
          // Check for syncedAt timestamp (Firestore Timestamp)
          let syncedAt: Date | null = null;
          
          if (assessmentData.syncedAt) {
            // Convert Firestore Timestamp to Date
            syncedAt = assessmentData.syncedAt.toDate ? 
              assessmentData.syncedAt.toDate() : 
              new Date(assessmentData.syncedAt);
          } else if (assessmentData.createdAt) {
            // Fallback to createdAt if syncedAt doesn't exist
            syncedAt = assessmentData.createdAt.toDate ? 
              assessmentData.createdAt.toDate() : 
              new Date(assessmentData.createdAt);
          }

          // Check if locked
          if (syncedAt && this.isLockedForDeletion(syncedAt)) {
            result.isLocked = true;
            result.lockReason = this.getLockReason(syncedAt);
            result.error = 'Item is locked for deletion';
            console.log(`🔒 Assessment is locked for deletion`);
            return result;
          }
        }
      } catch (fetchError) {
        console.error('⚠️ Could not check lock status (may be offline):', fetchError);
        // If we can't fetch from Firestore, don't allow deletion for safety
        result.isLocked = true;
        result.lockReason = 'Unable to verify deletion eligibility. Please ensure you have an internet connection.';
        result.error = 'Cannot verify lock status';
        return result;
      }

      // Step 2: Delete from Firestore (all assessments are in 'assessments' collection)
      try {
        const assessmentRef = doc(db, 'assessments', assessmentId);
        await deleteDoc(assessmentRef);
        result.deletedFrom.cloud = true;
        console.log(`✅ Assessment deleted from Firestore: ${assessmentId}`);
      } catch (cloudError) {
        console.error('❌ Failed to delete from Firestore:', cloudError);
        result.error = `Cloud deletion failed: ${cloudError instanceof Error ? cloudError.message : 'Unknown error'}`;
      }

      // Step 3: Delete from WatermelonDB (different table per type)
      try {
        const tableName = `${assessmentType}_assessments`;
        const assessment = await database.get(tableName).find(assessmentId);
        await database.write(async () => {
          await assessment.markAsDeleted();
        });
        result.deletedFrom.local = true;
        console.log(`✅ Assessment deleted from local database: ${assessmentId}`);
      } catch (localError) {
        console.error('❌ Failed to delete from local database:', localError);
        if (!result.error) {
          result.error = `Local deletion failed: ${localError instanceof Error ? localError.message : 'Unknown error'}`;
        }
      }

      // Success if deleted from at least one location
      result.success = result.deletedFrom.cloud || result.deletedFrom.local;

      return result;
    } catch (error) {
      console.error('❌ Assessment deletion failed:', error);
      result.error = error instanceof Error ? error.message : 'Unknown deletion error';
      return result;
    }
  }

  /**
   * Batch delete multiple treatments
   */
  public async deleteTreatments(treatmentIds: string[]): Promise<{
    successful: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const treatmentId of treatmentIds) {
      const result = await this.deleteTreatment(treatmentId);
      if (result.success) {
        successful.push(treatmentId);
      } else {
        failed.push({
          id: treatmentId,
          error: result.error || 'Unknown error',
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Batch delete multiple assessments
   */
  public async deleteAssessments(
    assessments: Array<{
      id: string;
      type: 'dentition' | 'hygiene' | 'extractions' | 'fillings' | 'denture' | 'implant';
    }>
  ): Promise<{
    successful: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const assessment of assessments) {
      const result = await this.deleteAssessment(assessment.id, assessment.type);
      if (result.success) {
        successful.push(assessment.id);
      } else {
        failed.push({
          id: assessment.id,
          error: result.error || 'Unknown error',
        });
      }
    }

    return { successful, failed };
  }
}

// Export singleton instance
export const dataDeletionService = new DataDeletionService();