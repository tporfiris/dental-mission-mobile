// services/MediaUploadService.ts
// Handles media uploads when WiFi is available:
import { storage } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';
import { database } from '../db';
import Patient from '../db/models/Patient';
import AudioNote from '../db/models/AudioNote';
import { Q } from '@nozbe/watermelondb';

interface MediaItem {
  localUri: string;
  cloudUri?: string;
  type: 'photo' | 'audio';
  patientId: string;
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed';
  uploadedAt?: Date;
}

class MediaUploadService {
  private uploadQueue: MediaItem[] = [];
  private isUploading = false;

  // Add media to upload queue
  public queueForUpload(localUri: string, type: 'photo' | 'audio', patientId: string) {
    this.uploadQueue.push({
      localUri,
      type,
      patientId,
      uploadStatus: 'pending'
    });
    
    // Try to upload immediately if online
    this.processQueue();
  }

  // method to update the database with cloud URI
  private async updateMediaRecord(item: MediaItem) {
    try {
      if (item.type === 'photo') {
        // Update patient record with cloud URI
        const patient = await database.get<Patient>('patients').find(item.patientId);
        await database.write(async () => {
          await patient.update(p => {
            (p as any).photoCloudUri = item.cloudUri;
          });
        });
        console.log(`✅ Updated patient ${item.patientId} with cloud photo URI`);
        
      } else if (item.type === 'audio') {
        // Find the audio note by local URI and update with cloud URI
        const audioNotes = await database
          .get<AudioNote>('audio_notes')
          .query(Q.where('patient_id', item.patientId), Q.where('uri', item.localUri))
          .fetch();
        
        if (audioNotes.length > 0) {
          const audioNote = audioNotes[0];
          await database.write(async () => {
            await audioNote.update(note => {
              (note as any).cloudUri = item.cloudUri;
            });
          });
          console.log(`✅ Updated audio note with cloud URI`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to update media record:', error);
    }
  }

  // Process upload queue
  private async processQueue() {
    // Check if already uploading
    if (this.isUploading) {
      return;
    }

    // Check network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected || !netInfo.isInternetReachable) {
      console.log('📵 No internet - media will upload when connection is restored');
      return;
    }

    this.isUploading = true;

    // Process each pending item
    for (const item of this.uploadQueue.filter(i => i.uploadStatus === 'pending')) {
      try {
        item.uploadStatus = 'uploading';
        
        const cloudUri = await this.uploadToFirebase(item.localUri, item.type, item.patientId);
        
        item.cloudUri = cloudUri;
        item.uploadStatus = 'uploaded';
        item.uploadedAt = new Date();
        
        console.log(`✅ Uploaded ${item.type}: ${cloudUri}`);
        
        // Update database with cloud URI
        await this.updateMediaRecord(item);
        
      } catch (error) {
        console.error(`❌ Failed to upload ${item.type}:`, error);
        item.uploadStatus = 'failed';
      }
    }

    this.isUploading = false;

    // Remove uploaded items from queue
    this.uploadQueue = this.uploadQueue.filter(i => i.uploadStatus !== 'uploaded');
  }

  // services/MediaUploadService.ts
  private async uploadToFirebase(localUri: string, type: 'photo' | 'audio', patientId: string): Promise<string> {
    try {
      console.log(`📤 Starting upload: ${type} for patient ${patientId}`);
      console.log(`📤 Local URI: ${localUri}`);
      
      // Read file as blob
      const response = await fetch(localUri);
      const blob = await response.blob();
      
      console.log(`📤 Blob created: ${blob.size} bytes, type: ${blob.type}`);

      // Create storage reference
      const timestamp = Date.now();
      const fileExtension = type === 'photo' ? 'jpg' : 'm4a';
      const fileName = `${type}_${timestamp}.${fileExtension}`;
      const storagePath = `missions/${patientId}/${type}s/${fileName}`;
      
      console.log(`📤 Upload path: ${storagePath}`);
      
      const storageRef = ref(storage, storagePath);

      // Upload with metadata
      const metadata = {
        contentType: type === 'photo' ? 'image/jpeg' : 'audio/m4a',
        customMetadata: {
          patientId: patientId,
          uploadedAt: new Date().toISOString()
        }
      };

      console.log(`📤 Uploading to Firebase Storage...`);
      await uploadBytes(storageRef, blob, metadata);
      
      console.log(`📤 Upload complete, getting download URL...`);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      console.log(`✅ Upload successful: ${downloadURL}`);
      return downloadURL;
      
    } catch (error: any) {
      console.error(`❌ Upload error details:`, {
        code: error?.code,
        message: error?.message,
        serverResponse: error?.serverResponse,
        customData: error?.customData
      });
      throw error;
    }
  }

  // Start periodic retry for failed uploads
  public startPeriodicRetry(intervalMinutes: number = 5) {
    setInterval(() => {
      this.processQueue();
    }, intervalMinutes * 60 * 1000);
  }
}

export const mediaUploadService = new MediaUploadService();