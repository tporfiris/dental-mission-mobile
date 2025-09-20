import React, { createContext, useContext, useState } from 'react';

interface HygieneTreatmentState {
  scalingUnits: number;
  polishingUnits: number;
  scalingMethod: string; // 'cavitron' or 'hand' or ''
  prescribedMedication: string;
  notes: string;
  completedAt: Date | null;
}

const defaultHygieneTreatmentState: HygieneTreatmentState = {
  scalingUnits: 0,
  polishingUnits: 0,
  scalingMethod: '',
  prescribedMedication: '',
  notes: '',
  completedAt: null,
};

interface HygieneTreatmentContextType {
  treatmentState: HygieneTreatmentState;
  setTreatmentState: (state: HygieneTreatmentState) => void;
  updateScalingUnits: (units: number) => void;
  updatePolishingUnits: (units: number) => void;
  updateScalingMethod: (method: string) => void;
  updatePrescribedMedication: (medication: string) => void;
  updateNotes: (notes: string) => void;
  markCompleted: () => void;
  resetTreatment: () => void;
}

const HygieneTreatmentContext = createContext<HygieneTreatmentContextType>({
  treatmentState: defaultHygieneTreatmentState,
  setTreatmentState: () => {},
  updateScalingUnits: () => {},
  updatePolishingUnits: () => {},
  updateScalingMethod: () => {},
  updatePrescribedMedication: () => {},
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

  const updatePolishingUnits = (units: number) => {
    setTreatmentState(prev => ({ ...prev, polishingUnits: Math.max(0, units) }));
  };

  const updateScalingMethod = (method: string) => {
    setTreatmentState(prev => ({ ...prev, scalingMethod: method }));
  };

  const updatePrescribedMedication = (medication: string) => {
    setTreatmentState(prev => ({ ...prev, prescribedMedication: medication }));
  };

  const updateNotes = (notes: string) => {
    setTreatmentState(prev => ({ ...prev, notes }));
  };

  const markCompleted = () => {
    setTreatmentState(prev => ({ 
      ...prev, 
      completedAt: new Date() 
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
      updatePolishingUnits,
      updateScalingMethod,
      updatePrescribedMedication,
      updateNotes,
      markCompleted,
      resetTreatment,
    }}>
      {children}
    </HygieneTreatmentContext.Provider>
  );
};