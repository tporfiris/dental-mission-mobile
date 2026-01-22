// contexts/ExtractionsAssessmentContext.tsx
import React, { createContext, useContext, useRef } from 'react';
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

// ✅ Draft state interface
interface DraftState {
  extractionStates: ExtractionStates;
}

interface ExtractionsAssessmentContextType {
  saveAssessment: (patientId: string, data: ExtractionStates) => Promise<void>;
  loadLatestAssessment: (patientId: string) => Promise<ExtractionStates | null>;
  loadAllAssessments: (patientId: string) => Promise<ExtractionsAssessment[]>;
  // ✅ Draft state management
  saveDraft: (patientId: string, extractionStates: ExtractionStates) => void;
  loadDraft: (patientId: string) => DraftState | null;
  clearDraft: (patientId: string) => void;
  hasDraft: (patientId: string) => boolean;
}

const ExtractionsAssessmentContext = createContext<ExtractionsAssessmentContextType>({
  saveAssessment: async () => {},
  loadLatestAssessment: async () => null,
  loadAllAssessments: async () => [],
  saveDraft: () => {},
  loadDraft: () => null,
  clearDraft: () => {},
  hasDraft: () => false,
});

export const useExtractionsAssessment = () => useContext(ExtractionsAssessmentContext);

export const ExtractionsAssessmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  
  // ✅ Store draft states per patient in memory
  const draftStatesRef = useRef<Map<string, DraftState>>(new Map());

  // ✅ Save draft state for a patient
  const saveDraft = (patientId: string, extractionStates: ExtractionStates) => {
    const draft: DraftState = {
      extractionStates: { ...extractionStates },
    };
    draftStatesRef.current.set(patientId, draft);
    console.log('💾 Saved extractions draft for patient:', patientId);
  };

  // ✅ Load draft state for a patient
  const loadDraft = (patientId: string): DraftState | null => {
    const draft = draftStatesRef.current.get(patientId);
    if (draft) {
      console.log('📋 Loaded extractions draft for patient:', patientId);
      return draft;
    }
    console.log('📋 No extractions draft found for patient:', patientId);
    return null;
  };

  // ✅ Check if draft exists
  const hasDraft = (patientId: string): boolean => {
    return draftStatesRef.current.has(patientId);
  };

  // ✅ Clear draft state
  const clearDraft = (patientId: string) => {
    draftStatesRef.current.delete(patientId);
    console.log('🗑️ Cleared extractions draft for patient:', patientId);
  };

  // ✅ OPTIMIZED: Only store teeth that need extraction
  const saveAssessment = async (patientId: string, data: ExtractionStates) => {
    try {
      // Filter out all "none" values - only save teeth needing extraction
      const extractionsNeeded: Record<string, ExtractionReason> = {};
      
      Object.entries(data).forEach(([toothId, reason]) => {
        if (reason !== 'none') {
          extractionsNeeded[toothId] = reason;
        }
      });

      console.log('💾 Saving extractions (optimized):', {
        total: Object.keys(data).length,
        needingExtraction: Object.keys(extractionsNeeded).length,
        teeth: Object.keys(extractionsNeeded),
      });

      // ✅ OPTIMIZED DATA STRUCTURE
      const optimizedData = {
        extractions: extractionsNeeded
      };

      await database.write(async () => {
        await database.get<ExtractionsAssessment>('extractions_assessments').create(assessment => {
          assessment.patientId = patientId;
          assessment.data = JSON.stringify(optimizedData);
          assessment.createdAt = new Date();
          assessment.updatedAt = new Date();
        });
      });
      
      // ✅ Clear draft after successful save
      clearDraft(patientId);
      
      console.log('✅ Extractions assessment saved (optimized format)');
    } catch (error) {
      console.error('❌ Error saving extractions assessment:', error);
      throw error;
    }
  };

  // ✅ Handle both old and new data formats
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
        
        // ✅ Handle new optimized format
        if (parsed.extractions) {
          console.log('📖 Loading optimized extractions format:', 
            `${Object.keys(parsed.extractions).length} teeth need extraction`);
          
          // Start with all teeth as "none"
          const fullStates: ExtractionStates = { ...defaultExtractionStates };
          
          // Apply only the teeth needing extraction
          Object.entries(parsed.extractions).forEach(([toothId, reason]) => {
            fullStates[toothId] = reason as ExtractionReason;
          });
          
          return fullStates;
        }
        
        // ⚠️ Handle old format (backward compatibility)
        if (parsed.extractionStates) {
          console.log('📖 Loading legacy extractions format');
          const oldData = parsed.extractionStates.extractionStates || parsed.extractionStates;
          return oldData;
        }
        
        return parsed;
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

  return (
    <ExtractionsAssessmentContext.Provider 
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
    </ExtractionsAssessmentContext.Provider>
  );
};