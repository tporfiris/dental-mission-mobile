import React, { createContext, useContext, useState } from 'react';

interface HygieneTreatmentState {
  scalingUnits: number;
  rootPlaningUnits: number;
  notes: string;
  completedAt: string | null;
}

const defaultHygieneTreatmentState: HygieneTreatmentState = {
  scalingUnits: 0,
  rootPlaningUnits: 0,
  notes: '',
  completedAt: null,
};

interface HygieneTreatmentContextType {
  treatmentState: HygieneTreatmentState;
  setTreatmentState: (state: HygieneTreatmentState) => void;
  updateScalingUnits: (units: number) => void;
  updateRootPlaningUnits: (units: number) => void;
  updateNotes: (notes: string) => void;
  markCompleted: () => void;
  resetTreatment: () => void;
}

const HygieneTreatmentContext = createContext<HygieneTreatmentContextType>({
  treatmentState: defaultHygieneTreatmentState,
  setTreatmentState: () => {},
  updateScalingUnits: () => {},
  updateRootPlaningUnits: () => {},
  updateNotes: () => {},
  markCompleted: () => {},
  resetTreatment: () => {},
});

export const useHygieneTreatment = () => useContext(HygieneTreatmentContext);

export const HygieneTreatmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [treatmentState, setTreatmentState] = useState<HygieneTreatmentState>(defaultHygieneTreatmentState);

  const updateScalingUnits = (units: number) => {
    setTreatmentState(prev => ({ ...prev, scalingUnits: Math.max(0, units) }));
  };

  const updateRootPlaningUnits = (units: number) => {
    setTreatmentState(prev => ({ ...prev, rootPlaningUnits: Math.max(0, units) }));
  };

  const updateNotes = (notes: string) => {
    setTreatmentState(prev => ({ ...prev, notes }));
  };

  const markCompleted = () => {
    setTreatmentState(prev => ({ 
      ...prev, 
      completedAt: new Date().toISOString() 
    }));
  };

  const resetTreatment = () => {
    setTreatmentState(defaultHygieneTreatmentState);
  };

  return (
    <HygieneTreatmentContext.Provider value={{
      treatmentState,
      setTreatmentState,
      updateScalingUnits,
      updateRootPlaningUnits,
      updateNotes,
      markCompleted,
      resetTreatment,
    }}>
      {children}
    </HygieneTreatmentContext.Provider>
  );
};