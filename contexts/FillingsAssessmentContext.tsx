// contexts/FillingsAssessmentContext.tsx
import React, { createContext, useContext, useRef, useState } from 'react';
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

// ✅ Draft state interface for in-progress assessments
interface DraftState {
  enhancedState: any; // The full enhanced assessment state
}

interface FillingsAssessmentContextType {
  restorationStates: RestorationStates;
  setRestorationStates: (states: RestorationStates) => void;
  saveAssessment: (patientId: string, data: any) => Promise<void>;
  loadLatestAssessment: (patientId: string) => Promise<any>;
  loadAllAssessments: (patientId: string) => Promise<FillingsAssessment[]>;
  resetAssessment: () => void;
  // ✅ NEW: Draft state management
  saveDraft: (patientId: string, enhancedState: any) => void;
  loadDraft: (patientId: string) => DraftState | null;
  clearDraft: (patientId: string) => void;
  hasDraft: (patientId: string) => boolean;
}

const FillingsAssessmentContext = createContext<FillingsAssessmentContextType>({
  restorationStates: defaultRestorationStates,
  setRestorationStates: () => {},
  saveAssessment: async () => {},
  loadLatestAssessment: async () => null,
  loadAllAssessments: async () => [],
  resetAssessment: () => {},
  saveDraft: () => {},
  loadDraft: () => null,
  clearDraft: () => {},
  hasDraft: () => false,
});

export const useFillingsAssessment = () => useContext(FillingsAssessmentContext);

export const FillingsAssessmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [restorationStates, setRestorationStates] = useState<RestorationStates>(defaultRestorationStates);

  // ✅ Store draft states per patient in memory (persists across navigation)
  const draftStatesRef = useRef<Map<string, DraftState>>(new Map());

  // ✅ Save draft state for a patient
  const saveDraft = (patientId: string, enhancedState: any) => {
    const draft: DraftState = {
      enhancedState: JSON.parse(JSON.stringify(enhancedState)), // Deep clone to avoid mutation
    };
    draftStatesRef.current.set(patientId, draft);
    console.log('💾 Saved fillings draft for patient:', patientId);
  };

  // ✅ Load draft state for a patient
  const loadDraft = (patientId: string): DraftState | null => {
    const draft = draftStatesRef.current.get(patientId);
    if (draft) {
      console.log('📋 Loaded fillings draft for patient:', patientId);
      return draft;
    }
    console.log('📋 No fillings draft found for patient:', patientId);
    return null;
  };

  // ✅ Check if draft exists
  const hasDraft = (patientId: string): boolean => {
    return draftStatesRef.current.has(patientId);
  };

  // ✅ Clear draft state
  const clearDraft = (patientId: string) => {
    draftStatesRef.current.delete(patientId);
    console.log('🗑️ Cleared fillings draft for patient:', patientId);
  };

  // ALWAYS create a new assessment record
  const saveAssessment = async (patientId: string, data: any) => {
    try {
      console.log('💾 Saving fillings assessment with data:', data);
      
      await database.write(async () => {
        await database.get<FillingsAssessment>('fillings_assessments').create(assessment => {
          assessment.patientId = patientId;
          assessment.data = JSON.stringify(data);
          assessment.createdAt = new Date();
          assessment.updatedAt = new Date();
        });
      });
      
      // ✅ Clear draft after successful save
      clearDraft(patientId);
      
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
        const savedData = JSON.parse(assessments[0].data);
        console.log('📋 Loaded latest fillings assessment:', savedData);
        
        // ✅ Check if this is optimized format with teethWithIssues
        if (savedData.teethWithIssues) {
          console.log('📖 Loading optimized assessment format');
          
          // Convert compact format back to full format for UI
          const fullTeethStates: Record<string, any> = {};
          
          // Initialize all teeth as default
          TOOTH_IDS.forEach(toothId => {
            fullTeethStates[toothId] = {
              hasFillings: false,
              fillingType: null,
              fillingSurfaces: [],
              needsFillings: false,
              neededFillingType: null,
              neededFillingSurfaces: [],
              hasCrowns: false,
              crownMaterial: null,
              needsCrown: false,
              neededCrownMaterial: null,
              hasExistingRootCanal: false,
              needsNewRootCanal: false,
              hasCavities: false,
              cavitySurfaces: [],
              isBroken: false,
              brokenSurfaces: [],
              needsRootCanal: false,
              pulpDiagnosis: null,
              apicalDiagnosis: null,
            };
          });
          
          // Populate teeth that have issues
          Object.entries(savedData.teethWithIssues).forEach(([toothId, toothData]: [string, any]) => {
            const tooth = fullTeethStates[toothId];
            
            if (toothData.fillings) {
              tooth.hasFillings = true;
              tooth.fillingType = toothData.fillings.type;
              tooth.fillingSurfaces = toothData.fillings.surfaces || [];
            }
            
            if (toothData.neededFillings) {
              tooth.needsFillings = true;
              tooth.neededFillingType = toothData.neededFillings.type;
              tooth.neededFillingSurfaces = toothData.neededFillings.surfaces || [];
            }
            
            if (toothData.crown) {
              tooth.hasCrowns = true;
              tooth.crownMaterial = toothData.crown.material;
            }
            
            if (toothData.neededCrown) {
              tooth.needsCrown = true;
              tooth.neededCrownMaterial = toothData.neededCrown.material;
            }
            
            if (toothData.rootCanal?.existing) {
              tooth.hasExistingRootCanal = true;
            }
            
            if (toothData.needsNewRootCanal) {
              tooth.needsNewRootCanal = true;
            }
            
            if (toothData.cavities) {
              tooth.hasCavities = true;
              tooth.cavitySurfaces = toothData.cavities.surfaces || [];
            }
            
            if (toothData.broken) {
              tooth.isBroken = true;
              tooth.brokenSurfaces = toothData.broken.surfaces || [];
            }
            
            if (toothData.rootCanalNeeded) {
              tooth.needsRootCanal = true;
              tooth.pulpDiagnosis = toothData.rootCanalNeeded.pulpDiagnosis;
              tooth.apicalDiagnosis = toothData.rootCanalNeeded.apicalDiagnosis;
            }
          });
          
          return {
            teethStates: fullTeethStates,
            primaryTeeth: savedData.primaryTeeth || [],
            restorationStates: savedData.restorations || {},
          };
        }
        
        // OLD FORMAT: Return as-is for backward compatibility
        console.log('📖 Loading legacy assessment format');
        return savedData;
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
        resetAssessment,
        saveDraft,
        loadDraft,
        clearDraft,
        hasDraft,
      }}
    >
      {children}
    </FillingsAssessmentContext.Provider>
  );
};