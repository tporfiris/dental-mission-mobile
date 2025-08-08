import React, { createContext, useContext, useState } from 'react';

const TOOTH_IDS = [
  '11','12','13','14','15','16','17','18',
  '21','22','23','24','25','26','27','28',
  '31','32','33','34','35','36','37','38',
  '41','42','43','44','45','46','47','48',
];

type ExtractionType = 'none' | 'tooth' | 'root-tip';

type ExtractionsPerformed = Record<string, ExtractionType>;

const defaultExtractionsState: ExtractionsPerformed = {};
TOOTH_IDS.forEach(id => {
  defaultExtractionsState[id] = 'none';
});

interface ExtractionsTreatmentState {
  extractionsPerformed: ExtractionsPerformed;
  notes: string;
  completedAt: string | null;
}

const defaultTreatmentState: ExtractionsTreatmentState = {
  extractionsPerformed: defaultExtractionsState,
  notes: '',
  completedAt: null,
};

interface ExtractionsTreatmentContextType {
  treatmentState: ExtractionsTreatmentState;
  setTreatmentState: (state: ExtractionsTreatmentState) => void;
  toggleExtraction: (toothId: string, type: ExtractionType) => void;
  updateNotes: (notes: string) => void;
  markCompleted: () => void;
  resetTreatment: () => void;
}

const ExtractionsTreatmentContext = createContext<ExtractionsTreatmentContextType>({
  treatmentState: defaultTreatmentState,
  setTreatmentState: () => {},
  toggleExtraction: () => {},
  updateNotes: () => {},
  markCompleted: () => {},
  resetTreatment: () => {},
});

export const useExtractionsTreatment = () => useContext(ExtractionsTreatmentContext);

export const ExtractionsTreatmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [treatmentState, setTreatmentState] = useState<ExtractionsTreatmentState>(defaultTreatmentState);

  const toggleExtraction = (toothId: string, type: ExtractionType) => {
    setTreatmentState(prev => ({
      ...prev,
      extractionsPerformed: {
        ...prev.extractionsPerformed,
        [toothId]: prev.extractionsPerformed[toothId] === type ? 'none' : type
      }
    }));
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
    setTreatmentState(defaultTreatmentState);
  };

  return (
    <ExtractionsTreatmentContext.Provider value={{
      treatmentState,
      setTreatmentState,
      toggleExtraction,
      updateNotes,
      markCompleted,
      resetTreatment,
    }}>
      {children}
    </ExtractionsTreatmentContext.Provider>
  );
};