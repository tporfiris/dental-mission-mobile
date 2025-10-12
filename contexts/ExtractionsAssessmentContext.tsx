// contexts/ExtractionsAssessmentContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { database } from '../db';
import { Q } from '@nozbe/watermelondb';
import ExtractionsAssessment from '../db/models/ExtractionsAssessment';

const TOOTH_IDS = [
  '11','12','13','14','15','16','17','18',
  '21','22','23','24','25','26','27','28',
  '31','32','33','34','35','36','37','38',
  '41','42','43','44','45','46','47','48',
];

type ExtractionReason = 'none' | 'loose' | 'root-tip' | 'non-restorable';

type ExtractionStates = Record<string, ExtractionReason>;

const defaultExtractionStates: ExtractionStates = {};
TOOTH_IDS.forEach(id => {
  defaultExtractionStates[id] = 'none';
});

interface ExtractionsAssessmentContextType {
  extractionStates: ExtractionStates;
  setExtractionStates: (states: ExtractionStates) => void;
  saveAssessment: (patientId: string, data: ExtractionStates) => Promise<void>;
  loadLatestAssessment: (patientId: string) => Promise<ExtractionStates | null>;
  loadAllAssessments: (patientId: string) => Promise<ExtractionsAssessment[]>;
  resetAssessment: () => void;
}

const ExtractionsAssessmentContext = createContext<ExtractionsAssessmentContextType>({
  extractionStates: defaultExtractionStates,
  setExtractionStates: () => {},
  saveAssessment: async () => {},
  loadLatestAssessment: async () => null,
  loadAllAssessments: async () => [],
  resetAssessment: () => {},
});

export const useExtractionsAssessment = () => useContext(ExtractionsAssessmentContext);

export const ExtractionsAssessmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [extractionStates, setExtractionStates] = useState<ExtractionStates>(defaultExtractionStates);

  // ALWAYS create a new assessment record
  const saveAssessment = async (patientId: string, data: ExtractionStates) => {
    try {
      await database.write(async () => {
        await database.get<ExtractionsAssessment>('extractions_assessments').create(assessment => {
          // WatermelonDB auto-generates a unique ID
          assessment.patientId = patientId;
          assessment.data = JSON.stringify({ extractionStates: data });
          assessment.createdAt = new Date();
          assessment.updatedAt = new Date();
        });
      });
      console.log('✅ New extractions assessment created for patient:', patientId);
    } catch (error) {
      console.error('❌ Error saving extractions assessment:', error);
      throw error;
    }
  };

  // Load the most recent assessment (for pre-filling forms if needed)
  const loadLatestAssessment = async (patientId: string): Promise<ExtractionStates | null> => {
    try {
      const assessments = await database
        .get<ExtractionsAssessment>('extractions_assessments')
        .query(
          Q.where('patient_id', patientId),
          Q.sortBy('created_at', Q.desc),
          Q.take(1)
        )
        .fetch();

      if (assessments.length > 0) {
        const parsed = JSON.parse(assessments[0].data);
        return parsed.extractionStates || parsed;
      }
      return null;
    } catch (error) {
      console.error('❌ Error loading latest extractions assessment:', error);
      return null;
    }
  };

  // Load ALL assessments for history/viewing
  const loadAllAssessments = async (patientId: string): Promise<ExtractionsAssessment[]> => {
    try {
      const assessments = await database
        .get<ExtractionsAssessment>('extractions_assessments')
        .query(
          Q.where('patient_id', patientId),
          Q.sortBy('created_at', Q.desc)
        )
        .fetch();

      return assessments;
    } catch (error) {
      console.error('❌ Error loading all extractions assessments:', error);
      return [];
    }
  };

  // Reset to default state
  const resetAssessment = () => {
    setExtractionStates(defaultExtractionStates);
  };

  return (
    <ExtractionsAssessmentContext.Provider 
      value={{ 
        extractionStates, 
        setExtractionStates,
        saveAssessment,
        loadLatestAssessment,
        loadAllAssessments,
        resetAssessment
      }}
    >
      {children}
    </ExtractionsAssessmentContext.Provider>
  );
};