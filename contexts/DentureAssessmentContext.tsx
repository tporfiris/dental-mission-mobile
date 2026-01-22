// contexts/DentureAssessmentContext.tsx
import React, { createContext, useContext, useRef } from 'react';
import { database } from '../db';
import { Q } from '@nozbe/watermelondb';
import DentureAssessment from '../db/models/DentureAssessment';

type DentureType = 
  | 'none'
  | 'upper-partial-acrylic'
  | 'upper-partial-cast'
  | 'lower-partial-acrylic'
  | 'lower-partial-cast'
  | 'upper-immediate-complete'
  | 'upper-complete'
  | 'lower-immediate-complete'
  | 'lower-complete';

interface DentureOptions {
  'upper-soft-reline': boolean;
  'lower-soft-reline': boolean;
  [key: string]: boolean;
}

interface DentureAssessmentState {
  selectedDentureType: DentureType;
  dentureOptions: DentureOptions;
  notes: string;
}

// ✅ Default state
export const defaultDentureState: DentureAssessmentState = {
  selectedDentureType: 'none',
  dentureOptions: {
    'upper-soft-reline': false,
    'lower-soft-reline': false,
  },
  notes: '',
};

// ✅ Draft state interface
interface DraftState {
  selectedDentureType: DentureType;
  dentureOptions: DentureOptions;
  notes: string;
}

interface DentureAssessmentContextType {
  saveAssessment: (patientId: string, data: DentureAssessmentState) => Promise<void>;
  loadLatestAssessment: (patientId: string) => Promise<DentureAssessmentState | null>;
  loadAllAssessments: (patientId: string) => Promise<DentureAssessment[]>;
  // ✅ Draft state management
  saveDraft: (patientId: string, state: DentureAssessmentState) => void;
  loadDraft: (patientId: string) => DraftState | null;
  clearDraft: (patientId: string) => void;
  hasDraft: (patientId: string) => boolean;
}

const DentureAssessmentContext = createContext<DentureAssessmentContextType>({
  saveAssessment: async () => {},
  loadLatestAssessment: async () => null,
  loadAllAssessments: async () => [],
  saveDraft: () => {},
  loadDraft: () => null,
  clearDraft: () => {},
  hasDraft: () => false,
});

export const useDentureAssessment = () => useContext(DentureAssessmentContext);

export const DentureAssessmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  
  // ✅ Store draft states per patient in memory (persists across navigation)
  const draftStatesRef = useRef<Map<string, DraftState>>(new Map());

  // ✅ Save draft state for a patient
  const saveDraft = (patientId: string, state: DentureAssessmentState) => {
    const draft: DraftState = {
      selectedDentureType: state.selectedDentureType,
      dentureOptions: { ...state.dentureOptions },
      notes: state.notes,
    };
    draftStatesRef.current.set(patientId, draft);
    console.log('💾 Saved denture draft for patient:', patientId);
  };

  // ✅ Load draft state for a patient
  const loadDraft = (patientId: string): DraftState | null => {
    const draft = draftStatesRef.current.get(patientId);
    if (draft) {
      console.log('📋 Loaded denture draft for patient:', patientId);
      return draft;
    }
    console.log('📋 No denture draft found for patient:', patientId);
    return null;
  };

  // ✅ Check if draft exists
  const hasDraft = (patientId: string): boolean => {
    return draftStatesRef.current.has(patientId);
  };

  // ✅ Clear draft state
  const clearDraft = (patientId: string) => {
    draftStatesRef.current.delete(patientId);
    console.log('🗑️ Cleared denture draft for patient:', patientId);
  };

  // ✅ ALWAYS create a new assessment - never update existing ones
  const saveAssessment = async (patientId: string, data: DentureAssessmentState) => {
    try {
      console.log('💾 Saving denture assessment with data:', data);
      
      await database.write(async () => {
        await database.get<DentureAssessment>('denture_assessments').create(assessment => {
          assessment.patientId = patientId;
          assessment.data = JSON.stringify(data);
          assessment.createdAt = new Date();
          assessment.updatedAt = new Date();
        });
      });
      
      // ✅ Clear draft after successful save
      clearDraft(patientId);
      
      console.log('✅ New denture assessment created for patient:', patientId);
    } catch (error) {
      console.error('❌ Error saving denture assessment:', error);
      throw error;
    }
  };

  // Load the most recent assessment
  const loadLatestAssessment = async (patientId: string): Promise<DentureAssessmentState | null> => {
    try {
      const assessments = await database
        .get<DentureAssessment>('denture_assessments')
        .query(
          Q.where('patient_id', patientId),
          Q.sortBy('created_at', Q.desc),
          Q.take(1)
        )
        .fetch();

      if (assessments.length > 0) {
        const parsed = JSON.parse(assessments[0].data);
        console.log('📋 Loaded latest denture assessment:', parsed);
        return parsed;
      }
      return null;
    } catch (error) {
      console.error('❌ Error loading latest denture assessment:', error);
      return null;
    }
  };

  // Load ALL assessments for history/viewing
  const loadAllAssessments = async (patientId: string): Promise<DentureAssessment[]> => {
    try {
      const assessments = await database
        .get<DentureAssessment>('denture_assessments')
        .query(
          Q.where('patient_id', patientId),
          Q.sortBy('created_at', Q.desc)
        )
        .fetch();

      console.log(`✅ Loaded ${assessments.length} denture assessments`);
      return assessments;
    } catch (error) {
      console.error('❌ Error loading all denture assessments:', error);
      return [];
    }
  };

  return (
    <DentureAssessmentContext.Provider value={{ 
      saveAssessment,
      loadLatestAssessment,
      loadAllAssessments,
      saveDraft,
      loadDraft,
      clearDraft,
      hasDraft,
    }}>
      {children}
    </DentureAssessmentContext.Provider>
  );
};