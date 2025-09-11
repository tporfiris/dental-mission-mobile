import React, { createContext, useContext, useState } from 'react';

const TOOTH_IDS = [
  '11','12','13','14','15','16','17','18',
  '21','22','23','24','25','26','27','28',
  '31','32','33','34','35','36','37','38',
  '41','42','43','44','45','46','47','48',
];

// Keep the original type for backwards compatibility
type HygieneState = 'normal' | 'light-plaque' | 'moderate-plaque' | 'heavy-plaque' | 'calculus';

type HygieneStates = Record<string, HygieneState>;

const defaultHygieneStates: HygieneStates = {};
TOOTH_IDS.forEach(id => {
  defaultHygieneStates[id] = 'normal';
});

interface HygieneAssessmentContextType {
  hygieneStates: HygieneStates;
  setHygieneStates: (states: HygieneStates) => void;
}

const HygieneAssessmentContext = createContext<HygieneAssessmentContextType>({
  hygieneStates: defaultHygieneStates,
  setHygieneStates: () => {},
});

export const useHygieneAssessment = () => useContext(HygieneAssessmentContext);

export const HygieneAssessmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hygieneStates, setHygieneStates] = useState<HygieneStates>(defaultHygieneStates);

  return (
    <HygieneAssessmentContext.Provider value={{ hygieneStates, setHygieneStates }}>
      {children}
    </HygieneAssessmentContext.Provider>
  );
};