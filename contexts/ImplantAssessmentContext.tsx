// contexts/ImplantAssessmentContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { database } from '../db';
import { Q } from '@nozbe/watermelondb';
import ImplantAssessment from '../db/models/ImplantAssessment';

type ImplantMode = 'single' | 'bridge';
type TimingMode = 'immediate' | 'delayed';

interface ImplantAssessmentState {
  implantMode: ImplantMode;
  // Separate selections for each mode
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

interface ImplantAssessmentContextType {
  implantState: ImplantAssessmentState;
  setImplantState: (state: ImplantAssessmentState) => void;
  updateImplantMode: (mode: ImplantMode) => void;
  getSelectedTeeth: () => string[];
  toggleTooth: (toothId: string) => void;
  updateBoneGrafting: (planned: boolean) => void;
  updateTimingMode: (timing: TimingMode) => void;
  updateNotes: (notes: string) => void;
  clearCurrentSelection: () => void;
  saveAssessment: (patientId: string) => Promise<void>;
  loadLatestAssessment: (patientId: string) => Promise<void>;
  loadAllAssessments: (patientId: string) => Promise<ImplantAssessment[]>;
  resetState: () => void;
}

const ImplantAssessmentContext = createContext<ImplantAssessmentContextType>({
  implantState: defaultImplantState,
  setImplantState: () => {},
  updateImplantMode: () => {},
  getSelectedTeeth: () => [],
  toggleTooth: () => {},
  updateBoneGrafting: () => {},
  updateTimingMode: () => {},
  updateNotes: () => {},
  clearCurrentSelection: () => {},
  saveAssessment: async () => {},
  loadLatestAssessment: async () => {},
  loadAllAssessments: async () => [],
  resetState: () => {},
});

export const useImplantAssessment = () => useContext(ImplantAssessmentContext);

export const ImplantAssessmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [implantState, setImplantState] = useState<ImplantAssessmentState>(defaultImplantState);

  const updateImplantMode = (mode: ImplantMode) => {
    setImplantState(prev => ({ 
      ...prev, 
      implantMode: mode
      // Don't clear selections - keep them separate
    }));
  };

  const getSelectedTeeth = () => {
    return implantState.implantMode === 'single' 
      ? implantState.singleImplantTeeth 
      : implantState.bridgeImplantTeeth;
  };

  const toggleTooth = (toothId: string) => {
    setImplantState(prev => {
      if (prev.implantMode === 'single') {
        const newSingleTeeth = prev.singleImplantTeeth.includes(toothId)
          ? prev.singleImplantTeeth.filter(id => id !== toothId)
          : [...prev.singleImplantTeeth, toothId];
        
        return { ...prev, singleImplantTeeth: newSingleTeeth };
      } else {
        const newBridgeTeeth = prev.bridgeImplantTeeth.includes(toothId)
          ? prev.bridgeImplantTeeth.filter(id => id !== toothId)
          : [...prev.bridgeImplantTeeth, toothId];
        
        return { ...prev, bridgeImplantTeeth: newBridgeTeeth };
      }
    });
  };

  const updateBoneGrafting = (planned: boolean) => {
    setImplantState(prev => ({ ...prev, boneGraftingPlanned: planned }));
  };

  const updateTimingMode = (timing: TimingMode) => {
    setImplantState(prev => ({ ...prev, timingMode: timing }));
  };

  const updateNotes = (notes: string) => {
    setImplantState(prev => ({ ...prev, notes }));
  };

  const clearCurrentSelection = () => {
    setImplantState(prev => {
      if (prev.implantMode === 'single') {
        return { ...prev, singleImplantTeeth: [] };
      } else {
        return { ...prev, bridgeImplantTeeth: [] };
      }
    });
  };

  // ✅ ALWAYS create a new assessment - never update existing ones
  const saveAssessment = async (patientId: string) => {
    try {
      await database.write(async () => {
        await database.get<ImplantAssessment>('implant_assessments').create(assessment => {
          assessment.patientId = patientId;
          assessment.data = JSON.stringify(implantState);
          assessment.createdAt = new Date();
          assessment.updatedAt = new Date();
        });
      });
      
      console.log('✅ New implant assessment created for patient:', patientId);
      console.log('📊 Assessment data:', implantState);
    } catch (error) {
      console.error('❌ Error saving implant assessment:', error);
      throw error;
    }
  };

  // Load the most recent assessment (for pre-filling forms)
  const loadLatestAssessment = async (patientId: string) => {
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
        const data = JSON.parse(assessments[0].data);
        setImplantState(data);
        console.log('✅ Loaded latest implant assessment for patient:', patientId);
      } else {
        console.log('ℹ️ No previous implant assessment found for patient:', patientId);
      }
    } catch (error) {
      console.error('❌ Error loading latest implant assessment:', error);
    }
  };

  // Load ALL assessments for history/viewing
  const loadAllAssessments = async (patientId: string) => {
    try {
      const assessments = await database
        .get<ImplantAssessment>('implant_assessments')
        .query(
          Q.where('patient_id', patientId),
          Q.sortBy('created_at', Q.desc)
        )
        .fetch();

      console.log(`✅ Loaded ${assessments.length} implant assessment(s) for patient:`, patientId);
      return assessments;
    } catch (error) {
      console.error('❌ Error loading all implant assessments:', error);
      return [];
    }
  };

  // Reset state to default
  const resetState = () => {
    setImplantState(defaultImplantState);
    console.log('🔄 Implant assessment state reset to default');
  };

  return (
    <ImplantAssessmentContext.Provider value={{
      implantState,
      setImplantState,
      updateImplantMode,
      getSelectedTeeth,
      toggleTooth,
      updateBoneGrafting,
      updateTimingMode,
      updateNotes,
      clearCurrentSelection,
      saveAssessment,
      loadLatestAssessment,
      loadAllAssessments,
      resetState,
    }}>
      {children}
    </ImplantAssessmentContext.Provider>
  );
};