import React, { createContext, useContext, useState } from 'react';

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
}

const FillingsAssessmentContext = createContext<FillingsAssessmentContextType>({
  restorationStates: defaultRestorationStates,
  setRestorationStates: () => {},
});

export const useFillingsAssessment = () => useContext(FillingsAssessmentContext);

export const FillingsAssessmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [restorationStates, setRestorationStates] = useState<RestorationStates>(defaultRestorationStates);

  return (
    <FillingsAssessmentContext.Provider value={{ restorationStates, setRestorationStates }}>
      {children}
    </FillingsAssessmentContext.Provider>
  );
};