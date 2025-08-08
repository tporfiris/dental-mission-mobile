import React, { createContext, useContext, useState } from 'react';

type DentureType = 'none' | 'upper-full' | 'lower-full' | 'upper-lower-full' | 
  'upper-partial' | 'lower-partial' | 'upper-lower-partial' | 
  'upper-full-lower-partial' | 'upper-partial-lower-full';

type DentureOption = 'immediate' | 'conventional' | 'temporary' | 'reline' | 'repair' | 'adjustment';

interface DenturePlacement {
  dentureType: DentureType;
  options: DentureOption[];
  finalFitConfirmed: boolean;
  fitNotes: string;
}

interface DentureTreatmentState {
  placements: DenturePlacement[];
  generalNotes: string;
  completedAt: string | null;
}

const defaultDenturePlacement: DenturePlacement = {
  dentureType: 'none',
  options: [],
  finalFitConfirmed: false,
  fitNotes: '',
};

const defaultDentureTreatmentState: DentureTreatmentState = {
  placements: [],
  generalNotes: '',
  completedAt: null,
};

interface DentureTreatmentContextType {
  treatmentState: DentureTreatmentState;
  setTreatmentState: (state: DentureTreatmentState) => void;
  addDenturePlacement: (placement: DenturePlacement) => void;
  updateDenturePlacement: (index: number, placement: DenturePlacement) => void;
  removeDenturePlacement: (index: number) => void;
  updateGeneralNotes: (notes: string) => void;
  markCompleted: () => void;
  resetTreatment: () => void;
}

const DentureTreatmentContext = createContext<DentureTreatmentContextType>({
  treatmentState: defaultDentureTreatmentState,
  setTreatmentState: () => {},
  addDenturePlacement: () => {},
  updateDenturePlacement: () => {},
  removeDenturePlacement: () => {},
  updateGeneralNotes: () => {},
  markCompleted: () => {},
  resetTreatment: () => {},
});

export const useDentureTreatment = () => useContext(DentureTreatmentContext);

export const DentureTreatmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [treatmentState, setTreatmentState] = useState<DentureTreatmentState>(defaultDentureTreatmentState);

  const addDenturePlacement = (placement: DenturePlacement) => {
    setTreatmentState(prev => ({
      ...prev,
      placements: [...prev.placements, placement]
    }));
  };

  const updateDenturePlacement = (index: number, placement: DenturePlacement) => {
    setTreatmentState(prev => ({
      ...prev,
      placements: prev.placements.map((p, i) => i === index ? placement : p)
    }));
  };

  const removeDenturePlacement = (index: number) => {
    setTreatmentState(prev => ({
      ...prev,
      placements: prev.placements.filter((_, i) => i !== index)
    }));
  };

  const updateGeneralNotes = (notes: string) => {
    setTreatmentState(prev => ({ ...prev, generalNotes: notes }));
  };

  const markCompleted = () => {
    setTreatmentState(prev => ({ 
      ...prev, 
      completedAt: new Date().toISOString() 
    }));
  };

  const resetTreatment = () => {
    setTreatmentState(defaultDentureTreatmentState);
  };

  return (
    <DentureTreatmentContext.Provider value={{
      treatmentState,
      setTreatmentState,
      addDenturePlacement,
      updateDenturePlacement,
      removeDenturePlacement,
      updateGeneralNotes,
      markCompleted,
      resetTreatment,
    }}>
      {children}
    </DentureTreatmentContext.Provider>
  );
};

// Export types for use in other components
export type { DentureType, DentureOption, DenturePlacement };