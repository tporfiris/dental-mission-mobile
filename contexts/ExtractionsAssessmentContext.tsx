import React, { createContext, useContext, useState } from 'react';

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

interface ExtractionsAssessmentContextType {
  extractionStates: ExtractionStates;
  setExtractionStates: (states: ExtractionStates) => void;
}

const ExtractionsAssessmentContext = createContext<ExtractionsAssessmentContextType>({
  extractionStates: defaultExtractionStates,
  setExtractionStates: () => {},
});

export const useExtractionsAssessment = () => useContext(ExtractionsAssessmentContext);

export const ExtractionsAssessmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [extractionStates, setExtractionStates] = useState<ExtractionStates>(defaultExtractionStates);

  return (
    <ExtractionsAssessmentContext.Provider value={{ extractionStates, setExtractionStates }}>
      {children}
    </ExtractionsAssessmentContext.Provider>
  );
};