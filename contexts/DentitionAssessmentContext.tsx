import React, { createContext, useContext, useState } from 'react';

const TOOTH_IDS = [
  '11','12','13','14','15','16','17','18',
  '21','22','23','24','25','26','27','28',
  '31','32','33','34','35','36','37','38',
  '41','42','43','44','45','46','47','48',
];

type ToothState = 'present' | 'crown-missing' | 'fully-missing';

type ToothStates = Record<string, ToothState>;

const defaultToothStates: ToothStates = {};
TOOTH_IDS.forEach(id => {
  defaultToothStates[id] = 'present';
});

interface DentitionAssessmentContextType {
  toothStates: ToothStates;
  setToothStates: (states: ToothStates) => void;
}

const DentitionAssessmentContext = createContext<DentitionAssessmentContextType>({
  toothStates: defaultToothStates,
  setToothStates: () => {},
});

export const useDentitionAssessment = () => useContext(DentitionAssessmentContext);

export const DentitionAssessmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toothStates, setToothStates] = useState<ToothStates>(defaultToothStates);

  return (
    <DentitionAssessmentContext.Provider value={{ toothStates, setToothStates }}>
      {children}
    </DentitionAssessmentContext.Provider>
  );
};
