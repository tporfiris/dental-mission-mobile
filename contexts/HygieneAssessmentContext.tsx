// contexts/HygieneAssessmentContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { database } from '../db';
import { Q } from '@nozbe/watermelondb';
import HygieneAssessment from '../db/models/HygieneAssessment';

const TOOTH_IDS = [
  '11','12','13','14','15','16','17','18',
  '21','22','23','24','25','26','27','28',
  '31','32','33','34','35','36','37','38',
  '41','42','43','44','45','46','47','48',
];

// Keep the original type for backwards compatibility
type HygieneState = 'normal' | 'light-plaque' | 'moderate-plaque' | 'heavy-plaque' | 'calculus';

type HygieneStates = Record<string, HygieneState>;

const defaultHygieneStates: HygieneStates = {};
TOOTH_IDS.forEach(id => {
  defaultHygieneStates[id] = 'normal';
});

interface HygieneAssessmentContextType {
  hygieneStates: HygieneStates;
  setHygieneStates: (states: HygieneStates) => void;
  saveAssessment: (patientId: string, data: any) => Promise<void>;
  loadLatestAssessment: (patientId: string) => Promise<any>;
  loadAllAssessments: (patientId: string) => Promise<HygieneAssessment[]>;
  resetToDefault: () => void;
}

const HygieneAssessmentContext = createContext<HygieneAssessmentContextType>({
  hygieneStates: defaultHygieneStates,
  setHygieneStates: () => {},
  saveAssessment: async () => {},
  loadLatestAssessment: async () => null,
  loadAllAssessments: async () => [],
  resetToDefault: () => {},
});

export const useHygieneAssessment = () => useContext(HygieneAssessmentContext);

export const HygieneAssessmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hygieneStates, setHygieneStates] = useState<HygieneStates>(defaultHygieneStates);

  // ALWAYS create a new assessment - NEVER update existing ones
  const saveAssessment = async (patientId: string, data: any) => {
    try {
      await database.write(async () => {
        await database.get<HygieneAssessment>('hygiene_assessments').create(assessment => {
          // WatermelonDB will auto-generate a unique ID
          assessment.patientId = patientId;
          assessment.data = JSON.stringify(data);
          assessment.createdAt = new Date();
          assessment.updatedAt = new Date();
        });
      });
      console.log('✅ New hygiene assessment created for patient:', patientId);
    } catch (error) {
      console.error('❌ Error saving hygiene assessment:', error);
      throw error;
    }
  };

  // Load the most recent assessment (for pre-filling forms if needed)
  const loadLatestAssessment = async (patientId: string) => {
    try {
      const assessments = await database
        .get<HygieneAssessment>('hygiene_assessments')
        .query(
          Q.where('patient_id', patientId),
          Q.sortBy('created_at', Q.desc),
          Q.take(1)
        )
        .fetch();

      if (assessments.length > 0) {
        return JSON.parse(assessments[0].data);
      }
      return null;
    } catch (error) {
      console.error('❌ Error loading latest hygiene assessment:', error);
      return null;
    }
  };

  // Load ALL assessments for history/viewing
  const loadAllAssessments = async (patientId: string) => {
    try {
      const assessments = await database
        .get<HygieneAssessment>('hygiene_assessments')
        .query(
          Q.where('patient_id', patientId),
          Q.sortBy('created_at', Q.desc)
        )
        .fetch();

      return assessments;
    } catch (error) {
      console.error('❌ Error loading all hygiene assessments:', error);
      return [];
    }
  };

  // Reset state to default (useful when starting a new assessment)
  const resetToDefault = () => {
    setHygieneStates(defaultHygieneStates);
  };

  return (
    <HygieneAssessmentContext.Provider 
      value={{ 
        hygieneStates, 
        setHygieneStates, 
        saveAssessment, 
        loadLatestAssessment, 
        loadAllAssessments,
        resetToDefault 
      }}
    >
      {children}
    </HygieneAssessmentContext.Provider>
  );
};