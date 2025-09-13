import React, { createContext, useContext, useState } from 'react';

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
    }}>
      {children}
    </ImplantAssessmentContext.Provider>
  );
};