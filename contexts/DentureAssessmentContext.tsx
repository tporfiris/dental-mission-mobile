import React, { createContext, useContext, useState } from 'react';
import { database } from '../db';
import { Q } from '@nozbe/watermelondb';
import DentureAssessment from '../db/models/DentureAssessment';

type AssessmentType = 'initial-visit' | 'post-extraction';

type DentureType = 'none' | 'upper-full' | 'lower-full' | 'upper-lower-full' | 
  'upper-partial' | 'lower-partial' | 'upper-lower-partial' | 
  'upper-full-lower-partial' | 'upper-partial-lower-full';

interface DentureOptions {
  immediate: boolean;
  temporary: boolean;
  conventional: boolean;
  reline: boolean;
  repair: boolean;
  adjustment: boolean;
}

interface DentureAssessmentState {
  assessmentType: AssessmentType;
  selectedDentureType: DentureType;
  dentureOptions: DentureOptions;
  notes: string;
}

const defaultDentureOptions: DentureOptions = {
  immediate: false,
  temporary: false,
  conventional: false,
  reline: false,
  repair: false,
  adjustment: false,
};

const defaultDentureState: DentureAssessmentState = {
  assessmentType: 'initial-visit',
  selectedDentureType: 'none',
  dentureOptions: defaultDentureOptions,
  notes: '',
};

interface DentureAssessmentContextType {
  dentureState: DentureAssessmentState;
  setDentureState: (state: DentureAssessmentState) => void;
  updateAssessmentType: (type: AssessmentType) => void;
  updateDentureType: (type: DentureType) => void;
  updateDentureOptions: (options: DentureOptions) => void;
  updateNotes: (notes: string) => void;
  saveAssessment: (patientId: string) => Promise<void>;
  loadLatestAssessment: (patientId: string) => Promise<void>;
  loadAllAssessments: (patientId: string) => Promise<DentureAssessment[]>;
  resetAssessment: () => void;
}

const DentureAssessmentContext = createContext<DentureAssessmentContextType>({
  dentureState: defaultDentureState,
  setDentureState: () => {},
  updateAssessmentType: () => {},
  updateDentureType: () => {},
  updateDentureOptions: () => {},
  updateNotes: () => {},
  saveAssessment: async () => {},
  loadLatestAssessment: async () => {},
  loadAllAssessments: async () => [],
  resetAssessment: () => {},
});

export const useDentureAssessment = () => useContext(DentureAssessmentContext);

export const DentureAssessmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dentureState, setDentureState] = useState<DentureAssessmentState>(defaultDentureState);

  const updateAssessmentType = (type: AssessmentType) => {
    setDentureState(prev => ({ ...prev, assessmentType: type }));
  };

  const updateDentureType = (type: DentureType) => {
    setDentureState(prev => ({ ...prev, selectedDentureType: type }));
  };

  const updateDentureOptions = (options: DentureOptions) => {
    setDentureState(prev => ({ ...prev, dentureOptions: options }));
  };

  const updateNotes = (notes: string) => {
    setDentureState(prev => ({ ...prev, notes }));
  };

  // ✅ ALWAYS create a new assessment - never update existing ones
  const saveAssessment = async (patientId: string) => {
    try {
      await database.write(async () => {
        await database.get<DentureAssessment>('denture_assessments').create(assessment => {
          // WatermelonDB auto-generates unique ID
          assessment.patientId = patientId;
          assessment.data = JSON.stringify(dentureState);
          assessment.createdAt = new Date();
          assessment.updatedAt = new Date();
        });
      });
      
      console.log('✅ New denture assessment created for patient:', patientId);
      
      // Reset state after successful save
      resetAssessment();
    } catch (error) {
      console.error('❌ Error saving denture assessment:', error);
      throw error;
    }
  };

  // Load the most recent assessment (for reference or pre-filling if needed)
  const loadLatestAssessment = async (patientId: string) => {
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
        const loadedState = JSON.parse(assessments[0].data);
        setDentureState(loadedState);
        console.log('✅ Latest denture assessment loaded');
      } else {
        console.log('ℹ️ No previous denture assessments found');
      }
    } catch (error) {
      console.error('❌ Error loading latest assessment:', error);
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
      console.error('❌ Error loading all assessments:', error);
      return [];
    }
  };

  // Reset to default state
  const resetAssessment = () => {
    setDentureState(defaultDentureState);
  };

  return (
    <DentureAssessmentContext.Provider value={{ 
      dentureState, 
      setDentureState,
      updateAssessmentType,
      updateDentureType,
      updateDentureOptions,
      updateNotes,
      saveAssessment,
      loadLatestAssessment,
      loadAllAssessments,
      resetAssessment,
    }}>
      {children}
    </DentureAssessmentContext.Provider>
  );
};