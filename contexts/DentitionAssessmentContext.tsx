// contexts/DentitionAssessmentContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { database } from '../db';
import { Q } from '@nozbe/watermelondb';
import DentitionAssessment from '../db/models/DentitionAssessment';

const TOOTH_IDS = [
  '11','12','13','14','15','16','17','18',
  '21','22','23','24','25','26','27','28',
  '31','32','33','34','35','36','37','38',
  '41','42','43','44','45','46','47','48',
];

type ToothState = 'present' | 'crown-missing' | 'roots-only' | 'fully-missing';

type ToothStates = Record<string, ToothState>;

const defaultToothStates: ToothStates = {};
TOOTH_IDS.forEach(id => {
  defaultToothStates[id] = 'present';
});

interface DentitionAssessmentContextType {
  toothStates: ToothStates;
  setToothStates: (states: ToothStates) => void;
  saveAssessment: (patientId: string, data: any) => Promise<void>;
  loadLatestAssessment: (patientId: string) => Promise<any>;
  loadAllAssessments: (patientId: string) => Promise<DentitionAssessment[]>;
  resetToothStates: () => void;
}

const DentitionAssessmentContext = createContext<DentitionAssessmentContextType>({
  toothStates: defaultToothStates,
  setToothStates: () => {},
  saveAssessment: async () => {},
  loadLatestAssessment: async () => null,
  loadAllAssessments: async () => [],
  resetToothStates: () => {},
});

export const useDentitionAssessment = () => useContext(DentitionAssessmentContext);

export const DentitionAssessmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toothStates, setToothStates] = useState<ToothStates>(defaultToothStates);

  // ALWAYS create a new assessment record (never update existing ones)
  const saveAssessment = async (patientId: string, data: any) => {
    try {
      await database.write(async () => {
        await database.get<DentitionAssessment>('dentition_assessments').create(assessment => {
          // WatermelonDB auto-generates a unique ID
          assessment.patientId = patientId;
          assessment.data = JSON.stringify(data);
          assessment.createdAt = new Date();
          assessment.updatedAt = new Date();
        });
      });
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
        return JSON.parse(assessments[0].data);
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

  // Reset tooth states to default (useful when starting a new assessment)
  const resetToothStates = () => {
    setToothStates(defaultToothStates);
  };

  return (
    <DentitionAssessmentContext.Provider 
      value={{ 
        toothStates, 
        setToothStates, 
        saveAssessment, 
        loadLatestAssessment, 
        loadAllAssessments,
        resetToothStates 
      }}
    >
      {children}
    </DentitionAssessmentContext.Provider>
  );
};