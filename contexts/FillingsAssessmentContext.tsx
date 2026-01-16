// contexts/FillingsAssessmentContext.tsx - UPDATED to handle neededFillings
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
      console.log('📦 Saved data:', JSON.stringify(data, null, 2));
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
        
        // ✅ UPDATED: Check if this is optimized format with teethWithIssues
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
              needsFillings: false,              // ✅ Needed fillings
              neededFillingType: null,           // ✅ Needed fillings
              neededFillingSurfaces: [],         // ✅ Needed fillings
              hasCrowns: false,
              crownMaterial: null,
              needsCrown: false,                 // ✅ NEW: Needed crown
              neededCrownMaterial: null,         // ✅ NEW: Needed crown
              hasExistingRootCanal: false,
              needsNewRootCanal: false,          // ✅ NEW: Needs new root canal
              hasCavities: false,
              cavitySurfaces: [],
              isBroken: false,
              brokenSurfaces: [],
              needsRootCanal: false,
              pulpDiagnosis: null,
              apicalDiagnosis: null,
            };
          });
          
          // ✅ UPDATED: Populate teeth that have issues (including neededFillings, neededCrowns, needsNewRootCanal)
          Object.entries(savedData.teethWithIssues).forEach(([toothId, toothData]: [string, any]) => {
            const tooth = fullTeethStates[toothId];
            
            // Existing Fillings
            if (toothData.fillings) {
              tooth.hasFillings = true;
              tooth.fillingType = toothData.fillings.type;
              tooth.fillingSurfaces = toothData.fillings.surfaces || [];
            }
            
            // ✅ Needed Fillings
            if (toothData.neededFillings) {
              tooth.needsFillings = true;
              tooth.neededFillingType = toothData.neededFillings.type;
              tooth.neededFillingSurfaces = toothData.neededFillings.surfaces || [];
            }
            
            // Existing Crowns
            if (toothData.crown) {
              tooth.hasCrowns = true;
              tooth.crownMaterial = toothData.crown.material;
            }
            
            // ✅ NEW: Needed Crowns
            if (toothData.neededCrown) {
              tooth.needsCrown = true;
              tooth.neededCrownMaterial = toothData.neededCrown.material;
            }
            
            // Existing Root Canal
            if (toothData.rootCanal?.existing) {
              tooth.hasExistingRootCanal = true;
            }
            
            // ✅ NEW: Needs New Root Canal
            if (toothData.needsNewRootCanal) {
              tooth.needsNewRootCanal = true;
            }
            
            // Cavities
            if (toothData.cavities) {
              tooth.hasCavities = true;
              tooth.cavitySurfaces = toothData.cavities.surfaces || [];
            }
            
            // Broken/Cracked
            if (toothData.broken) {
              tooth.isBroken = true;
              tooth.brokenSurfaces = toothData.broken.surfaces || [];
            }
            
            // Root Canal Needed
            if (toothData.rootCanalNeeded) {
              tooth.needsRootCanal = true;
              tooth.pulpDiagnosis = toothData.rootCanalNeeded.pulpDiagnosis;
              tooth.apicalDiagnosis = toothData.rootCanalNeeded.apicalDiagnosis;
            }
          });
          
          console.log('✅ Loaded teeth states:', Object.keys(fullTeethStates).length, 'teeth');
          console.log('📊 Sample tooth data:', fullTeethStates['11']);
          
          return {
            teethStates: fullTeethStates,
            primaryTeeth: savedData.primaryTeeth || [],
            restorationStates: savedData.restorations || {},
          };
        }
        
        // ✅ OLD FORMAT: Return as-is for backward compatibility
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
        resetAssessment
      }}
    >
      {children}
    </FillingsAssessmentContext.Provider>
  );
};