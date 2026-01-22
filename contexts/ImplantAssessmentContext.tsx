// contexts/ImplantAssessmentContext.tsx
import React, { createContext, useContext, useRef } from 'react';
import { database } from '../db';
import { Q } from '@nozbe/watermelondb';
import ImplantAssessment from '../db/models/ImplantAssessment';

type ImplantMode = 'single' | 'bridge';
type TimingMode = 'immediate' | 'delayed';

interface ImplantAssessmentState {
  implantMode: ImplantMode;
  singleImplantTeeth: string[];
  bridgeImplantTeeth: string[];
  boneGraftingPlanned: boolean;
  timingMode: TimingMode;
  notes: string;
}

const defaultImplantState: ImplantAssessmentState = {
  implantMode: 'single',
  singleImplantTeeth: [],
  bridgeImplantTeeth: [],
  boneGraftingPlanned: false,
  timingMode: 'immediate',
  notes: '',
};

// ✅ Draft state interface
interface DraftState {
  implantState: ImplantAssessmentState;
}

interface ImplantAssessmentContextType {
  saveAssessment: (patientId: string, data: ImplantAssessmentState) => Promise<void>;
  loadLatestAssessment: (patientId: string) => Promise<ImplantAssessmentState | null>;
  loadAllAssessments: (patientId: string) => Promise<ImplantAssessment[]>;
  // ✅ Draft state management
  saveDraft: (patientId: string, implantState: ImplantAssessmentState) => void;
  loadDraft: (patientId: string) => DraftState | null;
  clearDraft: (patientId: string) => void;
  hasDraft: (patientId: string) => boolean;
}

const ImplantAssessmentContext = createContext<ImplantAssessmentContextType>({
  saveAssessment: async () => {},
  loadLatestAssessment: async () => null,
  loadAllAssessments: async () => [],
  saveDraft: () => {},
  loadDraft: () => null,
  clearDraft: () => {},
  hasDraft: () => false,
});

export const useImplantAssessment = () => useContext(ImplantAssessmentContext);

export const ImplantAssessmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  
  // ✅ Store draft states per patient in memory
  const draftStatesRef = useRef<Map<string, DraftState>>(new Map());

  // ✅ Save draft state
  const saveDraft = (patientId: string, implantState: ImplantAssessmentState) => {
    const draft: DraftState = {
      implantState: { ...implantState }, // Clone to avoid mutation
    };
    draftStatesRef.current.set(patientId, draft);
    console.log('💾 Saved implant draft for patient:', patientId);
  };

  // ✅ Load draft state
  const loadDraft = (patientId: string): DraftState | null => {
    const draft = draftStatesRef.current.get(patientId);
    if (draft) {
      console.log('📋 Loaded implant draft for patient:', patientId);
      return draft;
    }
    console.log('📋 No implant draft found for patient:', patientId);
    return null;
  };

  // ✅ Check if draft exists
  const hasDraft = (patientId: string): boolean => {
    return draftStatesRef.current.has(patientId);
  };

  // ✅ Clear draft state
  const clearDraft = (patientId: string) => {
    draftStatesRef.current.delete(patientId);
    console.log('🗑️ Cleared implant draft for patient:', patientId);
  };

  // ✅ ALWAYS create a new assessment
  const saveAssessment = async (patientId: string, data: ImplantAssessmentState) => {
    try {
      console.log('💾 Saving implant assessment with data:', data);
      
      await database.write(async () => {
        await database.get<ImplantAssessment>('implant_assessments').create(assessment => {
          assessment.patientId = patientId;
          assessment.data = JSON.stringify(data);
          assessment.createdAt = new Date();
          assessment.updatedAt = new Date();
        });
      });
      
      // ✅ Clear draft after successful save
      clearDraft(patientId);
      
      console.log('✅ New implant assessment created for patient:', patientId);
    } catch (error) {
      console.error('❌ Error saving implant assessment:', error);
      throw error;
    }
  };

  // Load the most recent assessment
  const loadLatestAssessment = async (patientId: string): Promise<ImplantAssessmentState | null> => {
    try {
      const assessments = await database
        .get<ImplantAssessment>('implant_assessments')
        .query(
          Q.where('patient_id', patientId),
          Q.sortBy('created_at', Q.desc),
          Q.take(1)
        )
        .fetch();

      if (assessments.length > 0) {
        const parsed = JSON.parse(assessments[0].data);
        console.log('📋 Loaded latest implant assessment:', parsed);
        return parsed;
      }
      return null;
    } catch (error) {
      console.error('❌ Error loading latest implant assessment:', error);
      return null;
    }
  };

  // Load ALL assessments
  const loadAllAssessments = async (patientId: string) => {
    try {
      const assessments = await database
        .get<ImplantAssessment>('implant_assessments')
        .query(
          Q.where('patient_id', patientId),
          Q.sortBy('created_at', Q.desc)
        )
        .fetch();

      return assessments;
    } catch (error) {
      console.error('❌ Error loading all implant assessments:', error);
      return [];
    }
  };

  return (
    <ImplantAssessmentContext.Provider value={{
      saveAssessment,
      loadLatestAssessment,
      loadAllAssessments,
      saveDraft,
      loadDraft,
      clearDraft,
      hasDraft,
    }}>
      {children}
    </ImplantAssessmentContext.Provider>
  );
};