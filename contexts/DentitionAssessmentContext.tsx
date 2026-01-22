// contexts/DentitionAssessmentContext.tsx
import React, { createContext, useContext, useRef } from 'react';
import { database } from '../db';
import { Q } from '@nozbe/watermelondb';
import DentitionAssessment from '../db/models/DentitionAssessment';

const TOOTH_IDS = [
  '11','12','13','14','15','16','17','18',
  '21','22','23','24','25','26','27','28',
  '31','32','33','34','35','36','37','38',
  '41','42','43','44','45','46','47','48',
];

type ToothState = 'present' | 'has-fillings' | 'has-crowns' | 'existing-rc' | 'has-cavities' | 'broken-crack' | 'crown-missing' | 'roots-only' | 'fully-missing';

type ToothStates = Record<string, ToothState>;

const defaultToothStates: ToothStates = {};
TOOTH_IDS.forEach(id => {
  defaultToothStates[id] = 'present';
});

// ✅ Draft state interface for in-progress assessments
interface DraftState {
  toothStates: ToothStates;
  primaryTeeth: string[]; // Use array instead of Set for easier serialization
}

interface DentitionAssessmentContextType {
  saveAssessment: (patientId: string, data: any) => Promise<void>;
  loadLatestAssessment: (patientId: string) => Promise<any>;
  loadAllAssessments: (patientId: string) => Promise<DentitionAssessment[]>;
  // ✅ Draft state management
  saveDraft: (patientId: string, toothStates: ToothStates, primaryTeeth: string[]) => void;
  loadDraft: (patientId: string) => DraftState | null;
  clearDraft: (patientId: string) => void;
  hasDraft: (patientId: string) => boolean;
}

const DentitionAssessmentContext = createContext<DentitionAssessmentContextType>({
  saveAssessment: async () => {},
  loadLatestAssessment: async () => null,
  loadAllAssessments: async () => [],
  saveDraft: () => {},
  loadDraft: () => null,
  clearDraft: () => {},
  hasDraft: () => false,
});

export const useDentitionAssessment = () => useContext(DentitionAssessmentContext);

export const DentitionAssessmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  
  // ✅ Store draft states per patient in memory (persists across navigation)
  const draftStatesRef = useRef<Map<string, DraftState>>(new Map());

  // ✅ Save draft state for a patient
  const saveDraft = (patientId: string, toothStates: ToothStates, primaryTeeth: string[]) => {
    const draft: DraftState = {
      toothStates: { ...toothStates }, // Clone to avoid mutation
      primaryTeeth: [...primaryTeeth], // Clone array
    };
    draftStatesRef.current.set(patientId, draft);
    console.log('💾 Saved draft for patient:', patientId, 'Primary teeth:', primaryTeeth);
  };

  // ✅ Load draft state for a patient
  const loadDraft = (patientId: string): DraftState | null => {
    const draft = draftStatesRef.current.get(patientId);
    if (draft) {
      console.log('📋 Loaded draft for patient:', patientId, 'Primary teeth:', draft.primaryTeeth);
      return draft;
    }
    console.log('📋 No draft found for patient:', patientId);
    return null;
  };

  // ✅ Check if draft exists
  const hasDraft = (patientId: string): boolean => {
    return draftStatesRef.current.has(patientId);
  };

  // ✅ Clear draft state
  const clearDraft = (patientId: string) => {
    draftStatesRef.current.delete(patientId);
    console.log('🗑️ Cleared draft for patient:', patientId);
  };

  // ALWAYS create a new assessment record (never update existing ones)
  const saveAssessment = async (patientId: string, data: any) => {
    try {
      console.log('💾 Saving assessment with data:', data);
      
      await database.write(async () => {
        await database.get<DentitionAssessment>('dentition_assessments').create(assessment => {
          // WatermelonDB auto-generates a unique ID
          assessment.patientId = patientId;
          assessment.data = JSON.stringify(data);
          assessment.createdAt = new Date();
          assessment.updatedAt = new Date();
        });
      });
      
      // ✅ Clear draft after successful save
      clearDraft(patientId);
      
      console.log('✅ New dentition assessment created for patient:', patientId);
    } catch (error) {
      console.error('❌ Error saving dentition assessment:', error);
      throw error;
    }
  };

  // Load the most recent assessment (for pre-filling forms if needed)
  const loadLatestAssessment = async (patientId: string) => {
    try {
      const assessments = await database
        .get<DentitionAssessment>('dentition_assessments')
        .query(
          Q.where('patient_id', patientId),
          Q.sortBy('created_at', Q.desc),
          Q.take(1)
        )
        .fetch();

      if (assessments.length > 0) {
        const parsed = JSON.parse(assessments[0].data);
        console.log('📋 Loaded latest assessment:', parsed);
        return parsed;
      }
      return null;
    } catch (error) {
      console.error('❌ Error loading latest dentition assessment:', error);
      return null;
    }
  };

  // Load ALL assessments for history/viewing (sorted newest first)
  const loadAllAssessments = async (patientId: string) => {
    try {
      const assessments = await database
        .get<DentitionAssessment>('dentition_assessments')
        .query(
          Q.where('patient_id', patientId),
          Q.sortBy('created_at', Q.desc)
        )
        .fetch();

      return assessments;
    } catch (error) {
      console.error('❌ Error loading all dentition assessments:', error);
      return [];
    }
  };

  return (
    <DentitionAssessmentContext.Provider 
      value={{ 
        saveAssessment, 
        loadLatestAssessment, 
        loadAllAssessments,
        saveDraft,
        loadDraft,
        clearDraft,
        hasDraft,
      }}
    >
      {children}
    </DentitionAssessmentContext.Provider>
  );
};