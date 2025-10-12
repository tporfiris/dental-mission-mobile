// contexts/FillingsAssessmentContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { database } from '../db';
import { Q } from '@nozbe/watermelondb';
import FillingsAssessment from '../db/models/FillingsAssessment';

const TOOTH_IDS = [
  '11','12','13','14','15','16','17','18',
  '21','22','23','24','25','26','27','28',
  '31','32','33','34','35','36','37','38',
  '41','42','43','44','45','46','47','48',
];

const SURFACES = ['M', 'D', 'L', 'B', 'O'] as const;
type Surface = typeof SURFACES[number];

interface ToothRestoration {
  surfaces: Surface[];
  tentative: boolean;
}

type RestorationStates = Record<string, ToothRestoration>;

const defaultRestorationStates: RestorationStates = {};
TOOTH_IDS.forEach(id => {
  defaultRestorationStates[id] = { surfaces: [], tentative: false };
});

interface FillingsAssessmentContextType {
  restorationStates: RestorationStates;
  setRestorationStates: (states: RestorationStates) => void;
  saveAssessment: (patientId: string, data: any) => Promise<void>;
  loadLatestAssessment: (patientId: string) => Promise<any>;
  loadAllAssessments: (patientId: string) => Promise<FillingsAssessment[]>;
  resetAssessment: () => void;
}

const FillingsAssessmentContext = createContext<FillingsAssessmentContextType>({
  restorationStates: defaultRestorationStates,
  setRestorationStates: () => {},
  saveAssessment: async () => {},
  loadLatestAssessment: async () => null,
  loadAllAssessments: async () => [],
  resetAssessment: () => {},
});

export const useFillingsAssessment = () => useContext(FillingsAssessmentContext);

export const FillingsAssessmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [restorationStates, setRestorationStates] = useState<RestorationStates>(defaultRestorationStates);

  // ALWAYS create a new assessment record
  const saveAssessment = async (patientId: string, data: any) => {
    try {
      await database.write(async () => {
        await database.get<FillingsAssessment>('fillings_assessments').create(assessment => {
          assessment.patientId = patientId;
          assessment.data = JSON.stringify(data);
          assessment.createdAt = new Date();
          assessment.updatedAt = new Date();
        });
      });
      console.log('✅ New fillings assessment created for patient:', patientId);
    } catch (error) {
      console.error('❌ Error saving fillings assessment:', error);
      throw error;
    }
  };

  // Load the most recent assessment (for pre-filling forms if needed)
  const loadLatestAssessment = async (patientId: string) => {
    try {
      const assessments = await database
        .get<FillingsAssessment>('fillings_assessments')
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
      console.error('❌ Error loading latest fillings assessment:', error);
      return null;
    }
  };

  // Load ALL assessments for history/viewing
  const loadAllAssessments = async (patientId: string) => {
    try {
      const assessments = await database
        .get<FillingsAssessment>('fillings_assessments')
        .query(
          Q.where('patient_id', patientId),
          Q.sortBy('created_at', Q.desc)
        )
        .fetch();

      return assessments;
    } catch (error) {
      console.error('❌ Error loading all fillings assessments:', error);
      return [];
    }
  };

  // Reset assessment to default state
  const resetAssessment = () => {
    setRestorationStates(defaultRestorationStates);
  };

  return (
    <FillingsAssessmentContext.Provider 
      value={{ 
        restorationStates, 
        setRestorationStates, 
        saveAssessment,
        loadLatestAssessment,
        loadAllAssessments,
        resetAssessment
      }}
    >
      {children}
    </FillingsAssessmentContext.Provider>
  );
};