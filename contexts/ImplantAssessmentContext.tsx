import React, { createContext, useContext, useState } from 'react';

const TOOTH_IDS = [
  '11','12','13','14','15','16','17','18',
  '21','22','23','24','25','26','27','28',
  '31','32','33','34','35','36','37','38',
  '41','42','43','44','45','46','47','48',
];

type ImplantType = 'none' | 'single-implant' | 'multiple-implants' | 'implant-bridge' | 
  'all-on-4' | 'all-on-6' | 'mini-implants' | 'zygomatic-implants';

type ImplantTechnique = 'immediate-placement' | 'delayed-placement' | 'immediate-loading' | 
  'delayed-loading' | 'guided-surgery' | 'conventional-surgery' | 'bone-grafting' | 'sinus-lift';

interface ToothImplant {
  planned: boolean;
  implantType: ImplantType;
  techniques: ImplantTechnique[];
  prosthodontistNotes: string;
}

interface ImplantAssessmentState {
  implants: Record<string, ToothImplant>;
  prosthodontistConsult: boolean;
  generalNotes: string;
}

const defaultToothImplant: ToothImplant = {
  planned: false,
  implantType: 'none',
  techniques: [],
  prosthodontistNotes: ''
};

const defaultImplants: Record<string, ToothImplant> = {};
TOOTH_IDS.forEach(id => {
  defaultImplants[id] = { ...defaultToothImplant };
});

const defaultImplantState: ImplantAssessmentState = {
  implants: defaultImplants,
  prosthodontistConsult: false,
  generalNotes: '',
};

interface ImplantAssessmentContextType {
  implantState: ImplantAssessmentState;
  setImplantState: (state: ImplantAssessmentState) => void;
  updateToothImplant: (toothId: string, implant: ToothImplant) => void;
  updateProsthodontistConsult: (consult: boolean) => void;
  updateGeneralNotes: (notes: string) => void;
}

const ImplantAssessmentContext = createContext<ImplantAssessmentContextType>({
  implantState: defaultImplantState,
  setImplantState: () => {},
  updateToothImplant: () => {},
  updateProsthodontistConsult: () => {},
  updateGeneralNotes: () => {},
});

export const useImplantAssessment = () => useContext(ImplantAssessmentContext);

export const ImplantAssessmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [implantState, setImplantState] = useState<ImplantAssessmentState>(defaultImplantState);

  const updateToothImplant = (toothId: string, implant: ToothImplant) => {
    setImplantState(prev => ({
      ...prev,
      implants: {
        ...prev.implants,
        [toothId]: implant
      }
    }));
  };

  const updateProsthodontistConsult = (consult: boolean) => {
    setImplantState(prev => ({ ...prev, prosthodontistConsult: consult }));
  };

  const updateGeneralNotes = (notes: string) => {
    setImplantState(prev => ({ ...prev, generalNotes: notes }));
  };

  return (
    <ImplantAssessmentContext.Provider value={{ 
      implantState, 
      setImplantState,
      updateToothImplant,
      updateProsthodontistConsult,
      updateGeneralNotes
    }}>
      {children}
    </ImplantAssessmentContext.Provider>
  );
};