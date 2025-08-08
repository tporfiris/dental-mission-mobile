import React, { createContext, useContext, useState } from 'react';

type AssessmentType = 'initial-visit' | 'post-extraction';

type DentureType = 'none' | 'upper-full' | 'lower-full' | 'upper-lower-full' | 
  'upper-partial' | 'lower-partial' | 'upper-lower-partial' | 
  'upper-full-lower-partial' | 'upper-partial-lower-full';

interface DentureOptions {
  immediate: boolean;
  temporary: boolean;
  conventional: boolean;
  reline: boolean;
  repair: boolean;
  adjustment: boolean;
}

interface DentureAssessmentState {
  assessmentType: AssessmentType;
  selectedDentureType: DentureType;
  dentureOptions: DentureOptions;
  notes: string;
}

const defaultDentureOptions: DentureOptions = {
  immediate: false,
  temporary: false,
  conventional: false,
  reline: false,
  repair: false,
  adjustment: false,
};

const defaultDentureState: DentureAssessmentState = {
  assessmentType: 'initial-visit',
  selectedDentureType: 'none',
  dentureOptions: defaultDentureOptions,
  notes: '',
};

interface DentureAssessmentContextType {
  dentureState: DentureAssessmentState;
  setDentureState: (state: DentureAssessmentState) => void;
  updateAssessmentType: (type: AssessmentType) => void;
  updateDentureType: (type: DentureType) => void;
  updateDentureOptions: (options: DentureOptions) => void;
  updateNotes: (notes: string) => void;
}

const DentureAssessmentContext = createContext<DentureAssessmentContextType>({
  dentureState: defaultDentureState,
  setDentureState: () => {},
  updateAssessmentType: () => {},
  updateDentureType: () => {},
  updateDentureOptions: () => {},
  updateNotes: () => {},
});

export const useDentureAssessment = () => useContext(DentureAssessmentContext);

export const DentureAssessmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dentureState, setDentureState] = useState<DentureAssessmentState>(defaultDentureState);

  const updateAssessmentType = (type: AssessmentType) => {
    setDentureState(prev => ({ ...prev, assessmentType: type }));
  };

  const updateDentureType = (type: DentureType) => {
    setDentureState(prev => ({ ...prev, selectedDentureType: type }));
  };

  const updateDentureOptions = (options: DentureOptions) => {
    setDentureState(prev => ({ ...prev, dentureOptions: options }));
  };

  const updateNotes = (notes: string) => {
    setDentureState(prev => ({ ...prev, notes }));
  };

  return (
    <DentureAssessmentContext.Provider value={{ 
      dentureState, 
      setDentureState,
      updateAssessmentType,
      updateDentureType,
      updateDentureOptions,
      updateNotes
    }}>
      {children}
    </DentureAssessmentContext.Provider>
  );
};